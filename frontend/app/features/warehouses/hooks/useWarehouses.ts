import { useQuery } from '@tanstack/react-query';
import { getWarehouses } from '../services/warehousesApi';

export const useWarehouses = () =>
	useQuery({ queryKey: ['warehouses'], queryFn: getWarehouses });
