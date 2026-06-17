import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { AlertCircle, RotateCw } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
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
import { Switch } from '~/components/ui/switch';
import { Textarea } from '~/components/ui/textarea';
import { useCreateProduct } from '../hooks/useCreateProduct';
import { useUpdateProduct } from '../hooks/useUpdateProduct';
import {
	type CreateProductFormValues,
	createProductSchema,
} from '../schemas/productSchema';
import type { Product } from '../services/productsApi';

type Props = {
	open: boolean;
	onClose: () => void;
	editProduct?: Product;
};

export function NewProductModal({ open, onClose, editProduct }: Props) {
	const isEditing = !!editProduct;
	const createMutation = useCreateProduct();
	const updateMutation = useUpdateProduct();
	const mutation = isEditing ? updateMutation : createMutation;

	const {
		register,
		handleSubmit,
		control,
		setValue,
		setError,
		reset,
		formState: { errors },
	} = useForm<CreateProductFormValues>({
		resolver: zodResolver(createProductSchema),
		defaultValues: {
			sku: '',
			name: '',
			description: '',
			isActive: true,
		},
	});

	const closingRef = useRef(false);

	useEffect(() => {
		if (open) closingRef.current = false;
	}, [open]);

	useEffect(() => {
		if (editProduct) {
			reset({
				sku: editProduct.sku,
				name: editProduct.name,
				description: editProduct.description ?? '',
				isActive: editProduct.isActive,
			});
		} else {
			reset({ sku: '', name: '', description: '', isActive: true });
		}
	}, [editProduct, reset]);

	function handleGenerateSku() {
		setValue('sku', crypto.randomUUID(), { shouldValidate: true });
	}

	function handleCancel() {
		if (closingRef.current) return;
		closingRef.current = true;
		reset();
		onClose();
	}

	const onSubmit = async (values: CreateProductFormValues) => {
		if (isEditing && editProduct) {
			try {
				await updateMutation.mutateAsync({
					id: editProduct.id,
					data: {
						name: values.name,
						description: values.description || null,
						isActive: values.isActive,
					},
				});
				toast.success('Produto atualizado com sucesso.');
				handleCancel();
			} catch {
				toast.error('Erro ao atualizar produto. Tente novamente.');
			}
		} else {
			try {
				await createMutation.mutateAsync({
					sku: values.sku,
					name: values.name,
					description: values.description || undefined,
					isActive: values.isActive,
				});
				toast.success('Produto criado com sucesso.');
				handleCancel();
			} catch (err) {
				if (axios.isAxiosError(err) && err.response?.status === 409) {
					setError('sku', { message: 'SKU já cadastrado no sistema.' });
				} else {
					toast.error('Erro ao criar produto. Tente novamente.');
				}
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
						{isEditing ? 'Editar Produto' : 'Novo Produto'}
					</DialogTitle>
				</DialogHeader>

				<form
					onSubmit={handleSubmit(onSubmit)}
					className="flex flex-col px-[20px] py-[20px] gap-[16px]"
				>
					<div className="flex flex-col gap-[4px]">
						<Label className="text-[#f0f0f0] text-[12px] leading-[16.8px]">
							SKU <span className="text-[#e24b4a]">*</span>
						</Label>
						<div className="relative">
							<Input
								{...register('sku')}
								placeholder=""
								disabled={isEditing}
								className={`bg-[#1e1e1e] border pr-[36px] ${errors.sku ? 'border-[#e24b4a]' : 'border-[#2a2a2a]'} ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
							/>
							{!isEditing && (
								<div className="absolute right-[12px] top-1/2 -translate-y-1/2">
									{errors.sku ? (
										<AlertCircle size={16} className="text-[#e24b4a]" />
									) : (
										<button
											type="button"
											aria-label="Gerar SKU"
											onClick={handleGenerateSku}
											className="text-[#a0a0a0] hover:text-[#f0f0f0] transition-colors"
										>
											<RotateCw size={16} />
										</button>
									)}
								</div>
							)}
						</div>
						{errors.sku && (
							<span className="text-[#e24b4a] text-[12px]">
								{errors.sku.message}
							</span>
						)}
					</div>

					<div className="flex flex-col gap-[4px]">
						<Label className="text-[#f0f0f0] text-[12px] leading-[16.8px]">
							Nome do Produto <span className="text-[#e24b4a]">*</span>
						</Label>
						<Input
							{...register('name')}
							placeholder="Ex: Transformador 500kVA"
							className={`bg-[#1e1e1e] border ${errors.name ? 'border-[#e24b4a]' : 'border-[#2a2a2a]'}`}
						/>
						{errors.name && (
							<span className="text-[#e24b4a] text-[12px]">
								{errors.name.message}
							</span>
						)}
					</div>

					<div className="flex flex-col gap-[4px]">
						<Label className="text-[#f0f0f0] text-[12px] leading-[16.8px]">
							Descrição
						</Label>
						<Textarea
							{...register('description')}
							placeholder="Detalhes técnicos do produto..."
							className="bg-[#1e1e1e] border border-[#2a2a2a] resize-none"
						/>
					</div>

					<div className="border-t border-[#2a2a2a] pt-[16px]">
						<div className="flex items-center justify-between">
							<div className="flex flex-col gap-[2px]">
								<span className="text-[#f0f0f0] text-[14px]">
									Produto Ativo
								</span>
								<span className="text-[#a0a0a0] text-[12px]">
									Disponível para reservas e inventário
								</span>
							</div>
							<Controller
								name="isActive"
								control={control}
								render={({ field }) => (
									<Switch
										checked={field.value}
										onCheckedChange={(checked) => field.onChange(checked)}
									/>
								)}
							/>
						</div>
					</div>

					<DialogFooter className="flex-row justify-end gap-[12px] px-0 pb-0 border-t-0 bg-transparent">
						<Button
							type="button"
							variant="outline"
							onClick={handleCancel}
							className="bg-[#1e1e1e] border border-[#2a2a2a] text-[#f0f0f0] hover:bg-[#2a2a2a]"
						>
							Cancelar
						</Button>
						<Button
							type="submit"
							disabled={mutation.isPending}
							className="bg-[#1cc8a8] text-[#0a3d34] hover:bg-[#4ce4c3] disabled:opacity-50"
						>
							{isEditing ? 'Salvar' : 'Criar Produto'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
