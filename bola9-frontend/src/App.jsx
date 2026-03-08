import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Admin from './pages/Admin';
import MyBookings from './pages/MyBookings';
import Footer from './components/Footer';

export default function App() {
  return (
    // 1. EL CONTENEDOR MAESTRO: Flexbox en columna, altura mínima de toda la pantalla
    <div className="flex flex-col min-h-screen w-full">

      {/* 2. EL CONTENIDO: flex-grow hace que esta sección ocupe todo el espacio sobrante */}
      <main className="flex-grow w-full">
        <Routes>
          {/* Rutas Públicas */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />

          {/* Ruta del Panel conectada */}
          <Route path="/admin" element={<Admin />} />

          {/* Ruta del Cliente conectada */}
          <Route path="/mis-reservas" element={<MyBookings />} />

          {/* Ruta 404 para URLs que no existen */}
          <Route path="*" element={
            <div className="text-white p-10 text-center text-2xl text-red-500">
              404 - Página no encontrada
            </div>
          } />
        </Routes>
      </main>

      {/* 3. EL PIE DE PÁGINA: Al estar fuera del main, siempre quedará al fondo */}
      <Footer />

    </div>
  );
}