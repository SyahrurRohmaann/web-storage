import { error } from '@sveltejs/kit';
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { env } from '$env/dynamic/private';
import { google } from 'googleapis';
import { oauthState } from '$lib/server/config';

export async function GET({ url, cookies }) {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const expectedState = oauthState(process.env.STORAGE_UPLOAD_KEY ?? env.STORAGE_UPLOAD_KEY);
	const cookieState = cookies.get('oauth_state');
	cookies.delete('oauth_state', { path: '/' });

	// state valid jika berasal dari cookie /oauth ATAU derivasi deterministik
	// dari STORAGE_UPLOAD_KEY (hash, bukan key mentah — aman dikirim via URL consent)
	if (!code || !state || (state !== cookieState && state !== expectedState)) {
		throw error(400, 'State OAuth tidak valid. Minta URL otorisasi yang baru.');
	}

	const clientId = env.GOOGLE_CLIENT_ID;
	const clientSecret = env.GOOGLE_CLIENT_SECRET;
	if (!clientId || !clientSecret) throw error(500, 'Server belum punya client OAuth');

	const oauth2 = new google.auth.OAuth2(clientId, clientSecret, `${url.origin}/oauth/callback`);
	const { tokens } = await oauth2.getToken(code);
	if (!tokens.refresh_token) {
		throw error(400, 'Google tidak mengembalikan refresh token. Ulangi consent (pilih akun lalu setujui).');
	}

	const path = env.REFRESH_TOKEN_FILE || '/app/.refresh-token';
	try {
		if (existsSync(path)) {
			const existing = readFileSync(path, 'utf8').trim();
			if (existing && existing !== tokens.refresh_token) {
				appendFileSync(`${path}.log`, `${new Date().toISOString()} rotated\n`);
			}
		}
		writeFileSync(path, `${tokens.refresh_token}\n`, { mode: 0o600 });
	} catch {
		throw error(500, 'Gagal menyimpan refresh token ke server');
	}

	return new Response(
		`<html><body style="font-family:sans-serif;max-width:32rem;margin:4rem auto;text-align:center">` +
			`<h2>✅ Berhasil</h2><p>Refresh token tersimpan di server. Upload sekarang pakai kuota akun Google lo.</p>` +
			`<p><a href="/">Kembali ke situs</a></p></body></html>`,
		{ headers: { 'content-type': 'text/html; charset=utf-8' } }
	);
}
