<script lang="ts">
	import { onMount } from 'svelte';
	import { animate } from 'motion';
	import 'lenis/dist/lenis.css';
	import Lenis from 'lenis';
	import { dropletRadii, easeInOutCubic, lerp, magneticOffset } from '$lib/animations/dropletMotion';
	import { heroVisuals } from '$lib/animations/heroVisuals';
	import {
		canUseSmoothScroll,
		createLenisConfig,
		calculateHeroScrollProgress
	} from '$lib/animations/smoothScroll';
	import { validateFiles } from '$lib/upload/validation';

	let hero: HTMLElement;
	let heroCopyEl: HTMLElement;
	let dropletEl: HTMLElement;
	let picker: HTMLInputElement;
	let scrollProgress = 0;
	let easedProgress = 0;
	let pointer = { x: 0, y: 0 };
	let targetPointer = { x: 0, y: 0 };
	let uploading = false;
	let uploadProgress = 0;
	let message = '';
	let messageType: 'success' | 'error' | '' = '';

	$: visual = heroVisuals(scrollProgress);
	$: easedProgress = easeInOutCubic(scrollProgress);
	$: blobRadius = dropletRadii(easedProgress);
	$: dropletX = pointer.x * (1 - easedProgress);
	$: dropletY = pointer.y * (1 - easedProgress);

	onMount(() => {
		let raf = 0;
		let lenis: Lenis | null = null;
		const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		if (!prefersReduced && heroCopyEl) {
			animate(
				heroCopyEl,
				{ opacity: [0, 1], y: [24, 0], scale: [0.95, 1] },
				{ duration: 0.85, ease: [0.22, 1.2, 0.36, 1] }
			);
		}

		const updateScroll = (currentScroll?: number) => {
			if (!hero) return;
			const scrollY =
				typeof currentScroll === 'number'
					? currentScroll
					: (lenis?.scroll ?? window.scrollY);
			scrollProgress = calculateHeroScrollProgress(
				scrollY,
				hero.offsetTop,
				hero.offsetHeight,
				window.innerHeight
			);
		};

		if (canUseSmoothScroll({ isBrowser: true, prefersReducedMotion: prefersReduced })) {
			lenis = new Lenis(createLenisConfig());
			lenis.on('scroll', (instance) => updateScroll(instance.scroll));
		}

		const onNativeScroll = () => {
			updateScroll();
		};

		const onResize = () => {
			if (lenis) lenis.resize();
			updateScroll();
		};

		const tick = (time: number) => {
			if (lenis) {
				lenis.raf(time);
			}
			if (!prefersReduced) {
				pointer = {
					x: pointer.x + (targetPointer.x - pointer.x) * 0.13,
					y: pointer.y + (targetPointer.y - pointer.y) * 0.13
				};
			} else {
				pointer = { x: 0, y: 0 };
			}
			raf = requestAnimationFrame(tick);
		};

		updateScroll();
		raf = requestAnimationFrame(tick);
		window.addEventListener('scroll', onNativeScroll, { passive: true });
		window.addEventListener('resize', onResize);

		return () => {
			if (lenis) {
				lenis.destroy();
				lenis = null;
			}
			window.removeEventListener('scroll', onNativeScroll);
			window.removeEventListener('resize', onResize);
			cancelAnimationFrame(raf);
		};
	});

	function followPointer(event: PointerEvent) {
		if (scrollProgress > 0.45) return;
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		targetPointer = magneticOffset(
			rect.left + rect.width / 2,
			rect.top + rect.height / 2,
			event.clientX,
			event.clientY,
			220
		);
	}

	function releasePointer() {
		targetPointer = { x: 0, y: 0 };
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
	<meta name="theme-color" content="#3fa9f5" />
</svelte:head>

<main>
	<section
		class="hero"
		aria-label="Hero dan area unggah"
		bind:this={hero}
		onpointermove={followPointer}
		onpointerleave={releasePointer}
		ondragover={(e) => e.preventDefault()}
		ondrop={onDrop}
	>
		<div class="cloud cloud-a"></div>
		<div class="cloud cloud-b"></div>
		<div class="cloud cloud-c"></div>

		<div
			bind:this={heroCopyEl}
			class="hero-copy"
			style={`opacity:${visual.titleOpacity};transform:translateY(${visual.titleY}px) scale(${1 - easedProgress * 0.12});pointer-events:${visual.titleOpacity < 0.05 ? 'none' : 'auto'}`}
		>
			<p class="eyebrow">personal cloud · simple by design</p>
			<h1 class="metallic-title">storage</h1>
			<p class="subtitle">jatuhkan file, biarkan langit yang menyimpannya.</p>
		</div>

		<button
			bind:this={dropletEl}
			class:docked={scrollProgress > 0.88}
			class="droplet"
			type="button"
			onclick={openPicker}
			aria-label="Pilih file untuk diunggah"
			style={`--progress:${easedProgress};--radius:${blobRadius};--mx:${dropletX}px;--my:${dropletY}px;--rise:${lerp(0, -215, easedProgress)}px;--droplet-scale:${visual.dropletScale}`}
		>
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
			<span class="specular-primary" aria-hidden="true"></span>

			<!-- Secondary specular pinpoint sparkle -->
			<span class="specular-secondary" aria-hidden="true"></span>

			<!-- Lower rim caustic bounce reflection -->
			<span class="caustic-rim" aria-hidden="true"></span>

			<!-- Internal liquid meniscus shimmer -->
			<span class="liquid-shimmer" aria-hidden="true"></span>

			<!-- Morphing "+" symbol for upload button -->
			<span class="plus" aria-hidden="true">+</span>

			<!-- Upload fluid fill -->
			{#if uploading}
				<span class="fill" style={`height:${uploadProgress}%`}></span>
			{/if}
		</button>

		<div class="scroll-cue" style={`opacity:${1 - scrollProgress * 4}`}>
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
			<div class="status-head"><span>storage status</span><b class:active={uploading}></b></div>
			<div class="status-orbit">
				<div class="mini-drop"><span>{uploading ? `${uploadProgress}%` : '+'}</span></div>
			</div>
			{#if message}<p class:success={messageType === 'success'} class:error={messageType === 'error'}>{message}</p>{:else}<p>siap menerima file.</p>{/if}
		</div>
	</section>
</main>

<style>
	:global(*) { box-sizing: border-box; }
	:global(html) { background: #8fd3ff; }
	:global(body) { margin: 0; font-family: 'Inter', system-ui, sans-serif; color: #073b6f; background: #8fd3ff; }
	:global(button) { font: inherit; }

	.hero {
		height: 190vh;
		min-height: 1050px;
		position: relative;
		overflow: clip;
		background: linear-gradient(180deg, #e8f6ff 0%, #bfe7ff 42%, #8fd3ff 100%);
	}
	.hero::after {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		background: radial-gradient(circle at 50% 28%, rgba(255, 255, 255, 0.6), transparent 42%);
		opacity: 0.65;
	}

	.hero-copy {
		position: sticky;
		top: 18vh;
		width: min(980px, 92vw);
		margin: auto;
		text-align: center;
		z-index: 2;
		transform-origin: 50% 20%;
		transition: opacity 0.08s linear;
	}
	.eyebrow {
		letter-spacing: 0.22em;
		text-transform: uppercase;
		font-size: 0.72rem;
		font-weight: 700;
		margin: 0 0 1.2rem;
		opacity: 0.68;
		color: #0d47a1;
	}

	/* Metallic balloon title font styling */
	.metallic-title {
		font-family: 'Fredoka', 'Baloo 2', 'Arial Rounded MT Bold', sans-serif;
		font-size: clamp(5rem, 16vw, 10.5rem);
		font-weight: 700;
		line-height: 0.82;
		margin: 0;
		letter-spacing: -0.04em;
		background: linear-gradient(
			165deg,
			#ffffff 0%,
			#e0f2ff 14%,
			#72bdf8 30%,
			#1b74d1 50%,
			#083e78 70%,
			#4ca3f5 86%,
			#ffffff 100%
		);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		filter: drop-shadow(0 2px 1px rgba(255, 255, 255, 0.95))
			drop-shadow(0 14px 28px rgba(11, 76, 140, 0.3))
			drop-shadow(0 32px 64px rgba(11, 76, 140, 0.16));
		transform-origin: center bottom;
	}

	.subtitle {
		font-size: clamp(0.95rem, 2vw, 1.22rem);
		letter-spacing: 0.03em;
		opacity: 0.75;
		margin-top: 1.8rem;
		color: #073b6f;
	}

	/* Substantially larger, realistically water-like droplet */
	.droplet {
		--progress: 0;
		--droplet-scale: 1.5;
		position: sticky;
		z-index: 4;
		top: calc(66vh - 65px);
		margin: 0 auto;
		margin-top: 30vh;
		display: grid;
		place-items: center;
		width: clamp(140px, 17vw, 190px);
		aspect-ratio: 1;
		border-radius: var(--radius);
		cursor: pointer;
		color: white;
		overflow: hidden;
		user-select: none;
		-webkit-user-select: none;

		/* Optical water refraction and transparency */
		background: radial-gradient(
			132% 132% at 32% 28%,
			rgba(255, 255, 255, 0.48) 0%,
			rgba(182, 234, 255, 0.3) 26%,
			rgba(56, 182, 255, 0.44) 66%,
			rgba(24, 119, 242, 0.72) 100%
		);
		backdrop-filter: blur(8px) saturate(155%) brightness(106%);
		-webkit-backdrop-filter: blur(8px) saturate(155%) brightness(106%);

		/* Layered realistic water shadows and Fresnel inner rims */
		border: 1.5px solid rgba(255, 255, 255, 0.72);
		box-shadow:
			0 36px 72px -10px rgba(11, 76, 140, 0.34),
			0 16px 32px -4px rgba(11, 76, 140, 0.22),
			0 0 28px rgba(114, 198, 255, 0.38),
			inset 8px 10px 18px rgba(255, 255, 255, 0.58),
			inset 2px 2px 6px rgba(255, 255, 255, 0.88),
			inset -10px -12px 24px rgba(7, 59, 111, 0.32),
			inset -4px -4px 10px rgba(7, 59, 111, 0.22);

		transform: translate(var(--mx), calc(var(--my) + var(--rise)))
			rotate(calc((1 - var(--progress)) * 26deg))
			scale(var(--droplet-scale));
		transform-origin: center center;
		transition:
			border-radius 0.12s linear,
			border-color 0.2s ease,
			box-shadow 0.3s ease;
		animation: float 4.2s ease-in-out infinite;
	}

	.droplet:hover {
		box-shadow:
			0 42px 80px -6px rgba(11, 76, 140, 0.44),
			0 20px 40px -4px rgba(11, 76, 140, 0.3),
			0 0 36px rgba(114, 198, 255, 0.55),
			inset 10px 12px 22px rgba(255, 255, 255, 0.72),
			inset 2px 2px 6px rgba(255, 255, 255, 0.95),
			inset -10px -12px 24px rgba(7, 59, 111, 0.28),
			0 0 0 10px rgba(255, 255, 255, 0.24);
	}

	.droplet.docked {
		border-radius: 50%;
		animation: none;
		background: linear-gradient(145deg, #42a5f5, #1565c0);
		border: 2px solid rgba(255, 255, 255, 0.9);
		box-shadow:
			0 16px 36px rgba(13, 71, 161, 0.36),
			0 6px 14px rgba(13, 71, 161, 0.22),
			inset 0 2px 5px rgba(255, 255, 255, 0.55);
	}

	/* Layer 1: Internal caustic & light refraction */
	.water-caustic {
		position: absolute;
		inset: 0;
		pointer-events: none;
		overflow: hidden;
		border-radius: inherit;
		opacity: calc(1 - var(--progress));
		transition: opacity 0.2s ease;
	}
	.caustic-svg {
		width: 100%;
		height: 100%;
		filter: blur(2px);
	}

	/* Layer 2: Main primary curved specular dome highlight */
	.specular-primary {
		position: absolute;
		width: 44%;
		height: 25%;
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
		pointer-events: none;
		opacity: calc(1 - var(--progress));
		transition: opacity 0.2s ease;
	}

	/* Layer 3: Secondary specular pinpoint sparkle */
	.specular-secondary {
		position: absolute;
		width: 7%;
		height: 7%;
		left: 64%;
		top: 24%;
		border-radius: 50%;
		background: radial-gradient(circle, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0) 100%);
		filter: blur(0.4px);
		pointer-events: none;
		opacity: calc(1 - var(--progress));
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
		pointer-events: none;
		opacity: calc(1 - var(--progress));
		transition: opacity 0.2s ease;
	}

	/* Layer 5: Liquid shimmer */
	.liquid-shimmer {
		position: absolute;
		inset: 4px;
		border-radius: inherit;
		background: linear-gradient(
			130deg,
			rgba(255, 255, 255, 0.3) 0%,
			transparent 40%,
			rgba(255, 255, 255, 0.15) 60%,
			transparent 100%
		);
		pointer-events: none;
		opacity: calc(1 - var(--progress));
		transition: opacity 0.2s ease;
	}

	/* Morphing "+" symbol */
	.plus {
		position: relative;
		z-index: 3;
		font-weight: 300;
		font-size: clamp(2.4rem, 3.4vw, 3.4rem);
		line-height: 1;
		color: #ffffff;
		opacity: var(--progress);
		transform: scale(calc(0.4 + var(--progress) * 0.6));
		transition: transform 0.15s ease, opacity 0.15s ease;
		text-shadow: 0 2px 6px rgba(0, 48, 96, 0.35);
	}

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
	}
	.scroll-cue i {
		height: 42px;
		width: 1px;
		background: #0b4c8c;
		animation: pulse 1.6s ease-in-out infinite;
	}

	.cloud {
		position: absolute;
		z-index: 1;
		background: rgba(255, 255, 255, 0.55);
		filter: blur(1px);
		border-radius: 999px;
	}
	.cloud::before,
	.cloud::after {
		content: '';
		position: absolute;
		border-radius: 50%;
		background: inherit;
	}
	.cloud-a {
		width: 250px;
		height: 55px;
		top: 19%;
		left: -40px;
		animation: drift 18s ease-in-out infinite;
	}
	.cloud-a::before { width: 110px; height: 110px; left: 55px; bottom: 0; }
	.cloud-a::after { width: 85px; height: 85px; right: 35px; bottom: 0; }

	.cloud-b {
		width: 180px;
		height: 40px;
		top: 31%;
		right: -20px;
		opacity: 0.75;
		animation: drift 24s ease-in-out infinite reverse;
	}
	.cloud-b::before { width: 80px; height: 80px; left: 25px; bottom: 0; }
	.cloud-b::after { width: 60px; height: 60px; right: 20px; bottom: 0; }

	.cloud-c {
		width: 115px;
		height: 28px;
		top: 52%;
		left: 15%;
		opacity: 0.42;
	}
	.cloud-c::before { width: 50px; height: 50px; left: 18px; bottom: 0; }
	.cloud-c::after { width: 45px; height: 45px; right: 15px; bottom: 0; }

	.dock-zone {
		min-height: 100vh;
		background: #f8fcff;
		padding: clamp(5rem, 10vw, 9rem) clamp(1.5rem, 8vw, 9rem);
		display: grid;
		grid-template-columns: 1.05fr 0.95fr;
		gap: clamp(3rem, 8vw, 8rem);
		align-items: center;
	}
	.step {
		font-size: 0.68rem;
		letter-spacing: 0.2em;
		color: #1e88e5;
		font-weight: 800;
	}
	h2 {
		font-family: 'Fredoka', 'Baloo 2', sans-serif;
		font-size: clamp(3rem, 7vw, 6.5rem);
		letter-spacing: -0.055em;
		line-height: 0.84;
		margin: 1.4rem 0 2rem;
		color: #073b6f;
	}
	.dock-copy p {
		max-width: 580px;
		line-height: 1.75;
		color: #52708d;
	}
	.secondary {
		margin-top: 1.2rem;
		border: 1.5px solid #a9d9f7;
		border-radius: 999px;
		padding: 0.9rem 1.6rem;
		background: white;
		color: #07539a;
		font-weight: 750;
		cursor: pointer;
		box-shadow: 0 8px 25px rgba(30, 136, 229, 0.12);
		transition: all 0.2s ease;
	}
	.secondary:hover {
		background: #f0f8ff;
		box-shadow: 0 12px 30px rgba(30, 136, 229, 0.2);
		transform: translateY(-1px);
	}
	.secondary span {
		margin-left: 1.4rem;
	}

	.status-panel {
		min-height: 500px;
		padding: 1.5rem;
		border: 1px solid rgba(63, 169, 245, 0.25);
		border-radius: 36px;
		background: linear-gradient(155deg, rgba(232, 246, 255, 0.8), rgba(143, 211, 255, 0.36));
		box-shadow: 0 35px 85px rgba(36, 123, 183, 0.18);
		display: flex;
		flex-direction: column;
	}
	.status-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		font-size: 0.64rem;
		font-weight: 800;
	}
	.status-head b {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: #55c990;
		box-shadow: 0 0 0 6px rgba(85, 201, 144, 0.12);
	}
	.status-head b.active {
		animation: pulse-dot 1s infinite;
	}
	.status-orbit {
		flex: 1;
		display: grid;
		place-items: center;
		background: radial-gradient(circle, rgba(255, 255, 255, 0.9) 0 1px, transparent 2px);
		background-size: 28px 28px;
		mask-image: radial-gradient(circle, black, transparent 68%);
	}
	.mini-drop {
		width: 145px;
		aspect-ratio: 1;
		border-radius: 48% 52% 55% 45%;
		display: grid;
		place-items: center;
		color: #fff;
		font-size: 3.3rem;
		background: linear-gradient(145deg, #70d2ff, #1686e9);
		box-shadow: inset 15px 15px 30px rgba(255, 255, 255, 0.34), 0 32px 65px rgba(30, 136, 229, 0.32);
		animation: float 4s ease-in-out infinite;
	}
	.status-panel > p {
		text-align: center;
		color: #52708d;
	}
	.status-panel > p.success {
		color: #087b50;
	}
	.status-panel > p.error {
		color: #bc3e56;
	}

	@keyframes float {
		0%, 100% { translate: 0 0; }
		50% { translate: 0 -10px; }
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

	@media (max-width: 760px) {
		.hero { height: 170vh; }
		.hero-copy { top: 22vh; }
		.droplet { top: 64vh; }
		.dock-zone { grid-template-columns: 1fr; }
		.status-panel { min-height: 390px; }
		.cloud { transform: scale(0.7); }
	}

	@media (prefers-reduced-motion: reduce) {
		:global(html) { scroll-behavior: auto; }
		.droplet,
		.mini-drop,
		.metallic-title,
		.cloud,
		.scroll-cue i {
			animation: none !important;
		}
		.droplet {
			transition: none !important;
		}
	}
</style>
