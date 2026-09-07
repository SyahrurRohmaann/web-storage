import { clamp01, lerp } from './dropletMotion';

export interface HeroVisualState {
	titleOpacity: number;
	titleY: number;
	dropletScale: number;
}

export function heroVisuals(progress: number): HeroVisualState {
	const clamped = clamp01(progress);
	return {
		titleOpacity: Math.round((1 - clamped) * 1000) / 1000,
		titleY: Math.round(lerp(0, -90, clamped) * 100) / 100,
		dropletScale: Math.round(lerp(1.5, 0.85, clamped) * 1000) / 1000
	};
}
