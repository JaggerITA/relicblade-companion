/** A character's alignment: Advocate, Adversary, or Neutral (fieldable by either side) */
export type Path = 'advocate' | 'adversary' | 'neutral';

export interface Action {
	name: string;
	type: 'attack' | 'ability' | 'spell' | 'defense' | 'other';
	/** Number of dice rolled for this action, e.g. 2 for "x2" on the card */
	diceCount?: number;
	/** Roll threshold to activate, e.g. "4+" */
	activationValue?: string;
	effect: string;
	/** Modifier added to the roll, e.g. "+3" */
	bonus?: string;
}

export interface Character {
	id: string;
	name: string;
	faction: string;
	path: Path;
	cost: number;
	stats: {
		actionDice: number;
		speed: number;
		armor: number;
		health: number;
	};
	keywords: string[];
	actions: Action[];
	/** Upgrade slot names as printed on the card, e.g. "Artisan", "Scroll" — user-defined, matched by exact name */
	upgradeSlots: string[];
	notes: string;
	imageUri?: string;
	source: 'manual' | 'ocr' | 'import';
	ocrConfidence?: number;
	createdAt: string;
	updatedAt: string;
}
