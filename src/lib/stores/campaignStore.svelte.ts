import { dbDelete, dbGetAll, dbPut } from '$lib/utils/db.js';
import { newId } from '$lib/utils/id.js';
import { collectionStore } from './collectionStore.svelte.js';
import { rosterStore } from './rosterStore.svelte.js';
import type {
	Campaign,
	CampaignBase,
	CharacterCampaignState,
	MatchCharacterOutcome,
	MatchRecord,
	PathAlignment,
	SpecialistLevel,
	SpecialistType
} from '$lib/models/Campaign.js';
import type { RosterEntry } from '$lib/models/Roster.js';

const nextSpecialistLevel: Record<SpecialistLevel, SpecialistLevel | null> = {
	novice: 'journeyman',
	journeyman: 'master',
	master: null
};

const DEFAULT_STARTING_INFLUENCE = 50;

/** Fills in fields added after a campaign was first saved (keeps old data readable). */
function normalizeState(s: CharacterCampaignState): CharacterCampaignState {
	return {
		entryId: s.entryId ?? '',
		characterId: s.characterId,
		status: s.status ?? 'active',
		heroicTraits: s.heroicTraits ?? [],
		woundTraits: s.woundTraits ?? [],
		criticalWounds: s.criticalWounds ?? 0,
		currentHealth: s.currentHealth ?? 0,
		relics: s.relics ?? [],
		gold: s.gold ?? 0,
		valor: s.valor ?? 0,
		kills: s.kills ?? 0,
		objectives: s.objectives ?? 0,
		gamesPlayed: s.gamesPlayed ?? 0,
		recoveryRoll: s.recoveryRoll
	};
}

function defaultState(entry: RosterEntry): CharacterCampaignState {
	return {
		entryId: entry.entryId,
		characterId: entry.characterId,
		status: 'active',
		heroicTraits: [],
		woundTraits: [],
		criticalWounds: 0,
		currentHealth: collectionStore.getCharacter(entry.characterId)?.stats.health ?? 0,
		relics: [],
		gold: 0,
		valor: 0,
		kills: 0,
		objectives: 0,
		gamesPlayed: 0
	};
}

/** Input to the guided postgame commit. */
export interface RecordMatchInput {
	result: 'win' | 'loss' | 'draw';
	notes: string;
	scenario?: string;
	scenarioId?: string;
	environmentId?: string;
	threatLevel?: number;
	influenceEarned: number;
	goldEarned: number;
	outcomes: MatchCharacterOutcome[];
}

