import { Info, Plus } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import {
	useInventory,
	useProducts,
	useWarehouses,
} from '../hooks/useInventory';
import { getStockStatus, type StockStatus } from '../utils/stockStatus';

type EnrichedItem = {
	id: string;
	productId: string;
	warehouseId: string;
	quantity: number;
	productName: string;
	productSku: string;
	warehouseName: string;
};

const STOCK_BADGE: Record<
	StockStatus,
	{ bg: string; border: string; dot: string; text: string }
> = {
	Normal: {
		bg: 'bg-[rgba(28,200,168,0.15)]',
		border: 'border-[rgba(28,200,168,0.3)]',
		dot: 'bg-[#4ce4c3]',
		text: 'text-[#4ce4c3]',
	},
	Atenção: {
		bg: 'bg-[rgba(239,159,39,0.15)]',
		border: 'border-[rgba(239,159,39,0.3)]',
		dot: 'bg-[#ef9f27]',
		text: 'text-[#ef9f27]',
	},
	Crítico: {
		bg: 'bg-[rgba(226,75,74,0.15)]',
		border: 'border-[rgba(226,75,74,0.3)]',
		dot: 'bg-[#e24b4a]',
		text: 'text-[#e24b4a]',
	},
};

function TableSkeleton() {
	return (
		<div className="bg-[#161616] border border-[#2a2a2a] rounded-[8px] overflow-hidden w-full">
			<div className="h-[44px] bg-[#1e1e1e]" />
			{Array.from({ length: 4 }).map((_, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton rows
				<div key={i} className="border-t border-[#2a2a2a] h-[50px]">
					<Skeleton className="h-full w-full rounded-none" />
				</div>
			))}
		</div>
	);
}

