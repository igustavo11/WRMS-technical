import { useTranslation } from 'react-i18next';
import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '~/components/ui/table';
import i18n from '~/i18n/config';
import type { Reservation } from '../services/reservationsApi';

type Props = {
	reservations: Reservation[];
	isLoading: boolean;
	products?: { id: string; name: string }[];
	warehouses?: { id: string; name: string }[];
	onCancel?: (id: string) => void;
};

function formatDate(dateStr: string): string {
	const locale = i18n.language === 'pt-BR' ? 'pt-BR' : 'en-US';
	return new Intl.DateTimeFormat(locale, {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	}).format(new Date(dateStr));
}

function getProductName(
	productId: string,
	products?: { id: string; name: string }[],
): string {
	return products?.find((p) => p.id === productId)?.name ?? '—';
}

function getWarehouseName(
	warehouseId: string,
	warehouses?: { id: string; name: string }[],
): string {
	return warehouses?.find((w) => w.id === warehouseId)?.name ?? '—';
}

function StatusBadge({ status }: { status: Reservation['status'] }) {
	const { t } = useTranslation();
	const config = {
		Pending: {
			bg: 'bg-[rgba(239,159,39,0.15)]',
			border: 'border-[rgba(239,159,39,0.3)]',
			text: 'text-[#ef9f27]',
		},
		Confirmed: {
			bg: 'bg-[rgba(28,200,168,0.15)]',
			border: 'border-[rgba(28,200,168,0.3)]',
			text: 'text-[#1cc8a8]',
		},
		Cancelled: {
			bg: 'bg-[rgba(226,75,74,0.15)]',
			border: 'border-[rgba(226,75,74,0.3)]',
			text: 'text-[#e24b4a]',
		},
	} as const;

	const c = config[status];

	return (
		<span
			className={`inline-flex items-center ${c.bg} ${c.border} ${c.text} border rounded-[6px] px-[9px] py-[5px] text-[12px] leading-none`}
		>
			{t(`reservations.status.${status}`)}
		</span>
	);
}

export function ReservationsTable({
	reservations,
	isLoading,
	products,
	warehouses,
	onCancel,
}: Props) {
	const { t } = useTranslation();

	if (isLoading) {
		return (
			<div className="flex flex-col gap-3">
				{['sk-1', 'sk-2', 'sk-3'].map((k) => (
					<Skeleton key={k} className="h-[52px] w-full rounded-lg" />
				))}
			</div>
		);
	}

	if (reservations.length === 0) {
		return (
			<div className="flex items-center justify-center py-16 text-[#a0a0a0]">
				{t('reservations.noReservations')}
			</div>
		);
	}

	return (
		<Table className="table-fixed">
			<TableHeader>
				<TableRow>
					<TableHead className="w-[100px] text-[#a0a0a0] text-[12px] font-medium uppercase tracking-[0.5px]">
						{t('reservations.table.id')}
					</TableHead>
					<TableHead className="text-[#a0a0a0] text-[12px] font-medium uppercase tracking-[0.5px]">
						{t('reservations.table.product')}
					</TableHead>
					<TableHead className="text-[#a0a0a0] text-[12px] font-medium uppercase tracking-[0.5px]">
						{t('reservations.table.warehouse')}
					</TableHead>
					<TableHead className="w-[80px] text-right text-[#a0a0a0] text-[12px] font-medium uppercase tracking-[0.5px]">
						{t('reservations.table.qty')}
					</TableHead>
					<TableHead className="w-[120px] text-[#a0a0a0] text-[12px] font-medium uppercase tracking-[0.5px]">
						{t('reservations.table.status')}
					</TableHead>
					<TableHead className="w-[160px] text-[#a0a0a0] text-[12px] font-medium uppercase tracking-[0.5px]">
						{t('reservations.table.createdAt')}
					</TableHead>
					<TableHead className="w-[100px] text-center text-[#a0a0a0] text-[12px] font-medium uppercase tracking-[0.5px]">
						{t('reservations.table.action')}
					</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{reservations.map((reservation) => (
					<TableRow key={reservation.id}>
						<TableCell className="font-medium text-[#f0f0f0] text-[14px] font-mono">
							#{reservation.id.split('-')[0]}
						</TableCell>
						<TableCell className="text-[#f0f0f0] text-[14px] truncate">
							{getProductName(reservation.productId, products)}
						</TableCell>
						<TableCell className="text-[#f0f0f0] text-[14px] truncate">
							{getWarehouseName(reservation.warehouseId, warehouses)}
						</TableCell>
						<TableCell className="text-right text-[#f0f0f0] text-[14px] tabular-nums">
							{reservation.quantity}
						</TableCell>
						<TableCell>
							<StatusBadge status={reservation.status} />
						</TableCell>
						<TableCell className="text-[#a0a0a0] text-[14px] tabular-nums">
							{formatDate(reservation.createdAt)}
						</TableCell>
						<TableCell className="text-center">
							{reservation.status === 'Cancelled' ? (
								<span className="text-[#606060]">—</span>
							) : (
								<Button
									type="button"
									variant="outline"
									onClick={() => onCancel?.(reservation.id)}
									className="border-[#e24b4a] text-[#e24b4a] rounded-[10px] px-[12px] py-[4px] text-[12px] leading-none h-auto hover:bg-[rgba(226,75,74,0.1)]"
								>
									{t('reservations.cancel')}
								</Button>
							)}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
