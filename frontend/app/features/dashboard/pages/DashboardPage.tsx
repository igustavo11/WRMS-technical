import { useAuth } from '~/features/auth/hooks/useAuth';
import { DashboardAdmin } from '../components/DashboardAdmin';
import { DashboardOperator } from '../components/DashboardOperator';

export default function DashboardPage() {
	const { user } = useAuth();

	if (user?.role === 'Admin') {
		return <DashboardAdmin />;
	}

	return <DashboardOperator />;
}
