<script lang="ts">
	import { goto } from '$app/navigation';
	import UpgradeForm from '$lib/components/cardimport/UpgradeForm.svelte';
	import { collectionStore } from '$lib/stores/collectionStore.svelte.js';

	$effect(() => { collectionStore.hydrate(); });
</script>

<div class="p-4">
	<header class="mb-6 flex items-center gap-3">
		<a href="/collection" class="text-on-muted hover:text-on-surface">‹</a>
		<h1 class="text-xl font-bold">New Upgrade</h1>
	</header>

	<UpgradeForm
		onsubmit={async (data) => {
			await collectionStore.addUpgrade(data);
			goto('/collection');
		}}
		oncancel={() => goto('/collection')}
	/>
</div>
