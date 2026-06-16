import { createContext, type ReactNode, useState } from 'react';
import {
	type AuthUser,
	clearSession,
	getSession,
	setSession,
} from '~/shared/api/authToken';

type AuthContextValue = {
	token: string | null;
	user: AuthUser | null;
	login: (token: string, user: AuthUser) => void;
	logout: () => void;
};

export const AuthContext = createContext<AuthContextValue | undefined>(
	undefined,
);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [session, setSessionState] = useState(() => getSession());

	function login(token: string, user: AuthUser) {
		setSession({ token, user });
		setSessionState({ token, user });
	}

	function logout() {
		clearSession();
		setSessionState(null);
	}

	return (
		<AuthContext.Provider
			value={{
				token: session?.token ?? null,
				user: session?.user ?? null,
				login,
				logout,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}
