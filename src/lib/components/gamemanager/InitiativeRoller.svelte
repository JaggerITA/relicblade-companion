<script lang="ts">
	import Modal from '$lib/components/shared/Modal.svelte';
	import Button from '$lib/components/shared/Button.svelte';
	import type { InitiativeResult } from '$lib/utils/dice.js';

	interface Props {
		open: boolean;
		onroll: () => Promise<InitiativeResult>;
		onsetinitiative: (winner: 1 | 2) => void;
		ongiveinitiative: () => void;
		onclose: () => void;
	}

	let { open, onroll, onsetinitiative, ongiveinitiative, onclose }: Props = $props();

	let winner = $state<1 | 2 | null>(null);
	let dice = $state<{ p1: number; p2: number } | null>(null);
	let rolling = $state(false);

	async function roll(): Promise<void> {
		rolling = true;
		try {
			const result = await onroll();
			dice = { p1: result.p1, p2: result.p2 };
			winner = result.winner ?? null;
		} finally {
			rolling = false;
		}
	}

	function setManual(w: 1 | 2): void {
		winner = w;
		dice = null;
		onsetinitiative(w);
	}

	function finish(): void {
		winner = null;
		dice = null;
		onclose();
	}
</script>

<Modal open={open} title="Initiative" onclose={finish}>
	{#snippet children()}
		<div class="space-y-4">
			{#if winner}
				{#if dice}
					<div class="flex items-center justify-center gap-6 text-2xl font-bold">
						<span>P1 🎲 {dice.p1}</span>
						<span class="text-sm font-normal text-on-muted">vs</span>
						<span>P2 🎲 {dice.p2}</span>
					</div>
				{/if}
				<p class="text-center font-semibold text-accent">Player {winner} wins initiative ⚔</p>
			{:else if dice}
				<div class="flex items-center justify-center gap-6 text-2xl font-bold">
					<span>P1 🎲 {dice.p1}</span>
					<span class="text-sm font-normal text-on-muted">vs</span>
					<span>P2 🎲 {dice.p2}</span>
				</div>
				<p class="text-center text-on-muted">Tie — roll again</p>
			{:else}
				<p class="text-center text-sm text-on-muted">
					Both players roll a D6. Highest wins initiative and activates first; ties are rerolled.
				</p>
				<div class="flex gap-2">
					<button
						type="button"
						onclick={() => setManual(1)}
						class="btn-ghost flex-1 text-sm"
					>
						P1 wins
					</button>
					<button
						type="button"
						onclick={() => setManual(2)}
						class="btn-ghost flex-1 text-sm"
					>
						P2 wins
					</button>
				</div>
			{/if}
		</div>
	{/snippet}
	{#snippet actions()}
		{#if winner}
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
				{dice ? 'Reroll 🎲' : 'Roll Initiative 🎲'}
			</Button>
		{/if}
	{/snippet}
</Modal>
