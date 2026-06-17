import { zodResolver } from '@hookform/resolvers/zod';
import { Save, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Button } from '~/components/ui/button';
import {
	Sheet,
	SheetContent,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from '~/components/ui/sheet';
import { Switch } from '~/components/ui/switch';
import { useCreateWarehouse } from '../hooks/useCreateWarehouse';
import {
	type CreateWarehouseFormValues,
	createWarehouseSchema,
} from '../schemas/warehouseSchema';

type Props = {
	open: boolean;
	onClose: () => void;
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

export function NewWarehouseSheet({ open, onClose }: Props) {
	const mutation = useCreateWarehouse();

	const {
		register,
		handleSubmit,
		watch,
		setValue,
		reset,
		formState: { errors },
	} = useForm<CreateWarehouseFormValues>({
		resolver: zodResolver(createWarehouseSchema),
		defaultValues: {
			name: '',
			location: '',
			isActive: true,
		},
	});

	function handleCancel() {
		reset();
		onClose();
	}

	const onSubmit = async (values: CreateWarehouseFormValues) => {
		try {
			await mutation.mutateAsync({
				name: values.name,
				location: values.location,
				isActive: values.isActive,
			});
			toast.success('Armazem criado com sucesso.');
			handleCancel();
		} catch {
			toast.error('Erro ao criar armazem. Tente novamente.');
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
						Novo Armazem
					</SheetTitle>
				</SheetHeader>

				<form
					onSubmit={handleSubmit(onSubmit)}
					className="flex flex-col px-[20px] py-[20px] gap-[16px] overflow-y-auto flex-1"
				>
					<div className="flex flex-col gap-[4px]">
						<label className="text-[#a0a0a0] text-[12px]">
							Nome do Armazem <span className="text-[#e24b4a]">*</span>
						</label>
						<input
							{...register('name')}
							placeholder="Ex: Hub Leste - RJ"
							className={`bg-[#161616] border rounded-[10px] p-[13px] text-[14px] text-[#f0f0f0] w-full outline-none ${errors.name ? 'border-[#e24b4a]' : 'border-[#2a2a2a]'}`}
						/>
						{errors.name && (
							<span className="text-[#e24b4a] text-[12px]">
								{errors.name.message}
							</span>
						)}
					</div>

					<div className="flex flex-col gap-[4px]">
						<label className="text-[#a0a0a0] text-[12px]">
							Localizacao Fisica <span className="text-[#e24b4a]">*</span>
						</label>
						<div className="relative">
							<div className="absolute left-[12px] top-1/2 -translate-y-1/2 text-[#606060]">
								<MaskIcon src="/icons/location.svg" w={12} h={15} />
							</div>
							<input
								{...register('location')}
								placeholder="Cidade, Estado"
								className={`bg-[#161616] border rounded-[10px] pl-[41px] pr-[13px] py-[13px] text-[14px] text-[#f0f0f0] w-full outline-none ${errors.location ? 'border-[#e24b4a]' : 'border-[#2a2a2a]'}`}
							/>
						</div>
						{errors.location && (
							<span className="text-[#e24b4a] text-[12px]">
								{errors.location.message}
							</span>
						)}
					</div>

					<div className="border-t border-[#2a2a2a] my-[8px]" />

					<div className="flex items-center justify-between">
						<div className="flex flex-col gap-0.5">
							<span className="text-[#f0f0f0] text-[14px]">Status Inicial</span>
							<span className="text-[#a0a0a0] text-[12px]">
								Definir armazem como operacional imediatamente.
							</span>
						</div>
						<div className="flex items-center gap-3">
							<Switch
								checked={watch('isActive')}
								onCheckedChange={(v) => setValue('isActive', v)}
							/>
							<span className="text-[#1cc8a8] text-[14px] font-medium">
								{watch('isActive') ? 'Ativo' : 'Inativo'}
							</span>
						</div>
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
							disabled={mutation.isPending}
							className="w-full bg-[#1cc8a8] text-[#004e40] hover:bg-[#4ce4c3] disabled:bg-[#353534] disabled:text-[#a0a0a0]"
						>
							<Save size={14} />
							Salvar Armazem
						</Button>
					</SheetFooter>
				</form>
			</SheetContent>
		</Sheet>
	);
}
