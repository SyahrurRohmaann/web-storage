export type DriveCredentials = { client_email: string; private_key: string };
export type DriveConfig = { credentials: DriveCredentials; folderId: string };

type EnvLike = Record<string, string | undefined>;

export function readDriveConfig(env: EnvLike): DriveConfig {
	const raw = env.GOOGLE_SERVICE_ACCOUNT_JSON;
	const folderId = env.GOOGLE_DRIVE_FOLDER_ID;
	if (!raw || !folderId) throw new Error('Google Drive belum dikonfigurasi');

	let parsed: Partial<DriveCredentials>;
	try {
		parsed = JSON.parse(raw);
	} catch {
		throw new Error('Kredensial Google Drive tidak valid');
	}
	if (!parsed.client_email || !parsed.private_key) {
		throw new Error('Kredensial Google Drive tidak lengkap');
	}
	return {
		credentials: {
			client_email: parsed.client_email,
			private_key: parsed.private_key.replace(/\\n/g, '\n')
		},
		folderId
	};
}
