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
import { baseTemplateStore, type BaseTemplateInput } from './baseTemplateStore.svelte.js';
import type { BaseTemplate } from '$lib/models/Campaign.js';

function makeInput(overrides: Partial<BaseTemplateInput> = {}): BaseTemplateInput {
	return {
		type: 'Arcane Tower',
		name: 'Sunspire Keep',
		notes: 'Extra Fate Weave',
		startingInfluence: 10,
		startingGold: 5,
		startingValor: 0,
		...overrides
	};
}

function makeTemplate(overrides: Partial<BaseTemplate> = {}): BaseTemplate {
	return {
		id: 'template-1',
		...makeInput(),
		createdAt: '',
		updatedAt: '',
		...overrides
	};
}

describe('baseTemplateStore', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(dbGetAll).mockResolvedValue([]);
		vi.mocked(dbPut).mockResolvedValue(undefined);
		vi.mocked(dbDelete).mockResolvedValue(undefined);
		vi.mocked(newId).mockReturnValue('template-1');
		baseTemplateStore._reset();
	});

	describe('hydrate', () => {
		it('loads templates from the db once', async () => {
			vi.mocked(dbGetAll).mockResolvedValue([makeTemplate()]);

			await baseTemplateStore.hydrate();

			expect(baseTemplateStore.loaded).toBe(true);
			expect(baseTemplateStore.templates).toHaveLength(1);
			expect(dbGetAll).toHaveBeenCalledWith('baseTemplates');

			await baseTemplateStore.hydrate();
			expect(dbGetAll).toHaveBeenCalledTimes(1);
		});
	});

	describe('create', () => {
		it('creates and persists a template', async () => {
			const template = await baseTemplateStore.create(makeInput());

			expect(template.id).toBe('template-1');
			expect(template.type).toBe('Arcane Tower');
			expect(template.startingInfluence).toBe(10);
			expect(dbPut).toHaveBeenCalledWith('baseTemplates', expect.objectContaining({ id: 'template-1' }));
			expect(baseTemplateStore.templates).toContainEqual(template);
		});
	});

	describe('update', () => {
		it('updates an existing template', async () => {
			await baseTemplateStore.create(makeInput());

			await baseTemplateStore.update('template-1', makeInput({ name: 'New Name', startingGold: 20 }));

			const updated = baseTemplateStore.getTemplate('template-1');
			expect(updated?.name).toBe('New Name');
			expect(updated?.startingGold).toBe(20);
		});
	});

	describe('deleteTemplate', () => {
		it('removes the template from state and db', async () => {
			await baseTemplateStore.create(makeInput());

			await baseTemplateStore.deleteTemplate('template-1');

			expect(baseTemplateStore.templates).toHaveLength(0);
			expect(dbDelete).toHaveBeenCalledWith('baseTemplates', 'template-1');
		});
	});

	describe('importTemplates', () => {
		it('merges incoming templates, adding new and updating existing', async () => {
			await baseTemplateStore.create(makeInput());
			const incoming = [
				makeTemplate({ id: 'template-1', name: 'Updated' }),
				makeTemplate({ id: 'template-2', name: 'Second' })
			];

			await baseTemplateStore.importTemplates(incoming, 'merge');

			expect(baseTemplateStore.templates).toHaveLength(2);
			expect(baseTemplateStore.getTemplate('template-1')?.name).toBe('Updated');
			expect(baseTemplateStore.getTemplate('template-2')?.name).toBe('Second');
		});

		it('replaces all templates when mode is replace', async () => {
			await baseTemplateStore.create(makeInput());
			const incoming = [makeTemplate({ id: 'template-2', name: 'Second' })];

			await baseTemplateStore.importTemplates(incoming, 'replace');

			expect(baseTemplateStore.templates).toHaveLength(1);
			expect(baseTemplateStore.getTemplate('template-1')).toBeUndefined();
			expect(baseTemplateStore.getTemplate('template-2')?.name).toBe('Second');
			expect(dbDelete).toHaveBeenCalledWith('baseTemplates', 'template-1');
		});
	});
});
