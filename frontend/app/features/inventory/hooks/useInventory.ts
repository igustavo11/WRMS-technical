import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import i18n from '~/i18n/config';
import {
	type AdjustInventoryPayload,
	adjustInventory,
	getInventory,
	getProducts,
	getWarehouses,
} from '../services/inventoryApi';

export function useInventory() {
	return useQuery({ queryKey: ['inventory'], queryFn: getInventory });
}

export function useProducts() {
	return useQuery({ queryKey: ['products'], queryFn: getProducts });
}

export function useWarehouses() {
	return useQuery({ queryKey: ['warehouses'], queryFn: getWarehouses });
}

export function useAdjustInventory() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: AdjustInventoryPayload) => adjustInventory(payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['inventory'] });
			toast.success(i18n.t('inventory.toast.adjustSuccess'));
		},
		onError: () => {
			toast.error(i18n.t('inventory.toast.adjustError'));
		},
	});
}
