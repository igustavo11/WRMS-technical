import { Navigate, Outlet } from 'react-router';
import { useAuth } from '~/features/auth/hooks/useAuth';
import { BottomNavBar } from './BottomNavBar';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function ProtectedLayout() {
	const { token } = useAuth();

	if (!token) {
		return <Navigate to="/login" replace />;
	}

	return (
		<div className="flex h-screen bg-[#131313] overflow-hidden">
			<Sidebar />
			<div className="flex flex-col flex-1 min-w-0 md:ml-[220px]">
				<TopBar />
				<main className="flex-1 overflow-y-auto pb-14 md:pb-0">
					<Outlet />
				</main>
			</div>
			<BottomNavBar />
		</div>
	);
}

export default ProtectedLayout;
