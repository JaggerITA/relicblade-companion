import { describe, expect, it } from 'vitest';
import { computeEffectiveStats, hasKeyword } from './computeEffectiveStats.js';
import type { Character } from '$lib/models/Character.js';
import type { ModelState } from '$lib/models/GameState.js';

const baseCharacter: Character = {
	id: 'c1',
	name: 'Test Knight',
	faction: '',
	path: 'advocate',
	cost: 20,
	stats: { actionDice: 4, speed: 5, armor: 3, health: 6 },
	keywords: ['Hero'],
	actions: [],
	upgradeSlots: [],
	notes: '',
	source: 'manual',
	createdAt: '',
	updatedAt: ''
};

function baseModel(overrides: Partial<ModelState> = {}): ModelState {
	return {
		entryId: 'e1',
		characterId: 'c1',
		rosterOwner: 1,
		currentHealth: 6,
		maxHealth: 6,
		activated: false,
		conditions: [],
		actionDiceModifier: 0,
		isConstruct: false,
		destroyed: false,
		...overrides
	};
}

describe('hasKeyword', () => {
	it('matches case-insensitively', () => {
		expect(hasKeyword({ keywords: ['Construct'] }, 'construct')).toBe(true);
		expect(hasKeyword({ keywords: ['Construct'] }, 'CONSTRUCT')).toBe(true);
		expect(hasKeyword({ keywords: ['Hero'] }, 'construct')).toBe(false);
	});
});

describe('computeEffectiveStats', () => {
	it('passes through speed/armor/health unchanged', () => {
		const stats = computeEffectiveStats(baseCharacter, baseModel());
		expect(stats.speed).toBe(5);
		expect(stats.armor).toBe(3);
		expect(stats.maxHealth).toBe(6);
		expect(stats.currentHealth).toBe(6);
	});

	it('applies actionDiceModifier as a delta on base AD', () => {
		expect(computeEffectiveStats(baseCharacter, baseModel({ actionDiceModifier: -1 })).actionDice).toBe(3);
		expect(computeEffectiveStats(baseCharacter, baseModel({ actionDiceModifier: 1 })).actionDice).toBe(5);
	});

	it('clamps effective AD at 0 (never negative)', () => {
		expect(computeEffectiveStats(baseCharacter, baseModel({ actionDiceModifier: -10 })).actionDice).toBe(0);
	});

	it('marks a model disabled once health reaches 0', () => {
		expect(computeEffectiveStats(baseCharacter, baseModel({ currentHealth: 1 })).isDisabled).toBe(false);
		expect(computeEffectiveStats(baseCharacter, baseModel({ currentHealth: 0 })).isDisabled).toBe(true);
	});

	describe('critical wound penalty (Game Rules: Critically Wounded)', () => {
		const characterWithCrits: Character = {
			...baseCharacter,
			stats: { actionDice: 4, speed: 5, armor: 3, health: 4 },
			criticalHealthBoxes: [3] // Basilisk-style: critical at position 3 of 4
		};

		it('applies no penalty when critical boxes are undamaged', () => {
			// currentHealth=4, damagedBoxes=0 → box 3 not yet damaged
			const stats = computeEffectiveStats(characterWithCrits, baseModel({ currentHealth: 4, maxHealth: 4 }));
			expect(stats.criticalWoundPenalty).toBe(0);
			expect(stats.actionDice).toBe(4);
		});

		it('applies no penalty when damage has not reached the critical box', () => {
			// currentHealth=3, damagedBoxes=1 → box 3 not yet damaged
			const stats = computeEffectiveStats(characterWithCrits, baseModel({ currentHealth: 3, maxHealth: 4 }));
			expect(stats.criticalWoundPenalty).toBe(0);
			expect(stats.actionDice).toBe(4);
		});

		it('applies −1 AD when the critical box is damaged', () => {
			// currentHealth=1, damagedBoxes=3 → box 3 damaged
			const stats = computeEffectiveStats(characterWithCrits, baseModel({ currentHealth: 1, maxHealth: 4 }));
			expect(stats.criticalWoundPenalty).toBe(1);
			expect(stats.actionDice).toBe(3);
		});

		it('stacks with manual actionDiceModifier (e.g. poison)', () => {
			const stats = computeEffectiveStats(
				characterWithCrits,
				baseModel({ currentHealth: 1, maxHealth: 4, actionDiceModifier: -1 })
			);
			expect(stats.criticalWoundPenalty).toBe(1);
			expect(stats.actionDice).toBe(2); // 4 - 1 (poison) - 1 (crit) = 2
		});

		it('restores AD when the critical box is healed', () => {
			// Healing from 1 → 2 HP means damagedBoxes goes 3 → 2, box 3 no longer damaged
			const stats = computeEffectiveStats(characterWithCrits, baseModel({ currentHealth: 2, maxHealth: 4 }));
			expect(stats.criticalWoundPenalty).toBe(0);
			expect(stats.actionDice).toBe(4);
		});

		it('ignores criticalHealthBoxes for constructs', () => {
			const constructChar: Character = { ...characterWithCrits, criticalHealthBoxes: [2] };
			const stats = computeEffectiveStats(constructChar, baseModel({ isConstruct: true, currentHealth: 2, maxHealth: 4 }));
			expect(stats.criticalWoundPenalty).toBe(0);
			expect(stats.actionDice).toBe(2); // fuel cells only
		});

		it('clamps effective AD at 0 even when combined penalties exceed base AD', () => {
			const stats = computeEffectiveStats(
				{ ...characterWithCrits, stats: { ...characterWithCrits.stats, actionDice: 1 } },
				baseModel({ currentHealth: 1, maxHealth: 4, actionDiceModifier: -2 })
			);
			expect(stats.actionDice).toBe(0);
		});
	});

	describe('constructs (Game Rules #type/construct)', () => {
		const construct = baseModel({ isConstruct: true, currentHealth: 0, maxHealth: 4 });

		it('gains 1 AD per empowered fuel cell, ignoring base AD and modifier', () => {
			expect(computeEffectiveStats(baseCharacter, { ...construct, currentHealth: 0 }).actionDice).toBe(0);
			expect(computeEffectiveStats(baseCharacter, { ...construct, currentHealth: 2 }).actionDice).toBe(2);
			expect(computeEffectiveStats(baseCharacter, { ...construct, currentHealth: 4 }).actionDice).toBe(4);
		});

		it('ignores actionDiceModifier entirely', () => {
			expect(
				computeEffectiveStats(baseCharacter, { ...construct, currentHealth: 3, actionDiceModifier: -2 }).actionDice
			).toBe(3);
		});

		it('reports isConstruct from the model state', () => {
			expect(computeEffectiveStats(baseCharacter, construct).isConstruct).toBe(true);
			expect(computeEffectiveStats(baseCharacter, baseModel()).isConstruct).toBe(false);
		});
	});
});
