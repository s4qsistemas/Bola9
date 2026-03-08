import React, { useState, useEffect } from 'react';
import api from '../api';

const JumbotronManager = () => {
    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [currentImage, setCurrentImage] = useState(null); // La imagen que está en vivo ahora

    const [selectedFile, setSelectedFile] = useState(null); // El archivo físico que el admin elige
    const [previewUrl, setPreviewUrl] = useState(null); // Previsualización local antes de guardar

    const [status, setStatus] = useState({ type: '', message: '' });
    const [isLoading, setIsLoading] = useState(false);

    // 1. Cargar los datos actuales al montar el componente
    useEffect(() => {
        fetchJumbotronData();
    }, []);

    const fetchJumbotronData = async () => {
        try {
            const response = await api.get('/api/jumbotron');
            if (response.data) {
                setTitle(response.data.title || '');
                setSubtitle(response.data.subtitle || '');

                // LÓGICA LIMPIA:
                // En Dev (VITE_API_URL=''): '' + '/uploads/foto.png' -> '/uploads/foto.png' (El proxy lo atrapa)
                // En Prod (VITE_API_URL='https://api.clubbola9.cl'): 'https://...' + '/uploads/foto.png'
                const baseUrl = import.meta.env.VITE_API_URL || '';
                setCurrentImage(response.data.imageUrl ? `${baseUrl}${response.data.imageUrl}` : null);
            }
        } catch (error) {
            console.error('Error al cargar datos del Jumbotron', error);
        }
    };

    // 2. Manejar la selección de la imagen y crear una previsualización
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            // Creamos una URL temporal en el navegador para que el admin vea qué eligió
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    // 3. Guardar los cambios (La trampa del FormData)
    const handleSave = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setStatus({ type: '', message: '' });

        try {
            // VITAL: No usamos un objeto normal {}, usamos FormData
            const formData = new FormData();
            formData.append('title', title);
            formData.append('subtitle', subtitle);

            // Si el admin eligió una foto nueva, la adjuntamos a la caja
            if (selectedFile) {
                formData.append('image', selectedFile);
            } else if (!currentImage && !previewUrl) {
                // Si no hay archivo nuevo, y tampoco hay imagen actual (el admin la borró)
                formData.append('removeImage', 'true');
            }

            // Enviamos la caja. Axios es suficientemente inteligente para configurar los headers multipart/form-data automáticamente
            await api.post('/api/jumbotron', formData);

            setStatus({ type: 'success', message: '¡Jumbotron actualizado con éxito!' });

            // Refrescamos los datos para confirmar
            fetchJumbotronData();
            // Limpiamos la selección temporal
            setSelectedFile(null);
            setPreviewUrl(null);

        } catch (error) {
            setStatus({ type: 'error', message: 'Ocurrió un error al guardar los cambios.' });
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-700 max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-white mb-6">Configuración del Banner (Jumbotron)</h3>

            {status.message && (
                <div className={`p-4 mb-6 rounded ${status.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500' : 'bg-red-500/20 text-red-400 border border-red-500'}`}>
                    {status.message}
                </div>
            )}

            <form onSubmit={handleSave} className="space-y-6">

                {/* Textos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Título Principal (Opcional)</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ej: El mejor ambiente..."
                            className="w-full bg-slate-900 border border-slate-600 rounded px-4 py-2 text-white focus:outline-none focus:border-brand-primary"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Subtítulo (Opcional)</label>
                        <input
                            type="text"
                            value={subtitle}
                            onChange={(e) => setSubtitle(e.target.value)}
                            placeholder="Ej: Reserva tu mesa de pool..."
                            className="w-full bg-slate-900 border border-slate-600 rounded px-4 py-2 text-white focus:outline-none focus:border-brand-primary"
                        />
                    </div>
                </div>

                <p className="text-xs text-slate-400 italic">Si dejas los textos en blanco, solo se mostrará la imagen (ideal para banners publicitarios que ya traen texto).</p>

                <hr className="border-slate-700" />

                {/* Subida de Imagen */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Imagen de Fondo</label>
                    <p className="text-xs text-slate-400 mb-4">Recomendación: Resolución 1920x1080 px, formato .webp o .jpg optimizado. Mantén la acción en el centro.</p>

                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="block w-full text-sm text-slate-400
                        file:mr-4 file:py-2 file:px-4
                        file:rounded file:border-0
                        file:text-sm file:font-semibold
                        file:bg-brand-primary file:text-brand-dark
                        hover:file:bg-emerald-400 transition-all cursor-pointer mb-4"
                    />

                    {/* Previsualización visual para el Admin */}
                    {(previewUrl || currentImage) && (
                        <div className="mt-4 border border-slate-600 rounded p-4 bg-slate-900 inline-block relative">
                            <p className="text-xs text-slate-400 mb-2">Imagen Actual:</p>
                            <img
                                src={previewUrl || currentImage}
                                alt="Previsualización Jumbotron"
                                className="h-48 w-auto object-cover rounded"
                            />
                            {/* EL BOTÓN DE LIMPIEZA */}
                            <button
                                type="button"
                                onClick={() => {
                                    setPreviewUrl(null);
                                    setCurrentImage(null);
                                    setSelectedFile(null);
                                }}
                                className="mt-3 text-xs bg-red-500/20 text-red-400 px-3 py-1.5 rounded border border-red-500/30 hover:bg-red-500 hover:text-white transition-colors"
                            >
                                Quitar Imagen (Usar Original)
                            </button>
                        </div>
                    )}
                </div>

                {/* Botón Guardar */}
                <div className="pt-4 flex justify-end">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`bg-brand-primary text-brand-dark font-bold px-6 py-2 rounded hover:bg-emerald-400 transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default JumbotronManager;