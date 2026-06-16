import { Navigate, Outlet } from 'react-router';
import { useAuth } from '~/features/auth/hooks/useAuth';

export function ProtectedLayout() {
	const { token } = useAuth();

	if (!token) {
		return <Navigate to="/login" replace />;
	}

	return <Outlet />;
}

export default ProtectedLayout;
