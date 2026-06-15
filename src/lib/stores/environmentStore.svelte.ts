import { dbDelete, dbGetAll, dbPut } from '$lib/utils/db.js';
import { newId } from '$lib/utils/id.js';
import type { Environment } from '$lib/models/Campaign.js';

export interface EnvironmentInput {
	name: string;
	notes: string;
}

function createEnvironmentStore() {
	let environments = $state<Environment[]>([]);
	let loaded = $state(false);

	async function hydrate() {
		if (loaded) return;
		environments = await dbGetAll('environments');
		loaded = true;
	}

	function _reset() {
		environments = [];
		loaded = false;
	}

	function getEnvironment(id: string): Environment | undefined {
		return environments.find((e) => e.id === id);
	}

	async function create(input: EnvironmentInput): Promise<Environment> {
		const now = new Date().toISOString();
		const environment: Environment = { id: newId(), ...input, createdAt: now, updatedAt: now };
		await dbPut('environments', environment);
		environments = [...environments, environment];
		return environment;
	}

	async function update(id: string, input: EnvironmentInput): Promise<void> {
		const environment = getEnvironment(id);
		if (!environment) return;
		const updated: Environment = { ...environment, ...input, updatedAt: new Date().toISOString() };
		await dbPut('environments', updated);
		environments = environments.map((e) => (e.id === id ? updated : e));
	}

	async function deleteEnvironment(id: string): Promise<void> {
		await dbDelete('environments', id);
		environments = environments.filter((e) => e.id !== id);
	}

	async function importEnvironments(incoming: Environment[], mode: 'merge' | 'replace'): Promise<void> {
		if (mode === 'replace') {
			for (const e of environments) await dbDelete('environments', e.id);
			environments = [];
		}
		for (const e of incoming) {
			await dbPut('environments', e);
			if (!environments.find((x) => x.id === e.id)) environments = [...environments, e];
			else environments = environments.map((x) => (x.id === e.id ? e : x));
		}
	}

	return {
		get environments() { return environments; },
		get loaded() { return loaded; },
		hydrate,
		_reset,
		getEnvironment,
		create,
		update,
		deleteEnvironment,
		importEnvironments
	};
}

export const environmentStore = createEnvironmentStore();
