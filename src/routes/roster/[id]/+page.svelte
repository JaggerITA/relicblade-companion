<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { base } from '$app/paths';
	import Modal from '$lib/components/shared/Modal.svelte';
	import Button from '$lib/components/shared/Button.svelte';
	import InfluenceBar from '$lib/components/listbuilder/InfluenceBar.svelte';
	import CharacterPickerSheet from '$lib/components/listbuilder/CharacterPickerSheet.svelte';
	import UpgradePickerSheet from '$lib/components/listbuilder/UpgradePickerSheet.svelte';
	import CharacterPreview from '$lib/components/listbuilder/CharacterPreview.svelte';
	import UpgradePreview from '$lib/components/listbuilder/UpgradePreview.svelte';
	import { UPGRADE_SLOT_TYPE_ICONS } from '$lib/constants/icons.js';
	import { rosterStore } from '$lib/stores/rosterStore.svelte.js';
	import { collectionStore } from '$lib/stores/collectionStore.svelte.js';
	import { toastStore } from '$lib/stores/toastStore.svelte.js';
	import { charactersInfluence, upgradesInfluence, usedInfluence } from '$lib/utils/validation.js';

	const id = $derived($page.params.id ?? '');
	const roster = $derived(rosterStore.getRoster(id));

	let confirmDelete = $state(false);
	let showCharacterPicker = $state(false);
	let upgradeTargetEntryId = $state<string | null>(null);
	let expandedEntryId = $state<string | null>(null);
	let expandedUpgradeKey = $state<string | null>(null);

	function toggleEntry(entryId: string) {
		expandedEntryId = expandedEntryId === entryId ? null : entryId;
		expandedUpgradeKey = null;
	}
	function toggleUpgrade(key: string) {
		expandedUpgradeKey = expandedUpgradeKey === key ? null : key;
	}

	$effect(() => {
		rosterStore.hydrate();
		collectionStore.hydrate();
	});

	const upgradeTargetEntry = $derived(
		roster && upgradeTargetEntryId
			? roster.entries.find((e) => e.entryId === upgradeTargetEntryId)
			: undefined
	);
	const upgradeTarget = $derived(
		upgradeTargetEntry ? collectionStore.getCharacter(upgradeTargetEntry.characterId) : undefined
	);
</script>

