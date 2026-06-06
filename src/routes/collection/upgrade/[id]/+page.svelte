<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { base } from '$app/paths';
	import UpgradeForm from '$lib/components/cardimport/UpgradeForm.svelte';
	import Modal from '$lib/components/shared/Modal.svelte';
	import Button from '$lib/components/shared/Button.svelte';
	import { collectionStore } from '$lib/stores/collectionStore.svelte.js';

	const id = $derived($page.params.id ?? '');
	const upgrade = $derived(collectionStore.getUpgrade(id));
	let confirmDelete = $state(false);

	$effect(() => { collectionStore.hydrate(); });
</script>

<div class="p-4">
	<header class="mb-6 flex items-center justify-between">
		<div class="flex items-center gap-3">
			<a href="{base}/collection" class="text-on-muted hover:text-on-surface">‹</a>
			<h1 class="text-xl font-bold">Edit Upgrade</h1>
		</div>
		<button onclick={() => (confirmDelete = true)} class="text-sm text-red-400 hover:text-red-300">
			Delete
		</button>
	</header>

	{#if upgrade}
		<UpgradeForm
			initial={upgrade}
			onsubmit={async (data) => {
				await collectionStore.updateUpgrade({ ...upgrade, ...data });
				goto('/collection');
			}}
			oncancel={() => goto('/collection')}
		/>
	{:else if collectionStore.loaded}
		<p class="text-on-muted">Upgrade not found.</p>
	{:else}
		<p class="text-on-muted">Loading...</p>
	{/if}
</div>

<Modal open={confirmDelete} title="Delete upgrade?" onclose={() => (confirmDelete = false)}>
	{#snippet children()}
		<p class="text-on-muted">This cannot be undone.</p>
	{/snippet}
	{#snippet actions()}
		<Button variant="ghost" onclick={() => (confirmDelete = false)}>Cancel</Button>
		<Button variant="danger" onclick={async () => { await collectionStore.deleteUpgrade(id); goto('/collection'); }}>
			Delete
		</Button>
	{/snippet}
</Modal>
