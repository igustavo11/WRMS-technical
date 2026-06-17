import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import i18n from '~/i18n/config';
import { cancelReservation } from '../services/reservationsApi';

export function useCancelReservation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: cancelReservation,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['reservations'] });
			queryClient.invalidateQueries({ queryKey: ['inventory'] });
			toast.success(i18n.t('reservations.toast.cancelSuccess'));
		},
		onError: () => {
			toast.error(i18n.t('reservations.toast.cancelError'));
		},
	});
}
