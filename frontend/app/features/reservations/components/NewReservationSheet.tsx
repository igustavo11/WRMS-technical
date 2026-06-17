import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { Package } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Button } from '~/components/ui/button';
import { Label } from '~/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '~/components/ui/select';
import {
	Sheet,
	SheetContent,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from '~/components/ui/sheet';
import {
	useInventory,
	useWarehouses,
} from '~/features/inventory/hooks/useInventory';
import { useProducts } from '~/features/products/hooks/useProducts';
import { cn } from '~/lib/utils';
import { useCreateReservation } from '../hooks/useCreateReservation';
import {
	type CreateReservationFormValues,
	createReservationSchema,
} from '../schemas/reservationSchema';
import { QuantityStepper } from './QuantityStepper';

type Props = {
	open: boolean;
	onClose: () => void;
};

export function NewReservationSheet({ open, onClose }: Props) {
	const createMutation = useCreateReservation();
	const { data: products } = useProducts();
	const { data: warehouses } = useWarehouses();
	const { data: inventory } = useInventory();

	const [stepperValue, setStepperValue] = useState(1);

	const {
		handleSubmit,
		control,
		watch,
		setValue,
		setError,
		reset,
		formState: { errors },
	} = useForm<CreateReservationFormValues>({
		resolver: zodResolver(createReservationSchema),
		defaultValues: {
			productId: '',
			warehouseId: '',
			quantity: 1,
		},
	});

	const closingRef = useRef(false);

	const selectedProductId = watch('productId');
	const selectedWarehouseId = watch('warehouseId');

	const availableStock = useMemo(() => {
		if (!selectedProductId || !selectedWarehouseId) return 0;
		const record = inventory?.find(
			(i) =>
				i.productId === selectedProductId &&
				i.warehouseId === selectedWarehouseId,
		);
		return record?.quantity ?? 0;
	}, [selectedProductId, selectedWarehouseId, inventory]);

	const quantityError = errors.quantity?.message;
	const exceedsStock = stepperValue > availableStock;

	useEffect(() => {
		if (open) {
			closingRef.current = false;
			setStepperValue(1);
		}
	}, [open]);

	useEffect(() => {
		setValue('quantity', stepperValue);
	}, [stepperValue, setValue]);

	function handleCancel() {
		if (closingRef.current) return;
		closingRef.current = true;
		reset();
		setStepperValue(1);
		onClose();
	}

	const onSubmit = async (values: CreateReservationFormValues) => {
		if (values.quantity > availableStock) {
			setError('quantity', {
				message:
					'Estoque insuficiente. A quantidade solicitada excede o estoque disponível para este armazém.',
			});
			return;
		}

		try {
			await createMutation.mutateAsync(values);
			toast.success('Reserva criada com sucesso.');
			handleCancel();
		} catch (err) {
			if (axios.isAxiosError(err) && err.response?.status === 422) {
				const errorCode = err.response.data?.error;
				if (errorCode === 'INSUFFICIENT_STOCK') {
					setError('quantity', {
						message:
							'Estoque insuficiente. A quantidade solicitada excede o estoque disponível para este armazém.',
					});
				} else if (errorCode === 'INACTIVE_PRODUCT') {
					toast.error('Produto inativo. Não é possível criar a reserva.');
				} else if (errorCode === 'INACTIVE_WAREHOUSE') {
					toast.error('Armazém inativo. Não é possível criar a reserva.');
				} else {
					toast.error('Erro ao criar reserva. Tente novamente.');
				}
			} else {
				toast.error('Erro ao criar reserva. Tente novamente.');
			}
		}
	};

	return (
		<Sheet
			open={open}
			onOpenChange={(open) => {
				if (!open) handleCancel();
			}}
		>
			<SheetContent className="bg-[#1e1e1e] px-0 pb-0 min-h-[60vh]">
				<SheetHeader className="px-[20px] pt-[4px] pb-[17px] border-b border-[#2a2a2a]">
					<SheetTitle className="text-[#f0f0f0] text-[24px] font-semibold leading-[31.2px]">
						Nova Reserva
					</SheetTitle>
				</SheetHeader>

				<form
					onSubmit={handleSubmit(onSubmit)}
					className="flex flex-col px-[20px] py-[20px] gap-[16px] overflow-y-auto flex-1"
				>
					<div className="flex flex-col gap-[4px]">
						<Label className="text-[#f0f0f0] text-[12px] leading-[16.8px]">
							Produto <span className="text-[#e24b4a]">*</span>
						</Label>
						<Controller
							name="productId"
							control={control}
							render={({ field }) => (
								<Select value={field.value} onValueChange={field.onChange}>
									<SelectTrigger
										aria-label="Selecionar produto"
										className="w-full bg-[#161616] border border-[#2a2a2a]"
									>
										<SelectValue placeholder="Selecione um produto">
											{(value: string | null) => {
												if (!value) return 'Selecione um produto';
												const product = products?.find((p) => p.id === value);
												return product?.name ?? value;
											}}
										</SelectValue>
									</SelectTrigger>
									<SelectContent>
										{products
											?.filter((p) => p.isActive)
											.map((p) => (
												<SelectItem key={p.id} value={p.id}>
													{p.name}
												</SelectItem>
											))}
									</SelectContent>
								</Select>
							)}
						/>
						{errors.productId && (
							<span className="text-[#e24b4a] text-[12px]">
								{errors.productId.message}
							</span>
						)}
					</div>

					<div className="flex flex-col gap-[4px]">
						<Label className="text-[#f0f0f0] text-[12px] leading-[16.8px]">
							Armazém <span className="text-[#e24b4a]">*</span>
						</Label>
						<Controller
							name="warehouseId"
							control={control}
							render={({ field }) => (
								<Select value={field.value} onValueChange={field.onChange}>
									<SelectTrigger
										aria-label="Selecionar armazém"
										className="w-full bg-[#161616] border border-[#2a2a2a]"
									>
										<SelectValue placeholder="Selecione um armazém">
											{(value: string | null) => {
												if (!value) return 'Selecione um armazém';
												const warehouse = warehouses?.find(
													(w) => w.id === value,
												);
												return warehouse?.name ?? value;
											}}
										</SelectValue>
									</SelectTrigger>
									<SelectContent>
										{warehouses
											?.filter((w) => w.isActive)
											.map((w) => (
												<SelectItem key={w.id} value={w.id}>
													{w.name}
												</SelectItem>
											))}
									</SelectContent>
								</Select>
							)}
						/>
						{errors.warehouseId && (
							<span className="text-[#e24b4a] text-[12px]">
								{errors.warehouseId.message}
							</span>
						)}
					</div>

					{selectedProductId && selectedWarehouseId && (
						<div className="bg-[#161616] border border-[#2a2a2a] rounded-[8px] p-[17px] flex gap-[12px] items-center">
							<div className="bg-[rgba(28,200,168,0.12)] border border-[rgba(28,200,168,0.3)] rounded-full size-[32px] flex items-center justify-center shrink-0">
								<Package size={12} className="text-[#1cc8a8]" />
							</div>
							<div className="flex flex-col">
								<span className="text-[#a0a0a0] text-[12px]">Disponível</span>
								<span className="text-[#f0f0f0] text-[14px] font-bold">
									{availableStock} unidades
								</span>
							</div>
						</div>
					)}

					<div className="flex flex-col gap-[4px]">
						<Label
							className={cn(
								'text-[12px] leading-[16.8px]',
								quantityError ? 'text-[#e24b4a]' : 'text-[#f0f0f0]',
							)}
						>
							Quantidade <span className="text-[#e24b4a]">*</span>
						</Label>
						<Controller
							name="quantity"
							control={control}
							render={() => (
								<QuantityStepper
									value={stepperValue}
									onChange={setStepperValue}
									hasError={!!quantityError}
								/>
							)}
						/>
						{quantityError && (
							<span className="text-[#e24b4a] text-[12px]">
								{quantityError}
							</span>
						)}
					</div>

					<SheetFooter className="gap-[12px] px-0 pb-0 border-t-0 bg-transparent pt-[12px]">
						<Button
							type="button"
							variant="outline"
							onClick={handleCancel}
							className="w-full bg-[#161616] border border-[#2a2a2a] text-[#f0f0f0] hover:bg-[#2a2a2a]"
						>
							Cancelar
						</Button>
						<Button
							type="submit"
							disabled={
								createMutation.isPending ||
								Object.keys(errors).length > 0 ||
								exceedsStock
							}
							className="w-full bg-[#1cc8a8] text-[#00382d] disabled:bg-[#353534] disabled:text-[#a0a0a0] hover:bg-[#4ce4c3]"
						>
							Criar Reserva
						</Button>
					</SheetFooter>
				</form>
			</SheetContent>
		</Sheet>
	);
}
