import type { Character } from '$lib/models/Character.js';
import type { ModelState } from '$lib/models/GameState.js';

export interface EffectiveStats {
	actionDice: number;
	speed: number;
	armor: number;
	currentHealth: number;
	maxHealth: number;
	isDisabled: boolean;
	isConstruct: boolean;
}

/** Case-insensitive keyword check (mirrors how `compatibleUpgrades` matches `restrictions` against `keywords`). */
export function hasKeyword(character: Pick<Character, 'keywords'>, keyword: string): boolean {
	const target = keyword.toLowerCase();
	return character.keywords.some((k) => k.toLowerCase() === target);
}

/**
 * ADR-007: base stats are immutable reference data; effective in-game stats
 * are computed from `Character` (base) + `ModelState` (deltas) — never a
 * rewritten stat block. This is the one place stat math lives.
 *
 * Constructs (Game Rules #type/construct) use fuel cells *instead of* health
 * and gain 1 AD per empowered (filled) cell — so their effective AD comes
 * from `currentHealth`, ignoring the printed AD and `actionDiceModifier`.
 * Every other model's AD is `base + actionDiceModifier`, clamped at 0 — that
 * single delta covers critical wounds, poison, and any other modifier the
 * player applies from their physical card (the app tracks, it doesn't enforce).
 */
export function computeEffectiveStats(character: Character, model: ModelState): EffectiveStats {
	const isConstruct = model.isConstruct;
	const actionDice = isConstruct
		? Math.max(0, model.currentHealth)
		: Math.max(0, character.stats.actionDice + model.actionDiceModifier);

	return {
		actionDice,
		speed: character.stats.speed,
		armor: character.stats.armor,
		currentHealth: model.currentHealth,
		maxHealth: model.maxHealth,
		isDisabled: model.currentHealth <= 0,
		isConstruct
	};
}
