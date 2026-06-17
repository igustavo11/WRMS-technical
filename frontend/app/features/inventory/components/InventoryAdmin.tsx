import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import i18n from '~/i18n/config';
import {
	useInventory,
	useProducts,
	useWarehouses,
} from '../hooks/useInventory';
import { AdjustInventoryModal } from './AdjustInventoryModal';

type EnrichedItem = {
	id: string;
	productId: string;
	warehouseId: string;
	quantity: number;
	updatedAt: string;
	productName: string;
	productSku: string;
	warehouseName: string;
};

function formatUpdatedAt(iso: string): string {
	const locale = i18n.language === 'pt-BR' ? 'pt-BR' : 'en-US';
	return new Intl.DateTimeFormat(locale, {
		day: '2-digit',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit',
	})
		.format(new Date(iso))
		.replace('.', '');
}

function TableSkeleton() {
	return (
		<div className="bg-[#161616] border border-[#2a2a2a] rounded-[8px] overflow-hidden w-full">
			<div className="h-[44px] bg-[#1c1b1b]" />
			{Array.from({ length: 4 }).map((_, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton rows
				<div key={i} className="border-t border-[#2a2a2a] h-[57px]">
					<Skeleton className="h-full w-full rounded-none" />
				</div>
			))}
		</div>
	);
}

