import React, { useState, useEffect } from 'react';
import { isLiveSupabase, getSupabaseClient } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { ConfigIA, Proyecto } from '../types';

interface ConfigPanelProps {
  configIA: ConfigIA;
  setConfigIA: React.Dispatch<React.SetStateAction<any>>;
  proyectoActivo?: Proyecto | null;
  mostrarToast?: (mensaje: string, tipo?: 'info' | 'success' | 'warning' | 'error') => void;
  abrirSelectorOrg?: () => void;
  abrirSelectorProyecto?: () => void;
}

interface MiembroConPerfil {
  id: string;
  user_id: string;
  rol: string;
  activo: boolean;
  perfil?: {
    nombre_completo: string | null;
    email: string;
    telefono: string | null;
  } | null;
}

export default function ConfigPanel({
  configIA,
  setConfigIA,
  proyectoActivo,
  mostrarToast,
  abrirSelectorOrg,
  abrirSelectorProyecto,
}: ConfigPanelProps) {
  const {
    user,
    perfil,
    organizacionActiva,
    rolOrg,
    esDuenoOAdmin,
    actualizarPerfil,
    actualizarOrganizacionActiva,
    cerrarSesion,
  } = useAuth();

  // Estados de edición del perfil
  const [nombreCompleto, setNombreCompleto] = useState(perfil?.nombre_completo || '');
  const [telefono, setTelefono] = useState(perfil?.telefono || '');
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);

  // Estados de edición de la organización
  const [nombreOrg, setNombreOrg] = useState(organizacionActiva?.nombre || '');
  const [rucOrg, setRucOrg] = useState(organizacionActiva?.ruc_identificacion || '');
  const [guardandoOrg, setGuardandoOrg] = useState(false);

  // Estados del equipo / miembros de la organización
  const [miembros, setMiembros] = useState<MiembroConPerfil[]>([]);
  const [cargandoMiembros, setCargandoMiembros] = useState(false);
  const [emailNuevoMiembro, setEmailNuevoMiembro] = useState('');
  const [rolNuevoMiembro, setRolNuevoMiembro] = useState<'administrador' | 'miembro'>('miembro');
  const [invitandoMiembro, setInvitandoMiembro] = useState(false);

  // Sincronizar inputs cuando cambian perfil u organización
  useEffect(() => {
    if (perfil) {
      setNombreCompleto(perfil.nombre_completo || '');
      setTelefono(perfil.telefono || '');
    }
  }, [perfil]);

  useEffect(() => {
    if (organizacionActiva) {
      setNombreOrg(organizacionActiva.nombre || '');
      setRucOrg(organizacionActiva.ruc_identificacion || '');
      cargarMiembrosOrg(organizacionActiva.id);
    }
  }, [organizacionActiva?.id]);

  const cargarMiembrosOrg = async (orgId: string) => {
    if (!isLiveSupabase) return;
    setCargandoMiembros(true);
    try {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from('miembros_organizacion')
        .select(`
          id,
          user_id,
          rol,
          activo,
          perfil:perfiles (
            nombre_completo,
            email,
            telefono
          )
        `)
        .eq('organizacion_id', orgId);

      if (error) throw error;
      setMiembros((data as unknown as MiembroConPerfil[]) || []);
    } catch (err) {
      console.error('Error cargando miembros de la organización:', err);
    } finally {
      setCargandoMiembros(false);
    }
  };

  const handleGuardarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoPerfil(true);
    try {
      await actualizarPerfil({
        nombre_completo: nombreCompleto.trim() || null,
        telefono: telefono.trim() || null,
      });
      if (mostrarToast) mostrarToast('¡Perfil actualizado con éxito!', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar perfil';
      if (mostrarToast) mostrarToast(msg, 'error');
    } finally {
      setGuardandoPerfil(false);
    }
  };

  const handleGuardarOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!esDuenoOAdmin) return;
    if (!nombreOrg.trim()) {
      if (mostrarToast) mostrarToast('El nombre de la empresa no puede estar vacío.', 'warning');
      return;
    }

    setGuardandoOrg(true);
    try {
      await actualizarOrganizacionActiva({
        nombre: nombreOrg.trim(),
        ruc_identificacion: rucOrg.trim() || null,
      });
      if (mostrarToast) mostrarToast('¡Datos de la constructora actualizados!', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar organización';
      if (mostrarToast) mostrarToast(msg, 'error');
    } finally {
      setGuardandoOrg(false);
    }
  };

  const handleInvitarMiembro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!esDuenoOAdmin || !organizacionActiva) return;
    if (!emailNuevoMiembro.trim()) {
      if (mostrarToast) mostrarToast('Ingresa el correo electrónico del colaborador.', 'warning');
      return;
    }

    setInvitandoMiembro(true);
    try {
      if (isLiveSupabase) {
        const client = getSupabaseClient();
        // Buscar si existe un perfil con ese correo
        const { data: userPerfil, error: pErr } = await client
          .from('perfiles')
          .select('id, email')
          .eq('email', emailNuevoMiembro.trim().toLowerCase())
          .maybeSingle();

        if (pErr) throw pErr;

        if (!userPerfil) {
          if (mostrarToast) {
            mostrarToast(
              'El usuario aún no se ha registrado en APUStudio. Pídele que cree su cuenta con ese correo para asignarlo.',
              'warning'
            );
          }
          return;
        }

        // Asignar en miembros_organizacion
        const { error: insErr } = await client.from('miembros_organizacion').insert({
          organizacion_id: organizacionActiva.id,
          user_id: userPerfil.id,
          rol: rolNuevoMiembro,
          activo: true,
        });

        if (insErr) {
          if (insErr.message.includes('unique') || insErr.code === '23505') {
            throw new Error('Este colaborador ya es miembro de la constructora.');
          }
          throw insErr;
        }

        if (mostrarToast) mostrarToast(`¡Colaborador añadido como ${rolNuevoMiembro}!`, 'success');
        setEmailNuevoMiembro('');
        await cargarMiembrosOrg(organizacionActiva.id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al invitar colaborador';
      if (mostrarToast) mostrarToast(msg, 'error');
    } finally {
      setInvitandoMiembro(false);
    }
  };

  const copiarCodigoAcceso = () => {
    if (proyectoActivo?.codigo_acceso || proyectoActivo?.codigo) {
      const codigo = proyectoActivo.codigo_acceso || proyectoActivo.codigo || '';
      navigator.clipboard.writeText(codigo);
      if (mostrarToast) mostrarToast('¡Código de obra copiado al portapapeles!', 'success');
    }
  };

  const urlConfigurada = (import.meta as any).env.VITE_SUPABASE_URL || '';

  return (
    <div className="flex-1 overflow-y-auto bg-stone-50 p-6 flex flex-col items-center gap-6 pb-20">
      
      {/* 1. TARJETA: PERFIL DEL USUARIO */}
      <div className="w-full max-w-2xl bg-white border border-stone-250 rounded-3xl p-6.5 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-stone-150 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-black text-lg">
              {perfil?.nombre_completo ? perfil.nombre_completo.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-xs font-black text-orange-600 uppercase tracking-widest flex items-center gap-1.5">
                <i className="ti ti-user font-medium"></i> Perfil Personal
              </h3>
              <h4 className="text-base font-extrabold text-stone-850 mt-0.5">
                {perfil?.nombre_completo || 'Ingeniero / Constructor'}
              </h4>
              <p className="text-xs text-stone-400 font-mono">{user?.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={cerrarSesion}
            className="text-xs font-bold text-rose-600 hover:text-rose-750 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3.5 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <i className="ti ti-logout"></i> Cerrar Sesión
          </button>
        </div>

        <form onSubmit={handleGuardarPerfil} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-stone-600 uppercase tracking-wider block mb-1">
                Nombre Completo
              </label>
              <input
                type="text"
                value={nombreCompleto}
                onChange={(e) => setNombreCompleto(e.target.value)}
                placeholder="Ej. Ing. Juan Pérez"
                className="w-full px-3.5 py-2 border border-stone-300 rounded-xl bg-stone-50 text-xs font-semibold outline-none focus:bg-white focus:border-orange-500 transition-all"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-stone-600 uppercase tracking-wider block mb-1">
                Teléfono / WhatsApp
              </label>
              <input
                type="text"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Ej. +593 99 123 4567"
                className="w-full px-3.5 py-2 border border-stone-300 rounded-xl bg-stone-50 text-xs font-semibold outline-none focus:bg-white focus:border-orange-500 transition-all"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={guardandoPerfil}
              className="bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              <i className="ti ti-check"></i>
              {guardandoPerfil ? 'Guardando...' : 'Guardar Perfil'}
            </button>
          </div>
        </form>
      </div>

      {/* 2. TARJETA: CONSTRUCTORA / ORGANIZACIÓN ACTIVA */}
      <div className="w-full max-w-2xl bg-white border border-stone-250 rounded-3xl p-6.5 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-stone-150 pb-4">
          <div>
            <h3 className="text-xs font-black text-orange-600 uppercase tracking-widest flex items-center gap-1.5">
              <i className="ti ti-building font-medium"></i> Empresa / Constructora
            </h3>
            <h4 className="text-base font-extrabold text-stone-850 mt-0.5">
              {organizacionActiva?.nombre || 'Sin constructora'}
            </h4>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-orange-50 text-orange-700 border border-orange-250 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
              PLAN: {organizacionActiva?.plan?.toUpperCase() || 'PRO'}
            </span>
            <span
              className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${
                rolOrg === 'dueño'
                  ? 'bg-amber-50 text-amber-700 border-amber-300'
                  : rolOrg === 'administrador'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                  : 'bg-stone-100 text-stone-700 border-stone-300'
              }`}
            >
              TU ROL: {rolOrg?.toUpperCase() || 'MIEMBRO'}
            </span>
          </div>
        </div>

        <form onSubmit={handleGuardarOrg} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-stone-600 uppercase tracking-wider block mb-1">
                Razón Social / Constructora
              </label>
              <input
                type="text"
                disabled={!esDuenoOAdmin}
                value={nombreOrg}
                onChange={(e) => setNombreOrg(e.target.value)}
                placeholder="Nombre de la empresa"
                className="w-full px-3.5 py-2 border border-stone-300 rounded-xl bg-stone-50 disabled:bg-stone-100 disabled:text-stone-500 text-xs font-semibold outline-none focus:bg-white focus:border-orange-500 transition-all"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-stone-600 uppercase tracking-wider block mb-1">
                RUC / Identificación Fiscal
              </label>
              <input
                type="text"
                disabled={!esDuenoOAdmin}
                value={rucOrg}
                onChange={(e) => setRucOrg(e.target.value)}
                placeholder="Ej. 1790012345001"
                className="w-full px-3.5 py-2 border border-stone-300 rounded-xl bg-stone-50 disabled:bg-stone-100 disabled:text-stone-500 text-xs font-semibold outline-none focus:bg-white focus:border-orange-500 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {abrirSelectorOrg ? (
              <button
                type="button"
                onClick={abrirSelectorOrg}
                className="text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-3.5 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <i className="ti ti-switch-horizontal"></i> Cambiar o Fundar Constructora
              </button>
            ) : <div />}

            {esDuenoOAdmin && (
              <button
                type="submit"
                disabled={guardandoOrg}
                className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <i className="ti ti-check"></i>
                {guardandoOrg ? 'Guardando...' : 'Actualizar Empresa'}
              </button>
            )}
          </div>
        </form>

        {/* LISTADO DE MIEMBROS DE LA ORGANIZACIÓN */}
        <div className="border-t border-stone-150 pt-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h5 className="text-xs font-extrabold text-stone-850 uppercase tracking-wide">
                Equipo de la Constructora ({miembros.length})
              </h5>
              <p className="text-[11px] text-stone-400">
                Usuarios con acceso a los catálogos y proyectos de esta empresa.
              </p>
            </div>
          </div>

          {cargandoMiembros ? (
            <div className="py-4 text-center text-xs text-stone-400">Cargando colaboradores...</div>
          ) : (
            <div className="divide-y divide-stone-100 border border-stone-200 rounded-2xl overflow-hidden bg-white">
              {miembros.map((m) => (
                <div key={m.id} className="p-3.5 flex items-center justify-between hover:bg-stone-50/70 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-stone-150 text-stone-600 flex items-center justify-center font-bold text-xs">
                      {m.perfil?.nombre_completo ? m.perfil.nombre_completo.charAt(0) : m.perfil?.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-stone-800">
                        {m.perfil?.nombre_completo || 'Colaborador'}
                      </div>
                      <div className="text-[11px] text-stone-400 font-mono">
                        {m.perfil?.email}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[9.5px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                        m.rol === 'dueño'
                          ? 'bg-amber-50 text-amber-700 border-amber-300'
                          : m.rol === 'administrador'
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                          : 'bg-stone-100 text-stone-600 border-stone-250'
                      }`}
                    >
                      {m.rol}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* FORMULARIO DE INVITACIÓN (SOLO DUEÑO O ADMIN) */}
          {esDuenoOAdmin && (
            <form onSubmit={handleInvitarMiembro} className="bg-stone-50 border border-stone-200 p-4 rounded-2xl space-y-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-stone-600 block">
                Agregar Colaborador a la Empresa
              </span>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  placeholder="correo@ingenieria.com"
                  value={emailNuevoMiembro}
                  onChange={(e) => setEmailNuevoMiembro(e.target.value)}
                  className="flex-1 px-3.5 py-2 border border-stone-300 rounded-xl bg-white text-xs outline-none focus:border-orange-500"
                />
                <select
                  value={rolNuevoMiembro}
                  onChange={(e) => setRolNuevoMiembro(e.target.value as any)}
                  className="px-3 py-2 border border-stone-300 rounded-xl bg-white text-xs font-semibold outline-none focus:border-orange-500"
                >
                  <option value="miembro">Miembro Técnico</option>
                  <option value="administrador">Administrador</option>
                </select>
                <button
                  type="submit"
                  disabled={invitandoMiembro}
                  className="bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap"
                >
                  {invitandoMiembro ? 'Agregando...' : '+ Añadir'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* 3. TARJETA: PROYECTO / OBRA ACTIVA */}
      {proyectoActivo ? (
        <div className="w-full max-w-2xl bg-white border border-stone-250 rounded-3xl p-6.5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-150 pb-4">
            <div>
              <h3 className="text-xs font-black text-orange-600 uppercase tracking-widest flex items-center gap-1.5">
                <i className="ti ti-crane font-medium"></i> Obra / Proyecto Activo
              </h3>
              <h4 className="text-base font-extrabold text-stone-850 mt-1">
                {proyectoActivo.nombre || proyectoActivo.nombre_proyecto}
              </h4>
              {proyectoActivo.cliente && (
                <p className="text-xs text-stone-500">Cliente: {proyectoActivo.cliente}</p>
              )}
            </div>
            {abrirSelectorProyecto && (
              <button
                type="button"
                onClick={abrirSelectorProyecto}
                className="text-xs font-bold text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 border border-stone-300 px-3.5 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <i className="ti ti-switch-horizontal"></i> Cambiar Proyecto
              </button>
            )}
          </div>

          {(proyectoActivo.codigo_acceso || proyectoActivo.codigo) && (
            <div className="bg-stone-900 text-white p-4.5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block">
                  Código de Identificación de Obra
                </span>
                <p className="text-xs text-stone-300 mt-0.5">
                  Código asignado a esta obra física para control y presupuestación.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <code className="bg-stone-950 border border-stone-750 text-orange-400 font-mono text-base font-black px-4 py-2 rounded-xl tracking-widest">
                  {proyectoActivo.codigo || proyectoActivo.codigo_acceso}
                </code>
                <button
                  type="button"
                  onClick={copiarCodigoAcceso}
                  className="bg-orange-600 hover:bg-orange-500 text-white p-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border-none flex items-center justify-center"
                  title="Copiar Código"
                >
                  <i className="ti ti-copy text-base"></i>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full max-w-2xl bg-white border border-stone-250 rounded-3xl p-6.5 shadow-sm flex items-center justify-between">
          <div>
            <h4 className="text-sm font-extrabold text-stone-800">Ningún Proyecto Seleccionado</h4>
            <p className="text-xs text-stone-400 mt-0.5">
              Selecciona una obra para comenzar a cargar rubros y presupuestos.
            </p>
          </div>
          {abrirSelectorProyecto && (
            <button
              type="button"
              onClick={abrirSelectorProyecto}
              className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              Seleccionar Proyecto
            </button>
          )}
        </div>
      )}

      {/* 4. TARJETA DE ESTADO DE CONEXION SUPABASE */}
      <div className="w-full max-w-2xl bg-white border border-stone-250 rounded-3xl p-6.5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-black text-stone-400 uppercase tracking-widest">
              Estado del Servidor Remoto
            </h3>
            <h4 className="text-sm font-extrabold text-stone-850 mt-1 uppercase">
              Conexión Externa de Base de Datos
            </h4>
          </div>
          {isLiveSupabase ? (
            <span className="bg-emerald-50 text-emerald-600 border border-emerald-250 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Conectado a Supabase
            </span>
          ) : (
            <span className="bg-amber-50 text-amber-600 border border-amber-250 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span> Simulador de Desarrollo Activo
            </span>
          )}
        </div>

        {isLiveSupabase && (
          <div className="bg-emerald-500/5 border border-emerald-150 p-4 rounded-2xl space-y-2">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wide block">URL del Proyecto Vinculado:</span>
            <div className="flex items-center gap-2">
              <i className="ti ti-link text-emerald-600 font-bold"></i>
              <code className="text-xs font-mono font-bold text-stone-700 bg-white border border-stone-200 px-3 py-1.5 rounded-lg select-all w-full truncate block">
                {urlConfigurada}
              </code>
            </div>
            <p className="text-[11px] text-stone-500 leading-relaxed mt-2 pl-0.5">
              El frontend se encuentra comunicado <strong>satisfactoriamente con su base de datos Supabase</strong> multi-tenant. Todos los cálculos matemáticos de APU y presupuestos son resueltos de forma inmutable por los triggers de Postgres.
            </p>
          </div>
        )}
      </div>

      {/* 5. PARÁMETROS DE GESTIÓN IA (GEMINI) */}
      <div className="w-full max-w-2xl bg-white border border-stone-200 rounded-3xl p-8 shadow-sm space-y-6">
        <div>
          <h3 className="text-sm font-extrabold text-stone-800 uppercase tracking-tight">
            Configuración y Asistente Generativo IA
          </h3>
          <p className="text-[11px] text-stone-400 mt-1 leading-relaxed">
            Personalice el comportamiento de las auditorías de APU en vivo, optimización de mezclas, y estandarización analítica de insumos.
          </p>
        </div>

        <div className="divide-y divide-stone-100">
          {/* Parámetro 0: Gemini API Key */}
          <div className="py-4 flex flex-col gap-2">
            <div>
              <span className="text-xs font-black text-stone-850 uppercase flex items-center gap-1.5">
                <i className="ti ti-key text-orange-600"></i> Gemini API Key (Google AI Studio)
              </span>
              <p className="text-[10px] text-stone-400 mt-0.5 leading-relaxed">
                Requerida para habilitar la generación automática de presupuestos con IA. Su clave se almacena únicamente en el navegador (local storage).
              </p>
            </div>
            <div className="mt-1 flex gap-2">
              <input
                type="password"
                placeholder="AIzaSy..."
                value={configIA.apiKey || ''}
                onChange={(e) => setConfigIA((prev: any) => ({ ...prev, apiKey: e.target.value }))}
                className="flex-1 px-3.5 py-2 border border-stone-300 rounded-xl bg-stone-50 text-xs font-mono font-semibold outline-none focus:bg-white focus:border-orange-500 transition-all"
              />
              {configIA.apiKey ? (
                <span className="bg-emerald-50 text-emerald-600 border border-emerald-250 text-[10px] font-black uppercase tracking-wider px-3 py-2 rounded-xl flex items-center gap-1">
                  <i className="ti ti-circle-check"></i> Configurada
                </span>
              ) : (
                <span className="bg-amber-50 text-amber-600 border border-amber-250 text-[10px] font-black uppercase tracking-wider px-3 py-2 rounded-xl flex items-center gap-1">
                  <i className="ti ti-alert-triangle"></i> Pendiente
                </span>
              )}
            </div>
          </div>

          {/* Parámetro 1: Modelo Generativo */}
          <div className="py-4 flex items-center justify-between gap-6">
            <div className="flex-1">
              <span className="text-xs font-black text-stone-800 uppercase">Modelo de Lenguaje Predeterminado</span>
              <p className="text-[10px] text-stone-400 mt-0.5 leading-relaxed">
                Seleccione el estándar de red neuronal que liderará las estimaciones de rendimiento.
              </p>
            </div>
            <select
              value={configIA.modelo}
              onChange={(e) => setConfigIA((prev: any) => ({ ...prev, modelo: e.target.value }))}
              className="px-3.5 py-2 border border-stone-300 rounded-xl bg-stone-50 text-xs font-semibold outline-none focus:bg-white focus:border-orange-500"
            >
              <option value="gemini-2.5-flash">Gemini 2.5 Flash (Ultrarrápido)</option>
              <option value="gemini-2.5-pro">Gemini 3.0 Pro (Máxima Precisión)</option>
            </select>
          </div>

          {/* Parámetro 2: Temperatura */}
          <div className="py-4 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs font-black text-stone-800 uppercase">Temperatura de Muestreo (Creatividad)</span>
                <p className="text-[10px] text-stone-400 mt-0.5 leading-relaxed">
                  Valores bajos producen estimaciones con estrictidad estadística e hitos previos del mercado.
                </p>
              </div>
              <span className="font-mono text-xs font-extrabold text-orange-600 bg-orange-50 border border-orange-100 px-2.5 py-0.5 rounded-full">
                {configIA.temperatura}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={configIA.temperatura}
              onChange={(e) => setConfigIA((prev: any) => ({ ...prev, temperatura: parseFloat(e.target.value) }))}
              className="w-full accent-orange-600"
            />
          </div>

          {/* Parámetro 3: Normalización */}
          <div className="py-4 flex items-center justify-between gap-6">
            <div className="flex-1">
              <span className="text-xs font-black text-stone-800 uppercase">Sanitización y Estandarización de Unidades</span>
              <p className="text-[10px] text-stone-400 mt-0.5 leading-relaxed">
                Homologa unidades en litros, bolsas, m³ o kilogramos automáticamente al comparar proveedores externos.
              </p>
            </div>
            <button
              onClick={() => setConfigIA((prev: any) => ({ ...prev, normalizarUnidades: !prev.normalizarUnidades }))}
              className={`w-12 h-6.5 rounded-full p-1 transition-colors relative cursor-pointer outline-none ${
                configIA.normalizarUnidades ? 'bg-orange-600' : 'bg-stone-250'
              }`}
            >
              <div
                className={`w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${
                  configIA.normalizarUnidades ? 'translate-x-5.5' : 'translate-x-0'
                }`}
              ></div>
            </button>
          </div>

          {/* Parámetro 4: Filtros anti-duplicados */}
          <div className="py-4 flex items-center justify-between gap-6">
            <div className="flex-1">
              <span className="text-xs font-black text-stone-800 uppercase">Filtro Anticolisiones Transaccionales</span>
              <p className="text-[10px] text-stone-400 mt-0.5 leading-relaxed">
                Previene entradas duplicadas empleando llaves de integridad compuesta al sincronizar con el cluster remoto.
              </p>
            </div>
            <button
              onClick={() => setConfigIA((prev: any) => ({ ...prev, filtroAntiDuplicados: !prev.filtroAntiDuplicados }))}
              className={`w-12 h-6.5 rounded-full p-1 transition-colors relative cursor-pointer outline-none ${
                configIA.filtroAntiDuplicados ? 'bg-orange-600' : 'bg-stone-250'
              }`}
            >
              <div
                className={`w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${
                  configIA.filtroAntiDuplicados ? 'translate-x-5.5' : 'translate-x-0'
                }`}
              ></div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
