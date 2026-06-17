import { useAuth } from '~/features/auth/hooks/useAuth';
import { InventoryAdmin } from '../components/InventoryAdmin';
import { InventoryOperator } from '../components/InventoryOperator';

export default function InventoryPage() {
	const { user } = useAuth();

	if (user?.role === 'Admin') return <InventoryAdmin />;
	return <InventoryOperator />;
}
