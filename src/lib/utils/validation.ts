import type { Character } from '$lib/models/Character.js';
import type { Roster, RosterEntry } from '$lib/models/Roster.js';
import type { Upgrade } from '$lib/models/Upgrade.js';

/** True when the same characterId appears more than once in a roster's entries. Used to validate JSON imports. */
export function hasDuplicateEntries(roster: Roster): boolean {
	const ids = roster.entries.map((e) => e.characterId);
	return new Set(ids).size !== ids.length;
}

/** Sum of a character's base cost plus all of its equipped upgrades' costs. */
export function entryInfluence(character: Character, equippedUpgrades: Upgrade[]): number {
	return character.cost + equippedUpgrades.reduce((sum, u) => sum + u.cost, 0);
}

/** Sum of character costs across all entries (excludes upgrades). */
export function charactersInfluence(entries: RosterEntry[], charactersById: Map<string, Character>): number {
	return entries.reduce((sum, e) => sum + (charactersById.get(e.characterId)?.cost ?? 0), 0);
}

/** Sum of equipped-upgrade costs across all entries (excludes characters). */
export function upgradesInfluence(entries: RosterEntry[], upgradesById: Map<string, Upgrade>): number {
	return entries.reduce(
		(sum, e) => sum + e.equippedUpgradeIds.reduce((s, id) => s + (upgradesById.get(id)?.cost ?? 0), 0),
		0
	);
}

/**
 * ADR-006 dual influence model: `standard` counts characters + upgrades against
 * the limit; `threat` (campaign mode) counts characters only.
 */
export function usedInfluence(
	roster: Pick<Roster, 'entries' | 'limitMode'>,
	charactersById: Map<string, Character>,
	upgradesById: Map<string, Upgrade>
): number {
	const chars = charactersInfluence(roster.entries, charactersById);
	if (roster.limitMode === 'threat') return chars;
	return chars + upgradesInfluence(roster.entries, upgradesById);
}

export function remainingInfluence(
	roster: Pick<Roster, 'entries' | 'limitMode' | 'maxInfluence'>,
	charactersById: Map<string, Character>,
	upgradesById: Map<string, Upgrade>
): number {
	return roster.maxInfluence - usedInfluence(roster, charactersById, upgradesById);
}

export function isOverLimit(
	roster: Pick<Roster, 'entries' | 'limitMode' | 'maxInfluence'>,
	charactersById: Map<string, Character>,
	upgradesById: Map<string, Upgrade>
): boolean {
	return usedInfluence(roster, charactersById, upgradesById) > roster.maxInfluence;
}

/**
 * Upgrades from the collection that the character could equip next: not
 * already equipped on this character, their `type` matches an open slot
 * (one not already filled by another equipped upgrade), and the character's
 * keywords satisfy every keyword in the upgrade's `restrictions`. Filters the
 * picker list only — equipping is never blocked (the app tracks, it doesn't
 * enforce).
 */
export function compatibleUpgrades(
	character: Character,
	equippedUpgradeIds: string[],
	collectionUpgrades: Upgrade[],
	upgradesById: Map<string, Upgrade>
): Upgrade[] {
	const openSlots = new Map<string, number>();
	for (const slot of character.upgradeSlots) {
		openSlots.set(slot, (openSlots.get(slot) ?? 0) + 1);
	}
	for (const id of equippedUpgradeIds) {
		const equipped = upgradesById.get(id);
		if (!equipped) continue;
		const remaining = openSlots.get(equipped.type);
		if (remaining !== undefined) openSlots.set(equipped.type, remaining - 1);
	}

	const alreadyEquipped = new Set(equippedUpgradeIds);
	return collectionUpgrades.filter((u) => {
		if (alreadyEquipped.has(u.id)) return false;
		if ((openSlots.get(u.type) ?? 0) <= 0) return false;
		return u.restrictions.every((keyword) => character.keywords.includes(keyword));
	});
}
