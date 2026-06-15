<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { base } from '$app/paths';
	import Button from '$lib/components/shared/Button.svelte';
	import CharacterPickerSheet from '$lib/components/listbuilder/CharacterPickerSheet.svelte';
	import { campaignStore } from '$lib/stores/campaignStore.svelte.js';
	import { collectionStore } from '$lib/stores/collectionStore.svelte.js';
	import { environmentStore } from '$lib/stores/environmentStore.svelte.js';
	import { gameStore } from '$lib/stores/gameStore.svelte.js';
	import { rosterStore } from '$lib/stores/rosterStore.svelte.js';
	import { scenarioStore } from '$lib/stores/scenarioStore.svelte.js';
	import { toastStore } from '$lib/stores/toastStore.svelte.js';
	import { newId } from '$lib/utils/id.js';
	import type { Roster } from '$lib/models/Roster.js';

	const id = $derived($page.params.id ?? '');
	const campaign = $derived(campaignStore.getCampaign(id));
	const roster = $derived(campaign ? rosterStore.getRoster(campaign.rosterId) : undefined);

	$effect(() => {
		campaignStore.hydrate();
		rosterStore.hydrate();
		collectionStore.hydrate();
		scenarioStore.hydrate();
		environmentStore.hydrate();
	});

	const STEPS = ['Threat', 'Scenario', 'Environment', 'Setup', 'Wild Monsters', 'Review'] as const;
	let step = $state(0);

	let threatLevel = $state(0);
	let scenarioId = $state<string | null>(null);
	let environmentId = $state<string | null>(null);
	let wildMonsterIds = $state<string[]>([]);
	let showMonsterPicker = $state(false);
	let starting = $state(false);

	const selectedScenario = $derived(scenarioId ? scenarioStore.getScenario(scenarioId) : undefined);
	const selectedEnvironment = $derived(
		environmentId ? environmentStore.getEnvironment(environmentId) : undefined
	);

	function addWildMonster(characterId: string): void {
		wildMonsterIds = [...wildMonsterIds, characterId];
	}

	function removeWildMonster(index: number): void {
		wildMonsterIds = wildMonsterIds.filter((_, i) => i !== index);
	}

	function next(): void {
		if (step < STEPS.length - 1) step += 1;
	}

	function back(): void {
		if (step > 0) step -= 1;
	}

	async function handleStart(): Promise<void> {
		if (!campaign || !roster) return;
		starting = true;
		try {
			const now = new Date().toISOString();
			const entries = wildMonsterIds.map((characterId) => ({
				entryId: newId(),
				characterId,
				equippedUpgradeIds: [],
				entryInfluence: collectionStore.getCharacter(characterId)?.cost ?? 0
			}));
			const wildMonsterRoster: Roster = {
				id: newId(),
				name: 'Wild Monsters',
				faction: '',
				limitMode: 'threat',
				maxInfluence: 0,
				entries,
				totalInfluence: entries.reduce((sum, e) => sum + e.entryInfluence, 0),
				createdAt: now,
				updatedAt: now
			};
			const game = await gameStore.start(roster, wildMonsterRoster, true, campaign.id, {
				threatLevel,
				scenarioId: scenarioId ?? undefined,
				environmentId: environmentId ?? undefined
			});
			toastStore.success('Campaign game started');
			goto(`${base}/game/${game.id}`);
		} finally {
			starting = false;
		}
	}
</script>

