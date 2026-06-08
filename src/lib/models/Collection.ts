import type { Character } from './Character.js';
import type { Upgrade } from './Upgrade.js';
import type { Roster } from './Roster.js';

export interface Collection {
	characters: Character[];
	upgrades: Upgrade[];
	/** Included from v2 backups. Absent in older exports — importer should treat undefined as empty. */
	rosters?: Roster[];
	exportedAt: string;
	version: number;
}
