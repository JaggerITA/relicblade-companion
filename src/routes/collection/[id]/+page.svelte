<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { base } from '$app/paths';
	import CardReviewForm from '$lib/components/cardimport/CardReviewForm.svelte';
	import Modal from '$lib/components/shared/Modal.svelte';
	import Button from '$lib/components/shared/Button.svelte';
	import { collectionStore } from '$lib/stores/collectionStore.svelte.js';
	import { toastStore } from '$lib/stores/toastStore.svelte.js';

	const id = $derived($page.params.id ?? '');
	const character = $derived(collectionStore.getCharacter(id));
	let confirmDelete = $state(false);

	$effect(() => { collectionStore.hydrate(); });
</script>

<div class="p-4">
	<header class="mb-6 flex items-center justify-between">
		<div class="flex items-center gap-3">
			<a href="{base}/collection" class="text-on-muted hover:text-on-surface">‹</a>
			<h1 class="text-xl font-bold">Edit Card</h1>
		</div>
		<button
			onclick={() => (confirmDelete = true)}
			class="text-sm text-on-muted hover:text-on-surface"
			aria-label="Delete card"
		>
			Delete
		</button>
	</header>

	{#if character}
		<CardReviewForm
			initial={character}
			onsubmit={async (data) => {
				await collectionStore.updateCharacter({ ...character, ...data });
				toastStore.success('Card saved');
				goto(`${base}/collection`);
			}}
			oncancel={() => goto(`${base}/collection`)}
		/>
	{:else if collectionStore.loaded}
		<p class="text-on-muted">Card not found.</p>
		<a href="{base}/collection" class="mt-4 inline-block text-accent">Back to collection</a>
	{:else}
		<p class="text-on-muted">Loading...</p>
	{/if}
</div>

<Modal
	open={confirmDelete}
	title="Delete card?"
	onclose={() => (confirmDelete = false)}
>
	{#snippet children()}
		<p class="text-on-muted">This cannot be undone. The card will be removed from all rosters.</p>
	{/snippet}
	{#snippet actions()}
		<Button variant="ghost" onclick={() => (confirmDelete = false)}>Cancel</Button>
		<Button
			variant="danger"
			onclick={async () => {
				const name = character?.name ?? 'Card';
				await collectionStore.deleteCharacter(id);
				goto(`${base}/collection`);
				toastStore.info(`${name} deleted`);
			}}
		>
			Delete
		</Button>
	{/snippet}
</Modal>
