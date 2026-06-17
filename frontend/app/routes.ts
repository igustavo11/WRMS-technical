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
			route('warehouses', 'features/warehouses/pages/WarehousesPage.tsx'),
		]),
		route('inventory', 'features/inventory/pages/InventoryPage.tsx'),
		route('reservations', 'features/reservations/pages/ReservationsPage.tsx'),
		route('settings', 'features/settings/pages/SettingsPage.tsx'),
	]),
	route('login', 'features/auth/pages/LoginPage.tsx'),
] satisfies RouteConfig;
