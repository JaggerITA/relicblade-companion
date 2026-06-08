import type { Action, UpgradeSlotType } from './Character.js';

export interface Upgrade {
	id: string;
	name: string;
	/** Which slot icon this upgrade fills — matched against a Character's `upgradeSlots` */
	type: UpgradeSlotType;
	cost: number;
	/** General description of what the upgrade does — shown in picker rows and collection list. */
	effect: string;
	/** Structured action this upgrade grants (optional). When present, the action-type icon is shown in pickers and game view. */
	action?: Action;
	restrictions: string[];
	source: 'manual' | 'ocr' | 'import';
	createdAt: string;
}
