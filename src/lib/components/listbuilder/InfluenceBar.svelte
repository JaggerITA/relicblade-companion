<script lang="ts">
	import type { LimitMode } from '$lib/models/Roster.js';

	interface Props {
		used: number;
		max: number;
		mode: LimitMode;
		charactersInfluence: number;
		upgradesInfluence: number;
	}

	let { used, max, mode, charactersInfluence, upgradesInfluence }: Props = $props();

	const overLimit = $derived(used > max);
	const pct = $derived(max > 0 ? Math.min(100, (used / max) * 100) : 0);
</script>

<div class="sticky bottom-0 left-0 right-0 border-t border-white/10 bg-surface-raised px-4 py-3">
	<div class="mb-1 flex items-baseline justify-between text-sm">
		<span class="font-semibold {overLimit ? 'text-red-400' : 'text-on-surface'}">
			{used} / {max} inf
			{#if mode === 'threat'}
				<span class="font-normal text-on-muted">· threat</span>
			{/if}
		</span>
		{#if overLimit}
			<span class="text-xs text-red-400">Over limit</span>
		{/if}
	</div>
	<div class="h-2 w-full overflow-hidden rounded-full bg-surface-overlay">
		<div
			class="h-full rounded-full transition-all {overLimit ? 'bg-red-500' : 'bg-accent'}"
			style="width: {pct}%"
		></div>
	</div>
	{#if mode === 'threat' && upgradesInfluence > 0}
		<p class="mt-1 text-xs text-on-muted">
			{charactersInfluence} characters · {upgradesInfluence} upgrades (free in threat mode)
		</p>
	{/if}
</div>
