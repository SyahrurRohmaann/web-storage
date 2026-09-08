import type { LenisOptions } from 'lenis';
import { clamp01 } from './dropletMotion';

export interface SmoothScrollConditions {
	isBrowser?: boolean;
	prefersReducedMotion?: boolean;
}

export const DEFAULT_LENIS_OPTIONS: LenisOptions = {
	autoRaf: false,
	smoothWheel: true,
	syncTouch: false
};

/**
 * Pure predicate to determine whether smooth scrolling can/should be active.
 * Guarantees that smooth scrolling is never active during SSR or when the
 * user has requested reduced motion.
 */
export function canUseSmoothScroll(conditions: SmoothScrollConditions = {}): boolean {
	const isBrowser = Boolean(conditions.isBrowser);
	const prefersReduced = Boolean(conditions.prefersReducedMotion);
	return isBrowser && !prefersReduced;
}

/**
 * Builds Lenis configuration ensuring no scroll-jacking and preventing
 * duplicate RAF loops by defaulting autoRaf to false.
 */
export function createLenisConfig(overrides: Partial<LenisOptions> = {}): LenisOptions {
	return {
		...DEFAULT_LENIS_OPTIONS,
		...overrides,
		autoRaf: overrides.autoRaf ?? false
	};
}

/**
 * Calculates reversible, responsive hero scroll progress in [0, 1].
 */
export function calculateHeroScrollProgress(
	scrollY: number,
	heroOffsetTop: number,
	heroHeight: number,
	viewportHeight: number
): number {
	const max = Math.max(1, heroHeight - viewportHeight);
	return clamp01((scrollY - heroOffsetTop) / max);
}
