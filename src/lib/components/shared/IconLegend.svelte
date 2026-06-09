<script lang="ts">
	import type { LucideIcon } from '@lucide/svelte';

	interface Props {
		icons: Record<string, LucideIcon>;
		title?: string;
	}

	let { icons, title = 'Legend' }: Props = $props();

	const entries = $derived(Object.entries(icons) as [string, LucideIcon][]);

	function formatLabel(key: string): string {
		return key.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
	}
</script>

<details class="group text-xs text-on-muted">
	<summary class="flex cursor-pointer select-none list-none items-center gap-1 hover:text-on-surface">
		<span aria-hidden="true">ℹ</span>
		{title}
		<span class="transition-transform group-open:rotate-90" aria-hidden="true">›</span>
	</summary>
	<div class="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-lg bg-surface-overlay p-2 sm:grid-cols-3">
		{#each entries as [key, Icon] (key)}
			<span class="flex items-center gap-1.5">
				<Icon class="h-3.5 w-3.5 shrink-0 text-on-muted" aria-hidden="true" />
				{formatLabel(key)}
			</span>
		{/each}
	</div>
</details>
