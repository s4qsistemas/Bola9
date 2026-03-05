import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import dayjs from 'dayjs';
import { LogOut, Home, XCircle, Calendar, Clock, Hash, AlertTriangle, ShieldAlert } from 'lucide-react';
import bola9Logo from '../assets/logo.svg';

export default function MyBookings() {
    const [myBookings, setMyBookings] = useState([]);
    const [stats, setStats] = useState({ cancelCount: 0, noShowCount: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    const userStr = localStorage.getItem('bola9_user');
    const user = userStr ? JSON.parse(userStr) : null;

    useEffect(() => {
        const fetchMyBookings = async () => {
            const token = localStorage.getItem('bola9_token');
            if (!token) return navigate('/login');

            try {
                const response = await api.get('/api/bookings/me', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setMyBookings(response.data.data);
                setStats(response.data.stats); // Recibimos la reputación
            } catch (error) {
                if (error.response?.status === 401 || error.response?.status === 403) handleLogout();
            } finally {
                setIsLoading(false);
            }
        };
        fetchMyBookings();
    }, [navigate]);

    const handleCancel = async (bookingId) => {
        if (!window.confirm('¿Seguro que deseas cancelar? Recuerda que si falta menos de 2 horas, sumarás un Strike.')) return;

        const token = localStorage.getItem('bola9_token');
        try {
            const response = await api.patch(`/api/bookings/${bookingId}/cancel`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.autoBanned) {
                alert(response.data.message);
                handleLogout();
            } else {
                alert(response.data.message);
                // Recargamos la página para actualizar los strikes visualmente
                window.location.reload();
            }
        } catch (error) {
            alert(error.response?.data?.error || 'Error al cancelar.');
        }
    };

    const handleLogout = () => { localStorage.clear(); navigate('/'); };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-brand-dark text-white font-sans">
            <nav className="bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center px-4 md:px-8">
                <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <img src={bola9Logo} alt="Logo" className="w-8 h-8 md:w-10 md:h-10" />
                    <h1 className="text-xl md:text-2xl font-bold text-brand-primary">Club Bola9</h1>
                </Link>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-300 hidden md:inline">Hola, {user.alias || user.name}</span>
                    <Link to="/" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
                        <Home size={16} /> Volver a Mesas
                    </Link>
                    <button onClick={handleLogout} className="flex items-center gap-2 text-sm bg-slate-800 hover:bg-red-500/20 hover:text-red-400 px-3 py-2 rounded transition-colors">
                        <LogOut size={16} /> Salir
                    </button>
                </div>
            </nav>

            <main className="max-w-4xl mx-auto p-6 md:p-8">
                <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2"><Calendar className="text-brand-primary" /> Mi Historial de Reservas</h2>
                        <p className="text-gray-400 text-sm mt-1">Revisa tus próximas partidas o cancela si no podrás asistir.</p>
                    </div>

                    {/* PANEL DE REPUTACIÓN */}
                    {!isLoading && (
                        <div className="bg-slate-900 border border-slate-700 p-4 rounded-xl flex gap-6 shadow-lg">
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Tus Strikes</p>
                                <div className="flex items-center gap-2">
                                    <AlertTriangle size={18} className={stats.cancelCount > 0 ? 'text-amber-500' : 'text-gray-600'} />
                                    <span className={`font-bold text-lg ${stats.cancelCount >= 2 ? 'text-red-400' : stats.cancelCount === 1 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                        {stats.cancelCount} / 3
                                    </span>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-1 max-w-[120px] leading-tight">Por cancelar con menos de 2hrs.</p>
                            </div>
                            <div className="border-l border-slate-700 pl-6">
                                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Tarjetas Rojas</p>
                                <div className="flex items-center gap-2">
                                    <ShieldAlert size={18} className={stats.noShowCount > 0 ? 'text-red-500' : 'text-gray-600'} />
                                    <span className={`font-bold text-lg ${stats.noShowCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                        {stats.noShowCount}
                                    </span>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-1 max-w-[120px] leading-tight">Por no presentarte al local.</p>
                            </div>
                        </div>
                    )}
                </div>

                {isLoading ? (
                    <div className="text-center text-gray-500 py-10">Cargando tu historial...</div>
                ) : myBookings.length === 0 ? (
                    <div className="bg-slate-800/50 border border-slate-700 p-8 rounded text-center text-gray-400">Aún no tienes reservas en el Club Bola9.</div>
                ) : (
                    <div className="space-y-4">
                        {myBookings.map((booking) => (
                            <div key={booking.id} className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
                                <div className="flex flex-col md:flex-row gap-6 w-full">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-slate-900 p-3 rounded-lg border border-slate-700"><Clock className="text-brand-primary" size={24} /></div>
                                        <div>
                                            <p className="text-sm text-gray-400">Fecha y Hora</p>
                                            <p className="font-semibold text-lg">{dayjs(booking.startTime).format('DD/MM/YYYY - HH:mm')}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="bg-slate-900 p-3 rounded-lg border border-slate-700"><Hash className="text-emerald-500" size={24} /></div>
                                        <div>
                                            <p className="text-sm text-gray-400">Mesa Asignada</p>
                                            <p className="font-semibold text-lg">Mesa {booking.table.number}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-2 min-w-[150px]">
                                    <span className={`px-3 py-1 text-xs font-semibold rounded border ${booking.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                        booking.status === 'COMPLETED' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                            booking.status === 'NO_SHOW' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                'bg-red-500/10 text-red-400 border-red-500/20'
                                        }`}>
                                        {booking.status === 'CONFIRMED' ? 'CONFIRMADA' :
                                            booking.status === 'COMPLETED' ? 'JUGADA' :
                                                booking.status === 'NO_SHOW' ? 'FALTA (NO-SHOW)' : 'CANCELADA'}
                                    </span>

                                    {booking.status === 'CONFIRMED' && (
                                        <button onClick={() => handleCancel(booking.id)} className="flex items-center gap-1 text-sm text-red-400 hover:text-red-300 transition-colors mt-2">
                                            <XCircle size={16} /> Cancelar Reserva
                                        </button>
                                    )}

                                    {/* TEXTOS EXACTOS DE LA BASE DE DATOS */}
                                    {booking.status === 'CANCELLED' && (
                                        <span className="text-[10px] text-gray-400 italic mt-1 text-right leading-tight max-w-[150px]">
                                            {booking.cancellationReason || 'Cancelada'}
                                        </span>
                                    )}

                                    {booking.status === 'NO_SHOW' && (
                                        <span className="text-[10px] text-red-400 font-semibold italic mt-1 text-right leading-tight max-w-[150px]">
                                            {booking.cancellationReason || 'Penalizado por inasistencia'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}