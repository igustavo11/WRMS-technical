import { useQuery } from '@tanstack/react-query';
import { getReservations } from '../services/reservationsApi';

export function useReservations() {
	return useQuery({
		queryKey: ['reservations'],
		queryFn: getReservations,
	});
}