{#if campaign}
	<div class="flex h-full flex-col">
		<header class="sticky top-0 z-10 bg-surface px-4 pb-2 pt-4">
			<div class="flex items-center gap-3">
				<a href="{base}/campaign/{campaign.id}" class="text-on-muted hover:text-on-surface">‹</a>
				<div class="min-w-0">
					<h1 class="truncate text-lg font-bold">New Campaign Game</h1>
					<p class="truncate text-xs text-on-muted">{campaign.name}</p>
				</div>
			</div>
			<p class="mt-3 text-xs uppercase tracking-wider text-on-muted">
				Step {step + 1} of {STEPS.length} · {STEPS[step]}
			</p>
		</header>

		<div class="flex-1 overflow-y-auto px-4 py-2">
			{#if !roster}
				<div class="flex flex-col items-center justify-center py-16 text-center text-on-muted">
					<span class="mb-4 text-5xl" aria-hidden="true">🛡</span>
					<p class="mb-1 font-semibold text-on-surface">No starting roster</p>
					<p class="text-sm">This campaign's roster could not be found.</p>
				</div>
			{:else if step === 0}
				<!-- Step 1: Threat level -->
				<section class="space-y-3">
					<h2 class="text-sm font-semibold uppercase tracking-wider text-on-muted">Threat Level</h2>
					<p class="text-sm text-on-muted">
						Set the threat level for this adventure, as determined by your scenario or book. The
						app tracks this for reference — it does not enforce it.
					</p>
					<div>
						<label class="mb-1 block text-sm" for="threatLevel">Threat level</label>
						<input
							id="threatLevel"
							type="number"
							min="0"
							bind:value={threatLevel}
							class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-accent"
						/>
					</div>
				</section>
			{:else if step === 1}
				<!-- Step 2: Scenario -->
				<section class="space-y-3">
					<h2 class="text-sm font-semibold uppercase tracking-wider text-on-muted">Scenario</h2>
					<p class="text-sm text-on-muted">Choose a scenario from your library.</p>
					{#if scenarioStore.scenarios.length === 0}
						<p class="text-sm text-on-muted">
							No scenarios saved yet. Add some in
							<a href="{base}/campaign/scenarios" class="text-accent">Scenarios &amp; Environments</a>,
							or skip this step.
						</p>
					{/if}
					<div class="space-y-2">
						<label class="card flex items-center gap-3">
							<input type="radio" name="scenario" checked={scenarioId === null} onchange={() => (scenarioId = null)} />
							<span class="text-sm">None</span>
						</label>
						{#each scenarioStore.scenarios as scenario (scenario.id)}
							<label class="card flex items-center gap-3">
								<input
									type="radio"
									name="scenario"
									checked={scenarioId === scenario.id}
									onchange={() => (scenarioId = scenario.id)}
								/>
								<div class="min-w-0">
									<p class="truncate text-sm font-medium">{scenario.name}</p>
									<p class="truncate text-xs capitalize text-on-muted">
										{scenario.type.replace('-', ' ')}{#if scenario.players} · {scenario.players} players{/if}
									</p>
								</div>
							</label>
						{/each}
					</div>
				</section>
			{:else if step === 2}
				<!-- Step 3: Environment -->
				<section class="space-y-3">
					<h2 class="text-sm font-semibold uppercase tracking-wider text-on-muted">Environment</h2>
					<p class="text-sm text-on-muted">Choose an environment from your library.</p>
					{#if environmentStore.environments.length === 0}
						<p class="text-sm text-on-muted">
							No environments saved yet. Add some in
							<a href="{base}/campaign/scenarios" class="text-accent">Scenarios &amp; Environments</a>,
							or skip this step.
						</p>
					{/if}
					<div class="space-y-2">
						<label class="card flex items-center gap-3">
							<input type="radio" name="environment" checked={environmentId === null} onchange={() => (environmentId = null)} />
							<span class="text-sm">None</span>
						</label>
						{#each environmentStore.environments as environment (environment.id)}
							<label class="card flex items-center gap-3">
								<input
									type="radio"
									name="environment"
									checked={environmentId === environment.id}
									onchange={() => (environmentId = environment.id)}
								/>
								<p class="truncate text-sm font-medium">{environment.name}</p>
							</label>
						{/each}
					</div>
				</section>
			{:else if step === 3}
				<!-- Step 4: Play area setup + initiative/deploy guidance -->
				<section class="space-y-4">
					<h2 class="text-sm font-semibold uppercase tracking-wider text-on-muted">Set Up</h2>
					<p class="text-sm text-on-muted">
						Set up the play area following your scenario and environment, then roll initiative
						and deploy your forces. This is a checklist — the app does not enforce setup.
					</p>
					<ul class="list-disc space-y-1 pl-5 text-sm text-on-muted">
						<li>Set up terrain for the chosen environment.</li>
						<li>Set up scenario objectives, as described below.</li>
						<li>Both players roll a D6 for initiative (reroll on a tie).</li>
						<li>Deploy your forces as described in the scenario.</li>
					</ul>
					{#if selectedScenario?.setup}
						<div class="card">
							<p class="mb-1 text-xs font-semibold uppercase tracking-wider text-on-muted">
								{selectedScenario.name} — Setup
							</p>
							<p class="whitespace-pre-wrap text-sm">{selectedScenario.setup}</p>
						</div>
					{/if}
					{#if selectedEnvironment?.notes}
						<div class="card">
							<p class="mb-1 text-xs font-semibold uppercase tracking-wider text-on-muted">
								{selectedEnvironment.name}
							</p>
							<p class="whitespace-pre-wrap text-sm">{selectedEnvironment.notes}</p>
						</div>
					{/if}
				</section>
			{:else if step === 4}
				<!-- Step 5: Wild monsters -->
				<section class="space-y-3">
					<h2 class="text-sm font-semibold uppercase tracking-wider text-on-muted">Wild Monsters</h2>
					<p class="text-sm text-on-muted">
						Add the wild monsters for this adventure from your collection. Add the same character
						more than once for multiple copies.
					</p>
					{#if wildMonsterIds.length > 0}
						<ul class="space-y-2">
							{#each wildMonsterIds as characterId, i (i)}
								{@const character = collectionStore.getCharacter(characterId)}
								<li class="card flex items-center justify-between gap-3">
									<p class="truncate text-sm font-medium">{character?.name ?? 'Unknown character'}</p>
									<button
										type="button"
										onclick={() => removeWildMonster(i)}
										class="shrink-0 text-on-muted hover:text-on-surface"
										aria-label="Remove"
									>
										✕
									</button>
								</li>
							{/each}
						</ul>
					{:else}
						<p class="text-sm text-on-muted">No wild monsters added yet.</p>
					{/if}
					<Button variant="ghost" onclick={() => (showMonsterPicker = true)}>+ Add wild monster</Button>
				</section>
			{:else if step === 5}
				<!-- Step 6: Review -->
				<section class="space-y-3">
					<h2 class="text-sm font-semibold uppercase tracking-wider text-on-muted">Review</h2>
					<div class="card space-y-2 text-sm">
						<p><span class="text-on-muted">Roster:</span> {roster.name}</p>
						<p><span class="text-on-muted">Threat level:</span> {threatLevel}</p>
						<p><span class="text-on-muted">Scenario:</span> {selectedScenario?.name ?? 'None'}</p>
						<p><span class="text-on-muted">Environment:</span> {selectedEnvironment?.name ?? 'None'}</p>
						<p><span class="text-on-muted">Wild monsters:</span> {wildMonsterIds.length}</p>
					</div>
					<p class="text-sm text-on-muted">
						Starting the game hands off to the Game Manager for play.
					</p>
				</section>
			{/if}
		</div>

		{#if roster}
			<div class="flex gap-3 border-t border-white/10 px-4 py-3">
				{#if step > 0}
					<Button variant="ghost" onclick={back}>Back</Button>
				{:else}
					<Button variant="ghost" onclick={() => goto(`${base}/campaign/${campaign.id}`)}>Cancel</Button>
				{/if}
				{#if step < STEPS.length - 1}
					<Button variant="primary" onclick={next}>Next</Button>
				{:else}
					<Button variant="primary" onclick={handleStart} disabled={starting}>
						{starting ? 'Starting…' : 'Start game'}
					</Button>
				{/if}
			</div>
		{/if}
	</div>

	<CharacterPickerSheet
		open={showMonsterPicker}
		characters={collectionStore.characters}
		onpick={addWildMonster}
		onclose={() => (showMonsterPicker = false)}
		title="Add wild monster"
		actionLabel="+ Add"
	/>
{/if}
