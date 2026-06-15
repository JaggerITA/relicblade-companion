<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { base } from '$app/paths';
	import Button from '$lib/components/shared/Button.svelte';
	import { campaignStore, type RecordMatchInput } from '$lib/stores/campaignStore.svelte.js';
	import { collectionStore } from '$lib/stores/collectionStore.svelte.js';
	import { gameStore } from '$lib/stores/gameStore.svelte.js';
	import { rosterStore } from '$lib/stores/rosterStore.svelte.js';
	import { scenarioStore } from '$lib/stores/scenarioStore.svelte.js';
	import { toastStore } from '$lib/stores/toastStore.svelte.js';
	import { rollRecovery } from '$lib/utils/dice.js';
	import type { MatchCharacterOutcome } from '$lib/models/Campaign.js';
	import type { ModelState } from '$lib/models/GameState.js';

	const campaignId = $derived($page.params.id ?? '');
	const gameId = $derived($page.params.gameId ?? '');
	const campaign = $derived(campaignStore.getCampaign(campaignId));
	const game = $derived(gameStore.getGame(gameId));
	const scenario = $derived(game?.scenarioId ? scenarioStore.getScenario(game.scenarioId) : undefined);

	$effect(() => {
		campaignStore.hydrate();
		rosterStore.hydrate();
		collectionStore.hydrate();
		gameStore.hydrate();
		scenarioStore.hydrate();
	});

	// Warband = player-1 models. Wild monsters (player 2) don't carry campaign progression.
	const warband = $derived(game ? game.models.filter((m) => m.rosterOwner === 1) : []);
	const survived = $derived(warband.filter((m) => !m.destroyed && m.currentHealth > 0));
	const disabled = $derived(warband.filter((m) => !m.destroyed && m.currentHealth <= 0));
	const destroyed = $derived(warband.filter((m) => m.destroyed));

	const STEPS = ['Result', 'Recovery', 'Injury', 'Per-character', 'Rewards', 'Review'] as const;
	let step = $state(0);

	let result = $state<'win' | 'loss' | 'draw'>('win');
	let notes = $state('');
	let influenceEarned = $state(0);
	let goldEarned = $state(0);

	// Per-entry inputs
	let recovered = $state<Record<string, boolean>>({});
	let recoveryRolled = $state<Record<string, number | null>>({});
	let injuryOutcome = $state<Record<string, 'none' | 'wound' | 'critical' | 'death'>>({});
	let woundTrait = $state<Record<string, string>>({});
	let kills = $state<Record<string, number>>({});
	let objectives = $state<Record<string, number>>({});
	let valorGained = $state<Record<string, number>>({});
	let heroicTrait = $state<Record<string, string>>({});
	let relicAdded = $state<Record<string, string>>({});
	let finishing = $state(false);

	function charName(m: ModelState): string {
		return collectionStore.getCharacter(m.characterId)?.name ?? 'Unknown character';
	}

	function rollOne(m: ModelState): void {
		const success = rollRecovery();
		recoveryRolled[m.entryId] = success ? 6 : 1;
		recovered[m.entryId] = success;
	}

	function next(): void {
		if (step < STEPS.length - 1) step += 1;
	}
	function back(): void {
		if (step > 0) step -= 1;
	}

	/** Final health a member carries into the next adventure. */
	function carriedHealth(m: ModelState): number {
		if (m.destroyed) {
			// non-death destroyed models recover between adventures (the lasting effect is the trait)
			return injuryOutcome[m.entryId] === 'death' ? 0 : m.maxHealth;
		}
		if (m.currentHealth <= 0) return recovered[m.entryId] ? 1 : 0;
		return m.currentHealth;
	}

	function outcomeResult(m: ModelState): 'survived' | 'disabled' | 'destroyed' {
		if (m.destroyed) return 'destroyed';
		if (m.currentHealth <= 0) return 'disabled';
		return 'survived';
	}

	function buildOutcomes(): MatchCharacterOutcome[] {
		return warband.map((m) => {
			const injury = m.destroyed ? (injuryOutcome[m.entryId] ?? 'none') : undefined;
			const wound = injury === 'wound' ? (woundTrait[m.entryId] ?? '').trim() : '';
			const heroic = (heroicTrait[m.entryId] ?? '').trim();
			const relic = (relicAdded[m.entryId] ?? '').trim();
			return {
				entryId: m.entryId,
				characterId: m.characterId,
				result: outcomeResult(m),
				kills: kills[m.entryId] ?? 0,
				objectives: objectives[m.entryId] ?? 0,
				valorGained: valorGained[m.entryId] ?? 0,
				currentHealth: carriedHealth(m),
				...(injury ? { injuryOutcome: injury } : {}),
				...(wound ? { woundTraitAdded: wound } : {}),
				...(heroic ? { heroicTraitAdded: heroic } : {}),
				...(relic ? { relicAdded: relic } : {})
			};
		});
	}

	async function finish(): Promise<void> {
		if (!campaign || !game) return;
		finishing = true;
		try {
			const input: RecordMatchInput = {
				result,
				notes: notes.trim(),
				scenario: scenario?.name,
				scenarioId: game.scenarioId,
				environmentId: game.environmentId,
				threatLevel: game.threatLevel,
				influenceEarned,
				goldEarned,
				outcomes: buildOutcomes()
			};
			await campaignStore.recordMatch(campaign.id, input);
			await gameStore.deleteGame(game.id);
			toastStore.success('Adventure resolved');
			goto(`${base}/campaign/${campaign.id}`);
		} finally {
			finishing = false;
		}
	}
