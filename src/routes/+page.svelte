<script lang="ts">
	import { onMount } from 'svelte';
	import { animate } from 'motion';
	import 'lenis/dist/lenis.css';
	import Lenis from 'lenis';
	import { dropletRadii, easeInOutCubic, magneticOffset } from '$lib/animations/dropletMotion';
	import { heroVisuals } from '$lib/animations/heroVisuals';
	import { computeAstralField } from '$lib/animations/astralField';
	import {
		canUseSmoothScroll,
		createLenisConfig,
		calculateHeroScrollProgress
	} from '$lib/animations/smoothScroll';
	import { validateFiles } from '$lib/upload/validation';

	let hero: HTMLElement;
	let heroCopyEl: HTMLElement;
	let dropletEl: HTMLElement;
	let orbitEl: HTMLElement;
	let dropPosition = { x: 0, y: 0, size: 200 };
	let picker: HTMLInputElement;
	let scrollProgress = 0;
	let easedProgress = 0;
	let pointer = { x: 0, y: 0 };
	let targetPointer = { x: 0, y: 0 };
	let uploading = false;
	let uploadProgress = 0;
	let message = '';
	let messageType: 'success' | 'error' | '' = '';
	let prefersReduced = false;
	let isMobile = false;
	let requestTick = () => {};
	let flash: '' | 'charge' | 'return' = '';
	let reversing = false;

	$: visualProgress = prefersReduced ? 0 : scrollProgress;
	$: visual = heroVisuals(scrollProgress, prefersReduced);
	$: easedProgress = easeInOutCubic(visualProgress);
	$: blobRadius = visualProgress > 0 || prefersReduced ? '50%' : dropletRadii(0, pointer.x, pointer.y);
	$: dropletX = prefersReduced ? 0 : pointer.x * (1 - easedProgress * 0.8);
	$: dropletY = prefersReduced ? 0 : pointer.y * (1 - easedProgress * 0.8);
	$: astralObjects = computeAstralField(scrollProgress, {
		prefersReducedMotion: prefersReduced,
		isMobile
	});

	onMount(() => {
		let raf = 0;
		let lenis: Lenis | null = null;
		let flashTimer: ReturnType<typeof setTimeout>;
		let previousProgress = 0;
		let initialized = false;
		let velocity = { x: 0, y: 0 };
		let lastTime = 0;
		let heroCopyAnimation: { stop: () => void; cancel: () => void } | null = null;

		const mediaReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
		prefersReduced = mediaReduced.matches;
		const mediaMobile = window.matchMedia('(max-width: 900px)');
		isMobile = mediaMobile.matches;

		const onMediaChange = () => {
			prefersReduced = mediaReduced.matches;
			isMobile = mediaMobile.matches;
			if (prefersReduced) {
				clearTimeout(flashTimer);
				flash = '';
				stopMotion();
				lenis?.destroy();
				lenis = null;
				cancelAnimationFrame(raf);
				raf = 0;
				pointer = targetPointer = { x: 0, y: 0 };
			} else {
				startLenis();
			}
			updateScroll(window.scrollY);
		};
		mediaReduced.addEventListener('change', onMediaChange);
		mediaMobile.addEventListener('change', onMediaChange);

		if (!prefersReduced && heroCopyEl) {
			heroCopyAnimation = animate(
				heroCopyEl.querySelector('.hero-copy-motion') ?? heroCopyEl,
				{ opacity: [0, 1], y: [16, 0], scale: [0.95, 1] },
				{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }
			);
		}

		const updateScroll = (currentScroll?: number) => {
			if (!hero) return;
			const scrollY =
				typeof currentScroll === 'number'
					? currentScroll
					: window.scrollY;
			scrollProgress = calculateHeroScrollProgress(
				scrollY,
				hero.offsetTop,
				hero.offsetHeight,
				window.innerHeight
			);
			const h = window.innerHeight, w = window.innerWidth;
			if (scrollProgress !== previousProgress) reversing = scrollProgress < previousProgress;
			if (initialized && !prefersReduced && ((previousProgress === 0 && scrollProgress > 0) || (previousProgress > 0 && scrollProgress === 0))) {
				clearTimeout(flashTimer);
				flash = scrollProgress === 0 ? 'return' : 'charge';
				flashTimer = setTimeout(() => { flash = ''; }, 120);
			}
			previousProgress = scrollProgress;
			initialized = true;
			const orbit = orbitEl.getBoundingClientRect();
			const start = hero.offsetHeight - h;
			const end = orbit.top + scrollY + orbit.height / 2 - h * 0.55;
			const travel = easeInOutCubic((scrollY - start) / Math.max(1, end - start));
			const lift = Math.min(1, scrollProgress / 0.8);
			const overshoot = reversing && scrollProgress < 0.16 ? Math.sin(Math.PI * scrollProgress / 0.16) * 0.025 : 0;
			const size = ((isMobile ? 208 : 300) * (1 - lift) + 116 * lift) * (1 + overshoot);
			const targetY = Math.max(78, Math.min(h - 78, orbit.top + orbit.height / 2));
			dropPosition = prefersReduced ? { x: w - 58, y: h - 58, size: 76 } : {
				// Arc around the mobile copy/header, then land in the empty orbit.
				x: w / 2 + (orbit.left + orbit.width / 2 - w / 2) * travel
					+ (isMobile ? Math.sin(Math.PI * travel) * (w / 2 - 64) : 0),
				y: h * (0.65 - 0.08 * lift) * (1 - travel) + targetY * travel,
				size
			};
		};

		function stopMotion() {
			heroCopyAnimation?.stop();
			// Remove entrance styles so the scroll/static styles own the title again.
			heroCopyAnimation?.cancel();
			heroCopyAnimation = null;
		}

		function startLenis() {
			if (!lenis && canUseSmoothScroll({ isBrowser: true, prefersReducedMotion: prefersReduced })) {
				lenis = new Lenis(createLenisConfig());
				lenis.on('scroll', (instance) => {
					updateScroll(instance.scroll);
					if (instance.isScrolling === 'smooth') requestTick();
				});
			}
		}

		const onNativeScroll = () => {
			releasePointer();
			updateScroll(window.scrollY);
		};

		const onResize = () => {
			if (lenis) lenis.resize();
			updateScroll();
		};

		const tick = (time: number) => {
			// Keep the current RAF marked pending while Lenis emits scroll events.
			lenis?.raf(time);
			raf = 0;
			const moving = Math.hypot(targetPointer.x - pointer.x, targetPointer.y - pointer.y) > 0.1;
			const dt = Math.min(2, Math.max(0.25, (time - lastTime) / 16.67));
			lastTime = time;
			for (const axis of ['x', 'y'] as const) velocity[axis] = (velocity[axis] + (targetPointer[axis] - pointer[axis]) * 0.08 * dt) * Math.pow(0.72, dt);
			const settling = moving || Math.hypot(velocity.x, velocity.y) > 0.1;
			pointer = settling ? { x: pointer.x + velocity.x * dt, y: pointer.y + velocity.y * dt } : { ...targetPointer };
			if (settling || lenis?.isScrolling === 'smooth') requestTick();
		};
		requestTick = () => {
			if (!prefersReduced && !raf) raf = requestAnimationFrame(tick);
		};
		const onWheel = () => requestTick();

		startLenis();
		updateScroll();
		window.addEventListener('wheel', onWheel, { passive: true });
		window.addEventListener('scroll', onNativeScroll, { passive: true });
		window.addEventListener('resize', onResize);

		return () => {
			clearTimeout(flashTimer);
			stopMotion();
			if (lenis) {
				lenis.destroy();
				lenis = null;
			}
			window.removeEventListener('scroll', onNativeScroll);
			window.removeEventListener('wheel', onWheel);
			window.removeEventListener('resize', onResize);
			mediaReduced.removeEventListener('change', onMediaChange);
			mediaMobile.removeEventListener('change', onMediaChange);
			cancelAnimationFrame(raf);
			requestTick = () => {};
		};
	});

	function followPointer(event: PointerEvent) {
		if (prefersReduced || !dropletEl || scrollProgress > 0.08 || event.pointerType === 'touch') return;
		const rect = dropletEl.getBoundingClientRect();
		targetPointer = magneticOffset(
			rect.left + rect.width / 2,
			rect.top + rect.height / 2,
			event.clientX,
			event.clientY,
			Math.max(220, Math.min(window.innerWidth * 0.42, 360))
		);
		requestTick();
	}

	function releasePointer() {
		targetPointer = { x: 0, y: 0 };
		requestTick();
	}

	function openPicker() {
		if (uploading) return;
		message = '';
		picker.click();
	}

	async function uploadFiles(files: File[]) {
		const validation = validateFiles(files);
		if (!validation.ok) {
			messageType = 'error';
			message = validation.message;
			return;
		}
		if (!navigator.onLine) {
			messageType = 'error';
			message = 'Kamu sedang offline. Sambungkan internet untuk mengunggah file.';
			return;
		}

		uploading = true;
		uploadProgress = 0;
		message = '';
		try {
			for (let index = 0; index < files.length; index += 1) {
				await uploadOne(files[index], index, files.length);
			}
			uploadProgress = 100;
			messageType = 'success';
			message = `${files.length} file aman di cloud.`;
		} catch (error) {
			messageType = 'error';
			message = error instanceof Error ? error.message : 'Upload gagal. Coba lagi sebentar.';
		} finally {
			uploading = false;
			picker.value = '';
		}
	}

	function uploadOne(file: File, index: number, total: number) {
		return new Promise<void>((resolve, reject) => {
			const body = new FormData();
			body.append('files', file);
			const xhr = new XMLHttpRequest();
			xhr.open('POST', '/api/upload');
			xhr.upload.onprogress = (event) => {
				if (event.lengthComputable) {
					const current = event.loaded / event.total;
					uploadProgress = Math.round(((index + current) / total) * 100);
				}
			};
			xhr.onload = () => {
				let result: { ok?: boolean; message?: string } = {};
				try { result = JSON.parse(xhr.responseText); } catch { result = {}; }
				if (xhr.status >= 200 && xhr.status < 300 && result.ok) resolve();
				else reject(new Error(result.message || `Upload ${file.name} gagal.`));
			};
			xhr.onerror = () => reject(new Error(`Jaringan terputus saat mengunggah ${file.name}.`));
			xhr.send(body);
		});
	}

	function onFilesSelected(event: Event) {
		uploadFiles(Array.from((event.currentTarget as HTMLInputElement).files ?? []));
	}

	function onDrop(event: DragEvent) {
		event.preventDefault();
		uploadFiles(Array.from(event.dataTransfer?.files ?? []));
	}
