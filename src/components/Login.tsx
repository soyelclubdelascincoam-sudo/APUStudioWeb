import React, { useState } from 'react';
import { supabase, isLiveSupabase, getSupabaseClient } from '../supabase';
import { useAuth } from '../context/AuthContext';

interface LoginProps {
  onLoginSuccess?: (usuario: { email: string; id: string }) => void;
  mostrarToast: (mensaje: string, tipo?: 'info' | 'success' | 'warning' | 'error') => void;
}

// Traductor de errores de Supabase Auth a español claro
function traducirErrorAuth(error: any): string {
  if (!error) return 'Ocurrió un error inesperado.';
  const msg = String(error.message || error.error_description || error);

  if (msg.includes('Invalid login credentials')) {
    return 'El correo electrónico o la contraseña ingresada son incorrectos.';
  }
  if (msg.includes('Email not confirmed')) {
    return 'Tu correo electrónico aún no ha sido confirmado. Revisa tu bandeja de entrada o spam para verificar tu cuenta.';
  }
  if (msg.includes('User already registered') || msg.includes('already registered')) {
    return 'Ya existe una cuenta registrada con este correo electrónico. Intenta iniciar sesión.';
  }
  if (msg.includes('Password should be at least')) {
    return 'La contraseña debe tener al menos 6 caracteres.';
  }
  if (msg.includes('rate limit') || msg.includes('Rate limit')) {
    return 'Demasiados intentos seguidos. Por favor, espera unos minutos antes de volver a intentar.';
  }
  if (msg.includes('Signup requires a valid password')) {
    return 'Por favor ingresa una contraseña válida.';
  }
  if (msg.includes('Unable to validate email address: invalid format')) {
    return 'El formato del correo electrónico no es válido.';
  }

  return msg;
}

