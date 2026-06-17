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
import type { Reservation } from '../services/reservationsApi';

type Props = {
	reservations: Reservation[];
	isLoading: boolean;
	products?: { id: string; name: string }[];
	warehouses?: { id: string; name: string }[];
	onCancel?: (id: string) => void;
};

function formatDate(dateStr: string): string {
	const d = new Date(dateStr);
	const day = String(d.getDate()).padStart(2, '0');
	const months = [
		'Jan',
		'Fev',
		'Mar',
		'Abr',
		'Mai',
		'Jun',
		'Jul',
		'Ago',
		'Set',
		'Out',
		'Nov',
		'Dez',
	];
	const month = months[d.getMonth()];
	const year = d.getFullYear();
	const hours = String(d.getHours()).padStart(2, '0');
	const mins = String(d.getMinutes()).padStart(2, '0');
	return `${day} ${month} ${year}, ${hours}:${mins}`;
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

export function ReservationsTable({
	reservations,
	isLoading,
	products,
	warehouses,
	onCancel,
}: Props) {
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
				Nenhuma reserva encontrada.
			</div>
		);
	}

	return (
		<Table className="table-fixed">
			<TableHeader>
				<TableRow>
					<TableHead className="w-[100px] text-[#a0a0a0] text-[12px] font-medium uppercase tracking-[0.5px]">
						ID
					</TableHead>
					<TableHead className="text-[#a0a0a0] text-[12px] font-medium uppercase tracking-[0.5px]">
						Produto
					</TableHead>
					<TableHead className="text-[#a0a0a0] text-[12px] font-medium uppercase tracking-[0.5px]">
						Armazém
					</TableHead>
					<TableHead className="w-[80px] text-right text-[#a0a0a0] text-[12px] font-medium uppercase tracking-[0.5px]">
						Qtd
					</TableHead>
					<TableHead className="w-[120px] text-[#a0a0a0] text-[12px] font-medium uppercase tracking-[0.5px]">
						Status
					</TableHead>
					<TableHead className="w-[160px] text-[#a0a0a0] text-[12px] font-medium uppercase tracking-[0.5px]">
						Criado em
					</TableHead>
					<TableHead className="w-[100px] text-center text-[#a0a0a0] text-[12px] font-medium uppercase tracking-[0.5px]">
						Ação
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
									Cancelar
								</Button>
							)}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}

function StatusBadge({ status }: { status: Reservation['status'] }) {
	const config = {
		Pending: {
			bg: 'bg-[rgba(239,159,39,0.15)]',
			border: 'border-[rgba(239,159,39,0.3)]',
			text: 'text-[#ef9f27]',
			label: 'Pendente',
		},
		Confirmed: {
			bg: 'bg-[rgba(28,200,168,0.15)]',
			border: 'border-[rgba(28,200,168,0.3)]',
			text: 'text-[#1cc8a8]',
			label: 'Confirmado',
		},
		Cancelled: {
			bg: 'bg-[rgba(226,75,74,0.15)]',
			border: 'border-[rgba(226,75,74,0.3)]',
			text: 'text-[#e24b4a]',
			label: 'Cancelado',
		},
	} as const;

	const c = config[status];

	return (
		<span
			className={`inline-flex items-center ${c.bg} ${c.border} ${c.text} border rounded-[6px] px-[9px] py-[5px] text-[12px] leading-none`}
		>
			{c.label}
		</span>
	);
}
