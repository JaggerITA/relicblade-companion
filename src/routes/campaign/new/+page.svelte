<script lang="ts">
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import Button from '$lib/components/shared/Button.svelte';
	import { campaignStore } from '$lib/stores/campaignStore.svelte.js';
	import { rosterStore } from '$lib/stores/rosterStore.svelte.js';
	import { toastStore } from '$lib/stores/toastStore.svelte.js';

	let name = $state('');
	let rosterId = $state('');
	let startingInfluence = $state(50);

	let errors = $state<Record<string, string>>({});

	$effect(() => {
		rosterStore.hydrate();
	});

	function validate(): boolean {
		const e: Record<string, string> = {};
		if (!name.trim()) e.name = 'Name is required';
		if (!rosterId) e.rosterId = 'Choose a starting roster';
		errors = e;
		return Object.keys(e).length === 0;
	}

	async function handleSubmit() {
		if (!validate()) return;
		const campaign = await campaignStore.create(
			name.trim(),
			rosterId,
			'advocate',
			Math.max(0, startingInfluence)
		);
		toastStore.success(`${campaign.name} created`);
		goto(`${base}/campaign/${campaign.id}`);
	}
</script>

<div class="p-4">
	<header class="mb-6 flex items-center gap-3">
		<a href="{base}/campaign" class="text-on-muted hover:text-on-surface">‹</a>
		<h1 class="text-xl font-bold">New Campaign</h1>
	</header>

	{#if rosterStore.loaded && rosterStore.rosters.length === 0}
		<div class="flex flex-col items-center justify-center py-16 text-center text-on-muted">
			<span class="mb-4 text-5xl" aria-hidden="true">🛡</span>
			<p class="mb-1 font-semibold text-on-surface">No rosters yet</p>
			<p class="mb-6 text-sm">Build a roster first — it becomes your starting warband.</p>
			<a href="{base}/roster/new" class="btn-primary w-48">+ New Roster</a>
		</div>
	{:else}
		<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
			<div>
				<label class="mb-1 block text-sm" for="name">Name *</label>
				<input
					id="name"
					type="text"
					bind:value={name}
					placeholder="e.g. Volgelands Campaign"
					class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-accent"
				/>
				{#if errors.name}<p class="mt-1 text-xs text-red-400">{errors.name}</p>{/if}
			</div>

			<div>
				<label class="mb-1 block text-sm" for="roster">Starting roster *</label>
				<select
					id="roster"
					bind:value={rosterId}
					class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-accent"
				>
					<option value="" disabled>Choose a roster…</option>
					{#each rosterStore.rosters as roster (roster.id)}
						<option value={roster.id}>{roster.name}</option>
					{/each}
				</select>
				{#if errors.rosterId}<p class="mt-1 text-xs text-red-400">{errors.rosterId}</p>{/if}
			</div>

			<div>
				<label class="mb-1 block text-sm" for="startingInfluence">Starting influence *</label>
				<input
					id="startingInfluence"
					type="number"
					min="0"
					bind:value={startingInfluence}
					class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-accent"
				/>
				<p class="mt-1 text-xs text-on-muted">
					Your influence budget for the warband (Seeker's Handbook standard start = 50). The roster
					switches to threat mode (characters count, upgrades are bought with gold).
				</p>
			</div>

			<p class="text-xs text-on-muted">
				You can set your Path Alignment (Advocate / Adversary) on the campaign sheet after creation.
			</p>

			<div class="flex gap-3 pb-4 pt-2">
				<Button variant="ghost" onclick={() => goto(`${base}/campaign`)}>Cancel</Button>
				<Button variant="primary" type="submit">Create campaign</Button>
			</div>
		</form>
	{/if}
</div>
