import { clamp01, lerp } from './dropletMotion';

export interface HeroVisualState {
	titleOpacity: number;
	titleY: number;
	titleScale: number;
	titleBlur: number;
	iconProgress: number;
	titlePointerEvents: 'auto' | 'none';
	dropletScale: number;
	dropletY: number;
	fieldIntensity: number;
}

export function heroVisuals(progress: number, prefersReducedMotion = false): HeroVisualState {
	const clamped = clamp01(progress);
	const visualProgress = prefersReducedMotion ? 0 : clamped;
	const titleOpacity = prefersReducedMotion
		? 1
		: visualProgress < 0.8
			? Math.round((1 - visualProgress * 0.15) * 1000) / 1000
			: Math.round(clamp01(1 - (visualProgress - 0.8) / 0.2) * 1000) / 1000;
	return {
		titleOpacity,
		titleY: 0,
		titleScale: lerp(1, 0.9, visualProgress),
		titleBlur: 0,
		iconProgress: prefersReducedMotion || clamped === 1 ? 1 : clamp01((clamped - 0.8) / 0.2),
		titlePointerEvents: titleOpacity < 0.05 ? 'none' : 'auto',
		dropletScale: Math.round(lerp(1.5, 0.85, visualProgress / 0.8) * 1000) / 1000,
		dropletY: Math.round(lerp(0, -215, visualProgress) * 100) / 100,
		fieldIntensity: Math.round(lerp(1, 0.25, visualProgress) * 1000) / 1000
	};
}
