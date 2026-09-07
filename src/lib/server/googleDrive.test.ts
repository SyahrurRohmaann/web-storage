import { describe, expect, it, vi } from 'vitest';

const create = vi.fn().mockResolvedValue({ data: { id: 'drive-9', name: 'note.txt' } });

vi.mock('googleapis', () => ({
	google: {
		auth: { GoogleAuth: vi.fn() },
		drive: vi.fn(() => ({ files: { create } }))
	}
}));

vi.mock('$env/dynamic/private', () => ({
	env: {
		GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({ client_email: 'a@b.c', private_key: 'k' }),
		GOOGLE_DRIVE_FOLDER_ID: 'folder-1'
	}
}));

describe('uploadFile', () => {
	it('passes supportsAllDrives so shared-drive folders accept uploads', async () => {
		const { uploadFile } = await import('./googleDrive');
		const result = await uploadFile(new File(['hi'], 'note.txt', { type: 'text/plain' }));
		expect(result).toEqual({ id: 'drive-9', name: 'note.txt' });
		expect(create.mock.calls[0][0].supportsAllDrives).toBe(true);
		expect(create.mock.calls[0][0].requestBody.parents).toEqual(['folder-1']);
	});
});
