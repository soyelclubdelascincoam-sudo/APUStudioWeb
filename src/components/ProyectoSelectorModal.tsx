import React, { useState, useEffect } from 'react';
import { isLiveSupabase, getSupabaseClient } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { Proyecto, RolProyecto, EstadoProyecto } from '../types';

interface ProyectoSelectorModalProps {
  usuarioId: string;
  usuarioEmail: string;
  organizacionId?: string | null;
  proyectoActivo: Proyecto | null;
  onSeleccionarProyecto: (proyecto: Proyecto) => void;
  mostrarToast: (mensaje: string, tipo?: 'info' | 'success' | 'warning' | 'error') => void;
  onCerrarSesion: () => void;
  onCerrarModal?: () => void;
}

export default function ProyectoSelectorModal({
  usuarioId,
  usuarioEmail,
  organizacionId,
  proyectoActivo,
  onSeleccionarProyecto,
  mostrarToast,
  onCerrarSesion,
  onCerrarModal,
}: ProyectoSelectorModalProps) {
  const { organizacionActiva, esDuenoOAdmin } = useAuth();
  const orgIdToUse = organizacionId || organizacionActiva?.id;

  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modoModal, setModoModal] = useState<'lista' | 'crear' | 'unirse'>('lista');

  // Form states for creating a new project
  const [nombreNuevoProyecto, setNombreNuevoProyecto] = useState('');
  const [codigoProyecto, setCodigoProyecto] = useState('');
  const [cliente, setCliente] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [presupuestoRef, setPresupuestoRef] = useState<number | ''>('');
  const [procesandoCreacion, setProcesandoCreacion] = useState(false);

  // Form states for joining via code
  const [codigoAcceso, setCodigoAcceso] = useState('');
  const [procesandoUnion, setProcesandoUnion] = useState(false);

  useEffect(() => {
    if (orgIdToUse) {
      cargarProyectos();
    } else {
      setCargando(false);
    }
  }, [orgIdToUse, usuarioId]);

  const cargarProyectos = async () => {
    setCargando(true);
    try {
      if (isLiveSupabase && orgIdToUse) {
        const client = getSupabaseClient();

        // 1. Consultar proyectos pertenecientes a la organización activa
        const { data: projs, error: errProjs } = await client
          .from('proyectos')
          .select('*')
          .eq('organizacion_id', orgIdToUse)
          .order('created_at', { ascending: false });

        if (errProjs) throw errProjs;

        // 2. Consultar membresías específicas del usuario en los proyectos
        const { data: membresias, error: errMemb } = await client
          .from('miembros_proyecto')
          .select('proyecto_id, rol, activo')
          .eq('user_id', usuarioId);

        if (errMemb) throw errMemb;

        const rolesMap: Record<string, RolProyecto> = {};
        (membresias || []).forEach((m) => {
          if (m.activo) {
            rolesMap[m.proyecto_id] = m.rol as RolProyecto;
          }
        });

        // 3. Mapear proyectos con el rol efectivo
        const projsConRol: Proyecto[] = (projs || []).map((p) => {
          // Si el usuario es dueño o admin de la org, tiene rango directivo por herencia
          const miRolEfectivo: RolProyecto =
            rolesMap[p.id] || (esDuenoOAdmin ? 'director' : 'residente');

          return {
            id: p.id,
            nombre: p.nombre,
            nombre_proyecto: p.nombre, // Compatibilidad
            codigo: p.codigo,
            codigo_acceso: p.codigo || p.id.slice(0, 8).toUpperCase(), // Compatibilidad
            descripcion: p.descripcion,
            cliente: p.cliente,
            ubicacion: p.ubicacion,
            fecha_inicio: p.fecha_inicio,
            fecha_fin_estimada: p.fecha_fin_estimada,
            estado: p.estado as EstadoProyecto,
            presupuesto_referencial: Number(p.presupuesto_referencial || 0),
            organizacion_id: p.organizacion_id,
            created_by: p.created_by,
            creador_id: p.created_by || undefined,
            created_at: p.created_at,
            updated_at: p.updated_at,
            miRol: miRolEfectivo,
          };
        });

        setProyectos(projsConRol);
      } else {
        // Fallback local simulation
        const rawProjs = localStorage.getItem('PROYECTOS') || '[]';
        const allProjs: any[] = JSON.parse(rawProjs);
        const misProyectos = allProjs.map((p: any) => ({
          ...p,
          nombre: p.nombre || p.nombre_proyecto,
          nombre_proyecto: p.nombre_proyecto || p.nombre,
          miRol: p.miRol || 'director',
        }));
        setProyectos(misProyectos);
      }
    } catch (err: unknown) {
      console.error('Error al cargar proyectos:', err);
      const msg = err instanceof Error ? err.message : 'Error al cargar proyectos';
      mostrarToast('Error al cargar proyectos: ' + msg, 'error');
    } finally {
      setCargando(false);
    }
  };

  const handleCrearProyecto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreNuevoProyecto.trim()) {
      mostrarToast('Por favor, ingresa el nombre de la obra.', 'warning');
      return;
    }
    if (!orgIdToUse) {
      mostrarToast('Debes tener una constructora activa para crear proyectos.', 'error');
      return;
    }

    setProcesandoCreacion(true);
    try {
      const codigoFinal =
        codigoProyecto.trim().toUpperCase() ||
        `OBRA-${Date.now().toString().slice(-4)}`;

      if (isLiveSupabase) {
        const client = getSupabaseClient();
        // Insertar en tabla proyectos
        const { data: newProj, error: errProj } = await client
          .from('proyectos')
          .insert({
            organizacion_id: orgIdToUse,
            nombre: nombreNuevoProyecto.trim(),
            codigo: codigoFinal,
            cliente: cliente.trim() || null,
            ubicacion: ubicacion.trim() || null,
            presupuesto_referencial: Number(presupuestoRef) || 0,
            estado: 'borrador',
            created_by: usuarioId,
          })
          .select()
          .single();

        if (errProj) throw errProj;

        // El trigger trg_proyectos_auto_assign_creator asigna automáticamente al creador como 'director'
        const projCreado: Proyecto = {
          id: newProj.id,
          nombre: newProj.nombre,
          nombre_proyecto: newProj.nombre,
          codigo: newProj.codigo,
          codigo_acceso: newProj.codigo || newProj.id.slice(0, 8).toUpperCase(),
          descripcion: newProj.descripcion,
          cliente: newProj.cliente,
          ubicacion: newProj.ubicacion,
          estado: newProj.estado as EstadoProyecto,
          presupuesto_referencial: Number(newProj.presupuesto_referencial || 0),
          organizacion_id: newProj.organizacion_id,
          created_by: newProj.created_by,
          created_at: newProj.created_at,
          updated_at: newProj.updated_at,
          miRol: 'director',
        };

        mostrarToast(`¡Obra "${newProj.nombre}" registrada con éxito!`, 'success');
        onSeleccionarProyecto(projCreado);
      } else {
        const newProj: Proyecto = {
          id: 'proj-' + Date.now(),
          nombre: nombreNuevoProyecto.trim(),
          nombre_proyecto: nombreNuevoProyecto.trim(),
          codigo: codigoFinal,
          codigo_acceso: codigoFinal,
          cliente: cliente.trim() || 'Cliente General',
          ubicacion: ubicacion.trim() || 'Ubicación Obra',
          estado: 'borrador',
          miRol: 'director',
          created_at: new Date().toISOString(),
        };

        const rawProjs = localStorage.getItem('PROYECTOS') || '[]';
        const allProjs = JSON.parse(rawProjs);
        allProjs.push(newProj);
        localStorage.setItem('PROYECTOS', JSON.stringify(allProjs));

        mostrarToast(`¡Obra "${newProj.nombre}" creada localmente!`, 'success');
        onSeleccionarProyecto(newProj);
      }
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'No se pudo crear el proyecto';
      mostrarToast('No se pudo crear el proyecto: ' + msg, 'error');
    } finally {
      setProcesandoCreacion(false);
    }
  };

  const handleUnirsePorCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoAcceso.trim()) {
      mostrarToast('Ingresa un código de obra válido.', 'warning');
      return;
    }
    if (!orgIdToUse) {
      mostrarToast('Debes pertenecer a una constructora para unirte a proyectos.', 'warning');
      return;
    }

    setProcesandoUnion(true);
    try {
      const codeClean = codigoAcceso.trim().toUpperCase();

      if (isLiveSupabase) {
        const client = getSupabaseClient();
        // 1. Buscar si hay una obra con ese código dentro de la organización
        const { data: proj, error: errProj } = await client
          .from('proyectos')
          .select('*')
          .eq('organizacion_id', orgIdToUse)
          .eq('codigo', codeClean)
          .maybeSingle();

        if (errProj) throw errProj;

        if (!proj) {
          throw new Error('No se encontró ninguna obra con el código especificado en esta constructora.');
        }

        // 2. Asignar como residente o miembro en miembros_proyecto
        const { error: errMembresia } = await client
          .from('miembros_proyecto')
          .insert({
            proyecto_id: proj.id,
            user_id: usuarioId,
            rol: 'residente',
            activo: true,
          });

        if (errMembresia && !errMembresia.message.includes('unique')) {
          throw errMembresia;
        }

        const projUnido: Proyecto = {
          id: proj.id,
          nombre: proj.nombre,
          nombre_proyecto: proj.nombre,
          codigo: proj.codigo,
          codigo_acceso: proj.codigo || proj.id.slice(0, 8).toUpperCase(),
          cliente: proj.cliente,
          ubicacion: proj.ubicacion,
          estado: proj.estado as EstadoProyecto,
          presupuesto_referencial: Number(proj.presupuesto_referencial || 0),
          organizacion_id: proj.organizacion_id,
          created_by: proj.created_by,
          created_at: proj.created_at,
          updated_at: proj.updated_at,
          miRol: 'residente',
        };

        mostrarToast(`¡Te has vinculado a la obra "${proj.nombre}"!`, 'success');
        onSeleccionarProyecto(projUnido);
      } else {
        mostrarToast('Vinculación por código simulada.', 'info');
      }
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'No se pudo vincular al proyecto';
      mostrarToast(msg, 'error');
    } finally {
      setProcesandoUnion(false);
    }
  };

  const getBadgeEstado = (estado?: string) => {
    switch (estado) {
      case 'en_ejecucion':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'licitacion':
      case 'en_estudio':
        return 'bg-sky-500/20 text-sky-400 border-sky-500/30';
      case 'finalizado':
        return 'bg-stone-500/20 text-stone-300 border-stone-500/30';
      case 'archivado':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      case 'borrador':
      default:
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    }
  };

  const getBadgeRol = (rol?: RolProyecto) => {
    switch (rol) {
      case 'director':
      case 'owner':
      case 'admin':
        return { label: 'DIRECTOR', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
      case 'residente':
      case 'editor':
        return { label: 'RESIDENTE', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
      case 'editor_borradores':
        return { label: 'PRESUPUESTISTA', cls: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' };
      case 'fiscalizador_lectura':
      case 'viewer':
      default:
        return { label: 'FISCALIZADOR', cls: 'bg-stone-500/20 text-stone-300 border-stone-500/30' };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 backdrop-blur-md p-4 font-sans">
      <div className="w-full max-w-xl bg-stone-900 border border-stone-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden text-stone-200">
        
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-4 mb-6">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-500">
              {organizacionActiva?.nombre || 'Constructora'} · Obras
            </span>
            <h2 className="text-xl font-display font-extrabold text-white">
              Seleccionar Proyecto / Obra
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Sesión: <strong className="text-stone-200">{usuarioEmail}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {proyectoActivo && onCerrarModal && (
              <button
                type="button"
                onClick={onCerrarModal}
                className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                title="Cerrar ventana"
              >
                <i className="ti ti-x"></i>
              </button>
            )}
            <button
              onClick={onCerrarSesion}
              title="Cerrar Sesión"
              className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold rounded-xl border border-stone-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <i className="ti ti-logout text-sm text-red-400"></i>
              <span>Salir</span>
            </button>
          </div>
        </div>

        {/* View mode Selector Tabs */}
        <div className="flex bg-stone-950 p-1.5 rounded-2xl mb-6 text-xs font-bold uppercase tracking-wider">
          <button
            onClick={() => setModoModal('lista')}
            className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
              modoModal === 'lista' ? 'bg-stone-800 text-white shadow-sm' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <i className="ti ti-folders mr-1"></i> Obras de la Empresa
          </button>
          <button
            onClick={() => setModoModal('crear')}
            className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
              modoModal === 'crear' ? 'bg-stone-800 text-white shadow-sm' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <i className="ti ti-plus mr-1"></i> Registrar Nueva Obra
          </button>
          <button
            onClick={() => setModoModal('unirse')}
            className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
              modoModal === 'unirse' ? 'bg-stone-800 text-white shadow-sm' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <i className="ti ti-key mr-1"></i> Vincular por Código
          </button>
        </div>

        {/* Content Mode 1: Lista de Proyectos */}
        {modoModal === 'lista' && (
          <div>
            {cargando ? (
              <div className="py-12 text-center text-stone-400 flex flex-col items-center gap-2">
                <i className="ti ti-loader-2 text-2xl spin text-orange-500"></i>
                <span className="text-xs">Cargando obras de la constructora...</span>
              </div>
            ) : proyectos.length === 0 ? (
              <div className="py-10 text-center bg-stone-950/60 rounded-2xl border border-stone-800 p-6">
                <i className="ti ti-folder-off text-4xl text-stone-600 mb-2 block"></i>
                <h3 className="text-sm font-bold text-white mb-1">
                  Aún no hay obras registradas en {organizacionActiva?.nombre || 'esta constructora'}
                </h3>
                <p className="text-xs text-stone-400 mb-4">
                  Registra tu primera obra física para comenzar a estructurar APUs y presupuestos.
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => setModoModal('crear')}
                    className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
                  >
                    Registrar Nueva Obra
                  </button>
                  <button
                    onClick={() => setModoModal('unirse')}
                    className="bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs px-4 py-2.5 rounded-xl border border-stone-700 transition-colors cursor-pointer"
                  >
                    Vincular por Código
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                {proyectos.map((p) => {
                  const esActivo = proyectoActivo?.id === p.id;
                  const rolBadge = getBadgeRol(p.miRol);
                  return (
                    <div
                      key={p.id}
                      onClick={() => onSeleccionarProyecto(p)}
                      className={`group p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        esActivo
                          ? 'bg-orange-950/30 border-orange-500/50 shadow-lg shadow-orange-500/5'
                          : 'bg-stone-950/50 border-stone-800 hover:border-stone-700 hover:bg-stone-950'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                            esActivo ? 'bg-orange-500 text-white' : 'bg-stone-800 text-stone-300'
                          }`}
                        >
                          <i className="ti ti-crane font-medium"></i>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm text-white group-hover:text-orange-400 transition-colors">
                              {p.nombre || p.nombre_proyecto}
                            </h3>
                            <span className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider border ${rolBadge.cls}`}>
                              {rolBadge.label}
                            </span>
                            {p.estado && (
                              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md border ${getBadgeEstado(p.estado)}`}>
                                {p.estado.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-stone-400 mt-1 flex items-center gap-2">
                            {p.codigo && (
                              <span>Cód: <code className="bg-stone-800 px-1.5 py-0.5 rounded text-orange-300 text-[10px] font-mono">{p.codigo}</code></span>
                            )}
                            {p.cliente && <span>· Cliente: {p.cliente}</span>}
                            {p.ubicacion && <span>· {p.ubicacion}</span>}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          Ingresar <i className="ti ti-chevron-right"></i>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Content Mode 2: Registrar Nueva Obra */}
        {modoModal === 'crear' && (
          <form onSubmit={handleCrearProyecto} className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-1.5">
                Nombre de la Obra o Proyecto *
              </label>
              <input
                type="text"
                required
                placeholder="ej. Torre Bellavista - Bloque B"
                value={nombreNuevoProyecto}
                onChange={(e) => setNombreNuevoProyecto(e.target.value)}
                className="w-full px-4 py-2.5 border border-stone-800 rounded-2xl bg-stone-950 text-white text-xs outline-none focus:border-orange-500 transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-1.5">
                  Código de Identificación
                </label>
                <input
                  type="text"
                  placeholder="ej. OBRA-2026-01"
                  value={codigoProyecto}
                  onChange={(e) => setCodigoProyecto(e.target.value)}
                  className="w-full px-4 py-2.5 border border-stone-800 rounded-2xl bg-stone-950 text-white text-xs outline-none focus:border-orange-500 uppercase font-mono transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-1.5">
                  Cliente o Contratante
                </label>
                <input
                  type="text"
                  placeholder="ej. Consorcio Metropolitano"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  className="w-full px-4 py-2.5 border border-stone-800 rounded-2xl bg-stone-950 text-white text-xs outline-none focus:border-orange-500 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-1.5">
                  Ubicación
                </label>
                <input
                  type="text"
                  placeholder="ej. Av. 6 de Diciembre y Orellana"
                  value={ubicacion}
                  onChange={(e) => setUbicacion(e.target.value)}
                  className="w-full px-4 py-2.5 border border-stone-800 rounded-2xl bg-stone-950 text-white text-xs outline-none focus:border-orange-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-1.5">
                  Presupuesto Referencial (USD)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={presupuestoRef}
                  onChange={(e) => setPresupuestoRef(e.target.value ? parseFloat(e.target.value) : '')}
                  className="w-full px-4 py-2.5 border border-stone-800 rounded-2xl bg-stone-950 text-white text-xs outline-none focus:border-orange-500 font-mono transition-colors"
                />
              </div>
            </div>

            <p className="text-[11px] text-stone-400 bg-stone-950/60 border border-stone-800 p-3 rounded-2xl">
              💡 Al registrar esta obra, la base de datos te asignará automáticamente como **Director de Obra (`director`)** mediante el trigger de permisos de Supabase.
            </p>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setModoModal('lista')}
                className="px-4 py-2 bg-stone-800 text-stone-300 text-xs font-bold rounded-xl hover:bg-stone-700 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={procesandoCreacion}
                className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {procesandoCreacion ? (
                  <>
                    <i className="ti ti-loader-2 spin"></i> Guardando...
                  </>
                ) : (
                  <>
                    <i className="ti ti-plus"></i> Guardar Obra
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Content Mode 3: Vincular por Código */}
        {modoModal === 'unirse' && (
          <form onSubmit={handleUnirsePorCodigo} className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-1.5">
                Código de Obra
              </label>
              <input
                type="text"
                required
                placeholder="ej. OBRA-2026-01"
                value={codigoAcceso}
                onChange={(e) => setCodigoAcceso(e.target.value)}
                className="w-full px-4 py-3 border border-stone-800 rounded-2xl bg-stone-950 text-white text-xs outline-none focus:border-orange-500 uppercase tracking-wider font-mono transition-colors"
              />
            </div>
            <p className="text-[11px] text-stone-400 bg-stone-950/60 border border-stone-800 p-3 rounded-2xl">
              🔑 Ingresa el código identificador de la obra física registrado por el Director en tu constructora.
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setModoModal('lista')}
                className="px-4 py-2.5 bg-stone-800 text-stone-300 text-xs font-bold rounded-xl hover:bg-stone-700 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={procesandoUnion}
                className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {procesandoUnion ? (
                  <>
                    <i className="ti ti-loader-2 spin"></i> Verificando...
                  </>
                ) : (
                  <>
                    <i className="ti ti-link"></i> Vincular a la Obra
                  </>
                )}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
