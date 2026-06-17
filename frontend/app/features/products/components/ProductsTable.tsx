import { Pencil } from 'lucide-react';
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
import type { Product } from '../services/productsApi';

type Props = {
	products: Product[];
	isLoading: boolean;
	onEdit?: (product: Product) => void;
};

export function ProductsTable({ products, isLoading, onEdit }: Props) {
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

	if (products.length === 0) {
		return (
			<div className="flex items-center justify-center py-16 text-[#a0a0a0]">
				{t('products.noProducts')}
			</div>
		);
	}

	return (
		<Table className="table-fixed">
			<TableHeader>
				<TableRow>
					<TableHead className="w-[137px] text-[#a0a0a0] text-[12px] font-medium uppercase tracking-[0.5px]">
						{t('products.table.sku')}
					</TableHead>
					<TableHead className="w-[297px] text-[#a0a0a0] text-[12px] font-medium uppercase tracking-[0.5px]">
						{t('products.table.name')}
					</TableHead>
					<TableHead className="text-[#a0a0a0] text-[12px] font-medium uppercase tracking-[0.5px]">
						{t('products.table.description')}
					</TableHead>
					<TableHead className="w-[102px] text-[#a0a0a0] text-[12px] font-medium uppercase tracking-[0.5px]">
						{t('products.table.status')}
					</TableHead>
					<TableHead className="w-[86px] text-right text-[#a0a0a0] text-[12px] font-medium uppercase tracking-[0.5px]">
						{t('products.table.actions')}
					</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{products.map((product) => (
					<TableRow
						key={product.id}
						className={product.isActive ? undefined : 'opacity-60'}
					>
						<TableCell className="font-medium text-[#f0f0f0] text-[14px] truncate">
							{product.sku}
						</TableCell>
						<TableCell className="font-normal text-[#f0f0f0] text-[14px] truncate">
							{product.name}
						</TableCell>
						<TableCell className="text-[#a0a0a0] text-[14px] truncate">
							{product.description ?? '—'}
						</TableCell>
						<TableCell>
							{product.isActive ? (
								<span className="inline-flex items-center bg-[rgba(28,200,168,0.15)] border border-[rgba(28,200,168,0.3)] text-[#1cc8a8] rounded-[6px] px-[9px] py-[5px] text-[12px] leading-none">
									{t('products.status.active')}
								</span>
							) : (
								<span className="inline-flex items-center bg-[#1e1e1e] border border-[#2a2a2a] text-[#a0a0a0] rounded-[6px] px-[9px] py-[5px] text-[12px] leading-none">
									{t('products.status.inactive')}
								</span>
							)}
						</TableCell>
						<TableCell className="text-right">
							<Button
								type="button"
								variant="ghost"
								title={t('products.editProductTitle')}
								onClick={() => onEdit?.(product)}
								className="text-[#a0a0a0] hover:text-[#f0f0f0]"
							>
								<Pencil size={15} />
							</Button>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