function createCampaignStore() {
	let campaigns = $state<Campaign[]>([]);
	let loaded = $state(false);

	function getCampaignsById() {
		return new Map(campaigns.map((c) => [c.id, c]));
	}

	async function hydrate() {
		if (loaded) return;
		const raw = await dbGetAll('campaigns');
		// Normalize per-character states so fields added later (status/kills/…) are always present.
		campaigns = raw.map((c) => ({
			...c,
			valor: c.valor ?? 0,
			characterStates: (c.characterStates ?? []).map(normalizeState),
			matches: (c.matches ?? []).map((m) => ({
				...m,
				influenceEarned: m.influenceEarned ?? 0,
				goldEarned: m.goldEarned ?? 0,
				outcomes: m.outcomes ?? []
			}))
		}));
		loaded = true;
	}

	function _reset() {
		campaigns = [];
		loaded = false;
	}

	function getCampaign(id: string): Campaign | undefined {
		return getCampaignsById().get(id);
	}

	async function persist(campaign: Campaign): Promise<Campaign> {
		// $state.snapshot() converts reactive Svelte proxies to plain objects —
		// campaign comes from the $state array, and IndexedDB cannot clone proxies.
		const plain = $state.snapshot(campaign) as Campaign;
		const updated = { ...plain, updatedAt: new Date().toISOString() };
		await dbPut('campaigns', updated);
		campaigns = campaigns.map((c) => (c.id === updated.id ? updated : c));
		return updated;
	}

	async function create(
		name: string,
		rosterId: string,
		pathAlignment: PathAlignment,
		startingInfluence = DEFAULT_STARTING_INFLUENCE
	): Promise<Campaign> {
		const now = new Date().toISOString();
		const campaign: Campaign = {
			id: newId(),
			name,
			rosterId,
			pathAlignment,
			influence: Math.max(0, startingInfluence),
			gold: 0,
			valor: 0,
			specialists: [],
			characterStates: [],
			matches: [],
			createdAt: now,
			updatedAt: now
		};
		await dbPut('campaigns', campaign);
		campaigns = [...campaigns, campaign];
		// The linked roster IS the warband: run it in threat mode (characters count, upgrades are
		// gold-bought) with the influence budget as its limit, and tag it with this campaign.
		await rosterStore.configureForCampaign(rosterId, campaign.influence, campaign.id);
		await syncWarband(campaign.id);
		return getCampaign(campaign.id) ?? campaign;
	}

	/**
	 * Reconcile per-character states with the linked roster's entries. Each active entry gets exactly
	 * one state (created with defaults if new); active states whose entry was removed are dropped;
	 * `dead` states are always retained as history. Legacy states missing an entryId are best-effort
	 * mapped to an entry by characterId. Idempotent.
	 */
	async function syncWarband(id: string): Promise<void> {
		const campaign = getCampaign(id);
		if (!campaign) return;
		const roster = rosterStore.getRoster(campaign.rosterId);
		if (!roster) return;

		const dead = campaign.characterStates.filter((s) => s.status === 'dead').map(normalizeState);
		const active = campaign.characterStates.filter((s) => s.status !== 'dead').map(normalizeState);
		const byEntryId = new Map(active.filter((s) => s.entryId).map((s) => [s.entryId, s]));
		const legacyByChar = active.filter((s) => !s.entryId);

		const reconciled: CharacterCampaignState[] = roster.entries.map((entry) => {
			const existing = byEntryId.get(entry.entryId);
			if (existing) return existing;
			const legacyIdx = legacyByChar.findIndex((s) => s.characterId === entry.characterId);
			if (legacyIdx >= 0) {
				const [legacy] = legacyByChar.splice(legacyIdx, 1);
				return { ...legacy, entryId: entry.entryId };
			}
			return defaultState(entry);
		});

		await persist({ ...campaign, characterStates: [...dead, ...reconciled] });
	}

	async function setPathAlignment(id: string, pathAlignment: PathAlignment): Promise<void> {
		const campaign = getCampaign(id);
		if (!campaign) return;
		await persist({ ...campaign, pathAlignment });
	}

	async function setBase(id: string, base: CampaignBase): Promise<void> {
		const campaign = getCampaign(id);
		if (!campaign) return;
		await persist({ ...campaign, base });
	}

	/** Adjusts the influence budget (rewards / manual) and mirrors it to the linked roster's limit. */
	async function adjustInfluence(id: string, delta: number): Promise<void> {
		const campaign = getCampaign(id);
		if (!campaign) return;
		const influence = Math.max(0, campaign.influence + delta);
		await persist({ ...campaign, influence });
		await rosterStore.setMaxInfluence(campaign.rosterId, influence);
	}

	async function adjustGold(id: string, delta: number): Promise<void> {
		const campaign = getCampaign(id);
		if (!campaign) return;
		await persist({ ...campaign, gold: Math.max(0, campaign.gold + delta) });
	}

	async function adjustValorPool(id: string, delta: number): Promise<void> {
		const campaign = getCampaign(id);
		if (!campaign) return;
		await persist({ ...campaign, valor: Math.max(0, (campaign.valor ?? 0) + delta) });
	}

	async function recruitSpecialist(id: string, type: SpecialistType, influenceCost: number): Promise<void> {
		const campaign = getCampaign(id);
		if (!campaign) return;
		if (campaign.specialists.some((s) => s.type === type)) return;
		// influencePaid records the cost; available influence is derived on the campaign sheet.
		await persist({
			...campaign,
			specialists: [...campaign.specialists, { type, level: 'novice', influencePaid: influenceCost }]
		});
	}

	async function advanceSpecialist(id: string, type: SpecialistType, influenceCost: number): Promise<void> {
		const campaign = getCampaign(id);
		if (!campaign) return;
		const specialist = campaign.specialists.find((s) => s.type === type);
		if (!specialist) return;
		const next = nextSpecialistLevel[specialist.level];
		if (!next) return;
		await persist({
			...campaign,
			specialists: campaign.specialists.map((s) =>
				s.type === type ? { ...s, level: next, influencePaid: s.influencePaid + influenceCost } : s
			)
		});
	}

	async function removeSpecialist(id: string, type: SpecialistType): Promise<void> {
		const campaign = getCampaign(id);
		if (!campaign) return;
		await persist({
			...campaign,
			specialists: campaign.specialists.filter((s) => s.type !== type)
		});
	}

	async function updateCharacterState(
		id: string,
		entryId: string,
		fn: (state: CharacterCampaignState) => CharacterCampaignState
	): Promise<void> {
		const campaign = getCampaign(id);
		if (!campaign) return;
		await persist({
			...campaign,
			characterStates: campaign.characterStates.map((s) => (s.entryId === entryId ? fn(s) : s))
		});
	}

	async function addHeroicTrait(id: string, entryId: string, trait: string): Promise<void> {
		await updateCharacterState(id, entryId, (s) => ({ ...s, heroicTraits: [...s.heroicTraits, trait] }));
	}

	async function removeHeroicTrait(id: string, entryId: string, index: number): Promise<void> {
		await updateCharacterState(id, entryId, (s) => ({
			...s,
			heroicTraits: s.heroicTraits.filter((_, i) => i !== index)
		}));
	}

	async function addWoundTrait(id: string, entryId: string, trait: string): Promise<void> {
		await updateCharacterState(id, entryId, (s) => ({ ...s, woundTraits: [...s.woundTraits, trait] }));
	}

	async function removeWoundTrait(id: string, entryId: string, index: number): Promise<void> {
		await updateCharacterState(id, entryId, (s) => ({
			...s,
			woundTraits: s.woundTraits.filter((_, i) => i !== index)
		}));
	}

	async function addRelic(id: string, entryId: string, relic: string): Promise<void> {
		await updateCharacterState(id, entryId, (s) => ({ ...s, relics: [...s.relics, relic] }));
	}

	async function removeRelic(id: string, entryId: string, index: number): Promise<void> {
		await updateCharacterState(id, entryId, (s) => ({
			...s,
			relics: s.relics.filter((_, i) => i !== index)
		}));
	}

	async function adjustCriticalWounds(id: string, entryId: string, delta: number): Promise<void> {
		await updateCharacterState(id, entryId, (s) => ({
			...s,
			criticalWounds: Math.max(0, s.criticalWounds + delta)
		}));
	}

	async function adjustValor(id: string, entryId: string, delta: number): Promise<void> {
		await updateCharacterState(id, entryId, (s) => ({ ...s, valor: Math.max(0, s.valor + delta) }));
	}

	async function setCurrentHealth(id: string, entryId: string, currentHealth: number): Promise<void> {
		await updateCharacterState(id, entryId, (s) => ({ ...s, currentHealth: Math.max(0, currentHealth) }));
	}

	/**
	 * Guided postgame commit: writes a MatchRecord, applies per-character deltas to the campaign
	 * states (career totals, valor, traits/wounds/relics, critical wounds, carried health), marks
	 * dead members and removes them from the roster, and adds the earned influence/gold to the budget.
	 */
	async function recordMatch(
		id: string,
		input: RecordMatchInput
	): Promise<MatchRecord | undefined> {
		const campaign = getCampaign(id);
		if (!campaign) return undefined;

		const deadEntryIds: string[] = [];
		const states = campaign.characterStates.map((s) => {
			const outcome = input.outcomes.find((o) => o.entryId === s.entryId);
			if (!outcome) return s;
			const next: CharacterCampaignState = {
				...s,
				kills: s.kills + outcome.kills,
				objectives: s.objectives + outcome.objectives,
				gamesPlayed: s.gamesPlayed + 1,
				valor: Math.max(0, s.valor + outcome.valorGained),
				heroicTraits: outcome.heroicTraitAdded
					? [...s.heroicTraits, outcome.heroicTraitAdded]
					: s.heroicTraits,
				woundTraits: outcome.woundTraitAdded
					? [...s.woundTraits, outcome.woundTraitAdded]
					: s.woundTraits,
				relics: outcome.relicAdded ? [...s.relics, outcome.relicAdded] : s.relics,
				criticalWounds:
					outcome.injuryOutcome === 'critical' ? s.criticalWounds + 1 : s.criticalWounds,
				currentHealth: outcome.currentHealth ?? s.currentHealth
			};
			if (outcome.injuryOutcome === 'death') {
				next.status = 'dead';
				deadEntryIds.push(s.entryId);
			}
			return next;
		});

		const record: MatchRecord = {
			id: newId(),
			date: new Date().toISOString(),
			result: input.result,
			scenario: input.scenario,
			scenarioId: input.scenarioId,
			environmentId: input.environmentId,
			threatLevel: input.threatLevel,
			influenceEarned: input.influenceEarned,
			goldEarned: input.goldEarned,
			notes: input.notes,
			outcomes: input.outcomes
		};

		const influence = Math.max(0, campaign.influence + input.influenceEarned);
		const gold = Math.max(0, campaign.gold + input.goldEarned);
		await persist({
			...campaign,
			characterStates: states,
			matches: [...campaign.matches, record],
			influence,
			gold
		});

		for (const entryId of deadEntryIds) {
			await rosterStore.removeEntry(campaign.rosterId, entryId);
		}
		await rosterStore.setMaxInfluence(campaign.rosterId, influence);
		return record;
	}

	async function deleteCampaign(id: string): Promise<void> {
		await dbDelete('campaigns', id);
		campaigns = campaigns.filter((c) => c.id !== id);
	}

	async function importCampaigns(incoming: Campaign[], mode: 'merge' | 'replace'): Promise<void> {
		if (mode === 'replace') {
			for (const c of campaigns) await dbDelete('campaigns', c.id);
			campaigns = [];
		}
		for (const c of incoming) {
			await dbPut('campaigns', c);
			if (!campaigns.find((x) => x.id === c.id)) campaigns = [...campaigns, c];
			else campaigns = campaigns.map((x) => (x.id === c.id ? c : x));
		}
	}

	return {
		get campaigns() { return campaigns; },
		get loaded() { return loaded; },
		hydrate,
		_reset,
		getCampaign,
		persist,
		create,
		syncWarband,
		setPathAlignment,
		setBase,
		adjustInfluence,
		adjustGold,
		adjustValorPool,
		recruitSpecialist,
		advanceSpecialist,
		removeSpecialist,
		addHeroicTrait,
		removeHeroicTrait,
		addWoundTrait,
		removeWoundTrait,
		addRelic,
		removeRelic,
		adjustCriticalWounds,
		adjustValor,
		setCurrentHealth,
		recordMatch,
		deleteCampaign,
		importCampaigns
	};
}

export const campaignStore = createCampaignStore();
