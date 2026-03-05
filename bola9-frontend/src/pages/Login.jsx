import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Lock, Mail, User, UserCircle, Eye, EyeOff, X } from 'lucide-react';
import bola9Logo from '../assets/logo.svg';

export default function Login() {
    const [isRegistering, setIsRegistering] = useState(false); // Controla qué formulario mostrar

    const [isForcingPasswordChange, setIsForcingPasswordChange] = useState(false);
    const [newPassword, setNewPassword] = useState('');

    // Estados de los campos
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [alias, setAlias] = useState('');
    const [acceptPolicies, setAcceptPolicies] = useState(false);

    // Estados nuevos de UI (Ojito y Modal)
    const [showPassword, setShowPassword] = useState(false);
    const [isPoliciesModalOpen, setIsPoliciesModalOpen] = useState(false);

    // Estados de feedback y carga
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMsg(null);
        setIsLoading(true);

        try {
            if (isRegistering) {
                // FLUJO DE REGISTRO
                await api.post('/api/auth/register', {
                    email, password, name, alias
                });
                setSuccessMsg('Cuenta creada exitosamente. Ahora puedes iniciar sesión.');
                setIsRegistering(false); // Lo devolvemos al login
                setPassword(''); // Limpiamos la clave por seguridad
            } else {
                // FLUJO DE LOGIN 
                const response = await api.post('/api/auth/login', { email, password });
                const { token, user } = response.data;

                // Guardamos en local
                localStorage.setItem('bola9_token', token);
                localStorage.setItem('bola9_user', JSON.stringify(user));

                // LA INTERCEPCIÓN: ¿Debe cambiar la clave obligatoriamente?
                if (user.mustChangePassword) {
                    setIsForcingPasswordChange(true);
                    setError(null);
                    setSuccessMsg('Por tu seguridad, debes crear una nueva contraseña ahora.');
                    return; // Detenemos la redirección, lo dejamos atrapado aquí
                }

                // Si no debe cambiarla, pasa directo
                if (user.role === 'ADMIN') navigate('/admin');
                else navigate('/');
            }
        } catch (err) {
            if (err.response?.data?.error) {
                setError(err.response.data.error);
            } else {
                setError('Error de conexión con el servidor.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            await api.patch('/api/auth/update-password', { newPassword });

            // Actualizamos el usuario en el localStorage para quitarle la marca
            const userStr = localStorage.getItem('bola9_user');
            if (userStr) {
                const user = JSON.parse(userStr);
                user.mustChangePassword = false;
                localStorage.setItem('bola9_user', JSON.stringify(user));
            }

            setSuccessMsg('¡Contraseña actualizada! Entrando al sistema...');
            setTimeout(() => {
                navigate('/'); // Lo dejamos pasar
            }, 1500);

        } catch (err) {
            setError(err.response?.data?.error || 'Error al actualizar.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center px-4">
            <div className="w-full max-w-md bg-slate-800 p-8 rounded-xl shadow-lg border border-slate-700">

                <div className="flex items-center gap-3 justify-center mb-6">
                    <img src={bola9Logo} alt="Logo Bola9" className="w-10 h-10 shadow-lg" />
                    <h2 className="text-3xl font-bold text-center text-brand-primary">
                        {isRegistering ? 'Crear Cuenta' : 'Ingreso al Sistema'}
                    </h2>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded mb-4 text-center text-sm">
                        {error}
                    </div>
                )}

                {successMsg && (
                    <div className="bg-emerald-500/10 border border-emerald-500 text-emerald-400 p-3 rounded mb-4 text-center text-sm">
                        {successMsg}
                    </div>
                )}

                {isForcingPasswordChange ? (
                    /* FORMULARIO DE SECUESTRO (CAMBIO DE CLAVE) */
                    <form onSubmit={handleUpdatePassword} className="space-y-4">
                        <div className="bg-amber-500/10 border border-amber-500/50 p-4 rounded text-sm text-amber-200 mb-4 flex flex-col gap-1">
                            <span className="font-bold">⚠️ Atención requerida</span>
                            <span>Por tu seguridad, es obligatorio cambiar la contraseña temporal antes de continuar.</span>
                        </div>

                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Crea tu nueva contraseña</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-500" />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    className="w-full pl-10 pr-12 py-2 bg-slate-900 border border-slate-700 rounded text-white focus:outline-none focus:border-brand-primary"
                                    placeholder="Mínimo 6 caracteres"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || newPassword.length < 6}
                            className="w-full py-2.5 mt-2 rounded font-semibold bg-brand-primary text-brand-dark hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Actualizando...' : 'Guardar y Entrar al Club'}
                        </button>
                    </form>
                ) : (
                    /* EL FORMULARIO ORIGINAL DE LOGIN/REGISTRO VA AQUÍ DENTRO */
                    <form onSubmit={handleSubmit} className="space-y-4">

                        {/* Campos extra SOLO para el Registro */}
                        {isRegistering && (
                            <>
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">Nombre Completo</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><User className="h-5 w-5 text-gray-500" /></div>
                                        <input type="text" required className="w-full pl-10 pr-3 py-2 bg-slate-900 border border-slate-700 rounded text-white focus:outline-none focus:border-brand-primary" placeholder="Juan Pérez" value={name} onChange={(e) => setName(e.target.value)} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">Alias / Apodo (Opcional)</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><UserCircle className="h-5 w-5 text-gray-500" /></div>
                                        <input type="text" className="w-full pl-10 pr-3 py-2 bg-slate-900 border border-slate-700 rounded text-white focus:outline-none focus:border-brand-primary" placeholder="Ej: El Mago" value={alias} onChange={(e) => setAlias(e.target.value)} />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Campo común: Email */}
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Correo Electrónico</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Mail className="h-5 w-5 text-gray-500" /></div>
                                <input type="email" required className="w-full pl-10 pr-3 py-2 bg-slate-900 border border-slate-700 rounded text-white focus:outline-none focus:border-brand-primary" placeholder="correo@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                            </div>
                        </div>

                        {/* Campo común: Contraseña con Ojito */}
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Contraseña</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-500" />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    className="w-full pl-10 pr-12 py-2 bg-slate-900 border border-slate-700 rounded text-white focus:outline-none focus:border-brand-primary"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Checkbox de Políticas (Solo visible en registro) */}
                        {isRegistering && (
                            <div className="flex items-start gap-2 mt-4 mb-2">
                                <input
                                    type="checkbox"
                                    id="policies"
                                    required
                                    checked={acceptPolicies}
                                    onChange={(e) => setAcceptPolicies(e.target.checked)}
                                    className="mt-1 w-4 h-4 accent-brand-primary cursor-pointer border-slate-600 bg-slate-900"
                                />
                                <label htmlFor="policies" className="text-xs text-gray-400 leading-tight">
                                    He leído y acepto las <button type="button" onClick={() => setIsPoliciesModalOpen(true)} className="text-brand-primary hover:underline transition-colors font-semibold">Políticas de Reserva y Uso</button> del Club Bola9, incluyendo las reglas de cancelación y penalización ("Strikes").
                                </label>
                            </div>
                        )}

                        {/* Botón Maestro */}
                        <button
                            type="submit"
                            disabled={isLoading || (isRegistering && !acceptPolicies)}
                            className={`w-full py-2.5 mt-2 rounded font-semibold text-brand-dark transition-all ${isLoading || (isRegistering && !acceptPolicies)
                                ? 'bg-gray-500 cursor-not-allowed opacity-50'
                                : 'bg-brand-primary hover:bg-emerald-400 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                                }`}
                        >
                            {isLoading ? 'Procesando...' : (isRegistering ? 'Registrarme' : 'Iniciar Sesión')}
                        </button>
                    </form>
                )}

                {/* Toggle para cambiar de modo */}
                <div className="mt-6 text-center border-t border-slate-700 pt-4">
                    <p className="text-sm text-gray-400">
                        {isRegistering ? '¿Ya tienes una cuenta?' : '¿No tienes cuenta?'}
                        <button
                            onClick={() => { setIsRegistering(!isRegistering); setError(null); setSuccessMsg(null); }}
                            className="ml-2 text-brand-primary hover:underline font-medium"
                        >
                            {isRegistering ? 'Inicia sesión aquí' : 'Regístrate aquí'}
                        </button>
                    </p>
                </div>

            </div>

            {/* MODAL DE POLÍTICAS DE USO */}
            {isPoliciesModalOpen && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">

                        {/* Cabecera del Modal */}
                        <div className="flex justify-between items-center p-5 border-b border-slate-800">
                            <h3 className="text-xl font-bold text-white text-brand-primary">Políticas del Club Bola9</h3>
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