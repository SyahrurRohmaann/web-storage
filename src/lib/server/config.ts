export type OAuthConfig = { clientId: string; clientSecret: string; refreshToken: string };
export type DriveConfig = { folderId: string; oAuth: OAuthConfig };

type EnvLike = Record<string, string | undefined>;

export function readDriveConfig(env: EnvLike): DriveConfig {
	const folderId = env.GOOGLE_DRIVE_FOLDER_ID;
	const clientId = env.GOOGLE_CLIENT_ID;
	const clientSecret = env.GOOGLE_CLIENT_SECRET;
	const refreshToken = env.GOOGLE_REFRESH_TOKEN;
	if (!folderId) throw new Error('Google Drive belum dikonfigurasi');
	if (!clientId || !clientSecret || !refreshToken) {
		throw new Error('OAuth Google belum lengkap (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN)');
	}
	return { folderId, oAuth: { clientId, clientSecret, refreshToken } };
}