</script>

<svelte:head>
	<title>Storage — simpan yang penting</title>
	<meta name="description" content="Penyimpanan cloud personal dengan pengalaman upload yang ringan dan menyenangkan." />
	<meta name="theme-color" content="#060b18" />
</svelte:head>

<svg class="sr-only" aria-hidden="true" width="0" height="0">
	<defs>
		<radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
			<stop offset="0%" stop-color="#ffffff" stop-opacity="1" />
			<stop offset="45%" stop-color="#7dd3fc" stop-opacity="0.9" />
			<stop offset="100%" stop-color="#38bdf8" stop-opacity="0.3" />
		</radialGradient>
	</defs>
</svg>

<svelte:window onpointermove={followPointer} onpointerup={releasePointer} onpointercancel={releasePointer} onblur={releasePointer} />

<main>
		<button
			bind:this={dropletEl}
			class:docked={visualProgress > 0.88}
			class="droplet"
			data-flash={flash}
			class:transitioning={visualProgress > 0 && visualProgress < 1}
			aria-busy={uploading}
			type="button"
			onclick={openPicker}
			aria-label="Pilih file untuk diunggah"
			style={`--icon-progress:${visual.iconProgress};--progress:${easedProgress};--radius:${blobRadius};--mx:${dropletX}px;--my:${dropletY}px;--drop-x:${dropPosition.x ? `${dropPosition.x}px` : '50vw'};--drop-y:${dropPosition.y ? `${dropPosition.y}px` : '65vh'};--drop-size:${dropPosition.size}px;--light-x:${pointer.x * .35}px;--light-y:${pointer.y * .35}px`}
		>
			<span class="rim-light" aria-hidden="true"></span>
			<div class="droplet-motion" aria-hidden="true">
				<!-- Layered internal water refraction and caustic structure -->
				<div class="water-caustic" aria-hidden="true">
					<svg viewBox="0 0 100 100" class="caustic-svg" preserveAspectRatio="none">
						<defs>
							<radialGradient id="waterRefract" cx="42%" cy="62%" r="58%">
								<stop offset="0%" stop-color="#ffffff" stop-opacity="0.55" />
								<stop offset="40%" stop-color="#72cbfd" stop-opacity="0.32" />
								<stop offset="85%" stop-color="#1e88e5" stop-opacity="0.08" />
								<stop offset="100%" stop-color="#0d47a1" stop-opacity="0" />
							</radialGradient>
						</defs>
						<ellipse cx="50" cy="56" rx="44" ry="36" fill="url(#waterRefract)" />
						<path d="M 18,38 Q 50,78 82,38 Q 50,92 18,38 Z" fill="url(#waterRefract)" opacity="0.75" />
					</svg>
				</div>

				<!-- Primary specular dome highlight (sun/sky gleam) -->
				<span class="specular-primary"></span>

				<!-- Secondary specular pinpoint sparkle -->
				<span class="specular-secondary"></span>

				<!-- Lower rim caustic bounce reflection -->
				<span class="caustic-rim"></span>

				<!-- Internal liquid meniscus shimmer -->
				<span class="liquid-shimmer"></span>

				<!-- Morphing "+" symbol for upload button -->
				<span class="plus"><span></span><span></span></span>

				<!-- Upload fluid fill -->
				{#if uploading}
					<span class="fill" style={`height:${uploadProgress}%`}></span>
				{/if}
			</div>
		</button>
	<section
		class="hero"
		aria-label="Hero dan area unggah"
		bind:this={hero}
		ondragover={(e) => e.preventDefault()}
		ondrop={onDrop}
	>
		<div class="cloud cloud-a" aria-hidden="true"></div>
		<div class="cloud cloud-b" aria-hidden="true"></div>
		<div class="cloud cloud-c" aria-hidden="true"></div>

		<!-- Decorative Astral Field -->
		<div class="astral-field" aria-hidden="true" style={`opacity:${visual.fieldIntensity}`}>
			{#each astralObjects as item (item.id)}
				<div
					class="astral-item"
					style={`left:${item.x}%;top:${item.y}%;width:${item.size}px;height:${item.size}px;opacity:${item.opacity};transform:${item.transform}`}
				>
					{#if item.type === 'star'}
						<svg viewBox="0 0 24 24" class="astral-star" fill="none">
							<path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" fill="url(#starGlow)" />
						</svg>
					{:else if item.type === 'glint'}
						<svg viewBox="0 0 24 24" class="astral-glint" fill="none">
							<circle cx="12" cy="12" r="2.5" fill="#ffffff" />
							<path d="M12 1v22M1 12h22M4 4l16 16M4 20L20 4" stroke="#7dd3fc" stroke-width="1.2" stroke-linecap="round" />
						</svg>
					{:else if item.type === 'bubble'}
						<div class="astral-bubble">
							<span class="bubble-specular"></span>
						</div>
					{:else if item.type === 'droplet'}
						<div class="astral-droplet"></div>
					{:else if item.type === 'pill'}
						<div class="astral-pill">
							<span class="pill-dot"></span>
							{#if item.label}
								<span class="pill-text">{item.label}</span>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		</div>

		<div
			bind:this={heroCopyEl}
			class="hero-copy"
			class:reversing
			style={`opacity:${visual.titleOpacity};transform:scale(${visual.titleScale});filter:blur(${visual.titleBlur}px);pointer-events:${visual.titlePointerEvents}`}
		>
			<div class="hero-copy-motion">
				<p class="eyebrow">personal cloud · simple by design</p>
				<h1 class="metallic-title">storage</h1>
				<p class="subtitle">jatuhkan file, biarkan langit yang menyimpannya.</p>
			</div>
		</div>


		<div class="scroll-cue" style={`opacity:${Math.max(0, 1 - visualProgress * 4)}`}>
			<span>scroll to lift the drop</span><i></i>
		</div>
		<input bind:this={picker} onchange={onFilesSelected} type="file" multiple hidden />
	</section>

	<section class="dock-zone" aria-label="Area unggah">
		<div class="dock-copy">
			<span class="step">01 / UPLOAD</span>
			<h2>Satu tetes.<br />Semua tersimpan.</h2>
			<p>Pilih hingga 10 file sekaligus, masing-masing maksimal 100 MB. File bergerak langsung dari browser ke folder Drive.</p>
			<button class="secondary" type="button" onclick={openPicker}>pilih file <span>↗</span></button>
		</div>
		<div class="status-panel" aria-live="polite">
			{#if uploading}<p role="progressbar" aria-label="Pengiriman file ke server" aria-valuemin="0" aria-valuemax="100" aria-valuenow={uploadProgress}>{uploadProgress}%</p>{/if}
			<div class="status-head"><span>storage status</span><b class:active={uploading}></b></div>
			<div class="status-orbit" bind:this={orbitEl} aria-hidden="true"></div>
			{#if message}<p class:success={messageType === 'success'} class:error={messageType === 'error'}>{message}</p>{:else}<p>siap menerima file.</p>{/if}
		</div>
	</section>
</main>

<style>
	:global(*) { box-sizing: border-box; }
	:global(html) { background: #050b17; color-scheme: dark; }
	:global(body) { margin: 0; font-family: 'Inter', system-ui, sans-serif; color: #e2eaf8; background: #050b17; }
	:global(button) { font: inherit; }

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}

	.hero {
		height: 190vh;
		min-height: 1050px;
		position: relative;
		overflow: clip;
		background: linear-gradient(180deg, #050b17 0%, #09132b 34%, #0e214d 65%, #14356e 86%, #1a427f 100%);
	}
	/* Planetary horizon glow at bottom of hero */
	.hero::before {
		content: '';
		position: absolute;
		inset: auto 0 0 0;
		height: 50%;
		pointer-events: none;
		z-index: 1;
		background: radial-gradient(
			ellipse 120% 70% at 50% 102%,
			rgba(56, 189, 248, 0.42) 0%,
			rgba(14, 165, 233, 0.24) 38%,
			rgba(3, 105, 161, 0.1) 70%,
			transparent 90%
		);
		filter: blur(10px);
	}
	/* Subtle cosmic ambient nebula glow */
	.hero::after {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		background: radial-gradient(
			ellipse 70% 50% at 50% 30%,
			rgba(56, 189, 248, 0.15) 0%,
			rgba(14, 165, 233, 0.08) 45%,
			transparent 75%
		);
		opacity: 0.85;
	}

	/* Decorative Astral Field */
	.astral-field {
		position: absolute;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
		z-index: 2;
	}
	.astral-item {
		position: absolute;
		display: grid;
		place-items: center;
		transform-origin: center center;
		pointer-events: none;
		user-select: none;
		will-change: transform, opacity;
	}
	.astral-star {
		width: 100%;
		height: 100%;
		filter: drop-shadow(0 0 6px rgba(56, 189, 248, 0.75));
	}
	.astral-glint {
		width: 100%;
		height: 100%;
		filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.85));
	}
	.astral-bubble {
		width: 100%;
		height: 100%;
		border-radius: 50%;
		background: radial-gradient(
			circle at 35% 30%,
			rgba(255, 255, 255, 0.7) 0%,
			rgba(125, 211, 252, 0.3) 40%,
			rgba(14, 165, 233, 0.15) 70%,
			transparent 100%
		);
		border: 1px solid rgba(255, 255, 255, 0.4);
		box-shadow: 0 0 12px rgba(56, 189, 248, 0.25), inset 1px 1px 3px rgba(255, 255, 255, 0.7);
		backdrop-filter: blur(2px);
		position: relative;
	}
	.bubble-specular {
		position: absolute;
		top: 18%;
		left: 22%;
		width: 25%;
		height: 25%;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.85);
		filter: blur(0.5px);
	}
	.astral-droplet {
		width: 100%;
		height: 100%;
		border-radius: 50% 50% 50% 0;
		transform: rotate(-45deg);
		background: radial-gradient(
			circle at 40% 40%,
			rgba(255, 255, 255, 0.8) 0%,
			rgba(56, 189, 248, 0.5) 50%,
			rgba(2, 132, 199, 0.7) 100%
		);
		box-shadow: 0 0 10px rgba(56, 189, 248, 0.35), inset 1px 1px 2px rgba(255, 255, 255, 0.75);
	}
	.astral-pill {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 3px 8px;
		border-radius: 999px;
		background: rgba(15, 23, 42, 0.65);
		border: 1px solid rgba(56, 189, 248, 0.35);
		box-shadow: 0 4px 14px rgba(2, 6, 23, 0.4), 0 0 10px rgba(56, 189, 248, 0.15);
		backdrop-filter: blur(6px);
		white-space: nowrap;
	}
	.pill-dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: #38bdf8;
		box-shadow: 0 0 6px #38bdf8;
	}
	.pill-text {
		font-family: 'Inter', monospace, sans-serif;
		font-size: 0.62rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		color: #bae6fd;
		text-transform: lowercase;
	}

	.hero-copy {
		position: sticky;
		top: 18vh;
		width: min(980px, 92vw);
		margin: auto;
		text-align: center;
		z-index: 3;
		transform-origin: 50% 20%;
	}
	.eyebrow {
		letter-spacing: 0.24em;
		text-transform: uppercase;
		font-size: 0.72rem;
		font-weight: 700;
		margin: 0 0 1.2rem;
		opacity: 0.9;
		color: #7dd3fc;
		text-shadow: 0 0 14px rgba(56, 189, 248, 0.45);
	}

	/* Metallic balloon title font styling */
	.metallic-title {
		font-family: 'Fredoka', 'Baloo 2', 'Arial Rounded MT Bold', sans-serif;
		font-size: clamp(3.8rem, 15vw, 10.2rem);
		font-weight: 700;
		line-height: 0.82;
		margin: 0;
		letter-spacing: -0.04em;
		color: #e2eaf8; /* Fallback for browsers without background-clip: text */
		background: linear-gradient(
			172deg,
			#ffffff 0%,
			#f0f7ff 16%,
			#bae6fd 32%,
			#38bdf8 48%,
			#ffffff 52%,
			#7dd3fc 68%,
			#0284c7 85%,
			#e0f2fe 100%
		);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		filter: drop-shadow(0 2px 2px rgba(2, 6, 23, 0.8))
			drop-shadow(0 10px 24px rgba(56, 189, 248, 0.28))
			drop-shadow(0 24px 50px rgba(2, 132, 199, 0.18));
		transform-origin: center bottom;
		/* Separate translate from the entrance and scroll transforms. */
		animation: float 4.6s ease-in-out infinite;
	}

	.subtitle {
		font-size: clamp(0.95rem, 2vw, 1.22rem);
		letter-spacing: 0.03em;
		opacity: 0.82;
		margin-top: 1.8rem;
		color: #cbd5e1;
		text-shadow: 0 1px 4px rgba(2, 6, 23, 0.6);
	}

	/* Substantially larger, realistically water-like droplet */
	.droplet {
		--progress: 0;
		position: fixed;
		z-index: 10;
		left: var(--drop-x, 50vw);
		top: var(--drop-y, 65vh);
		margin: 0;
		padding: 0;
		display: grid;
		place-items: center;
		width: 300px;
		aspect-ratio: 1;
		border-radius: var(--radius);
		cursor: pointer;
		color: white;
		overflow: hidden;
		user-select: none;
		-webkit-user-select: none;

		/* Optical transparent liquid glass against astral sky */
		background: radial-gradient(
			136% 136% at 30% 24%,
			rgba(255, 255, 255, 0.3) 0%,
			rgba(186, 230, 253, 0.1) 24%,
			rgba(56, 189, 248, 0.2) 64%,
			rgba(2, 132, 199, 0.48) 100%
		);
		backdrop-filter: blur(3px) saturate(140%) brightness(110%);
		-webkit-backdrop-filter: blur(3px) saturate(140%) brightness(110%);

		border: 1.5px solid rgba(255, 255, 255, 0.72);
		box-shadow:
			0 36px 72px -10px rgba(2, 6, 23, 0.6),
			0 16px 36px -4px rgba(14, 165, 233, 0.35),
			0 0 32px rgba(56, 189, 248, 0.35),
			inset 8px 10px 18px rgba(255, 255, 255, 0.6),
			inset 2px 2px 6px rgba(255, 255, 255, 0.9),
			inset -10px -12px 24px rgba(3, 105, 161, 0.4),
			inset -4px -4px 10px rgba(2, 6, 23, 0.3);

		transform: translate(calc(-50% + var(--mx)), calc(-50% + var(--my))) scale(calc(var(--drop-size) / 300px));
		transform-origin: center center;
		transition:
			border-radius 0.12s linear,
			border-color 0.2s ease,
			box-shadow 0.3s ease;
		animation: droplet-float 4.2s ease-in-out infinite;
		will-change: transform;
	}

	.droplet:hover {
		box-shadow:
			0 40px 80px -6px rgba(2, 6, 23, 0.7),
			0 20px 42px -4px rgba(14, 165, 233, 0.45),
			0 0 44px rgba(56, 189, 248, 0.55),
			inset 10px 12px 22px rgba(255, 255, 255, 0.75),
			inset 2px 2px 6px rgba(255, 255, 255, 0.98),
			inset -10px -12px 24px rgba(3, 105, 161, 0.35),
			0 0 0 8px rgba(56, 189, 248, 0.2);
	}

	.droplet.docked { animation: none; }
	.droplet.transitioning { animation: none; }
	.rim-light { position: absolute; inset: 1px; border: 2px solid white; border-radius: inherit; box-shadow: inset 0 0 18px #8fd3ff; pointer-events: none; animation: idle-glow 2.5s ease-in-out infinite; }
	.droplet[data-flash="charge"] .rim-light,
	.droplet[data-flash="return"] .rim-light { animation: charge-flash 120ms ease-out; }
	.droplet.docked .rim-light { opacity: 0.3; animation: dock-pulse 2.5s ease-in-out infinite; }
	.droplet.docked .droplet-motion { animation: none; }
	@keyframes idle-glow { 0%,100% { opacity: 0.3; } 50% { opacity: 0.7; } }
	@keyframes charge-flash { 0%,100% { opacity: 0.3; transform: scale(1); } 45% { opacity: 1; transform: scale(1.015); box-shadow: inset 0 0 45px white; } }
	@keyframes dock-pulse { 0%,100% { opacity: 0.2; scale: 1; } 50% { opacity: 0.4; scale: 1.03; } }
	.droplet:focus-visible { outline: 3px solid #bae6fd; outline-offset: 8px; }

	.droplet-motion {
		position: absolute;
		inset: 0;
		/* The inner wrapper owns the plus layout, not the outer grid. */
		display: grid;
		place-items: center;
		border-radius: inherit;
		pointer-events: none;
		animation: droplet-shimmer 5.5s ease-in-out infinite;
		will-change: transform, opacity;
	}

	/* Layer 1: Internal caustic & light refraction */
	.water-caustic {
		position: absolute;
		inset: 0;
		pointer-events: none;
		overflow: hidden;
		border-radius: inherit;
		opacity: calc(1 - var(--progress) * 0.25);
		transition: opacity 0.2s ease;
	}
	.caustic-svg {
		width: 100%;
		height: 100%;
		filter: blur(2px);
		animation: caustic-shift 4.8s ease-in-out infinite;
		transform-origin: center;
	}

	/* Layer 2: Main primary curved specular dome highlight */
	.specular-primary {
		position: absolute;
		width: 44%;
		height: 25%;
		translate: var(--light-x) var(--light-y);
		left: 17%;
		top: 15%;
		border-radius: 50%;
		background: radial-gradient(
			ellipse at 35% 25%,
			rgba(255, 255, 255, 0.98) 0%,
			rgba(255, 255, 255, 0.75) 45%,
			rgba(255, 255, 255, 0) 100%
		);
		transform: rotate(-24deg);
		filter: blur(0.8px);
		animation: specular-sweep 3.8s ease-in-out infinite;
		pointer-events: none;
		opacity: calc(1 - var(--progress) * 0.25);
		transition: opacity 0.2s ease;
	}

	/* Layer 3: Secondary specular pinpoint sparkle */
	.specular-secondary {
		position: absolute;
		width: 7%;
		height: 7%;
		translate: calc(var(--light-x) * -0.7) calc(var(--light-y) * -0.7);
		left: 64%;
		top: 24%;
		border-radius: 50%;
		background: radial-gradient(circle, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0) 100%);
		filter: blur(0.4px);
		pointer-events: none;
		opacity: calc(1 - var(--progress) * 0.25);
		transition: opacity 0.2s ease;
	}

	/* Layer 4: Lower rim caustic reflection */
	.caustic-rim {
		position: absolute;
		width: 65%;
		height: 28%;
		left: 20%;
		bottom: 12%;
		border-radius: 50%;
		background: radial-gradient(
			ellipse at 50% 80%,
			rgba(255, 255, 255, 0.5) 0%,
			rgba(187, 235, 255, 0.28) 45%,
			rgba(255, 255, 255, 0) 80%
		);
		filter: blur(2.5px);
		animation: rim-breathe 4.2s ease-in-out infinite;
		pointer-events: none;
		opacity: calc(1 - var(--progress) * 0.25);
		transition: opacity 0.2s ease;
	}

	/* Layer 5: Liquid shimmer */
	.liquid-shimmer {
		position: absolute;
		inset: 4px;
		translate: calc(var(--light-x) * -0.25) calc(var(--light-y) * -0.25);
		border-radius: inherit;
		background: linear-gradient(
			130deg,
			rgba(255, 255, 255, 0.3) 0%,
			transparent 40%,
			rgba(255, 255, 255, 0.15) 60%,
			transparent 100%
		);
		pointer-events: none;
		opacity: calc(1 - var(--progress) * 0.25);
		transition: opacity 0.2s ease;
	}

	/* Morphing "+" symbol */
	.plus {
		position: relative;
		z-index: 3;
		width: 100px;
		height: 100px;
		opacity: var(--icon-progress);
		transform: scale(calc(0.6 + var(--icon-progress) * 0.4));
		transition: transform 0.15s ease, opacity 0.15s ease;
		text-shadow: 0 2px 6px rgba(0, 48, 96, 0.35);
	}
	.plus span { position: absolute; background: white; border-radius: 6px; box-shadow: 0 2px 6px rgba(0, 48, 96, 0.35); }
	.plus span:first-child { width: 100%; height: 10px; left: 0; top: 45px; }
	.plus span:last-child { height: 100%; width: 10px; top: 0; left: 45px; }

	/* Progress fill */
	.fill {
		position: absolute;
		z-index: 2;
		inset: auto 0 0;
		background: linear-gradient(180deg, #4fc3f7 0%, #0288d1 100%);
		transition: height 0.15s ease-out;
	}

	.scroll-cue {
		position: absolute;
		z-index: 2;
		top: 87vh;
		left: 50%;
		transform: translateX(-50%);
		display: grid;
		gap: 0.6rem;
		justify-items: center;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		font-size: 0.58rem;
		font-weight: 700;
		color: #7dd3fc;
	}
	.scroll-cue i {
		height: 42px;
		width: 1px;
		background: linear-gradient(180deg, #38bdf8 0%, transparent 100%);
		animation: pulse 1.6s ease-in-out infinite;
	}

	.cloud {
		position: absolute;
		z-index: 1;
		background: radial-gradient(ellipse at center, rgba(56, 189, 248, 0.18) 0%, rgba(14, 165, 233, 0.08) 50%, transparent 75%);
		filter: blur(14px);
		border-radius: 999px;
		pointer-events: none;
	}
	.cloud::before,
	.cloud::after {
		content: '';
		position: absolute;
		border-radius: 50%;
		background: inherit;
	}
	.cloud-a {
		width: 280px;
		height: 65px;
		top: 19%;
		left: -40px;
		animation: drift 18s ease-in-out infinite;
	}
	.cloud-a::before { width: 120px; height: 120px; left: 55px; bottom: 0; }
	.cloud-a::after { width: 95px; height: 95px; right: 35px; bottom: 0; }

	.cloud-b {
		width: 200px;
		height: 48px;
		top: 31%;
		right: -20px;
		opacity: 0.75;
		animation: drift 24s ease-in-out infinite reverse;
	}
	.cloud-b::before { width: 90px; height: 90px; left: 25px; bottom: 0; }
	.cloud-b::after { width: 70px; height: 70px; right: 20px; bottom: 0; }

	.cloud-c {
		width: 135px;
		height: 35px;
		top: 52%;
		left: 15%;
		opacity: 0.5;
	}
	.cloud-c::before { width: 60px; height: 60px; left: 18px; bottom: 0; }
	.cloud-c::after { width: 55px; height: 55px; right: 15px; bottom: 0; }

	.dock-zone {
		min-height: 100vh;
		background: #081023;
		padding: clamp(5rem, 10vw, 9rem) clamp(1.5rem, 8vw, 9rem);
		display: grid;
		grid-template-columns: 1.05fr 0.95fr;
		gap: clamp(3rem, 8vw, 8rem);
		align-items: center;
	}
	.step {
		font-size: 0.68rem;
		letter-spacing: 0.2em;
		color: #38bdf8;
		font-weight: 800;
	}
	h2 {
		font-family: 'Fredoka', 'Baloo 2', sans-serif;
		font-size: clamp(2.4rem, 6vw, 6.5rem);
		letter-spacing: -0.055em;
		line-height: 0.84;
		margin: 1.4rem 0 2rem;
		color: #f1f5f9;
	}
	.dock-copy p {
		max-width: 580px;
		line-height: 1.75;
		color: #94a3b8;
	}
	.secondary {
		margin-top: 1.2rem;
		border: 1.5px solid #38bdf8;
		border-radius: 999px;
		padding: 0.9rem 1.6rem;
		background: rgba(14, 165, 233, 0.12);
		color: #e0f2fe;
		font-weight: 750;
		cursor: pointer;
		box-shadow: 0 8px 25px rgba(2, 132, 199, 0.25);
		transition: all 0.2s ease;
		backdrop-filter: blur(8px);
	}
	.secondary:hover {
		background: rgba(56, 189, 248, 0.24);
		box-shadow: 0 12px 30px rgba(56, 189, 248, 0.35);
		transform: translateY(-1px);
	}
	.secondary span {
		margin-left: 1.4rem;
	}

	.status-panel {
		min-height: 500px;
		padding: 1.5rem;
		border: 1px solid rgba(56, 189, 248, 0.25);
		border-radius: 36px;
		background: linear-gradient(155deg, rgba(15, 23, 42, 0.85), rgba(30, 41, 59, 0.55));
		box-shadow: 0 35px 85px rgba(2, 6, 23, 0.5);
		display: flex;
		flex-direction: column;
		backdrop-filter: blur(16px);
	}
	.status-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		font-size: 0.64rem;
		font-weight: 800;
		color: #94a3b8;
	}
	.status-head b {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: #34d399;
		box-shadow: 0 0 0 6px rgba(52, 211, 153, 0.16);
	}
	.status-head b.active {
		animation: pulse-dot 1s infinite;
	}
	.status-orbit {
		flex: 1;
		display: grid;
		place-items: center;
		background: radial-gradient(circle, rgba(56, 189, 248, 0.4) 0 1px, transparent 2px);
		background-size: 28px 28px;
		mask-image: radial-gradient(circle, black, transparent 68%);
	}
	.status-panel > p {
		text-align: center;
		color: #94a3b8;
	}
	.status-panel > p.success {
		color: #34d399;
	}
	.status-panel > p.error {
		color: #f87171;
	}

	@keyframes float {
		0%, 100% { translate: 0 0; }
		50% { translate: 0 -10px; }
	}
	@keyframes droplet-float {
		0%, 100% { translate: 0 0; }
		50% { translate: 0 -13px; }
	}
	@keyframes droplet-shimmer {
		0%, 100% { transform: scale(0.985) rotate(-0.5deg); opacity: 0.92; }
		50% { transform: scale(1.015) rotate(0.5deg); opacity: 1; }
	}
	@keyframes caustic-shift {
		0%, 100% { transform: translate3d(-5%, -3%, 0) rotate(-3deg) scale(1.05); opacity: 0.55; }
		50% { transform: translate3d(6%, 4%, 0) rotate(4deg) scale(1.12); opacity: 0.95; }
	}
	@keyframes specular-sweep {
		0%, 100% { transform: translateX(-8%) rotate(-24deg); opacity: 0.7; }
		50% { transform: translateX(18%) rotate(-18deg); opacity: 1; }
	}
	@keyframes rim-breathe {
		0%, 100% { transform: scaleX(0.9) translateY(3px); opacity: 0.35; }
		50% { transform: scaleX(1.08) translateY(-2px); opacity: 0.78; }
	}
	@keyframes drift {
		0%, 100% { translate: 0; }
		50% { translate: 55px; }
	}
	@keyframes pulse {
		0%, 100% { transform: scaleY(0.45); transform-origin: top; opacity: 0.35; }
		50% { transform: scaleY(1); opacity: 1; }
	}
	@keyframes pulse-dot {
		50% { opacity: 0.35; transform: scale(0.75); }
	}

	@media (max-width: 900px) {
		.hero { height: 170vh; }
		.hero-copy { top: 20vh; }
		.dock-zone { grid-template-columns: 1fr; }
		.dock-copy { padding-right: 128px; }
		.status-panel { min-height: 390px; }
		.cloud { transform: scale(0.7); }
	}

	@media (max-width: 360px) {
		.status-head { font-size: 0.56rem; letter-spacing: 0.08em; }
	}

	@media (prefers-reduced-motion: reduce) {
		:global(html) { scroll-behavior: auto; }
		.droplet .plus { opacity: 1; transform: none; }
		/* Motion's cancelled entrance can restore its initial inline transform. */
		.hero-copy-motion { transform: none !important; opacity: 1 !important; }
		.hero-copy { transition: none; }
		.rim-light { animation: none !important; }
		.hero-copy-motion,
		.droplet,
		.droplet-motion,
		.caustic-svg,
		.specular-primary,
		.caustic-rim,
		.metallic-title,
		.cloud,
		.scroll-cue i,
		.astral-item {
			animation: none !important;
		}
		.status-head b.active { animation: none; }
		.droplet > *,
		.droplet {
			transition: none !important;
			animation: none !important;
		}
	}
</style>
