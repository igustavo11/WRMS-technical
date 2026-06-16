import axios from 'axios';
import { clearSession, getToken } from './authToken';

export const apiClient = axios.create({
	baseURL: import.meta.env.VITE_API_URL,
});

apiClient.interceptors.request.use((config) => {
	const token = getToken();
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});

apiClient.interceptors.response.use(
	(response) => response,
	(error) => {
		if (error.response?.status === 401) {
			clearSession();
			window.location.href = '/login';
		}
		return Promise.reject(error);
	},
);
