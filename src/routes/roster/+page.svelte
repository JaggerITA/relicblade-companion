<script lang="ts">
	import { base } from '$app/paths';
	import { rosterStore } from '$lib/stores/rosterStore.svelte.js';
	import { collectionStore } from '$lib/stores/collectionStore.svelte.js';
	import { settingsStore } from '$lib/stores/settingsStore.svelte.js';
	import { usedInfluence } from '$lib/utils/validation.js';

	$effect(() => {
		rosterStore.hydrate();
		collectionStore.hydrate();
	});
</script>

<div class="flex h-full flex-col">
	<header class="sticky top-0 z-10 bg-surface px-4 pb-2 pt-4">
		<div class="flex items-center justify-between">
			<h1 class="text-xl font-bold">Rosters</h1>
			<a href="{base}/settings" class="text-on-muted hover:text-on-surface" aria-label="Settings">⚙</a>
		</div>
	</header>

	<div class="flex-1 overflow-y-auto px-4 py-2">
		{#if !rosterStore.loaded}
			<p class="py-8 text-center text-sm text-on-muted">Loading…</p>
		{:else if rosterStore.rosters.length === 0}
			<div class="flex flex-col items-center justify-center py-16 text-center text-on-muted">
				<span class="mb-4 text-5xl" aria-hidden="true">📋</span>
				<p class="mb-1 font-semibold text-on-surface">No rosters yet</p>
				<p class="mb-6 text-sm">Build a warband from your collection.</p>
				<a href="{base}/roster/new" class="btn-primary w-48">+ New Roster</a>
			</div>
		{:else}
			<ul class="space-y-2">
				{#each rosterStore.rosters as roster (roster.id)}
					<li>
						<a
							href="{base}/roster/{roster.id}"
							class="card flex items-center justify-between hover:bg-surface-overlay"
						>
							<div class="min-w-0">
								<p class="truncate font-semibold">{roster.name}</p>
								<p class="truncate text-sm text-on-muted">
									{#if roster.faction}{roster.faction} · {/if}{roster.entries.length} model{roster.entries.length === 1 ? '' : 's'}
								</p>
							</div>
							<div class="ml-3 flex shrink-0 items-center gap-2">
								<span class="text-sm font-semibold text-accent">
									{usedInfluence(roster, collectionStore.charactersById, collectionStore.upgradesById)} / {roster.maxInfluence} inf
								</span>
								<span class="text-on-muted">›</span>
							</div>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	{#if rosterStore.rosters.length > 0}
		<a
			href="{base}/roster/new"
			class="fixed bottom-20 {settingsStore.handedness === 'left' ? 'left-4' : 'right-4'} flex h-14 w-14 items-center justify-center rounded-full bg-accent text-2xl text-white shadow-lg"
			aria-label="New roster"
		>
			+
		</a>
	{/if}
</div>
