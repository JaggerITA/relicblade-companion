export interface Upgrade {
	id: string;
	name: string;
	/** Slot name as printed on the card, e.g. "Concealment", "Apply Herb" — matched against Character.upgradeSlots by exact name */
	type: string;
	cost: number;
	effect: string;
	restrictions: string[];
	source: 'manual' | 'ocr' | 'import';
	createdAt: string;
}
