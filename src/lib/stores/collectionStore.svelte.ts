import { dbDelete, dbGetAll, dbPut } from '$lib/utils/db.js';
import { newId } from '$lib/utils/id.js';
import type { Character } from '$lib/models/Character.js';
import type { Collection } from '$lib/models/Collection.js';
import type { Upgrade } from '$lib/models/Upgrade.js';

function createCollectionStore() {
	let characters = $state<Character[]>([]);
	let upgrades = $state<Upgrade[]>([]);
	let loaded = $state(false);

	// Plain getters — Svelte tracks $state access in reactive contexts automatically
	function getFactions() {
		return [...new Set(characters.map((c) => c.faction).filter(Boolean))].sort();
	}
	function getCharactersById() {
		return new Map(characters.map((c) => [c.id, c]));
	}
	function getUpgradesById() {
		return new Map(upgrades.map((u) => [u.id, u]));
	}

	async function hydrate() {
		if (loaded) return;
		const [chars, upgs] = await Promise.all([dbGetAll('characters'), dbGetAll('upgrades')]);
		characters = chars;
		upgrades = upgs;
		loaded = true;
	}

	function _reset() {
		characters = [];
		upgrades = [];
		loaded = false;
	}

	async function addCharacter(data: Omit<Character, 'id' | 'createdAt' | 'updatedAt'>): Promise<Character> {
		const now = new Date().toISOString();
		const char: Character = { ...data, id: newId(), createdAt: now, updatedAt: now };
		await dbPut('characters', char);
		characters = [...characters, char];
		return char;
	}

	async function updateCharacter(updated: Character): Promise<void> {
		const char = { ...updated, updatedAt: new Date().toISOString() };
		await dbPut('characters', char);
		characters = characters.map((c) => (c.id === char.id ? char : c));
	}

	async function deleteCharacter(id: string): Promise<void> {
		await dbDelete('characters', id);
		characters = characters.filter((c) => c.id !== id);
	}

	async function addUpgrade(data: Omit<Upgrade, 'id' | 'createdAt'>): Promise<Upgrade> {
		const upgrade: Upgrade = { ...data, id: newId(), createdAt: new Date().toISOString() };
		await dbPut('upgrades', upgrade);
		upgrades = [...upgrades, upgrade];
		return upgrade;
	}

	async function updateUpgrade(updated: Upgrade): Promise<void> {
		await dbPut('upgrades', updated);
		upgrades = upgrades.map((u) => (u.id === updated.id ? updated : u));
	}

	async function deleteUpgrade(id: string): Promise<void> {
		await dbDelete('upgrades', id);
		upgrades = upgrades.filter((u) => u.id !== id);
	}

	async function importCollection(data: Collection, mode: 'merge' | 'replace'): Promise<void> {
		if (mode === 'replace') {
			for (const c of characters) await dbDelete('characters', c.id);
			for (const u of upgrades) await dbDelete('upgrades', u.id);
			characters = [];
			upgrades = [];
		}
		for (const c of data.characters) {
			await dbPut('characters', c);
			if (!characters.find((x) => x.id === c.id)) characters = [...characters, c];
			else characters = characters.map((x) => (x.id === c.id ? c : x));
		}
		for (const u of data.upgrades) {
			await dbPut('upgrades', u);
			if (!upgrades.find((x) => x.id === u.id)) upgrades = [...upgrades, u];
			else upgrades = upgrades.map((x) => (x.id === u.id ? u : x));
		}
	}

	function exportCollection(): Collection {
		return { characters, upgrades, exportedAt: new Date().toISOString(), version: 1 };
	}

	function getCharacter(id: string): Character | undefined {
		return getCharactersById().get(id);
	}

	function getUpgrade(id: string): Upgrade | undefined {
		return getUpgradesById().get(id);
	}

	return {
		get characters() { return characters; },
		get upgrades() { return upgrades; },
		get loaded() { return loaded; },
		get factions() { return getFactions(); },
		get charactersById() { return getCharactersById(); },
		get upgradesById() { return getUpgradesById(); },
		hydrate,
		_reset,
		addCharacter,
		updateCharacter,
		deleteCharacter,
		addUpgrade,
		updateUpgrade,
		deleteUpgrade,
		importCollection,
		exportCollection,
		getCharacter,
		getUpgrade
	};
}

export const collectionStore = createCollectionStore();
