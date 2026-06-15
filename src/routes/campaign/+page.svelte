<script lang="ts">
	import { base } from '$app/paths';
	import Modal from '$lib/components/shared/Modal.svelte';
	import Button from '$lib/components/shared/Button.svelte';
	import { campaignStore } from '$lib/stores/campaignStore.svelte.js';
	import { rosterStore } from '$lib/stores/rosterStore.svelte.js';
	import { settingsStore } from '$lib/stores/settingsStore.svelte.js';
	import { toastStore } from '$lib/stores/toastStore.svelte.js';

	let confirmDeleteId = $state<string | null>(null);

	$effect(() => {
		campaignStore.hydrate();
		rosterStore.hydrate();
	});

	const confirmCampaign = $derived(
		confirmDeleteId ? campaignStore.getCampaign(confirmDeleteId) : undefined
	);

	const pathLabel: Record<string, string> = {
		advocate: 'Advocate',
		adversary: 'Adversary'
	};

	async function handleDelete(): Promise<void> {
		if (!confirmDeleteId) return;
		await campaignStore.deleteCampaign(confirmDeleteId);
		toastStore.info('Campaign deleted');
		confirmDeleteId = null;
	}
</script>

<div class="flex h-full flex-col">
	<header class="sticky top-0 z-10 bg-surface px-4 pb-2 pt-4">
		<div class="flex items-center justify-between">
			<h1 class="text-xl font-bold">Campaigns</h1>
			<div class="flex items-center gap-3">
				<a href="{base}/campaign/scenarios" class="text-on-muted hover:text-on-surface" aria-label="Scenarios & environments">🗺</a>
				<a href="{base}/settings" class="text-on-muted hover:text-on-surface" aria-label="Settings">⚙</a>
			</div>
		</div>
	</header>

	<div class="flex-1 overflow-y-auto px-4 py-2">
		{#if !campaignStore.loaded}
			<p class="py-8 text-center text-sm text-on-muted">Loading…</p>
		{:else if campaignStore.campaigns.length === 0}
			<div class="flex flex-col items-center justify-center py-16 text-center text-on-muted">
				<span class="mb-4 text-5xl" aria-hidden="true">🏕</span>
				<p class="mb-1 font-semibold text-on-surface">No campaigns yet</p>
				<p class="mb-6 text-sm">Track your warband through Wonders &amp; Horrors.</p>
				<a href="{base}/campaign/new" class="btn-primary w-48">+ New Campaign</a>
			</div>
		{:else}
			<ul class="space-y-2">
				{#each campaignStore.campaigns as campaign (campaign.id)}
					{@const roster = rosterStore.getRoster(campaign.rosterId)}
					<li class="card flex items-center justify-between gap-3">
						<a href="{base}/campaign/{campaign.id}" class="min-w-0 flex-1">
							<p class="truncate font-semibold">{campaign.name}</p>
							<p class="truncate text-sm capitalize text-on-muted">
								{pathLabel[campaign.pathAlignment]}{#if roster} · {roster.name}{/if}
							</p>
						</a>
						<div class="flex shrink-0 items-center gap-2">
							<span class="text-on-muted">›</span>
							<button
								type="button"
								onclick={() => (confirmDeleteId = campaign.id)}
								class="text-on-muted hover:text-on-surface"
								aria-label="Delete campaign"
							>
								✕
							</button>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	{#if campaignStore.campaigns.length > 0}
		<a
			href="{base}/campaign/new"
			class="fixed bottom-20 {settingsStore.handedness === 'left' ? 'left-4' : 'right-4'} flex h-14 w-14 items-center justify-center rounded-full bg-accent text-2xl text-white shadow-lg"
			aria-label="New campaign"
		>
			+
		</a>
	{/if}
</div>

<Modal
	open={confirmDeleteId !== null}
	title="Delete campaign?"
	onclose={() => (confirmDeleteId = null)}
>
	{#snippet children()}
		{#if confirmCampaign}
			<p class="text-on-muted">
				This cannot be undone. "{confirmCampaign.name}" and its progress will be removed.
			</p>
		{/if}
	{/snippet}
	{#snippet actions()}
		<Button variant="ghost" onclick={() => (confirmDeleteId = null)}>Cancel</Button>
		<Button variant="danger" onclick={handleDelete}>Delete</Button>
	{/snippet}
</Modal>
