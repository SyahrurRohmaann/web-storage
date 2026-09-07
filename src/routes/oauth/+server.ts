import { error, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { google } from 'googleapis';
import { oauthState } from '$lib/server/config';

const scopes = ['https://www.googleapis.com/auth/drive.file'];

/** Mulai consent flow. Hanya pemegang STORAGE_UPLOAD_KEY (via query ?key=) yang boleh. */
export async function GET({ url, cookies }) {
	const key = url.searchParams.get('key');
	if (!key || key !== (process.env.STORAGE_UPLOAD_KEY ?? env.STORAGE_UPLOAD_KEY)) {
		throw error(404, 'Not found');
	}
	const clientId = env.GOOGLE_CLIENT_ID;
	const clientSecret = env.GOOGLE_CLIENT_SECRET;
	if (!clientId || !clientSecret) throw error(500, 'GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET belum diatur di server');

	const redirectUri = `${url.origin}/oauth/callback`;
	const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
	const state = oauthState(process.env.STORAGE_UPLOAD_KEY ?? env.STORAGE_UPLOAD_KEY);
	cookies.set('oauth_state', state, { httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 600 });

	const consentUrl = oauth2.generateAuthUrl({
		access_type: 'offline',
		prompt: 'consent',
		scope: scopes,
		state,
		redirect_uri: redirectUri
	});
	throw redirect(302, consentUrl);
}
