import React, { useState } from 'react';
import { isLiveSupabase, getSupabaseClient } from '../supabase';
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
  const [recordarme, setRecordarme] = useState(true);
  const [mostrarPassword, setMostrarPassword] = useState(false);
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
            mostrarToast('¡Bienvenido de nuevo a APUStudio!', 'success');
            await refrescarSesionYDatos();
            onLoginSuccess?.({ email: data.user.email || email, id: data.user.id });
          }
        }
      } else {
        // Modo simulado local
        await new Promise((r) => setTimeout(r, 600));
        const mockUser = {
          email: email.trim(),
          id: 'mock-user-123',
        };
        localStorage.setItem('demo_user', JSON.stringify(mockUser));
        mostrarToast('Sesión iniciada en modo local simulado.', 'info');
        await refrescarSesionYDatos();
        onLoginSuccess?.(mockUser);
      }
    } catch (err: any) {
      console.error('Error de autenticación:', err);
      const mensajeClaro = traducirErrorAuth(err);
      mostrarToast(mensajeClaro, 'error');
    } finally {
      setCargando(false);
    }
  };

  const autoFillDemo = () => {
    setEmail('demo@apustudio.com');
    setPassword('DemoUser2026!');
    mostrarToast('Credenciales de demostración cargadas.', 'info');
  };

  return (
    <div className="min-h-screen w-screen flex flex-col justify-between bg-slate-50 relative overflow-y-auto font-sans">
      
      {/* Top Header links matching Figma */}
      <header className="w-full px-6 py-4 flex items-center justify-between text-xs text-slate-500 border-b border-slate-100/80 bg-white/60 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-orange-600 text-white flex items-center justify-center font-bold text-xs">
            A
          </div>
          <span className="font-display font-extrabold text-slate-900 tracking-tight text-sm">
            APUStudio
          </span>
        </div>
        <div className="flex items-center gap-5">
          <a
            href="#ayuda"
            onClick={(e) => { e.preventDefault(); mostrarToast('Centro de ayuda en línea disponible para soporte técnico.', 'info'); }}
            className="hover:text-slate-900 transition-colors flex items-center gap-1.5"
          >
            <i className="ti ti-help-circle text-sm text-slate-400"></i> Centro de ayuda
          </a>
          <span className="text-slate-300">·</span>
          <a
            href="#privacidad"
            onClick={(e) => { e.preventDefault(); mostrarToast('Términos y condiciones de privacidad de datos de obra.', 'info'); }}
            className="hover:text-slate-900 transition-colors"
          >
            Privacidad
          </a>
          <a
            href="#terminos"
            onClick={(e) => { e.preventDefault(); mostrarToast('Términos de servicio de la plataforma SaaS.', 'info'); }}
            className="hover:text-slate-900 transition-colors"
          >
            Términos de uso
          </a>
        </div>
      </header>

      {/* Main Container Card matching Figma Frame */}
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[420px] bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-10 shadow-xl shadow-slate-200/50 relative z-10">
          
          {/* Header Title from Figma */}
          <div className="mb-6">
            <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-orange-600 mb-2">
              <span className="w-1 h-3.5 bg-orange-600 rounded-full inline-block"></span>
              <span>ESPACIO DE TRABAJO</span>
            </div>
            <h1 className="text-2xl sm:text-[26px] font-display font-extrabold text-slate-900 tracking-tight">
              Bienvenido de nuevo
            </h1>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Ingresa tus credenciales para continuar con la gestión de tus obras.
            </p>
          </div>

          {/* Formulario */}
          {modo === 'recuperar' && recuperacionEnviada ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-xl border border-emerald-100">
                <i className="ti ti-mail-check"></i>
              </div>
              <h3 className="text-base font-bold text-slate-900">Revisa tu bandeja de entrada</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Hemos enviado un correo a <strong className="text-slate-800">{email}</strong> con instrucciones para restablecer tu contraseña.
              </p>
              <button
                type="button"
                onClick={() => {
                  setModo('login');
                  setRecuperacionEnviada(false);
                }}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Volver a Iniciar Sesión
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {modo === 'registro' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Nombre Completo o Empresa
                  </label>
                  <input
                    type="text"
                    required
                    value={nombreCompleto}
                    onChange={(e) => setNombreCompleto(e.target.value)}
                    placeholder="Ej. Ing. Carlos Rodríguez"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-all shadow-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Usuario
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ingresa tu usuario o correo"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-all shadow-sm"
                />
              </div>

              {modo !== 'recuperar' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={mostrarPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Ingresa tu contraseña"
                      className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-all shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarPassword((prev) => !prev)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer text-sm"
                    >
                      <i className={`ti ${mostrarPassword ? 'ti-eye-off' : 'ti-eye'}`}></i>
                    </button>
                  </div>
                </div>
              )}

              {modo === 'login' && (
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={recordarme}
                      onChange={(e) => setRecordarme(e.target.checked)}
                      className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 w-3.5 h-3.5"
                    />
                    <span>Recordarme</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setModo('recuperar')}
                    className="text-orange-600 hover:text-orange-700 font-semibold cursor-pointer border-none bg-transparent"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              )}

              {/* Botón Principal Naranja con Flecha */}
              <button
                type="submit"
                disabled={cargando}
                className="w-full mt-2 bg-orange-600 hover:bg-orange-700 active:scale-[0.99] text-white font-bold py-3 rounded-xl text-xs tracking-wide shadow-md shadow-orange-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cargando ? (
                  <>
                    <i className="ti ti-loader-2 spin text-sm"></i>
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {modo === 'login'
                        ? 'Iniciar sesión'
                        : modo === 'registro'
                        ? 'Crear Cuenta'
                        : 'Enviar enlace de recuperación'}
                    </span>
                    <i className="ti ti-arrow-right text-sm"></i>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Bottom Switch between Login / Registro */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center space-y-3">
            <p className="text-xs text-slate-500">
              {modo === 'login' ? (
                <>
                  ¿Aún no tienes acceso?{' '}
                  <button
                    type="button"
                    onClick={() => setModo('registro')}
                    className="text-orange-600 hover:text-orange-700 font-bold ml-1 cursor-pointer"
                  >
                    Registrarme
                  </button>
                </>
              ) : modo === 'registro' ? (
                <>
                  ¿Ya tienes una cuenta?{' '}
                  <button
                    type="button"
                    onClick={() => setModo('login')}
                    className="text-orange-600 hover:text-orange-700 font-bold ml-1 cursor-pointer"
                  >
                    Iniciar sesión
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setModo('login')}
                  className="text-orange-600 hover:text-orange-700 font-bold cursor-pointer"
                >
                  Volver al formulario de ingreso
                </button>
              )}
            </p>

            {/* Quick Demo Access Button */}
            <button
              type="button"
              onClick={autoFillDemo}
              className="text-[11px] text-slate-400 hover:text-slate-600 font-medium cursor-pointer underline flex items-center justify-center gap-1 mx-auto"
            >
              <i className="ti ti-user-check"></i> Rellenar usuario demo (demo@apustudio.com)
            </button>
          </div>

        </div>
      </main>

      {/* Bottom Tagline from Figma */}
      <footer className="w-full py-4 text-center text-xs text-slate-400 font-medium">
        Proyectos, APUs y presupuestos en un solo lugar.
      </footer>

    </div>
  );
}
