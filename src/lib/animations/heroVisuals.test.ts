import { describe, expect, it } from 'vitest';
import { heroVisuals } from './heroVisuals';

describe('hero visuals', () => {
	it('hides the storage title by the end of the hero scroll', () => {
		expect(heroVisuals(0).titleOpacity).toBe(1);
		expect(heroVisuals(1).titleOpacity).toBe(0);
		expect(heroVisuals(1).titleY).toBeLessThan(0);
	});

	it('keeps the large water droplet reversible as the hero is scrolled', () => {
		expect(heroVisuals(0).dropletScale).toBeGreaterThan(1);
		expect(heroVisuals(1).dropletScale).toBeLessThan(heroVisuals(0).dropletScale);
		expect(heroVisuals(-1)).toEqual(heroVisuals(0));
		expect(heroVisuals(2)).toEqual(heroVisuals(1));
	});

	it('smoothly interpolates title opacity and vertical movement midway', () => {
		const mid = heroVisuals(0.5);
		expect(mid.titleOpacity).toBe(0.5);
		expect(mid.titleY).toBe(-45);
		expect(mid.dropletScale).toBeLessThan(heroVisuals(0).dropletScale);
		expect(mid.dropletScale).toBeGreaterThan(heroVisuals(1).dropletScale);
	});
});
