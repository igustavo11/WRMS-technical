import {
	index,
	layout,
	type RouteConfig,
	route,
} from '@react-router/dev/routes';

export default [
	layout('shared/components/ProtectedLayout.tsx', [index('routes/home.tsx')]),
	route('login', 'features/auth/pages/LoginPage.tsx'),
] satisfies RouteConfig;
