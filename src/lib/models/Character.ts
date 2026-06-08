/** A character's alignment: Advocate, Adversary, or Neutral (fieldable by either side) */
export type Path = 'advocate' | 'adversary' | 'neutral';

/**
 * Upgrade slot icon shown in a character's inventory (Card Anatomy: sword =
 * weapon, scroll = tactic, flask = potion, star = spell, bag = item). A
 * character may equip one upgrade per matching icon; the same type can repeat
 * to represent multiple slots of that kind. Matched against `Upgrade.type`.
 */
export type UpgradeSlotType = 'weapon' | 'tactic' | 'potion' | 'spell' | 'item';

/** Action symbol shown on the action bar, as defined by the rules (Card Anatomy: action type) */
export type ActionType =
	| 'melee-weapon'
	| 'ranged-weapon'
	| 'ranged-or-melee-weapon'
	| 'natural-weapon'
	| 'passive-ability'
	| 'magic-spell'
	| 'special-ability';

export interface Action {
	name: string;
	type: ActionType;
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
	/** One entry per upgrade slot icon shown in the inventory; repeat a type for multiple slots of that kind */
	upgradeSlots: UpgradeSlotType[];
	/**
	 * 1-based positions (left-to-right in the damage track) of health boxes that
	 * carry a broken-bone icon on the physical card. When a critical box is
	 * damaged the character suffers −1 AD until healed (Game Rules: Critically
	 * Wounded). Used by `computeEffectiveStats` to auto-apply the penalty.
	 * Example: Basilisk with 4 HP has a critical box at position 3.
	 */
	criticalHealthBoxes?: number[];
	notes: string;
	imageUri?: string;
	source: 'manual' | 'ocr' | 'import';
	ocrConfidence?: number;
	createdAt: string;
	updatedAt: string;
}
