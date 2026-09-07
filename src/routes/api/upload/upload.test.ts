import { beforeEach, describe, expect, it, vi } from 'vitest';

const uploadFile = vi.fn();
vi.mock('$lib/server/googleDrive', () => ({ uploadFile }));

const importPost = async () => (await import('./+server')).POST;
const requestWith = (files: File[]) => {
	const body = new FormData();
	for (const file of files) body.append('files', file);
	return new Request('http://localhost/api/upload', {
		method: 'POST',
		headers: { 'content-length': '1' },
		body
	});
};

describe('POST /api/upload', () => {
	beforeEach(() => {
		vi.stubEnv('STORAGE_UPLOAD_KEY', 'test-key');
		uploadFile.mockReset();
	});
	it('returns 401 when the private upload key is missing', async () => {
		vi.stubEnv('STORAGE_UPLOAD_KEY', '');
		const POST = await importPost();
		const response = await POST({ request: requestWith([]) } as never);
		expect(response.status).toBe(401);
	});

	it('returns 401 when the private upload key is wrong', async () => {
		const POST = await importPost();
		const request = requestWith([]);
		request.headers.set('x-storage-key', 'wrong-key');
		const response = await POST({ request } as never);
		expect(response.status).toBe(401);
	});

	it('returns 413 before parsing an oversized multipart body', async () => {
		const POST = await importPost();
		const request = requestWith([]);
		request.headers.set('x-storage-key', 'test-key');
		request.headers.set('content-length', String(101 * 1024 * 1024 + 1));
		const response = await POST({ request } as never);
		expect(response.status).toBe(413);
	});

	it('rejects requests without a trustworthy content length', async () => {
		const POST = await importPost();
		const request = requestWith([]);
		request.headers.set('x-storage-key', 'test-key');
		request.headers.delete('content-length');
		const response = await POST({ request } as never);
		expect(response.status).toBe(411);
	});

	it('returns 400 when multipart data cannot be parsed', async () => {
		const POST = await importPost();
		const request = {
			headers: new Headers({ 'x-storage-key': 'test-key', 'content-length': '1' }),
			formData: vi.fn().mockRejectedValue(new Error('multipart parser detail'))
		};
		const response = await POST({ request } as never);
		expect(response.status).toBe(400);
		expect(await response.text()).not.toContain('multipart parser detail');
	});

	it('returns 400 when no files are sent', async () => {
		const POST = await importPost();
		const request = requestWith([]);
		request.headers.set('x-storage-key', 'test-key');
		const response = await POST({ request, platform: { env: { STORAGE_UPLOAD_KEY: 'test-key' } } } as never);
		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ ok: false, message: 'Pilih minimal satu file.' });
	});

	it('rejects more than one file per server request', async () => {
		const POST = await importPost();
		const request = requestWith([
			new File(['one'], 'one.txt', { type: 'text/plain' }),
			new File(['two'], 'two.txt', { type: 'text/plain' })
		]);
		request.headers.set('x-storage-key', 'test-key');
		const response = await POST({ request } as never);
		expect(response.status).toBe(400);
		expect(uploadFile).not.toHaveBeenCalled();
	});

	it('uploads valid files and returns safe metadata', async () => {
		uploadFile.mockResolvedValueOnce({ id: 'drive-1', name: 'hello.txt' });
		const POST = await importPost();
		const request = requestWith([new File(['hello'], 'hello.txt', { type: 'text/plain' })]);
		request.headers.set('x-storage-key', 'test-key');
		const response = await POST({ request } as never);
		expect(response.status).toBe(201);
		expect(uploadFile).toHaveBeenCalledOnce();
		expect(await response.json()).toEqual({
			ok: true,
			files: [{ id: 'drive-1', name: 'hello.txt' }]
		});
	});

	it('fails without leaking provider details to response or logs', async () => {
		const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		uploadFile.mockRejectedValueOnce(new Error('private key material and provider stack'));
		const POST = await importPost();
		const request = requestWith([new File(['hello'], 'hello.txt', { type: 'text/plain' })]);
		request.headers.set('x-storage-key', 'test-key');
		const response = await POST({ request } as never);
		expect(response.status).toBe(503);
		expect(await response.text()).not.toContain('private key');
		expect(log).toHaveBeenCalledWith('Drive upload failed.');
		log.mockRestore();
	});
});
