import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import i18n from '~/i18n/config';
import { useCancelReservation, useDashboard } from '../hooks/useDashboard';
import type { RecentReservation } from '../services/dashboardApi';

function MaskIcon({ src, w, h }: { src: string; w: number; h: number }) {
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

const STATUS_STYLES: Record<RecentReservation['status'], string> = {
	Pending:
		'bg-[rgba(239,159,39,0.15)] border border-[rgba(239,159,39,0.3)] text-[#ef9f27]',
	Confirmed:
		'bg-[rgba(28,200,168,0.15)] border border-[rgba(28,200,168,0.3)] text-[#1cc8a8]',
	Cancelled:
		'bg-[rgba(226,75,74,0.15)] border border-[rgba(226,75,74,0.3)] text-[#e24b4a]',
};

function formatDate(iso: string): string {
	const locale = i18n.language === 'pt-BR' ? 'pt-BR' : 'en-US';
	return new Intl.DateTimeFormat(locale, {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
	})
		.format(new Date(iso))
		.replace('.', '');
}

function shortId(id: string): string {
	return `#${id.slice(0, 8).toUpperCase()}`;
}

type MetricCardProps = {
	label: string;
	value: number | string;
	icon: string;
	iconSize?: { w: number; h: number };
};

function MetricCard({
	label,
	value,
	icon,
	iconSize = { w: 20, h: 20 },
}: MetricCardProps) {
	const locale = i18n.language === 'pt-BR' ? 'pt-BR' : 'en-US';
	return (
		<div className="bg-[#1e1e1e] md:bg-[#161616] border border-[#2a2a2a] rounded-[8px] p-[17px] md:p-[21px] flex flex-col gap-[8px] md:gap-[7px]">
			<div className="flex items-center gap-2">
				<span className="text-[#a0a0a0] opacity-70">
					<MaskIcon src={icon} w={iconSize.w} h={iconSize.h} />
				</span>
				<span className="text-[#bbcac4] md:text-[#a0a0a0] text-[14px] md:text-[11px] md:font-medium md:tracking-[0.88px] md:uppercase">
					{label}
				</span>
			</div>
			<span className="text-[#f0f0f0] md:text-[#1cc8a8] text-[30px] md:text-[36px] font-bold tracking-[-0.72px] leading-[1.2]">
				{typeof value === 'number' ? value.toLocaleString(locale) : value}
			</span>
		</div>
	);
}

function MetricsSkeleton() {
	return (
		<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
			{Array.from({ length: 4 }).map((_, i) => (
				<Skeleton key={i} className="h-[110px] md:h-[113px] rounded-[8px]" />
			))}
		</div>
	);
}

function TableSkeleton() {
	return (
		<div className="bg-[#161616] border border-[#2a2a2a] rounded-[8px] p-1 mt-4">
			<div className="flex items-center justify-between px-5 py-5 border-b border-[#2a2a2a]">
				<Skeleton className="h-7 w-48" />
				<Skeleton className="h-8 w-24 rounded-[4px]" />
			</div>
			<div className="p-4 flex flex-col gap-3">
				{Array.from({ length: 4 }).map((_, i) => (
					<Skeleton key={i} className="h-[53px] w-full rounded" />
				))}
			</div>
		</div>
	);
}

export function DashboardAdmin() {
	const { data, isLoading, isError, refetch } = useDashboard();
	const cancelMutation = useCancelReservation();
	const { t } = useTranslation();

	if (isLoading) {
		return (
			<div className="p-4 md:p-8">
				<MetricsSkeleton />
				<TableSkeleton />
			</div>
		);
	}

	if (isError || !data) {
		return (
			<div className="p-8 flex flex-col items-center justify-center gap-4 mt-16 text-center">
				<p className="text-[#a0a0a0] text-sm">{t('dashboard.loadError')}</p>
				<Button variant="outline" onClick={() => refetch()}>
					{t('common.retry')}
				</Button>
			</div>
		);
	}

	const { metrics, recentReservations } = data;

	const tableHeaders = [
		t('dashboard.table.id'),
		t('dashboard.table.product'),
		t('dashboard.table.warehouse'),
		t('dashboard.table.qty'),
		t('dashboard.table.status'),
		t('dashboard.table.date'),
		t('dashboard.table.action'),
	];

	return (
		<div className="p-4 md:p-8 flex flex-col gap-4">
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<MetricCard
					label={t('dashboard.metrics.products')}
					value={metrics.totalProducts}
					icon="/icons/products.svg"
					iconSize={{ w: 20, h: 20 }}
				/>
				<MetricCard
					label={t('dashboard.metrics.warehouses')}
					value={metrics.totalWarehouses}
					icon="/icons/warehouses.svg"
					iconSize={{ w: 20, h: 18 }}
				/>
				<MetricCard
					label={t('dashboard.metrics.inventory')}
					value={metrics.totalInventory}
					icon="/icons/inventory.svg"
					iconSize={{ w: 18, h: 18 }}
				/>
				<MetricCard
					label={t('dashboard.metrics.activeReservations')}
					value={metrics.activeReservations}
					icon="/icons/reservations.svg"
					iconSize={{ w: 18, h: 20 }}
				/>
			</div>

			<div className="flex-1 mt-4">
				<div className="flex items-center justify-between mb-3 px-1">
					<span className="text-[#a0a0a0] text-[11px] font-medium tracking-[1.1px] uppercase md:hidden">
						{t('dashboard.recentReservations')}
					</span>
					<Link
						to="/reservations"
						className="text-[#4ce4c3] text-[12px] font-normal hover:underline md:hidden"
					>
						{t('dashboard.viewAll')}
					</Link>
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
								className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-[8px] flex items-center justify-between p-[17px]"
							>
								<div className="flex flex-col gap-[3px] min-w-0 mr-3">
									<span className="text-[#f0f0f0] text-[14px] font-bold truncate">
										{r.productName}
									</span>
									<span className="text-[#a0a0a0] text-[12px] truncate">
										{r.warehouseName} • {formatDate(r.createdAt)}
									</span>
								</div>
								<span
									className={`inline-flex items-center px-[9px] py-[5px] rounded-[6px] text-[11px] font-medium tracking-[0.88px] whitespace-nowrap shrink-0 ${STATUS_STYLES[r.status]}`}
								>
									{t(`reservations.status.${r.status}`).toUpperCase()}
								</span>
							</div>
						))
					)}
				</div>

				<div className="hidden md:block bg-[#161616] border border-[#2a2a2a] rounded-[8px] p-px flex flex-col">
					<div className="flex items-center justify-between px-5 py-5 border-b border-[#2a2a2a]">
						<h2 className="text-[#f0f0f0] text-2xl font-semibold">
							{t('dashboard.recentReservations')}
						</h2>
						<Link
							to="/reservations"
							className="inline-flex items-center gap-2 bg-[#1e1e1e] border border-[#2a2a2a] text-[#f0f0f0] hover:bg-[#2a2a2a] rounded-[4px] px-4 py-2 text-sm transition-colors"
						>
							{t('dashboard.viewAllDesktop')}
							<MaskIcon src="/icons/arrow-right.svg" w={12} h={12} />
						</Link>
					</div>

					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="bg-[#131313] border-b border-[#2a2a2a]">
									{tableHeaders.map((col, i) => (
										<th
											key={col}
											className={`px-4 py-4 text-[#a0a0a0] text-[11px] font-medium tracking-[0.55px] uppercase whitespace-nowrap ${i === 6 ? 'text-right' : 'text-left'}`}
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
											colSpan={7}
											className="px-4 py-8 text-center text-[#a0a0a0] text-sm"
										>
											{t('dashboard.noReservations')}
										</td>
									</tr>
								) : (
									recentReservations.map((r) => (
										<tr key={r.id} className="border-t border-[#2a2a2a]">
											<td className="px-4 py-[21px] text-[#a0a0a0] text-[14px] font-mono whitespace-nowrap">
												{shortId(r.id)}
											</td>
											<td className="px-4 py-[21px] text-[#f0f0f0] text-[14px] max-w-[240px] truncate">
												{r.productName}
											</td>
											<td className="px-4 py-[21px] text-[#a0a0a0] text-[14px] whitespace-nowrap">
												{r.warehouseName}
											</td>
											<td className="px-4 py-[21px] text-[#f0f0f0] text-[14px]">
												{r.quantity}
											</td>
											<td className="px-4 py-[18px]">
												<span
													className={`inline-flex items-center px-[9px] py-[5px] rounded-[6px] text-[12px] whitespace-nowrap ${STATUS_STYLES[r.status]}`}
												>
													{t(`reservations.status.${r.status}`).toUpperCase()}
												</span>
											</td>
											<td className="px-4 py-[21px] text-[#a0a0a0] text-[14px] whitespace-nowrap">
												{formatDate(r.createdAt)}
											</td>
											<td className="px-4 py-[17px] text-right">
												{r.status !== 'Cancelled' ? (
													<Button
														variant="outline"
														size="sm"
														disabled={cancelMutation.isPending}
														onClick={() => cancelMutation.mutate(r.id)}
														className="border-[#e24b4a] text-[#e24b4a] hover:bg-[rgba(226,75,74,0.1)] hover:text-[#e24b4a] bg-transparent rounded-[4px] px-[13px] py-[7px] h-auto text-[12px]"
													>
														{t('dashboard.cancel')}
													</Button>
												) : (
													<Button
														variant="outline"
														size="sm"
														disabled
														className="border-[#2a2a2a] text-[#353534] bg-transparent rounded-[4px] px-[13px] py-[7px] h-auto text-[12px] cursor-default opacity-100"
													>
														{t('dashboard.cancel')}
													</Button>
												)}
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
