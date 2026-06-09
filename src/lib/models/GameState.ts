import type { Roster } from './Roster.js';

export type GamePhase = 'initiative' | 'activation' | 'recovery';

export interface ModelState {
	entryId: string;
	characterId: string;
	rosterOwner: 1 | 2;
	currentHealth: number;
	maxHealth: number;
	activated: boolean;
	conditions: string[];
	/** ADR-007: deltas only — e.g. -1 per critical wound. Never rewrites base stats. */
	actionDiceModifier: number;
	/** True when character has the Construct keyword (uses health as fuel cells) */
	isConstruct: boolean;
	/** True once a disabled model absorbs additional damage — removed from play (Game Rules: Disabled) */
	destroyed: boolean;
}

export interface GameState {
	id: string;
	roster1: Roster;
	roster2: Roster;
	currentRound: number;
	phase: GamePhase;
	initiative: 1 | 2 | null;
	models: ModelState[];
	startedAt: string;
	isCampaignGame: boolean;
	campaignId?: string;
}
