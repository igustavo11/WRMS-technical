import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { cancelReservation } from '../services/reservationsApi';

export function useCancelReservation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: cancelReservation,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['reservations'] });
			queryClient.invalidateQueries({ queryKey: ['inventory'] });
			toast.success('Reserva cancelada com sucesso.');
		},
		onError: () => {
			toast.error('Não foi possível cancelar a reserva.');
		},
	});
}
