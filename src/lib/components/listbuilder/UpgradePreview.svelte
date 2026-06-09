<script lang="ts">
	import { ACTION_TYPE_ICONS } from '$lib/constants/icons.js';
	import type { Upgrade } from '$lib/models/Upgrade.js';

	interface Props {
		upgrade: Upgrade;
	}

	let { upgrade }: Props = $props();
</script>

<div class="space-y-2 text-sm">
	<!-- Effect -->
	{#if upgrade.effect}
		<p class="text-on-muted">{upgrade.effect}</p>
	{/if}

	<!-- Restrictions -->
	{#if upgrade.restrictions.length > 0}
		<p class="text-xs text-on-muted">
			<span class="font-medium text-on-surface">Requires:</span>
			{upgrade.restrictions.join(', ')}
		</p>
	{/if}

	<!-- Granted action -->
	{#if upgrade.action}
		{@const ActionIcon = ACTION_TYPE_ICONS[upgrade.action.type]}
		<div class="flex items-start gap-1.5 rounded bg-surface px-2 py-1.5">
			<ActionIcon class="mt-0.5 h-3.5 w-3.5 shrink-0 text-on-muted" aria-hidden="true" />
			<div class="min-w-0">
				<span class="font-medium">{upgrade.action.name}</span>
				{#if upgrade.action.activationValue || upgrade.action.diceCount || upgrade.action.bonus}
					<span class="ml-1.5 text-xs text-on-muted">
						{#if upgrade.action.diceCount}×{upgrade.action.diceCount}{/if}
						{#if upgrade.action.activationValue}{upgrade.action.activationValue}{/if}
						{#if upgrade.action.bonus}{upgrade.action.bonus}{/if}
					</span>
				{/if}
				{#if upgrade.action.effect}
					<p class="text-xs text-on-muted">{upgrade.action.effect}</p>
				{/if}
			</div>
		</div>
	{/if}
</div>
