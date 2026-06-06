<script lang="ts">
	import { page } from '$app/stores';
	const id = $derived($page.params.id);
</script>

<div class="p-4">
	<header class="mb-4 flex items-center gap-3">
		<a href="/campaign" class="text-on-muted hover:text-on-surface">‹</a>
		<h1 class="text-xl font-bold">Campaign Tracker</h1>
	</header>

	<!-- TODO Sprint 7: CampaignTracker for id={id} -->
	<p class="text-on-muted">Campaign tracker for <code>{id}</code> coming in Sprint 7.</p>
</div>
