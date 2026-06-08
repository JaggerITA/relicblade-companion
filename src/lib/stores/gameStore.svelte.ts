import { dbDelete, dbGetAll, dbPut } from '$lib/utils/db.js';
import { newId } from '$lib/utils/id.js';
import { hasKeyword } from '$lib/utils/computeEffectiveStats.js';
import { rollInitiative as rollInitiativeDice, rollRecovery as rollRecoveryDice } from '$lib/utils/dice.js';
import { collectionStore } from './collectionStore.svelte.js';
import type { InitiativeResult } from '$lib/utils/dice.js';
import type { GameState, ModelState } from '$lib/models/GameState.js';
import type { Roster } from '$lib/models/Roster.js';

function createGameStore() {
	let games = $state<GameState[]>([]);
	let loaded = $state(false);

	function getGamesById() {
		return new Map(games.map((g) => [g.id, g]));
	}

	async function hydrate() {
		if (loaded) return;
		games = await dbGetAll('games');
		loaded = true;
	}

	function _reset() {
		games = [];
		loaded = false;
	}

	function getGame(id: string): GameState | undefined {
		return getGamesById().get(id);
	}

	async function persist(game: GameState): Promise<GameState> {
		// $state.snapshot() converts reactive Svelte proxies to plain objects
		// so IndexedDB's structured-clone algorithm can serialize them
		const plain = $state.snapshot(game) as GameState;
		await dbPut('games', plain);
		games = games.map((g) => (g.id === plain.id ? plain : g));
		return plain;
	}

	/** Resolves each entry's Character (cross-store rule: games never embed Characters) into in-game state. */
	function buildModelStates(roster: Roster, owner: 1 | 2): ModelState[] {
		const states: ModelState[] = [];
		for (const entry of roster.entries) {
			const character = collectionStore.getCharacter(entry.characterId);
			if (!character) continue;
			// Constructs enter play inert — fuel cells start empty (Game Rules #type/construct)
			const isConstruct = hasKeyword(character, 'Construct');
			states.push({
				characterId: character.id,
				rosterOwner: owner,
				currentHealth: isConstruct ? 0 : character.stats.health,
				maxHealth: character.stats.health,
				activated: false,
				conditions: [],
				actionDiceModifier: 0,
				isConstruct
			});
		}
		return states;
	}

	async function start(
		roster1: Roster,
		roster2: Roster,
		isCampaignGame = false,
		campaignId?: string
	): Promise<GameState> {
		const game = $state.snapshot({
			id: newId(),
			roster1,
			roster2,
			currentRound: 1,
			phase: 'initiative',
			initiative: null,
			models: [...buildModelStates(roster1, 1), ...buildModelStates(roster2, 2)],
			startedAt: new Date().toISOString(),
			isCampaignGame,
			campaignId
		}) as GameState;
		await dbPut('games', game);
		games = [...games, game];
		return game;
	}

	async function deleteGame(id: string): Promise<void> {
		await dbDelete('games', id);
		games = games.filter((g) => g.id !== id);
	}

	function mapModel(
		game: GameState,
		rosterOwner: 1 | 2,
		characterId: string,
		fn: (model: ModelState) => ModelState
	): ModelState[] {
		return game.models.map((m) => (m.rosterOwner === rosterOwner && m.characterId === characterId ? fn(m) : m));
	}

	/** Both players roll D6 (reroll on tie). A decisive winner takes initiative and the round moves into Activation. */
	async function rollInitiative(gameId: string, rng?: () => number): Promise<InitiativeResult> {
		const game = getGame(gameId);
		const result = rollInitiativeDice(rng);
		if (game && result.winner) {
			await persist({ ...game, initiative: result.winner, phase: 'activation' });
		}
		return result;
	}

	/** Respite: the initiative winner may give it away (in exchange for a bonus recovery roll, granted by the UI). */
	async function giveInitiative(gameId: string): Promise<void> {
		const game = getGame(gameId);
		if (!game || game.initiative === null) return;
		await persist({ ...game, initiative: game.initiative === 1 ? 2 : 1 });
	}

	async function activateModel(gameId: string, rosterOwner: 1 | 2, characterId: string): Promise<void> {
		const game = getGame(gameId);
		if (!game) return;
		await persist({
			...game,
			models: mapModel(game, rosterOwner, characterId, (m) => ({ ...m, activated: !m.activated }))
		});
	}

	function adjustHealth(game: GameState, rosterOwner: 1 | 2, characterId: string, delta: number): ModelState[] {
		return mapModel(game, rosterOwner, characterId, (m) => ({
			...m,
			currentHealth: Math.min(m.maxHealth, Math.max(0, m.currentHealth + delta))
		}));
	}

	async function applyDamage(gameId: string, rosterOwner: 1 | 2, characterId: string, n: number): Promise<void> {
		const game = getGame(gameId);
		if (!game) return;
		await persist({ ...game, models: adjustHealth(game, rosterOwner, characterId, -n) });
	}

	async function heal(gameId: string, rosterOwner: 1 | 2, characterId: string, n: number): Promise<void> {
		const game = getGame(gameId);
		if (!game) return;
		await persist({ ...game, models: adjustHealth(game, rosterOwner, characterId, n) });
	}

	/** Single delta the player adjusts from their physical card — covers critical wounds, poison, focus, etc. (ADR-007). */
	async function adjustActionDiceModifier(
		gameId: string,
		rosterOwner: 1 | 2,
		characterId: string,
		delta: number
	): Promise<void> {
		const game = getGame(gameId);
		if (!game) return;
		await persist({
			...game,
			models: mapModel(game, rosterOwner, characterId, (m) => ({
				...m,
				actionDiceModifier: m.actionDiceModifier + delta
			}))
		});
	}

	async function toggleCondition(
		gameId: string,
		rosterOwner: 1 | 2,
		characterId: string,
		condition: string
	): Promise<void> {
		const game = getGame(gameId);
		if (!game) return;
		await persist({
			...game,
			models: mapModel(game, rosterOwner, characterId, (m) => ({
				...m,
				conditions: m.conditions.includes(condition)
					? m.conditions.filter((c) => c !== condition)
					: [...m.conditions, condition]
			}))
		});
	}

	/** Activation → Recovery. (Initiative → Activation happens automatically once `rollInitiative` decides a winner.) */
	async function nextPhase(gameId: string): Promise<void> {
		const game = getGame(gameId);
		if (!game || game.phase !== 'activation') return;
		await persist({ ...game, phase: 'recovery' });
	}

	/** 1 D6 per disabled model; a 6 heals 1 box and makes the model activatable again next round. */
	async function rollRecovery(gameId: string, rosterOwner: 1 | 2, characterId: string, rng?: () => number): Promise<boolean> {
		const game = getGame(gameId);
		if (!game) return false;
		const recovered = rollRecoveryDice(rng);
		if (recovered) {
			await persist({
				...game,
				models: mapModel(game, rosterOwner, characterId, (m) => ({ ...m, currentHealth: 1 }))
			});
		}
		return recovered;
	}

	/** Recovery → next round's Initiative: clears initiative and every model's activation flag. */
	async function nextRound(gameId: string): Promise<void> {
		const game = getGame(gameId);
		if (!game || game.phase !== 'recovery') return;
		await persist({
			...game,
			currentRound: game.currentRound + 1,
			phase: 'initiative',
			initiative: null,
			models: game.models.map((m) => ({ ...m, activated: false }))
		});
	}

	function modelsForPlayer(game: GameState, player: 1 | 2): ModelState[] {
		return game.models.filter((m) => m.rosterOwner === player);
	}

	function activatableModels(game: GameState, player: 1 | 2): ModelState[] {
		return modelsForPlayer(game, player).filter((m) => !m.activated && m.currentHealth > 0);
	}

	function disabledModels(game: GameState, player: 1 | 2): ModelState[] {
		return modelsForPlayer(game, player).filter((m) => m.currentHealth <= 0);
	}

	function allActivated(game: GameState, player: 1 | 2): boolean {
		return modelsForPlayer(game, player).every((m) => m.activated || m.currentHealth <= 0);
	}

	return {
		get games() { return games; },
		get loaded() { return loaded; },
		hydrate,
		_reset,
		getGame,
		start,
		deleteGame,
		rollInitiative,
		giveInitiative,
		activateModel,
		applyDamage,
		heal,
		adjustActionDiceModifier,
		toggleCondition,
		nextPhase,
		rollRecovery,
		nextRound,
		modelsForPlayer,
		activatableModels,
		disabledModels,
		allActivated
	};
}

export const gameStore = createGameStore();
