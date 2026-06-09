<script lang="ts">
	import { ACTION_TYPE_ICONS, STAT_ICONS, UPGRADE_SLOT_TYPE_ICONS } from '$lib/constants/icons.js';
	import type { Character } from '$lib/models/Character.js';

	interface Props {
		character: Character;
	}

	let { character }: Props = $props();

	const AdIcon = STAT_ICONS.actionDice;
	const SpdIcon = STAT_ICONS.speed;
	const ArmIcon = STAT_ICONS.armor;
	const HpIcon = STAT_ICONS.health;

	const slotCounts = $derived.by(() => {
		const counts: Partial<Record<string, number>> = {};
		for (const slot of character.upgradeSlots) counts[slot] = (counts[slot] ?? 0) + 1;
		return counts;
	});
</script>

<div class="space-y-2 text-sm">
	<!-- Stats -->
	<div class="grid grid-cols-4 gap-1 text-center">
		{#each [
			{ Icon: AdIcon,  label: 'AD',  value: character.stats.actionDice },
			{ Icon: SpdIcon, label: 'SPD', value: character.stats.speed },
			{ Icon: ArmIcon, label: 'ARM', value: character.stats.armor },
			{ Icon: HpIcon,  label: 'HP',  value: character.stats.health }
		] as stat (stat.label)}
			<div class="flex flex-col items-center gap-0.5">
				<stat.Icon class="h-3.5 w-3.5 text-on-muted" aria-hidden="true" />
				<span class="text-xs text-on-muted">{stat.label}</span>
				<span class="font-semibold">{stat.value}</span>
			</div>
		{/each}
	</div>

	<!-- Keywords -->
	{#if character.keywords.length > 0}
		<p class="text-xs text-on-muted">
			<span class="font-medium text-on-surface">Keywords:</span>
			{character.keywords.join(', ')}
		</p>
	{/if}

	<!-- Actions -->
	{#if character.actions.length > 0}
		<div class="space-y-1">
			{#each character.actions as action (action.name)}
				{@const ActionIcon = ACTION_TYPE_ICONS[action.type]}
				<div class="flex items-start gap-1.5 rounded bg-surface px-2 py-1.5">
					<ActionIcon class="mt-0.5 h-3.5 w-3.5 shrink-0 text-on-muted" aria-hidden="true" />
					<div class="min-w-0">
						<span class="font-medium">{action.name}</span>
						{#if action.activationValue || action.diceCount || action.bonus}
							<span class="ml-1.5 text-xs text-on-muted">
								{#if action.diceCount}×{action.diceCount}{/if}
								{#if action.activationValue}{action.activationValue}{/if}
								{#if action.bonus}{action.bonus}{/if}
							</span>
						{/if}
						{#if action.effect}
							<p class="text-xs text-on-muted">{action.effect}</p>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Upgrade slots -->
	{#if character.upgradeSlots.length > 0}
		<div class="flex flex-wrap items-center gap-1.5">
			<span class="text-xs text-on-muted">Slots:</span>
			{#each Object.entries(slotCounts) as [slot, count] (slot)}
				{@const SlotIcon = UPGRADE_SLOT_TYPE_ICONS[slot as keyof typeof UPGRADE_SLOT_TYPE_ICONS]}
				{#each { length: count ?? 0 } as _, i (i)}
					<SlotIcon class="h-3.5 w-3.5 text-on-muted" aria-hidden="true" title={slot} />
				{/each}
			{/each}
		</div>
	{/if}
</div>
