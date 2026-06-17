'use client';

import { Switch as SwitchPrimitive } from '@base-ui/react/switch';
import type * as React from 'react';

import { cn } from '~/lib/utils';

function Switch({
	className,
	...props
}: SwitchPrimitive.Root.Props & React.RefAttributes<HTMLElement>) {
	return (
		<SwitchPrimitive.Root
			data-slot="switch"
			className={cn(
				'peer inline-flex h-[24px] w-[44px] shrink-0 cursor-pointer items-center rounded-full border border-input bg-[#1e1e1e] transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-disabled:cursor-not-allowed data-disabled:opacity-50 data-[checked]:border-[#1cc8a8] data-[checked]:bg-[rgba(28,200,168,0.3)]',
				className,
			)}
			{...props}
		>
			<SwitchPrimitive.Thumb
				data-slot="switch-thumb"
				className={cn(
					'pointer-events-none block size-[20px] rounded-full bg-[#a0a0a0] shadow-sm ring-0 transition-transform data-[checked]:translate-x-[22px] data-[checked]:bg-[#1cc8a8]',
				)}
			/>
		</SwitchPrimitive.Root>
	);
}

export { Switch };
