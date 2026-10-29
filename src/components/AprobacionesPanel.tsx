import React, { useState, useEffect } from 'react';
import { isLiveSupabase, getSupabaseClient } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { Proyecto } from '../types';

interface AprobacionesPanelProps {
  proyectoActivo?: Proyecto | null;
  supabase?: any;
  mostrarToast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

interface BorradorItem {
  id: string;
  catalogo_id: string;
  insumo_id: string | null;
  categoria: string;
  nombre: string;
  unidad: string;
  nuevo_precio: number;
  proveedor: string | null;
  justificacion: string | null;
  estado: string;
  created_at: string;
}

interface AuditoriaItem {
  id: number;
  tabla_nombre: string;
  registro_id: string;
  operacion: string;
  actor_email: string | null;
  fecha_hora: string;
  campos_modificados: string[] | null;
}

export default function AprobacionesPanel({
  proyectoActivo,
  mostrarToast,
}: AprobacionesPanelProps) {
  const { organizacionActiva, esDuenoOAdmin, puedeAprobarEnProyecto } = useAuth();

  const [tab, setTab] = useState<'borradores' | 'auditoria'>('borradores');
  const [borradores, setBorradores] = useState<BorradorItem[]>([]);
  const [auditorias, setAuditorias] = useState<AuditoriaItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  useEffect(() => {
    cargarDatos();
  }, [organizacionActiva?.id, tab]);

  const cargarDatos = async () => {
    if (!isLiveSupabase) return;
    setCargando(true);
    try {
      const client = getSupabaseClient();

      if (tab === 'borradores') {
        const { data, error } = await client
          .from('borradores_insumo')
          .select('*')
          .eq('estado', 'pendiente')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setBorradores(data || []);
      } else {
        let query = client
          .from('bitacora_auditoria')
          .select('id, tabla_nombre, registro_id, operacion, actor_email, fecha_hora, campos_modificados')
          .order('fecha_hora', { ascending: false })
          .limit(50);

        if (organizacionActiva?.id) {
          query = query.eq('organizacion_id', organizacionActiva.id);
        }

        const { data, error } = await query;
        if (error) throw error;
        setAuditorias(data || []);
      }
    } catch (err: unknown) {
      console.error('Error cargando aprobaciones/auditoría:', err);
    } finally {
      setCargando(false);
    }
  };

  const handleAprobarBorrador = async (borradorId: string) => {
    setProcesandoId(borradorId);
    try {
      if (isLiveSupabase) {
        const client = getSupabaseClient();
        // Llamar a la función RPC de Supabase 'aprobar_borrador_insumo'
        const { error } = await client.rpc('aprobar_borrador_insumo', {
          p_borrador_id: borradorId,
        });

        if (error) throw error;

        mostrarToast('¡Insumo aprobado y fusionado al catálogo maestro!', 'success');
        await cargarDatos();
      }
    } catch (err: unknown) {
      console.error('Error aprobando borrador:', err);
      const msg = err instanceof Error ? err.message : 'Error al aprobar';
      mostrarToast(`No se pudo aprobar: ${msg}`, 'error');
    } finally {
      setProcesandoId(null);
    }
  };

  const handleRechazarBorrador = async (borradorId: string) => {
    setProcesandoId(borradorId);
    try {
      if (isLiveSupabase) {
        const client = getSupabaseClient();
        const { error } = await client
          .from('borradores_insumo')
          .update({
            estado: 'rechazado',
            fecha_revision: new Date().toISOString(),
          })
          .eq('id', borradorId);

        if (error) throw error;

        mostrarToast('Borrador rechazado.', 'info');
        await cargarDatos();
      }
    } catch (err: unknown) {
      console.error('Error rechazando borrador:', err);
      const msg = err instanceof Error ? err.message : 'Error al rechazar';
      mostrarToast(`No se pudo rechazar: ${msg}`, 'error');
    } finally {
      setProcesandoId(null);
    }
  };

  if (!esDuenoOAdmin && !puedeAprobarEnProyecto) {
    return (
      <div className="flex-1 bg-stone-50 p-8 flex items-center justify-center">
        <div className="max-w-md bg-white border border-stone-200 rounded-2xl p-6 text-center">
          <i className="ti ti-lock text-3xl text-stone-400 mb-2 block"></i>
          <h3 className="text-sm font-bold text-stone-800 mb-1">Acceso Restringido</h3>
          <p className="text-xs text-stone-500">
            Solo directores de obra y administradores de la constructora pueden acceder al panel de aprobaciones y auditoría.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-stone-50 p-6 flex flex-col items-center gap-6 font-sans">
      <div className="w-full max-w-4xl bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-6">
        
        {/* Header con tabs */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-stone-150 pb-5">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 block">
              Control de Calidad y Gobernanza
            </span>
            <h2 className="text-lg font-extrabold text-stone-850 mt-0.5">
              Aprobaciones y Auditoría de Obra
            </h2>
            <p className="text-xs text-stone-400">
              Constructora: <strong className="text-stone-700">{organizacionActiva?.nombre || 'General'}</strong>
            </p>
          </div>

          <div className="flex bg-stone-100 p-1 rounded-2xl text-xs font-bold">
            <button
              onClick={() => setTab('borradores')}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                tab === 'borradores' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              <i className="ti ti-checkup-list mr-1.5"></i>
              Borradores Pendientes ({borradores.length})
            </button>
            <button
              onClick={() => setTab('auditoria')}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                tab === 'auditoria' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              <i className="ti ti-history mr-1.5"></i>
              Bitácora de Auditoría
            </button>
          </div>
        </div>

        {/* Tab 1: Borradores de Insumos */}
        {tab === 'borradores' && (
          <div>
            {cargando ? (
              <div className="py-12 text-center text-xs text-stone-400">Cargando borradores...</div>
            ) : borradores.length === 0 ? (
              <div className="py-12 text-center bg-stone-50 border border-stone-200 rounded-2xl p-6">
                <i className="ti ti-circle-check text-3xl text-emerald-500 mb-2 block"></i>
                <h4 className="text-xs font-bold text-stone-800 mb-1">No hay solicitudes pendientes</h4>
                <p className="text-[11px] text-stone-400">
                  Todas las propuestas de precios enviadas por los residentes han sido procesadas.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {borradores.map((b) => (
                  <div
                    key={b.id}
                    className="p-4 rounded-2xl border border-stone-200 bg-stone-50 hover:bg-white transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-stone-800">{b.nombre}</span>
                        <span className="text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                          {b.categoria}
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-500 mt-1 flex items-center gap-3">
                        <span>Unidad: <strong>{b.unidad}</strong></span>
                        <span>Precio Propuesto: <strong className="text-emerald-700 font-mono">${Number(b.nuevo_precio).toFixed(2)}</strong></span>
                        {b.proveedor && <span>Proveedor: {b.proveedor}</span>}
                      </div>
                      {b.justificacion && (
                        <p className="text-[10.5px] text-stone-400 italic mt-1 bg-white border border-stone-150 p-2 rounded-lg">
                          "{b.justificacion}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleRechazarBorrador(b.id)}
                        disabled={procesandoId === b.id}
                        className="px-3 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                      >
                        Rechazar
                      </button>
                      <button
                        onClick={() => handleAprobarBorrador(b.id)}
                        disabled={procesandoId === b.id}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <i className="ti ti-check"></i>
                        {procesandoId === b.id ? 'Aprobando...' : 'Aprobar Precio'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Bitácora de Auditoría */}
        {tab === 'auditoria' && (
          <div>
            {cargando ? (
              <div className="py-12 text-center text-xs text-stone-400">Cargando bitácora de auditoría...</div>
            ) : auditorias.length === 0 ? (
              <div className="py-12 text-center bg-stone-50 border border-stone-200 rounded-2xl p-6">
                <i className="ti ti-file-text text-3xl text-stone-400 mb-2 block"></i>
                <h4 className="text-xs font-bold text-stone-800 mb-1">Sin registros de auditoría</h4>
                <p className="text-[11px] text-stone-400">
                  Las operaciones de inserción, actualización y borrado se registrarán automáticamente aquí.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-stone-100 border border-stone-200 rounded-2xl overflow-hidden bg-white">
                {auditorias.map((a) => (
                  <div key={a.id} className="p-3.5 flex items-center justify-between hover:bg-stone-50/70 transition-colors text-xs">
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          a.operacion === 'INSERT'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : a.operacion === 'UPDATE'
                            ? 'bg-amber-50 text-amber-700 border-amber-300'
                            : 'bg-rose-50 text-rose-700 border-rose-300'
                        }`}
                      >
                        {a.operacion}
                      </span>
                      <div>
                        <div className="font-bold text-stone-800">
                          Tabla <code className="font-mono bg-stone-100 px-1 py-0.5 rounded text-[11px]">{a.tabla_nombre}</code>
                        </div>
                        <div className="text-[10.5px] text-stone-400 font-mono">
                          {a.actor_email || 'Sistema'} · {new Date(a.fecha_hora).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {a.campos_modificados && a.campos_modificados.length > 0 && (
                      <div className="text-[10.5px] text-stone-500 font-mono hidden md:block">
                        Campos: {a.campos_modificados.slice(0, 3).join(', ')}
                        {a.campos_modificados.length > 3 && '...'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
