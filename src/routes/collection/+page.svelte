<script lang="ts">
	import { collectionStore } from '$lib/stores/collectionStore.svelte.js';

	type Tab = 'characters' | 'upgrades';

	let tab = $state<Tab>('characters');
	let search = $state('');
	let factionFilter = $state('');

	$effect(() => { collectionStore.hydrate(); });

	const filtered = $derived.by(() => {
		const q = search.toLowerCase();
		if (tab === 'characters') {
			return collectionStore.characters.filter((c) => {
				const matchSearch = !q || c.name.toLowerCase().includes(q) || c.faction.toLowerCase().includes(q);
				const matchFaction = !factionFilter || c.faction === factionFilter;
				return matchSearch && matchFaction;
			});
		} else {
			return collectionStore.upgrades.filter((u) => {
				return !q || u.name.toLowerCase().includes(q) || u.type.toLowerCase().includes(q);
			});
		}
	});

	const isEmpty = $derived(
		tab === 'characters' ? collectionStore.characters.length === 0 : collectionStore.upgrades.length === 0
	);
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<header class="sticky top-0 z-10 bg-surface px-4 pb-2 pt-4">
		<div class="mb-3 flex items-center justify-between">
			<h1 class="text-xl font-bold">Collection</h1>
			<a href="/settings" class="text-on-muted hover:text-on-surface" aria-label="Settings">⚙</a>
		</div>

		<!-- Search -->
		<input
			type="search"
			bind:value={search}
			placeholder="Search…"
			class="mb-2 w-full rounded-lg bg-surface-raised px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-accent"
		/>

		<!-- Type tabs -->
		<div class="mb-2 flex gap-2">
			{#each (['characters', 'upgrades'] as Tab[]) as t}
				<button
					onclick={() => { tab = t; factionFilter = ''; }}
					class="rounded-full px-3 py-1 text-sm capitalize transition-colors
						{tab === t ? 'bg-accent text-white' : 'bg-surface-raised text-on-muted'}"
				>
					{t}
				</button>
			{/each}
		</div>

		<!-- Faction filter (characters only) -->
		{#if tab === 'characters' && collectionStore.factions.length > 0}
			<select
				bind:value={factionFilter}
				class="w-full rounded-lg bg-surface-raised px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-accent"
			>
				<option value="">All factions</option>
				{#each collectionStore.factions as f}
					<option value={f}>{f}</option>
				{/each}
			</select>
		{/if}
	</header>

	<!-- List -->
	<div class="flex-1 overflow-y-auto px-4 py-2">
		{#if !collectionStore.loaded}
			<p class="py-8 text-center text-on-muted text-sm">Loading…</p>

		{:else if isEmpty}
			<!-- Empty state -->
			<div class="flex flex-col items-center justify-center py-16 text-center text-on-muted">
				<span class="mb-4 text-5xl" aria-hidden="true">🗂</span>
				<p class="mb-1 font-semibold text-on-surface">
					{tab === 'characters' ? 'No cards yet' : 'No upgrades yet'}
				</p>
				<p class="mb-6 text-sm">
					{tab === 'characters'
						? 'Add your cards to start building warbands.'
						: 'Add upgrade cards from your collection.'}
				</p>
				{#if tab === 'characters'}
					<a href="/collection/scan" class="btn-primary mb-3 w-48">📷 Scan a card</a>
					<a href="/collection/new" class="btn-ghost w-48">✎ Enter manually</a>
					<p class="mt-6 text-xs">Cards are saved on this device.</p>
				{:else}
					<a href="/collection/upgrade/new" class="btn-primary w-48">+ Add upgrade</a>
				{/if}
			</div>

		{:else if filtered.length === 0}
			<p class="py-8 text-center text-sm text-on-muted">No results for "{search}"</p>

		{:else if tab === 'characters'}
			<ul class="space-y-2">
				{#each filtered as char (char.id)}
					<li>
						<a
							href="/collection/{char.id}"
							class="card flex items-center justify-between hover:bg-surface-overlay"
						>
							<div class="min-w-0">
								<p class="truncate font-semibold">{char.name}</p>
								<p class="truncate text-sm text-on-muted">
									{char.faction}{char.keywords.length ? ' · ' + char.keywords.join(', ') : ''}
								</p>
							</div>
							<div class="ml-3 flex shrink-0 items-center gap-2">
								<span class="text-sm font-semibold text-accent">{char.cost} inf</span>
								<span class="text-on-muted">›</span>
							</div>
						</a>
					</li>
				{/each}
			</ul>

		{:else}
			<ul class="space-y-2">
				{#each filtered as upg (upg.id)}
					<li>
						<a
							href="/collection/upgrade/{upg.id}"
							class="card flex items-center justify-between hover:bg-surface-overlay"
						>
							<div class="min-w-0">
								<p class="truncate font-semibold">{upg.name}</p>
								<p class="truncate text-sm capitalize text-on-muted">{upg.type}</p>
							</div>
							<div class="ml-3 flex shrink-0 items-center gap-2">
								<span class="text-sm font-semibold text-accent">{upg.cost} inf</span>
								<span class="text-on-muted">›</span>
							</div>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	<!-- FAB -->
	<a
		href={tab === 'characters' ? '/collection/new' : '/collection/upgrade/new'}
		class="fixed bottom-20 right-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-2xl text-white shadow-lg"
		aria-label="Add {tab === 'characters' ? 'card' : 'upgrade'}"
	>
		+
	</a>
</div>
