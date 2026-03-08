import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import 'dayjs/locale/es';
dayjs.extend(utc);
dayjs.locale('es');
import { LogOut, Clock, User, Hash, ExternalLink, Users, Calendar, Ban, CheckCircle, UserX, XCircle, AlertTriangle, Info, ShieldAlert, Settings, Plus, Trash2, Key, History, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, DollarSign } from 'lucide-react';
import bola9Logo from '../assets/logo.svg';
import JumbotronManager from '../components/JumbotronManager'

const DAYS_OF_WEEK = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function Admin() {
    const [activeTab, setActiveTab] = useState('bookings'); // 'bookings', 'users', 'settings'

    const [bookings, setBookings] = useState([]);
    const [isLoadingBookings, setIsLoadingBookings] = useState(true);
    const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
    const [bookingDates, setBookingDates] = useState([]);
    const [calendarOpen, setCalendarOpen] = useState(false);
    const [calendarMonth, setCalendarMonth] = useState(dayjs());
    const calendarRef = useRef(null);
    const [sortConfig, setSortConfig] = useState({ key: 'startTime', dir: 'asc' });

    const [users, setUsers] = useState([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);

    // Estados de Settings
    const [settings, setSettings] = useState({ businessHours: [], closedDates: [] });
    const [isLoadingSettings, setIsLoadingSettings] = useState(false);
    const [newClosedDate, setNewClosedDate] = useState('');
    const [newClosedReason, setNewClosedReason] = useState('');

    // Estado del modal de historial
    const [historyModal, setHistoryModal] = useState({ open: false, userName: '', bookings: [], loading: false });

    const navigate = useNavigate();
    const userStr = localStorage.getItem('bola9_user');
    const adminUser = userStr ? JSON.parse(userStr) : { name: 'Administrador' };

    const [currentTime, setCurrentTime] = useState(dayjs());
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(dayjs()), 60000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => { fetchBookings(selectedDate); fetchBookingDates(); }, [navigate]);

    // Cerrar calendario al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (calendarRef.current && !calendarRef.current.contains(e.target)) setCalendarOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (activeTab === 'users' && users.length === 0) fetchUsers();
        if (activeTab === 'settings' && settings.businessHours.length === 0) fetchSettings();
    }, [activeTab]);

    const getHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('bola9_token')}` } });
    const handleLogout = () => { localStorage.clear(); navigate('/'); };

    // --- FETCHERS ---
    const fetchBookings = async (date) => {
        if (bookings.length === 0) setIsLoadingBookings(true);
        try {
            const response = await api.get(`/api/admin/bookings/shift?date=${date || selectedDate}`, getHeaders());
            setBookings(response.data.data);
        } catch (err) { if (err.response?.status === 401) handleLogout(); } finally { setIsLoadingBookings(false); }
    };

    const fetchBookingDates = async () => {
        try {
            const response = await api.get('/api/admin/bookings/dates', getHeaders());
            setBookingDates(response.data.data);
        } catch (err) { /* silencioso */ }
    };

    const handleShiftDateChange = (e) => {
        const newDate = e.target.value;
        if (!newDate) return;
        setSelectedDate(newDate);
        setBookings([]);
        fetchBookings(newDate);
    };

    const selectDate = (dateStr) => {
        setSelectedDate(dateStr);
        setCalendarOpen(false);
        setBookings([]);
        fetchBookings(dateStr);
    };

    const goToToday = () => {
        const today = dayjs().format('YYYY-MM-DD');
        setSelectedDate(today);
        setCalendarMonth(dayjs());
        setBookings([]);
        fetchBookings(today);
    };

    const fetchUsers = async () => {
        setIsLoadingUsers(true);
        try {
            const response = await api.get('/api/admin/users', getHeaders());
            setUsers(response.data.data);
        } catch (err) { alert('Error al cargar clientes.'); } finally { setIsLoadingUsers(false); }
    };

    const fetchSettings = async () => {
        setIsLoadingSettings(true);
        try {
            const response = await api.get('/api/admin/settings', getHeaders());
            setSettings(response.data.data);
        } catch (err) { alert('Error cargando configuración.'); } finally { setIsLoadingSettings(false); }
    };

    // --- ACTIONS: BOOKINGS & USERS ---
    const handleUpdateBooking = async (bookingId, newStatus) => {
        const actionText = newStatus === 'COMPLETED' ? '¿Confirmar que el cliente llegó y tomó la mesa?' :
            newStatus === 'NO_SHOW' ? '¿Aplicar TARJETA ROJA? (Baneo inmediato por no presentarse)' :
                '¿Cancelar administrativamente? (Perdonazo, no suma castigos)';
        if (!window.confirm(actionText)) return;
        try {
            const response = await api.patch(`/api/admin/bookings/${bookingId}/status`, { status: newStatus }, getHeaders());
            alert(response.data.message);
            setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
            if (response.data.banned || newStatus === 'COMPLETED') { setUsers([]); if (response.data.banned) fetchBookings(); }
        } catch (err) { alert('Error al procesar acción.'); }
    };

    const handleToggleUserStatus = async (userId, currentStatus, userRole) => {
        if (userRole === 'ADMIN') return alert('No puedes modificar a un Administrador.');
        if (!window.confirm(`¿Seguro que deseas ${currentStatus ? 'Banear' : 'Reactivar'} a este usuario?`)) return;
        try {
            await api.patch(`/api/admin/users/${userId}/status`, {}, getHeaders());
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: !currentStatus } : u));
            if (currentStatus === true) fetchBookings();
        } catch (err) { alert(err.response?.data?.error); }
    };

    const handleResetPassword = async (userId, userName) => {
        if (!window.confirm(`¿Estás 100% seguro de resetear la contraseña de ${userName} a la clave temporal por defecto?`)) return;
        try {
            const response = await api.patch(`/api/admin/users/${userId}/reset-password`, {}, getHeaders());
            alert(response.data.message);
        } catch (err) { alert(err.response?.data?.error || 'Error al resetear la contraseña.'); }
    };

    // --- ACTIONS: SETTINGS (NUEVO) ---
    const handleUpdateHour = async (dayOfWeek, isOpen, openTime, closeTime, pricePerHour) => {
        try {
            const payload = { isOpen, openTime, closeTime };
            if (pricePerHour !== undefined) payload.pricePerHour = pricePerHour;
            await api.patch(`/api/admin/settings/hours/${dayOfWeek}`, payload, getHeaders());
            alert('Horario actualizado.');
            fetchSettings();
        } catch (err) { alert('Error actualizando horario.'); }
    };

    const handleAddClosedDate = async (e) => {
        e.preventDefault();
        if (!newClosedDate) return;
        try {
            await api.post('/api/admin/settings/closed-dates', { date: newClosedDate, reason: newClosedReason }, getHeaders());
            setNewClosedDate(''); setNewClosedReason('');
            fetchSettings();
        } catch (err) { alert(err.response?.data?.error || 'Error agregando feriado.'); }
    };

    const handleDeleteClosedDate = async (id) => {
        if (!window.confirm('¿Eliminar esta fecha de cierre? El local abrirá ese día.')) return;
        try {
            await api.delete(`/api/admin/settings/closed-dates/${id}`, getHeaders());
            fetchSettings();
        } catch (err) { alert('Error eliminando fecha.'); }
    };

    // --- HISTORIAL DE RESERVAS ---
    const fetchUserBookings = async (userId, userName) => {
        setHistoryModal({ open: true, userName, bookings: [], loading: true });
        try {
            const response = await api.get(`/api/admin/users/${userId}/bookings`, getHeaders());
            setHistoryModal({ open: true, userName, bookings: response.data.data, loading: false });
        } catch (err) {
            alert('Error al cargar el historial de reservas.');
            setHistoryModal({ open: false, userName: '', bookings: [], loading: false });
        }
    };

    return (
        <div className="min-h-screen bg-brand-dark text-white font-sans">
            <nav className="bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center px-8">
                <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <img src={bola9Logo} alt="Logo" className="w-10 h-10" />
                    <div><h1 className="text-xl font-bold text-brand-primary">Bola9 Admin</h1><p className="text-xs text-gray-400">Turno: {dayjs(selectedDate).format('DD/MM/YYYY')}</p></div>
                </Link>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <div className="relative" ref={calendarRef}>
                            <button
                                onClick={() => setCalendarOpen(!calendarOpen)}
                                className="flex items-center gap-2 bg-slate-800 border border-slate-700 text-sm text-gray-200 rounded px-3 py-1.5 hover:border-brand-primary transition-colors"
                            >
                                <Calendar size={14} className="text-brand-primary" />
                                {dayjs(selectedDate).format('DD/MM/YYYY')}
                            </button>

                            {/* CALENDARIO CUSTOM */}
                            {calendarOpen && (
                                <div className="absolute top-full mt-2 right-0 z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 w-[300px]">
                                    {/* Header: navegación de mes */}
                                    <div className="flex items-center justify-between mb-3">
                                        <button onClick={() => setCalendarMonth(calendarMonth.subtract(1, 'month'))} className="text-gray-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors">
                                            <ChevronLeft size={18} />
                                        </button>
                                        <span className="text-sm font-semibold text-white capitalize">{calendarMonth.format('MMMM YYYY')}</span>
                                        <button onClick={() => setCalendarMonth(calendarMonth.add(1, 'month'))} className="text-gray-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors">
                                            <ChevronRight size={18} />
                                        </button>
                                    </div>
                                    {/* Días de la semana */}
                                    <div className="grid grid-cols-7 gap-1 mb-1">
                                        {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'].map(d => (
                                            <span key={d} className="text-center text-[10px] font-semibold text-gray-500 uppercase">{d}</span>
                                        ))}
                                    </div>
                                    {/* Grid de días */}
                                    <div className="grid grid-cols-7 gap-1">
                                        {(() => {
                                            const startOfMonth = calendarMonth.startOf('month');
                                            const daysInMonth = calendarMonth.daysInMonth();
                                            // dayjs .day(): 0=Dom, 1=Lun... Ajustar para empezar en Lunes
                                            const startDay = (startOfMonth.day() + 6) % 7;
                                            const cells = [];
                                            // Celdas vacías antes del día 1
                                            for (let i = 0; i < startDay; i++) cells.push(<div key={`e-${i}`} />);
                                            // Días del mes
                                            for (let d = 1; d <= daysInMonth; d++) {
                                                const dateStr = calendarMonth.date(d).format('YYYY-MM-DD');
                                                const isToday = dateStr === dayjs().format('YYYY-MM-DD');
                                                const isSelected = dateStr === selectedDate;
                                                const hasBookings = bookingDates.includes(dateStr);
                                                cells.push(
                                                    <button
                                                        key={d}
                                                        onClick={() => selectDate(dateStr)}
                                                        className={`relative w-full aspect-square flex items-center justify-center text-xs rounded-lg transition-all overflow-visible pb-1 ${isSelected
                                                            ? 'bg-brand-primary text-brand-dark font-bold'
                                                            : isToday
                                                                ? 'bg-slate-700 text-white font-semibold ring-1 ring-brand-primary'
                                                                : hasBookings
                                                                    ? 'text-emerald-300 hover:bg-slate-800 font-medium'
                                                                    : 'text-gray-300 hover:bg-slate-800'
                                                            }`}
                                                    >
                                                        {d}
                                                        {hasBookings && !isSelected && (
                                                            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                        )}
                                                    </button>
                                                );
                                            }
                                            return cells;
                                        })()}
                                    </div>
                                </div>
                            )}
                        </div>
                        {selectedDate !== dayjs().format('YYYY-MM-DD') && (
                            <button onClick={goToToday} className="text-xs bg-brand-primary text-brand-dark font-semibold px-2.5 py-1.5 rounded hover:bg-emerald-400 transition-colors whitespace-nowrap">
                                Hoy
                            </button>
                        )}
                    </div>
                    <span className="text-sm text-gray-300">Hola, {adminUser.alias || adminUser.name}</span>
                    <Link to="/" className="hidden md:flex items-center gap-1 text-sm text-gray-400 hover:text-white"><ExternalLink size={14} /> Portal Público</Link>
                    <button onClick={handleLogout} className="flex items-center gap-2 text-sm bg-slate-800 hover:bg-red-500/20 hover:text-red-400 px-3 py-2 rounded transition-colors"><LogOut size={16} /> Salir</button>
                </div>
            </nav>

            <main className="max-w-6xl mx-auto p-8">
                <div className="flex gap-2 mb-8 border-b border-slate-800 pb-px overflow-x-auto">
                    <button onClick={() => setActiveTab('bookings')} className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'bookings' ? 'border-brand-primary text-brand-primary bg-brand-primary/5' : 'border-transparent text-gray-400 hover:text-gray-200'}`}><Calendar size={18} /> Reservas del Turno</button>
                    <button onClick={() => setActiveTab('users')} className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'users' ? 'border-brand-primary text-brand-primary bg-brand-primary/5' : 'border-transparent text-gray-400 hover:text-gray-200'}`}><Users size={18} /> Gestión de Clientes</button>
                    <button onClick={() => setActiveTab('settings')} className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'settings' ? 'border-brand-primary text-brand-primary bg-brand-primary/5' : 'border-transparent text-gray-400 hover:text-gray-200'}`}><Settings size={18} /> Configuración de Local</button>
                </div>

                {/* --- PESTAÑA 1: RESERVAS DEL TURNO --- */}
                {activeTab === 'bookings' && (
                    <div>
                        {/* Banner de fecha diferente a hoy */}
                        {selectedDate !== dayjs().format('YYYY-MM-DD') && (
                            <div className="mb-4 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center justify-between">
                                <span className="text-amber-300 text-sm flex items-center gap-2">
                                    <Calendar size={16} /> Viendo turno del <strong className="text-white">{dayjs(selectedDate).format('dddd DD/MM/YYYY')}</strong>
                                </span>
                                <button onClick={goToToday} className="text-xs bg-amber-500 text-brand-dark font-semibold px-3 py-1 rounded hover:bg-amber-400 transition-colors">
                                    Volver a Hoy
                                </button>
                            </div>
                        )}
                        <div className="mb-6 bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex flex-wrap gap-6 text-sm">
                            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500/50"></span> <span className="text-gray-300">Por Llegar (Faltan -15 min)</span></div>
                            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-500/50"></span> <span className="text-gray-300">Atrasado (+1 a 45 min)</span></div>
                            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500/50"></span> <span className="text-gray-300">Crítico / Fantasma (+45 min)</span></div>
                            <div className="hidden md:block w-px bg-slate-700 mx-2"></div>
                            <div className="flex items-center gap-1 text-emerald-400"><CheckCircle size={14} /> <span>Llegó</span></div>
                            <div className="flex items-center gap-1 text-amber-400"><UserX size={14} /> <span>No-Show (Baneo)</span></div>
                            <div className="flex items-center gap-1 text-red-400"><XCircle size={14} /> <span>Perdonazo</span></div>
                        </div>

                        {isLoadingBookings && bookings.length === 0 ? (
                            <div className="text-center text-gray-400 py-10">Cargando reservas...</div>
                        ) : bookings.length === 0 ? (
                            <div className="bg-slate-800/50 border border-slate-700 p-8 rounded text-center text-gray-400">No hay reservas para este turno.</div>
                        ) : (
                            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-lg">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-800 text-gray-400 text-sm border-b border-slate-700">
                                            <th className="p-4 font-medium cursor-pointer select-none hover:text-white transition-colors" onClick={() => setSortConfig(s => ({ key: 'startTime', dir: s.key === 'startTime' && s.dir === 'asc' ? 'desc' : 'asc' }))}>
                                                <div className="flex items-center gap-2"><Clock size={16} /> Hora {sortConfig.key === 'startTime' ? (sortConfig.dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-30" />}</div>
                                            </th>
                                            <th className="p-4 font-medium cursor-pointer select-none hover:text-white transition-colors" onClick={() => setSortConfig(s => ({ key: 'table', dir: s.key === 'table' && s.dir === 'asc' ? 'desc' : 'asc' }))}>
                                                <div className="flex items-center gap-2"><Hash size={16} /> Mesa {sortConfig.key === 'table' ? (sortConfig.dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-30" />}</div>
                                            </th>
                                            <th className="p-4 font-medium cursor-pointer select-none hover:text-white transition-colors" onClick={() => setSortConfig(s => ({ key: 'user', dir: s.key === 'user' && s.dir === 'asc' ? 'desc' : 'asc' }))}>
                                                <div className="flex items-center gap-2"><User size={16} /> Cliente {sortConfig.key === 'user' ? (sortConfig.dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-30" />}</div>
                                            </th>
                                            <th className="p-4 font-medium cursor-pointer select-none hover:text-white transition-colors" onClick={() => setSortConfig(s => ({ key: 'status', dir: s.key === 'status' && s.dir === 'asc' ? 'desc' : 'asc' }))}>
                                                <div className="flex items-center gap-2">Estado {sortConfig.key === 'status' ? (sortConfig.dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-30" />}</div>
                                            </th>
                                            <th className="p-4 font-medium text-center">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {[...bookings].sort((a, b) => {
                                            const dir = sortConfig.dir === 'asc' ? 1 : -1;
                                            if (sortConfig.key === 'startTime') return dir * (new Date(a.startTime) - new Date(b.startTime));
                                            if (sortConfig.key === 'table') return dir * (a.table.number - b.table.number);
                                            if (sortConfig.key === 'user') return dir * (a.user.name || '').localeCompare(b.user.name || '');
                                            if (sortConfig.key === 'status') return dir * a.status.localeCompare(b.status);
                                            return 0;
                                        }).map((booking) => {
                                            const bookingTime = dayjs(booking.startTime);
                                            const diffMinutes = bookingTime.diff(currentTime, 'minute');
                                            const isNext = booking.status === 'CONFIRMED' && diffMinutes > 0 && diffMinutes <= 15;
                                            const isLate = booking.status === 'CONFIRMED' && diffMinutes <= 0 && diffMinutes >= -45;
                                            const isCritical = booking.status === 'CONFIRMED' && diffMinutes < -45;

                                            return (
                                                <tr key={booking.id} className={`transition-colors ${isCritical ? 'bg-red-500/10 hover:bg-red-500/20' :
                                                    isLate ? 'bg-amber-500/10 hover:bg-amber-500/20' :
                                                        isNext ? 'bg-blue-500/10 hover:bg-blue-500/20' : 'hover:bg-slate-800/50'
                                                    }`}>
                                                    <td className="p-4 font-semibold text-brand-primary">{bookingTime.format('HH:mm')}</td>
                                                    <td className="p-4">Mesa {booking.table.number}</td>
                                                    <td className="p-4">{booking.user.alias ? <span>{booking.user.alias} <span className="text-gray-500 text-sm">({booking.user.name})</span></span> : booking.user.name}</td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-1 flex items-center gap-1 w-max text-xs rounded border ${booking.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                            booking.status === 'COMPLETED' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                                booking.status === 'NO_SHOW' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                                                            }`}>
                                                            {booking.status === 'COMPLETED' && <CheckCircle size={12} />}
                                                            {booking.status === 'NO_SHOW' && <UserX size={12} />}
                                                            {booking.status === 'CANCELLED' && <XCircle size={12} />}
                                                            {booking.status}
                                                        </span>
                                                        {isNext && <span className="text-blue-400 flex items-center gap-1 text-[10px] mt-1 font-semibold uppercase"><Info size={10} /> Por Llegar</span>}
                                                        {isLate && <span className="text-amber-500 flex items-center gap-1 text-[10px] mt-1 font-semibold uppercase"><AlertTriangle size={10} /> Atrasado</span>}
                                                        {isCritical && <span className="text-red-400 flex items-center gap-1 text-[10px] mt-1 font-semibold uppercase"><AlertTriangle size={10} /> Fantasma / Crítico</span>}
                                                    </td>
                                                    <td className="p-4">
                                                        {booking.status === 'CONFIRMED' ? (
                                                            <div className="flex items-center justify-center gap-2">
                                                                <button onClick={() => handleUpdateBooking(booking.id, 'COMPLETED')} title="Cliente Llegó" className="bg-slate-800 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white p-2 rounded transition-colors shadow-sm"><CheckCircle size={18} /></button>
                                                                <button onClick={() => handleUpdateBooking(booking.id, 'NO_SHOW')} title="Tarjeta Roja (No-Show)" className="bg-slate-800 text-amber-400 border border-amber-500/30 hover:bg-amber-500 hover:text-white p-2 rounded transition-colors shadow-sm"><UserX size={18} /></button>
                                                                <button onClick={() => handleUpdateBooking(booking.id, 'CANCELLED')} title="Perdonazo (Cancelar Mesa)" className="bg-slate-800 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white p-2 rounded transition-colors shadow-sm"><XCircle size={18} /></button>
                                                            </div>
                                                        ) : <div className="text-center text-gray-600 text-sm">-</div>}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* --- PESTAÑA 2: GESTIÓN DE CLIENTES --- */}
                {activeTab === 'users' && (
                    <div>
                        {isLoadingUsers ? <div className="text-center text-gray-400 py-10">Cargando base de datos...</div> : (
                            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-lg">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-800 text-gray-400 text-sm border-b border-slate-700">
                                            <th className="p-4 font-medium">Cliente</th>
                                            <th className="p-4 font-medium">Email</th>
                                            <th className="p-4 font-medium">Historial (Reglas)</th>
                                            <th className="p-4 font-medium">Estado</th>
                                            <th className="p-4 font-medium text-right">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {users.map((u) => {
                                            const isAtRisk = u.cancelCount === 2;
                                            const hasRedCard = u.noShowCount > 0;
                                            return (
                                                <tr key={u.id} className="hover:bg-slate-800/50 transition-colors">
                                                    <td className="p-4">
                                                        <div className="font-medium text-gray-200 flex items-center gap-2">
                                                            {u.name}
                                                            {isAtRisk && u.isActive && <AlertTriangle size={14} className="text-amber-500" title="Riesgo de baneo (Lleva 2 Strikes por cancelar tarde)" />}
                                                            {hasRedCard && <ShieldAlert size={14} className="text-red-500" title="Historial con Tarjetas Rojas (No-Shows)" />}
                                                        </div>
                                                        {u.alias && <div className="text-xs text-brand-primary">Alias: {u.alias}</div>}
                                                    </td>
                                                    <td className="p-4 text-gray-400 text-sm">{u.email}</td>
                                                    <td className="p-4">
                                                        {u.role === 'ADMIN' ? <span className="text-gray-600 text-xs">-</span> : (
                                                            <div className="flex flex-col gap-1 text-xs">
                                                                <span className={`${u.cancelCount > 0 ? 'text-amber-400' : 'text-gray-400'}`}>Strikes (Atrasos): <span className="font-medium">{u.cancelCount}/3</span></span>
                                                                <span className={`${hasRedCard ? 'text-red-400' : 'text-gray-400'}`}>No-Shows (T. Rojas): <span className="font-medium">{u.noShowCount}</span></span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-4">
                                                        {u.isActive ? <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle size={14} /> Activo</span> : <span className="flex items-center gap-1 text-xs text-red-400"><Ban size={14} /> Baneado</span>}
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        {u.role !== 'ADMIN' && (
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button
                                                                    onClick={() => fetchUserBookings(u.id, u.alias || u.name)}
                                                                    className="text-xs p-1.5 rounded border border-slate-700 bg-slate-800 text-blue-400 hover:bg-blue-500 hover:text-white transition-colors shadow-sm"
                                                                    title="Ver Historial de Reservas"
                                                                >
                                                                    <History size={16} />
                                                                </button>

                                                                <button
                                                                    onClick={() => handleResetPassword(u.id, u.name)}
                                                                    className="text-xs p-1.5 rounded border border-slate-700 bg-slate-800 text-amber-400 hover:bg-amber-500 hover:text-white transition-colors shadow-sm"
                                                                    title="Resetear a Clave Temporal"
                                                                >
                                                                    <Key size={16} />
                                                                </button>

                                                                <button
                                                                    onClick={() => handleToggleUserStatus(u.id, u.isActive, u.role)}
                                                                    className={`text-xs px-3 py-1.5 rounded border transition-colors ${u.isActive ? 'bg-slate-800 text-red-400 border-red-500/20 hover:bg-red-500 hover:text-white' : 'bg-slate-800 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500 hover:text-white'}`}
                                                                >
                                                                    {u.isActive ? 'Banear' : 'Reactivar'}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* --- PESTAÑA 3: CONFIGURACIÓN (NUEVA) --- */}
                {activeTab === 'settings' && (
                    <div className="space-y-8">

                        {/* 1. Módulo del Jumbotron (Ancho completo arriba) */}
                        <JumbotronManager />

                        {/* 2. Grid de Horarios y Feriados (2 columnas) */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                            {/* Panel de Horarios Regulares (Se mantiene igual) */}
                            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-lg p-6">
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Clock className="text-brand-primary" /> Horario Habitual</h3>
                                <p className="text-sm text-gray-400 mb-6">Define los horarios de apertura y cierre para cada día de la semana.</p>

                                {isLoadingSettings ? <p className="text-gray-500">Cargando...</p> : (
                                    <div className="space-y-4">
                                        {settings.businessHours.map((bh) => (
                                            <div key={bh.id} className="flex items-center gap-4 p-3 bg-slate-800 rounded border border-slate-700">
                                                <div className="flex items-center gap-3 w-28 shrink-0">
                                                    <input type="checkbox" checked={bh.isOpen} onChange={(e) => handleUpdateHour(bh.dayOfWeek, e.target.checked, bh.openTime, bh.closeTime)} className="w-4 h-4 accent-brand-primary" />
                                                    <span className={`font-semibold text-sm ${bh.isOpen ? 'text-gray-200' : 'text-gray-500 line-through'}`}>{DAYS_OF_WEEK[bh.dayOfWeek]}</span>
                                                </div>

                                                {bh.isOpen ? (
                                                    <div className="flex items-center gap-2 flex-1">
                                                        <DollarSign size={14} className="text-emerald-400 shrink-0" />
                                                        <input
                                                            type="number"
                                                            defaultValue={bh.pricePerHour}
                                                            min="0"
                                                            step="1000"
                                                            onBlur={(e) => handleUpdateHour(bh.dayOfWeek, bh.isOpen, bh.openTime, bh.closeTime, parseInt(e.target.value))}
                                                            className="bg-slate-900 border border-slate-600 rounded text-sm p-1.5 focus:border-brand-primary text-gray-200 w-20"
                                                        />
                                                        <span className="text-gray-600 mx-1">|</span>
                                                        <input type="time" defaultValue={bh.openTime} onBlur={(e) => handleUpdateHour(bh.dayOfWeek, bh.isOpen, e.target.value, bh.closeTime)} className="bg-slate-900 border border-slate-600 rounded text-sm p-1.5 focus:border-brand-primary text-gray-200" />
                                                        <span className="text-gray-500 text-xs">a</span>
                                                        <input type="time" defaultValue={bh.closeTime} onBlur={(e) => handleUpdateHour(bh.dayOfWeek, bh.isOpen, bh.openTime, e.target.value)} className="bg-slate-900 border border-slate-600 rounded text-sm p-1.5 focus:border-brand-primary text-gray-200" />
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-red-400 font-medium">Cerrado</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Panel de Feriados Excepcionales (Se mantiene igual) */}
                            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-lg p-6">
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Ban className="text-red-500" /> Feriados y Cierres</h3>
                                <p className="text-sm text-gray-400 mb-6">Agrega fechas específicas donde el local NO abrirá (ej. Feriados irrenunciables).</p>

                                {/* Formulario Agregar */}
                                <form onSubmit={handleAddClosedDate} className="flex flex-col gap-3 mb-8 bg-slate-800/50 p-4 rounded border border-slate-700">
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <input type="date" required value={newClosedDate} min={dayjs().format('YYYY-MM-DD')} onChange={(e) => setNewClosedDate(e.target.value)} className="bg-slate-900 border border-slate-600 rounded text-sm p-2 w-full sm:w-1/3 text-gray-200 focus:outline-none focus:border-brand-primary" />
                                        <input type="text" required placeholder="Motivo (ej: Año Nuevo)" value={newClosedReason} onChange={(e) => setNewClosedReason(e.target.value)} className="bg-slate-900 border border-slate-600 rounded text-sm p-2 w-full text-gray-200 focus:outline-none focus:border-brand-primary" />
                                    </div>
                                    <button type="submit" className="bg-brand-primary text-brand-dark font-semibold py-2 rounded flex justify-center items-center gap-2 hover:bg-emerald-400 transition-colors">
                                        <Plus size={16} /> Agregar Fecha de Cierre
                                    </button>
                                </form>

                                {/* Lista de Feriados */}
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-300 mb-3 border-b border-slate-800 pb-2">Próximos Cierres Registrados</h4>
                                    {isLoadingSettings ? <p className="text-gray-500">Cargando...</p> : settings.closedDates.length === 0 ? (
                                        <p className="text-sm text-gray-500 italic">No hay cierres programados.</p>
                                    ) : (
                                        <ul className="space-y-2">
                                            {settings.closedDates.map(date => (
                                                <li key={date.id} className="flex justify-between items-center bg-slate-800 p-3 rounded border border-slate-700">
                                                    <div>
                                                        <p className="text-sm font-semibold text-red-400">{dayjs.utc(date.date).format('DD/MM/YYYY')}</p>
                                                        <p className="text-xs text-gray-400">{date.reason}</p>
                                                    </div>
                                                    <button onClick={() => handleDeleteClosedDate(date.id)} className="text-red-500/50 hover:text-red-500 transition-colors p-2" title="Eliminar y Abrir Local">
                                                        <Trash2 size={18} />
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>
                )}

            </main >

            {/* --- MODAL: HISTORIAL DE RESERVAS --- */}
            {
                historyModal.open && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setHistoryModal({ open: false, userName: '', bookings: [], loading: false })}>
                        <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-slate-800">
                                <div className="flex items-center gap-3">
                                    <History className="text-blue-400" size={22} />
                                    <h2 className="text-lg font-bold text-white">Historial de Reservas</h2>
                                    <span className="text-sm text-brand-primary font-medium">— {historyModal.userName}</span>
                                </div>
                                <button onClick={() => setHistoryModal({ open: false, userName: '', bookings: [], loading: false })} className="text-gray-400 hover:text-white transition-colors p-1">
                                    <XCircle size={22} />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="overflow-y-auto flex-1 p-6">
                                {historyModal.loading ? (
                                    <div className="text-center text-gray-400 py-10">Cargando historial...</div>
                                ) : historyModal.bookings.length === 0 ? (
                                    <div className="text-center text-gray-500 py-10">Sin reservas registradas para este cliente.</div>
                                ) : (
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-800 text-gray-400 text-sm border-b border-slate-700">
                                                <th className="p-3 font-medium">Fecha</th>
                                                <th className="p-3 font-medium">Mesa</th>
                                                <th className="p-3 font-medium">Duración</th>
                                                <th className="p-3 font-medium">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800">
                                            {historyModal.bookings.map((b) => {
                                                const start = dayjs(b.startTime);
                                                const end = dayjs(b.endTime);
                                                const diffMin = end.diff(start, 'minute');
                                                const hours = Math.floor(diffMin / 60);
                                                const mins = diffMin % 60;
                                                const duration = hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;

                                                return (
                                                    <tr key={b.id} className="hover:bg-slate-800/50 transition-colors">
                                                        <td className="p-3 text-sm text-gray-200">{start.format('DD/MM/YYYY HH:mm')}</td>
                                                        <td className="p-3 text-sm text-gray-300">Mesa {b.table.number}</td>
                                                        <td className="p-3 text-sm text-gray-300">{duration}</td>
                                                        <td className="p-3">
                                                            <span className={`px-2 py-0.5 text-xs rounded border flex items-center gap-1 w-max ${b.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                                b.status === 'COMPLETED' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                                    b.status === 'NO_SHOW' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                                        'bg-red-500/10 text-red-400 border-red-500/20'
                                                                }`}>
                                                                {b.status === 'COMPLETED' && <CheckCircle size={12} />}
                                                                {b.status === 'NO_SHOW' && <UserX size={12} />}
                                                                {b.status === 'CANCELLED' && <XCircle size={12} />}
                                                                {b.status === 'CONFIRMED' && <Clock size={12} />}
                                                                {b.status === 'CONFIRMED' ? 'Confirmada' :
                                                                    b.status === 'COMPLETED' ? 'Completada' :
                                                                        b.status === 'NO_SHOW' ? 'No-Show' : 'Cancelada'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            {/* Footer */}
                            {!historyModal.loading && historyModal.bookings.length > 0 && (
                                <div className="border-t border-slate-800 px-6 py-3 text-xs text-gray-500 text-right">
                                    {historyModal.bookings.length} reserva{historyModal.bookings.length !== 1 ? 's' : ''} en total
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

        </div >
    );
}