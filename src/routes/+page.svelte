<script lang="ts">
	import { base } from '$app/paths';
	import { onMount } from 'svelte';
	import { collectionStore } from '$lib/stores/collectionStore.svelte.js';
	import { settingsGet } from '$lib/utils/db.js';
	import { daysSinceBackup } from '$lib/utils/exportImport.js';

	let lastBackupDate = $state<string | undefined>(undefined);

	onMount(async () => {
		await collectionStore.hydrate();
		lastBackupDate = await settingsGet<string>('lastBackupDate');
	});

	const daysSince = $derived(daysSinceBackup(lastBackupDate));
	const backupWarning = $derived(
		collectionStore.characters.length > 0 && daysSince === null
			? 'No backup yet'
			: daysSince !== null && daysSince >= 7
				? `Last backup ${daysSince} days ago`
				: null
	);
</script>

<div class="p-4">
	<header class="mb-6 flex items-center justify-between">
		<h1 class="text-2xl font-bold">Relicblade</h1>
		<a href="{base}/settings" class="text-on-muted hover:text-on-surface" aria-label="Settings">⚙</a>
	</header>

	<!-- Backup warning banner -->
	{#if backupWarning}
		<a
			href="{base}/settings"
			class="mb-4 flex items-center gap-2 rounded-lg border border-amber-600/40 bg-amber-900/20 px-3 py-2 text-sm text-amber-200"
		>
			<span aria-hidden="true">⚠</span>
			<span>{backupWarning} — tap to export</span>
		</a>
	{/if}

	<!-- Stats row -->
	{#if collectionStore.loaded && (collectionStore.characters.length > 0 || collectionStore.upgrades.length > 0)}
		<div class="mb-4 grid grid-cols-2 gap-2">
			<div class="card text-center">
				<p class="text-2xl font-bold text-accent">{collectionStore.characters.length}</p>
				<p class="text-xs text-on-muted">Characters</p>
			</div>
			<div class="card text-center">
				<p class="text-2xl font-bold text-accent">{collectionStore.upgrades.length}</p>
				<p class="text-xs text-on-muted">Upgrades</p>
			</div>
		</div>
	{/if}

	<!-- Main nav cards -->
	<section class="space-y-3">
		<a href="{base}/collection" class="card flex items-center justify-between hover:bg-surface-overlay">
			<div>
				<p class="font-semibold">Collection</p>
				<p class="text-sm text-on-muted">
					{#if collectionStore.loaded && collectionStore.characters.length > 0}
						{collectionStore.characters.length} cards
					{:else}
						Your cards
					{/if}
				</p>
			</div>
			<span class="text-on-muted">›</span>
		</a>
		<a href="{base}/roster" class="card flex items-center justify-between hover:bg-surface-overlay">
			<div>
				<p class="font-semibold">Rosters</p>
				<p class="text-sm text-on-muted">Build warbands</p>
			</div>
			<span class="text-on-muted">›</span>
		</a>
		<a href="{base}/game" class="card flex items-center justify-between hover:bg-surface-overlay">
			<div>
				<p class="font-semibold">Games</p>
				<p class="text-sm text-on-muted">Track a game</p>
			</div>
			<span class="text-on-muted">›</span>
		</a>
		<a href="{base}/campaign" class="card flex items-center justify-between hover:bg-surface-overlay">
			<div>
				<p class="font-semibold">Campaigns</p>
				<p class="text-sm text-on-muted">Wonders &amp; Horrors</p>
			</div>
			<span class="text-on-muted">›</span>
		</a>
	</section>
</div>
