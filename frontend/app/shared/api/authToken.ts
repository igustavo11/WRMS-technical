export type AuthUser = {
	id: string;
	email: string;
	role: 'Admin' | 'Operator';
};

type Session = {
	token: string;
	user: AuthUser;
};

const SESSION_KEY = 'wrms_session';

export function getSession(): Session | null {
	const raw = localStorage.getItem(SESSION_KEY);
	if (!raw) return null;

	try {
		return JSON.parse(raw) as Session;
	} catch {
		return null;
	}
}

export function getToken(): string | null {
	return getSession()?.token ?? null;
}

export function setSession(session: Session): void {
	localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
	localStorage.removeItem(SESSION_KEY);
}
