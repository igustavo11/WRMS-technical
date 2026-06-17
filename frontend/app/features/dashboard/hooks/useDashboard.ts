import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { cancelReservation, getDashboard } from '../services/dashboardApi';

export function useDashboard() {
	return useQuery({
		queryKey: ['dashboard'],
		queryFn: getDashboard,
	});
}

export function useCancelReservation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: cancelReservation,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['dashboard'] });
			toast.success('Reserva cancelada com sucesso.');
		},
		onError: () => {
			toast.error('Não foi possível cancelar a reserva.');
		},
	});
}
