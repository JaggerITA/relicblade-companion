import { describe, expect, it } from 'vitest';
import {
	charactersInfluence,
	compatibleUpgrades,
	entryInfluence,
	isOverLimit,
	remainingInfluence,
	upgradesInfluence,
	usedInfluence
} from './validation.js';
import type { Character } from '$lib/models/Character.js';
import type { RosterEntry } from '$lib/models/Roster.js';
import type { Upgrade } from '$lib/models/Upgrade.js';

function makeCharacter(overrides: Partial<Character> = {}): Character {
	return {
		id: 'char-1',
		name: 'Test Knight',
		faction: 'Temple of Justice',
		path: 'advocate',
		cost: 20,
		stats: { actionDice: 3, speed: 5, armor: 3, health: 5 },
		keywords: ['Hero'],
		actions: [],
		upgradeSlots: [],
		notes: '',
		source: 'manual',
		createdAt: '',
		updatedAt: '',
		...overrides
	};
}

function makeUpgrade(overrides: Partial<Upgrade> = {}): Upgrade {
	return {
		id: 'upg-1',
		name: 'Longsword',
		type: 'weapon',
		cost: 4,
		effect: '+2 melee damage',
		restrictions: [],
		source: 'manual',
		createdAt: '',
		...overrides
	};
}

describe('entryInfluence', () => {
	it('sums character cost and equipped upgrade costs', () => {
		const character = makeCharacter({ cost: 20 });
		const upgrades = [makeUpgrade({ cost: 4 }), makeUpgrade({ id: 'upg-2', cost: 2 })];

		expect(entryInfluence(character, upgrades)).toBe(26);
	});

	it('returns just the character cost when nothing is equipped', () => {
		expect(entryInfluence(makeCharacter({ cost: 15 }), [])).toBe(15);
	});
});

describe('influence totals (ADR-006 dual mode)', () => {
	const charactersById = new Map([
		['char-1', makeCharacter({ id: 'char-1', cost: 20 })],
		['char-2', makeCharacter({ id: 'char-2', cost: 30 })]
	]);
	const upgradesById = new Map([
		['upg-1', makeUpgrade({ id: 'upg-1', cost: 4 })],
		['upg-2', makeUpgrade({ id: 'upg-2', cost: 2 })]
	]);
	const entries: RosterEntry[] = [
		{ characterId: 'char-1', equippedUpgradeIds: ['upg-1', 'upg-2'], entryInfluence: 26 },
		{ characterId: 'char-2', equippedUpgradeIds: [], entryInfluence: 30 }
	];

	it('charactersInfluence sums only character costs', () => {
		expect(charactersInfluence(entries, charactersById)).toBe(50);
	});

	it('upgradesInfluence sums only equipped upgrade costs', () => {
		expect(upgradesInfluence(entries, upgradesById)).toBe(6);
	});

	it('standard mode counts characters + upgrades', () => {
		const roster = { entries, limitMode: 'standard' as const, maxInfluence: 100 };
		expect(usedInfluence(roster, charactersById, upgradesById)).toBe(56);
		expect(remainingInfluence(roster, charactersById, upgradesById)).toBe(44);
		expect(isOverLimit(roster, charactersById, upgradesById)).toBe(false);
	});

	it('threat mode counts characters only (upgrades are free)', () => {
		const roster = { entries, limitMode: 'threat' as const, maxInfluence: 50 };
		expect(usedInfluence(roster, charactersById, upgradesById)).toBe(50);
		expect(remainingInfluence(roster, charactersById, upgradesById)).toBe(0);
		expect(isOverLimit(roster, charactersById, upgradesById)).toBe(false);
	});

	it('flags over-limit rosters without blocking (tracks, does not enforce)', () => {
		const roster = { entries, limitMode: 'standard' as const, maxInfluence: 50 };
		expect(usedInfluence(roster, charactersById, upgradesById)).toBe(56);
		expect(isOverLimit(roster, charactersById, upgradesById)).toBe(true);
	});
});

describe('compatibleUpgrades', () => {
	const upgradesById = new Map([
		['scroll-1', makeUpgrade({ id: 'scroll-1', name: 'Fire Scroll', type: 'Scroll', restrictions: [] })],
		['scroll-2', makeUpgrade({ id: 'scroll-2', name: 'Ice Scroll', type: 'Scroll', restrictions: [] })],
		['artisan-1', makeUpgrade({ id: 'artisan-1', name: 'Carving Knife', type: 'Artisan', restrictions: [] })],
		['cleric-amulet', makeUpgrade({ id: 'cleric-amulet', name: 'Holy Amulet', type: 'Scroll', restrictions: ['Cleric'] })]
	]);
	const collection = [...upgradesById.values()];

	it('only returns upgrades whose type matches an open slot', () => {
		const character = makeCharacter({ upgradeSlots: ['Scroll'], keywords: [] });

		const result = compatibleUpgrades(character, [], collection, upgradesById);

		expect(result.map((u) => u.id).sort()).toEqual(['scroll-1', 'scroll-2']);
	});

	it('excludes already-equipped upgrades and types with no open slots left', () => {
		const character = makeCharacter({ upgradeSlots: ['Scroll'], keywords: [] });

		const result = compatibleUpgrades(character, ['scroll-1'], collection, upgradesById);

		expect(result).toEqual([]);
	});

	it('counts multiple slots of the same type independently', () => {
		const character = makeCharacter({ upgradeSlots: ['Scroll', 'Scroll'], keywords: [] });

		const result = compatibleUpgrades(character, ['scroll-1'], collection, upgradesById);

		expect(result.map((u) => u.id)).toEqual(['scroll-2']);
	});

	it('requires the character to have every keyword in restrictions', () => {
		const character = makeCharacter({ upgradeSlots: ['Scroll'], keywords: ['Hero'] });

		const result = compatibleUpgrades(character, [], collection, upgradesById);

		expect(result.find((u) => u.id === 'cleric-amulet')).toBeUndefined();
	});

	it('includes restriction-bound upgrades once the character has the keyword', () => {
		const character = makeCharacter({ upgradeSlots: ['Scroll'], keywords: ['Cleric'] });

		const result = compatibleUpgrades(character, [], collection, upgradesById);

		expect(result.find((u) => u.id === 'cleric-amulet')).toBeDefined();
	});
});
