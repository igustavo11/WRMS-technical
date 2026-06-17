import { Box, Building2, Calendar } from 'lucide-react';
import type { Reservation } from '../services/reservationsApi';

type Props = {
	reservation: Reservation;
	productName?: string;
	warehouseName?: string;
};

function ReservationStatusBadge({ status }: { status: Reservation['status'] }) {
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
	return `${day} ${month} ${year}`;
}

export function ReservationCard({
	reservation,
	productName,
	warehouseName,
}: Props) {
	return (
		<div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-[8px] p-[17px] flex flex-col gap-[8px]">
			<div className="flex items-start justify-between gap-3">
				<span className="text-[#f0f0f0] text-[16px] font-semibold truncate min-w-0">
					{productName ?? '—'}
				</span>
				<ReservationStatusBadge status={reservation.status} />
			</div>
			<div className="flex flex-col gap-[4px]">
				<div className="flex items-center gap-[6px]">
					<Building2 size={14} className="text-[#606060] shrink-0" />
					<span className="text-[#a0a0a0] text-[12px]">
						{warehouseName ?? '—'}
					</span>
				</div>
				<div className="flex items-center gap-[6px]">
					<Box size={14} className="text-[#606060] shrink-0" />
					<span className="text-[#a0a0a0] text-[12px]">
						Qtd: {reservation.quantity} unidades
					</span>
				</div>
				<div className="flex items-center gap-[6px]">
					<Calendar size={14} className="text-[#606060] shrink-0" />
					<span className="text-[#a0a0a0] text-[12px]">
						{formatDate(reservation.createdAt)}
					</span>
				</div>
			</div>
		</div>
	);
}
