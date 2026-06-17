import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type UpdateProductDto, updateProduct } from '../services/productsApi';

export const useUpdateProduct = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdateProductDto }) =>
			updateProduct(id, data),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
	});
};