</script>

{#if campaign && game}
	<div class="flex h-full flex-col">
		<header class="sticky top-0 z-10 bg-surface px-4 pb-2 pt-4">
			<div class="flex items-center gap-3">
				<a href="{base}/game/{game.id}" class="text-on-muted hover:text-on-surface">‹</a>
				<div class="min-w-0">
					<h1 class="truncate text-lg font-bold">Resolve Postgame</h1>
					<p class="truncate text-xs text-on-muted">
						{campaign.name}{#if scenario} · {scenario.name}{/if}
					</p>
				</div>
			</div>
			<p class="mt-3 text-xs uppercase tracking-wider text-on-muted">
				Step {step + 1} of {STEPS.length} · {STEPS[step]}
			</p>
		</header>

		<div class="flex-1 overflow-y-auto px-4 py-2">
			{#if step === 0}
				<!-- Result -->
				<section class="space-y-4">
					<div>
						<p class="mb-2 text-sm font-semibold uppercase tracking-wider text-on-muted">Result</p>
						<div class="flex gap-2">
							{#each (['win', 'loss', 'draw'] as const) as r}
								<button
									type="button"
									onclick={() => (result = r)}
									class="flex min-h-touch flex-1 items-center justify-center rounded-lg text-sm capitalize transition-colors
										{result === r ? 'bg-accent text-white' : 'bg-surface-overlay text-on-muted hover:bg-white/10'}"
									aria-pressed={result === r}
								>
									{r}
								</button>
							{/each}
						</div>
					</div>
					<div>
						<label class="mb-1 block text-sm" for="notes">Notes</label>
						<textarea
							id="notes"
							bind:value={notes}
							rows="3"
							placeholder="What happened this adventure?"
							class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-accent"
						></textarea>
					</div>
				</section>
			{:else if step === 1}
				<!-- Recovery -->
				<section class="space-y-3">
					<p class="text-sm text-on-muted">
						Disabled (not destroyed) warband members roll a D6 — a 6 recovers 1 health box.
					</p>
					{#if disabled.length === 0}
						<p class="text-sm text-on-muted">No disabled members to recover.</p>
					{:else}
						<ul class="space-y-2">
							{#each disabled as m (m.entryId)}
								<li class="card flex items-center justify-between gap-3">
									<div class="min-w-0">
										<p class="truncate text-sm font-medium">{charName(m)}</p>
										<p class="text-xs text-on-muted">
											{#if recoveryRolled[m.entryId] != null}
												Rolled {recoveryRolled[m.entryId]} — {recovered[m.entryId] ? 'recovered (1 HP)' : 'still disabled'}
											{:else}
												Not rolled
											{/if}
										</p>
									</div>
									<div class="flex shrink-0 items-center gap-2">
										<Button variant="ghost" onclick={() => rollOne(m)}>Roll</Button>
										<label class="flex items-center gap-1 text-xs text-on-muted">
											<input type="checkbox" bind:checked={recovered[m.entryId]} /> recovered
										</label>
									</div>
								</li>
							{/each}
						</ul>
					{/if}
				</section>
			{:else if step === 2}
				<!-- Injury -->
				<section class="space-y-3">
					<p class="text-sm text-on-muted">
						Destroyed members roll on your injury chart — record the outcome. Death removes them from
						the warband (kept in history).
					</p>
					{#if destroyed.length === 0}
						<p class="text-sm text-on-muted">No destroyed members.</p>
					{:else}
						<ul class="space-y-2">
							{#each destroyed as m (m.entryId)}
								<li class="card space-y-2">
									<p class="text-sm font-medium">{charName(m)}</p>
									<div class="flex flex-wrap gap-2">
										{#each (['none', 'wound', 'critical', 'death'] as const) as o}
											<button
												type="button"
												onclick={() => (injuryOutcome[m.entryId] = o)}
												class="rounded-lg px-3 py-1 text-xs capitalize transition-colors
													{(injuryOutcome[m.entryId] ?? 'none') === o
													? 'bg-accent text-white'
													: 'bg-surface-overlay text-on-muted hover:bg-white/10'}"
											>
												{o}
											</button>
										{/each}
									</div>
									{#if injuryOutcome[m.entryId] === 'wound'}
										<input
											type="text"
											bind:value={woundTrait[m.entryId]}
											placeholder="Wound trait (from your book)"
											class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-accent"
										/>
									{/if}
								</li>
							{/each}
						</ul>
					{/if}
				</section>
			{:else if step === 3}
				<!-- Per-character results -->
				<section class="space-y-3">
					<p class="text-sm text-on-muted">
						Record each member's contribution. Kills and objectives build their career history.
					</p>
					{#if scenario?.rewards}
						<div class="card text-xs">
							<p class="mb-1 font-semibold uppercase tracking-wider text-on-muted">Scenario rewards</p>
							<p class="whitespace-pre-wrap">{scenario.rewards}</p>
						</div>
					{/if}
					{#each warband as m (m.entryId)}
						<div class="card space-y-2">
							<p class="text-sm font-medium">
								{charName(m)}
								{#if m.destroyed && injuryOutcome[m.entryId] === 'death'}
									<span class="text-xs text-red-400">† dies</span>
								{/if}
							</p>
							<div class="grid grid-cols-3 gap-2">
								<label class="text-xs text-on-muted">
									Kills
									<input
										type="number"
										min="0"
										bind:value={kills[m.entryId]}
										class="mt-1 w-full rounded-lg bg-surface-overlay px-2 py-1 text-sm text-on-surface outline-none focus:ring-2 focus:ring-accent"
									/>
								</label>
								<label class="text-xs text-on-muted">
									Objectives
									<input
										type="number"
										min="0"
										bind:value={objectives[m.entryId]}
										class="mt-1 w-full rounded-lg bg-surface-overlay px-2 py-1 text-sm text-on-surface outline-none focus:ring-2 focus:ring-accent"
									/>
								</label>
								<label class="text-xs text-on-muted">
									Valor
									<input
										type="number"
										bind:value={valorGained[m.entryId]}
										class="mt-1 w-full rounded-lg bg-surface-overlay px-2 py-1 text-sm text-on-surface outline-none focus:ring-2 focus:ring-accent"
									/>
								</label>
							</div>
							<input
								type="text"
								bind:value={heroicTrait[m.entryId]}
								placeholder="Heroic trait gained (optional)"
								class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-accent"
							/>
							<input
								type="text"
								bind:value={relicAdded[m.entryId]}
								placeholder="Relic / treasure found (optional)"
								class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-accent"
							/>
						</div>
					{/each}
				</section>
			{:else if step === 4}
				<!-- Rewards -->
				<section class="space-y-3">
					<p class="text-sm text-on-muted">
						Influence and gold earned this adventure are added to the campaign pools.
					</p>
					{#if scenario?.rewards}
						<div class="card text-xs">
							<p class="mb-1 font-semibold uppercase tracking-wider text-on-muted">Scenario rewards</p>
							<p class="whitespace-pre-wrap">{scenario.rewards}</p>
						</div>
					{/if}
					<div class="grid grid-cols-2 gap-3">
						<div>
							<label class="mb-1 block text-sm" for="influenceEarned">Influence earned</label>
							<input
								id="influenceEarned"
								type="number"
								bind:value={influenceEarned}
								class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-accent"
							/>
						</div>
						<div>
							<label class="mb-1 block text-sm" for="goldEarned">Gold earned</label>
							<input
								id="goldEarned"
								type="number"
								bind:value={goldEarned}
								class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-accent"
							/>
						</div>
					</div>
				</section>
			{:else if step === 5}
				<!-- Review -->
				<section class="space-y-3">
					<div class="card space-y-1 text-sm">
						<p><span class="text-on-muted">Result:</span> <span class="capitalize">{result}</span></p>
						<p><span class="text-on-muted">Survived:</span> {survived.length} · <span class="text-on-muted">Disabled:</span> {disabled.length} · <span class="text-on-muted">Destroyed:</span> {destroyed.length}</p>
						<p><span class="text-on-muted">Influence earned:</span> +{influenceEarned} · <span class="text-on-muted">Gold:</span> +{goldEarned}</p>
						<p><span class="text-on-muted">Deaths:</span> {buildOutcomes().filter((o) => o.injuryOutcome === 'death').length}</p>
					</div>
					<p class="text-sm text-on-muted">
						Finishing records the match, updates each member's history, and closes the game.
					</p>
				</section>
			{/if}
		</div>

		<div class="flex gap-3 border-t border-white/10 px-4 py-3">
			{#if step > 0}
				<Button variant="ghost" onclick={back}>Back</Button>
			{:else}
				<Button variant="ghost" onclick={() => goto(`${base}/game/${game.id}`)}>Cancel</Button>
			{/if}
			{#if step < STEPS.length - 1}
				<Button variant="primary" onclick={next}>Next</Button>
			{:else}
				<Button variant="primary" onclick={finish} disabled={finishing}>
					{finishing ? 'Saving…' : 'Finish & record'}
				</Button>
			{/if}
		</div>
	</div>
{:else if campaignStore.loaded && gameStore.loaded}
	<div class="p-4">
		<header class="mb-4 flex items-center gap-3">
			<a href="{base}/campaign/{campaignId}" class="text-on-muted hover:text-on-surface">‹</a>
			<h1 class="text-xl font-bold">Resolve Postgame</h1>
		</header>
		<p class="text-on-muted">Game or campaign not found.</p>
	</div>
{:else}
	<div class="p-4">
		<p class="py-8 text-center text-sm text-on-muted">Loading…</p>
	</div>
{/if}
