import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createReservation } from '../services/reservationsApi';

export function useCreateReservation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createReservation,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['reservations'] });
			queryClient.invalidateQueries({ queryKey: ['inventory'] });
		},
	});
}
