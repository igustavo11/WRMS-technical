'use client';

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { XIcon } from 'lucide-react';
import type * as React from 'react';
import { cn } from '~/lib/utils';

function Sheet({ ...props }: DialogPrimitive.Root.Props) {
	return <DialogPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
	return <DialogPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({ ...props }: DialogPrimitive.Close.Props) {
	return <DialogPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
	return (
		<DialogPrimitive.Backdrop
			data-slot="sheet-overlay"
			className={cn(
				'fixed inset-0 isolate z-50 bg-[rgba(19,19,19,0.8)] backdrop-blur-[2px] duration-100 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0',
				className,
			)}
			{...props}
		/>
	);
}

function SheetContent({
	className,
	children,
	showCloseButton = true,
	...props
}: DialogPrimitive.Popup.Props & {
	showCloseButton?: boolean;
}) {
	return (
		<DialogPrimitive.Portal>
			<SheetOverlay />
			<DialogPrimitive.Popup
				data-slot="sheet-content"
				className={cn(
					'fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-[#1e1e1e] rounded-t-[20px] duration-100 outline-none max-h-[90vh] overflow-y-auto data-open:animate-in data-open:slide-in-from-bottom data-closed:animate-out data-closed:slide-out-to-bottom',
					className,
				)}
				{...props}
			>
				<div className="w-[48px] h-[4px] bg-[#2a2a2a] rounded-full mx-auto my-[12px] shrink-0" />
				{showCloseButton && (
					<DialogPrimitive.Close
						data-slot="sheet-close"
						className="absolute top-4 right-4 text-[#a0a0a0] hover:text-[#f0f0f0] transition-colors"
					>
						<XIcon size={18} />
						<span className="sr-only">Close</span>
					</DialogPrimitive.Close>
				)}
				{children}
			</DialogPrimitive.Popup>
		</DialogPrimitive.Portal>
	);
}

function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="sheet-header"
			className={cn('flex flex-col gap-2 px-[20px]', className)}
			{...props}
		/>
	);
}

function SheetTitle({ className, ...props }: DialogPrimitive.Title.Props) {
	return (
		<DialogPrimitive.Title
			data-slot="sheet-title"
			className={cn(
				'text-[#f0f0f0] text-[24px] font-semibold leading-[31.2px]',
				className,
			)}
			{...props}
		/>
	);
}

function SheetDescription({
	className,
	...props
}: DialogPrimitive.Description.Props) {
	return (
		<DialogPrimitive.Description
			data-slot="sheet-description"
			className={cn('text-sm text-muted-foreground', className)}
			{...props}
		/>
	);
}

function SheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="sheet-footer"
			className={cn(
				'flex flex-col gap-[12px] px-[20px] pb-[20px] pt-[4px]',
				className,
			)}
			{...props}
		/>
	);
}

export {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetOverlay,
	SheetTitle,
	SheetTrigger,
};
