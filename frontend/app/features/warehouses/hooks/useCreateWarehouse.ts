import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createWarehouse } from '../services/warehousesApi';

export const useCreateWarehouse = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: createWarehouse,
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ['warehouses'] }),
	});
};
