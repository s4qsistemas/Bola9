import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import dayjs from 'dayjs';
import { LogIn, LogOut, Calendar, X, Clock, CheckCircle, AlertTriangle, Wrench, Power, ScrollText } from 'lucide-react';
import bola9Logo from '../assets/logo.svg';

export default function Home() {
    // Estados Generales
    const [tables, setTables] = useState([]);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState(null);
    const [isLoadingTables, setIsLoadingTables] = useState(false);

    // Audio pre-cargado
    const bookingSoundRef = useRef(null);
    useEffect(() => {
        const audio = new Audio('/billiards.wav');
        audio.preload = 'auto';
        audio.load();
        bookingSoundRef.current = audio;
    }, []);

    // Estados del Modal de Reservas
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTable, setSelectedTable] = useState(null);
    const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
    const [availableSlots, setAvailableSlots] = useState([]);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);
    const [bookingMessage, setBookingMessage] = useState(null); // { type: 'success' | 'error', text: '' }
    const [isBookingInProgress, setIsBookingInProgress] = useState(false);
    const [pendingSlot, setPendingSlot] = useState(null); // Horario seleccionado pendiente de confirmación
    const [isPoliciesModalOpen, setIsPoliciesModalOpen] = useState(false);

    const navigate = useNavigate();

    // 1. Verificación de sesión al cargar
    useEffect(() => {
        const token = localStorage.getItem('bola9_token');
        const userStr = localStorage.getItem('bola9_user');

        if (token && userStr) {
            setIsLoggedIn(true);
            setUser(JSON.parse(userStr));
            fetchTables(token);
        }
    }, []);

    // 2. Traer las 6 mesas
    const fetchTables = async (token) => {
        setIsLoadingTables(true);
        try {
            const response = await api.get('/api/tables', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTables(response.data.data);
        } catch (error) {
            console.error('Error cargando mesas:', error);
            if (error.response?.status === 401) handleLogout();
        } finally {
            setIsLoadingTables(false);
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        setIsLoggedIn(false);
        setUser(null);
        setTables([]);
        navigate('/');
    };

    // 3. Abrir el modal y consultar disponibilidad
    const handleTableClick = (tableId, tableNumber) => {
        // Desbloquear audio del navegador con la interacción del usuario
        if (bookingSoundRef.current) {
            const s = bookingSoundRef.current;
            s.volume = 0;
            s.play().then(() => { s.pause(); s.currentTime = 0; s.volume = 1; }).catch(() => { });
        }
        setSelectedTable({ id: tableId, number: tableNumber });
        setIsModalOpen(true);
        setBookingMessage(null);
        fetchAvailability(tableId, selectedDate);
    };

    // 4. Consultar horas libres al backend
    const fetchAvailability = async (tableId, date) => {
        setIsLoadingSlots(true);
        try {
            const token = localStorage.getItem('bola9_token');
            const response = await api.get(`/api/bookings/availability?date=${date}&tableId=${tableId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAvailableSlots(response.data.availableSlots);
        } catch (error) {
            console.error('Error consultando disponibilidad:', error);
            setAvailableSlots([]);
        } finally {
            setIsLoadingSlots(false);
        }
    };

    // 5. Cambiar la fecha en el modal
    const handleDateChange = (e) => {
        const newDate = e.target.value;
        setSelectedDate(newDate);
        setBookingMessage(null);

        // PARCHE: Solo disparamos la petición si newDate tiene un valor real
        if (newDate && selectedTable) {
            fetchAvailability(selectedTable.id, newDate);
        } else {
            // Si el usuario borró la fecha, vaciamos la lista de horas por seguridad
            setAvailableSlots([]);
        }
    };

    /*
        // 6. Ejecutar la reserva (El momento crítico)
        const handleBookSlot = async (slotTime) => {
            setIsBookingInProgress(true);
            setBookingMessage(null);
    
            try {
                const token = localStorage.getItem('bola9_token');
                await api.post('/api/bookings', {
                    tableId: selectedTable.id,
                    startTime: slotTime // Ej: "2026-03-01 20:00"
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
    
                setBookingMessage({ type: 'success', text: `¡Reserva confirmada para las ${dayjs(slotTime).format('HH:mm')}!` });
                // Refrescamos la disponibilidad para que esa hora desaparezca de la lista
                fetchAvailability(selectedTable.id, selectedDate);
    
            } catch (error) {
                if (error.response?.status === 409) {
                    // Alguien nos ganó la mesa en el mismo milisegundo
                    setBookingMessage({ type: 'error', text: 'Ese horario acaba de ser reservado por alguien más. Elige otro.' });
                    fetchAvailability(selectedTable.id, selectedDate);
                } else {
                    setBookingMessage({ type: 'error', text: 'Ocurrió un error al intentar reservar.' });
                }
            } finally {
                setIsBookingInProgress(false);
            }
        };
    */

    // 6. Ejecutar la reserva (El momento crítico)
    const handleBookSlot = async (slotTime) => {
        setIsBookingInProgress(true);
        setBookingMessage(null);

        try {
            // El interceptor de api.js hace el trabajo sucio del Token por ti
            await api.post('/api/bookings', {
                tableId: selectedTable.id,
                startTime: slotTime // Ej: "2026-03-01 20:00"
            });

            // Sonido de confirmación
            try {
                bookingSoundRef.current.currentTime = 0;
                bookingSoundRef.current.play();
            } catch (_) { }

            setBookingMessage({ type: 'success', text: `¡Reserva confirmada para las ${dayjs(slotTime).format('HH:mm')}!` });

            // Refrescamos la disponibilidad para que esa hora desaparezca de la lista
            fetchAvailability(selectedTable.id, selectedDate);

        } catch (error) {
            // LA CAÍDA ELEGANTE (Parche de UX)
            if (error.response?.status === 409 || error.response?.status === 400) {
                // Alguien nos ganó la mesa. Mensaje simpático para bajar la frustración.
                setBookingMessage({ type: 'error', text: '¡Ups! Camarón que se duerme... Alguien fue más rápido y acaba de tomar este horario. ¡Intenta con otro!' });

                // VITAL: Refrescamos la disponibilidad para que la interfaz deje de mentirle al usuario
                fetchAvailability(selectedTable.id, selectedDate);
            } else {
                // Capturamos cualquier otro mensaje de error que mande el backend, o uno genérico
                setBookingMessage({ type: 'error', text: error.response?.data?.error || 'Ocurrió un error al intentar reservar.' });
            }
        } finally {
            setIsBookingInProgress(false);
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedTable(null);
        setBookingMessage(null);
        setPendingSlot(null);
        setSelectedDate(dayjs().format('YYYY-MM-DD')); // Resetear a hoy
    };

    const handleToggleTable = async (tableId, e) => {
        e.stopPropagation(); // Evita que al hacer clic en apagar, se abra el modal de reserva
        if (!window.confirm('¿Cambiar el estado operativo de esta mesa?')) return;

        try {
            const token = localStorage.getItem('bola9_token');
            await api.patch(`/api/admin/tables/${tableId}/status`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Refrescar las mesas
            fetchTables(token);
        } catch (err) {
            alert('Error cambiando estado de la mesa.');
        }
    };

    return (
        <div className="min-h-screen bg-brand-dark text-white font-sans">
            {/* Navbar Público/Privado */}
            <nav className="bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center px-4 md:px-8">
                <div className="flex items-center gap-3">
                    <img src={bola9Logo} alt="Logo" className="w-8 h-8 md:w-10 md:h-10" />
                    <h1 className="text-xl md:text-2xl font-bold text-brand-primary">Club Bola9</h1>
                </div>
                <div>
                    {isLoggedIn ? (
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-300 hidden md:inline">Hola, {user.alias || user.name}</span>

                            {/* Botón Admin */}
                            {user.role === 'ADMIN' && (
                                <Link to="/admin" className="text-sm text-brand-primary hover:underline">Ir al Panel</Link>
                            )}

                            {/* NUEVO: Botón para el Cliente */}
                            {user.role === 'USER' && (
                                <Link to="/mis-reservas" className="text-sm text-emerald-400 hover:underline">Mis Reservas</Link>
                            )}

                            <button onClick={() => setIsPoliciesModalOpen(true)} className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors">
                                <ScrollText size={14} /> Políticas
                            </button>

                            <button onClick={handleLogout} className="flex items-center gap-2 text-sm bg-slate-800 hover:bg-red-500/20 hover:text-red-400 px-3 py-2 rounded transition-colors">
                                <LogOut size={16} /> Salir
                            </button>
                        </div>
                    ) : (
                        <Link to="/login" className="flex items-center gap-2 bg-brand-primary text-brand-dark font-semibold px-4 py-2 rounded hover:bg-emerald-400 transition-colors">
                            <LogIn size={18} /> Iniciar Sesión
                        </Link>
                    )}
                </div>
            </nav>

            {/* Jumbotron con Imagen de Fondo y Overlay oscuro */}
            <header
                className="relative py-16 md:py-24 px-4 text-center border-b border-slate-700 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: "url('/fondo_jumbotron.png')" }}
            >
                {/* La capa oscura (Overlay) que garantiza que el texto siempre se lea */}
                <div className="absolute inset-0 bg-slate-900/70 z-0"></div>

                {/* El Contenido (Aseguramos que esté por encima del overlay con z-10) */}
                <div className="relative z-10 max-w-3xl mx-auto">
                    <h2 className="text-4xl md:text-5xl font-extrabold mb-4 text-white">El mejor ambiente, las mejores mesas.</h2>
                    <p className="text-lg md:text-xl text-gray-300 mb-8">Reserva tu mesa de pool al instante y asegura tu noche con amigos.</p>

                    {!isLoggedIn && (
                        <Link to="/login" className="inline-block bg-brand-primary text-brand-dark font-bold text-lg px-8 py-3 rounded shadow-lg shadow-brand-primary/20 hover:bg-emerald-400 transition-all transform hover:scale-105">
                            Reserva Ahora
                        </Link>
                    )}
                </div>
            </header>

            {/* Grid de Mesas */}
            <main className="max-w-6xl mx-auto p-6 md:p-8 relative">
                {isLoggedIn ? (
                    <>
                        <div className="mb-8">
                            <h3 className="text-2xl font-semibold flex items-center gap-2">
                                <Calendar className="text-brand-primary" /> Mesas Disponibles
                            </h3>
                            <p className="text-gray-400 text-sm mt-1">Selecciona una mesa para agendar.</p>
                        </div>

                        {isLoadingTables ? (
                            <div className="text-center text-gray-500 py-10">Cargando mesas...</div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {tables.map((table) => (
                                    <button
                                        key={table.id}
                                        onClick={() => {
                                            if (table.isActive) handleTableClick(table.id, table.number);
                                        }}
                                        className={`group relative p-6 rounded-xl border transition-all flex flex-col items-center justify-center gap-4 text-left overflow-hidden ${table.isActive
                                            ? 'bg-slate-800 border-slate-700 hover:border-brand-primary hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] cursor-pointer'
                                            : 'bg-slate-900/50 border-red-900/50 cursor-not-allowed opacity-75'
                                            }`}
                                    >
                                        {/* BOTÓN SECRETO DEL ADMIN */}
                                        {user?.role === 'ADMIN' && (
                                            <div
                                                onClick={(e) => handleToggleTable(table.id, e)}
                                                className={`absolute top-2 right-2 p-2 rounded-full z-20 cursor-pointer shadow-lg transition-colors ${table.isActive ? 'bg-slate-700 text-gray-400 hover:text-amber-500 hover:bg-slate-600' : 'bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white'}`}
                                                title={table.isActive ? "Desactivar Mesa (Mantención)" : "Reactivar Mesa"}
                                            >
                                                {table.isActive ? <Wrench size={16} /> : <Power size={16} />}
                                            </div>
                                        )}

                                        {/* Representación visual de la mesa */}
                                        <div className={`w-32 h-16 rounded border-4 relative shadow-inner ${table.isActive ? 'bg-emerald-700 border-amber-900' : 'bg-slate-700 border-slate-800 grayscale'}`}>
                                            <div className="absolute top-0 left-0 w-2 h-2 bg-black rounded-full -translate-x-1 -translate-y-1"></div>
                                            <div className="absolute top-0 right-0 w-2 h-2 bg-black rounded-full translate-x-1 -translate-y-1"></div>
                                            <div className="absolute bottom-0 left-0 w-2 h-2 bg-black rounded-full -translate-x-1 translate-y-1"></div>
                                            <div className="absolute bottom-0 right-0 w-2 h-2 bg-black rounded-full translate-x-1 translate-y-1"></div>
                                            <div className="absolute top-0 left-1/2 w-2 h-2 bg-black rounded-full -translate-x-1/2 -translate-y-1"></div>
                                            <div className="absolute bottom-0 left-1/2 w-2 h-2 bg-black rounded-full -translate-x-1/2 translate-y-1"></div>
                                        </div>

                                        <div className="text-center z-10">
                                            <h4 className={`text-xl font-bold transition-colors ${table.isActive ? 'text-white group-hover:text-brand-primary' : 'text-red-400'}`}>
                                                Mesa {table.number}
                                            </h4>
                                            {table.isActive ? (
                                                <span className="text-xs text-gray-400 mt-1 block">Click para ver horarios</span>
                                            ) : (
                                                <span className="text-xs font-bold text-red-500 mt-1 flex items-center justify-center gap-1"><AlertTriangle size={12} /> EN MANTENCIÓN</span>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-16"><p className="text-gray-500">Debes iniciar sesión para ver y reservar las mesas.</p></div>
                )}
            </main>

            {/* MODAL DE RESERVA (Aparece sobre toda la interfaz) */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">

                        {/* Cabecera del Modal */}
                        <div className="flex justify-between items-center p-5 border-b border-slate-800">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-brand-primary"></div>
                                Reservar Mesa {selectedTable?.number}
                            </h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-white transition-colors bg-slate-800 p-1.5 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Contenido del Modal (Scrollable) */}
                        <div className="p-5 overflow-y-auto">

                            {/* Selector de Fecha */}
                            <div className="mb-6">
                                <label className="block text-sm text-gray-400 mb-2">Selecciona la Fecha:</label>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    min={dayjs().format('YYYY-MM-DD')} // Impide seleccionar el pasado
                                    onChange={handleDateChange}
                                    className="w-full bg-slate-800 border border-slate-700 text-white rounded p-2.5 focus:outline-none focus:border-brand-primary"
                                />
                            </div>

                            {/* Mensajes de feedback (Éxito / Error) */}
                            {bookingMessage && (
                                <div className={`p-4 rounded mb-6 flex items-start gap-3 border ${bookingMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-red-500/10 border-red-500/50 text-red-400'}`}>
                                    {bookingMessage.type === 'success' ? <CheckCircle size={20} className="shrink-0 mt-0.5" /> : <AlertTriangle size={20} className="shrink-0 mt-0.5" />}
                                    <p>{bookingMessage.text}</p>
                                </div>
                            )}

                            {/* Grid de Horarios Disponibles */}
                            {!pendingSlot && (
                                <div>
                                    <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                                        <Clock size={16} className="text-gray-500" />
                                        Horarios Libres
                                    </h4>

                                    {isLoadingSlots ? (
                                        <div className="text-center py-8 text-gray-500">Calculando disponibilidad...</div>
                                    ) : availableSlots.length === 0 ? (
                                        <div className="text-center py-8 bg-slate-800/50 rounded border border-slate-800 text-gray-400 text-sm">
                                            No hay horarios disponibles para esta fecha.
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                            {availableSlots.map((slot, index) => (
                                                <button
                                                    key={index}
                                                    onClick={() => setPendingSlot(slot)}
                                                    className="py-2.5 px-2 text-sm font-semibold bg-slate-800 text-gray-200 border border-slate-700 rounded hover:border-brand-primary hover:text-brand-primary hover:bg-brand-primary/10 transition-colors"
                                                >
                                                    {dayjs(slot).format('HH:mm')}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Paso de Confirmación */}
                            {pendingSlot && !bookingMessage && (
                                <div className="bg-slate-800 border border-brand-primary/30 rounded-lg p-5">
                                    <h4 className="text-sm font-semibold text-brand-primary mb-4 flex items-center gap-2">
                                        <CheckCircle size={16} /> ¿Confirmar reserva?
                                    </h4>
                                    <div className="space-y-2 text-sm text-gray-300 mb-5">
                                        <p>📅 Fecha: <span className="text-white font-medium">{dayjs(selectedDate).format('DD/MM/YYYY')}</span></p>
                                        <p>🎱 Mesa: <span className="text-white font-medium">{selectedTable?.number}</span></p>
                                        <p>🕐 Hora: <span className="text-white font-medium">{dayjs(pendingSlot).format('HH:mm')}</span></p>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => { handleBookSlot(pendingSlot); }}
                                            disabled={isBookingInProgress}
                                            className="flex-1 bg-brand-primary text-brand-dark font-semibold py-2.5 rounded hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isBookingInProgress ? 'Reservando...' : 'Confirmar'}
                                        </button>
                                        <button
                                            onClick={() => setPendingSlot(null)}
                                            disabled={isBookingInProgress}
                                            className="flex-1 bg-slate-700 text-gray-300 font-medium py-2.5 rounded hover:bg-slate-600 transition-colors disabled:opacity-50"
                                        >
                                            Volver
                                        </button>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE POLÍTICAS DE USO */}
            {isPoliciesModalOpen && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">

                        {/* Cabecera del Modal */}
                        <div className="flex justify-between items-center p-5 border-b border-slate-800">
                            <h3 className="text-xl font-bold text-brand-primary">Políticas del Club Bola9</h3>
                            <button onClick={() => setIsPoliciesModalOpen(false)} className="text-gray-400 hover:text-white transition-colors bg-slate-800 p-1.5 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Contenido (Scrollable) */}
                        <div className="p-6 overflow-y-auto text-sm text-gray-300 space-y-4 font-sans leading-relaxed">
                            <p>Bienvenidos al sistema de reservas de <strong>Club Bola9</strong>. Al crear una cuenta y reservar una mesa, aceptas cumplir con estas políticas.</p>

                            <h4 className="text-lg font-bold text-white mt-4 border-b border-slate-800 pb-1">1. Asistencia y Puntualidad</h4>
                            <p>Tu reserva garantiza la mesa para la hora indicada. Te recomendamos llegar con al menos 10 minutos de anticipación. Si te excedes de tu hora sin previo aviso, la mesa podría ser liberada.</p>

                            <h4 className="text-lg font-bold text-white mt-4 border-b border-slate-800 pb-1">2. Cancelaciones ("Strikes")</h4>
                            <ul className="list-disc pl-5 space-y-2">
                                <li><strong className="text-emerald-400">Temprana (+2 horas):</strong> Puedes cancelar sin ninguna penalización.</li>
                                <li><strong className="text-amber-400">Tardía / Strike (-2 horas):</strong> Puedes cancelar, pero el sistema registrará un <strong>"Strike"</strong>. Al acumular 3, tu cuenta será suspendida.</li>
                                <li><strong className="text-red-400">Bloqueo (-30 minutos):</strong> El sistema no te permitirá cancelar faltando menos de 30 minutos.</li>
                            </ul>

                            <h4 className="text-lg font-bold text-white mt-4 border-b border-slate-800 pb-1">3. Inasistencias ("No-Shows")</h4>
                            <p>Un "No-Show" ocurre cuando no cancelas y no te presentas a jugar. Aplicamos <strong>Tolerancia Cero</strong>: Un (1) solo "No-Show" resultará en una <strong className="text-red-500">Tarjeta Roja Directa</strong> y el baneo inmediato de tu cuenta.</p>

                            <h4 className="text-lg font-bold text-white mt-4 border-b border-slate-800 pb-1">4. Redención</h4>
                            <p>Si tienes Strikes acumulados, cada vez que asistas a jugar a tu hora, el sistema restará automáticamente 1 Strike de tu cuenta como premio a tu responsabilidad.</p>
                        </div>

                        {/* Pie del Modal */}
                        <div className="p-4 border-t border-slate-800 flex justify-end bg-slate-900/50 rounded-b-xl">
                            <button onClick={() => setIsPoliciesModalOpen(false)} className="bg-brand-primary text-brand-dark font-bold px-6 py-2 rounded hover:bg-emerald-400 transition-colors">
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}