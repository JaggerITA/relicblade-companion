import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('$lib/utils/db.js', () => ({
	dbGetAll: vi.fn(),
	dbPut: vi.fn(),
	dbDelete: vi.fn()
}));

vi.mock('$lib/utils/id.js', () => ({
	newId: vi.fn()
}));

import { dbDelete, dbGetAll, dbPut } from '$lib/utils/db.js';
import { newId } from '$lib/utils/id.js';
import { collectionStore } from './collectionStore.svelte.js';

const baseCharacter = {
	name: 'Test Knight',
	faction: 'Temple of Justice',
	cost: 20,
	stats: { actionDice: 3, speed: 5, armor: 3, health: 5 },
	keywords: ['Hero'],
	actions: [],
	upgradeSlots: [] as const,
	notes: '',
	source: 'manual' as const
};

const baseUpgrade = {
	name: 'Longsword',
	type: 'weapon' as const,
	cost: 4,
	effect: '+2 melee damage',
	restrictions: [],
	source: 'manual' as const
};

describe('collectionStore', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(dbGetAll).mockResolvedValue([]);
		vi.mocked(dbPut).mockResolvedValue(undefined);
		vi.mocked(dbDelete).mockResolvedValue(undefined);
		vi.mocked(newId).mockReturnValue('test-uuid');
		collectionStore._reset();
	});

	it('hydrates characters and upgrades from db', async () => {
		const chars = [{ ...baseCharacter, id: '1', createdAt: '', updatedAt: '' }];
		vi.mocked(dbGetAll).mockResolvedValueOnce(chars).mockResolvedValueOnce([]);

		await collectionStore.hydrate();

		expect(collectionStore.characters).toHaveLength(1);
		expect(collectionStore.characters[0].name).toBe('Test Knight');
		expect(dbGetAll).toHaveBeenCalledWith('characters');
		expect(dbGetAll).toHaveBeenCalledWith('upgrades');
	});

	it('addCharacter writes to db and returns the new character', async () => {
		const result = await collectionStore.addCharacter(baseCharacter);

		expect(dbPut).toHaveBeenCalledWith(
			'characters',
			expect.objectContaining({ id: 'test-uuid', name: 'Test Knight' })
		);
		expect(result.id).toBe('test-uuid');
		expect(result.createdAt).toBeTruthy();
		expect(collectionStore.characters).toHaveLength(1);
	});

	it('updateCharacter updates updatedAt and calls dbPut', async () => {
		const char = { ...baseCharacter, id: 'abc', createdAt: '2026-01-01', updatedAt: '2026-01-01' };
		await collectionStore.updateCharacter(char);

		expect(dbPut).toHaveBeenCalledWith('characters', expect.objectContaining({ id: 'abc' }));
		const saved = vi.mocked(dbPut).mock.calls[0][1] as typeof char;
		expect(saved.updatedAt).not.toBe('2026-01-01');
	});

	it('deleteCharacter calls dbDelete and removes from state', async () => {
		await collectionStore.addCharacter(baseCharacter);
		vi.clearAllMocks();
		vi.mocked(dbDelete).mockResolvedValue(undefined);

		await collectionStore.deleteCharacter('test-uuid');

		expect(dbDelete).toHaveBeenCalledWith('characters', 'test-uuid');
		expect(collectionStore.characters).toHaveLength(0);
	});

	it('addUpgrade writes to db', async () => {
		const result = await collectionStore.addUpgrade(baseUpgrade);

		expect(dbPut).toHaveBeenCalledWith('upgrades', expect.objectContaining({ name: 'Longsword' }));
		expect(result.id).toBe('test-uuid');
		expect(collectionStore.upgrades).toHaveLength(1);
	});

	it('exportCollection returns current state snapshot', () => {
		const exported = collectionStore.exportCollection();

		expect(exported).toHaveProperty('characters');
		expect(exported).toHaveProperty('upgrades');
		expect(exported.version).toBe(1);
		expect(exported.exportedAt).toBeTruthy();
	});
});
