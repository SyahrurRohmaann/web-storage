import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { google } from 'googleapis';
import { oauthState } from '$lib/server/config';

export async function GET({ url, cookies }) {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const expectedState = cookies.get('oauth_state');
	cookies.delete('oauth_state', { path: '/' });

	if (!code || !state || !expectedState || state !== expectedState) {
		throw error(400, 'State OAuth tidak valid. Ulangi dari /oauth?key=... ');
	}

	const clientId = env.GOOGLE_CLIENT_ID;
	const clientSecret = env.GOOGLE_CLIENT_SECRET;
	if (!clientId || !clientSecret) throw error(500, 'Server belum punya client OAuth');

	const oauth2 = new google.auth.OAuth2(clientId, clientSecret, `${url.origin}/oauth/callback`);
	const { tokens } = await oauth2.getToken(code);
	if (!tokens.refresh_token) {
		throw error(400, 'Google tidak mengembalikan refresh token. Pastikan memilih akun & menyetujui akses, lalu ulangi.');
	}

	return new Response(
		`<html><body style="font-family:sans-serif;max-width:32rem;margin:4rem auto"><h2>Refresh token diterima</h2>` +
			`<p>Refresh token disimpan di bawah (jangan dibagikan). Kirim ke server atau tempel ke <code>.env</code> VPS sebagai <code>GOOGLE_REFRESH_TOKEN</code>.</p>` +
			`<textarea readonly style="width:100%;height:6rem" onclick="this.select()">${tokens.refresh_token}</textarea>` +
			`</body></html>`,
		{ headers: { 'content-type': 'text/html; charset=utf-8' } }
	);
}
