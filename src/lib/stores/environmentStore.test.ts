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
import { environmentStore, type EnvironmentInput } from './environmentStore.svelte.js';
import type { Environment } from '$lib/models/Campaign.js';

function makeInput(overrides: Partial<EnvironmentInput> = {}): EnvironmentInput {
	return {
		name: 'Cyclopean Ruins',
		notes: 'Ruins of an ancient city.',
		...overrides
	};
}

function makeEnvironment(overrides: Partial<Environment> = {}): Environment {
	return {
		id: 'environment-1',
		...makeInput(),
		createdAt: '',
		updatedAt: '',
		...overrides
	};
}

describe('environmentStore', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(dbGetAll).mockResolvedValue([]);
		vi.mocked(dbPut).mockResolvedValue(undefined);
		vi.mocked(dbDelete).mockResolvedValue(undefined);
		vi.mocked(newId).mockReturnValue('environment-1');
		environmentStore._reset();
	});

	describe('hydrate', () => {
		it('loads environments from the db once', async () => {
			vi.mocked(dbGetAll).mockResolvedValue([makeEnvironment()]);

			await environmentStore.hydrate();

			expect(environmentStore.loaded).toBe(true);
			expect(environmentStore.environments).toHaveLength(1);
			expect(dbGetAll).toHaveBeenCalledWith('environments');

			await environmentStore.hydrate();
			expect(dbGetAll).toHaveBeenCalledTimes(1);
		});
	});

	describe('create', () => {
		it('creates and persists an environment', async () => {
			const environment = await environmentStore.create(makeInput());

			expect(environment.id).toBe('environment-1');
			expect(environment.name).toBe('Cyclopean Ruins');
			expect(dbPut).toHaveBeenCalledWith('environments', expect.objectContaining({ id: 'environment-1' }));
			expect(environmentStore.environments).toContainEqual(environment);
		});
	});

	describe('update', () => {
		it('updates an existing environment', async () => {
			await environmentStore.create(makeInput());

			await environmentStore.update('environment-1', makeInput({ name: 'New Name', notes: 'Updated notes' }));

			const updated = environmentStore.getEnvironment('environment-1');
			expect(updated?.name).toBe('New Name');
			expect(updated?.notes).toBe('Updated notes');
		});
	});

	describe('deleteEnvironment', () => {
		it('removes the environment from state and db', async () => {
			await environmentStore.create(makeInput());

			await environmentStore.deleteEnvironment('environment-1');

			expect(environmentStore.environments).toHaveLength(0);
			expect(dbDelete).toHaveBeenCalledWith('environments', 'environment-1');
		});
	});

	describe('importEnvironments', () => {
		it('merges incoming environments, adding new and updating existing', async () => {
			await environmentStore.create(makeInput());
			const incoming = [
				makeEnvironment({ id: 'environment-1', name: 'Updated' }),
				makeEnvironment({ id: 'environment-2', name: 'Second' })
			];

			await environmentStore.importEnvironments(incoming, 'merge');

			expect(environmentStore.environments).toHaveLength(2);
			expect(environmentStore.getEnvironment('environment-1')?.name).toBe('Updated');
			expect(environmentStore.getEnvironment('environment-2')?.name).toBe('Second');
		});

		it('replaces all environments when mode is replace', async () => {
			await environmentStore.create(makeInput());
			const incoming = [makeEnvironment({ id: 'environment-2', name: 'Second' })];

			await environmentStore.importEnvironments(incoming, 'replace');

			expect(environmentStore.environments).toHaveLength(1);
			expect(environmentStore.getEnvironment('environment-1')).toBeUndefined();
			expect(environmentStore.getEnvironment('environment-2')?.name).toBe('Second');
			expect(dbDelete).toHaveBeenCalledWith('environments', 'environment-1');
		});
	});
});
