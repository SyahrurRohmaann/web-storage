export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export const lerp = (from: number, to: number, progress: number) =>
	from + (to - from) * clamp01(progress);

export const easeInOutCubic = (progress: number) => {
	const t = clamp01(progress);
	return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

export function dropletRadii(progress: number) {
	const t = clamp01(progress);
	const radii = [62, 38, 58, 42, 46, 52, 48, 54].map((value) => Math.round(lerp(value, 50, t)));
	return `${radii[0]}% ${radii[1]}% ${radii[2]}% ${radii[3]}% / ${radii[4]}% ${radii[5]}% ${radii[6]}% ${radii[7]}%`;
}

export function magneticOffset(
	originX: number,
	originY: number,
	pointerX: number,
	pointerY: number,
	radius: number
) {
	const dx = pointerX - originX;
	const dy = pointerY - originY;
	const distance = Math.hypot(dx, dy);
	if (!radius || distance >= radius) return { x: 0, y: 0 };

	const pull = Math.pow(1 - distance / radius, 1.4);
	const maxTravel = radius * 0.3;
	if (distance === 0) return { x: 0, y: 0 };
	return {
		x: (dx / distance) * maxTravel * pull,
		y: (dy / distance) * maxTravel * pull
	};
}
