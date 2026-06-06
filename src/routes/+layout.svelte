<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { base } from '$app/paths';

	const navItems = [
		{ path: '/', label: 'Home', icon: '🏠' },
		{ path: '/collection', label: 'Cards', icon: '🗂' },
		{ path: '/roster', label: 'Rosters', icon: '📋' },
		{ path: '/game', label: 'Games', icon: '🎲' },
		{ path: '/campaign', label: 'Camp.', icon: '🏕' }
	] as const;

	function isActive(path: string): boolean {
		const p = $page.url.pathname.replace(base, '') || '/';
		if (path === '/') return p === '/';
		return p.startsWith(path);
	}
</script>

<div class="flex min-h-screen flex-col">
	<main class="flex-1 overflow-y-auto pb-16">
		<slot />
	</main>

	<!-- Bottom navigation bar -->
	<nav
		class="fixed bottom-0 left-0 right-0 z-50 flex h-14 items-stretch border-t border-white/10 bg-surface-raised"
		style="padding-bottom: env(safe-area-inset-bottom)"
	>
		{#each navItems as item}
			<a
				href="{base}{item.path}"
				class="flex flex-1 flex-col items-center justify-center gap-0.5 text-xs transition-colors
					{isActive(item.path)
					? 'text-accent'
					: 'text-on-muted hover:text-on-surface'}"
				aria-current={isActive(item.path) ? 'page' : undefined}
			>
				<span class="text-lg leading-none" aria-hidden="true">{item.icon}</span>
				<span>{item.label}</span>
			</a>
		{/each}
	</nav>
</div>
