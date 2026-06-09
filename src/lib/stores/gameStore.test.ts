import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('$lib/utils/db.js', () => ({
	dbGetAll: vi.fn(),
	dbPut: vi.fn(),
	dbDelete: vi.fn()
}));

vi.mock('$lib/utils/id.js', () => ({
	newId: vi.fn()
}));

vi.mock('./collectionStore.svelte.js', () => ({
	collectionStore: { getCharacter: vi.fn() }
}));

import { dbDelete, dbGetAll, dbPut } from '$lib/utils/db.js';
import { newId } from '$lib/utils/id.js';
import { collectionStore } from './collectionStore.svelte.js';
import { gameStore } from './gameStore.svelte.js';
import type { Character } from '$lib/models/Character.js';
import type { Roster } from '$lib/models/Roster.js';

function makeCharacter(overrides: Partial<Character> = {}): Character {
	return {
		id: 'char-1',
		name: 'Test Knight',
		faction: '',
		path: 'advocate',
		cost: 20,
		stats: { actionDice: 4, speed: 5, armor: 3, health: 6 },
		keywords: [],
		actions: [],
		upgradeSlots: [],
		notes: '',
		source: 'manual',
		createdAt: '',
		updatedAt: '',
		...overrides
	};
}

function makeRoster(entries: { characterId: string }[]): Roster {
	return {
		id: 'roster-1',
		name: 'Test Roster',
		faction: '',
		limitMode: 'standard',
		maxInfluence: 100,
		entries: entries.map((e, i) => ({ entryId: `entry-${i}`, characterId: e.characterId, equippedUpgradeIds: [], entryInfluence: 20 })),
		totalInfluence: 20,
		createdAt: '',
		updatedAt: ''
	};
}

/** Drives `rng()` through a fixed sequence — mirrors the helper in dice.test.ts. */
function seeded(values: number[]): () => number {
	let i = 0;
	return () => values[i++ % values.length];
}

const charactersById: Record<string, Character> = {};

function registerCharacter(character: Character): void {
	charactersById[character.id] = character;
}

