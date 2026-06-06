export type UpgradeSlotType = 'weapon' | 'potion' | 'tactic' | 'spell' | 'item' | 'other';

export interface Action {
	name: string;
	type: 'attack' | 'ability' | 'spell' | 'defense' | 'other';
	activationValue?: string;
	effect: string;
	bonus?: string;
}

export interface Character {
	id: string;
	name: string;
	faction: string;
	cost: number;
	stats: {
		actionDice: number;
		speed: number;
		armor: number;
		health: number;
	};
	keywords: string[];
	actions: Action[];
	upgradeSlots: UpgradeSlotType[];
	notes: string;
	imageUri?: string;
	source: 'manual' | 'ocr' | 'import';
	ocrConfidence?: number;
	createdAt: string;
	updatedAt: string;
}
