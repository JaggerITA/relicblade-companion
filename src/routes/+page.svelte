<script lang="ts">
	import { base } from '$app/paths';
</script>

<div class="p-4">
	<header class="mb-6 flex items-center justify-between">
		<h1 class="text-2xl font-bold text-on-surface">Relicblade</h1>
		<a href="{base}/settings" class="text-on-muted hover:text-on-surface" aria-label="Settings">⚙</a>
	</header>

	<section class="space-y-3">
		<a href="{base}/collection" class="card flex items-center justify-between hover:bg-surface-overlay">
			<div>
				<p class="font-semibold">Collection</p>
				<p class="text-sm text-on-muted">Your cards</p>
			</div>
			<span class="text-on-muted">›</span>
		</a>
		<a href="{base}/roster" class="card flex items-center justify-between hover:bg-surface-overlay">
			<div>
				<p class="font-semibold">Rosters</p>
				<p class="text-sm text-on-muted">Build warbands</p>
			</div>
			<span class="text-on-muted">›</span>
		</a>
		<a href="{base}/game" class="card flex items-center justify-between hover:bg-surface-overlay">
			<div>
				<p class="font-semibold">Games</p>
				<p class="text-sm text-on-muted">Track a game</p>
			</div>
			<span class="text-on-muted">›</span>
		</a>
		<a href="{base}/campaign" class="card flex items-center justify-between hover:bg-surface-overlay">
			<div>
				<p class="font-semibold">Campaigns</p>
				<p class="text-sm text-on-muted">Wonders &amp; Horrors</p>
			</div>
			<span class="text-on-muted">›</span>
		</a>
	</section>
</div>