{#if roster}
	<div class="flex h-full flex-col">
		<header class="sticky top-0 z-10 flex items-center justify-between bg-surface px-4 pb-2 pt-4">
			<div class="flex items-center gap-3">
				<a href="{base}/roster" class="text-on-muted hover:text-on-surface">‹</a>
				<div class="min-w-0">
					<h1 class="truncate text-lg font-bold">{roster.name}</h1>
					<p class="truncate text-xs capitalize text-on-muted">
						{roster.limitMode} mode{#if roster.faction} · {roster.faction}{/if}
					</p>
				</div>
			</div>
			<button
				onclick={() => (confirmDelete = true)}
				class="shrink-0 text-sm text-on-muted hover:text-on-surface"
				aria-label="Delete roster"
			>
				Delete
			</button>
		</header>

		<div class="flex-1 overflow-y-auto px-4 py-2">
			{#if roster.entries.length === 0}
				<div class="flex flex-col items-center justify-center py-16 text-center text-on-muted">
					<span class="mb-4 text-5xl" aria-hidden="true">🛡</span>
					<p class="mb-1 font-semibold text-on-surface">No characters yet</p>
					<p class="mb-6 text-sm">Add characters from your collection to build this warband.</p>
					<Button variant="primary" onclick={() => (showCharacterPicker = true)}>+ Add character</Button>
				</div>
			{:else}
				<ul class="space-y-2">
					{#each roster.entries as entry (entry.entryId)}
						{@const character = collectionStore.getCharacter(entry.characterId)}
						{#if character}
							{@const charExpanded = expandedEntryId === entry.entryId}
							<li class="card overflow-hidden p-0">
								<!-- Character header row -->
								<div class="flex items-center justify-between px-3 py-2">
									<button
										type="button"
										onclick={() => toggleEntry(entry.entryId)}
										class="flex min-h-touch min-w-0 flex-1 items-center gap-2 text-left"
										aria-expanded={charExpanded}
									>
										<span class="min-w-0">
											<p class="truncate font-semibold">{character.name}</p>
											<p class="truncate text-xs text-on-muted capitalize">
												{character.path}{#if character.faction} · {character.faction}{/if}
											</p>
										</span>
										<span class="ml-auto shrink-0 text-xs text-on-muted" aria-hidden="true">
											{charExpanded ? '▴' : '▾'}
										</span>
									</button>
									<div class="ml-3 flex shrink-0 items-center gap-2">
										<span class="text-sm font-semibold text-accent">{entry.entryInfluence} inf</span>
										<button
											onclick={() => rosterStore.removeEntry(roster.id, entry.entryId)}
											class="text-on-muted hover:text-on-surface"
											aria-label="Remove {character.name} from roster"
										>✕</button>
									</div>
								</div>

								<!-- Character preview -->
								{#if charExpanded}
									<div class="border-t border-white/10 px-3 pb-3 pt-2">
										<CharacterPreview {character} />
									</div>
								{/if}

								<!-- Equipped upgrades -->
								{#if entry.equippedUpgradeIds.length > 0}
									<ul class="border-t border-white/10">
										{#each entry.equippedUpgradeIds as upgradeId (upgradeId)}
											{@const upgrade = collectionStore.getUpgrade(upgradeId)}
											{#if upgrade}
												{@const upKey = `${entry.entryId}-${upgradeId}`}
												{@const upExpanded = expandedUpgradeKey === upKey}
												{@const SlotIcon = UPGRADE_SLOT_TYPE_ICONS[upgrade.type]}
												<li class="border-b border-white/5 last:border-0">
													<div class="flex items-center justify-between px-3 py-1.5 pl-5 text-sm text-on-muted">
														<button
															type="button"
															onclick={() => toggleUpgrade(upKey)}
															class="flex min-h-touch min-w-0 flex-1 items-center gap-1.5 text-left"
															aria-expanded={upExpanded}
														>
															<span aria-hidden="true">▸</span>
															<SlotIcon class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
															<span class="truncate">{upgrade.name}</span>
															<span class="ml-1 shrink-0 text-xs" aria-hidden="true">
																{upExpanded ? '▴' : '▾'}
															</span>
														</button>
														<div class="ml-3 flex shrink-0 items-center gap-2">
															<span>{upgrade.cost} inf</span>
															<button
																onclick={() => rosterStore.unequipUpgrade(roster.id, entry.entryId, upgradeId)}
																class="hover:text-on-surface"
																aria-label="Unequip {upgrade.name}"
															>✕</button>
														</div>
													</div>
													{#if upExpanded}
														<div class="border-t border-white/5 px-5 pb-2 pt-1.5">
															<UpgradePreview {upgrade} />
														</div>
													{/if}
												</li>
											{/if}
										{/each}
									</ul>
								{/if}

								<div class="px-3 py-2">
									<button
										onclick={() => (upgradeTargetEntryId = entry.entryId)}
										class="text-sm text-accent hover:underline"
									>
										▸ + add upgrade
									</button>
								</div>
							</li>
						{/if}
					{/each}
				</ul>

				<button
					onclick={() => (showCharacterPicker = true)}
					class="mt-3 w-full rounded-lg border border-dashed border-white/20 py-3 text-sm text-on-muted hover:bg-white/5"
				>
					+ Add character
				</button>
			{/if}
		</div>

		<InfluenceBar
			used={usedInfluence(roster, collectionStore.charactersById, collectionStore.upgradesById)}
			max={roster.maxInfluence}
			mode={roster.limitMode}
			charactersInfluence={charactersInfluence(roster.entries, collectionStore.charactersById)}
			upgradesInfluence={upgradesInfluence(roster.entries, collectionStore.upgradesById)}
		/>
	</div>

	<CharacterPickerSheet
		open={showCharacterPicker}
		characters={collectionStore.characters}
		onpick={(characterId) => {
			rosterStore.addEntry(roster.id, characterId);
			showCharacterPicker = false;
		}}
		onclose={() => (showCharacterPicker = false)}
	/>

	{#if upgradeTarget && upgradeTargetEntry}
		<UpgradePickerSheet
			open={true}
			character={upgradeTarget}
			equippedUpgradeIds={upgradeTargetEntry.equippedUpgradeIds}
			collectionUpgrades={collectionStore.upgrades}
			upgradesById={collectionStore.upgradesById}
			onpick={(upgradeId) => {
				rosterStore.equipUpgrade(roster.id, upgradeTargetEntry.entryId, upgradeId);
				upgradeTargetEntryId = null;
			}}
			onclose={() => (upgradeTargetEntryId = null)}
		/>
	{/if}

	<Modal open={confirmDelete} title="Delete roster?" onclose={() => (confirmDelete = false)}>
		{#snippet children()}
			<p class="text-on-muted">This cannot be undone. "{roster.name}" will be removed.</p>
		{/snippet}
		{#snippet actions()}
			<Button variant="ghost" onclick={() => (confirmDelete = false)}>Cancel</Button>
			<Button
				variant="danger"
				onclick={async () => {
					const name = roster.name;
					await rosterStore.deleteRoster(roster.id);
					goto(`${base}/roster`);
					toastStore.info(`${name} deleted`);
				}}
			>
				Delete
			</Button>
		{/snippet}
	</Modal>
{:else if rosterStore.loaded}
	<div class="p-4">
		<header class="mb-4 flex items-center gap-3">
			<a href="{base}/roster" class="text-on-muted hover:text-on-surface">‹</a>
			<h1 class="text-xl font-bold">Roster Builder</h1>
		</header>
		<p class="text-on-muted">Roster not found.</p>
		<a href="{base}/roster" class="mt-4 inline-block text-accent">Back to rosters</a>
	</div>
{:else}
	<div class="p-4">
		<p class="text-on-muted">Loading…</p>
	</div>
{/if}
