<script lang="ts">
	import { base } from '$app/paths';
	import { onMount } from 'svelte';
	import Button from '$lib/components/shared/Button.svelte';
	import Modal from '$lib/components/shared/Modal.svelte';
	import { baseTemplateStore } from '$lib/stores/baseTemplateStore.svelte.js';
	import { campaignStore } from '$lib/stores/campaignStore.svelte.js';
	import { collectionStore } from '$lib/stores/collectionStore.svelte.js';
	import { environmentStore } from '$lib/stores/environmentStore.svelte.js';
	import { rosterStore } from '$lib/stores/rosterStore.svelte.js';
	import { scenarioStore } from '$lib/stores/scenarioStore.svelte.js';
	import { settingsStore } from '$lib/stores/settingsStore.svelte.js';
	import { toastStore } from '$lib/stores/toastStore.svelte.js';
	import { downloadCollection, readCollectionFile, daysSinceBackup } from '$lib/utils/exportImport.js';
	import { settingsGet } from '$lib/utils/db.js';

	let lastBackupDate = $state<string | undefined>(undefined);
	let importMode = $state<'merge' | 'replace'>('merge');
	let importFile = $state<File | null>(null);
	let showImportModal = $state(false);
	let importing = $state(false);
	let confirmDeleteTemplateId = $state<string | null>(null);

	onMount(async () => {
		lastBackupDate = await settingsGet<string>('lastBackupDate');
		await collectionStore.hydrate();
		await rosterStore.hydrate();
		await campaignStore.hydrate();
		await baseTemplateStore.hydrate();
		await scenarioStore.hydrate();
		await environmentStore.hydrate();
		await settingsStore.hydrate();
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
			rosters: $state.snapshot(rosterStore.rosters),
			campaigns: $state.snapshot(campaignStore.campaigns),
			baseTemplates: $state.snapshot(baseTemplateStore.templates),
			scenarios: $state.snapshot(scenarioStore.scenarios),
			environments: $state.snapshot(environmentStore.environments)
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

	let showTemplateModal = $state(false);
	let editingTemplateId = $state<string | null>(null);
	let tplType = $state('');
	let tplName = $state('');
	let tplNotes = $state('');
	let tplInfluence = $state(0);
	let tplGold = $state(0);
	let tplValor = $state(0);
	let tplErrors = $state<Record<string, string>>({});

	function openTemplateModal(id: string | null): void {
		const template = id ? baseTemplateStore.getTemplate(id) : undefined;
		editingTemplateId = id;
		tplType = template?.type ?? '';
		tplName = template?.name ?? '';
		tplNotes = template?.notes ?? '';
		tplInfluence = template?.startingInfluence ?? 0;
		tplGold = template?.startingGold ?? 0;
		tplValor = template?.startingValor ?? 0;
		tplErrors = {};
		showTemplateModal = true;
	}

	async function saveTemplate(): Promise<void> {
		const errors: Record<string, string> = {};
		if (!tplType.trim()) errors.type = 'Base type is required';
		if (!tplName.trim()) errors.name = 'Give this base a name';
		tplErrors = errors;
		if (Object.keys(errors).length > 0) return;
		const input = {
			type: tplType.trim(),
			name: tplName.trim(),
			notes: tplNotes.trim(),
			startingInfluence: tplInfluence,
			startingGold: tplGold,
			startingValor: tplValor
		};
		if (editingTemplateId) {
			await baseTemplateStore.update(editingTemplateId, input);
		} else {
			await baseTemplateStore.create(input);
		}
		showTemplateModal = false;
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
			if (data.campaigns?.length) {
				await campaignStore.importCampaigns(data.campaigns, importMode);
			}
			if (data.baseTemplates?.length) {
				await baseTemplateStore.importTemplates(data.baseTemplates, importMode);
			}
			if (data.scenarios?.length) {
				await scenarioStore.importScenarios(data.scenarios, importMode);
			}
			if (data.environments?.length) {
				await environmentStore.importEnvironments(data.environments, importMode);
			}
			const rosterCount = data.rosters?.length ?? 0;
			const campaignCount = data.campaigns?.length ?? 0;
			toastStore.success(
				importMode === 'replace'
					? 'Backup replaced successfully'
					: `Imported ${data.characters.length} characters, ${data.upgrades.length} upgrades, ${rosterCount} rosters, ${campaignCount} campaigns`
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

	<!-- Layout -->
	<section class="mb-6">
		<h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-on-muted">Layout</h2>
		<div class="card">
			<p class="mb-2 text-sm font-medium">Dominant hand</p>
			<p class="mb-3 text-xs text-on-muted">
				Moves floating buttons, tabs, and dialog actions to the side that's easiest to reach
				with your thumb.
			</p>
			<div class="flex gap-2">
				{#each (['right', 'left'] as const) as hand}
					<button
						type="button"
						onclick={() => settingsStore.setHandedness(hand)}
						class="flex min-h-touch flex-1 items-center justify-center rounded-lg text-sm capitalize transition-colors
							{settingsStore.handedness === hand
							? 'bg-accent text-white'
							: 'bg-surface-overlay text-on-muted hover:bg-white/10'}"
						aria-pressed={settingsStore.handedness === hand}
					>
						{hand}-handed
					</button>
				{/each}
			</div>
		</div>
	</section>

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
			{collectionStore.characters.length} characters · {collectionStore.upgrades.length} upgrades · {rosterStore.rosters.length} rosters · {campaignStore.campaigns.length} campaigns
		</p>
	</section>

	<!-- Base Templates -->
	<section class="mb-6">
		<h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-on-muted">Base Templates</h2>
		<p class="mb-3 text-sm text-on-muted">
			Save your encampment base types (from your own book) to reuse across campaigns.
		</p>
		{#if baseTemplateStore.templates.length > 0}
			<ul class="mb-3 space-y-2">
				{#each baseTemplateStore.templates as template (template.id)}
					<li class="card flex items-center justify-between gap-3">
						<div class="min-w-0">
							<p class="truncate text-sm font-medium">{template.name}</p>
							<p class="truncate text-xs text-on-muted">{template.type}</p>
						</div>
						<div class="flex shrink-0 gap-3 text-sm">
							<button type="button" onclick={() => openTemplateModal(template.id)} class="text-accent">
								Edit
							</button>
							<button
								type="button"
								onclick={() => (confirmDeleteTemplateId = template.id)}
								class="text-on-muted hover:text-on-surface"
							>
								Delete
							</button>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
		<Button variant="ghost" onclick={() => openTemplateModal(null)}>+ New base template</Button>
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

<!-- Base template create/edit modal -->
<Modal
	open={showTemplateModal}
	title={editingTemplateId ? 'Edit base template' : 'New base template'}
	onclose={() => (showTemplateModal = false)}
>
	{#snippet children()}
		<div class="space-y-4">
			<div>
				<label class="mb-1 block text-sm" for="tplType">Base type *</label>
				<input
					id="tplType"
					type="text"
					bind:value={tplType}
					placeholder="As printed in your Seeker's Handbook"
					class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-accent"
				/>
				{#if tplErrors.type}<p class="mt-1 text-xs text-red-400">{tplErrors.type}</p>{/if}
			</div>
			<div>
				<label class="mb-1 block text-sm" for="tplName">Base name *</label>
				<input
					id="tplName"
					type="text"
					bind:value={tplName}
					placeholder="Your own name for this base"
					class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-accent"
				/>
				{#if tplErrors.name}<p class="mt-1 text-xs text-red-400">{tplErrors.name}</p>{/if}
			</div>
			<div class="grid grid-cols-3 gap-3">
				<div>
					<label class="mb-1 block text-sm" for="tplInfluence">Starting Influence</label>
					<input
						id="tplInfluence"
						type="number"
						min="0"
						bind:value={tplInfluence}
						class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-accent"
					/>
				</div>
				<div>
					<label class="mb-1 block text-sm" for="tplGold">Starting Gold</label>
					<input
						id="tplGold"
						type="number"
						min="0"
						bind:value={tplGold}
						class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-accent"
					/>
				</div>
				<div>
					<label class="mb-1 block text-sm" for="tplValor">Starting Valor</label>
					<input
						id="tplValor"
						type="number"
						min="0"
						bind:value={tplValor}
						class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-accent"
					/>
				</div>
			</div>
			<div>
				<label class="mb-1 block text-sm" for="tplNotes">Permanent boon / notes</label>
				<textarea
					id="tplNotes"
					bind:value={tplNotes}
					rows="3"
					placeholder="Permanent boon granted by this base"
					class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-accent"
				></textarea>
			</div>
		</div>
	{/snippet}
	{#snippet actions()}
		<Button variant="ghost" onclick={() => (showTemplateModal = false)}>Cancel</Button>
		<Button variant="primary" onclick={saveTemplate}>Save</Button>
	{/snippet}
</Modal>

<!-- Base template delete confirm -->
<Modal
	open={confirmDeleteTemplateId !== null}
	title="Delete base template?"
	onclose={() => (confirmDeleteTemplateId = null)}
>
	{#snippet children()}
		<p class="text-on-muted">This cannot be undone.</p>
	{/snippet}
	{#snippet actions()}
		<Button variant="ghost" onclick={() => (confirmDeleteTemplateId = null)}>Cancel</Button>
		<Button
			variant="danger"
			onclick={async () => {
				if (!confirmDeleteTemplateId) return;
				await baseTemplateStore.deleteTemplate(confirmDeleteTemplateId);
				confirmDeleteTemplateId = null;
			}}
		>
			Delete
		</Button>
	{/snippet}
</Modal>
