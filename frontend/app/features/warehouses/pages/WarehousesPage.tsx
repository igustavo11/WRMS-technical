import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import { useDashboard } from '~/features/dashboard/hooks/useDashboard';
import { NewWarehouseModal } from '../components/NewWarehouseModal';
import { WarehouseCard } from '../components/WarehouseCard';
import { useWarehouses } from '../hooks/useWarehouses';
import type { Warehouse } from '../services/warehousesApi';

type WarehouseWithMetrics = Warehouse & {
	totalProducts: number;
	totalQuantity: number;
	activeReservations: number;
};

function SkeletonGrid() {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{Array.from({ length: 3 }).map((_, i) => (
				<div
					key={i}
					className="bg-[#161616] border border-[#2a2a2a] rounded-[8px] p-[21px] flex flex-col gap-4"
				>
					<div className="flex justify-between">
						<Skeleton className="h-[27px] w-40" />
						<Skeleton className="h-[22px] w-16 rounded-[6px]" />
					</div>
					<Skeleton className="h-[16px] w-32" />
					<div className="grid grid-cols-2 gap-4">
						<div className="flex flex-col gap-1">
							<Skeleton className="h-[16px] w-20" />
							<Skeleton className="h-[30px] w-16" />
						</div>
						<div className="flex flex-col gap-1">
							<Skeleton className="h-[16px] w-20" />
							<Skeleton className="h-[30px] w-16" />
						</div>
					</div>
					<Skeleton className="h-[40px] w-full rounded-[10px]" />
				</div>
			))}
		</div>
	);
}

export default function WarehousesPage() {
	const [modalOpen, setModalOpen] = useState(false);

	const { data: warehouses, isLoading, isError, refetch } = useWarehouses();
	const { data: dashboardData } = useDashboard();

	const warehousesWithMetrics: WarehouseWithMetrics[] = (warehouses ?? []).map(
		(w: Warehouse) => {
			const m = dashboardData?.warehouseMetrics.find(
				(wm) => wm.warehouseName === w.name,
			);
			return {
				...w,
				totalProducts: m?.totalProducts ?? 0,
				totalQuantity: m?.totalQuantity ?? 0,
				activeReservations: m?.activeReservations ?? 0,
			};
		},
	);

	return (
		<div className="p-4 md:p-[32px] flex flex-col gap-4 md:gap-[32px]">
			<div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 md:gap-0">
				<div className="flex flex-col gap-1">
					<h1 className="text-[#f0f0f0] text-[30px] font-bold leading-[36px]">
						Armazens
					</h1>
					<p className="text-[#a0a0a0] text-[14px]">
						Gerencio as localidades de estocagem e hubs logisticos.
					</p>
				</div>
				<Button
					onClick={() => setModalOpen(true)}
					className="w-full md:w-auto bg-[#1cc8a8] text-[#004e40] hover:bg-[#4ce4c3] h-[40px] px-6 rounded-[10px] text-[14px] font-semibold"
				>
					+ Novo Armazem
				</Button>
			</div>

			{isLoading && <SkeletonGrid />}

			{isError && (
				<div className="flex flex-col items-center justify-center gap-4 mt-16 text-center">
					<p className="text-[#a0a0a0] text-sm">
						Nao foi possivel carregar os armazens.
					</p>
					<Button variant="outline" onClick={() => refetch()}>
						Tentar novamente
					</Button>
				</div>
			)}

			{!isLoading && !isError && warehousesWithMetrics.length === 0 && (
				<p className="text-[#a0a0a0] text-sm text-center py-16">
					Nenhum armazem cadastrado.
				</p>
			)}

			{!isLoading && !isError && warehousesWithMetrics.length > 0 && (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{warehousesWithMetrics.map((w) => (
						<WarehouseCard key={w.id} warehouse={w} />
					))}
				</div>
			)}

			<NewWarehouseModal open={modalOpen} onClose={() => setModalOpen(false)} />
		</div>
	);
}
