import { useNavigate } from 'react-router';
import type { Warehouse } from '../services/warehousesApi';

type WarehouseWithMetrics = Warehouse & {
	totalProducts: number;
	totalQuantity: number;
	activeReservations: number;
};

type WarehouseCardProps = {
	warehouse: WarehouseWithMetrics;
};

function MaskIcon({ src, w, h }: { src: string; w: number; h: number }) {
	return (
		<span
			aria-hidden
			style={{
				display: 'inline-block',
				width: w,
				height: h,
				flexShrink: 0,
				backgroundColor: 'currentColor',
				maskImage: `url(${src})`,
				maskRepeat: 'no-repeat',
				maskSize: 'contain',
				maskPosition: 'center',
				WebkitMaskImage: `url(${src})`,
				WebkitMaskRepeat: 'no-repeat',
				WebkitMaskSize: 'contain',
				WebkitMaskPosition: 'center',
			}}
		/>
	);
}

function StatusBadge({ isActive }: { isActive: boolean }) {
	if (isActive) {
		return (
			<span className="bg-[rgba(28,200,168,0.12)] border border-[rgba(28,200,168,0.3)] text-[#1cc8a8] rounded-[6px] px-[9px] py-[5px] text-[11px] tracking-[0.88px] uppercase whitespace-nowrap shrink-0">
				ATIVO
			</span>
		);
	}
	return (
		<span className="bg-[#1e1e1e] border border-[#3a3a3a] text-[#a0a0a0] rounded-[6px] px-[9px] py-[5px] text-[11px] tracking-[0.88px] uppercase whitespace-nowrap shrink-0">
			INATIVO
		</span>
	);
}

export function WarehouseCard({ warehouse }: WarehouseCardProps) {
	const navigate = useNavigate();

	return (
		<div
			className={`bg-[#161616] border border-[#2a2a2a] rounded-[8px] p-[21px] flex flex-col justify-between overflow-hidden relative ${!warehouse.isActive ? 'opacity-70' : ''}`}
		>
			<div className="flex items-start justify-between pb-4 border-b border-[#2a2a2a]">
				<div className="flex flex-col gap-1 min-w-0 mr-3">
					<span className="text-[#f0f0f0] text-[18px] leading-[27px] truncate">
						{warehouse.name}
					</span>
					<div className="flex items-center gap-[6px]">
						<MaskIcon src="/icons/location.svg" w={9} h={12} />
						<span className="text-[#a0a0a0] text-[12px] truncate">
							{warehouse.location}
						</span>
					</div>
				</div>
				<StatusBadge isActive={warehouse.isActive} />
			</div>

			<div className="grid grid-cols-2 gap-4 pt-[17px] pb-[24px]">
				<div className="flex flex-col gap-1">
					<span className="text-[#a0a0a0] text-[12px]">Produtos Unicos</span>
					<span className="text-[#f0f0f0] text-[20px] leading-[30px]">
						{warehouse.totalProducts.toLocaleString('pt-BR')}
					</span>
				</div>
				<div className="flex flex-col gap-1">
					<span className="text-[#a0a0a0] text-[12px]">Total Unidades</span>
					<span className="text-[#f0f0f0] text-[20px] leading-[30px]">
						{warehouse.totalQuantity.toLocaleString('pt-BR')}
					</span>
				</div>
			</div>

			<button
				type="button"
				onClick={() => navigate('/inventory', { state: { warehouseFilter: warehouse.id } })}
				className={
					warehouse.isActive
						? 'border border-[#1cc8a8] rounded-[10px] h-[40px] w-full flex items-center justify-center gap-2 text-[#1cc8a8] text-[14px] font-medium hover:bg-[rgba(28,200,168,0.08)] transition-colors'
						: 'border border-[#2a2a2a] rounded-[10px] h-[40px] w-full flex items-center justify-center gap-2 text-[#a0a0a0] text-[14px] font-medium'
				}
			>
				<MaskIcon src="/icons/inventory.svg" w={15} h={15} />
				Ver Inventario
			</button>
		</div>
	);
}
