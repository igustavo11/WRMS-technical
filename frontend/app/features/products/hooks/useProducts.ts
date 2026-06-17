import { useQuery } from '@tanstack/react-query';
import { getProducts } from '../services/productsApi';

export const useProducts = () =>
	useQuery({ queryKey: ['products'], queryFn: getProducts });
