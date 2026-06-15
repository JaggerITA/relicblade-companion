import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { BaseTemplate, Campaign, Environment, Scenario } from '$lib/models/Campaign.js';
import type { Character } from '$lib/models/Character.js';
import type { GameState } from '$lib/models/GameState.js';
import type { Roster } from '$lib/models/Roster.js';
import type { Upgrade } from '$lib/models/Upgrade.js';

const DB_NAME = 'relicblade';
const DB_VERSION = 3;

interface RelicbladeDB extends DBSchema {
	characters: {
		key: string;
		value: Character;
		indexes: { 'by-faction': string; 'by-updated': string };
	};
	upgrades: {
		key: string;
		value: Upgrade;
		indexes: { 'by-type': string; 'by-faction': string };
	};
	rosters: {
		key: string;
		value: Roster;
		indexes: { 'by-campaign': string; 'by-updated': string };
	};
	games: {
		key: string;
		value: GameState;
		indexes: { 'by-campaign': string; 'by-started': string };
	};
	campaigns: {
		key: string;
		value: Campaign;
		indexes: { 'by-updated': string };
	};
	baseTemplates: {
		key: string;
		value: BaseTemplate;
		indexes: { 'by-updated': string };
	};
	scenarios: {
		key: string;
		value: Scenario;
		indexes: { 'by-updated': string };
	};
	environments: {
		key: string;
		value: Environment;
		indexes: { 'by-updated': string };
	};
	settings: {
		key: string;
		value: unknown;
	};
}

type StoreName =
	| 'characters'
	| 'upgrades'
	| 'rosters'
	| 'games'
	| 'campaigns'
	| 'baseTemplates'
	| 'scenarios'
	| 'environments'
	| 'settings';

let dbPromise: Promise<IDBPDatabase<RelicbladeDB>> | null = null;

function getDb(): Promise<IDBPDatabase<RelicbladeDB>> {
	if (!dbPromise) {
		dbPromise = openDB<RelicbladeDB>(DB_NAME, DB_VERSION, {
			upgrade(db, oldVersion) {
				if (oldVersion < 1) {
					const c = db.createObjectStore('characters', { keyPath: 'id' });
					c.createIndex('by-faction', 'faction');
					c.createIndex('by-updated', 'updatedAt');

					const u = db.createObjectStore('upgrades', { keyPath: 'id' });
					u.createIndex('by-type', 'type');
					// upgrades don't have a faction field in the model but index is useful for future filtering
					u.createIndex('by-faction', 'type'); // maps to type as faction proxy

					const r = db.createObjectStore('rosters', { keyPath: 'id' });
					r.createIndex('by-campaign', 'campaignId');
					r.createIndex('by-updated', 'updatedAt');

					const g = db.createObjectStore('games', { keyPath: 'id' });
					g.createIndex('by-campaign', 'campaignId');
					g.createIndex('by-started', 'startedAt');

					const ca = db.createObjectStore('campaigns', { keyPath: 'id' });
					ca.createIndex('by-updated', 'updatedAt');

					db.createObjectStore('settings');
				}
				if (oldVersion < 2) {
					const bt = db.createObjectStore('baseTemplates', { keyPath: 'id' });
					bt.createIndex('by-updated', 'updatedAt');
				}
				if (oldVersion < 3) {
					const sc = db.createObjectStore('scenarios', { keyPath: 'id' });
					sc.createIndex('by-updated', 'updatedAt');

					const env = db.createObjectStore('environments', { keyPath: 'id' });
					env.createIndex('by-updated', 'updatedAt');
				}
			}
		});
	}
	return dbPromise;
}

/** Generic repo helpers */

export async function dbGetAll<S extends Exclude<StoreName, 'settings'>>(
	store: S
): Promise<RelicbladeDB[S]['value'][]> {
	const db = await getDb();
	return db.getAll(store) as Promise<RelicbladeDB[S]['value'][]>;
}

export async function dbGet<S extends Exclude<StoreName, 'settings'>>(
	store: S,
	id: string
): Promise<RelicbladeDB[S]['value'] | undefined> {
	const db = await getDb();
	return db.get(store, id) as Promise<RelicbladeDB[S]['value'] | undefined>;
}

export async function dbPut<S extends Exclude<StoreName, 'settings'>>(
	store: S,
	value: RelicbladeDB[S]['value']
): Promise<void> {
	const db = await getDb();
	await db.put(store, value as RelicbladeDB[S]['value']);
}

export async function dbDelete<S extends Exclude<StoreName, 'settings'>>(
	store: S,
	id: string
): Promise<void> {
	const db = await getDb();
	await db.delete(store, id);
}

export async function dbGetAllFromIndex<S extends Exclude<StoreName, 'settings'>>(
	store: S,
	index: string,
	key: string
): Promise<RelicbladeDB[S]['value'][]> {
	const db = await getDb();
	return (db as IDBPDatabase).getAllFromIndex(store, index, key) as Promise<
		RelicbladeDB[S]['value'][]
	>;
}

/** Settings key-value helpers */

export async function settingsGet<T>(key: string): Promise<T | undefined> {
	const db = await getDb();
	return db.get('settings', key) as Promise<T | undefined>;
}

export async function settingsPut(key: string, value: unknown): Promise<void> {
	const db = await getDb();
	await db.put('settings', value, key);
}
