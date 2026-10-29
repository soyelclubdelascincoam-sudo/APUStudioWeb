import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getSupabaseClient, isLiveSupabase } from '../supabase';
import type { Organizacion } from '../types';

interface OrganizacionSelectorModalProps {
  abierto: boolean;
  onCerrar: () => void;
  mostrarToast: (mensaje: string, tipo?: 'info' | 'success' | 'warning' | 'error') => void;
}

export default function OrganizacionSelectorModal({
  abierto,
  onCerrar,
  mostrarToast,
}: OrganizacionSelectorModalProps) {
  const {
    user,
    organizaciones,
    organizacionActiva,
    cambiarOrganizacionActiva,
    refrescarSesionYDatos,
    cerrarSesion,
  } = useAuth();

  const [modoCrear, setModoCrear] = useState(false);
  const [nombreNuevaOrg, setNombreNuevaOrg] = useState('');
  const [rucNuevaOrg, setRucNuevaOrg] = useState('');
  const [procesando, setProcesando] = useState(false);

  if (!abierto) return null;

  // Manejar creación de una nueva constructora / organización
  const handleCrearOrganizacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreNuevaOrg.trim()) {
      mostrarToast('Por favor, ingresa el nombre de la constructora o empresa.', 'warning');
      return;
    }

    setProcesando(true);
    try {
      if (isLiveSupabase) {
        const client = getSupabaseClient();
        // Inserción directa en organizaciones: el trigger de BD 'trg_organizaciones_auto_owner'
        // auto-asigna al usuario autenticado como 'dueño', crea su catálogo y actualiza su perfil.
        const { data: newOrg, error: insertErr } = await client
          .from('organizaciones')
          .insert({
            nombre: nombreNuevaOrg.trim(),
            slug: `org-${Date.now()}`,
            ruc_identificacion: rucNuevaOrg.trim() || null,
            created_by: user?.id,
          })
          .select('id')
          .single();

        if (insertErr) throw insertErr;
        mostrarToast(`¡Constructora "${nombreNuevaOrg.trim()}" fundada con éxito!`, 'success');
        await refrescarSesionYDatos();
        if (newOrg?.id) {
          await cambiarOrganizacionActiva(newOrg.id);
        }
      } else {
        mostrarToast(`Constructora demo "${nombreNuevaOrg.trim()}" creada.`, 'success');
      }

      setNombreNuevaOrg('');
      setRucNuevaOrg('');
      setModoCrear(false);
      onCerrar();
    } catch (err: any) {
      console.error('Error al fundar constructora:', err);
      mostrarToast(`No se pudo crear la organización: ${err.message || err}`, 'error');
    } finally {
      setProcesando(false);
    }
  };

  const handleSeleccionarOrg = async (org: Organizacion) => {
    try {
      await cambiarOrganizacionActiva(org.id);
      mostrarToast(`Has cambiado a la organización "${org.nombre}".`, 'info');
      onCerrar();
    } catch (err: any) {
      console.error('Error al cambiar organización:', err);
      mostrarToast('No se pudo cambiar de organización.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4 font-sans animate-fade-in">
      <div className="w-full max-w-lg bg-stone-900 border border-stone-800 rounded-3xl p-6 md:p-8 shadow-2xl relative z-10 flex flex-col max-h-[90vh]">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/15 text-orange-400 border border-orange-500/25 flex items-center justify-center text-lg">
              <i className="ti ti-building-skyscraper"></i>
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white tracking-tight">
                {modoCrear ? 'Fundar Nueva Constructora' : 'Seleccionar Organización'}
              </h2>
              <p className="text-xs text-stone-400">
                {modoCrear
                  ? 'Crea un nuevo espacio empresarial multi-tenant con catálogo propio'
                  : 'Elige con qué empresa deseas trabajar en esta sesión'}
              </p>
            </div>
          </div>

          {/* Botón cerrar si ya tiene activa */}
          {organizacionActiva && (
            <button
              onClick={onCerrar}
              className="w-8 h-8 rounded-full bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <i className="ti ti-x"></i>
            </button>
          )}
        </div>

        {/* Contenido Dinámico */}
        {modoCrear ? (
          /* Formulario de Creación */
          <form onSubmit={handleCrearOrganizacion} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10.5px] font-bold text-stone-300 uppercase tracking-wider">
                Nombre de la Constructora / Empresa *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Constructora Andina S.A.S."
                value={nombreNuevaOrg}
                onChange={(e) => setNombreNuevaOrg(e.target.value)}
                className="w-full px-4 py-3 border border-stone-800 rounded-2xl bg-stone-950 text-white text-xs outline-none focus:border-orange-500 transition-colors font-sans"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10.5px] font-bold text-stone-300 uppercase tracking-wider">
                RUC / Identificación Fiscal (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ej. 1790123456001"
                value={rucNuevaOrg}
                onChange={(e) => setRucNuevaOrg(e.target.value)}
                className="w-full px-4 py-3 border border-stone-800 rounded-2xl bg-stone-950 text-white text-xs outline-none focus:border-orange-500 transition-colors font-sans"
              />
            </div>

            <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-2xl text-[11px] text-orange-300">
              <i className="ti ti-shield-check mr-1.5 text-orange-400"></i>
              Se creará automáticamente tu propio catálogo de costos privado y se te asignará el rol de <strong>Dueño</strong>.
            </div>

            <div className="flex items-center gap-3 pt-3">
              {organizaciones.length > 0 && (
                <button
                  type="button"
                  onClick={() => setModoCrear(false)}
                  className="flex-1 py-3 px-4 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={procesando}
                className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-orange-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {procesando ? 'Creando Empresa...' : 'Fundar Empresa'}
              </button>
            </div>
          </form>
        ) : (
          /* Lista de Organizaciones o Estado Vacío */
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {organizaciones.length === 0 ? (
              /* Estado Vacío Instructivo */
              <div className="text-center py-8 px-4 bg-stone-950/60 border border-stone-800/80 rounded-2xl">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center text-2xl mx-auto mb-3">
                  <i className="ti ti-building-off"></i>
                </div>
                <h3 className="text-sm font-extrabold text-white mb-1">
                  Aún no perteneces a ninguna Constructora
                </h3>
                <p className="text-xs text-stone-400 max-w-sm mx-auto leading-relaxed mb-6">
                  Para comenzar a crear proyectos, presupuestos y gestionar rubros de APU, funda tu primera constructora o solicita que te inviten mediante correo electrónico.
                </p>
                <button
                  onClick={() => setModoCrear(true)}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-orange-500/20 transition-all cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  <i className="ti ti-plus"></i>
                  <span>Fundar mi primera constructora</span>
                </button>
              </div>
            ) : (
              /* Lista de Organizaciones Disponibles */
              <>
                <div className="space-y-2">
                  {organizaciones.map((org) => {
                    const esActiva = organizacionActiva?.id === org.id;
                    return (
                      <div
                        key={org.id}
                        onClick={() => handleSeleccionarOrg(org)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                          esActiva
                            ? 'bg-orange-500/10 border-orange-500/40 shadow-sm'
                            : 'bg-stone-950/80 border-stone-800 hover:border-stone-700 hover:bg-stone-950'
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center text-base font-black ${
                              esActiva
                                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                                : 'bg-stone-800 text-stone-400 group-hover:text-stone-200'
                            }`}
                          >
                            {org.nombre.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-white group-hover:text-orange-400 transition-colors">
                                {org.nombre}
                              </h4>
                              {esActiva && (
                                <span className="bg-orange-500/20 text-orange-400 text-[9.5px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                                  Activa
                                </span>
                              )}
                            </div>
                            <p className="text-[10.5px] text-stone-400 mt-0.5">
                              Plan: <span className="text-stone-300 font-medium capitalize">{org.plan}</span>
                              {org.ruc_identificacion && (
                                <> · RUC: <span className="text-stone-300 font-mono">{org.ruc_identificacion}</span></>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="text-stone-500 group-hover:text-orange-400 transition-colors text-lg pr-1">
                          <i className={`ti ${esActiva ? 'ti-check text-orange-400 font-bold' : 'ti-chevron-right'}`}></i>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Botón para crear una constructora adicional */}
                <button
                  onClick={() => setModoCrear(true)}
                  className="w-full py-3 px-4 border border-dashed border-stone-800 hover:border-orange-500/40 hover:bg-orange-500/5 text-stone-400 hover:text-orange-400 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  <i className="ti ti-plus"></i>
                  <span>Crear otra empresa o sucursal</span>
                </button>
              </>
            )}
          </div>
        )}

        {/* Footer con opción de cerrar sesión */}
        <div className="pt-4 border-t border-stone-800 mt-6 flex items-center justify-between text-[11px] text-stone-500">
          <span>Conectado como <strong className="text-stone-300">{user?.email}</strong></span>
          <button
            onClick={() => {
              cerrarSesion();
              onCerrar();
            }}
            className="text-stone-400 hover:text-rose-400 transition-colors cursor-pointer flex items-center gap-1"
          >
            <i className="ti ti-logout"></i> Cerrar Sesión
          </button>
        </div>

      </div>
    </div>
  );
}
