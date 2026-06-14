export type SpecialistType = 'chemist' | 'artisan' | 'smith' | 'scribe';
export type SpecialistLevel = 'novice' | 'journeyman' | 'master';

export interface Specialist {
	type: SpecialistType;
	level: SpecialistLevel;
	influencePaid: number;
}

/** A Seeker's path determines which characters (by Character.path) they may recruit. Neutral characters are hireable by either. */
export type PathAlignment = 'advocate' | 'adversary';

/**
 * The encampment's home base. `type` is a free-text user-entered label (Zero Game Data:
 * the three published base types and their starting resources/boons are not hardcoded —
 * the player records their own from their book).
 */
export interface CampaignBase {
	type: string;
	name: string;
	notes: string;
}

/**
 * A reusable base configuration the player has transcribed from their own book
 * (type, name, boon notes, starting resources). Saved to a personal library so it
 * can be picked when establishing a base on future campaigns, and exported/imported
 * as JSON like the rest of the collection (Zero Game Data: all fields are user-entered).
 */
export interface BaseTemplate {
	id: string;
	type: string;
	name: string;
	notes: string;
	startingInfluence: number;
	startingGold: number;
	/** Per-character resource (see CharacterCampaignState.valor) — recorded for reference, not yet applied. */
	startingValor: number;
	createdAt: string;
	updatedAt: string;
}

export interface CharacterCampaignState {
	characterId: string;
	heroicTraits: string[];
	woundTraits: string[];
	/** Each point = -1 AD applied by computeEffectiveStats (ADR-007) */
	criticalWounds: number;
	currentHealth: number;
	relics: string[];
	gold: number;
	/** Experience-based resource earned per character (Seeker's Handbook p.51) */
	valor: number;
	recoveryRoll?: number;
}

export interface MatchRecord {
	id: string;
	date: string;
	result: 'win' | 'loss' | 'draw';
	scenario?: string;
	notes: string;
	characterStates: CharacterCampaignState[];
}

export interface Campaign {
	id: string;
	name: string;
	rosterId: string;
	pathAlignment: PathAlignment;
	base?: CampaignBase;
	/** Shared encampment pools (Seeker's Handbook p.50-51) */
	influence: number;
	gold: number;
	specialists: Specialist[];
	/** Persistent per-character progression, carried between adventures */
	characterStates: CharacterCampaignState[];
	matches: MatchRecord[];
	createdAt: string;
	updatedAt: string;
}
