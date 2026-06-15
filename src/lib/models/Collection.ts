import type { Character } from './Character.js';
import type { Upgrade } from './Upgrade.js';
import type { Roster } from './Roster.js';
import type { BaseTemplate, Campaign, Environment, Scenario } from './Campaign.js';

export interface Collection {
	characters: Character[];
	upgrades: Upgrade[];
	/** Included from v2 backups. Absent in older exports — importer should treat undefined as empty. */
	rosters?: Roster[];
	/** Included from v3 backups. Absent in older exports — importer should treat undefined as empty. */
	campaigns?: Campaign[];
	/** Included from v4 backups. Absent in older exports — importer should treat undefined as empty. */
	baseTemplates?: BaseTemplate[];
	/** Included from v5 backups. Absent in older exports — importer should treat undefined as empty. */
	scenarios?: Scenario[];
	/** Included from v5 backups. Absent in older exports — importer should treat undefined as empty. */
	environments?: Environment[];
	exportedAt: string;
	version: number;
}
