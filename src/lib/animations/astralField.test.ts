import { describe, expect, it } from 'vitest';
import {
	ASTRAL_OBJECT_SPECS,
	computeAstralField
} from './astralField';

describe('astral field layout', () => {
	it('contains bounded deterministic specs', () => {
		expect(ASTRAL_OBJECT_SPECS.length).toBeGreaterThanOrEqual(16);
		expect(ASTRAL_OBJECT_SPECS.length).toBeLessThanOrEqual(40);

		const mobileCount = ASTRAL_OBJECT_SPECS.filter((item) => item.mobile).length;
		expect(mobileCount).toBeGreaterThanOrEqual(8);
		expect(mobileCount).toBeLessThanOrEqual(24);

		for (const item of ASTRAL_OBJECT_SPECS) {
			expect(item.x).toBeGreaterThanOrEqual(2);
			expect(item.x).toBeLessThanOrEqual(98);
			expect(item.y).toBeGreaterThanOrEqual(2);
			expect(item.y).toBeLessThanOrEqual(98);
			expect(item.size).toBeGreaterThanOrEqual(4);
			expect(item.size).toBeLessThanOrEqual(48);
		}
	});

	it('filters objects when mobile is requested', () => {
		const desktop = computeAstralField(0, { isMobile: false });
		const mobile = computeAstralField(0, { isMobile: true });

		expect(desktop.length).toBe(ASTRAL_OBJECT_SPECS.length);
		expect(mobile.length).toBeLessThan(desktop.length);
		expect(mobile.length).toBeLessThanOrEqual(24);
		expect(mobile.every((item) => item.mobile)).toBe(true);
	});

	it('keeps per-object opacity stable so the rendered field applies intensity exactly once', () => {
		for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
			for (const [index, item] of computeAstralField(progress).entries()) {
				expect(item.opacity).toBe(ASTRAL_OBJECT_SPECS[index].baseOpacity);
			}
		}
	});

	it('clamps, reverses and keeps every transformed anchor inside representative hero bounds', () => {
		const specsBefore = structuredClone(ASTRAL_OBJECT_SPECS);
		for (const isMobile of [true, false]) {
			const options = { isMobile };
			expect(computeAstralField(-1, options)).toEqual(computeAstralField(0, options));
			expect(computeAstralField(2, options)).toEqual(computeAstralField(1, options));
			const forward = [0, 0.25, 0.5, 0.75, 1].map((p) => computeAstralField(p, options));
			for (const progress of [1, 0.75, 0.5, 0.25, 0]) {
				const objects = computeAstralField(progress, options);
				expect(objects).toEqual(forward[progress * 4]);
				expect(new Set(objects.map((item) => item.id)).size).toBe(objects.length);
				for (const item of objects) {
					const match = item.transform.match(/^translate3d\(0, (-?[\d.]+)px, 0\) rotate\((-?[\d.]+)deg\)$/);
					expect(match).not.toBeNull();
					for (const height of [1050, 1700, 2052]) {
						const y = item.y / 100 * height + Number(match![1]);
						expect(y).toBeGreaterThanOrEqual(0);
						expect(y + item.size).toBeLessThanOrEqual(height);
					}
					expect(item.opacity).toBeGreaterThanOrEqual(0);
					expect(item.opacity).toBeLessThanOrEqual(1);
				}
			}
		}
		expect(ASTRAL_OBJECT_SPECS).toEqual(specsBefore);
	});

	it('uses static transform and opacity when reduced motion is preferred', () => {
		const reduced0 = computeAstralField(0, { prefersReducedMotion: true });
		const reduced1 = computeAstralField(1, { prefersReducedMotion: true });

		expect(reduced0).toEqual(reduced1);
		expect(computeAstralField(0.5, { prefersReducedMotion: true })).toEqual(reduced0);
	});
});
