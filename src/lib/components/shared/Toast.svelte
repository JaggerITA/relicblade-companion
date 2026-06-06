<script lang="ts">
	type ToastType = 'success' | 'error' | 'info';

	interface Toast {
		id: number;
		message: string;
		type: ToastType;
	}

	let toasts = $state<Toast[]>([]);
	let nextId = 0;

	export function show(message: string, type: ToastType = 'info', duration = 3000) {
		const id = nextId++;
		toasts = [...toasts, { id, message, type }];
		setTimeout(() => {
			toasts = toasts.filter((t) => t.id !== id);
		}, duration);
	}

	const colorMap: Record<ToastType, string> = {
		success: 'bg-green-700 text-white',
		error: 'bg-red-700 text-white',
		info: 'bg-surface-overlay text-on-surface'
	};
</script>

<div class="pointer-events-none fixed bottom-20 left-0 right-0 z-50 flex flex-col items-center gap-2 px-4">
	{#each toasts as toast (toast.id)}
		<div
			class="pointer-events-auto w-full max-w-sm rounded-lg px-4 py-3 text-sm shadow-lg {colorMap[toast.type]}"
			role="alert"
		>
			{toast.message}
		</div>
	{/each}
</div>
