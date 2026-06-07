<script lang="ts">
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import Button from '$lib/components/shared/Button.svelte';
	import { rosterStore } from '$lib/stores/rosterStore.svelte.js';
	import { toastStore } from '$lib/stores/toastStore.svelte.js';
	import type { LimitMode } from '$lib/models/Roster.js';

	let name = $state('');
	let faction = $state('');
	let limitMode = $state<LimitMode>('standard');
	let maxInfluence = $state(100);

	let errors = $state<Record<string, string>>({});

	function validate(): boolean {
		const e: Record<string, string> = {};
		if (!name.trim()) e.name = 'Name is required';
		if (maxInfluence < 1) e.maxInfluence = 'Influence limit must be at least 1';
		errors = e;
		return Object.keys(e).length === 0;
	}

	async function handleSubmit() {
		if (!validate()) return;
		const roster = await rosterStore.create(name.trim(), faction.trim(), limitMode, maxInfluence);
		toastStore.success(`${roster.name} created`);
		goto(`${base}/roster/${roster.id}`);
	}
</script>

<div class="p-4">
	<header class="mb-6 flex items-center gap-3">
		<a href="{base}/roster" class="text-on-muted hover:text-on-surface">‹</a>
		<h1 class="text-xl font-bold">New Roster</h1>
	</header>

	<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
		<div>
			<label class="mb-1 block text-sm" for="name">Name *</label>
			<input
				id="name"
				type="text"
				bind:value={name}
				placeholder="e.g. Temple Vanguard"
				class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-accent"
			/>
			{#if errors.name}<p class="mt-1 text-xs text-red-400">{errors.name}</p>{/if}
		</div>

		<div>
			<label class="mb-1 block text-sm" for="faction">Faction (optional)</label>
			<input
				id="faction"
				type="text"
				bind:value={faction}
				placeholder="e.g. Temple of Justice"
				class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-accent"
			/>
		</div>

		<div>
			<label class="mb-1 block text-sm" for="limitMode">Influence mode</label>
			<select
				id="limitMode"
				bind:value={limitMode}
				class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-accent"
			>
				<option value="standard">Standard — characters + upgrades count</option>
				<option value="threat">Threat — characters only (campaign mode)</option>
			</select>
		</div>

		<div>
			<label class="mb-1 block text-sm" for="maxInfluence">Influence limit</label>
			<input
				id="maxInfluence"
				type="number"
				min="1"
				bind:value={maxInfluence}
				class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-accent"
			/>
			{#if errors.maxInfluence}<p class="mt-1 text-xs text-red-400">{errors.maxInfluence}</p>{/if}
		</div>

		<div class="flex gap-3 pb-4 pt-2">
			<Button variant="ghost" onclick={() => goto(`${base}/roster`)}>Cancel</Button>
			<Button variant="primary" type="submit">Create roster</Button>
		</div>
	</form>
</div>
