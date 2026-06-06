<script lang="ts">
	import { base } from '$app/paths';
</script>

<div class="p-4">
	<header class="mb-4 flex items-center justify-between">
		<h1 class="text-xl font-bold">Games</h1>
		<a href="{base}/settings" class="text-on-muted hover:text-on-surface" aria-label="Settings">⚙</a>
	</header>

	<!-- TODO Sprint 6: active/paused game list -->
	<div class="flex flex-col items-center justify-center py-16 text-center text-on-muted">
		<span class="mb-4 text-5xl" aria-hidden="true">🎲</span>
		<p class="mb-1 font-semibold text-on-surface">No active games</p>
		<p class="mb-6 text-sm">Start a game from two saved rosters.</p>
		<a href="{base}/game/new" class="btn-primary w-48">+ New Game</a>
	</div>
</div>
