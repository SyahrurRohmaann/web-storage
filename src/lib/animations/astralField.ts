import { clamp01 } from './dropletMotion';

export type AstralObjectType = 'star' | 'bubble' | 'pill' | 'droplet' | 'glint';

export interface AstralObjectSpec {
	id: string;
	type: AstralObjectType;
	x: number; // percentage (0..100)
	y: number; // percentage (0..100)
	size: number; // width/height in px
	depth: number; // parallax factor (0..1)
	rotation: number; // degrees
	baseOpacity: number; // 0..1
	mobile: boolean;
	label?: string;
}

export interface RenderedAstralObject {
	id: string;
	type: AstralObjectType;
	x: number;
	y: number;
	size: number;
	opacity: number;
	transform: string;
	mobile: boolean;
	label?: string;
}

export interface AstralFieldOptions {
	prefersReducedMotion?: boolean;
	isMobile?: boolean;
}

/**
 * Deterministic astral field specifications surrounding the hero and orb.
 * Positions are spread across the periphery and mid-field to avoid obscuring
 * the central title and upload button. Total count <= 40, mobile count <= 24.
 */
export const ASTRAL_OBJECT_SPECS: AstralObjectSpec[] = [
	// Top periphery (stars & glints)
	{ id: 'star-1', type: 'star', x: 12, y: 12, size: 14, depth: 0.35, rotation: 15, baseOpacity: 0.8, mobile: true },
	{ id: 'glint-1', type: 'glint', x: 28, y: 8, size: 18, depth: 0.5, rotation: 45, baseOpacity: 0.75, mobile: false },
	{ id: 'bubble-1', type: 'bubble', x: 84, y: 14, size: 22, depth: 0.25, rotation: 0, baseOpacity: 0.6, mobile: true },
	{ id: 'star-2', type: 'star', x: 72, y: 9, size: 12, depth: 0.4, rotation: -20, baseOpacity: 0.85, mobile: true },
	{ id: 'pill-1', type: 'pill', x: 88, y: 22, size: 38, depth: 0.3, rotation: -8, baseOpacity: 0.65, mobile: false, label: 'cloud.synced' },

	// Mid-upper sides (flanking the title)
	{ id: 'droplet-1', type: 'droplet', x: 8, y: 28, size: 16, depth: 0.45, rotation: 12, baseOpacity: 0.7, mobile: true },
	{ id: 'pill-2', type: 'pill', x: 14, y: 38, size: 34, depth: 0.2, rotation: 6, baseOpacity: 0.6, mobile: false, label: '100% private' },
	{ id: 'bubble-2', type: 'bubble', x: 86, y: 36, size: 26, depth: 0.35, rotation: 0, baseOpacity: 0.55, mobile: true },
	{ id: 'star-3', type: 'star', x: 92, y: 44, size: 15, depth: 0.6, rotation: 30, baseOpacity: 0.9, mobile: false },

	// Mid-level (flanking the orb area)
	{ id: 'glint-2', type: 'glint', x: 18, y: 52, size: 20, depth: 0.55, rotation: 0, baseOpacity: 0.8, mobile: true },
	{ id: 'bubble-3', type: 'bubble', x: 6, y: 58, size: 32, depth: 0.3, rotation: 0, baseOpacity: 0.5, mobile: false },
	{ id: 'droplet-2', type: 'droplet', x: 22, y: 64, size: 18, depth: 0.4, rotation: -15, baseOpacity: 0.75, mobile: true },
	{ id: 'star-4', type: 'star', x: 80, y: 56, size: 16, depth: 0.5, rotation: 40, baseOpacity: 0.85, mobile: true },
	{ id: 'pill-3', type: 'pill', x: 82, y: 66, size: 36, depth: 0.25, rotation: -10, baseOpacity: 0.65, mobile: true, label: 'air.drive' },
	{ id: 'glint-3', type: 'glint', x: 90, y: 72, size: 16, depth: 0.65, rotation: 25, baseOpacity: 0.8, mobile: false },

	// Lower field (approaching the planetary horizon)
	{ id: 'star-5', type: 'star', x: 14, y: 78, size: 13, depth: 0.4, rotation: 10, baseOpacity: 0.7, mobile: true },
	{ id: 'bubble-4', type: 'bubble', x: 26, y: 84, size: 24, depth: 0.35, rotation: 0, baseOpacity: 0.55, mobile: false },
	{ id: 'droplet-3', type: 'droplet', x: 38, y: 88, size: 14, depth: 0.5, rotation: 8, baseOpacity: 0.65, mobile: true },
	{ id: 'pill-4', type: 'pill', x: 64, y: 86, size: 32, depth: 0.2, rotation: 4, baseOpacity: 0.6, mobile: false, label: 'end-to-end' },
	{ id: 'bubble-5', type: 'bubble', x: 74, y: 80, size: 28, depth: 0.3, rotation: 0, baseOpacity: 0.5, mobile: true },
	{ id: 'glint-4', type: 'glint', x: 86, y: 88, size: 18, depth: 0.6, rotation: -35, baseOpacity: 0.75, mobile: true },
	{ id: 'star-6', type: 'star', x: 52, y: 92, size: 12, depth: 0.45, rotation: 20, baseOpacity: 0.8, mobile: false },

	// Ambient glints & micro stars
	{ id: 'glint-5', type: 'glint', x: 34, y: 24, size: 14, depth: 0.7, rotation: 15, baseOpacity: 0.7, mobile: false },
	{ id: 'star-7', type: 'star', x: 66, y: 20, size: 11, depth: 0.6, rotation: -12, baseOpacity: 0.75, mobile: false },
	{ id: 'droplet-4', type: 'droplet', x: 30, y: 44, size: 12, depth: 0.35, rotation: 5, baseOpacity: 0.6, mobile: false },
	{ id: 'bubble-6', type: 'bubble', x: 70, y: 46, size: 20, depth: 0.4, rotation: 0, baseOpacity: 0.5, mobile: false }
];

export function computeAstralField(
	progress: number,
	options: AstralFieldOptions = {}
): RenderedAstralObject[] {
	const clamped = clamp01(progress);
	const prefersReduced = Boolean(options.prefersReducedMotion);
	const isMobile = Boolean(options.isMobile);

	const list = isMobile
		? ASTRAL_OBJECT_SPECS.filter((spec) => spec.mobile)
		: ASTRAL_OBJECT_SPECS;

	return list.map((spec) => {
		if (prefersReduced) {
			return {
				id: spec.id,
				type: spec.type,
				x: spec.x,
				y: spec.y,
				size: spec.size,
				opacity: spec.baseOpacity,
				transform: `translate3d(0, 0, 0) rotate(${spec.rotation}deg)`,
				mobile: spec.mobile,
				label: spec.label
			};
		}

		const yParallax = -clamped * spec.depth * 90;
		const roundedY = Math.round(yParallax * 10) / 10;

		return {
			id: spec.id,
			type: spec.type,
			x: spec.x,
			y: spec.y,
			size: spec.size,
			opacity: spec.baseOpacity,
			transform: `translate3d(0, ${roundedY}px, 0) rotate(${spec.rotation}deg)`,
			mobile: spec.mobile,
			label: spec.label
		};
	});
}
