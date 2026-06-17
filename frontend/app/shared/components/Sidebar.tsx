import { useTranslation } from 'react-i18next';
import { NavLink, useNavigate } from 'react-router';
import { Button } from '~/components/ui/button';
import { useAuth } from '~/features/auth/hooks/useAuth';
import { cn } from '~/lib/utils';

type NavItem = {
	to: string;
	labelKey: string;
	icon: string;
	iconSize?: { w: number; h: number };
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
		labelKey: 'nav.dashboard',
		icon: '/icons/dashboard.svg',
		iconSize: { w: 18, h: 18 },
	},
	{
		to: '/products',
		labelKey: 'nav.products',
		icon: '/icons/products.svg',
		iconSize: { w: 20, h: 20 },
	},
	{
		to: '/warehouses',
		labelKey: 'nav.warehouses',
		icon: '/icons/warehouses.svg',
		iconSize: { w: 20, h: 18 },
	},
	{
		to: '/inventory',
		labelKey: 'nav.inventory',
		icon: '/icons/inventory.svg',
		iconSize: { w: 18, h: 18 },
	},
	{
		to: '/reservations',
		labelKey: 'nav.reservations',
		icon: '/icons/reservations.svg',
		iconSize: { w: 18, h: 20 },
	},
];

const operatorNavItems: NavItem[] = [
	{
		to: '/',
		labelKey: 'nav.dashboard',
		icon: '/icons/dashboard.svg',
		iconSize: { w: 18, h: 18 },
	},
	{
		to: '/inventory',
		labelKey: 'nav.inventory',
		icon: '/icons/inventory.svg',
		iconSize: { w: 18, h: 18 },
	},
	{
		to: '/reservations',
		labelKey: 'nav.reservations',
		icon: '/icons/reservations.svg',
		iconSize: { w: 18, h: 20 },
	},
];

type Props = {
	onOpenSettings: () => void;
};

export function Sidebar({ onOpenSettings }: Props) {
	const { user, logout } = useAuth();
	const navigate = useNavigate();
	const { t } = useTranslation();
	const isAdmin = user?.role === 'Admin';
	const navItems = isAdmin ? adminNavItems : operatorNavItems;
	const textSize = isAdmin ? 'text-base' : 'text-sm';
	const activeRadius = isAdmin ? 'rounded-[4px]' : 'rounded-[8px]';

	function handleLogout() {
		logout();
		navigate('/login');
	}

	return (
		<aside className="hidden md:flex fixed left-0 top-0 h-screen w-[220px] bg-[#161616] border-r border-[#2a2a2a] flex-col py-2 z-20">
			<div className="px-4 pt-4 pb-8">
				<img src="/wtec-logo.svg" alt="WTEC" className="h-12" />
			</div>

			<nav className="flex-1 flex flex-col gap-1 px-2 overflow-y-auto">
				{navItems.map((item) => {
					const { w, h } = item.iconSize ?? { w: 18, h: 18 };
					return (
						<NavLink
							key={item.to}
							to={item.to}
							end={item.to === '/'}
							className={({ isActive }) =>
								cn(
									'flex items-center gap-3 px-3 py-[10px] transition-colors',
									activeRadius,
									textSize,
									isActive
										? 'bg-[rgba(28,200,168,0.12)] border-r-2 border-[#4ce4c3] text-[#4ce4c3] font-bold'
										: 'text-[#bbcac4] font-normal hover:bg-[rgba(255,255,255,0.04)]',
								)
							}
						>
							<>
								<NavIcon src={item.icon} w={w} h={h} />
								<span>{t(item.labelKey)}</span>
							</>
						</NavLink>
					);
				})}
			</nav>

			<div className="flex flex-col px-2 pb-2">
				<button
					type="button"
					onClick={onOpenSettings}
					className={cn(
						'flex w-full items-center gap-3 px-3 py-[10px] transition-colors',
						textSize,
						'rounded-[8px] text-[#bbcac4] font-normal hover:bg-[rgba(255,255,255,0.04)]',
					)}
				>
					<NavIcon src="/icons/settings.svg" w={20} h={20} />
					<span>{t('nav.settings')}</span>
				</button>

				<div className="border-t border-[#2a2a2a] pt-3">
					{isAdmin ? (
						<div className="flex items-center gap-3 px-3 mb-3">
							<div className="w-8 h-8 rounded-full bg-[#2a2a2a] flex items-center justify-center shrink-0">
								<span className="text-xs font-medium text-[#a0a0a0] uppercase">
									{user?.email?.[0]}
								</span>
							</div>
							<div className="min-w-0">
								<p className="text-xs text-[#f0f0f0] truncate leading-tight">
									{user?.email?.split('@')[0]}
								</p>
								<span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[rgba(55,138,221,0.1)] border border-[rgba(55,138,221,0.2)] text-[#378add] mt-0.5">
									Admin
								</span>
							</div>
						</div>
					) : (
						<div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-[8px] flex items-center gap-3 p-3 mb-2">
							<div className="w-8 h-8 rounded-full bg-[#2a2a2a] flex items-center justify-center shrink-0">
								<span className="text-xs font-medium text-[#a0a0a0] uppercase">
									{user?.email?.[0]}
								</span>
							</div>
							<div className="min-w-0 flex-1">
								<p className="text-sm font-semibold text-[#f0f0f0] truncate">
									{user?.email?.split('@')[0]}
								</p>
								<span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-[0.5px] uppercase bg-[rgba(28,200,168,0.15)] border border-[rgba(28,200,168,0.3)] text-[#1cc8a8] mt-0.5">
									OPERATOR
								</span>
							</div>
						</div>
					)}

					<Button
						variant="ghost"
						onClick={handleLogout}
						className="w-full justify-start gap-2 text-[#e24b4a] hover:bg-[rgba(226,75,74,0.08)] hover:text-[#e24b4a] px-3 h-9 rounded-[8px]"
					>
						<NavIcon src="/icons/logout.svg" w={14} h={14} />
						<span className={textSize}>{t('nav.logout')}</span>
					</Button>
				</div>
			</div>
		</aside>
	);
}

export default Sidebar;
