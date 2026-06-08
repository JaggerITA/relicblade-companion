<script lang="ts">
	import Button from '$lib/components/shared/Button.svelte';
	import { FUEL_ICON, STAT_ICONS } from '$lib/constants/icons.js';

	interface Props {
		currentHealth: number;
		maxHealth: number;
		/** Constructs track fuel cells instead of health — same tracker, opposite fill direction (Game Rules #type/construct). */
		isConstruct?: boolean;
		/**
		 * 1-based positions of health boxes with a broken-bone icon on the physical card (Game Rules: Critically Wounded).
		 * These boxes are rendered in amber so the player can quickly see which boxes trigger a −1 AD penalty.
		 */
		criticalBoxes?: number[];
		/** Emits the signed change in `currentHealth` — the parent forwards positive deltas to `heal` and negative ones to `applyDamage`, keeping the store's primitives delta-only. */
		onadjust: (delta: number) => void;
	}

	let { currentHealth, maxHealth, isConstruct = false, criticalBoxes = [], onadjust }: Props = $props();

	const Icon = $derived(isConstruct ? FUEL_ICON : STAT_ICONS.health);
	const label = $derived(isConstruct ? 'Fuel' : 'HP');

	/**
	 * Fuel cells fill left-to-right as they're empowered (more = better).
	 * Health boxes mark left-to-right as damage accrues, so the rightmost box —
	 * the one bearing the skull — only fills once the model is fully disabled.
	 */
	function isFilled(box: number): boolean {
		return isConstruct ? box <= currentHealth : box <= maxHealth - currentHealth;
	}

	function isCritBox(box: number): boolean {
		return !isConstruct && criticalBoxes.includes(box);
	}

	/** Tapping box N sets the count of filled boxes to N — covers both "mark damage up to here" and "fill fuel up to here". */
	function tap(box: number): void {
		const target = isConstruct ? box : maxHealth - box;
		const delta = target - currentHealth;
		if (delta !== 0) onadjust(delta);
	}

	function boxClass(box: number): string {
		const filled = isFilled(box);
		const crit = isCritBox(box);
		if (filled && crit) return 'border-amber-500 bg-amber-500/80 text-white';
		if (filled) return 'border-accent bg-accent/80 text-white';
		if (crit) return 'border-amber-400/70 text-amber-400/70 hover:bg-amber-400/10';
		return 'border-white/20 text-on-muted hover:bg-white/5';
	}
</script>

<div class="flex flex-wrap items-center gap-2">
	<span class="flex items-center gap-1 text-xs text-on-muted">
		<Icon class="h-4 w-4" aria-hidden="true" />
		{label}
	</span>

	<div class="flex gap-1" role="group" aria-label="{label} track, {currentHealth} of {maxHealth}">
		{#each Array.from({ length: maxHealth }, (__, k) => k + 1) as box}
			{@const filled = isFilled(box)}
			{@const isSkullBox = !isConstruct && box === maxHealth}
			{@const crit = isCritBox(box)}
			<button
				type="button"
				onclick={() => tap(box)}
				class="flex h-7 w-7 shrink-0 items-center justify-center rounded border text-xs transition-colors {boxClass(box)}"
				aria-label="Set {label} to box {box} of {maxHealth}{isSkullBox ? ' — disables the model' : ''}{crit ? ' — critical wound box' : ''}"
			>
				{#if isSkullBox && filled}
					<span aria-hidden="true">💀</span>
				{:else if crit}
					<span aria-hidden="true" class="opacity-70">🦴</span>
				{/if}
			</button>
		{/each}
	</div>

	<div class="flex gap-1">
		<Button variant="ghost" onclick={() => onadjust(-1)}>−</Button>
		<Button variant="ghost" onclick={() => onadjust(1)}>+</Button>
	</div>
</div>
