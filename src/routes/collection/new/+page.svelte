<script lang="ts">
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import CardReviewForm from '$lib/components/cardimport/CardReviewForm.svelte';
	import { collectionStore } from '$lib/stores/collectionStore.svelte.js';
	import type { Character } from '$lib/models/Character.js';

	$effect(() => { collectionStore.hydrate(); });
</script>

<div class="p-4">
	<header class="mb-6 flex items-center gap-3">
		<a href="{base}/collection" class="text-on-muted hover:text-on-surface">‹</a>
		<h1 class="text-xl font-bold">New Card</h1>
	</header>

	<CardReviewForm
		onsubmit={async (data) => {
			await collectionStore.addCharacter(data as Omit<Character, 'id' | 'createdAt' | 'updatedAt'>);
			goto('/collection');
		}}
		oncancel={() => goto('/collection')}
	/>
</div>
