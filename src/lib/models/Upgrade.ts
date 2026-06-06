import type { UpgradeSlotType } from './Character.js';

export interface Upgrade {
	id: string;
	name: string;
	type: UpgradeSlotType;
	cost: number;
	effect: string;
	restrictions: string[];
	source: 'manual' | 'ocr' | 'import';
	createdAt: string;
}
