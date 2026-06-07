<script lang="ts">
	import { toastStore } from '$lib/stores/toastStore.svelte.js';

	const colorMap = {
		success: 'bg-green-700 text-white',
		error: 'bg-red-700 text-white',
		info: 'bg-surface-overlay text-on-surface border border-white/10'
	};
</script>

<div class="pointer-events-none fixed bottom-20 left-0 right-0 z-50 flex flex-col items-center gap-2 px-4">
	{#each toastStore.items as toast (toast.id)}
		<div
			class="pointer-events-auto w-full max-w-sm rounded-lg px-4 py-3 text-sm shadow-lg {colorMap[toast.type]}"
			role="alert"
		>
			{toast.message}
		</div>
	{/each}
</div>
