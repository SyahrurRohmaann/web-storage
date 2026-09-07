import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { uploadFile } from '$lib/server/googleDrive';
import { validateFiles } from '$lib/upload/validation';

export const POST: RequestHandler = async ({ request }) => {
	const expectedKey = process.env.STORAGE_UPLOAD_KEY ?? env.STORAGE_UPLOAD_KEY;
	const suppliedKey = request.headers.get('x-storage-key');
	if (!expectedKey || suppliedKey !== expectedKey) {
		return json({ ok: false, message: 'Kunci upload tidak valid.' }, { status: 401 });
	}
	const rawLength = request.headers.get('content-length');
	if (!rawLength || !/^\d+$/.test(rawLength)) {
		return json({ ok: false, message: 'Panjang permintaan wajib diketahui.' }, { status: 411 });
	}
	const contentLength = Number(rawLength);
	if (!Number.isSafeInteger(contentLength) || contentLength > 101 * 1024 * 1024) {
		return json({ ok: false, message: 'Permintaan terlalu besar.' }, { status: 413 });
	}

	let form: FormData;
	try {
		form = await request.formData();
	} catch {
		return json({ ok: false, message: 'Format upload tidak valid.' }, { status: 400 });
	}
	const files = form.getAll('files').filter((value): value is File => value instanceof File);
	if (files.length > 1) {
		return json({ ok: false, message: 'Endpoint menerima satu file per permintaan.' }, { status: 400 });
	}
	const validation = validateFiles(files, undefined, 1);
	if (!validation.ok) return json(validation, { status: 400 });

	try {
		const uploaded = await uploadFile(files[0]);
		return json({ ok: true, files: [uploaded] }, { status: 201 });
	} catch {
		console.error('Drive upload failed.');
		return json(
			{ ok: false, message: 'Upload belum dapat diproses. Periksa konfigurasi server dan coba lagi.' },
			{ status: 503 }
		);
	}
};
