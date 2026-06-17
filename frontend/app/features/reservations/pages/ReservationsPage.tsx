import { useState } from 'react';
import { Button } from '~/components/ui/button';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '~/components/ui/select';
import { useWarehouses } from '~/features/inventory/hooks/useInventory';
import { useProducts } from '~/features/products/hooks/useProducts';
import { NewReservationModal } from '../components/NewReservationModal';
import { ReservationsTable } from '../components/ReservationsTable';
import { useCancelReservation } from '../hooks/useCancelReservation';
import { useReservations } from '../hooks/useReservations';

export default function ReservationsPage() {
	const { data: reservations, isLoading } = useReservations();
	const { data: products } = useProducts();
	const { data: warehouses } = useWarehouses();
	const cancelMutation = useCancelReservation();

	const [statusFilter, setStatusFilter] = useState('all');
	const [warehouseFilter, setWarehouseFilter] = useState('all');
	const [dateFrom, setDateFrom] = useState('');
	const [dateTo, setDateTo] = useState('');
	const [modalOpen, setModalOpen] = useState(false);

	const filtered = (reservations ?? []).filter((r) => {
		if (statusFilter !== 'all' && r.status !== statusFilter) return false;
		if (warehouseFilter !== 'all' && r.warehouseId !== warehouseFilter)
			return false;
		if (dateFrom && new Date(r.createdAt) < new Date(`${dateFrom}T00:00:00`))
			return false;
		if (dateTo) {
			const end = new Date(`${dateTo}T23:59:59.999`);
			if (new Date(r.createdAt) > end) return false;
		}
		return true;
	});

	function clearFilters() {
		setStatusFilter('all');
		setWarehouseFilter('all');
		setDateFrom('');
		setDateTo('');
	}

	function handleCancelReservation(id: string) {
		cancelMutation.mutate(id);
	}

	return (
		<div className="flex flex-col h-full p-6 gap-6">
			<div className="flex items-center justify-between">
				<h1 className="text-[#f0f0f0] text-[28px] font-semibold leading-[36px]">
					Reservas
				</h1>
				<Button
					onClick={() => setModalOpen(true)}
					className="bg-[#1cc8a8] text-[#00382d] hover:bg-[#4ce4c3]"
				>
					+ Nova Reserva
				</Button>
			</div>

			<div className="flex items-center gap-4 flex-wrap">
				<div className="flex items-center gap-2">
					<span className="text-[#a0a0a0] text-[14px]">Status:</span>
					<Select
						value={statusFilter}
						onValueChange={(value) => {
							if (value !== null) setStatusFilter(value);
						}}
					>
						<SelectTrigger
							aria-label="Filtrar por status"
							className="w-[140px] bg-[#1e1e1e] border border-[#2a2a2a]"
						>
							<SelectValue placeholder="Status">
								{(value: string | null) => {
									const labels: Record<string, string> = {
										all: 'Todos',
										Pending: 'Pendente',
										Confirmed: 'Confirmado',
										Cancelled: 'Cancelado',
									};
									return value ? (labels[value] ?? value) : 'Status';
								}}
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Todos</SelectItem>
							<SelectItem value="Pending">Pendente</SelectItem>
							<SelectItem value="Confirmed">Confirmado</SelectItem>
							<SelectItem value="Cancelled">Cancelado</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div className="flex items-center gap-2">
					<span className="text-[#a0a0a0] text-[14px]">Armazém:</span>
					<Select
						value={warehouseFilter}
						onValueChange={(value) => {
							if (value !== null) setWarehouseFilter(value);
						}}
					>
						<SelectTrigger
							aria-label="Filtrar por armazém"
							className="w-[180px] bg-[#1e1e1e] border border-[#2a2a2a]"
						>
							<SelectValue placeholder="Armazém">
								{(value: string | null) => {
									if (!value) return 'Armazém';
									if (value === 'all') return 'Todos';
									const warehouse = warehouses?.find((w) => w.id === value);
									return warehouse?.name ?? value;
								}}
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Todos</SelectItem>
							{warehouses?.map((w) => (
								<SelectItem key={w.id} value={w.id}>
									{w.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="flex items-center gap-2">
					<span className="text-[#a0a0a0] text-[14px]">De:</span>
					<input
						type="date"
						value={dateFrom}
						onChange={(e) => setDateFrom(e.target.value)}
						aria-label="Data inicial"
						className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-[10px] px-[13px] py-[7px] text-[#f0f0f0] text-[14px] outline-none focus:border-[#4ce4c3]"
					/>
				</div>

				<div className="flex items-center gap-2">
					<span className="text-[#a0a0a0] text-[14px]">Até:</span>
					<input
						type="date"
						value={dateTo}
						onChange={(e) => setDateTo(e.target.value)}
						aria-label="Data final"
						className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-[10px] px-[13px] py-[7px] text-[#f0f0f0] text-[14px] outline-none focus:border-[#4ce4c3]"
					/>
				</div>

				<Button
					variant="outline"
					onClick={clearFilters}
					className="bg-[#1e1e1e] border border-[#2a2a2a] text-[#a0a0a0] hover:text-[#f0f0f0]"
				>
					Limpar Filtros
				</Button>
			</div>

			<ReservationsTable
				reservations={filtered}
				isLoading={isLoading}
				products={products}
				warehouses={warehouses}
				onCancel={handleCancelReservation}
			/>

			<NewReservationModal
				open={modalOpen}
				onClose={() => setModalOpen(false)}
			/>
		</div>
	);
}
