import type { Route } from './+types/home';

export function meta({}: Route.MetaArgs) {
	return [
		{ title: 'WRMS' },
		{ name: 'description', content: 'Warehouse Reservation Management System' },
	];
}

export default function Home() {
	return <h1>WRMS</h1>;
}
