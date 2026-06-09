import { dbDelete, dbGetAll, dbPut } from '$lib/utils/db.js';
import { newId } from '$lib/utils/id.js';
import { entryInfluence } from '$lib/utils/validation.js';
import { collectionStore } from './collectionStore.svelte.js';
import type { LimitMode, Roster, RosterEntry } from '$lib/models/Roster.js';
import type { Upgrade } from '$lib/models/Upgrade.js';

function createRosterStore() {
	let rosters = $state<Roster[]>([]);
	let loaded = $state(false);

	function getRostersById() {
		return new Map(rosters.map((r) => [r.id, r]));
	}

	async function hydrate() {
		if (loaded) return;
		rosters = await dbGetAll('rosters');
		loaded = true;
	}

	function _reset() {
		rosters = [];
		loaded = false;
	}

	function getRoster(id: string): Roster | undefined {
		return getRostersById().get(id);
	}

	/** Recomputes each entry's `entryInfluence` and the roster's `totalInfluence` from the user's collection. */
	function recomputeInfluence(roster: Roster): Roster {
		const entries = roster.entries.map((entry) => {
			const character = collectionStore.getCharacter(entry.characterId);
			const equippedUpgrades = entry.equippedUpgradeIds
				.map((id) => collectionStore.getUpgrade(id))
				.filter((u): u is Upgrade => u !== undefined);
			return {
				...entry,
				entryInfluence: character ? entryInfluence(character, equippedUpgrades) : 0
			};
		});
		const totalInfluence = entries.reduce((sum, e) => sum + e.entryInfluence, 0);
		return { ...roster, entries, totalInfluence };
	}

	async function persist(roster: Roster): Promise<Roster> {
		// $state.snapshot() converts reactive Svelte proxies to plain objects —
		// roster comes from the $state array, and IndexedDB cannot clone proxies.
		const plain = $state.snapshot(roster) as Roster;
		const updated = { ...recomputeInfluence(plain), updatedAt: new Date().toISOString() };
		await dbPut('rosters', updated);
		rosters = rosters.map((r) => (r.id === updated.id ? updated : r));
		return updated;
	}

	async function create(
		name: string,
		faction: string,
		limitMode: LimitMode,
		maxInfluence: number
	): Promise<Roster> {
		const now = new Date().toISOString();
		const roster: Roster = {
			id: newId(),
			name,
			faction,
			limitMode,
			maxInfluence,
			entries: [],
			totalInfluence: 0,
			createdAt: now,
			updatedAt: now
		};
		await dbPut('rosters', roster);
		rosters = [...rosters, roster];
		return roster;
	}

	async function deleteRoster(id: string): Promise<void> {
		await dbDelete('rosters', id);
		rosters = rosters.filter((r) => r.id !== id);
	}

	async function addEntry(rosterId: string, characterId: string): Promise<void> {
		const roster = getRoster(rosterId);
		if (!roster) return;
		const entry: RosterEntry = { entryId: newId(), characterId, equippedUpgradeIds: [], entryInfluence: 0 };
		await persist({ ...roster, entries: [...roster.entries, entry] });
	}

	async function removeEntry(rosterId: string, entryId: string): Promise<void> {
		const roster = getRoster(rosterId);
		if (!roster) return;
		await persist({ ...roster, entries: roster.entries.filter((e) => e.entryId !== entryId) });
	}

	async function equipUpgrade(rosterId: string, entryId: string, upgradeId: string): Promise<void> {
		const roster = getRoster(rosterId);
		if (!roster) return;
		const entries = roster.entries.map((e) =>
			e.entryId === entryId && !e.equippedUpgradeIds.includes(upgradeId)
				? { ...e, equippedUpgradeIds: [...e.equippedUpgradeIds, upgradeId] }
				: e
		);
		await persist({ ...roster, entries });
	}

	async function unequipUpgrade(rosterId: string, entryId: string, upgradeId: string): Promise<void> {
		const roster = getRoster(rosterId);
		if (!roster) return;
		const entries = roster.entries.map((e) =>
			e.entryId === entryId
				? { ...e, equippedUpgradeIds: e.equippedUpgradeIds.filter((id) => id !== upgradeId) }
				: e
		);
		await persist({ ...roster, entries });
	}

	async function importRosters(incoming: Roster[], mode: 'merge' | 'replace'): Promise<void> {
		if (mode === 'replace') {
			for (const r of rosters) await dbDelete('rosters', r.id);
			rosters = [];
		}
		for (const r of incoming) {
			await dbPut('rosters', r);
			if (!rosters.find((x) => x.id === r.id)) rosters = [...rosters, r];
			else rosters = rosters.map((x) => (x.id === r.id ? r : x));
		}
	}

	return {
		get rosters() { return rosters; },
		get loaded() { return loaded; },
		hydrate,
		_reset,
		getRoster,
		create,
		deleteRoster,
		addEntry,
		removeEntry,
		equipUpgrade,
		unequipUpgrade,
		importRosters
	};
}

export const rosterStore = createRosterStore();
