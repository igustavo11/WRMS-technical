import { Search } from 'lucide-react';
import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Switch } from '~/components/ui/switch';
import { NewProductModal } from '../components/NewProductModal';
import { ProductsTable } from '../components/ProductsTable';
import { useProducts } from '../hooks/useProducts';
import type { Product } from '../services/productsApi';

export default function ProductsPage() {
	const { data, isLoading } = useProducts();
	const [search, setSearch] = useState('');
	const [onlyActive, setOnlyActive] = useState(false);
	const [modalOpen, setModalOpen] = useState(false);
	const [editingProduct, setEditingProduct] = useState<Product | undefined>();

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
		<div className="flex flex-col h-full p-6 gap-6">
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

			<ProductsTable
				products={filtered}
				isLoading={isLoading}
				onEdit={handleEdit}
			/>

			<NewProductModal
				open={modalOpen}
				onClose={handleClose}
				editProduct={editingProduct}
			/>
		</div>
	);
}
