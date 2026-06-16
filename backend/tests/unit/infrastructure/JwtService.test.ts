import { describe, expect, it } from 'vitest';
import { JwtService } from '../../../src/infrastructure/auth/JwtService';

describe('JwtService', () => {
	it('signs a payload and verifies it back to the same payload', () => {
		const service = new JwtService('test-secret', '1h');
		const payload = { sub: 'user-1', email: 'admin@wrms.com', role: 'Admin' as const };

		const token = service.sign(payload);
		const decoded = service.verify(token);

		expect(decoded.sub).toBe(payload.sub);
		expect(decoded.email).toBe(payload.email);
		expect(decoded.role).toBe(payload.role);
	});

	it('throws when verifying a token signed with a different secret', () => {
		const signer = new JwtService('secret-a', '1h');
		const verifier = new JwtService('secret-b', '1h');
		const token = signer.sign({ sub: 'user-1', email: 'admin@wrms.com', role: 'Admin' });

		expect(() => verifier.verify(token)).toThrow();
	});

	it('throws when verifying a malformed token', () => {
		const service = new JwtService('test-secret', '1h');

		expect(() => service.verify('not-a-valid-token')).toThrow();
	});
});
