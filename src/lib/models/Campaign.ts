export type SpecialistType = 'chemist' | 'artisan' | 'smith' | 'scribe';
export type SpecialistLevel = 'novice' | 'journeyman' | 'master';

export interface Specialist {
	type: SpecialistType;
	level: SpecialistLevel;
	influencePaid: number;
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
	gold: number;
	specialists: Specialist[];
	matches: MatchRecord[];
	createdAt: string;
	updatedAt: string;
}
