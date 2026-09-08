import { clamp01, lerp } from './dropletMotion';

export interface HeroVisualState {
	titleOpacity: number;
	titleY: number;
	titleScale: number;
	titlePointerEvents: 'auto' | 'none';
	dropletScale: number;
	dropletY: number;
	fieldIntensity: number;
}

export function heroVisuals(progress: number, prefersReducedMotion = false): HeroVisualState {
	const clamped = clamp01(progress);
	const visualProgress = prefersReducedMotion ? 0 : clamped;
	const titleOpacity = Math.round((1 - visualProgress) * 1000) / 1000;
	return {
		titleOpacity,
		titleY: Math.round(lerp(0, -90, visualProgress) * 100) / 100,
		titleScale: Math.round(lerp(1, 0.88, visualProgress) * 1000) / 1000,
		titlePointerEvents: titleOpacity < 0.05 ? 'none' : 'auto',
		dropletScale: Math.round(lerp(1.5, 0.85, visualProgress) * 1000) / 1000,
		dropletY: Math.round(lerp(0, -215, visualProgress) * 100) / 100,
		fieldIntensity: Math.round(lerp(1, 0.25, visualProgress) * 1000) / 1000
	};
}
