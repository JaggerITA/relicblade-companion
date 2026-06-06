<script lang="ts">
	import { base } from '$app/paths';
</script>

<div class="p-4">
	<header class="mb-4 flex items-center justify-between">
		<h1 class="text-xl font-bold">Campaigns</h1>
		<a href="{base}/settings" class="text-on-muted hover:text-on-surface" aria-label="Settings">⚙</a>
	</header>

	<!-- TODO Sprint 7: campaign list -->
	<div class="flex flex-col items-center justify-center py-16 text-center text-on-muted">
		<span class="mb-4 text-5xl" aria-hidden="true">🏕</span>
		<p class="mb-1 font-semibold text-on-surface">No campaigns yet</p>
		<p class="mb-6 text-sm">Track your warband through Wonders &amp; Horrors.</p>
		<a href="{base}/campaign/new" class="btn-primary w-48">+ New Campaign</a>
	</div>
</div>
