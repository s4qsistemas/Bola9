import axios from 'axios';

// Si existe la variable (Producción), la usa. 
// Si NO existe (Desarrollo/Ngrok), usa el string vacío '' para que el Proxy de Vite actúe.
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
    baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('bola9_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
