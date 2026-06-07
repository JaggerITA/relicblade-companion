<script lang="ts">
	import Modal from '$lib/components/shared/Modal.svelte';
	import { compatibleUpgrades } from '$lib/utils/validation.js';
	import type { Character } from '$lib/models/Character.js';
	import type { Upgrade } from '$lib/models/Upgrade.js';

	interface Props {
		open: boolean;
		character: Character;
		equippedUpgradeIds: string[];
		collectionUpgrades: Upgrade[];
		upgradesById: Map<string, Upgrade>;
		onpick: (upgradeId: string) => void;
		onclose: () => void;
	}

	let { open, character, equippedUpgradeIds, collectionUpgrades, upgradesById, onpick, onclose }: Props = $props();

	const compatible = $derived(
		compatibleUpgrades(character, equippedUpgradeIds, collectionUpgrades, upgradesById)
	);
</script>

<Modal open={open} title={`Equip upgrade — ${character.name}`} onclose={onclose}>
	{#snippet children()}
		<div class="max-h-80 space-y-2 overflow-y-auto">
			{#if compatible.length === 0}
				<p class="py-6 text-center text-sm text-on-muted">
					No compatible upgrades in your collection. An upgrade must match an open slot
					({character.upgradeSlots.join(', ') || 'none'}) and satisfy any keyword restrictions.
				</p>
			{:else}
				{#each compatible as upg (upg.id)}
					<button
						type="button"
						onclick={() => onpick(upg.id)}
						class="flex w-full items-center justify-between rounded-lg bg-surface-overlay px-3 py-2 text-left hover:bg-white/10"
					>
						<div class="min-w-0">
							<p class="truncate font-semibold">{upg.name}</p>
							<p class="truncate text-xs capitalize text-on-muted">{upg.type}</p>
						</div>
						<span class="ml-3 shrink-0 text-sm font-semibold text-accent">{upg.cost} inf</span>
					</button>
				{/each}
			{/if}
		</div>
	{/snippet}
</Modal>
