const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

export function consentOptions(state: string, redirectUri: string) {
	return {
		access_type: 'offline' as const,
		// Google accepts a space-separated value: always show account chooser,
		// then force a fresh consent response so a refresh token is returned.
		prompt: 'consent select_account',
		scope: [DRIVE_FILE_SCOPE],
		state,
		redirect_uri: redirectUri
	};
}
