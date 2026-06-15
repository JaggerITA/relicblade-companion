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
import { scenarioStore, type ScenarioInput } from './scenarioStore.svelte.js';
import type { Scenario } from '$lib/models/Campaign.js';

function makeInput(overrides: Partial<ScenarioInput> = {}): ScenarioInput {
	return {
		name: 'Ancient Waystones',
		type: 'core',
		players: '2',
		setup: 'Set up as described in the book.',
		specialRules: 'Waystones grant a bonus.',
		victoryConditions: 'Control the most waystones.',
		rewards: '10 influence',
		optionalRules: '',
		...overrides
	};
}

function makeScenario(overrides: Partial<Scenario> = {}): Scenario {
	return {
		id: 'scenario-1',
		...makeInput(),
		createdAt: '',
		updatedAt: '',
		...overrides
	};
}

describe('scenarioStore', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(dbGetAll).mockResolvedValue([]);
		vi.mocked(dbPut).mockResolvedValue(undefined);
		vi.mocked(dbDelete).mockResolvedValue(undefined);
		vi.mocked(newId).mockReturnValue('scenario-1');
		scenarioStore._reset();
	});

	describe('hydrate', () => {
		it('loads scenarios from the db once', async () => {
			vi.mocked(dbGetAll).mockResolvedValue([makeScenario()]);

			await scenarioStore.hydrate();

			expect(scenarioStore.loaded).toBe(true);
			expect(scenarioStore.scenarios).toHaveLength(1);
			expect(dbGetAll).toHaveBeenCalledWith('scenarios');

			await scenarioStore.hydrate();
			expect(dbGetAll).toHaveBeenCalledTimes(1);
		});
	});

	describe('create', () => {
		it('creates and persists a scenario', async () => {
			const scenario = await scenarioStore.create(makeInput());

			expect(scenario.id).toBe('scenario-1');
			expect(scenario.name).toBe('Ancient Waystones');
			expect(scenario.type).toBe('core');
			expect(dbPut).toHaveBeenCalledWith('scenarios', expect.objectContaining({ id: 'scenario-1' }));
			expect(scenarioStore.scenarios).toContainEqual(scenario);
		});
	});

	describe('update', () => {
		it('updates an existing scenario', async () => {
			await scenarioStore.create(makeInput());

			await scenarioStore.update('scenario-1', makeInput({ name: 'New Name', type: 'uncharted-setup' }));

			const updated = scenarioStore.getScenario('scenario-1');
			expect(updated?.name).toBe('New Name');
			expect(updated?.type).toBe('uncharted-setup');
		});
	});

	describe('deleteScenario', () => {
		it('removes the scenario from state and db', async () => {
			await scenarioStore.create(makeInput());

			await scenarioStore.deleteScenario('scenario-1');

			expect(scenarioStore.scenarios).toHaveLength(0);
			expect(dbDelete).toHaveBeenCalledWith('scenarios', 'scenario-1');
		});
	});

	describe('importScenarios', () => {
		it('merges incoming scenarios, adding new and updating existing', async () => {
			await scenarioStore.create(makeInput());
			const incoming = [
				makeScenario({ id: 'scenario-1', name: 'Updated' }),
				makeScenario({ id: 'scenario-2', name: 'Second' })
			];

			await scenarioStore.importScenarios(incoming, 'merge');

			expect(scenarioStore.scenarios).toHaveLength(2);
			expect(scenarioStore.getScenario('scenario-1')?.name).toBe('Updated');
			expect(scenarioStore.getScenario('scenario-2')?.name).toBe('Second');
		});

		it('replaces all scenarios when mode is replace', async () => {
			await scenarioStore.create(makeInput());
			const incoming = [makeScenario({ id: 'scenario-2', name: 'Second' })];

			await scenarioStore.importScenarios(incoming, 'replace');

			expect(scenarioStore.scenarios).toHaveLength(1);
			expect(scenarioStore.getScenario('scenario-1')).toBeUndefined();
			expect(scenarioStore.getScenario('scenario-2')?.name).toBe('Second');
			expect(dbDelete).toHaveBeenCalledWith('scenarios', 'scenario-1');
		});
	});
});
