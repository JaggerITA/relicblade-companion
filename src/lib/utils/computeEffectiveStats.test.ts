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
		characterId: 'c1',
		rosterOwner: 1,
		currentHealth: 6,
		maxHealth: 6,
		activated: false,
		conditions: [],
		actionDiceModifier: 0,
		isConstruct: false,
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
