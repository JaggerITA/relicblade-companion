<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { base } from '$app/paths';
	import CardReviewForm from '$lib/components/cardimport/CardReviewForm.svelte';
	import Modal from '$lib/components/shared/Modal.svelte';
	import Button from '$lib/components/shared/Button.svelte';
	import { collectionStore } from '$lib/stores/collectionStore.svelte.js';

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
			class="text-sm text-red-400 hover:text-red-300"
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
				await collectionStore.deleteCharacter(id);
				goto(`${base}/collection`);
			}}
		>
			Delete
		</Button>
	{/snippet}
</Modal>
