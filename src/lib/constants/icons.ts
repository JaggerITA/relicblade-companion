import Sword from '@lucide/svelte/icons/sword';
import BowArrow from '@lucide/svelte/icons/bow-arrow';
import Swords from '@lucide/svelte/icons/swords';
import PawPrint from '@lucide/svelte/icons/paw-print';
import Shield from '@lucide/svelte/icons/shield';
import Wand from '@lucide/svelte/icons/wand';
import Sparkles from '@lucide/svelte/icons/sparkles';
import Scroll from '@lucide/svelte/icons/scroll';
import FlaskConical from '@lucide/svelte/icons/flask-conical';
import Backpack from '@lucide/svelte/icons/backpack';
import HandFist from '@lucide/svelte/icons/hand-fist';
import Dices from '@lucide/svelte/icons/dices';
import Wind from '@lucide/svelte/icons/wind';
import ShieldHalf from '@lucide/svelte/icons/shield-half';
import Heart from '@lucide/svelte/icons/heart';
import Fuel from '@lucide/svelte/icons/fuel';
import type { LucideIcon } from '@lucide/svelte';
import type { ActionType, UpgradeSlotType } from '$lib/models/Character.js';

/**
 * Generic outline icons standing in for each action-bar symbol category
 * (Card Anatomy: melee/ranged/natural weapon, passive/special ability, spell).
 * These are stock icons from the Lucide set (ISC license), not artwork from
 * the game — they only help players match a category to the symbol printed
 * on their physical cards.
 */
export const ACTION_TYPE_ICONS: Record<ActionType, LucideIcon> = {
	'melee-weapon': Sword,
	'ranged-weapon': BowArrow,
	'ranged-or-melee-weapon': Swords,
	'natural-weapon': PawPrint,
	'passive-ability': Shield,
	'magic-spell': Wand,
	'special-ability': Sparkles
};

/**
 * Generic outline icons standing in for each upgrade slot icon category
 * (Card Anatomy: sword = weapon, scroll = tactic, flask = potion, star = spell,
 * bag = item). Stock Lucide icons (ISC license), not artwork from the game.
 *
 * Tactic and Spell deliberately don't use the literal scroll/star pairing —
 * a closed fist reads better for combat tactics, and the scroll for arcane
 * preparation, so they're swapped relative to the printed card icons.
 */
export const UPGRADE_SLOT_TYPE_ICONS: Record<UpgradeSlotType, LucideIcon> = {
	weapon: Sword,
	tactic: HandFist,
	potion: FlaskConical,
	spell: Scroll,
	item: Backpack
};

/**
 * Generic outline icons for the four core stats (Card Anatomy: Action Dice,
 * Speed, Armor, Health). Distinct glyphs from the action/upgrade icon sets
 * above so the same shape never means two different things on one screen.
 */
export const STAT_ICONS = {
	actionDice: Dices,
	speed: Wind,
	armor: ShieldHalf,
	health: Heart
} satisfies Record<'actionDice' | 'speed' | 'armor' | 'health', LucideIcon>;

/**
 * Fuel-cell variant of the health icon — Constructs track fuel cells instead
 * of health boxes (Game Rules #type/construct). Distinct from `Heart` so the
 * Game Manager never shows the same glyph for two different trackers.
 */
export const FUEL_ICON: LucideIcon = Fuel;
