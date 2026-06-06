import type { Character } from './Character.js';
import type { Upgrade } from './Upgrade.js';

export interface Collection {
	characters: Character[];
	upgrades: Upgrade[];
	exportedAt: string;
	version: number;
}
