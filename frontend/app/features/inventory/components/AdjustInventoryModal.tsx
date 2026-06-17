import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { AlertTriangle, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '~/components/ui/button';
import { useAdjustInventory } from '../hooks/useInventory';

const schema = z.object({
	quantity: z
		.number()
		.int('Deve ser número inteiro')
		.min(0, 'Quantidade não pode ser negativa'),
});
type FormValues = z.infer<typeof schema>;

export type ModalItem = {
	id: string;
	productId: string;
	warehouseId: string;
	quantity: number;
	productName: string;
	productSku: string;
	warehouseName: string;
};

type Props = {
	item: ModalItem;
	onClose: () => void;
};

export function AdjustInventoryModal({ item, onClose }: Props) {
	const mutation = useAdjustInventory();
	const {
		register,
		handleSubmit,
		setError,
		formState: { errors },
	} = useForm<FormValues>({
		resolver: zodResolver(schema),
		defaultValues: { quantity: item.quantity },
	});

	const onSubmit = (values: FormValues) => {
		mutation.mutate(
			{
				productId: item.productId,
				warehouseId: item.warehouseId,
				quantity: values.quantity,
			},
			{
				onSuccess: () => onClose(),
				onError: (err) => {
					if (
						axios.isAxiosError(err) &&
						err.response?.data?.error === 'NEGATIVE_QUANTITY'
					) {
						setError('quantity', {
							message: 'Quantidade não pode ser negativa',
						});
					}
				},
			},
		);
	};

	return (
		<div
			className="fixed inset-0 bg-[rgba(0,0,0,0.8)] backdrop-blur-[1px] flex items-center justify-center z-50"
			role="dialog"
			aria-modal="true"
			tabIndex={-1}
			onKeyDown={(e) => {
				if (e.key === 'Escape') onClose();
			}}
			onClick={onClose}
		>
			<div
				role="document"
				className="bg-[#1e1e1e] border border-[#3a3a3a] rounded-[8px] w-[440px] p-[20px] flex flex-col"
				onClick={(e) => e.stopPropagation()}
				onKeyDown={(e) => {
					if (e.key === 'Escape') {
						onClose();
						e.stopPropagation();
					}
				}}
			>
				<div className="flex justify-between items-center pb-[17px] border-b border-[#2a2a2a] mb-[20px]">
					<h2 className="text-[#f0f0f0] text-[24px] font-semibold leading-[31.2px]">
						Ajustar Inventário
					</h2>
					<Button
						variant="ghost"
						size="icon-xs"
						className="text-[#a0a0a0] hover:text-[#f0f0f0]"
						onClick={onClose}
					>
						<X size={14} />
					</Button>
				</div>

				<form
					onSubmit={handleSubmit(onSubmit)}
					className="flex flex-col gap-[11px]"
				>
					<div className="flex flex-col gap-[4px]">
						<label className="text-[#a0a0a0] text-[12px] leading-[16.8px]">
							Produto
						</label>
						<div className="bg-[#1c1b1b] border border-[#2a2a2a] rounded-[10px] opacity-70 px-[13px] py-[9px] text-[#f0f0f0] text-[14px]">
							{item.productName}
						</div>
					</div>

					<div className="flex flex-col gap-[4px]">
						<label className="text-[#a0a0a0] text-[12px] leading-[16.8px]">
							SKU
						</label>
						<div className="bg-[#1c1b1b] border border-[#2a2a2a] rounded-[10px] opacity-70 px-[13px] py-[9px] text-[#a0a0a0] text-[12px]">
							{item.productSku}
						</div>
					</div>

					<div className="flex flex-col gap-[4px]">
						<label className="text-[#a0a0a0] text-[12px] leading-[16.8px]">
							Armazém
						</label>
						<div className="bg-[#1c1b1b] border border-[#2a2a2a] rounded-[10px] opacity-70 px-[13px] py-[9px] text-[#f0f0f0] text-[14px]">
							{item.warehouseName}
						</div>
					</div>

					<div className="flex gap-[24px] items-start pt-[24px]">
						<div className="bg-[#161616] border border-[#2a2a2a] rounded-[8px] w-[132px] p-[17px] flex flex-col items-center gap-[4px] shrink-0">
							<span className="text-[#a0a0a0] text-[12px]">Qtd. Atual</span>
							<span
								className={`text-[30px] font-bold leading-[36px] ${item.quantity < 10 ? 'text-[#e24b4a]' : 'text-[#f0f0f0]'}`}
							>
								{item.quantity}
							</span>
						</div>

						<div className="flex flex-col gap-[4px] flex-1">
							<label className="text-[#f0f0f0] text-[12px] leading-[16.8px]">
								Nova quantidade
							</label>
							<input
								type="number"
								min={0}
								{...register('quantity', { valueAsNumber: true })}
								className={`bg-[#1e1e1e] border rounded-[10px] px-[17px] py-[11px] text-[#f0f0f0] text-[14px] w-full outline-none focus:border-[#4ce4c3] ${errors.quantity ? 'border-[#e24b4a]' : 'border-[#2a2a2a]'}`}
							/>
							{errors.quantity && (
								<span className="text-[#e24b4a] text-[12px] flex items-center gap-[4px]">
									<AlertTriangle size={11} />
									{errors.quantity.message}
								</span>
							)}
						</div>
					</div>

					<div className="flex justify-end gap-[12px] pt-[17px] border-t border-[#2a2a2a] mt-[16px]">
						<Button variant="outline" onClick={onClose}>
							Cancelar
						</Button>
						<Button type="submit" disabled={mutation.isPending}>
							Salvar Ajuste
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
}
