import { dbDelete, dbGetAll, dbPut } from '$lib/utils/db.js';
import { newId } from '$lib/utils/id.js';
import type {
	Campaign,
	CampaignBase,
	CharacterCampaignState,
	PathAlignment,
	SpecialistLevel,
	SpecialistType
} from '$lib/models/Campaign.js';

const nextSpecialistLevel: Record<SpecialistLevel, SpecialistLevel | null> = {
	novice: 'journeyman',
	journeyman: 'master',
	master: null
};

function createCampaignStore() {
	let campaigns = $state<Campaign[]>([]);
	let loaded = $state(false);

	function getCampaignsById() {
		return new Map(campaigns.map((c) => [c.id, c]));
	}

	async function hydrate() {
		if (loaded) return;
		campaigns = await dbGetAll('campaigns');
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
		pathAlignment: PathAlignment
	): Promise<Campaign> {
		const now = new Date().toISOString();
		const campaign: Campaign = {
			id: newId(),
			name,
			rosterId,
			pathAlignment,
			influence: 0,
			gold: 0,
			specialists: [],
			characterStates: [],
			matches: [],
			createdAt: now,
			updatedAt: now
		};
		await dbPut('campaigns', campaign);
		campaigns = [...campaigns, campaign];
		return campaign;
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

	async function adjustInfluence(id: string, delta: number): Promise<void> {
		const campaign = getCampaign(id);
		if (!campaign) return;
		await persist({ ...campaign, influence: Math.max(0, campaign.influence + delta) });
	}

	async function adjustGold(id: string, delta: number): Promise<void> {
		const campaign = getCampaign(id);
		if (!campaign) return;
		await persist({ ...campaign, gold: Math.max(0, campaign.gold + delta) });
	}

	async function recruitAdventurer(
		id: string,
		characterId: string,
		currentHealth: number,
		influenceCost: number
	): Promise<void> {
		const campaign = getCampaign(id);
		if (!campaign) return;
		const state: CharacterCampaignState = {
			characterId,
			heroicTraits: [],
			woundTraits: [],
			criticalWounds: 0,
			currentHealth,
			relics: [],
			gold: 0,
			valor: 0
		};
		await persist({
			...campaign,
			characterStates: [...campaign.characterStates, state],
			influence: Math.max(0, campaign.influence - influenceCost)
		});
	}

	async function removeAdventurer(id: string, characterId: string): Promise<void> {
		const campaign = getCampaign(id);
		if (!campaign) return;
		await persist({
			...campaign,
			characterStates: campaign.characterStates.filter((s) => s.characterId !== characterId)
		});
	}

	async function recruitSpecialist(id: string, type: SpecialistType, influenceCost: number): Promise<void> {
		const campaign = getCampaign(id);
		if (!campaign) return;
		if (campaign.specialists.some((s) => s.type === type)) return;
		await persist({
			...campaign,
			specialists: [...campaign.specialists, { type, level: 'novice', influencePaid: influenceCost }],
			influence: Math.max(0, campaign.influence - influenceCost)
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
			),
			influence: Math.max(0, campaign.influence - influenceCost)
		});
	}

	async function updateCharacterState(
		id: string,
		characterId: string,
		fn: (state: CharacterCampaignState) => CharacterCampaignState
	): Promise<void> {
		const campaign = getCampaign(id);
		if (!campaign) return;
		await persist({
			...campaign,
			characterStates: campaign.characterStates.map((s) =>
				s.characterId === characterId ? fn(s) : s
			)
		});
	}

	async function addHeroicTrait(id: string, characterId: string, trait: string): Promise<void> {
		await updateCharacterState(id, characterId, (s) => ({
			...s,
			heroicTraits: [...s.heroicTraits, trait]
		}));
	}

	async function removeHeroicTrait(id: string, characterId: string, index: number): Promise<void> {
		await updateCharacterState(id, characterId, (s) => ({
			...s,
			heroicTraits: s.heroicTraits.filter((_, i) => i !== index)
		}));
	}

	async function addWoundTrait(id: string, characterId: string, trait: string): Promise<void> {
		await updateCharacterState(id, characterId, (s) => ({
			...s,
			woundTraits: [...s.woundTraits, trait]
		}));
	}

	async function removeWoundTrait(id: string, characterId: string, index: number): Promise<void> {
		await updateCharacterState(id, characterId, (s) => ({
			...s,
			woundTraits: s.woundTraits.filter((_, i) => i !== index)
		}));
	}

	async function addRelic(id: string, characterId: string, relic: string): Promise<void> {
		await updateCharacterState(id, characterId, (s) => ({
			...s,
			relics: [...s.relics, relic]
		}));
	}

	async function removeRelic(id: string, characterId: string, index: number): Promise<void> {
		await updateCharacterState(id, characterId, (s) => ({
			...s,
			relics: s.relics.filter((_, i) => i !== index)
		}));
	}

	async function adjustCriticalWounds(id: string, characterId: string, delta: number): Promise<void> {
		await updateCharacterState(id, characterId, (s) => ({
			...s,
			criticalWounds: Math.max(0, s.criticalWounds + delta)
		}));
	}

	async function adjustValor(id: string, characterId: string, delta: number): Promise<void> {
		await updateCharacterState(id, characterId, (s) => ({
			...s,
			valor: Math.max(0, s.valor + delta)
		}));
	}

	async function setCurrentHealth(id: string, characterId: string, currentHealth: number): Promise<void> {
		await updateCharacterState(id, characterId, (s) => ({
			...s,
			currentHealth: Math.max(0, currentHealth)
		}));
	}

	async function removeSpecialist(id: string, type: SpecialistType): Promise<void> {
		const campaign = getCampaign(id);
		if (!campaign) return;
		await persist({
			...campaign,
			specialists: campaign.specialists.filter((s) => s.type !== type)
		});
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
		setPathAlignment,
		setBase,
		adjustInfluence,
		adjustGold,
		recruitAdventurer,
		removeAdventurer,
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
		deleteCampaign,
		importCampaigns
	};
}

export const campaignStore = createCampaignStore();
