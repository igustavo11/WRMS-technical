import { useState } from 'react';
import { Navigate, Outlet } from 'react-router';
import { useAuth } from '~/features/auth/hooks/useAuth';
import { BottomNavBar } from './BottomNavBar';
import { SettingsModal } from './SettingsModal';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function ProtectedLayout() {
	const { token } = useAuth();
	const [settingsOpen, setSettingsOpen] = useState(false);

	if (!token) {
		return <Navigate to="/login" replace />;
	}

	return (
		<div className="flex h-screen bg-[#131313] overflow-hidden">
			<Sidebar onOpenSettings={() => setSettingsOpen(true)} />
			<div className="flex flex-col flex-1 min-w-0 md:ml-[220px]">
				<TopBar onOpenSettings={() => setSettingsOpen(true)} />
				<main className="flex-1 overflow-y-auto pb-14 md:pb-0">
					<Outlet />
				</main>
			</div>
			<BottomNavBar />
			<SettingsModal
				open={settingsOpen}
				onClose={() => setSettingsOpen(false)}
			/>
		</div>
	);
}

export default ProtectedLayout;