describe('gameStore', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(dbGetAll).mockResolvedValue([]);
		vi.mocked(dbPut).mockResolvedValue(undefined);
		vi.mocked(dbDelete).mockResolvedValue(undefined);
		vi.mocked(newId).mockReturnValue('game-1');
		for (const key of Object.keys(charactersById)) delete charactersById[key];
		vi.mocked(collectionStore.getCharacter).mockImplementation((id: string) => charactersById[id]);
		gameStore._reset();
	});

	describe('start', () => {
		it('builds ModelState[] for both rosters, resolving Characters via collectionStore', async () => {
			registerCharacter(makeCharacter({ id: 'knight', stats: { actionDice: 4, speed: 5, armor: 3, health: 6 } }));
			registerCharacter(makeCharacter({ id: 'pig', stats: { actionDice: 3, speed: 4, armor: 2, health: 4 } }));

			const game = await gameStore.start(makeRoster([{ characterId: 'knight' }]), makeRoster([{ characterId: 'pig' }]));

			expect(game.id).toBe('game-1');
			expect(game.currentRound).toBe(1);
			expect(game.phase).toBe('initiative');
			expect(game.initiative).toBeNull();
			expect(game.models).toHaveLength(2);
			expect(game.models[0]).toMatchObject({
				characterId: 'knight',
				rosterOwner: 1,
				currentHealth: 6,
				maxHealth: 6,
				activated: false,
				conditions: [],
				actionDiceModifier: 0,
				isConstruct: false
			});
			expect(game.models[1]).toMatchObject({ characterId: 'pig', rosterOwner: 2, currentHealth: 4, maxHealth: 4 });
			expect(dbPut).toHaveBeenCalledWith('games', expect.objectContaining({ id: 'game-1' }));
		});

		it('starts Constructs inert with empty fuel cells', async () => {
			registerCharacter(
				makeCharacter({ id: 'golem', keywords: ['Construct'], stats: { actionDice: 4, speed: 2, armor: 5, health: 4 } })
			);

			const game = await gameStore.start(makeRoster([{ characterId: 'golem' }]), makeRoster([]));
			expect(game.models[0]).toMatchObject({ isConstruct: true, currentHealth: 0, maxHealth: 4 });
		});

		it('skips entries whose Character is missing from the collection', async () => {
			const game = await gameStore.start(makeRoster([{ characterId: 'ghost' }]), makeRoster([]));
			expect(game.models).toHaveLength(0);
		});
	});

	describe('initiative', () => {
		async function startedGame() {
			registerCharacter(makeCharacter({ id: 'knight' }));
			return gameStore.start(makeRoster([{ characterId: 'knight' }]), makeRoster([{ characterId: 'knight' }]));
		}

		it('sets initiative and advances to the activation phase when there is a winner', async () => {
			const game = await startedGame();
			const result = await gameStore.rollInitiative(game.id, seeded([5 / 6, 1 / 6])); // p1=6, p2=2
			expect(result.winner).toBe(1);
			expect(gameStore.getGame(game.id)).toMatchObject({ initiative: 1, phase: 'activation' });
		});

		it('leaves initiative null and stays in the initiative phase on a tie', async () => {
			const game = await startedGame();
			const result = await gameStore.rollInitiative(game.id, seeded([0, 0])); // p1=1, p2=1
			expect(result.winner).toBeNull();
			expect(gameStore.getGame(game.id)).toMatchObject({ initiative: null, phase: 'initiative' });
		});

		it('giveInitiative (Respite) flips initiative to the other player', async () => {
			const game = await startedGame();
			await gameStore.rollInitiative(game.id, seeded([5 / 6, 1 / 6])); // p1 wins
			await gameStore.giveInitiative(game.id);
			expect(gameStore.getGame(game.id)?.initiative).toBe(2);
		});
	});

	describe('activation', () => {
		it("toggles a model's activated flag", async () => {
			registerCharacter(makeCharacter({ id: 'knight' }));
			const game = await gameStore.start(makeRoster([{ characterId: 'knight' }]), makeRoster([]));

			await gameStore.activateModel(game.id, 1, 'knight');
			expect(gameStore.getGame(game.id)?.models[0].activated).toBe(true);

			await gameStore.activateModel(game.id, 1, 'knight');
			expect(gameStore.getGame(game.id)?.models[0].activated).toBe(false);
		});
	});

	describe('health', () => {
		async function startedGame() {
			registerCharacter(makeCharacter({ id: 'knight', stats: { actionDice: 4, speed: 5, armor: 3, health: 6 } }));
			return gameStore.start(makeRoster([{ characterId: 'knight' }]), makeRoster([]));
		}

		it('applies damage and clamps at 0', async () => {
			const game = await startedGame();
			await gameStore.applyDamage(game.id, 1, 'knight', 4);
			expect(gameStore.getGame(game.id)?.models[0].currentHealth).toBe(2);

			await gameStore.applyDamage(game.id, 1, 'knight', 10);
			expect(gameStore.getGame(game.id)?.models[0].currentHealth).toBe(0);
		});

		it('heals and clamps at maxHealth', async () => {
			const game = await startedGame();
			await gameStore.applyDamage(game.id, 1, 'knight', 4);
			await gameStore.heal(game.id, 1, 'knight', 1);
			expect(gameStore.getGame(game.id)?.models[0].currentHealth).toBe(3);

			await gameStore.heal(game.id, 1, 'knight', 10);
			expect(gameStore.getGame(game.id)?.models[0].currentHealth).toBe(6);
		});
	});

	describe('destruction (Game Rules: Disabled)', () => {
		it('starts models as not destroyed', async () => {
			registerCharacter(makeCharacter({ id: 'knight' }));
			const game = await gameStore.start(makeRoster([{ characterId: 'knight' }]), makeRoster([]));
			expect(game.models[0].destroyed).toBe(false);
		});

		it('destroys a model when it takes damage while already disabled', async () => {
			registerCharacter(makeCharacter({ id: 'knight', stats: { actionDice: 4, speed: 5, armor: 3, health: 4 } }));
			const game = await gameStore.start(makeRoster([{ characterId: 'knight' }]), makeRoster([]));

			await gameStore.applyDamage(game.id, 1, 'knight', 4); // disable (currentHealth → 0)
			expect(gameStore.getGame(game.id)?.models[0].currentHealth).toBe(0);
			expect(gameStore.getGame(game.id)?.models[0].destroyed).toBe(false);

			await gameStore.applyDamage(game.id, 1, 'knight', 1); // already disabled → destroyed
			expect(gameStore.getGame(game.id)?.models[0].destroyed).toBe(true);
		});

		it('excludes destroyed models from activatable and disabled helpers', async () => {
			registerCharacter(makeCharacter({ id: 'knight', stats: { actionDice: 4, speed: 5, armor: 3, health: 4 } }));
			registerCharacter(makeCharacter({ id: 'pig', stats: { actionDice: 3, speed: 4, armor: 2, health: 2 } }));
			const game = await gameStore.start(
				makeRoster([{ characterId: 'knight' }, { characterId: 'pig' }]),
				makeRoster([])
			);

			await gameStore.applyDamage(game.id, 1, 'pig', 2); // disable pig
			await gameStore.applyDamage(game.id, 1, 'pig', 1); // destroy pig
			const current = gameStore.getGame(game.id)!;
			expect(gameStore.disabledModels(current, 1)).toHaveLength(0); // destroyed ≠ disabled (no recovery roll)
			expect(gameStore.activatableModels(current, 1)).toHaveLength(1); // knight still activatable
		});

		it('allActivated ignores destroyed models', async () => {
			registerCharacter(makeCharacter({ id: 'knight', stats: { actionDice: 4, speed: 5, armor: 3, health: 4 } }));
			const game = await gameStore.start(makeRoster([{ characterId: 'knight' }]), makeRoster([]));

			await gameStore.applyDamage(game.id, 1, 'knight', 4); // disable
			await gameStore.applyDamage(game.id, 1, 'knight', 1); // destroy
			const current = gameStore.getGame(game.id)!;
			// No living models remain on side 1 — all (zero) are accounted for
			expect(gameStore.allActivated(current, 1)).toBe(true);
		});
	});

	describe('actionDiceModifier', () => {
		it('adjusts by the given delta — covers crit wounds, poison, etc. with one primitive', async () => {
			registerCharacter(makeCharacter({ id: 'knight' }));
			const game = await gameStore.start(makeRoster([{ characterId: 'knight' }]), makeRoster([]));

			await gameStore.adjustActionDiceModifier(game.id, 1, 'knight', -1);
			await gameStore.adjustActionDiceModifier(game.id, 1, 'knight', -1);
			expect(gameStore.getGame(game.id)?.models[0].actionDiceModifier).toBe(-2);

			await gameStore.adjustActionDiceModifier(game.id, 1, 'knight', 1);
			expect(gameStore.getGame(game.id)?.models[0].actionDiceModifier).toBe(-1);
		});
	});

	describe('conditions', () => {
		it('toggles a condition on and off', async () => {
			registerCharacter(makeCharacter({ id: 'knight' }));
			const game = await gameStore.start(makeRoster([{ characterId: 'knight' }]), makeRoster([]));

			await gameStore.toggleCondition(game.id, 1, 'knight', 'Stunned');
			expect(gameStore.getGame(game.id)?.models[0].conditions).toEqual(['Stunned']);

			await gameStore.toggleCondition(game.id, 1, 'knight', 'Stunned');
			expect(gameStore.getGame(game.id)?.models[0].conditions).toEqual([]);
		});
	});

	describe('phase & round flow', () => {
		async function activeGame() {
			registerCharacter(makeCharacter({ id: 'knight', stats: { actionDice: 4, speed: 5, armor: 3, health: 6 } }));
			const game = await gameStore.start(
				makeRoster([{ characterId: 'knight' }]),
				makeRoster([{ characterId: 'knight' }])
			);
			await gameStore.rollInitiative(game.id, seeded([5 / 6, 1 / 6]));
			return game;
		}

		it('moves from activation to recovery via nextPhase', async () => {
			const game = await activeGame();
			expect(gameStore.getGame(game.id)?.phase).toBe('activation');
			await gameStore.nextPhase(game.id);
			expect(gameStore.getGame(game.id)?.phase).toBe('recovery');
		});

		it('does nothing when called outside the activation phase', async () => {
			const game = await activeGame();
			await gameStore.nextPhase(game.id);
			await gameStore.nextPhase(game.id); // already in recovery — no-op
			expect(gameStore.getGame(game.id)?.phase).toBe('recovery');
		});

		it('rollRecovery heals 1 box and reactivates on a 6, otherwise leaves the model disabled', async () => {
			const game = await activeGame();
			await gameStore.applyDamage(game.id, 1, 'knight', 6); // disable P1's model
			await gameStore.nextPhase(game.id); // → recovery

			const failed = await gameStore.rollRecovery(game.id, 1, 'knight', seeded([4 / 6])); // rolls a 5
			expect(failed).toBe(false);
			expect(gameStore.getGame(game.id)?.models[0].currentHealth).toBe(0);

			const succeeded = await gameStore.rollRecovery(game.id, 1, 'knight', seeded([5 / 6])); // rolls a 6
			expect(succeeded).toBe(true);
			expect(gameStore.getGame(game.id)?.models[0].currentHealth).toBe(1);
		});

		it('nextRound increments the round and resets phase/initiative/activation', async () => {
			const game = await activeGame();
			await gameStore.activateModel(game.id, 1, 'knight');
			await gameStore.nextPhase(game.id); // → recovery
			await gameStore.nextRound(game.id);

			const updated = gameStore.getGame(game.id);
			expect(updated).toMatchObject({ currentRound: 2, phase: 'initiative', initiative: null });
			expect(updated?.models.every((m) => !m.activated)).toBe(true);
		});

		it('does nothing when nextRound is called outside the recovery phase', async () => {
			const game = await activeGame(); // currently in 'activation'
			await gameStore.nextRound(game.id);
			expect(gameStore.getGame(game.id)?.currentRound).toBe(1);
		});
	});

	describe('derived helpers', () => {
		it('modelsForPlayer / activatableModels / disabledModels / allActivated', async () => {
			registerCharacter(makeCharacter({ id: 'knight', stats: { actionDice: 4, speed: 5, armor: 3, health: 6 } }));
			registerCharacter(makeCharacter({ id: 'pig', stats: { actionDice: 3, speed: 4, armor: 2, health: 4 } }));
			const game = await gameStore.start(
				makeRoster([{ characterId: 'knight' }, { characterId: 'pig' }]),
				makeRoster([])
			);

			expect(gameStore.modelsForPlayer(game, 1)).toHaveLength(2);
			expect(gameStore.modelsForPlayer(game, 2)).toHaveLength(0);
			expect(gameStore.allActivated(game, 1)).toBe(false);

			await gameStore.applyDamage(game.id, 1, 'pig', 4); // disable the pig
			let current = gameStore.getGame(game.id)!;
			expect(gameStore.disabledModels(current, 1)).toHaveLength(1);
			expect(gameStore.activatableModels(current, 1)).toHaveLength(1);

			await gameStore.activateModel(game.id, 1, 'knight');
			current = gameStore.getGame(game.id)!;
			// knight activated, pig disabled → the round can end even though pig never "activates"
			expect(gameStore.allActivated(current, 1)).toBe(true);
		});
	});

	describe('persistence', () => {
		it('persists a plain snapshot via dbPut and updates the in-memory list', async () => {
			registerCharacter(makeCharacter({ id: 'knight' }));
			const game = await gameStore.start(makeRoster([{ characterId: 'knight' }]), makeRoster([]));
			vi.mocked(dbPut).mockClear();

			await gameStore.activateModel(game.id, 1, 'knight');

			expect(dbPut).toHaveBeenCalledWith('games', expect.objectContaining({ id: game.id }));
			expect(gameStore.games.find((g) => g.id === game.id)?.models[0].activated).toBe(true);
		});

		it('deleteGame removes the game from the db and the in-memory list', async () => {
			registerCharacter(makeCharacter({ id: 'knight' }));
			const game = await gameStore.start(makeRoster([{ characterId: 'knight' }]), makeRoster([]));

			await gameStore.deleteGame(game.id);
			expect(dbDelete).toHaveBeenCalledWith('games', game.id);
			expect(gameStore.getGame(game.id)).toBeUndefined();
		});
	});
});
