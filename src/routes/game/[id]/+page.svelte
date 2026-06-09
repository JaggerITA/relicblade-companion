<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { base } from '$app/paths';
	import Modal from '$lib/components/shared/Modal.svelte';
	import Button from '$lib/components/shared/Button.svelte';
	import ModelCard from '$lib/components/gamemanager/ModelCard.svelte';
	import InitiativeRoller from '$lib/components/gamemanager/InitiativeRoller.svelte';
	import { gameStore } from '$lib/stores/gameStore.svelte.js';
	import { collectionStore } from '$lib/stores/collectionStore.svelte.js';
	import { toastStore } from '$lib/stores/toastStore.svelte.js';
	import type { ModelState } from '$lib/models/GameState.js';

	const id = $derived($page.params.id ?? '');
	const game = $derived(gameStore.getGame(id));

	let activePlayer = $state<1 | 2>(1);
	let showInitiativeRoller = $state(false);
	let showRecovery = $state(false);
	let showDeleteConfirm = $state(false);
	let recoveryResults = $state<Record<string, boolean | null>>({});

	$effect(() => {
		gameStore.hydrate();
		collectionStore.hydrate();
	});


	$effect(() => {
		if (game?.phase !== 'recovery') recoveryResults = {};
	});

	const models = $derived(game ? gameStore.modelsForPlayer(game, activePlayer) : []);

	const disabledAll = $derived(
		game ? [...gameStore.disabledModels(game, 1), ...gameStore.disabledModels(game, 2)] : []
	);

	const allActivatedBothSides = $derived(
		game ? gameStore.allActivated(game, 1) && gameStore.allActivated(game, 2) : false
	);

	const phaseLabel: Record<string, string> = {
		initiative: 'Initiative',
		activation: 'Activation',
		recovery: 'Recovery'
	};

	function recoveryKey(m: ModelState): string {
		return `${m.rosterOwner}-${m.characterId}`;
	}

	async function rollRecovery(m: ModelState): Promise<void> {
		const result = await gameStore.rollRecovery(id, m.rosterOwner, m.characterId);
		recoveryResults = { ...recoveryResults, [recoveryKey(m)]: result };
	}

	async function manualRecovery(m: ModelState, success: boolean): Promise<void> {
		recoveryResults = { ...recoveryResults, [recoveryKey(m)]: success };
		if (success) await gameStore.heal(id, m.rosterOwner, m.characterId, 1);
	}

	function adjustHealth(m: ModelState, delta: number): void {
		if (delta < 0) gameStore.applyDamage(id, m.rosterOwner, m.characterId, -delta);
		else if (delta > 0) gameStore.heal(id, m.rosterOwner, m.characterId, delta);
	}

	async function handleDelete(): Promise<void> {
		await gameStore.deleteGame(id);
		toastStore.info('Game deleted');
		goto(`${base}/game`);
	}
</script>

