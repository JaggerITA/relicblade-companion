import { dbDelete, dbGetAll, dbPut } from '$lib/utils/db.js';
import { newId } from '$lib/utils/id.js';
import type { BaseTemplate } from '$lib/models/Campaign.js';

export interface BaseTemplateInput {
	type: string;
	name: string;
	notes: string;
	startingInfluence: number;
	startingGold: number;
	startingValor: number;
}

function createBaseTemplateStore() {
	let templates = $state<BaseTemplate[]>([]);
	let loaded = $state(false);

	async function hydrate() {
		if (loaded) return;
		templates = await dbGetAll('baseTemplates');
		loaded = true;
	}

	function _reset() {
		templates = [];
		loaded = false;
	}

	function getTemplate(id: string): BaseTemplate | undefined {
		return templates.find((t) => t.id === id);
	}

	async function create(input: BaseTemplateInput): Promise<BaseTemplate> {
		const now = new Date().toISOString();
		const template: BaseTemplate = { id: newId(), ...input, createdAt: now, updatedAt: now };
		await dbPut('baseTemplates', template);
		templates = [...templates, template];
		return template;
	}

	async function update(id: string, input: BaseTemplateInput): Promise<void> {
		const template = getTemplate(id);
		if (!template) return;
		const updated: BaseTemplate = { ...template, ...input, updatedAt: new Date().toISOString() };
		await dbPut('baseTemplates', updated);
		templates = templates.map((t) => (t.id === id ? updated : t));
	}

	async function deleteTemplate(id: string): Promise<void> {
		await dbDelete('baseTemplates', id);
		templates = templates.filter((t) => t.id !== id);
	}

	async function importTemplates(incoming: BaseTemplate[], mode: 'merge' | 'replace'): Promise<void> {
		if (mode === 'replace') {
			for (const t of templates) await dbDelete('baseTemplates', t.id);
			templates = [];
		}
		for (const t of incoming) {
			await dbPut('baseTemplates', t);
			if (!templates.find((x) => x.id === t.id)) templates = [...templates, t];
			else templates = templates.map((x) => (x.id === t.id ? t : x));
		}
	}

	return {
		get templates() { return templates; },
		get loaded() { return loaded; },
		hydrate,
		_reset,
		getTemplate,
		create,
		update,
		deleteTemplate,
		importTemplates
	};
}

export const baseTemplateStore = createBaseTemplateStore();
