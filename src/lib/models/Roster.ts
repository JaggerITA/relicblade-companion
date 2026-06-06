/** ADR-006: standard = characters + upgrades; threat = characters only (campaign mode) */
export type LimitMode = 'standard' | 'threat';

export interface RosterEntry {
	characterId: string;
	equippedUpgradeIds: string[];
	/** Full entry cost (character + all equipped upgrades). Validation uses this per limitMode. */
	entryInfluence: number;
}

export interface Roster {
	id: string;
	name: string;
	faction: string;
	/** ADR-006: controls how usedInfluence is computed */
	limitMode: LimitMode;
	maxInfluence: number;
	entries: RosterEntry[];
	/** Computed sum of all entry costs (character + upgrades) */
	totalInfluence: number;
	createdAt: string;
	updatedAt: string;
	campaignId?: string;
}
