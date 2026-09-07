<script lang="ts">
	import { onMount } from 'svelte';
	import { clamp01, dropletRadii, easeInOutCubic, lerp, magneticOffset } from '$lib/animations/dropletMotion';
	import { validateFiles } from '$lib/upload/validation';

	let hero: HTMLElement;
	let picker: HTMLInputElement;
	let scrollProgress = 0;
	let easedProgress = 0;
	let pointer = { x: 0, y: 0 };
	let targetPointer = { x: 0, y: 0 };
	let uploading = false;
	let uploadProgress = 0;
	let message = '';
	let messageType: 'success' | 'error' | '' = '';
	let uploadKey = '';

	$: easedProgress = easeInOutCubic(scrollProgress);
	$: blobRadius = dropletRadii(easedProgress);
	$: dropletX = pointer.x * (1 - easedProgress);
	$: dropletY = pointer.y * (1 - easedProgress);

	onMount(() => {
		let frame = 0;
		let raf = 0;
		const updateScroll = () => {
			frame = 0;
			const max = Math.max(1, hero.offsetHeight - window.innerHeight);
			scrollProgress = clamp01((window.scrollY - hero.offsetTop) / max);
		};
		const onScroll = () => {
			if (!frame) frame = requestAnimationFrame(updateScroll);
		};
		const tick = () => {
			pointer = {
				x: pointer.x + (targetPointer.x - pointer.x) * 0.13,
				y: pointer.y + (targetPointer.y - pointer.y) * 0.13
			};
			raf = requestAnimationFrame(tick);
		};
		updateScroll();
		tick();
		window.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', updateScroll);
		return () => {
			window.removeEventListener('scroll', onScroll);
			window.removeEventListener('resize', updateScroll);
			cancelAnimationFrame(raf);
			if (frame) cancelAnimationFrame(frame);
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
			180
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
		if (!uploadKey) {
			messageType = 'error';
			message = 'Masukkan kunci upload privat terlebih dahulu.';
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
			xhr.setRequestHeader('x-storage-key', uploadKey);
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
	<section class="hero" aria-label="Hero dan area unggah" bind:this={hero} onpointermove={followPointer} onpointerleave={releasePointer} ondragover={(e) => e.preventDefault()} ondrop={onDrop}>
		<div class="cloud cloud-a"></div>
		<div class="cloud cloud-b"></div>
		<div class="cloud cloud-c"></div>
		<div class="hero-copy" style={`opacity:${1 - easedProgress * 0.92};transform:translateY(${-80 * easedProgress}px) scale(${1 - easedProgress * 0.12})`}>
			<p class="eyebrow">personal cloud · simple by design</p>
			<h1>storage</h1>
			<p class="subtitle">jatuhkan file, biarkan langit yang menyimpannya.</p>
		</div>

		<button
			class:docked={scrollProgress > 0.9}
			class="droplet"
			type="button"
			onclick={openPicker}
			aria-label="Pilih file untuk diunggah"
			style={`--progress:${easedProgress};--radius:${blobRadius};--mx:${dropletX}px;--my:${dropletY}px;--rise:${lerp(0, -205, easedProgress)}px`}
		>
			<span class="shine"></span>
			<span class="plus" aria-hidden="true">+</span>
			{#if uploading}<span class="fill" style={`height:${uploadProgress}%`}></span>{/if}
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
			<p>Pilih hingga 10 file sekaligus, masing-masing maksimal 100 MB. File bergerak langsung dari browser ke endpoint privat, lalu diteruskan ke folder Drive.</p>
			<label class="key-field">
				<span>kunci upload privat</span>
				<input bind:value={uploadKey} type="password" autocomplete="off" placeholder="masukkan kunci" />
			</label>
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
	:global(html) { scroll-behavior: smooth; background: #8fd3ff; }
	:global(body) { margin: 0; font-family: 'Inter', system-ui, sans-serif; color: #073b6f; background: #8fd3ff; }
	:global(button) { font: inherit; }
	.hero { height: 190vh; min-height: 1050px; position: relative; overflow: clip; background: linear-gradient(180deg,#e8f6ff 0%,#bfe7ff 42%,#8fd3ff 100%); }
	.hero::after { content:''; position:absolute; inset:0; pointer-events:none; background:radial-gradient(circle at 50% 30%,rgba(255,255,255,.55),transparent 36%); opacity:.5; }
	.hero-copy { position:sticky; top:20vh; width:min(980px,90vw); margin:auto; text-align:center; z-index:2; transform-origin:50% 20%; }
	.eyebrow { letter-spacing:.22em; text-transform:uppercase; font-size:.7rem; font-weight:700; margin:0 0 1.2rem; opacity:.65; }
	h1 { font-family:'Baloo 2','Arial Rounded MT Bold',sans-serif; font-size:clamp(5rem,16vw,10rem); line-height:.78; margin:0; letter-spacing:-.065em; color:#0b4c8c; text-shadow:0 4px 0 rgba(255,255,255,.9),0 22px 45px rgba(16,105,170,.2); animation:arrive .9s cubic-bezier(.2,1.5,.4,1) both; }
	.subtitle { font-size:clamp(.95rem,2vw,1.2rem); letter-spacing:.03em; opacity:.7; margin-top:2rem; }
	.droplet { --progress:0; position:sticky; z-index:4; top:calc(72vh - 48px); margin:0 auto; margin-top:35vh; display:grid; place-items:center; width:clamp(84px,10vw,112px); aspect-ratio:1; border:1px solid rgba(255,255,255,.75); cursor:pointer; color:white; overflow:hidden; border-radius:var(--radius); background:linear-gradient(145deg,rgba(120,211,255,.77),#1e88e5); box-shadow:inset 12px 14px 22px rgba(255,255,255,.38),inset -11px -14px 22px rgba(2,74,150,.23),0 25px 50px rgba(10,93,160,.28); transform:translate(calc(var(--mx)),calc(var(--my) + var(--rise))) rotate(calc((1 - var(--progress)) * 38deg)) scaleX(calc(.88 + var(--progress) * .12)); transition:box-shadow .25s ease,border-radius .08s linear; animation:float 3.5s ease-in-out infinite; }
	.droplet:hover { box-shadow:inset 12px 14px 22px rgba(255,255,255,.48),inset -11px -14px 22px rgba(2,74,150,.18),0 28px 60px rgba(10,93,160,.4),0 0 0 10px rgba(255,255,255,.16); }
	.droplet.docked { border-radius:50%; animation:none; }
	.shine { position:absolute; width:27%; height:17%; border-radius:50%; background:rgba(255,255,255,.7); filter:blur(2px); left:19%; top:18%; transform:rotate(-24deg); opacity:calc(1 - var(--progress)); }
	.plus { position:relative; z-index:3; font-weight:300; font-size:2.8rem; line-height:1; opacity:var(--progress); transform:scale(calc(.35 + var(--progress) * .65)); }
	.fill { position:absolute; z-index:1; inset:auto 0 0; background:linear-gradient(180deg,#47c8ff,#0877df); transition:height .12s linear; }
	.scroll-cue { position:absolute; z-index:2; top:87vh; left:50%; transform:translateX(-50%); display:grid; gap:.6rem; justify-items:center; text-transform:uppercase; letter-spacing:.18em; font-size:.58rem; font-weight:700; }
	.scroll-cue i { height:42px; width:1px; background:#0b4c8c; animation:pulse 1.6s ease-in-out infinite; }
	.cloud { position:absolute; z-index:1; background:rgba(255,255,255,.55); filter:blur(1px); border-radius:999px; }
	.cloud::before,.cloud::after { content:''; position:absolute; border-radius:50%; background:inherit; }
	.cloud-a { width:250px;height:55px;top:19%;left:-40px;animation:drift 18s ease-in-out infinite; }
	.cloud-a::before{width:110px;height:110px;left:55px;bottom:0}.cloud-a::after{width:85px;height:85px;right:35px;bottom:0}
	.cloud-b { width:180px;height:40px;top:31%;right:-20px;opacity:.75;animation:drift 24s ease-in-out infinite reverse; }
	.cloud-b::before{width:80px;height:80px;left:25px;bottom:0}.cloud-b::after{width:60px;height:60px;right:20px;bottom:0}
	.cloud-c { width:115px;height:28px;top:52%;left:15%;opacity:.42; }
	.cloud-c::before{width:50px;height:50px;left:18px;bottom:0}.cloud-c::after{width:45px;height:45px;right:15px;bottom:0}
	.dock-zone { min-height:100vh; background:#f8fcff; padding:clamp(5rem,10vw,9rem) clamp(1.5rem,8vw,9rem); display:grid; grid-template-columns:1.05fr .95fr; gap:clamp(3rem,8vw,8rem); align-items:center; }
	.step { font-size:.68rem; letter-spacing:.2em; color:#1e88e5; font-weight:800; }
	h2 { font-family:'Baloo 2',sans-serif; font-size:clamp(3rem,7vw,6.5rem); letter-spacing:-.055em; line-height:.84; margin:1.4rem 0 2rem; color:#073b6f; }
	.dock-copy p { max-width:580px; line-height:1.75; color:#52708d; }
	.key-field { display:grid; gap:.55rem; max-width:430px; margin-top:1.6rem; }
	.key-field span { font-size:.67rem; letter-spacing:.16em; text-transform:uppercase; font-weight:800; color:#1e88e5; }
	.key-field input { width:100%; border:1px solid #b9def5; border-radius:16px; padding:.9rem 1rem; background:rgba(255,255,255,.8); color:#073b6f; box-shadow:inset 0 1px 0 #fff; }
	.key-field input:focus { outline:3px solid rgba(63,169,245,.22); border-color:#3fa9f5; }
	.secondary { margin-top:1.2rem; border:1px solid #a9d9f7; border-radius:999px; padding:.9rem 1.4rem; background:white; color:#07539a; font-weight:750; cursor:pointer; box-shadow:0 8px 25px rgba(30,136,229,.1); }
	.secondary span { margin-left:1.4rem; }
	.status-panel { min-height:500px; padding:1.5rem; border:1px solid rgba(63,169,245,.25); border-radius:36px; background:linear-gradient(155deg,rgba(232,246,255,.8),rgba(143,211,255,.36)); box-shadow:0 35px 85px rgba(36,123,183,.18); display:flex; flex-direction:column; }
	.status-head { display:flex; align-items:center; justify-content:space-between; letter-spacing:.14em; text-transform:uppercase; font-size:.64rem; font-weight:800; }
	.status-head b { width:9px;height:9px;border-radius:50%;background:#55c990;box-shadow:0 0 0 6px rgba(85,201,144,.12); }.status-head b.active{animation:pulse-dot 1s infinite}
	.status-orbit { flex:1; display:grid; place-items:center; background:radial-gradient(circle,rgba(255,255,255,.9) 0 1px,transparent 2px); background-size:28px 28px; mask-image:radial-gradient(circle,black,transparent 68%); }
	.mini-drop { width:145px; aspect-ratio:1; border-radius:48% 52% 55% 45%; display:grid; place-items:center; color:#fff; font-size:3.3rem; background:linear-gradient(145deg,#70d2ff,#1686e9); box-shadow:inset 15px 15px 30px rgba(255,255,255,.34),0 32px 65px rgba(30,136,229,.32); animation:float 4s ease-in-out infinite; }
	.status-panel>p { text-align:center; color:#52708d; }.status-panel>p.success{color:#087b50}.status-panel>p.error{color:#bc3e56}
	@keyframes arrive { from { opacity:0; transform:translateY(35px) scale(.88) } to { opacity:1; transform:none } }
	@keyframes float { 0%,100%{translate:0 0}50%{translate:0 -9px} }
	@keyframes drift { 0%,100%{translate:0}50%{translate:55px} }
	@keyframes pulse { 0%,100%{transform:scaleY(.45);transform-origin:top;opacity:.35}50%{transform:scaleY(1);opacity:1} }
	@keyframes pulse-dot { 50%{opacity:.35;transform:scale(.75)} }
	@media(max-width:760px){.hero{height:170vh}.hero-copy{top:24vh}.droplet{top:68vh}.dock-zone{grid-template-columns:1fr}.status-panel{min-height:390px}.cloud{transform:scale(.7)} }
	@media(prefers-reduced-motion:reduce){:global(html){scroll-behavior:auto}.droplet,.mini-drop,h1,.cloud,.scroll-cue i{animation:none!important}.droplet{transition:none}}
</style>
