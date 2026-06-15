<script lang="ts">
	import { base } from '$app/paths';
	import Button from '$lib/components/shared/Button.svelte';
	import Modal from '$lib/components/shared/Modal.svelte';
	import { environmentStore, type EnvironmentInput } from '$lib/stores/environmentStore.svelte.js';
	import { scenarioStore, type ScenarioInput } from '$lib/stores/scenarioStore.svelte.js';
	import type { ScenarioType } from '$lib/models/Campaign.js';

	$effect(() => {
		scenarioStore.hydrate();
		environmentStore.hydrate();
	});

	const scenarioTypes: { value: ScenarioType; label: string }[] = [
		{ value: 'core', label: 'Core' },
		{ value: 'uncharted-setup', label: 'Uncharted: Setup' },
		{ value: 'uncharted-objective', label: 'Uncharted: Objective' }
	];

	const scenarioTypeLabel: Record<ScenarioType, string> = {
		core: 'Core',
		'uncharted-setup': 'Uncharted: Setup',
		'uncharted-objective': 'Uncharted: Objective'
	};

	function emptyScenarioInput(): ScenarioInput {
		return {
			name: '',
			type: 'core',
			players: '',
			setup: '',
			specialRules: '',
			victoryConditions: '',
			rewards: '',
			optionalRules: ''
		};
	}

	let showScenarioModal = $state(false);
	let editingScenarioId = $state<string | null>(null);
	let scenarioInput = $state<ScenarioInput>(emptyScenarioInput());
	let scenarioErrors = $state<Record<string, string>>({});
	let confirmDeleteScenarioId = $state<string | null>(null);

	function openScenarioModal(id: string | null): void {
		const scenario = id ? scenarioStore.getScenario(id) : undefined;
		editingScenarioId = id;
		scenarioInput = scenario
			? {
					name: scenario.name,
					type: scenario.type,
					players: scenario.players,
					setup: scenario.setup,
					specialRules: scenario.specialRules,
					victoryConditions: scenario.victoryConditions,
					rewards: scenario.rewards,
					optionalRules: scenario.optionalRules
				}
			: emptyScenarioInput();
		scenarioErrors = {};
		showScenarioModal = true;
	}

	async function saveScenario(): Promise<void> {
		const errors: Record<string, string> = {};
		if (!scenarioInput.name.trim()) errors.name = 'Name is required';
		scenarioErrors = errors;
		if (Object.keys(errors).length > 0) return;
		const input: ScenarioInput = { ...scenarioInput, name: scenarioInput.name.trim() };
		if (editingScenarioId) {
			await scenarioStore.update(editingScenarioId, input);
		} else {
			await scenarioStore.create(input);
		}
		showScenarioModal = false;
	}

	function emptyEnvironmentInput(): EnvironmentInput {
		return { name: '', notes: '' };
	}

	let showEnvironmentModal = $state(false);
	let editingEnvironmentId = $state<string | null>(null);
	let environmentInput = $state<EnvironmentInput>(emptyEnvironmentInput());
	let environmentErrors = $state<Record<string, string>>({});
	let confirmDeleteEnvironmentId = $state<string | null>(null);

	function openEnvironmentModal(id: string | null): void {
		const environment = id ? environmentStore.getEnvironment(id) : undefined;
		editingEnvironmentId = id;
		environmentInput = environment
			? { name: environment.name, notes: environment.notes }
			: emptyEnvironmentInput();
		environmentErrors = {};
		showEnvironmentModal = true;
	}

	async function saveEnvironment(): Promise<void> {
		const errors: Record<string, string> = {};
		if (!environmentInput.name.trim()) errors.name = 'Name is required';
		environmentErrors = errors;
		if (Object.keys(errors).length > 0) return;
		const input: EnvironmentInput = { ...environmentInput, name: environmentInput.name.trim() };
		if (editingEnvironmentId) {
			await environmentStore.update(editingEnvironmentId, input);
		} else {
			await environmentStore.create(input);
		}
		showEnvironmentModal = false;
	}
</script>

