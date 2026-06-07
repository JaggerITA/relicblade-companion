import type { UpgradeSlotType } from './Character.js';

export interface Upgrade {
	id: string;
	name: string;
	/** Which slot icon this upgrade fills — matched against a Character's `upgradeSlots` */
	type: UpgradeSlotType;
	cost: number;
	effect: string;
	restrictions: string[];
	source: 'manual' | 'ocr' | 'import';
	createdAt: string;
}
