import { describe, it, expect } from 'vitest';
import {
	canUseSmoothScroll,
	createLenisConfig,
	calculateHeroScrollProgress
} from './smoothScroll';

describe('canUseSmoothScroll', () => {
	it('returns false in non-browser (SSR) environments', () => {
		expect(canUseSmoothScroll({ isBrowser: false, prefersReducedMotion: false })).toBe(false);
	});

	it('returns false when reduced motion is preferred', () => {
		expect(canUseSmoothScroll({ isBrowser: true, prefersReducedMotion: true })).toBe(false);
	});

	it('returns false if both SSR and reduced motion', () => {
		expect(canUseSmoothScroll({ isBrowser: false, prefersReducedMotion: true })).toBe(false);
	});

	it('returns true when in browser and reduced motion is not requested', () => {
		expect(canUseSmoothScroll({ isBrowser: true, prefersReducedMotion: false })).toBe(true);
	});

	it('defaults prefersReducedMotion to false when not provided', () => {
		expect(canUseSmoothScroll({ isBrowser: true })).toBe(true);
	});

	it('defaults isBrowser to false when not provided', () => {
		expect(canUseSmoothScroll({})).toBe(false);
	});
});

describe('createLenisConfig', () => {
	it('disables autoRaf by default to prevent duplicate RAF loops', () => {
		const config = createLenisConfig();
		expect(config.autoRaf).toBe(false);
	});

	it('allows custom option overrides while preserving no scroll-jacking defaults', () => {
		const config = createLenisConfig({ duration: 1.5 });
		expect(config.duration).toBe(1.5);
		expect(config.autoRaf).toBe(false);
	});
});

describe('calculateHeroScrollProgress', () => {
	it('returns 0 when at or above top of hero', () => {
		expect(calculateHeroScrollProgress(0, 0, 1000, 500)).toBe(0);
		expect(calculateHeroScrollProgress(-50, 0, 1000, 500)).toBe(0);
	});

	it('returns 0.5 when halfway through hero scroll range', () => {
		expect(calculateHeroScrollProgress(250, 0, 1000, 500)).toBe(0.5);
	});

	it('returns 1 when reaching or exceeding the bottom of the hero scroll range', () => {
		expect(calculateHeroScrollProgress(500, 0, 1000, 500)).toBe(1);
		expect(calculateHeroScrollProgress(600, 0, 1000, 500)).toBe(1);
	});

	it('accounts for heroOffsetTop when hero is not at 0', () => {
		expect(calculateHeroScrollProgress(350, 100, 1000, 500)).toBe(0.5);
	});

	it('handles zero or degenerate range without dividing by zero', () => {
		expect(calculateHeroScrollProgress(0, 0, 400, 500)).toBe(0);
	});

	it('is strictly reversible: going back down or up yields proportional values', () => {
		const p1 = calculateHeroScrollProgress(100, 0, 1000, 500);
		const p2 = calculateHeroScrollProgress(200, 0, 1000, 500);
		const pReverse = calculateHeroScrollProgress(100, 0, 1000, 500);
		expect(p2).toBeGreaterThan(p1);
		expect(pReverse).toBe(p1);
	});
});