export function InventoryAdmin() {
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

	const location = useLocation();
	const { t } = useTranslation();
	const [skuSearch, setSkuSearch] = useState('');
	const [warehouseFilter, setWarehouseFilter] = useState<string>(
		() =>
			(location.state as { warehouseFilter?: string })?.warehouseFilter ??
			'all',
	);
	const [productFilter, setProductFilter] = useState('all');
	const [selectedItem, setSelectedItem] = useState<EnrichedItem | null>(null);

	const isLoading = invLoading || prodLoading || whLoading;
	const isError = invError || prodError || whError;

	const refetchAll = () => {
		refetchInv();
		refetchProds();
		refetchWh();
	};

	const enrichedRows = useMemo((): EnrichedItem[] => {
		if (!inventory || !products || !warehouses) return [];
		const productMap = new Map(products.map((p) => [p.id, p]));
		const warehouseMap = new Map(warehouses.map((w) => [w.id, w]));
		return inventory.map((item) => ({
			...item,
			productName: productMap.get(item.productId)?.name ?? '—',
			productSku: productMap.get(item.productId)?.sku ?? '—',
			warehouseName: warehouseMap.get(item.warehouseId)?.name ?? '—',
		}));
	}, [inventory, products, warehouses]);

	const filteredRows = useMemo(() => {
		return enrichedRows.filter((row) => {
			const matchesSku = row.productSku
				.toLowerCase()
				.includes(skuSearch.toLowerCase());
			const matchesWarehouse =
				warehouseFilter === 'all' || row.warehouseId === warehouseFilter;
			const matchesProduct =
				productFilter === 'all' || row.productId === productFilter;
			return matchesSku && matchesWarehouse && matchesProduct;
		});
	}, [enrichedRows, skuSearch, warehouseFilter, productFilter]);

	if (isLoading) {
		return (
			<div className="p-[32px] flex flex-col gap-[32px]">
				<Skeleton className="h-9 w-40" />
				<TableSkeleton />
			</div>
		);
	}

	if (isError) {
		return (
			<div className="p-[32px] flex flex-col items-center justify-center gap-4 mt-16 text-center">
				<p className="text-[#a0a0a0] text-sm">{t('inventory.loadError')}</p>
				<Button variant="outline" onClick={refetchAll}>
					{t('common.retry')}
				</Button>
			</div>
		);
	}

	return (
		<div className="p-4 md:p-[32px] flex flex-col gap-4 md:gap-[32px]">
			<div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 md:gap-0">
				<h1 className="text-[#f0f0f0] text-[30px] font-bold leading-[36px]">
					{t('inventory.title')}
				</h1>
				<div className="flex flex-wrap gap-2 md:gap-[12px] items-center">
					<div className="relative w-full md:w-auto">
						<Search
							size={13}
							className="absolute left-[12px] top-1/2 -translate-y-1/2 text-[#606060]"
						/>
						<input
							placeholder={t('inventory.searchPlaceholder')}
							value={skuSearch}
							onChange={(e) => setSkuSearch(e.target.value)}
							className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-[10px] pl-[41px] pr-[17px] py-[11px] w-full md:w-[256px] text-[#f0f0f0] text-[16px] placeholder:text-[#606060] outline-none focus:border-[#4ce4c3]"
						/>
					</div>

					<select
						value={warehouseFilter}
						onChange={(e) => setWarehouseFilter(e.target.value)}
						className="flex-1 md:flex-none bg-[#1e1e1e] border border-[#2a2a2a] rounded-[10px] pl-[17px] pr-[33px] py-[9px] text-[#f0f0f0] text-[16px] outline-none appearance-none cursor-pointer"
					>
						<option value="all">{t('inventory.allWarehouses')}</option>
						{warehouses?.map((w) => (
							<option key={w.id} value={w.id}>
								{w.name}
							</option>
						))}
					</select>

					<select
						value={productFilter}
						onChange={(e) => setProductFilter(e.target.value)}
						className="flex-1 md:flex-none bg-[#1e1e1e] border border-[#2a2a2a] rounded-[10px] pl-[17px] pr-[33px] py-[9px] text-[#f0f0f0] text-[16px] outline-none appearance-none cursor-pointer"
					>
						<option value="all">{t('inventory.allProducts')}</option>
						{products?.map((p) => (
							<option key={p.id} value={p.id}>
								{p.name}
							</option>
						))}
					</select>
				</div>
			</div>

			<div className="md:hidden flex flex-col gap-3">
				{filteredRows.length === 0 ? (
					<p className="text-[#a0a0a0] text-sm text-center py-8">
						{t('inventory.noItems')}
					</p>
				) : (
					filteredRows.map((row) => (
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
								<span
									className={`shrink-0 text-[14px] font-bold ${row.quantity < 10 ? 'text-[#e24b4a]' : 'text-[#f0f0f0]'}`}
								>
									{row.quantity.toLocaleString(
										i18n.language === 'pt-BR' ? 'pt-BR' : 'en-US',
									)}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-[#a0a0a0] text-[12px] truncate">
									{row.warehouseName}
								</span>
								<Button
									variant="outline"
									size="xs"
									className="text-[#4ce4c3] shrink-0"
									onClick={() => setSelectedItem(row)}
								>
									{t('inventory.adjust')}
								</Button>
							</div>
						</div>
					))
				)}
			</div>

			<div className="hidden md:block bg-[#161616] border border-[#2a2a2a] rounded-[8px] overflow-hidden w-full">
				<table className="w-full text-sm">
					<thead>
						<tr className="bg-[#1c1b1b] border-b border-[#2a2a2a]">
							<th className="text-[#a0a0a0] text-[11px] font-medium tracking-[0.55px] uppercase px-[24px] py-[16px] text-left">
								{t('inventory.table.product')}
							</th>
							<th className="text-[#a0a0a0] text-[11px] font-medium tracking-[0.55px] uppercase px-[24px] py-[16px] text-left">
								{t('inventory.table.sku')}
							</th>
							<th className="text-[#a0a0a0] text-[11px] font-medium tracking-[0.55px] uppercase px-[24px] py-[16px] text-left">
								{t('inventory.table.warehouse')}
							</th>
							<th className="text-[#a0a0a0] text-[11px] font-medium tracking-[0.55px] uppercase px-[24px] py-[16px] text-right">
								{t('inventory.table.quantity')}
							</th>
							<th className="text-[#a0a0a0] text-[11px] font-medium tracking-[0.55px] uppercase px-[24px] py-[16px] text-right">
								{t('inventory.table.lastUpdate')}
							</th>
							<th className="text-[#a0a0a0] text-[11px] font-medium tracking-[0.55px] uppercase px-[24px] py-[16px] text-center">
								{t('inventory.table.action')}
							</th>
						</tr>
					</thead>
					<tbody>
						{filteredRows.length === 0 ? (
							<tr>
								<td
									colSpan={6}
									className="px-[24px] py-[21px] text-center text-[#a0a0a0] text-[14px]"
								>
									{t('inventory.noItems')}
								</td>
							</tr>
						) : (
							filteredRows.map((row) => (
								<tr key={row.id} className="border-t border-[#2a2a2a]">
									<td className="px-[24px] py-[21px] text-[#f0f0f0] text-[14px]">
										{row.productName}
									</td>
									<td className="px-[24px] py-[21px] text-[#a0a0a0] text-[12px]">
										{row.productSku}
									</td>
									<td className="px-[24px] py-[21px] text-[#f0f0f0] text-[14px]">
										{row.warehouseName}
									</td>
									<td
										className={`px-[24px] py-[21px] text-right text-[14px] ${row.quantity < 10 ? 'text-[#e24b4a] font-bold' : 'text-[#f0f0f0] font-medium'}`}
									>
										{row.quantity.toLocaleString(
											i18n.language === 'pt-BR' ? 'pt-BR' : 'en-US',
										)}
									</td>
									<td className="px-[24px] py-[21px] text-[#a0a0a0] text-[12px] text-right whitespace-nowrap">
										{formatUpdatedAt(row.updatedAt)}
									</td>
									<td className="px-[24px] py-[16px] text-center">
										<Button
											variant="outline"
											size="xs"
											className="text-[#4ce4c3]"
											onClick={() => setSelectedItem(row)}
										>
											{t('inventory.adjust')}
										</Button>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>

			{selectedItem && (
				<AdjustInventoryModal
					item={selectedItem}
					onClose={() => setSelectedItem(null)}
				/>
			)}
		</div>
	);
}
