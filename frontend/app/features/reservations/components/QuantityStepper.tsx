import { Minus, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';

type Props = {
	value: number;
	onChange: (v: number) => void;
	hasError: boolean;
};

export function QuantityStepper({ value, onChange, hasError }: Props) {
	const { t } = useTranslation();

	return (
		<div
			className={cn(
				'inline-flex items-center border rounded-[8px] overflow-hidden',
				hasError ? 'border-[#e24b4a]' : 'border-[#2a2a2a]',
			)}
		>
			<Button
				type="button"
				variant="ghost"
				onClick={() => onChange(Math.max(1, value - 1))}
				disabled={value <= 1}
				className="w-[44px] h-[44px] text-[#a0a0a0] hover:text-[#f0f0f0] hover:bg-[#2a2a2a] rounded-none"
				aria-label={t('reservations.stepper.decrease')}
			>
				<Minus size={16} />
			</Button>
			<div
				className={cn(
					'w-[60px] h-[44px] flex items-center justify-center text-[16px] font-semibold border-x border-[#2a2a2a]',
					hasError ? 'text-[#e24b4a]' : 'text-[#f0f0f0]',
				)}
			>
				{value}
			</div>
			<Button
				type="button"
				variant="ghost"
				onClick={() => onChange(value + 1)}
				className="w-[44px] h-[44px] text-[#a0a0a0] hover:text-[#f0f0f0] hover:bg-[#2a2a2a] rounded-none"
				aria-label={t('reservations.stepper.increase')}
			>
				<Plus size={16} />
			</Button>
		</div>
	);
}
