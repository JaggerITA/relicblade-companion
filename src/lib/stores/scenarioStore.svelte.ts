import { dbDelete, dbGetAll, dbPut } from '$lib/utils/db.js';
import { newId } from '$lib/utils/id.js';
import type { Scenario, ScenarioType } from '$lib/models/Campaign.js';

export interface ScenarioInput {
	name: string;
	type: ScenarioType;
	players: string;
	setup: string;
	specialRules: string;
	victoryConditions: string;
	rewards: string;
	optionalRules: string;
}

function createScenarioStore() {
	let scenarios = $state<Scenario[]>([]);
	let loaded = $state(false);

	async function hydrate() {
		if (loaded) return;
		scenarios = await dbGetAll('scenarios');
		loaded = true;
	}

	function _reset() {
		scenarios = [];
		loaded = false;
	}

	function getScenario(id: string): Scenario | undefined {
		return scenarios.find((s) => s.id === id);
	}

	async function create(input: ScenarioInput): Promise<Scenario> {
		const now = new Date().toISOString();
		const scenario: Scenario = { id: newId(), ...input, createdAt: now, updatedAt: now };
		await dbPut('scenarios', scenario);
		scenarios = [...scenarios, scenario];
		return scenario;
	}

	async function update(id: string, input: ScenarioInput): Promise<void> {
		const scenario = getScenario(id);
		if (!scenario) return;
		const updated: Scenario = { ...scenario, ...input, updatedAt: new Date().toISOString() };
		await dbPut('scenarios', updated);
		scenarios = scenarios.map((s) => (s.id === id ? updated : s));
	}

	async function deleteScenario(id: string): Promise<void> {
		await dbDelete('scenarios', id);
		scenarios = scenarios.filter((s) => s.id !== id);
	}

	async function importScenarios(incoming: Scenario[], mode: 'merge' | 'replace'): Promise<void> {
		if (mode === 'replace') {
			for (const s of scenarios) await dbDelete('scenarios', s.id);
			scenarios = [];
		}
		for (const s of incoming) {
			await dbPut('scenarios', s);
			if (!scenarios.find((x) => x.id === s.id)) scenarios = [...scenarios, s];
			else scenarios = scenarios.map((x) => (x.id === s.id ? s : x));
		}
	}

	return {
		get scenarios() { return scenarios; },
		get loaded() { return loaded; },
		hydrate,
		_reset,
		getScenario,
		create,
		update,
		deleteScenario,
		importScenarios
	};
}

export const scenarioStore = createScenarioStore();
