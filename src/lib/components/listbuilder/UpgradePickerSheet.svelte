<script lang="ts">
	import Modal from '$lib/components/shared/Modal.svelte';
	import { ACTION_TYPE_ICONS, UPGRADE_SLOT_TYPE_ICONS } from '$lib/constants/icons.js';
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

	let search = $state('');

	const compatible = $derived(
		compatibleUpgrades(character, equippedUpgradeIds, collectionUpgrades, upgradesById)
	);

	const filtered = $derived.by(() => {
		const q = search.toLowerCase();
		return compatible.filter((u) => !q || u.name.toLowerCase().includes(q) || u.type.toLowerCase().includes(q));
	});

	function close() {
		search = '';
		onclose();
	}
</script>

<Modal open={open} title={`Equip upgrade — ${character.name}`} onclose={close}>
	{#snippet children()}
		<input
			type="search"
			bind:value={search}
			placeholder="Search…"
			class="mb-3 w-full rounded-lg bg-surface-overlay px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-accent"
		/>
		<div class="max-h-80 space-y-2 overflow-y-auto">
			{#if compatible.length === 0}
				<p class="py-6 text-center text-sm text-on-muted">
					No compatible upgrades in your collection. An upgrade must match an open slot
					({character.upgradeSlots.join(', ') || 'none'}) and satisfy any keyword restrictions.
				</p>
			{:else if filtered.length === 0}
				<p class="py-6 text-center text-sm text-on-muted">No results for "{search}"</p>
			{:else}
				{#each filtered as upg (upg.id)}
					{@const SlotIcon = UPGRADE_SLOT_TYPE_ICONS[upg.type]}
					{@const ActionIcon = upg.action ? ACTION_TYPE_ICONS[upg.action.type] : null}
					<button
						type="button"
						onclick={() => { search = ''; onpick(upg.id); }}
						class="flex w-full items-center justify-between rounded-lg bg-surface-overlay px-3 py-2 text-left hover:bg-white/10"
					>
						<div class="min-w-0">
							<p class="truncate font-semibold">{upg.name}</p>
							<p class="flex items-center gap-1.5 truncate text-xs capitalize text-on-muted">
								<SlotIcon class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
								{upg.type}
								{#if ActionIcon}
									<span class="text-white/30" aria-hidden="true">·</span>
									<ActionIcon class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
									{upg.action?.type.replace(/-/g, ' ')}
								{/if}
							</p>
							{#if upg.effect}
								<p class="mt-0.5 truncate text-xs text-on-muted/70">{upg.effect}</p>
							{/if}
						</div>
						<span class="ml-3 shrink-0 text-sm font-semibold text-accent">{upg.cost} inf</span>
					</button>
				{/each}
			{/if}
		</div>
	{/snippet}
</Modal>
