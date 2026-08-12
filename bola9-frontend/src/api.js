import axios from 'axios';

// Si existe la variable (Producción), la usa. 
// Si NO existe (Desarrollo/Ngrok), usa el BASE_URL (ej. /bola9/) para que Axios lo combine con '/api/...' de las rutas.
const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.BASE_URL;

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
