type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
	id: number;
	message: string;
	type: ToastType;
}

function createToastStore() {
	let items = $state<ToastItem[]>([]);
	let nextId = 0;

	function show(message: string, type: ToastType = 'info', duration = 3000) {
		const id = nextId++;
		items = [...items, { id, message, type }];
		setTimeout(() => {
			items = items.filter((t) => t.id !== id);
		}, duration);
	}

	return {
		get items() { return items; },
		show,
		success: (msg: string) => show(msg, 'success'),
		error: (msg: string) => show(msg, 'error'),
		info: (msg: string) => show(msg, 'info')
	};
}

export const toastStore = createToastStore();
