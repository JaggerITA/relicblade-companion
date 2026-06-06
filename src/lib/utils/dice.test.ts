import { describe, expect, it } from 'vitest';
import { roll, rollD3, rollD6, rollInitiative, rollRecovery } from './dice.js';

function seeded(values: number[]): () => number {
	let i = 0;
	return () => values[i++ % values.length];
}

describe('roll', () => {
	it('stays within [1, sides]', () => {
		for (let i = 0; i < 100; i++) {
			const r = rollD6();
			expect(r).toBeGreaterThanOrEqual(1);
			expect(r).toBeLessThanOrEqual(6);
		}
	});

	it('uses the provided rng', () => {
		// rng returns 0 → floor(0 * 6) + 1 = 1
		expect(rollD6(seeded([0]))).toBe(1);
		// rng returns 0.999 → floor(5.994) + 1 = 6
		expect(rollD6(seeded([0.999]))).toBe(6);
	});
});

describe('rollD3', () => {
	it('returns values in [1, 3]', () => {
		const results = Array.from({ length: 60 }, (_, i) => rollD3(seeded([i / 60])));
		results.forEach((r) => {
			expect(r).toBeGreaterThanOrEqual(1);
			expect(r).toBeLessThanOrEqual(3);
		});
	});

	it('maps D6 1-2 → 1, 3-4 → 2, 5-6 → 3', () => {
		// D6=1 → ceil(1/2)=1; D6=2 → ceil(2/2)=1
		expect(rollD3(seeded([0]))).toBe(1); // D6=1
		// D6=3 → ceil(3/2)=2
		expect(rollD3(seeded([2 / 6]))).toBe(2); // D6=3
		// D6=5 → ceil(5/2)=3
		expect(rollD3(seeded([4 / 6]))).toBe(3); // D6=5
	});
});

describe('rollInitiative', () => {
	it('returns correct winner when p1 > p2', () => {
		// first call → p1=6, second call → p2=1
		const result = rollInitiative(seeded([0.999, 0]));
		expect(result.winner).toBe(1);
		expect(result.p1).toBe(6);
		expect(result.p2).toBe(1);
	});

	it('returns correct winner when p2 > p1', () => {
		const result = rollInitiative(seeded([0, 0.999]));
		expect(result.winner).toBe(2);
	});

	it('returns null on tie', () => {
		const result = rollInitiative(seeded([0, 0])); // both roll 1
		expect(result.winner).toBeNull();
	});
});

describe('rollRecovery', () => {
	it('returns true only on 6', () => {
		expect(rollRecovery(seeded([0.999]))).toBe(true); // D6=6
		expect(rollRecovery(seeded([0]))).toBe(false); // D6=1
		expect(rollRecovery(seeded([4 / 6]))).toBe(false); // D6=5
	});
});

describe('roll generic', () => {
	it('works for arbitrary sides', () => {
		expect(roll(20, seeded([0]))).toBe(1);
		expect(roll(20, seeded([0.999]))).toBe(20);
	});
});
