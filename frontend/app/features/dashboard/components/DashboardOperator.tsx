import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import { useAuth } from '~/features/auth/hooks/useAuth';
import i18n from '~/i18n/config';
import { useDashboard } from '../hooks/useDashboard';
import type { RecentReservation } from '../services/dashboardApi';

function MaskIcon({ src, size = 20 }: { src: string; size?: number }) {
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

const STATUS_STYLES: Record<RecentReservation['status'], string> = {
	Pending:
		'bg-[rgba(239,159,39,0.15)] border border-[rgba(239,159,39,0.3)] text-[#ef9f27]',
	Confirmed:
		'bg-[rgba(28,200,168,0.15)] border border-[rgba(28,200,168,0.3)] text-[#1cc8a8]',
	Cancelled:
		'bg-[rgba(226,75,74,0.15)] border border-[rgba(226,75,74,0.3)] text-[#e24b4a]',
};

function formatDateShort(iso: string): string {
	const locale = i18n.language === 'pt-BR' ? 'pt-BR' : 'en-US';
	return new Intl.DateTimeFormat(locale, {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	})
		.format(new Date(iso))
		.replace('.', '');
}

function shortId(id: string): string {
	return `RES-${id.slice(0, 6).toUpperCase()}`;
}

function MetricsSkeleton() {
	return (
		<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
			{Array.from({ length: 3 }).map((_, i) => (
				<Skeleton
					key={i}
					className={`h-[138px] rounded-[8px] ${i === 2 ? 'col-span-2 md:col-span-1' : ''}`}
				/>
			))}
		</div>
	);
}

function TableSkeleton() {
	return (
		<div className="bg-[#161616] border border-[#2a2a2a] rounded-[8px] overflow-hidden">
			<div className="flex items-center justify-between px-5 py-5 border-b border-[#2a2a2a] bg-[#1e1e1e]">
				<Skeleton className="h-7 w-56" />
				<Skeleton className="h-5 w-20" />
			</div>
			<div className="p-4 flex flex-col gap-3">
				{Array.from({ length: 4 }).map((_, i) => (
					<Skeleton key={i} className="h-[61px] w-full rounded" />
				))}
			</div>
		</div>
	);
}

export function DashboardOperator() {
	const { user } = useAuth();
	const navigate = useNavigate();
	const { data, isLoading, isError, refetch } = useDashboard();
	const { t } = useTranslation();

	const firstName = user?.email?.split('@')[0] ?? 'utilizador';

	if (isLoading) {
		return (
			<div className="p-4 md:p-8 flex flex-col gap-6 md:gap-8 max-w-[1200px] mx-auto w-full">
				<div className="hidden md:block">
					<Skeleton className="h-9 w-48 mb-2" />
					<Skeleton className="h-5 w-80" />
				</div>
				<Skeleton className="md:hidden h-[180px] rounded-[12px]" />
				<MetricsSkeleton />
				<Skeleton className="hidden md:block h-[96px] rounded-[8px]" />
				<TableSkeleton />
			</div>
		);
	}

	if (isError || !data) {
		return (
			<div className="p-8 flex flex-col items-center justify-center gap-4 mt-16 text-center">
				<p className="text-[#a0a0a0] text-sm">
					{t('dashboard.loadErrorOperator')}
				</p>
				<Button variant="outline" onClick={() => refetch()}>
					{t('common.retry')}
				</Button>
			</div>
		);
	}

	const { metrics, recentReservations } = data;

	const tableHeaders = [
		t('dashboard.table.reservationId'),
		t('dashboard.table.project'),
		t('dashboard.table.createdAt'),
		t('dashboard.table.items'),
		t('dashboard.table.status'),
	];

	return (
		<div className="p-4 md:p-8 flex flex-col gap-6 md:gap-8 max-w-[1200px] mx-auto w-full">
			<div className="hidden md:block">
				<h1 className="text-[#f0f0f0] text-[30px] font-bold leading-[36px]">
					{t('dashboard.overview')}
				</h1>
				<p className="text-[#a0a0a0] text-[14px] mt-1">
					{t('dashboard.greeting', { name: firstName })}
				</p>
			</div>

			<div className="md:hidden bg-[#161616] border border-[#2a2a2a] rounded-[12px] p-[21px] relative overflow-hidden">
				<div
					className="absolute right-0 top-0 w-20 h-20 pointer-events-none opacity-30"
					style={{
						background:
							'radial-gradient(circle at top right, rgba(28,200,168,0.4), transparent)',
					}}
				/>
				<div className="flex flex-col gap-4">
					<div className="flex flex-col gap-1">
						<h2 className="text-[#f0f0f0] text-[24px] font-semibold leading-none">
							{t('dashboard.newReservation.mobileTitle')}
						</h2>
						<p className="text-[#a0a0a0] text-[14px] leading-[21px]">
							{t('dashboard.newReservation.mobileSubtitle')}
						</p>
					</div>
					<Button
						onClick={() => navigate('/reservations')}
						className="w-full bg-[#1cc8a8] hover:bg-[#1cc8a8]/90 text-[#004e40] font-semibold rounded-[10px] py-3 h-auto text-[16px] gap-2"
					>
						<MaskIcon src="/icons/plus.svg" size={14} />
						{t('dashboard.newReservation.mobileButton')}
					</Button>
				</div>
			</div>

			<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
				<div className="bg-[#161616] md:bg-[#1e1e1e] border border-[#2a2a2a] rounded-[8px] p-[17px] md:p-[21px] flex flex-col gap-[8px] md:justify-between md:min-h-[164px]">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<span className="text-[#a0a0a0] opacity-70">
								<MaskIcon src="/icons/inventory.svg" size={20} />
							</span>
							<span className="text-[#a0a0a0] text-[11px] font-medium tracking-[0.88px] uppercase">
								{t('dashboard.metrics.inventory')}
							</span>
						</div>
						<div
							className="hidden md:flex w-[38px] h-[38px] rounded-[8px] items-center justify-center shrink-0 text-white"
							style={{ background: 'rgba(28,200,168,0.12)' }}
						>
							<MaskIcon src="/icons/inventory.svg" size={20} />
						</div>
					</div>
					<div>
						<p className="text-[#f0f0f0] text-[36px] font-bold tracking-[-0.72px] leading-[1.2]">
							{metrics.totalInventory.toLocaleString(
								i18n.language === 'pt-BR' ? 'pt-BR' : 'en-US',
							)}
						</p>
						<p className="text-[#a0a0a0] text-xs mt-1 hidden md:block">
							{t('dashboard.metrics.unitsNetwork')}
						</p>
						<p className="text-[#a0a0a0] text-[12px] md:hidden">
							{t('dashboard.metrics.availableItems')}
						</p>
					</div>
				</div>

				<div className="bg-[#161616] md:bg-[#1e1e1e] border border-[#2a2a2a] rounded-[8px] p-[17px] md:p-[21px] flex flex-col gap-[8px] md:justify-between md:min-h-[164px]">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<span className="text-[#4ce4c3] opacity-80">
								<MaskIcon src="/icons/reservations.svg" size={18} />
							</span>
							<span className="text-[#4ce4c3] text-[11px] font-medium tracking-[0.88px] uppercase">
								{t('dashboard.metrics.active')}
							</span>
						</div>
						<div
							className="hidden md:flex w-[38px] h-[38px] rounded-[8px] items-center justify-center shrink-0 text-white"
							style={{ background: 'rgba(239,159,39,0.12)' }}
						>
							<MaskIcon src="/icons/reservations.svg" size={20} />
						</div>
					</div>
					<div>
						<p className="text-[#4ce4c3] text-[36px] font-bold tracking-[-0.72px] leading-[1.2]">
							{metrics.activeReservations}
						</p>
						<p className="text-[#a0a0a0] text-xs mt-1 hidden md:block">
							{t('dashboard.metrics.awaitingProcessing')}
						</p>
						<p className="text-[#a0a0a0] text-[12px] md:hidden">
							{t('dashboard.metrics.yourReservations')}
						</p>
					</div>
				</div>

				<div className="col-span-2 md:col-span-1 bg-[#1e1e1e] border border-[#2a2a2a] rounded-[8px] p-[17px] md:p-[21px] hidden md:flex flex-col gap-[8px] md:justify-between md:min-h-[164px]">
					<div className="flex items-start justify-between mb-4">
						<span className="text-[#a0a0a0] text-[11px] font-medium tracking-[0.55px] uppercase">
							{t('dashboard.metrics.createdToday')}
						</span>
						<div
							className="w-[38px] h-[38px] rounded-[8px] flex items-center justify-center shrink-0 text-white"
							style={{ background: 'rgba(76,228,195,0.12)' }}
						>
							<MaskIcon src="/icons/calendar.svg" size={20} />
						</div>
					</div>
					<div>
						<p className="text-[#f0f0f0] text-[36px] font-bold tracking-[-0.72px] leading-[1.2]">
							{metrics.reservationsCreatedToday}
						</p>
						<p className="text-[#a0a0a0] text-xs mt-1">
							{t('dashboard.metrics.lastUpdated')}
						</p>
					</div>
				</div>
			</div>

			<div className="hidden md:flex bg-[#1e1e1e] border border-[#2a2a2a] rounded-[8px] p-[21px] items-center justify-between relative overflow-hidden">
				<div
					className="absolute right-0 top-0 bottom-0 w-64 pointer-events-none"
					style={{
						background:
							'linear-gradient(to left, rgba(28,200,168,0.05), transparent)',
					}}
				/>
				<div className="flex flex-col gap-2">
					<h2 className="text-[#f0f0f0] text-2xl font-semibold">
						{t('dashboard.newReservation.desktopTitle')}
					</h2>
					<p className="text-[#a0a0a0] text-[14px] max-w-[448px]">
						{t('dashboard.newReservation.desktopSubtitle')}
					</p>
				</div>
				<Button
					onClick={() => navigate('/reservations')}
					className="bg-[#1cc8a8] hover:bg-[#1cc8a8]/90 text-[#0a3d34] font-semibold rounded-[10px] px-6 py-3 h-auto text-[14px] gap-2 shrink-0 shadow-lg"
				>
					<MaskIcon src="/icons/plus.svg" size={14} />
					{t('dashboard.newReservation.desktopButton')}
				</Button>
			</div>

			<div>
				<div className="flex items-center justify-between mb-3">
					<h2 className="text-[#f0f0f0] text-[16px] md:text-[24px] font-semibold leading-none">
						{t('dashboard.myRecentReservations')}
					</h2>
					<button
						type="button"
						onClick={() => navigate('/reservations')}
						className="text-[#4ce4c3] text-[12px] font-normal hover:underline"
					>
						{t('dashboard.viewAll')}
					</button>
				</div>

				<div className="md:hidden flex flex-col gap-3">
					{recentReservations.length === 0 ? (
						<p className="text-[#a0a0a0] text-sm text-center py-8">
							{t('dashboard.noReservations')}
						</p>
					) : (
						recentReservations.map((r) => (
							<div
								key={r.id}
								className="bg-[#161616] border border-[#2a2a2a] rounded-[12px] flex items-center justify-between p-[17px]"
							>
								<div className="flex items-center gap-4 min-w-0">
									<div className="w-10 h-10 bg-[#1e1e1e] border border-[#2a2a2a] rounded-[8px] flex items-center justify-center shrink-0 text-[#a0a0a0]">
										<MaskIcon src="/icons/reservations.svg" size={20} />
									</div>
									<div className="flex flex-col gap-[2px] min-w-0">
										<span className="text-[#f0f0f0] text-[14px] font-medium truncate">
											{shortId(r.id)}
										</span>
										<span className="text-[#a0a0a0] text-[12px] truncate">
											{formatDateShort(r.createdAt)} • {r.warehouseName}
										</span>
									</div>
								</div>
								<span
									className={`inline-flex items-center px-[9px] py-[5px] rounded-[6px] text-[12px] whitespace-nowrap shrink-0 ml-3 ${STATUS_STYLES[r.status]}`}
								>
									{t(`reservations.status.${r.status}`)}
								</span>
							</div>
						))
					)}
				</div>

				<div className="hidden md:block bg-[#161616] border border-[#2a2a2a] rounded-[8px] overflow-hidden">
					<div className="bg-[#1e1e1e] border-b border-[#2a2a2a] flex items-center justify-between px-5 py-5">
						<span className="text-[#a0a0a0] text-[11px] font-medium tracking-[1.1px] uppercase">
							{t('dashboard.recentReservations')}
						</span>
					</div>
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="bg-[#201f1f] border-b border-[#2a2a2a]">
									{tableHeaders.map((col) => (
										<th
											key={col}
											className="px-5 py-3 text-[#a0a0a0] text-[11px] font-medium tracking-[0.88px] text-left whitespace-nowrap"
										>
											{col}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{recentReservations.length === 0 ? (
									<tr>
										<td
											colSpan={5}
											className="px-5 py-8 text-center text-[#a0a0a0] text-sm"
										>
											{t('dashboard.noReservations')}
										</td>
									</tr>
								) : (
									recentReservations.map((r) => (
										<tr key={r.id} className="border-b border-[#2a2a2a]">
											<td className="px-5 py-5 text-[#4ce4c3] text-[14px] font-semibold whitespace-nowrap">
												{shortId(r.id)}
											</td>
											<td className="px-5 py-5 text-[#f0f0f0] text-[14px] max-w-[220px] truncate">
												{r.productName}
											</td>
											<td className="px-5 py-5 text-[#a0a0a0] text-[14px] whitespace-nowrap">
												{formatDateShort(r.createdAt)}
											</td>
											<td className="px-5 py-5 text-[#a0a0a0] text-[14px]">
												{r.quantity}
											</td>
											<td className="px-5 py-[16.5px]">
												<span
													className={`inline-flex items-center px-[9px] py-[5px] rounded-[6px] text-[12px] font-medium whitespace-nowrap ${STATUS_STYLES[r.status]}`}
												>
													{t(`reservations.status.${r.status}`)}
												</span>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>
	);
}
