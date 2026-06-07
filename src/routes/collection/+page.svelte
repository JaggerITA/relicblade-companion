<script lang="ts">
	import { collectionStore } from '$lib/stores/collectionStore.svelte.js';
	import { UPGRADE_SLOT_TYPE_ICONS } from '$lib/constants/icons.js';
	import { base } from '$app/paths';
	import type { Path } from '$lib/models/Character.js';

	type Tab = 'characters' | 'upgrades';

	let tab = $state<Tab>('characters');
	let search = $state('');
	let pathFilter = $state<Path | ''>('');

	const PATHS: Path[] = ['advocate', 'adversary', 'neutral'];

	$effect(() => { collectionStore.hydrate(); });

	const filteredChars = $derived.by(() => {
		const q = search.toLowerCase();
		return collectionStore.characters.filter((c) => {
			const matchSearch = !q || c.name.toLowerCase().includes(q) || c.faction.toLowerCase().includes(q);
			const matchPath = !pathFilter || c.path === pathFilter;
			return matchSearch && matchPath;
		});
	});

	const filteredUpgrades = $derived.by(() => {
		const q = search.toLowerCase();
		return collectionStore.upgrades.filter((u) =>
			!q || u.name.toLowerCase().includes(q) || u.type.toLowerCase().includes(q)
		);
	});

	const isEmpty = $derived(
		tab === 'characters' ? collectionStore.characters.length === 0 : collectionStore.upgrades.length === 0
	);

	const noResults = $derived(
		tab === 'characters' ? filteredChars.length === 0 : filteredUpgrades.length === 0
	);
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<header class="sticky top-0 z-10 bg-surface px-4 pb-2 pt-4">
		<div class="mb-3 flex items-center justify-between">
			<h1 class="text-xl font-bold">Collection</h1>
			<a href="{base}/settings" class="text-on-muted hover:text-on-surface" aria-label="Settings">⚙</a>
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
					onclick={() => { tab = t; pathFilter = ''; }}
					class="rounded-full px-3 py-1 text-sm capitalize transition-colors
						{tab === t ? 'bg-accent text-white' : 'bg-surface-raised text-on-muted'}"
				>
					{t}
				</button>
			{/each}
		</div>

		<!-- Path filter (characters only) -->
		{#if tab === 'characters' && collectionStore.characters.length > 0}
			<select
				bind:value={pathFilter}
				class="w-full rounded-lg bg-surface-raised px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-accent capitalize"
			>
				<option value="">All paths</option>
				{#each PATHS as p}
					<option value={p} class="capitalize">{p}</option>
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
					<a href="{base}/collection/scan" class="btn-primary mb-3 w-48">📷 Scan a card</a>
					<a href="{base}/collection/new" class="btn-ghost w-48">✎ Enter manually</a>
					<p class="mt-6 text-xs">Cards are saved on this device.</p>
				{:else}
					<a href="{base}/collection/upgrade/new" class="btn-primary w-48">+ Add upgrade</a>
				{/if}
			</div>

		{:else if noResults}
			<p class="py-8 text-center text-sm text-on-muted">No results for "{search}"</p>

		{:else if tab === 'characters'}
			<ul class="space-y-2">
				{#each filteredChars as char (char.id)}
					<li>
						<a
							href="{base}/collection/{char.id}"
							class="card flex items-center justify-between hover:bg-surface-overlay"
						>
							<div class="min-w-0">
								<p class="truncate font-semibold">{char.name}</p>
								<p class="truncate text-sm text-on-muted">
									<span class="capitalize">{char.path}</span>
									{#if char.faction} · {char.faction}{/if}
									{char.keywords.length ? ' · ' + char.keywords.join(', ') : ''}
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
				{#each filteredUpgrades as upg (upg.id)}
					{@const SlotIcon = UPGRADE_SLOT_TYPE_ICONS[upg.type]}
					<li>
						<a
							href="{base}/collection/upgrade/{upg.id}"
							class="card flex items-center justify-between hover:bg-surface-overlay"
						>
							<div class="min-w-0">
								<p class="truncate font-semibold">{upg.name}</p>
								<p class="flex items-center gap-1 truncate text-sm capitalize text-on-muted">
									<SlotIcon class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
									{upg.type}
								</p>
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
		href={tab === 'characters' ? `${base}/collection/new` : `${base}/collection/upgrade/new`}
		class="fixed bottom-20 right-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-2xl text-white shadow-lg"
		aria-label="Add {tab === 'characters' ? 'card' : 'upgrade'}"
	>
		+
	</a>
</div>
