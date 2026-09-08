// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { tick } from 'svelte';
import Page from './+page.svelte';
import pageSource from './+page.svelte?raw';

const mocks = vi.hoisted(() => ({
	stop: vi.fn(), cancel: vi.fn(), animate: vi.fn(), instances: [] as any[]
}));
vi.mock('motion', () => ({ animate: mocks.animate }));
vi.mock('lenis', () => ({ default: class {
	scroll = 0;
	isScrolling: boolean | string = false;
	raf = vi.fn();
	destroy = vi.fn();
	resize = vi.fn();
	on = vi.fn();
	constructor(public options: unknown) { mocks.instances.push(this); }
} }));

let reduced: MediaQueryList;
let frames: Map<number, FrameRequestCallback>;
let nextFrame: number;
async function setReduced(value: boolean) {
	Object.defineProperty(reduced, 'matches', { value, configurable: true });
	reduced.dispatchEvent(new Event('change'));
	await tick();
}
async function scrollTo(y: number) {
	Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
	await fireEvent.scroll(window);
}
function frame(time = 16) {
	const pending = [...frames.values()];
	frames.clear();
	pending.forEach((callback) => callback(time));
}

beforeEach(() => {
	vi.clearAllMocks();
	mocks.instances.length = 0;
	mocks.animate.mockReturnValue({ stop: mocks.stop, cancel: mocks.cancel });
	frames = new Map();
	nextFrame = 0;
	vi.stubGlobal('requestAnimationFrame', vi.fn((callback) => {
		frames.set(++nextFrame, callback);
		return nextFrame;
	}));
	vi.stubGlobal('cancelAnimationFrame', vi.fn((id) => frames.delete(id)));
	reduced = Object.assign(new EventTarget(), { matches: false }) as MediaQueryList;
	vi.stubGlobal('matchMedia', vi.fn((query) => query.includes('reduced-motion')
		? reduced : Object.assign(new EventTarget(), { matches: false })));
	Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
	vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(2000);
	vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockReturnValue(0);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Astral hero motion lifecycle', () => {
	it('stops Motion, destroys Lenis and cancels RAF when reduced motion changes after mount', async () => {
		const view = render(Page);
		await fireEvent.wheel(window, { deltaY: 100 });
		await setReduced(true);
		expect(mocks.stop).toHaveBeenCalledOnce();
		expect(mocks.cancel).toHaveBeenCalledOnce();
		expect(mocks.instances[0].destroy).toHaveBeenCalledOnce();
		expect(frames.size).toBe(0);
		await fireEvent.wheel(window, { deltaY: 100 });
		await scrollTo(1200);
		expect(frames.size).toBe(0);
		await setReduced(false);
		expect(mocks.instances).toHaveLength(2);
		expect(mocks.animate).toHaveBeenCalledOnce();
		await fireEvent.wheel(window, { deltaY: 100 });
		expect(frames.size).toBe(1);
		view.unmount();
		expect(mocks.instances[1].destroy).toHaveBeenCalledOnce();
		expect(frames.size).toBe(0);
		await setReduced(true);
		await setReduced(false);
		await fireEvent.wheel(window, { deltaY: 100 });
		expect(mocks.instances).toHaveLength(2);
		expect(frames.size).toBe(0);
	});

	it('disables orb child transitions in the reduced-motion stylesheet', () => {
		// jsdom does not evaluate media queries; check this narrow CSS contract directly.
		const reducedStyles = pageSource.split('@media (prefers-reduced-motion: reduce)')[1];
		expect(reducedStyles).toMatch(/\.droplet\s*>\s*\*[^{]*\{\s*transition:\s*none\s*!important/);
	});

	it('keeps reduced-motion visuals static and native scrolling/file picking available', async () => {
		await setReduced(true);
		const { container, getByRole } = render(Page);
		const selectors = ['.hero-copy', '.droplet', '.astral-field', '.scroll-cue'];
		const styles = () => selectors.map((selector) => container.querySelector(selector)?.getAttribute('style'));
		const start = styles();
		await scrollTo(2000);
		expect(styles()).toEqual(start);
		expect(container.querySelector('.droplet.docked')).toBeNull();
		expect(window.scrollY).toBe(2000);
		const click = vi.spyOn(container.querySelector('input')!, 'click');
		await fireEvent.click(getByRole('button', { name: 'Pilih file untuk diunggah' }));
		expect(click).toHaveBeenCalledOnce();
		expect(mocks.animate).not.toHaveBeenCalled();
		expect(mocks.instances).toHaveLength(0);
		expect(frames.size).toBe(0);
	});

	it('schedules only active Lenis or magnetic work and settles back to zero RAF', async () => {
		const { container } = render(Page);
		expect(frames.size).toBe(0);
		const lenis = mocks.instances[0];
		lenis.isScrolling = 'smooth';
		const wheel = new WheelEvent('wheel', { deltaY: 100, cancelable: true });
		window.dispatchEvent(wheel);
		expect(wheel.defaultPrevented).toBe(false);
		expect(frames.size).toBe(1);
		frame();
		expect(lenis.raf).toHaveBeenCalledWith(16);
		expect(frames.size).toBe(1);
		lenis.isScrolling = false;
		frame(32);
		expect(frames.size).toBe(0);
		await fireEvent(container.querySelector('.hero')!, new MouseEvent('pointermove', { clientX: 60, clientY: 40, bubbles: true }));
		expect(frames.size).toBe(1);
		for (let i = 0; i < 100; i++) frame(48 + i * 16);
		expect(frames.size).toBe(0);
		await fireEvent.pointerLeave(container.querySelector('.hero')!);
		expect(frames.size).toBe(1);
		for (let i = 0; i < 100; i++) frame(2000 + i * 16);
		expect(frames.size).toBe(0);
	});

	it('applies visual field intensity to the rendered field', async () => {
		const { container } = render(Page);
		const field = container.querySelector<HTMLElement>('.astral-field')!;
		expect(field.style.opacity).toBe('1');
		await scrollTo(2000);
		expect(field.style.opacity).toBe('0.25');
		await scrollTo(0);
		expect(field.style.opacity).toBe('1');
	});
});
