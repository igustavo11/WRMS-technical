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
			route('products', 'routes/placeholder.tsx', { id: 'products' }),
			route('warehouses', 'routes/placeholder.tsx', { id: 'warehouses' }),
		]),
		route('inventory', 'routes/placeholder.tsx', { id: 'inventory' }),
		route('reservations', 'routes/placeholder.tsx', { id: 'reservations' }),
		route('settings', 'routes/placeholder.tsx', { id: 'settings' }),
	]),
	route('login', 'features/auth/pages/LoginPage.tsx'),
] satisfies RouteConfig;
