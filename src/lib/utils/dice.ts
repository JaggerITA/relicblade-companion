/** Returns a random integer in [1, sides]. Seedable via override for tests. */
export function roll(sides: number, rng: () => number = Math.random): number {
	return Math.floor(rng() * sides) + 1;
}

export function rollD6(rng?: () => number): number {
	return roll(6, rng);
}

/** D3 = D6 / 2, round up */
export function rollD3(rng?: () => number): number {
	return Math.ceil(rollD6(rng) / 2);
}

export interface InitiativeResult {
	p1: number;
	p2: number;
	/** null while tied — call again after reroll */
	winner: 1 | 2 | null;
}

/** Roll initiative for both players. winner is null on a tie. */
export function rollInitiative(rng?: () => number): InitiativeResult {
	const p1 = rollD6(rng);
	const p2 = rollD6(rng);
	return { p1, p2, winner: p1 > p2 ? 1 : p2 > p1 ? 2 : null };
}

/** Recovery roll: 6 = heal 1 HP. Returns true if healed. */
export function rollRecovery(rng?: () => number): boolean {
	return rollD6(rng) === 6;
}
