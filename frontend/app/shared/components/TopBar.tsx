import { useLocation, useNavigate } from 'react-router';
import { Button } from '~/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { useAuth } from '~/features/auth/hooks/useAuth';

function TopBarIcon({ src, size = 18 }: { src: string; size?: number }) {
	return (
		<span
			aria-hidden
			style={{
				display: 'inline-block',
				width: size,
				height: size,
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

const routeTitles: Record<string, string> = {
	'/': 'Dashboard',
	'/products': 'Produtos',
	'/warehouses': 'Armazéns',
	'/inventory': 'Inventário',
	'/reservations': 'Reservas',
	'/settings': 'Configurações',
};

function formatDate(): string {
	return new Intl.DateTimeFormat('pt-BR', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	}).format(new Date());
}

export function TopBar() {
	const { user, logout } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const isAdmin = user?.role === 'Admin';
	const pageTitle = routeTitles[location.pathname] ?? 'WRMS';

	function handleLogout() {
		logout();
		navigate('/login');
	}

	return (
		<>
			{/* Mobile Header */}
			<header className="md:hidden shrink-0 bg-[#161616] border-b border-[#2a2a2a] flex items-center justify-between px-4 py-4 z-10">
				<div className="flex items-center gap-3">
					<img src="/wtec-logo.svg" alt="WTec" className="h-7 w-auto" />
					{!isAdmin && (
						<span className="text-[#a0a0a0] text-[12px] leading-none">
							Operator
						</span>
					)}
				</div>
				<div className="flex items-center gap-3">
					<div className="relative">
						<div className="w-10 h-10 bg-[#1e1e1e] border border-[#2a2a2a] rounded-full flex items-center justify-center text-white">
							<TopBarIcon src="/icons/bell.svg" size={16} />
						</div>
						<div className="absolute top-[9px] right-[9px] w-2 h-2 bg-[#4ce4c3] rounded-full border border-[#161616]" />
					</div>
					<DropdownMenu>
						<DropdownMenuTrigger>
							<div className="relative cursor-pointer">
								<div className="w-10 h-10 rounded-full border border-[#2a2a2a] bg-[#2a2a2a] flex items-center justify-center text-[#a0a0a0] text-sm font-semibold uppercase">
									{user?.email?.[0]}
								</div>
								{!isAdmin && (
									<div className="absolute bottom-0 right-0 w-3 h-3 bg-[#4ce4c3] border-2 border-[#161616] rounded-full" />
								)}
							</div>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							align="end"
							sideOffset={8}
							className="w-40 bg-[#161616] border-[#2a2a2a] text-[#a0a0a0]"
						>
							<DropdownMenuItem
								onClick={() => navigate('/settings')}
								className="cursor-pointer focus:bg-[rgba(28,200,168,0.12)] focus:text-[#4ce4c3]"
							>
								Configurações
							</DropdownMenuItem>
							<DropdownMenuSeparator className="bg-[#2a2a2a]" />
							<DropdownMenuItem
								onClick={handleLogout}
								variant="destructive"
								className="cursor-pointer"
							>
								Logout
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</header>

			{/* Desktop Header */}
			<header className="hidden md:flex h-16 shrink-0 bg-[#131313] border-b border-[#2a2a2a] items-center justify-between px-8 z-10">
				<div className="flex items-center gap-4">
					<span className="text-[#a0a0a0] text-[11px] font-medium tracking-[1.1px] uppercase select-none">
						WRMS
					</span>
					{isAdmin && pageTitle && (
						<>
							<div className="w-px h-4 bg-[#2a2a2a]" />
							<span className="text-[#4ce4c3] text-2xl font-semibold leading-none">
								{pageTitle}
							</span>
						</>
					)}
				</div>

				<div className="flex items-center gap-6">
					{isAdmin && (
						<span className="text-[#a0a0a0] text-xs capitalize">
							{formatDate()}
						</span>
					)}
					<div className="flex items-center gap-3">
						{isAdmin ? (
							<>
								<Button
									variant="ghost"
									size="icon"
									className="text-white hover:text-white opacity-60 hover:opacity-100 size-8"
								>
									<TopBarIcon src="/icons/calendar.svg" size={18} />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									className="text-white hover:text-white opacity-60 hover:opacity-100 size-8"
								>
									<TopBarIcon src="/icons/bell.svg" size={16} />
								</Button>
							</>
						) : (
							<>
								<Button
									variant="ghost"
									size="icon"
									className="text-white hover:text-white opacity-60 hover:opacity-100 size-8"
								>
									<TopBarIcon src="/icons/bell.svg" size={16} />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									className="text-white hover:text-white opacity-60 hover:opacity-100 size-8"
								>
									<TopBarIcon src="/icons/calendar.svg" size={18} />
								</Button>
							</>
						)}
					</div>
				</div>
			</header>
		</>
	);
}
