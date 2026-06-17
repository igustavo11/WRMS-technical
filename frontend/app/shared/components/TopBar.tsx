import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { useAuth } from '~/features/auth/hooks/useAuth';

function formatDate(): string {
	return new Intl.DateTimeFormat('pt-BR', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	}).format(new Date());
}

type Props = {
	onOpenSettings: () => void;
};

export function TopBar({ onOpenSettings }: Props) {
	const { user, logout } = useAuth();
	const isAdmin = user?.role === 'Admin';

	function handleLogout() {
		logout();
		window.location.href = '/login';
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
								onClick={onOpenSettings}
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
			<header className="hidden md:flex h-16 shrink-0 bg-[#131313] border-b border-[#2a2a2a] items-center justify-end px-8 z-10">
				<div className="flex items-center gap-6">
					{isAdmin && (
						<span className="text-[#a0a0a0] text-xs capitalize">
							{formatDate()}
						</span>
					)}
				</div>
			</header>
		</>
	);
}
