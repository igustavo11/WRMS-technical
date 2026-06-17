import { Navigate, Outlet } from 'react-router';
import { useAuth } from '~/features/auth/hooks/useAuth';

export function AdminLayout() {
	const { user } = useAuth();

	if (user?.role !== 'Admin') {
		return <Navigate to="/" replace />;
	}

	return <Outlet />;
}

export default AdminLayout;