export default function Login({ onLoginSuccess, mostrarToast }: LoginProps) {
  const { refrescarSesionYDatos } = useAuth();
  const [modo, setModo] = useState<'login' | 'registro' | 'recuperar'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [cargando, setCargando] = useState(false);
  const [recuperacionEnviada, setRecuperacionEnviada] = useState(false);

  // Enviar formulario (Login o Registro)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      mostrarToast('Por favor, ingresa tu correo electrónico.', 'warning');
      return;
    }

    if (modo !== 'recuperar' && !password) {
      mostrarToast('Por favor, ingresa tu contraseña.', 'warning');
      return;
    }

    setCargando(true);
    try {
      if (isLiveSupabase) {
        const client = getSupabaseClient();

        if (modo === 'recuperar') {
          // Recuperación de contraseña
          const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: `${window.location.origin}`,
          });

          if (error) throw error;

          setRecuperacionEnviada(true);
          mostrarToast('Enlace de recuperación enviado a tu correo.', 'success');
        } else if (modo === 'registro') {
          // Registro con metadatos de nombre para el trigger handle_new_user
          const { data, error } = await client.auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: {
                full_name: nombreCompleto.trim(),
                nombre: nombreCompleto.trim(),
              },
            },
          });

          if (error) throw error;

          if (data.session && data.user) {
            mostrarToast('¡Cuenta creada y sesión iniciada con éxito!', 'success');
            await refrescarSesionYDatos();
            onLoginSuccess?.({ email: data.user.email || email, id: data.user.id });
          } else {
            mostrarToast(
              '¡Registro completado! Si la confirmación de email está activa, revisa tu bandeja de entrada.',
              'success'
            );
            setModo('login');
          }
        } else {
          // Inicio de sesión normal
          const { data, error } = await client.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

          if (error) throw error;

          if (data.user) {
            mostrarToast('¡Bienvenido de vuelta a APUStudio!', 'success');
            await refrescarSesionYDatos();
            onLoginSuccess?.({ email: data.user.email || email, id: data.user.id });
          }
        }
      } else {
        // Modo simulación local
        if (modo === 'recuperar') {
          setRecuperacionEnviada(true);
          mostrarToast('Modo demo: Enlace de recuperación simulado.', 'info');
        } else if (modo === 'registro') {
          mostrarToast('Registro demo simulado con éxito.', 'success');
          const mockUser = { email: email.trim(), id: 'mock-' + Date.now() };
          localStorage.setItem('demo_user', JSON.stringify(mockUser));
          onLoginSuccess?.(mockUser);
        } else {
          if (email === 'demo@apustudio.com' && password === 'demo123') {
            mostrarToast('¡Inicio de sesión demo exitoso!', 'success');
            const mockUser = { email: 'demo@apustudio.com', id: 'mock-user' };
            localStorage.setItem('demo_user', JSON.stringify(mockUser));
            onLoginSuccess?.(mockUser);
          } else {
            throw new Error('Credenciales inválidas. Usa demo@apustudio.com / demo123 para el modo local.');
          }
        }
      }
    } catch (err: any) {
      console.error('Error en autenticación:', err);
      const mensajeEspanol = traducirErrorAuth(err);
      mostrarToast(mensajeEspanol, 'error');
    } finally {
      setCargando(false);
    }
  };

  const autoFillDemo = () => {
    setEmail('demo@apustudio.com');
    setPassword('demo123');
    mostrarToast('Credenciales de demostración cargadas.', 'info');
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-gradient-to-br from-stone-950 via-stone-900 to-orange-950 relative overflow-hidden px-4">
      {/* Decorative Blur Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[45vw] h-[45vw] bg-orange-600/10 rounded-full blur-[100px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] bg-emerald-600/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-stone-900/70 backdrop-blur-2xl border border-stone-800/80 rounded-3xl p-8 shadow-2xl relative z-10 font-sans">
        {/* Logo / Title Section */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl shadow-lg shadow-orange-500/25 mb-3 font-display font-extrabold text-xl tracking-tight">
            APU
          </div>
          <h1 className="text-2xl font-display font-extrabold text-white tracking-tight">
            APUStudio
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Plataforma SaaS de Análisis de Precios Unitarios y Presupuestos de Obra
          </p>
        </div>

        {/* Live Server Indicator */}
        <div className="mb-6">
          {isLiveSupabase ? (
            <div className="flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2.5 rounded-2xl text-[11px] text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-semibold text-emerald-200">Base de datos de producción conectada</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 bg-amber-500/10 border border-amber-500/25 p-3 rounded-2xl text-[11px] text-amber-300">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span className="font-semibold text-amber-200">Modo Simulación Local</span>
              </div>
              <button
                type="button"
                onClick={autoFillDemo}
                className="w-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-bold py-1.5 rounded-xl text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
              >
                Auto-completar Credenciales Demo
              </button>
            </div>
          )}
        </div>

        {/* Auth Toggle Tabs (Login / Registro / Recuperación) */}
        {modo !== 'recuperar' ? (
          <div className="flex bg-stone-950 p-1.5 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => setModo('login')}
              className={`flex-1 text-center py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                modo === 'login'
                  ? 'bg-stone-800 text-white shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => setModo('registro')}
              className={`flex-1 text-center py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                modo === 'registro'
                  ? 'bg-stone-800 text-white shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Registrarse
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between mb-6 pb-2 border-b border-stone-800">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <i className="ti ti-key text-orange-400"></i> Recuperar Contraseña
            </h2>
            <button
              type="button"
              onClick={() => {
                setModo('login');
                setRecuperacionEnviada(false);
              }}
              className="text-xs text-stone-400 hover:text-orange-400 transition-colors cursor-pointer flex items-center gap-1"
            >
              <i className="ti ti-arrow-left"></i> Volver
            </button>
          </div>
        )}

        {/* Formulario */}
        {modo === 'recuperar' && recuperacionEnviada ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-12 h-12 bg-emerald-500/15 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-xl border border-emerald-500/30">
              <i className="ti ti-mail-check"></i>
            </div>
            <h3 className="text-base font-bold text-white">Revisa tu bandeja de entrada</h3>
            <p className="text-xs text-stone-400 leading-relaxed">
              Hemos enviado las instrucciones para restablecer tu contraseña a <span className="text-white font-medium">{email}</span>.
            </p>
            <button
              type="button"
              onClick={() => {
                setModo('login');
                setRecuperacionEnviada(false);
              }}
              className="w-full bg-stone-800 hover:bg-stone-700 text-white font-bold text-xs py-3 rounded-2xl transition-all cursor-pointer mt-4"
            >
              Regresar al Inicio de Sesión
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Campo Nombre Completo (solo en registro) */}
            {modo === 'registro' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest pl-1">
                  Nombre Completo / Empresa
                </label>
                <div className="relative">
                  <i className="ti ti-user absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500 text-sm"></i>
                  <input
                    type="text"
                    required
                    placeholder="Ing. Carlos Mendoza"
                    value={nombreCompleto}
                    onChange={(e) => setNombreCompleto(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-stone-800 rounded-2xl bg-stone-950/80 text-white text-xs outline-none focus:border-orange-500 transition-colors font-sans"
                  />
                </div>
              </div>
            )}

            {/* Campo Correo Electrónico */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest pl-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <i className="ti ti-mail absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500 text-sm"></i>
                <input
                  type="email"
                  required
                  placeholder="ejemplo@constructora.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-stone-800 rounded-2xl bg-stone-950/80 text-white text-xs outline-none focus:border-orange-500 transition-colors font-sans"
                />
              </div>
            </div>

            {/* Campo Contraseña (en Login y Registro) */}
            {modo !== 'recuperar' && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between pl-1">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                    Contraseña
                  </label>
                  {modo === 'login' && (
                    <button
                      type="button"
                      onClick={() => setModo('recuperar')}
                      className="text-[10.5px] text-orange-400/90 hover:text-orange-400 hover:underline transition-colors cursor-pointer"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <i className="ti ti-lock absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500 text-sm"></i>
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-stone-800 rounded-2xl bg-stone-950/80 text-white text-xs outline-none focus:border-orange-500 transition-colors font-sans"
                  />
                </div>
              </div>
            )}

            {/* Botón Principal de Envío */}
            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 active:from-orange-700 active:to-orange-850 text-white font-extrabold text-xs uppercase tracking-wider py-4 rounded-2xl shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {cargando ? (
                <>
                  <i className="ti ti-loader-2 spin"></i>
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <i
                    className={`ti ${
                      modo === 'registro'
                        ? 'ti-user-plus'
                        : modo === 'recuperar'
                        ? 'ti-send'
                        : 'ti-login'
                    }`}
                  ></i>
                  <span>
                    {modo === 'registro'
                      ? 'Crear Cuenta y Espacio'
                      : modo === 'recuperar'
                      ? 'Enviar Enlace de Recuperación'
                      : 'Acceder a APUStudio'}
                  </span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer info */}
        <div className="text-center mt-6 text-[10px] text-stone-500">
          Plataforma multi-tenant segura con aislamiento de datos RLS en PostgreSQL.
        </div>
      </div>
    </div>
  );
}
