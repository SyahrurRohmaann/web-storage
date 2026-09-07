import { describe, expect, it } from 'vitest';
import { consentOptions } from './oauthOptions';

describe('consentOptions', () => {
	it('forces Google account selection before asking for consent', () => {
		expect(consentOptions('csrf-state', 'https://storecloud.my.id/oauth/callback')).toMatchObject({
			access_type: 'offline',
			prompt: 'consent select_account',
			state: 'csrf-state',
			redirect_uri: 'https://storecloud.my.id/oauth/callback',
			scope: ['https://www.googleapis.com/auth/drive.file']
		});
	});
});
