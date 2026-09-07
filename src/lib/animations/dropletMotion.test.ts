import { describe, expect, it } from 'vitest';
import { clamp01, dropletRadii, easeInOutCubic, lerp, magneticOffset } from './dropletMotion';

describe('droplet motion math', () => {
  it('clamps scroll progress to the hero interval', () => {
    expect(clamp01(-0.2)).toBe(0);
    expect(clamp01(0.4)).toBe(0.4);
    expect(clamp01(1.4)).toBe(1);
  });

  it('interpolates reversible values without overshooting', () => {
    expect(lerp(20, 100, 0)).toBe(20);
    expect(lerp(20, 100, 0.5)).toBe(60);
    expect(lerp(20, 100, 1)).toBe(100);
  });

  it('uses a symmetric cubic ease', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(0.5)).toBe(0.5);
    expect(easeInOutCubic(1)).toBe(1);
  });

  it('progressively morphs asymmetric radii into a circle', () => {
    expect(dropletRadii(0)).toBe('62% 38% 58% 42% / 46% 52% 48% 54%');
    expect(dropletRadii(1)).toBe('50% 50% 50% 50% / 50% 50% 50% 50%');
    expect(dropletRadii(0.5)).not.toBe(dropletRadii(0));
    expect(dropletRadii(0.5)).not.toBe(dropletRadii(1));
  });

  it('limits magnetic attraction and returns zero outside radius', () => {
    expect(magneticOffset(100, 0, 200, 0, 80)).toEqual({ x: 0, y: 0 });
    const near = magneticOffset(100, 100, 140, 120, 80);
    expect(Math.hypot(near.x, near.y)).toBeLessThanOrEqual(24.01);
    expect(near.x).toBeGreaterThan(0);
  });
});
