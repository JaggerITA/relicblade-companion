<script lang="ts">
	import Modal from '$lib/components/shared/Modal.svelte';
	import Button from '$lib/components/shared/Button.svelte';
	import type { InitiativeResult } from '$lib/utils/dice.js';

	interface Props {
		open: boolean;
		/** Calls `gameStore.rollInitiative` — the store decides the winner and (if any) advances the phase. */
		onroll: () => Promise<InitiativeResult>;
		/** Respite: the winner gives initiative away for a bonus recovery roll (the bonus roll is just one more `rollRecovery` call from the recovery dialog). */
		ongiveinitiative: () => void;
		onclose: () => void;
	}

	let { open, onroll, ongiveinitiative, onclose }: Props = $props();

	let result = $state<InitiativeResult | null>(null);
	let rolling = $state(false);

	async function roll(): Promise<void> {
		rolling = true;
		try {
			result = await onroll();
		} finally {
			rolling = false;
		}
	}

	function finish(): void {
		result = null;
		onclose();
	}
</script>

<Modal open={open} title="Roll Initiative" onclose={finish}>
	{#snippet children()}
		<div class="space-y-4 text-center">
			{#if result}
				<div class="flex items-center justify-center gap-6 text-2xl font-bold">
					<span>P1 🎲 {result.p1}</span>
					<span class="text-sm font-normal text-on-muted">vs</span>
					<span>P2 🎲 {result.p2}</span>
				</div>
				{#if result.winner}
					<p class="font-semibold text-accent">Player {result.winner} wins initiative ⚔</p>
				{:else}
					<p class="text-on-muted">Tie — roll again</p>
				{/if}
			{:else}
				<p class="text-sm text-on-muted">
					Both players roll a D6. Highest wins initiative and activates first; ties are rerolled.
				</p>
			{/if}
		</div>
	{/snippet}
	{#snippet actions()}
		{#if result?.winner}
			<Button
				variant="ghost"
				onclick={() => {
					ongiveinitiative();
					finish();
				}}
			>
				Give initiative (Respite)
			</Button>
			<Button variant="primary" onclick={finish}>Continue</Button>
		{:else}
			<Button variant="primary" onclick={roll} disabled={rolling}>
				{result ? 'Reroll' : 'Roll Initiative 🎲'}
			</Button>
		{/if}
	{/snippet}
</Modal>
