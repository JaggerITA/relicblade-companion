<script lang="ts">
	import Modal from '$lib/components/shared/Modal.svelte';
	import IconLegend from '$lib/components/shared/IconLegend.svelte';
	import UpgradePreview from './UpgradePreview.svelte';
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
	let expandedId = $state<string | null>(null);

	const compatible = $derived(
		compatibleUpgrades(character, equippedUpgradeIds, collectionUpgrades, upgradesById)
	);

	const filtered = $derived.by(() => {
		const q = search.toLowerCase();
		return compatible.filter((u) => !q || u.name.toLowerCase().includes(q) || u.type.toLowerCase().includes(q));
	});

	function toggle(id: string): void {
		expandedId = expandedId === id ? null : id;
	}

	function pick(upgradeId: string): void {
		search = '';
		expandedId = null;
		onpick(upgradeId);
	}

	function close(): void {
		search = '';
		expandedId = null;
		onclose();
	}
</script>

<Modal open={open} title={`Equip upgrade — ${character.name}`} onclose={close}>
	{#snippet children()}
		<div class="mb-3 space-y-2">
			<input
				type="search"
				bind:value={search}
				placeholder="Search…"
				class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-accent"
			/>
			<IconLegend icons={UPGRADE_SLOT_TYPE_ICONS} title="Slot type icons" />
		</div>
		<div class="max-h-[70vh] space-y-1.5 overflow-y-auto">
			{#if compatible.length === 0}
				<p class="py-6 text-center text-sm text-on-muted">
					No compatible upgrades in your collection. An upgrade must match an open slot
					({character.upgradeSlots.join(', ') || 'none'}) and satisfy any keyword restrictions.
				</p>
			{:else if filtered.length === 0}
				<p class="py-6 text-center text-sm text-on-muted">No results for "{search}"</p>
			{:else}
				{#each filtered as upg (upg.id)}
					{@const expanded = expandedId === upg.id}
					{@const SlotIcon = UPGRADE_SLOT_TYPE_ICONS[upg.type]}
					{@const ActionIcon = upg.action ? ACTION_TYPE_ICONS[upg.action.type] : null}
					<div class="overflow-hidden rounded-lg bg-surface-overlay">
						<!-- Row header — tap to expand preview -->
						<button
							type="button"
							onclick={() => toggle(upg.id)}
							class="flex min-h-touch w-full items-center justify-between px-3 py-2 text-left hover:bg-white/10"
							aria-expanded={expanded}
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
							</div>
							<div class="ml-3 flex shrink-0 items-center gap-2">
								<span class="text-sm font-semibold text-accent">{upg.cost} inf</span>
								<span class="text-xs text-on-muted" aria-hidden="true">{expanded ? '▴' : '▾'}</span>
							</div>
						</button>

						<!-- Inline preview -->
						{#if expanded}
							<div class="border-t border-white/10 px-3 pb-3 pt-2">
								<UpgradePreview upgrade={upg} />
								<button
									type="button"
									onclick={() => pick(upg.id)}
									class="btn-primary mt-3 w-full text-sm"
								>
									Equip
								</button>
							</div>
						{/if}
					</div>
				{/each}
			{/if}
		</div>
	{/snippet}
</Modal>
