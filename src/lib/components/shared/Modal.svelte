<script lang="ts">
	interface Props {
		open: boolean;
		title: string;
		onclose: () => void;
		children: import('svelte').Snippet;
		actions?: import('svelte').Snippet;
	}

	let { open, title, onclose, children, actions }: Props = $props();
</script>

{#if open}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-40 bg-black/60"
		role="presentation"
		onclick={onclose}
		onkeydown={(e) => e.key === 'Escape' && onclose()}
	></div>

	<!-- Dialog -->
	<div
		class="fixed bottom-16 left-0 right-0 z-50 rounded-t-2xl bg-surface-raised p-6 shadow-xl sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl"
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-title"
	>
		<h2 id="modal-title" class="mb-4 text-lg font-semibold">{title}</h2>
		{@render children()}
		{#if actions}
			<div class="mt-6 flex justify-end gap-3">
				{@render actions()}
			</div>
		{/if}
	</div>
{/if}
