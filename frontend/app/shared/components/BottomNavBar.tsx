import { NavLink } from 'react-router';
import { useAuth } from '~/features/auth/hooks/useAuth';
import { cn } from '~/lib/utils';

type NavItem = {
	to: string;
	label: string;
	icon: string;
	iconSize: { w: number; h: number };
};

function NavIcon({ src, w, h }: { src: string; w: number; h: number }) {
	return (
		<span
			aria-hidden
			style={{
				display: 'inline-block',
				width: w,
				height: h,
				flexShrink: 0,
				backgroundColor: 'currentColor',
				maskImage: `url(${src})`,
				maskRepeat: 'no-repeat',
				maskSize: 'contain',
				maskPosition: 'center',
				WebkitMaskImage: `url(${src})`,
				WebkitMaskRepeat: 'no-repeat',
				WebkitMaskSize: 'contain',
				WebkitMaskPosition: 'center',
			}}
		/>
	);
}

const adminNavItems: NavItem[] = [
	{
		to: '/',
		label: 'Dashboard',
		icon: '/icons/dashboard.svg',
		iconSize: { w: 18, h: 22 },
	},
	{
		to: '/products',
		label: 'Produtos',
		icon: '/icons/products.svg',
		iconSize: { w: 20, h: 24 },
	},
	{
		to: '/warehouses',
		label: 'Armazéns',
		icon: '/icons/warehouses.svg',
		iconSize: { w: 20, h: 22 },
	},
	{
		to: '/inventory',
		label: 'Inventário',
		icon: '/icons/inventory.svg',
		iconSize: { w: 18, h: 22 },
	},
	{
		to: '/reservations',
		label: 'Reservas',
		icon: '/icons/reservations.svg',
		iconSize: { w: 18, h: 24 },
	},
];

const operatorNavItems: NavItem[] = [
	{
		to: '/',
		label: 'Dashboard',
		icon: '/icons/dashboard.svg',
		iconSize: { w: 18, h: 18 },
	},
	{
		to: '/inventory',
		label: 'Inventário',
		icon: '/icons/inventory.svg',
		iconSize: { w: 18, h: 18 },
	},
	{
		to: '/reservations',
		label: 'Reservas',
		icon: '/icons/reservations.svg',
		iconSize: { w: 18, h: 20 },
	},
];

export function BottomNavBar() {
	const { user } = useAuth();
	const isAdmin = user?.role === 'Admin';
	const navItems = isAdmin ? adminNavItems : operatorNavItems;

	return (
		<nav
			className="md:hidden fixed bottom-0 left-0 right-0 z-20 h-14 border-t border-[#2a2a2a] shadow-[0px_-4px_20px_0px_rgba(0,0,0,0.4)]"
			style={{ background: 'rgba(22,22,22,0.92)', backdropFilter: 'blur(6px)' }}
		>
			<div className="flex items-stretch h-full">
				{navItems.map((item) => {
					const { w, h } = item.iconSize;
					return (
						<NavLink
							key={item.to}
							to={item.to}
							end={item.to === '/'}
							className={({ isActive }) =>
								cn(
									'flex flex-col items-center justify-center gap-[4px] flex-1 relative transition-colors',
									isActive
										? 'text-[#4ce4c3] bg-[rgba(28,200,168,0.08)]'
										: 'text-[#a0a0a0]',
								)
							}
						>
							{({ isActive }) => (
								<>
									{isActive && (
										<div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-[#4ce4c3] rounded-b-full" />
									)}
									<NavIcon src={item.icon} w={w} h={h} />
									<span className="text-[10px] font-medium tracking-[0.5px] leading-none">
										{item.label}
									</span>
								</>
							)}
						</NavLink>
					);
				})}
			</div>
		</nav>
	);
}
