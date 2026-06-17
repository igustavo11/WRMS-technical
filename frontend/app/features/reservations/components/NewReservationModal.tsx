import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { useEffect, useMemo, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Button } from '~/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '~/components/ui/select';
import {
	useInventory,
	useWarehouses,
} from '~/features/inventory/hooks/useInventory';
import { useProducts } from '~/features/products/hooks/useProducts';
import { useCreateReservation } from '../hooks/useCreateReservation';
import {
	type CreateReservationFormValues,
	createReservationSchema,
} from '../schemas/reservationSchema';

type Props = {
	open: boolean;
	onClose: () => void;
};

export function NewReservationModal({ open, onClose }: Props) {
	const createMutation = useCreateReservation();
	const { data: products } = useProducts();
	const { data: warehouses } = useWarehouses();
	const { data: inventory } = useInventory();
	const { t, i18n } = useTranslation();
	const schema = useMemo(() => createReservationSchema(t), [i18n.language]);

	const {
		register,
		handleSubmit,
		control,
		watch,
		setError,
		reset,
		formState: { errors },
	} = useForm<CreateReservationFormValues>({
		resolver: zodResolver(schema),
		defaultValues: {
			productId: '',
			warehouseId: '',
			quantity: undefined as unknown as number,
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

	useEffect(() => {
		if (open) closingRef.current = false;
	}, [open]);

	function handleCancel() {
		if (closingRef.current) return;
		closingRef.current = true;
		reset();
		onClose();
	}

	const onSubmit = async (values: CreateReservationFormValues) => {
		if (values.quantity > availableStock) {
			setError('quantity', {
				message: t('reservations.modal.insufficientStock'),
			});
			return;
		}

		try {
			await createMutation.mutateAsync(values);
			toast.success(t('reservations.toast.createSuccess'));
			handleCancel();
		} catch (err) {
			if (axios.isAxiosError(err) && err.response?.status === 422) {
				const errorCode = err.response.data?.error;
				if (errorCode === 'INSUFFICIENT_STOCK') {
					setError('quantity', {
						message: t('reservations.modal.insufficientStock'),
					});
				} else if (errorCode === 'INACTIVE_PRODUCT') {
					toast.error(t('reservations.toast.inactiveProduct'));
				} else if (errorCode === 'INACTIVE_WAREHOUSE') {
					toast.error(t('reservations.toast.inactiveWarehouse'));
				} else {
					toast.error(t('reservations.toast.createError'));
				}
			} else {
				toast.error(t('reservations.toast.createError'));
			}
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(open) => {
				if (!open) handleCancel();
			}}
		>
			<DialogContent className="bg-[#161616] border border-[#2a2a2a] max-w-[500px] p-0 gap-0">
				<DialogHeader className="px-[20px] pt-[20px] pb-[17px] border-b border-[#2a2a2a]">
					<DialogTitle className="text-[#f0f0f0] text-[24px] font-semibold leading-[31.2px]">
						{t('reservations.modal.title')}
					</DialogTitle>
				</DialogHeader>

				<form
					onSubmit={handleSubmit(onSubmit)}
					className="flex flex-col px-[20px] py-[20px] gap-[16px]"
				>
					<div className="flex flex-col gap-[4px]">
						<Label className="text-[#f0f0f0] text-[12px] leading-[16.8px]">
							{t('reservations.modal.product')}{' '}
							<span className="text-[#e24b4a]">*</span>
						</Label>
						<Controller
							name="productId"
							control={control}
							render={({ field }) => (
								<Select value={field.value} onValueChange={field.onChange}>
									<SelectTrigger
										aria-label={t('reservations.modal.selectProduct')}
										className="w-full bg-[#1e1e1e] border border-[#2a2a2a]"
									>
										<SelectValue
											placeholder={t(
												'reservations.modal.selectProductPlaceholder',
											)}
										>
											{(value: string | null) => {
												if (!value)
													return t(
														'reservations.modal.selectProductPlaceholder',
													);
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
							{t('reservations.modal.warehouse')}{' '}
							<span className="text-[#e24b4a]">*</span>
						</Label>
						<Controller
							name="warehouseId"
							control={control}
							render={({ field }) => (
								<Select value={field.value} onValueChange={field.onChange}>
									<SelectTrigger
										aria-label={t('reservations.modal.selectWarehouse')}
										className="w-full bg-[#1e1e1e] border border-[#2a2a2a]"
									>
										<SelectValue
											placeholder={t(
												'reservations.modal.selectWarehousePlaceholder',
											)}
										>
											{(value: string | null) => {
												if (!value)
													return t(
														'reservations.modal.selectWarehousePlaceholder',
													);
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

					<div className="flex flex-col gap-[4px]">
						<Label className="text-[#f0f0f0] text-[12px] leading-[16.8px]">
							{t('reservations.modal.quantity')}{' '}
							<span className="text-[#e24b4a]">*</span>
						</Label>
						<Input
							type="number"
							min={1}
							aria-label={t('reservations.modal.quantity')}
							{...register('quantity', { valueAsNumber: true })}
							aria-invalid={!!errors.quantity}
							className="bg-[#1e1e1e] border border-[#2a2a2a]"
						/>
						{errors.quantity && (
							<span className="text-[#e24b4a] text-[12px]">
								{errors.quantity.message}
							</span>
						)}
						{selectedProductId && selectedWarehouseId && (
							<p className="text-[#1cc8a8] text-[12px]">
								ⓘ {t('reservations.modal.available')}:{' '}
								{t('reservations.modal.availableUnits', {
									count: availableStock,
								})}
							</p>
						)}
					</div>

					<DialogFooter className="flex-row justify-end gap-[12px] px-0 pb-0 border-t-0 bg-transparent pt-[4px]">
						<Button
							type="button"
							variant="outline"
							onClick={handleCancel}
							className="bg-[#1e1e1e] border border-[#2a2a2a] text-[#f0f0f0] hover:bg-[#2a2a2a]"
						>
							{t('common.cancel')}
						</Button>
						<Button
							type="submit"
							disabled={
								createMutation.isPending || Object.keys(errors).length > 0
							}
							className="bg-[#1cc8a8] text-[#00382d] disabled:bg-[#353534] disabled:text-[#a0a0a0] hover:bg-[#4ce4c3]"
						>
							{t('reservations.modal.submit')}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