export function InventoryOperator() {
	const {
		data: inventory,
		isLoading: invLoading,
		isError: invError,
		refetch: refetchInv,
	} = useInventory();
	const {
		data: products,
		isLoading: prodLoading,
		isError: prodError,
		refetch: refetchProds,
	} = useProducts();
	const {
		data: warehouses,
		isLoading: whLoading,
		isError: whError,
		refetch: refetchWh,
	} = useWarehouses();

	const isLoading = invLoading || prodLoading || whLoading;
	const isError = invError || prodError || whError;

	const refetchAll = () => {
		refetchInv();
		refetchProds();
		refetchWh();
	};

	const rows = useMemo((): EnrichedItem[] => {
		if (!inventory || !products || !warehouses) return [];
		const productMap = new Map(products.map((p) => [p.id, p]));
		const warehouseMap = new Map(warehouses.map((w) => [w.id, w]));
		return inventory.map((item) => ({
			id: item.id,
			productId: item.productId,
			warehouseId: item.warehouseId,
			quantity: item.quantity,
			productName: productMap.get(item.productId)?.name ?? '—',
			productSku: productMap.get(item.productId)?.sku ?? '—',
			warehouseName: warehouseMap.get(item.warehouseId)?.name ?? '—',
		}));
	}, [inventory, products, warehouses]);

	if (isLoading) {
		return (
			<div className="p-[32px] flex flex-col gap-[24px]">
				<Skeleton className="h-9 w-64" />
				<TableSkeleton />
			</div>
		);
	}

	if (isError) {
		return (
			<div className="p-[32px] flex flex-col items-center justify-center gap-4 mt-16 text-center">
				<p className="text-[#a0a0a0] text-sm">
					Não foi possível carregar o inventário.
				</p>
				<Button variant="outline" onClick={refetchAll}>
					Tentar novamente
				</Button>
			</div>
		);
	}

	return (
		<div className="p-4 md:p-[32px] flex flex-col gap-4 md:gap-[24px]">
			<div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 md:gap-0 md:pb-[8px]">
				<div className="flex flex-col">
					<h1 className="text-[#f0f0f0] text-[30px] font-bold leading-[36px]">
						Inventário disponível
					</h1>
				</div>
				<Link
					to="/reservations"
					className="bg-[#1cc8a8] text-[#0a3d34] rounded-[10px] px-[24px] py-[12px] flex items-center gap-[8px] text-[14px] font-semibold self-start md:self-auto"
				>
					<Plus size={14} />
					Criar Reserva
				</Link>
			</div>

			<div className="bg-[rgba(55,138,221,0.1)] border border-[rgba(55,138,221,0.3)] rounded-[8px] p-[17px] flex gap-[12px] items-start">
				<Info size={20} className="text-[#378add] shrink-0 mt-[1px]" />
				<span className="text-[#f0f0f0] text-[14px] leading-[21px]">
					Visualização apenas. Para ajustes contacte o administrador.
				</span>
			</div>

			{/* Mobile card list */}
			<div className="md:hidden flex flex-col gap-3">
				{rows.length === 0 ? (
					<p className="text-[#a0a0a0] text-sm text-center py-8">
						Nenhum item encontrado.
					</p>
				) : (
					rows.map((row) => {
						const status = getStockStatus(row.quantity);
						const badge = STOCK_BADGE[status];
						return (
							<div
								key={row.id}
								className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-[8px] p-[17px] flex flex-col gap-[8px]"
							>
								<div className="flex items-start justify-between gap-3">
									<div className="flex flex-col min-w-0">
										<span className="text-[#f0f0f0] text-[14px] font-bold truncate">
											{row.productName}
										</span>
										<span className="text-[#a0a0a0] text-[12px] truncate">
											{row.productSku}
										</span>
									</div>
									<span className="text-[#f0f0f0] text-[14px] font-medium shrink-0">
										{row.quantity.toLocaleString('pt-BR')}
									</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-[#a0a0a0] text-[12px] truncate">
										{row.warehouseName}
									</span>
									<div
										className={`inline-flex items-center gap-[6px] h-[22.8px] rounded-[6px] px-[8px] border ${badge.bg} ${badge.border} shrink-0`}
									>
										<div className={`size-[6px] rounded-full ${badge.dot}`} />
										<span
											className={`text-[12px] leading-[16.8px] ${badge.text}`}
										>
											{status}
										</span>
									</div>
								</div>
							</div>
						);
					})
				)}
			</div>

			{/* Desktop table */}
			<div className="hidden md:block bg-[#161616] border border-[#2a2a2a] rounded-[8px] overflow-hidden w-full">
				<table className="w-full text-sm">
					<thead>
						<tr className="bg-[#1e1e1e] border-b border-[#2a2a2a]">
							<th className="text-[#a0a0a0] text-[11px] font-medium tracking-[1.1px] uppercase px-[16px] py-[12px] text-left">
								PRODUTO
							</th>
							<th className="text-[#a0a0a0] text-[11px] font-medium tracking-[1.1px] uppercase px-[16px] py-[12px] text-left">
								SKU
							</th>
							<th className="text-[#a0a0a0] text-[11px] font-medium tracking-[1.1px] uppercase px-[16px] py-[12px] text-left">
								ARMAZÉM
							</th>
							<th className="text-[#a0a0a0] text-[11px] font-medium tracking-[1.1px] uppercase px-[16px] py-[12px] text-right">
								DISPONÍVEL
							</th>
							<th className="text-[#a0a0a0] text-[11px] font-medium tracking-[1.1px] uppercase px-[16px] py-[12px] text-left">
								STATUS ESTOQUE
							</th>
						</tr>
					</thead>
					<tbody>
						{rows.length === 0 ? (
							<tr>
								<td
									colSpan={5}
									className="px-[16px] py-[13px] text-center text-[#a0a0a0] text-[14px]"
								>
									Nenhum item encontrado.
								</td>
							</tr>
						) : (
							rows.map((row) => {
								const status = getStockStatus(row.quantity);
								const badge = STOCK_BADGE[status];
								return (
									<tr key={row.id} className="border-t border-[#2a2a2a]">
										<td className="px-[16px] py-[13px] text-[#f0f0f0] text-[14px]">
											{row.productName}
										</td>
										<td className="px-[16px] py-[13px] text-[#a0a0a0] text-[14px]">
											{row.productSku}
										</td>
										<td className="px-[16px] py-[13px] text-[#f0f0f0] text-[14px]">
											{row.warehouseName}
										</td>
										<td className="px-[16px] py-[13px] text-[#f0f0f0] text-[14px] font-medium text-right">
											{row.quantity.toLocaleString('pt-BR')}
										</td>
										<td className="px-[16px] py-[12.5px]">
											<div
												className={`inline-flex items-center gap-[8px] h-[22.8px] rounded-[6px] px-[8px] border ${badge.bg} ${badge.border}`}
											>
												<div
													className={`size-[6px] rounded-full shrink-0 ${badge.dot}`}
												/>
												<span
													className={`text-[12px] leading-[16.8px] ${badge.text}`}
												>
													{status}
												</span>
											</div>
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
