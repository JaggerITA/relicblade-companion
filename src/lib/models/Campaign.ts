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

export type ScenarioType = 'core' | 'uncharted-setup' | 'uncharted-objective';

/**
 * A scenario transcribed by the player from their own book, for use in the campaign
 * game wizard (#19). All fields are user-entered (Zero Game Data).
 */
export interface Scenario {
	id: string;
	name: string;
	type: ScenarioType;
	players: string;
	setup: string;
	specialRules: string;
	victoryConditions: string;
	rewards: string;
	optionalRules: string;
	createdAt: string;
	updatedAt: string;
}

/**
 * An environment (table dressing + danger chart) transcribed by the player from their
 * own book, for use in the campaign game wizard (#19). All fields are user-entered
 * (Zero Game Data).
 */
export interface Environment {
	id: string;
	name: string;
	notes: string;
	createdAt: string;
	updatedAt: string;
}

/**
 * Persistent campaign progression for one warband member. Keyed by `entryId` (the roster-entry
 * instance) so multiple copies of the same character archetype each track their own progression
 * — "other copies of the same archetype do NOT share" (Seeker's Handbook / Campaign-App-Mapping).
 */
export interface CharacterCampaignState {
	/** Roster-entry instance id — the primary key tying this state to a specific warband member. */
	entryId: string;
	/** Character archetype id (for display/lookup; not unique when copies exist). */
	characterId: string;
	/** `dead` members are retained for history but removed from the active warband roster. */
	status: 'active' | 'dead';
	heroicTraits: string[];
	woundTraits: string[];
	/** Each point = -1 AD applied by computeEffectiveStats (ADR-007) */
	criticalWounds: number;
	currentHealth: number;
	relics: string[];
	gold: number;
	/** Experience-based resource earned per character (Seeker's Handbook p.51) */
	valor: number;
	/** Career totals accumulated across adventures via the guided postgame. */
	kills: number;
	objectives: number;
	gamesPlayed: number;
	recoveryRoll?: number;
}

/** Per-character result of a single adventure, recorded by the guided postgame; feeds the timeline. */
export interface MatchCharacterOutcome {
	entryId: string;
	characterId: string;
	result: 'survived' | 'disabled' | 'destroyed';
	kills: number;
	objectives: number;
	valorGained: number;
	/** Health boxes carried into the next adventure (after recovery), if changed. */
	currentHealth?: number;
	/** Outcome of the injury chart roll for destroyed members (table results are user-entered). */
	injuryOutcome?: 'none' | 'wound' | 'critical' | 'death';
	woundTraitAdded?: string;
	heroicTraitAdded?: string;
	relicAdded?: string;
}

export interface MatchRecord {
	id: string;
	date: string;
	result: 'win' | 'loss' | 'draw';
	scenario?: string;
	scenarioId?: string;
	environmentId?: string;
	threatLevel?: number;
	influenceEarned: number;
	goldEarned: number;
	notes: string;
	/** Per-character outcomes (timeline source). */
	outcomes: MatchCharacterOutcome[];
	/** Optional end-of-game snapshot of each member's state. */
	characterStates?: CharacterCampaignState[];
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
	/** Valor pool — starting valor from the base is stored here; players distribute it to characters manually. */
	valor: number;
	specialists: Specialist[];
	/** Persistent per-character progression, carried between adventures */
	characterStates: CharacterCampaignState[];
	matches: MatchRecord[];
	createdAt: string;
	updatedAt: string;
}
