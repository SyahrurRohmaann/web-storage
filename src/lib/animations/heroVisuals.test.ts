import { describe, expect, it } from 'vitest';
import { heroVisuals } from './heroVisuals';

describe('hero visuals', () => {
	it('clamps progress and returns Astral title/orb state', () => {
		expect(heroVisuals(-1).titleOpacity).toBe(1);
		expect(heroVisuals(0).dropletScale).toBeGreaterThan(1);
		expect(heroVisuals(0.5).titleOpacity).toBeGreaterThan(0);
		expect(heroVisuals(0.5).titleOpacity).toBeLessThan(1);
		expect(heroVisuals(1).titleOpacity).toBe(0.85);
		expect(heroVisuals(2).titleOpacity).toBe(0.85);
	});

	it('derives title scale, pointer events, orb rise, and field intensity', () => {
		const start = heroVisuals(0);
		const mid = heroVisuals(0.5);
		const end = heroVisuals(1);

		expect(start.titleScale).toBe(1);
		expect(end.titleScale).toBeLessThan(1);
		expect(mid.titleScale).toBeLessThan(start.titleScale);
		expect(mid.titleScale).toBeGreaterThan(end.titleScale);

		expect(start.titlePointerEvents).toBe('auto');
		expect(end.titlePointerEvents).toBe('auto');

		expect(start.dropletY).toBe(0);
		expect(end.dropletY).toBeLessThan(0);
		expect(mid.dropletY).toBeLessThan(start.dropletY);
		expect(mid.dropletY).toBeGreaterThan(end.dropletY);

		expect(start.fieldIntensity).toBe(1);
		expect(end.fieldIntensity).toBeLessThan(1);
		expect(mid.fieldIntensity).toBeLessThan(start.fieldIntensity);
		expect(mid.fieldIntensity).toBeGreaterThan(end.fieldIntensity);
	});

	it('keeps the storage title readable through the hero scroll', () => {
		expect(heroVisuals(0).titleOpacity).toBe(1);
		expect(heroVisuals(1).titleOpacity).toBe(0.85);
	});

	it('keeps the hero static when reduced motion is preferred', () => {
		const start = heroVisuals(0, true);
		const end = heroVisuals(1, true);

		expect(start).toEqual(end);
		expect(start.titleOpacity).toBe(1);
		expect(start.titleY).toBe(0);
		expect(start.titleScale).toBe(1);
		expect(start.titlePointerEvents).toBe('auto');
		expect(start.dropletY).toBe(0);
		expect(start.fieldIntensity).toBe(1);
	});

	it('keeps the large water droplet reversible as the hero is scrolled', () => {
		expect(heroVisuals(0).dropletScale).toBeGreaterThan(1);
		expect(heroVisuals(1).dropletScale).toBeLessThan(heroVisuals(0).dropletScale);
		expect(heroVisuals(-1)).toEqual(heroVisuals(0));
		expect(heroVisuals(2)).toEqual(heroVisuals(1));
	});

	it('smoothly interpolates title opacity and vertical movement midway', () => {
		const mid = heroVisuals(0.5);
		expect(mid.titleOpacity).toBe(0.925);
		expect(mid.titleY).toBe(0);
		expect(mid.dropletScale).toBeLessThan(heroVisuals(0).dropletScale);
		expect(mid.dropletScale).toBeGreaterThan(heroVisuals(1).dropletScale);
	});
	it('finishes shrink before revealing the icon and uses fade-scale-blur', () => {
		expect(heroVisuals(0.8).dropletScale).toBe(heroVisuals(1).dropletScale);
		expect(heroVisuals(0.8).iconProgress).toBe(0);
		expect(heroVisuals(0.9).iconProgress).toBeCloseTo(0.5);
		expect(heroVisuals(1).iconProgress).toBe(1);
		expect(heroVisuals(1).titleScale).toBe(0.9);
		expect(heroVisuals(1).titleBlur).toBe(0);
	});
});
