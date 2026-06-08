<script lang="ts">
	import { base } from '$app/paths';
	import Modal from '$lib/components/shared/Modal.svelte';
	import Button from '$lib/components/shared/Button.svelte';
	import { gameStore } from '$lib/stores/gameStore.svelte.js';
	import { toastStore } from '$lib/stores/toastStore.svelte.js';

	let confirmDeleteId = $state<string | null>(null);

	$effect(() => {
		gameStore.hydrate();
	});

	const confirmGame = $derived(confirmDeleteId ? gameStore.getGame(confirmDeleteId) : undefined);

	const phaseLabel: Record<string, string> = {
		initiative: 'Initiative',
		activation: 'Activation',
		recovery: 'Recovery'
	};

	async function handleDelete(): Promise<void> {
		if (!confirmDeleteId) return;
		await gameStore.deleteGame(confirmDeleteId);
		toastStore.info('Game deleted');
		confirmDeleteId = null;
	}
</script>

<div class="flex h-full flex-col">
	<header class="sticky top-0 z-10 bg-surface px-4 pb-2 pt-4">
		<div class="flex items-center justify-between">
			<h1 class="text-xl font-bold">Games</h1>
			<a href="{base}/settings" class="text-on-muted hover:text-on-surface" aria-label="Settings">⚙</a>
		</div>
	</header>

	<div class="flex-1 overflow-y-auto px-4 py-2">
		{#if !gameStore.loaded}
			<p class="py-8 text-center text-sm text-on-muted">Loading…</p>
		{:else if gameStore.games.length === 0}
			<div class="flex flex-col items-center justify-center py-16 text-center text-on-muted">
				<span class="mb-4 text-5xl" aria-hidden="true">🎲</span>
				<p class="mb-1 font-semibold text-on-surface">No active games</p>
				<p class="mb-6 text-sm">Start a game from two saved rosters.</p>
				<a href="{base}/game/new" class="btn-primary w-48">+ New Game</a>
			</div>
		{:else}
			<ul class="space-y-2">
				{#each gameStore.games as game (game.id)}
					<li class="card flex items-center justify-between gap-3">
						<a href="{base}/game/{game.id}" class="min-w-0 flex-1">
							<p class="truncate font-semibold">
								{game.roster1.name} vs {game.roster2.name}
							</p>
							<p class="truncate text-sm text-on-muted">
								Round {game.currentRound} · {phaseLabel[game.phase]}
							</p>
						</a>
						<div class="flex shrink-0 items-center gap-2">
							<span class="text-on-muted">›</span>
							<button
								type="button"
								onclick={() => (confirmDeleteId = game.id)}
								class="text-on-muted hover:text-on-surface"
								aria-label="Delete game"
							>
								✕
							</button>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	{#if gameStore.games.length > 0}
		<a
			href="{base}/game/new"
			class="fixed bottom-20 right-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-2xl text-white shadow-lg"
			aria-label="New game"
		>
			+
		</a>
	{/if}
</div>

<Modal
	open={confirmDeleteId !== null}
	title="Delete game?"
	onclose={() => (confirmDeleteId = null)}
>
	{#snippet children()}
		{#if confirmGame}
			<p class="text-on-muted">
				This cannot be undone. "{confirmGame.roster1.name} vs {confirmGame.roster2.name}" (Round {confirmGame.currentRound}) will be removed.
			</p>
		{/if}
	{/snippet}
	{#snippet actions()}
		<Button variant="ghost" onclick={() => (confirmDeleteId = null)}>Cancel</Button>
		<Button variant="danger" onclick={handleDelete}>Delete</Button>
	{/snippet}
</Modal>
