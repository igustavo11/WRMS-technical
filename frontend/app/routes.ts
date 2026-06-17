import {
	index,
	layout,
	type RouteConfig,
	route,
} from '@react-router/dev/routes';

export default [
	layout('shared/components/ProtectedLayout.tsx', [
		index('features/dashboard/pages/DashboardPage.tsx'),
		layout('shared/components/AdminLayout.tsx', [
			route('products', 'features/products/pages/ProductsPage.tsx'),
			route('warehouses', 'routes/placeholder.tsx', { id: 'warehouses' }),
		]),
		route('inventory', 'features/inventory/pages/InventoryPage.tsx'),
		route('reservations', 'features/reservations/pages/ReservationsPage.tsx'),
		route('settings', 'routes/placeholder.tsx', { id: 'settings' }),
	]),
	route('login', 'features/auth/pages/LoginPage.tsx'),
] satisfies RouteConfig;
