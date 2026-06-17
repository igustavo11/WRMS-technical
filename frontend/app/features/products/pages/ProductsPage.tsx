import { ChevronRight, Search } from 'lucide-react';
import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Switch } from '~/components/ui/switch';
import { useIsMobile } from '~/shared/hooks/useIsMobile';
import { NewProductModal } from '../components/NewProductModal';
import { ProductEditBottomSheet } from '../components/ProductEditBottomSheet';
import { ProductsTable } from '../components/ProductsTable';
import { useProducts } from '../hooks/useProducts';
import type { Product } from '../services/productsApi';

function ProductStatusBadge({ isActive }: { isActive: boolean }) {
	const styles = isActive
		? {
				bg: 'bg-[rgba(28,200,168,0.15)]',
				border: 'border-[rgba(28,200,168,0.3)]',
				text: 'text-[#1cc8a8]',
				label: 'ATIVO',
			}
		: {
				bg: 'bg-[rgba(226,75,74,0.15)]',
				border: 'border-[rgba(226,75,74,0.3)]',
				text: 'text-[#e24b4a]',
				label: 'INATIVO',
			};
	return (
		<span
			className={`${styles.bg} border ${styles.border} ${styles.text} text-[11px] tracking-[0.88px] px-[9px] py-[5px] rounded-[6px]`}
		>
			{styles.label}
		</span>
	);
}

export default function ProductsPage() {
	const { data, isLoading } = useProducts();
	const [search, setSearch] = useState('');
	const [onlyActive, setOnlyActive] = useState(false);
	const [modalOpen, setModalOpen] = useState(false);
	const [editingProduct, setEditingProduct] = useState<Product | undefined>();
	const isMobile = useIsMobile();

	const filtered = (data ?? []).filter((p) => {
		if (onlyActive && !p.isActive) return false;
		if (search) {
			const q = search.toLowerCase();
			return (
				p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)
			);
		}
		return true;
	});

	function handleOpenCreate() {
		setEditingProduct(undefined);
		setModalOpen(true);
	}

	function handleEdit(product: Product) {
		setEditingProduct(product);
		setModalOpen(true);
	}

	function handleClose() {
		setModalOpen(false);
		setEditingProduct(undefined);
	}

	return (
		<div className="flex flex-col h-full p-4 md:p-[32px] gap-4 md:gap-[32px]">
			<div className="flex items-center justify-between">
				<h1 className="text-[#f0f0f0] text-[28px] font-semibold leading-[36px]">
					Produtos
				</h1>
				<Button
					onClick={handleOpenCreate}
					className="bg-[rgba(28,200,168,0.15)] border border-[rgba(28,200,168,0.3)] text-[#1cc8a8] hover:bg-[rgba(28,200,168,0.25)]"
				>
					+ Novo Produto
				</Button>
			</div>

			<div className="flex items-center gap-4">
				<div className="relative flex-1 max-w-[400px]">
					<Search
						size={16}
						className="absolute left-3 top-1/2 -translate-y-1/2 text-[#606060] pointer-events-none"
					/>
					<Input
						placeholder="Buscar por SKU ou Nome..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="bg-[#1e1e1e] border border-[#2a2a2a] pl-9 text-[#f0f0f0] placeholder:text-[#606060]"
					/>
				</div>
				<div className="flex items-center gap-2">
					<Switch
						checked={onlyActive}
						onCheckedChange={(checked) => setOnlyActive(checked)}
					/>
					<span className="text-[#a0a0a0] text-[14px]">Apenas ativos</span>
				</div>
			</div>

			{isMobile ? (
				<div className="flex flex-col gap-[8px]">
					{filtered.length === 0 ? (
						<p className="text-[#a0a0a0] text-sm text-center py-8">
							Nenhum produto encontrado.
						</p>
					) : (
						filtered.map((product) => (
							<Button
								key={product.id}
								type="button"
								variant="outline"
								onClick={() => handleEdit(product)}
								className="bg-[#161616] border-[#2a2a2a] rounded-[10px] p-[17px] flex items-center justify-between w-full text-left h-auto"
							>
								<div className="flex flex-col min-w-0 pr-[16px] flex-1">
									<span className="text-[#606060] text-[11px] tracking-[0.88px] uppercase leading-[11px] pb-[4px]">
										{product.sku}
									</span>
									<span className="text-[#f0f0f0] text-[14px] font-semibold leading-[21px] pb-[2px]">
										{product.name}
									</span>
									<span className="text-[#a0a0a0] text-[12px] truncate w-[200px]">
										{product.description}
									</span>
								</div>
								<div className="flex flex-col items-end gap-[8px] shrink-0">
									<ProductStatusBadge isActive={product.isActive} />
									<ChevronRight size={12} className="text-[#606060]" />
								</div>
							</Button>
						))
					)}
				</div>
			) : (
				<ProductsTable
					products={filtered}
					isLoading={isLoading}
					onEdit={handleEdit}
				/>
			)}

			{isMobile ? (
				<ProductEditBottomSheet
					open={modalOpen}
					onClose={handleClose}
					editProduct={editingProduct}
				/>
			) : (
				<NewProductModal
					open={modalOpen}
					onClose={handleClose}
					editProduct={editingProduct}
				/>
			)}
		</div>
	);
}
