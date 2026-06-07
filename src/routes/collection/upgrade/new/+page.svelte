<script lang="ts">
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import UpgradeForm from '$lib/components/cardimport/UpgradeForm.svelte';
	import { collectionStore } from '$lib/stores/collectionStore.svelte.js';
	import { toastStore } from '$lib/stores/toastStore.svelte.js';

	$effect(() => { collectionStore.hydrate(); });
</script>

<div class="p-4">
	<header class="mb-6 flex items-center gap-3">
		<a href="{base}/collection" class="text-on-muted hover:text-on-surface">‹</a>
		<h1 class="text-xl font-bold">New Upgrade</h1>
	</header>

	<UpgradeForm
		onsubmit={async (data) => {
			const upg = await collectionStore.addUpgrade(data);
			toastStore.success(`${upg.name} added to collection`);
			goto(`${base}/collection`);
		}}
		oncancel={() => goto(`${base}/collection`)}
	/>
</div>