{#if game}
	<div class="flex h-full flex-col">
		<!-- Sticky top block: header + phase band + player toggle -->
		<header class="sticky top-0 z-10 bg-surface">
			<div class="flex items-center justify-between px-4 pb-2 pt-4">
				<div class="flex items-center gap-3">
					<a href="{base}/game" class="text-on-muted hover:text-on-surface" aria-label="Back to games">‹</a>
					<h1 class="font-bold">Game · Round {game.currentRound}</h1>
				</div>
				<button
					type="button"
					onclick={() => (showDeleteConfirm = true)}
					class="text-sm text-on-muted hover:text-on-surface"
					aria-label="Game settings"
				>
					⚙
				</button>
			</div>

			<div class="flex items-center justify-between border-b border-white/10 px-4 py-2 text-sm">
				<div class="flex items-center gap-2">
					<span
						class="inline-block h-2 w-2 rounded-full {game.phase === 'initiative'
							? 'bg-amber-400'
							: game.phase === 'activation'
								? 'bg-accent'
								: 'bg-purple-400'}"
					></span>
					<span>Phase: {phaseLabel[game.phase]}</span>
				</div>
				{#if game.initiative}
					<span class="text-on-muted">P{game.initiative} ⚔ acts first</span>
				{:else if game.phase === 'initiative'}
					<span class="text-on-muted">Initiative not rolled</span>
				{/if}
			</div>

			<div class="flex gap-2 px-4 py-2">
				{#each [1, 2] as p}
					{@const player = p as 1 | 2}
					<button
						type="button"
						onclick={() => (activePlayer = player)}
						class="flex-1 rounded-lg py-2 text-sm font-medium transition-colors {activePlayer === player
							? 'bg-accent text-white'
							: 'bg-surface-overlay text-on-muted hover:bg-white/10'}"
						aria-pressed={activePlayer === player}
					>
						{player === 1 ? game.roster1.name : game.roster2.name}
					</button>
				{/each}
			</div>
		</header>

		<!-- Scrollable model list -->
		<div class="flex-1 space-y-3 overflow-y-auto px-4 py-3">
			{#if models.length === 0}
				<p class="py-12 text-center text-sm text-on-muted">No models in this roster.</p>
			{:else}
				{#each models as model (model.characterId)}
					{@const character = collectionStore.getCharacter(model.characterId)}
					{#if character}
						<ModelCard
							{character}
							{model}
							onadjusthealth={(delta) => adjustHealth(model, delta)}
							onadjustactiondice={(delta) =>
								gameStore.adjustActionDiceModifier(id, model.rosterOwner, model.characterId, delta)}
							ontoggleactivation={() =>
								gameStore.activateModel(id, model.rosterOwner, model.characterId)}
							ontogglecondition={(cond) =>
								gameStore.toggleCondition(id, model.rosterOwner, model.characterId, cond)}
						/>
					{/if}
				{/each}
			{/if}
		</div>

		<!-- Phase action bar — sits just above the bottom nav bar via the flex-col layout -->
		<div class="border-t border-white/10 bg-surface px-4 py-3">
			{#if game.phase === 'initiative'}
				<button
					type="button"
					onclick={() => (showInitiativeRoller = true)}
					class="btn-primary w-full"
				>
					Roll Initiative 🎲
				</button>
			{:else if game.phase === 'activation'}
				<button
					type="button"
					onclick={() => gameStore.nextPhase(id)}
					class="{allActivatedBothSides ? 'btn-primary' : 'btn-ghost'} w-full"
				>
					Next: Recovery ▸
				</button>
			{:else if game.phase === 'recovery'}
				<div class="flex gap-2">
					<button
						type="button"
						onclick={() => (showRecovery = true)}
						class="btn-ghost flex-1"
					>
						Roll Recovery 🎲
					</button>
					<button
						type="button"
						onclick={() => gameStore.nextRound(id)}
						class="btn-primary flex-1"
					>
						End Round ▸
					</button>
				</div>
			{/if}
		</div>
	</div>

	<!-- Initiative roller -->
	<InitiativeRoller
		open={showInitiativeRoller}
		onroll={async () => {
			const result = await gameStore.rollInitiative(id);
			if (result.winner) activePlayer = result.winner;
			return result;
		}}
		onsetinitiative={(w) => {
			void gameStore.setInitiative(id, w);
			activePlayer = w;
		}}
		ongiveinitiative={() => {
			const newWinner = (game?.initiative === 1 ? 2 : 1) as 1 | 2;
			void gameStore.giveInitiative(id);
			activePlayer = newWinner;
		}}
		onclose={() => (showInitiativeRoller = false)}
	/>

	<!-- Recovery dialog -->
	<Modal open={showRecovery} title="Recovery Rolls" onclose={() => (showRecovery = false)}>
		{#snippet children()}
			<div class="space-y-3">
				{#if disabledAll.length === 0}
					<p class="py-4 text-center text-sm text-on-muted">No disabled models — no rolls needed.</p>
				{:else}
					{#each disabledAll as m (`${m.rosterOwner}-${m.characterId}`)}
						{@const character = collectionStore.getCharacter(m.characterId)}
						{#if character}
							{@const key = recoveryKey(m)}
							{@const rolled = recoveryResults[key] ?? null}
							<div class="flex items-center justify-between gap-3">
								<div class="min-w-0">
									<p class="truncate text-sm font-semibold">{character.name}</p>
									<p class="text-xs text-on-muted">P{m.rosterOwner}</p>
								</div>
								<div class="shrink-0">
									{#if rolled === null}
										<div class="flex gap-1.5">
											<Button variant="ghost" onclick={() => rollRecovery(m)}>🎲</Button>
											<Button variant="ghost" onclick={() => manualRecovery(m, true)}>✓</Button>
											<Button variant="ghost" onclick={() => manualRecovery(m, false)}>✗</Button>
										</div>
									{:else if rolled}
										<span class="text-sm font-semibold text-green-400">✓ Recovered</span>
									{:else}
										<span class="text-sm text-on-muted">✗ No recovery</span>
									{/if}
								</div>
							</div>
						{/if}
					{/each}
				{/if}
			</div>
		{/snippet}
		{#snippet actions()}
			<Button variant="primary" onclick={() => (showRecovery = false)}>Done</Button>
		{/snippet}
	</Modal>

	<!-- Delete confirm -->
	<Modal open={showDeleteConfirm} title="Delete game?" onclose={() => (showDeleteConfirm = false)}>
		{#snippet children()}
			<p class="text-on-muted">This cannot be undone. All round progress will be lost.</p>
		{/snippet}
		{#snippet actions()}
			<Button variant="ghost" onclick={() => (showDeleteConfirm = false)}>Cancel</Button>
			<Button variant="danger" onclick={handleDelete}>Delete</Button>
		{/snippet}
	</Modal>
{:else if gameStore.loaded}
	<div class="p-4">
		<header class="mb-4 flex items-center gap-3">
			<a href="{base}/game" class="text-on-muted hover:text-on-surface">‹</a>
			<h1 class="text-xl font-bold">Game Manager</h1>
		</header>
		<p class="text-on-muted">Game not found.</p>
		<a href="{base}/game" class="mt-4 inline-block text-accent">Back to games</a>
	</div>
{:else}
	<div class="p-4">
		<p class="text-on-muted">Loading…</p>
	</div>
{/if}
