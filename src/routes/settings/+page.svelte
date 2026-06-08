<script lang="ts">
	import { base } from '$app/paths';
	import { onMount } from 'svelte';
	import Button from '$lib/components/shared/Button.svelte';
	import Modal from '$lib/components/shared/Modal.svelte';
	import { collectionStore } from '$lib/stores/collectionStore.svelte.js';
	import { rosterStore } from '$lib/stores/rosterStore.svelte.js';
	import { toastStore } from '$lib/stores/toastStore.svelte.js';
	import { downloadCollection, readCollectionFile, daysSinceBackup } from '$lib/utils/exportImport.js';
	import { settingsGet } from '$lib/utils/db.js';

	let lastBackupDate = $state<string | undefined>(undefined);
	let importMode = $state<'merge' | 'replace'>('merge');
	let importFile = $state<File | null>(null);
	let showImportModal = $state(false);
	let importing = $state(false);

	onMount(async () => {
		lastBackupDate = await settingsGet<string>('lastBackupDate');
		await collectionStore.hydrate();
		await rosterStore.hydrate();
	});

	const daysSince = $derived(daysSinceBackup(lastBackupDate));

	const backupLabel = $derived(
		daysSince === null
			? 'Never'
			: daysSince === 0
				? 'Today'
				: daysSince === 1
					? 'Yesterday'
					: `${daysSince} days ago`
	);

	function handleExport() {
		const data = {
			...collectionStore.exportCollection(),
			rosters: $state.snapshot(rosterStore.rosters)
		};
		downloadCollection(data);
		lastBackupDate = new Date().toISOString();
		toastStore.success('Backup exported successfully');
	}

	function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		importFile = file;
		showImportModal = true;
		input.value = '';
	}

	async function confirmImport() {
		if (!importFile) return;
		importing = true;
		try {
			const data = await readCollectionFile(importFile);
			await collectionStore.importCollection(data, importMode);
			if (data.rosters?.length) {
				await rosterStore.importRosters(data.rosters, importMode);
			}
			const rosterCount = data.rosters?.length ?? 0;
			toastStore.success(
				importMode === 'replace'
					? 'Backup replaced successfully'
					: `Imported ${data.characters.length} characters, ${data.upgrades.length} upgrades, ${rosterCount} rosters`
			);
		} catch (err) {
			toastStore.error(err instanceof Error ? err.message : 'Import failed');
		} finally {
			importing = false;
			importFile = null;
			showImportModal = false;
		}
	}
</script>

<div class="p-4">
	<header class="mb-6 flex items-center gap-3">
		<a href="{base}/" class="text-on-muted hover:text-on-surface">‹</a>
		<h1 class="text-xl font-bold">Settings</h1>
	</header>

	<!-- Backup -->
	<section class="mb-6">
		<h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-on-muted">Backup</h2>

		<div class="card mb-3 flex items-center justify-between">
			<div>
				<p class="text-sm font-medium">Last backup</p>
				<p class="text-sm text-on-muted">{backupLabel}</p>
			</div>
			{#if daysSince !== null && daysSince >= 7}
				<span class="rounded-full bg-amber-800/50 px-2 py-0.5 text-xs text-amber-200">Overdue</span>
			{/if}
		</div>

		<Button variant="primary" onclick={handleExport}>
			↓ Export backup
		</Button>
		<p class="mt-1 text-xs text-on-muted">
			{collectionStore.characters.length} characters · {collectionStore.upgrades.length} upgrades · {rosterStore.rosters.length} rosters
		</p>
	</section>

	<!-- Import -->
	<section class="mb-6">
		<h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-on-muted">Import</h2>
		<p class="mb-3 text-sm text-on-muted">Load a previously exported JSON backup.</p>

		<label class="btn-primary inline-flex cursor-pointer items-center justify-center rounded-lg px-4 py-2 font-medium">
			↑ Import backup
			<input
				type="file"
				accept=".json,application/json"
				class="sr-only"
				onchange={handleFileSelect}
			/>
		</label>
	</section>

	<!-- App info -->
	<section>
		<h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-on-muted">About</h2>
		<div class="card space-y-1 text-sm text-on-muted">
			<p>Relicblade Companion</p>
			<p>Open-source companion app for Relicblade by Metal King Studio.</p>
			<p class="pt-1 text-xs">Data stored locally on this device.</p>
		</div>
	</section>
</div>

<!-- Import mode modal -->
<Modal open={showImportModal} title="Import backup" onclose={() => (showImportModal = false)}>
	{#snippet children()}
		<p class="mb-4 text-sm text-on-muted">
			File: <span class="font-medium text-on-surface">{importFile?.name}</span>
		</p>
		<fieldset class="space-y-2">
			<legend class="mb-2 text-sm font-medium">Import mode</legend>
			<label class="flex cursor-pointer items-start gap-3">
				<input
					type="radio"
					name="importMode"
					value="merge"
					bind:group={importMode}
					class="mt-0.5"
				/>
				<div>
					<p class="text-sm font-medium">Merge</p>
					<p class="text-xs text-on-muted">Add new cards; update existing ones by ID. Your current collection is preserved.</p>
				</div>
			</label>
			<label class="flex cursor-pointer items-start gap-3">
				<input
					type="radio"
					name="importMode"
					value="replace"
					bind:group={importMode}
					class="mt-0.5"
				/>
				<div>
					<p class="text-sm font-medium">Replace</p>
					<p class="text-xs text-on-muted">Delete everything and load the backup. Cannot be undone.</p>
				</div>
			</label>
		</fieldset>
	{/snippet}
	{#snippet actions()}
		<Button variant="ghost" onclick={() => (showImportModal = false)}>Cancel</Button>
		<Button variant="primary" onclick={confirmImport} disabled={importing}>
			{importing ? 'Importing…' : 'Import'}
		</Button>
	{/snippet}
</Modal>