<div class="p-4">
	<header class="mb-6 flex items-center gap-3">
		<a href="{base}/campaign" class="text-on-muted hover:text-on-surface">‹</a>
		<h1 class="text-xl font-bold">Scenarios &amp; Environments</h1>
	</header>

	<p class="mb-6 text-sm text-on-muted">
		Transcribe scenarios and environments from your own book here, so you can pick them
		when setting up a campaign game.
	</p>

	<!-- Scenarios -->
	<section class="mb-6">
		<h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-on-muted">Scenarios</h2>
		{#if scenarioStore.scenarios.length > 0}
			<ul class="mb-3 space-y-2">
				{#each scenarioStore.scenarios as scenario (scenario.id)}
					<li class="card flex items-center justify-between gap-3">
						<div class="min-w-0">
							<p class="truncate text-sm font-medium">{scenario.name}</p>
							<p class="truncate text-xs text-on-muted">
								{scenarioTypeLabel[scenario.type]}{#if scenario.players} · {scenario.players} players{/if}
							</p>
						</div>
						<div class="flex shrink-0 gap-3 text-sm">
							<button type="button" onclick={() => openScenarioModal(scenario.id)} class="text-accent">
								Edit
							</button>
							<button
								type="button"
								onclick={() => (confirmDeleteScenarioId = scenario.id)}
								class="text-on-muted hover:text-on-surface"
							>
								Delete
							</button>
						</div>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="mb-3 text-sm text-on-muted">No scenarios yet.</p>
		{/if}
		<Button variant="ghost" onclick={() => openScenarioModal(null)}>+ New scenario</Button>
	</section>

	<!-- Environments -->
	<section>
		<h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-on-muted">Environments</h2>
		{#if environmentStore.environments.length > 0}
			<ul class="mb-3 space-y-2">
				{#each environmentStore.environments as environment (environment.id)}
					<li class="card flex items-center justify-between gap-3">
						<div class="min-w-0">
							<p class="truncate text-sm font-medium">{environment.name}</p>
							{#if environment.notes}
								<p class="truncate text-xs text-on-muted">{environment.notes}</p>
							{/if}
						</div>
						<div class="flex shrink-0 gap-3 text-sm">
							<button type="button" onclick={() => openEnvironmentModal(environment.id)} class="text-accent">
								Edit
							</button>
							<button
								type="button"
								onclick={() => (confirmDeleteEnvironmentId = environment.id)}
								class="text-on-muted hover:text-on-surface"
							>
								Delete
							</button>
						</div>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="mb-3 text-sm text-on-muted">No environments yet.</p>
		{/if}
		<Button variant="ghost" onclick={() => openEnvironmentModal(null)}>+ New environment</Button>
	</section>
</div>

<!-- Scenario create/edit modal -->
<Modal
	open={showScenarioModal}
	title={editingScenarioId ? 'Edit scenario' : 'New scenario'}
	onclose={() => (showScenarioModal = false)}
>
	{#snippet children()}
		<div class="space-y-4">
			<div>
				<label class="mb-1 block text-sm" for="scenarioName">Name *</label>
				<input
					id="scenarioName"
					type="text"
					bind:value={scenarioInput.name}
					placeholder="As printed in your Seeker's Handbook"
					class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-accent"
				/>
				{#if scenarioErrors.name}<p class="mt-1 text-xs text-red-400">{scenarioErrors.name}</p>{/if}
			</div>
			<div class="grid grid-cols-2 gap-3">
				<div>
					<label class="mb-1 block text-sm" for="scenarioType">Type</label>
					<select
						id="scenarioType"
						bind:value={scenarioInput.type}
						class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-accent"
					>
						{#each scenarioTypes as opt (opt.value)}
							<option value={opt.value}>{opt.label}</option>
						{/each}
					</select>
				</div>
				<div>
					<label class="mb-1 block text-sm" for="scenarioPlayers">Players</label>
					<input
						id="scenarioPlayers"
						type="text"
						bind:value={scenarioInput.players}
						placeholder="e.g. 2 or 2-4"
						class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-accent"
					/>
				</div>
			</div>
			<div>
				<label class="mb-1 block text-sm" for="scenarioSetup">Setup</label>
				<textarea
					id="scenarioSetup"
					bind:value={scenarioInput.setup}
					rows="3"
					class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-accent"
				></textarea>
			</div>
			<div>
				<label class="mb-1 block text-sm" for="scenarioSpecialRules">Special rules</label>
				<textarea
					id="scenarioSpecialRules"
					bind:value={scenarioInput.specialRules}
					rows="3"
					class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-accent"
				></textarea>
			</div>
			<div>
				<label class="mb-1 block text-sm" for="scenarioVictory">Victory conditions</label>
				<textarea
					id="scenarioVictory"
					bind:value={scenarioInput.victoryConditions}
					rows="2"
					class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-accent"
				></textarea>
			</div>
			<div>
				<label class="mb-1 block text-sm" for="scenarioRewards">Rewards</label>
				<textarea
					id="scenarioRewards"
					bind:value={scenarioInput.rewards}
					rows="2"
					class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-accent"
				></textarea>
			</div>
			<div>
				<label class="mb-1 block text-sm" for="scenarioOptional">Optional rules</label>
				<textarea
					id="scenarioOptional"
					bind:value={scenarioInput.optionalRules}
					rows="2"
					class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-accent"
				></textarea>
			</div>
		</div>
	{/snippet}
	{#snippet actions()}
		<Button variant="ghost" onclick={() => (showScenarioModal = false)}>Cancel</Button>
		<Button variant="primary" onclick={saveScenario}>Save</Button>
	{/snippet}
</Modal>

<!-- Scenario delete confirm -->
<Modal
	open={confirmDeleteScenarioId !== null}
	title="Delete scenario?"
	onclose={() => (confirmDeleteScenarioId = null)}
>
	{#snippet children()}
		<p class="text-on-muted">This cannot be undone.</p>
	{/snippet}
	{#snippet actions()}
		<Button variant="ghost" onclick={() => (confirmDeleteScenarioId = null)}>Cancel</Button>
		<Button
			variant="danger"
			onclick={async () => {
				if (!confirmDeleteScenarioId) return;
				await scenarioStore.deleteScenario(confirmDeleteScenarioId);
				confirmDeleteScenarioId = null;
			}}
		>
			Delete
		</Button>
	{/snippet}
</Modal>

<!-- Environment create/edit modal -->
<Modal
	open={showEnvironmentModal}
	title={editingEnvironmentId ? 'Edit environment' : 'New environment'}
	onclose={() => (showEnvironmentModal = false)}
>
	{#snippet children()}
		<div class="space-y-4">
			<div>
				<label class="mb-1 block text-sm" for="environmentName">Name *</label>
				<input
					id="environmentName"
					type="text"
					bind:value={environmentInput.name}
					placeholder="As printed in your Seeker's Handbook"
					class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-accent"
				/>
				{#if environmentErrors.name}<p class="mt-1 text-xs text-red-400">{environmentErrors.name}</p>{/if}
			</div>
			<div>
				<label class="mb-1 block text-sm" for="environmentNotes">Notes</label>
				<textarea
					id="environmentNotes"
					bind:value={environmentInput.notes}
					rows="4"
					placeholder="Danger chart, special treasures, etc."
					class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-accent"
				></textarea>
			</div>
		</div>
	{/snippet}
	{#snippet actions()}
		<Button variant="ghost" onclick={() => (showEnvironmentModal = false)}>Cancel</Button>
		<Button variant="primary" onclick={saveEnvironment}>Save</Button>
	{/snippet}
</Modal>

<!-- Environment delete confirm -->
<Modal
	open={confirmDeleteEnvironmentId !== null}
	title="Delete environment?"
	onclose={() => (confirmDeleteEnvironmentId = null)}
>
	{#snippet children()}
		<p class="text-on-muted">This cannot be undone.</p>
	{/snippet}
	{#snippet actions()}
		<Button variant="ghost" onclick={() => (confirmDeleteEnvironmentId = null)}>Cancel</Button>
		<Button
			variant="danger"
			onclick={async () => {
				if (!confirmDeleteEnvironmentId) return;
				await environmentStore.deleteEnvironment(confirmDeleteEnvironmentId);
				confirmDeleteEnvironmentId = null;
			}}
		>
			Delete
		</Button>
	{/snippet}
</Modal>
