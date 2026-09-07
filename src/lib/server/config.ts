import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import type { OAuthConfig } from './oauthTypes';

export type { OAuthConfig } from './oauthTypes';
export type DriveConfig = { folderId: string; oAuth: OAuthConfig };

type EnvLike = Record<string, string | undefined>;

function readRefreshTokenFromFile(env: EnvLike): string {
	const path = env.REFRESH_TOKEN_FILE || '/app/.refresh-token';
	if (!existsSync(path)) return '';
	try {
		return readFileSync(path, 'utf8').trim();
	} catch {
		return '';
	}
}

export function readDriveConfig(env: EnvLike): DriveConfig {
	const folderId = env.GOOGLE_DRIVE_FOLDER_ID;
	const clientId = env.GOOGLE_CLIENT_ID;
	const clientSecret = env.GOOGLE_CLIENT_SECRET;
	const refreshToken = env.GOOGLE_REFRESH_TOKEN || readRefreshTokenFromFile(env);
	if (!folderId) throw new Error('Google Drive belum dikonfigurasi');
	if (!clientId || !clientSecret || !refreshToken) {
		throw new Error('OAuth Google belum lengkap (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / refresh token)');
	}
	return { folderId, oAuth: { clientId, clientSecret, refreshToken } };
}

/** state CSRF untuk consent flow: hanya pemegang STORAGE_UPLOAD_KEY bisa memicu consent */
export function oauthState(uploadKey: string | undefined): string {
	if (!uploadKey) throw new Error('STORAGE_UPLOAD_KEY belum diatur');
	return createHash('sha256').update(uploadKey).digest('hex').slice(0, 32);
}
