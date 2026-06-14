<script lang="ts">
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import Button from '$lib/components/shared/Button.svelte';
	import { rosterStore } from '$lib/stores/rosterStore.svelte.js';
	import { gameStore } from '$lib/stores/gameStore.svelte.js';
	import { collectionStore } from '$lib/stores/collectionStore.svelte.js';
	import { toastStore } from '$lib/stores/toastStore.svelte.js';

	let roster1Id = $state('');
	let roster2Id = $state('');
	let starting = $state(false);

	$effect(() => {
		rosterStore.hydrate();
		collectionStore.hydrate();
	});

	const eligibleRosters = $derived(rosterStore.rosters.filter((r) => r.entries.length > 0));

	const error = $derived.by(() => {
		if (!roster1Id || !roster2Id) return null;
		if (roster1Id === roster2Id) return 'Player 1 and Player 2 need different rosters';
		return null;
	});

	async function handleStart(): Promise<void> {
		const roster1 = rosterStore.getRoster(roster1Id);
		const roster2 = rosterStore.getRoster(roster2Id);
		if (!roster1 || !roster2 || error) return;
		starting = true;
		try {
			await collectionStore.hydrate();
			const game = await gameStore.start(roster1, roster2);
			toastStore.success('Game started');
			goto(`${base}/game/${game.id}`);
		} finally {
			starting = false;
		}
	}
</script>

<div class="p-4">
	<header class="mb-6 flex items-center gap-3">
		<a href="{base}/game" class="text-on-muted hover:text-on-surface">‹</a>
		<h1 class="text-xl font-bold">New Game</h1>
	</header>

	{#if !rosterStore.loaded}
		<p class="py-8 text-center text-sm text-on-muted">Loading…</p>
	{:else if eligibleRosters.length < 2}
		<div class="flex flex-col items-center justify-center py-16 text-center text-on-muted">
			<span class="mb-4 text-5xl" aria-hidden="true">📋</span>
			<p class="mb-1 font-semibold text-on-surface">Not enough rosters</p>
			<p class="mb-6 text-sm">
				You need at least two saved rosters with characters in them to start a game.
			</p>
			<a href="{base}/roster/new" class="btn-primary w-48">+ New Roster</a>
		</div>
	{:else}
		<div class="space-y-4">
			<div>
				<label class="mb-1 block text-sm" for="roster1">Player 1</label>
				<select
					id="roster1"
					bind:value={roster1Id}
					class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-accent"
				>
					<option value="" disabled>Pick a roster…</option>
					{#each eligibleRosters as roster (roster.id)}
						<option value={roster.id}>{roster.name} ({roster.entries.length} models)</option>
					{/each}
				</select>
			</div>

			<div>
				<label class="mb-1 block text-sm" for="roster2">Player 2</label>
				<select
					id="roster2"
					bind:value={roster2Id}
					class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-accent"
				>
					<option value="" disabled>Pick a roster…</option>
					{#each eligibleRosters as roster (roster.id)}
						<option value={roster.id}>{roster.name} ({roster.entries.length} models)</option>
					{/each}
				</select>
			</div>

			{#if error}<p class="text-xs text-red-400">{error}</p>{/if}

			<div class="flex gap-3 pb-4 pt-2">
				<Button variant="ghost" onclick={() => goto(`${base}/game`)}>Cancel</Button>
				<Button
					variant="primary"
					onclick={handleStart}
					disabled={!roster1Id || !roster2Id || !!error || starting}
				>
					Start game
				</Button>
			</div>
		</div>
	{/if}
</div>
