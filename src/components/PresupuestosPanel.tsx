import React from 'react';

interface PresupuestosPanelProps {
  presupuestos: any[];
  mostrarCreadorPresupuesto: boolean;
  setMostrarCreadorPresupuesto: (b: boolean) => void;
  nuevoPresupuesto: any;
  setNuevoPresupuesto: React.Dispatch<React.SetStateAction<any>>;
  rubrosFiltrados: any[];
  busquedaRubro: string;
  setBusquedaRubro: (v: string) => void;
  agregarRubroAPlanilla: (r: any) => void;
  eliminarPresupuesto: (id: string) => void;
  generarReporte: (p: any) => void;
  metricasPresupuesto?: any;
  costoDirectoNuevoPresupuesto: number;
  montoIndirectos: number;
  montoUtilidad: number;
  subtotalConIndirectos: number;
  montoIva: number;
  granTotalNuevoPresupuesto: number;
  agregarCapitulo?: (nombre: string) => void;
  removerFilaPlanilla: (capNombre: string, idx: number) => void;
  actualizarCantidadPlanilla: (capNombre: string, itemIdx: number, val: number) => void;
  guardarNuevoPresupuesto: () => void;
  auditarAPUEnVivo?: (apu: any) => void;
  apuAuditor?: any;
  setApuAuditor?: (v: any) => void;
  cargandoReceta?: boolean;
  todosLosRubros?: any[];
  cambiarEstadoPresupuesto: (id: string, nuevoEstado: 'Borrador' | 'Aprobado' | 'Rechazado') => void;
  editarPresupuesto: (p: any) => void;
  generarPresupuestoConIA?: (ubicacion: string, tipoProyecto: string, descripcion: string) => Promise<void>;
  cargandoIA?: boolean;
  proyectoActivo?: any;
}

export default function PresupuestosPanel({
  presupuestos,
  mostrarCreadorPresupuesto,
  setMostrarCreadorPresupuesto,
  nuevoPresupuesto,
  setNuevoPresupuesto,
  rubrosFiltrados,
  busquedaRubro,
  setBusquedaRubro,
  agregarRubroAPlanilla,
  eliminarPresupuesto,
  generarReporte,
  costoDirectoNuevoPresupuesto,
  montoIndirectos,
  montoUtilidad,
  subtotalConIndirectos,
  montoIva,
  granTotalNuevoPresupuesto,
  removerFilaPlanilla,
  actualizarCantidadPlanilla,
  guardarNuevoPresupuesto,
  cambiarEstadoPresupuesto,
  editarPresupuesto,
  generarPresupuestoConIA,
  cargandoIA,
  proyectoActivo,
}: PresupuestosPanelProps) {
  // Estado local para agregar un nuevo capítulo si se desea
  const [nuevoCapNombre, setNuevoCapNombre] = React.useState('');
  const [canalInsercion, setCanalInsercion] = React.useState<'manual' | 'ia'>('manual');
  const [iaUbicacion, setIaUbicacion] = React.useState('');
  const [iaTipoProyecto, setIaTipoProyecto] = React.useState('Vivienda');
  const [iaDescripcion, setIaDescripcion] = React.useState('');

  const handleGenerarIA = async () => {
    if (generarPresupuestoConIA) {
      await generarPresupuestoConIA(iaUbicacion, iaTipoProyecto, iaDescripcion);
    }
  };

  const handleCrearCapitulo = () => {
    if (!nuevoCapNombre.trim()) return;
    setNuevoPresupuesto((prev: any) => {
      const existe = prev.capitulos.some((c: any) => c.nombre.toLowerCase() === nuevoCapNombre.trim().toLowerCase());
      if (existe) return prev;
      return {
        ...prev,
        capitulos: [...prev.capitulos, { nombre: nuevoCapNombre.trim(), items: [] }]
      };
    });
    setNuevoCapNombre('');
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-stone-50 h-full">
      {!mostrarCreadorPresupuesto ? (
        // DIRECTORIO / HISTORICO DE PRESUPUESTOS
        <div className="flex-1 flex flex-col overflow-hidden bg-white p-6">
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <div>
                <h3 className="text-sm font-extrabold text-stone-800 uppercase tracking-tight">
                  Directorio de Presupuestos y Licitaciones
                </h3>
                <p className="text-[11px] text-stone-400 mt-1">
                  Encuentre, edite e imprima reportes de obras civiles y cotizaciones activas.
                </p>
              </div>
              {proyectoActivo?.miRol !== 'lector' && (
                <button
                  onClick={() => setMostrarCreadorPresupuesto(true)}
                  className="bg-orange-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 hover:bg-orange-700 active:scale-95 cursor-pointer transition-all shadow-md shadow-orange-600/10"
                >
                  <i className="ti ti-plus font-extrabold"></i> Nueva Estimación
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {presupuestos.map((p) => (
                <div
                  key={p.id}
                  className="bg-stone-50 hover:bg-stone-100/60 border border-stone-200 rounded-2xl p-5 shadow-sm relative overflow-hidden flex items-center justify-between transition-colors"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-orange-500"></div>
                  
                  <div className="space-y-1.5 pl-3 flex-1">
                    <div className="flex gap-2 items-center">
                      <span className="text-[10px] font-mono font-bold text-stone-400">
                        ID: {p.id.slice(0, 8).toUpperCase()}
                      </span>
                      <select
                        value={p.estado}
                        onChange={(e) => cambiarEstadoPresupuesto(p.id, e.target.value as any)}
                        disabled={proyectoActivo?.miRol === 'lector'}
                        className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border outline-none cursor-pointer transition-colors ${
                          p.estado === 'Aprobado'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-250 hover:bg-emerald-100/60'
                            : p.estado === 'Rechazado'
                            ? 'bg-rose-50 text-rose-700 border-rose-250 hover:bg-rose-100/60'
                            : 'bg-stone-100 text-stone-700 border-stone-300 hover:bg-stone-200/60'
                        }`}
                      >
                        <option value="Borrador">Borrador</option>
                        <option value="Aprobado">Aprobado</option>
                        <option value="Rechazado">Rechazado</option>
                      </select>
                      <span className="text-[9px] text-stone-400 font-medium">
                        Fecha: {new Date(p.fecha || p.created_at || Date.now()).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-sm text-stone-800 leading-snug">{p.proyecto}</h4>
                    <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider mt-0.5">
                      <i className="ti ti-building text-stone-400 mr-1 text-[11px]"></i> {p.cliente}
                    </p>
                  </div>

                  <div className="text-right flex items-center gap-6 pr-2">
                    <div>
                      <span className="text-[9px] uppercase tracking-widest text-stone-400 font-bold block mb-0.5">
                        Estimación General (IVA Inc)
                      </span>
                      <strong className="text-stone-900 text-lg font-mono font-black">
                        ${Number(p.monto || p.precio_presup_total || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </strong>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => generarReporte(p)}
                        className="bg-stone-900 hover:bg-orange-600 text-white font-bold font-sans text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <i className="ti ti-file-export"></i> Ver Informe PDF / Imprimir
                      </button>
                      <button
                        onClick={() => editarPresupuesto(p)}
                        className="bg-stone-100 hover:bg-orange-600 hover:text-white text-stone-700 font-bold font-sans text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors border border-stone-250"
                        title="Editar estimación"
                      >
                        <i className="ti ti-edit"></i> Editar
                      </button>
                      {proyectoActivo?.miRol !== 'lector' && (
                        <button
                          className="text-stone-300 hover:text-red-600 cursor-pointer p-2 rounded-xl hover:bg-stone-200 transition-colors"
                          onClick={() => eliminarPresupuesto(p.id)}
                          title="Eliminar estimación"
                        >
                          <i className="ti ti-trash text-xs"></i>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {presupuestos.length === 0 && (
                <div className="text-center py-24 bg-stone-50 border-2 border-dashed border-stone-200 rounded-3xl text-stone-400 italic text-xs flex flex-col justify-center items-center gap-2">
                  <i className="ti ti-file-shredder text-3xl text-stone-300"></i>
                  <span>No se encontraron carpetas o cotizaciones registradas.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        // CREACION/EDICIÓN DE PRESUPUESTO CON ESTRUCTURA CAPITULAR
        <div className="flex-1 flex overflow-hidden bg-stone-50">
          {/* Columna Izquierda: Planilla por Capítulos */}
          <div className="w-2/3 flex flex-col h-full bg-white border-r border-stone-200">
            <div className="p-5 border-b border-stone-250 flex justify-between items-center bg-stone-50 shrink-0">
              <button
                className="text-stone-500 hover:text-orange-600 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                onClick={() => setMostrarCreadorPresupuesto(false)}
              >
                <i className="ti ti-arrow-left"></i> Retornar al Carpeta de Obras
              </button>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                Planilla Técnica Capitular
              </h4>
            </div>

            {/* Campos de metadatos */}
            <div className="p-5 border-b border-stone-200 grid grid-cols-2 gap-4 shrink-0">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pl-1">
                  Nombre de la Obra o Proyecto
                </label>
                <input
                  type="text"
                  placeholder="Ej: Ampliación Residencia Los Laureles..."
                  className="w-full text-xs p-3 border border-stone-300 rounded-xl bg-stone-50/50 outline-none focus:bg-white focus:border-orange-500 transition-all font-semibold text-stone-700"
                  value={nuevoPresupuesto.proyecto || ''}
                  readOnly={proyectoActivo?.miRol === 'lector'}
                  onChange={(e) => setNuevoPresupuesto((prev: any) => ({ ...prev, proyecto: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pl-1">
                  Cliente o Entidad Licitante
                </label>
                <input
                  type="text"
                  placeholder="Ej: Consorcio Vial Metropolitano S.A..."
                  className="w-full text-xs p-3 border border-stone-300 rounded-xl bg-stone-50/50 outline-none focus:bg-white focus:border-orange-500 transition-all font-semibold text-stone-700"
                  value={nuevoPresupuesto.cliente || ''}
                  readOnly={proyectoActivo?.miRol === 'lector'}
                  onChange={(e) => setNuevoPresupuesto((prev: any) => ({ ...prev, cliente: e.target.value }))}
                />
              </div>
            </div>

            {/* Listado capitular y tablas */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {proyectoActivo?.miRol !== 'lector' && (
                <div className="flex justify-between items-center bg-stone-50 p-4 rounded-2xl border border-stone-200">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Agregador de Rubros de Control</span>
                    <span className="text-[11px] text-stone-600 mt-0.5">Asigne capítulos adicionales de cómputo</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nuevo Capítulo..."
                      value={nuevoCapNombre}
                      onChange={(e) => setNuevoCapNombre(e.target.value)}
                      className="px-3 py-1.5 border border-stone-300 rounded-lg bg-white text-xs outline-none text-stone-700 font-medium"
                    />
                    <button
                      onClick={handleCrearCapitulo}
                      className="bg-stone-900 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                    >
                      Crear Sección
                    </button>
                  </div>
                </div>
              )}

              {((nuevoPresupuesto.capitulos) || []).map((cap: any, capIdx: number) => {
                const esActivo = nuevoPresupuesto.capituloActivo === cap.nombre;
                return (
                  <div key={cap.nombre} className="space-y-3">
                    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm justify-between transition-all ${
                      esActivo
                        ? 'bg-orange-600 text-white ring-2 ring-orange-500/50'
                        : 'bg-stone-900 text-white hover:bg-stone-850'
                    }`}>
                      <span className="flex items-center gap-1.5">
                        <i className={`ti ${esActivo ? 'ti-folder-open text-orange-200' : 'ti-folder text-orange-400'} text-sm`}></i>
                        {cap.nombre}
                      </span>
                      <div className="flex items-center gap-2">
                        {esActivo ? (
                          <span className="bg-white/25 text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md">
                            Destino Activo
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setNuevoPresupuesto((prev: any) => ({ ...prev, capituloActivo: cap.nombre }))}
                            className="bg-stone-850 hover:bg-stone-700 hover:text-white text-stone-300 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md cursor-pointer transition-colors border border-stone-700"
                          >
                            Seleccionar
                          </button>
                        )}
                        <span className="text-[10px] bg-stone-800 text-orange-400 px-2 py-0.5 rounded-full font-mono">
                          {cap.items?.length || 0} Rubros
                        </span>
                      </div>
                    </div>

                    <div className="border border-stone-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-stone-50 border-b border-stone-200 text-stone-400 font-bold uppercase text-[9px] tracking-wider">
                            <th className="py-2.5 px-3 w-10 text-center">N°</th>
                            <th className="py-2.5 px-3">Código / Rubro</th>
                            <th className="py-2.5 px-3 text-center">Unidad</th>
                            <th className="py-2.5 px-3 text-right">Rend. Directo</th>
                            <th className="py-2.5 px-3 text-center w-24">Cantidad</th>
                            <th className="py-2.5 px-3 text-right w-28 font-semibold">Parcial</th>
                            <th className="py-2.5 px-3 w-10 text-center">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {(cap.items || []).map((item: any, idx: number) => (
                            <tr key={idx} className="hover:bg-stone-50/50 transition-colors">
                              <td className="py-3 px-3 text-center font-mono text-[10px] text-stone-400">{idx + 1}</td>
                              <td className="py-3 px-3">
                                <span className="font-mono text-[8px] text-stone-400 font-bold block">{item.id_rubro}</span>
                                <strong className="text-[10.5px] font-bold text-stone-800 truncate block max-w-xs" title={item.nombre_rubro}>
                                  {item.nombre_rubro}
                                </strong>
                              </td>
                              <td className="py-3 px-3 text-center text-stone-550 font-bold uppercase">{item.unidad || 'm³'}</td>
                              <td className="py-3 px-3 text-right font-mono font-medium text-stone-500">${Number(item.precio || 0).toFixed(2)}</td>
                              <td className="py-3 px-3 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={item.cantidad || ''}
                                  readOnly={proyectoActivo?.miRol === 'lector'}
                                  onChange={(e) => {
                                    const v = parseFloat(e.target.value);
                                    actualizarCantidadPlanilla(cap.nombre, idx, isNaN(v) ? 0 : v);
                                  }}
                                  className="w-full text-center py-1 bg-stone-50 border border-stone-250 rounded font-mono font-bold text-orange-600 outline-none text-xs focus:bg-white focus:border-orange-500"
                                />
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">
                                ${Number(item.subtotal || 0).toFixed(2)}
                              </td>
                              <td className="py-3 px-3 text-center">
                                {proyectoActivo?.miRol !== 'lector' && (
                                  <button
                                    onClick={() => removerFilaPlanilla(cap.nombre, idx)}
                                    className="text-stone-300 hover:text-red-500 transition-colors cursor-pointer"
                                    title="Remover rubro"
                                  >
                                    <i className="ti ti-trash text-xs"></i>
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}

                          {(cap.items || []).length === 0 && (
                            <tr>
                              <td colSpan={7} className="py-8 px-3 text-center text-stone-400 italic">
                                No hay rubros de control en este capítulo. Arrastre o haga clic para añadir.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}

              {!(nuevoPresupuesto.capitulos && nuevoPresupuesto.capitulos.length > 0) && (
                <div className="text-center py-16 bg-stone-50 border-2 border-dashed border-stone-200 rounded-3xl text-stone-400 italic text-xs">
                  Aún no tiene capítulos de organización configurados.
                </div>
              )}
            </div>
          </div>

          {/* Columna Derecha: Canasta de Inserción e Impuestos */}
          <div className="w-1/3 flex flex-col h-full bg-stone-50 overflow-y-auto p-5 space-y-5">
            {/* Buscador y Semillas de Inserción */}
            {proyectoActivo?.miRol !== 'lector' && (
              <div className="bg-white border border-stone-200 rounded-3xl p-5 shadow-sm space-y-4">
                {/* Tab Selector */}
                <div className="flex border-b border-stone-150 pb-1.5 mb-2 gap-1">
                  <button
                    type="button"
                    onClick={() => setCanalInsercion('manual')}
                    className={`flex-1 pb-1.5 text-[10px] font-black uppercase tracking-wider text-center cursor-pointer transition-all border-b-2 outline-none ${
                      canalInsercion === 'manual'
                        ? 'border-orange-600 text-stone-850'
                        : 'border-transparent text-stone-400 hover:text-stone-600'
                    }`}
                  >
                    <i className="ti ti-hand-finger mr-1"></i> Catálogo Manual
                  </button>
                  <button
                    type="button"
                    onClick={() => setCanalInsercion('ia')}
                    className={`flex-1 pb-1.5 text-[10px] font-black uppercase tracking-wider text-center cursor-pointer transition-all border-b-2 outline-none ${
                      canalInsercion === 'ia'
                        ? 'border-orange-600 text-stone-850'
                        : 'border-transparent text-stone-400 hover:text-stone-600'
                    }`}
                  >
                    <i className="ti ti-sparkles mr-1 text-orange-500"></i> Generador IA
                  </button>
                </div>

                {canalInsercion === 'ia' ? (
                  <div className="space-y-3 pt-1">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-stone-405 uppercase tracking-widest pl-1">
                        Ubicación del Proyecto:
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Quito, Valle de los Chillos"
                        value={iaUbicacion}
                        onChange={(e) => setIaUbicacion(e.target.value)}
                        className="w-full text-xs px-3.5 py-2 border border-stone-250 rounded-xl bg-stone-50 outline-none focus:border-orange-500 focus:bg-white transition-all font-semibold"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-stone-405 uppercase tracking-widest pl-1">
                        Tipo de Proyecto:
                      </label>
                      <select
                        value={iaTipoProyecto}
                        onChange={(e) => setIaTipoProyecto(e.target.value)}
                        className="w-full text-xs p-2.5 border border-stone-250 rounded-xl bg-stone-50 outline-none focus:border-orange-500 focus:bg-white transition-all font-semibold text-stone-700 cursor-pointer"
                      >
                        <option value="Vivienda">Vivienda Unifamiliar</option>
                        <option value="Comercial">Edificación Comercial</option>
                        <option value="Estructuras Metálicas">Estructuras Metálicas</option>
                        <option value="Vías">Obras Viales y Pavimentación</option>
                        <option value="Cerramiento">Cerramiento / Muro de Contención</option>
                        <option value="Personalizado">Otro / Personalizado</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-stone-405 uppercase tracking-widest pl-1">
                        Descripción del Proyecto:
                      </label>
                      <textarea
                        placeholder="Describa el alcance de la obra, ej: Construcción de zapatas de 1x1m, mampostería de bloque, enlucido y pintura para un local comercial de 50m²..."
                        value={iaDescripcion}
                        onChange={(e) => setIaDescripcion(e.target.value)}
                        rows={4}
                        className="w-full text-xs px-3 py-2 border border-stone-250 rounded-xl bg-stone-50 outline-none focus:border-orange-500 focus:bg-white transition-all font-medium leading-relaxed resize-none"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleGenerarIA}
                      disabled={cargandoIA}
                      className="w-full bg-stone-900 hover:bg-orange-600 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:bg-stone-300 disabled:cursor-not-allowed select-none"
                    >
                      {cargandoIA ? (
                        <>
                          <i className="ti ti-loader animate-spin text-sm"></i>
                          <span>Generando Estructura...</span>
                        </>
                      ) : (
                        <>
                          <i className="ti ti-sparkles text-orange-405 animate-pulse"></i>
                          <span>Generar Presupuesto con IA</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <i className="ti ti-search absolute left-3 top-2.5 text-stone-400"></i>
                      <input
                        type="text"
                        placeholder="Buscar rubros de catálogo..."
                        value={busquedaRubro}
                        onChange={(e) => setBusquedaRubro(e.target.value)}
                        className="w-full text-xs pl-8 pr-3 py-1.5 border border-stone-300 rounded-xl bg-stone-50 outline-none focus:border-orange-500 focus:bg-white transition-all shadow-sm"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest pl-1">
                        Capítulo de Destino (Añadir a):
                      </label>
                      <select
                        value={nuevoPresupuesto.capituloActivo || ''}
                        onChange={(e) => setNuevoPresupuesto((prev: any) => ({ ...prev, capituloActivo: e.target.value }))}
                        className="w-full text-xs p-2.5 border border-stone-250 rounded-xl bg-stone-50 outline-none focus:border-orange-500 focus:bg-white transition-all font-semibold text-stone-700 cursor-pointer"
                      >
                        {(nuevoPresupuesto.capitulos || []).map((cap: any) => (
                          <option key={cap.nombre} value={cap.nombre}>
                            {cap.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                      {rubrosFiltrados.map((r) => (
                        <button
                          key={r.id_rubro}
                          onClick={() => agregarRubroAPlanilla(r)}
                          className="w-full p-2.5 bg-stone-50 hover:bg-orange-50/50 hover:border-orange-200 border border-stone-200 rounded-xl text-left flex justify-between items-center transition-colors cursor-pointer"
                        >
                          <div className="flex flex-col truncate max-w-[155px]">
                            <span className="font-mono text-[8px] font-black text-stone-450">{r.id_rubro}</span>
                            <strong className="text-[10px] font-black text-stone-700 truncate mt-0.5">{r.nombre_rubro}</strong>
                          </div>
                          <div className="text-right flex items-center gap-1.5 shrink-0">
                            <span className="font-mono text-[10px] font-semibold text-orange-605">${Number(r.precio_rubro).toFixed(2)}</span>
                            <i className="ti ti-circle-plus text-stone-400 text-xs"></i>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Ficha Resumen de Precios Indirectos */}
            <div className="bg-white border border-stone-250 rounded-3xl p-5 shadow-sm space-y-3 text-xs text-stone-600">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2 pb-1 border-b border-stone-100">
                Resumen Económico Consolidado
              </h4>
              
              <div className="flex justify-between items-center">
                <span>Costo de Campo Directo:</span>
                <span className="font-mono font-bold text-stone-850">${costoDirectoNuevoPresupuesto.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-stone-400 text-[10.5px]">
                <span>Gastos Generales / Indirectos (12%):</span>
                <span className="font-mono">${montoIndirectos.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-stone-400 text-[10.5px]">
                <span>Margen de Utilidad (8%):</span>
                <span className="font-mono">${montoUtilidad.toFixed(2)}</span>
              </div>
              
              <div className="border-t border-stone-100 pt-2.5 flex justify-between items-center font-bold text-stone-800 text-[12.5px]">
                <span>Subtotal Operativo:</span>
                <span className="font-mono text-stone-900">${subtotalConIndirectos.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center text-stone-400 text-[10.5px]">
                <span>Impuesto al Valor Agregado (IVA - 10%):</span>
                <span className="font-mono">${montoIva.toFixed(2)}</span>
              </div>

              <div className="border-t border-stone-100 pt-4 bg-stone-900 -mx-5 -mb-5 p-5 rounded-b-3xl text-white relative overflow-hidden flex flex-col">
                <div className="absolute right-0 bottom-0 w-24 h-24 bg-orange-600 rounded-full opacity-10 blur-xl"></div>
                <span className="text-[9px] uppercase tracking-widest text-stone-400 font-bold">TOTAL ESTIMADO CON IVA</span>
                <strong className="text-xl font-mono font-black text-orange-400 tracking-tight leading-snug mt-1">
                  ${granTotalNuevoPresupuesto.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
                
                {proyectoActivo?.miRol !== 'lector' && (
                  <div className="mt-8 flex flex-col gap-3">
                    <button
                      onClick={guardarNuevoPresupuesto}
                      className="bg-orange-600 hover:bg-orange-700 text-white w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider shadow-md cursor-pointer transition-colors border border-orange-550 select-none text-center"
                    >
                      <i className="ti ti-device-floppy"></i> Guardar Presupuesto de Obra
                    </button>
                    <button
                      onClick={() => setMostrarCreadorPresupuesto(false)}
                      className="w-full py-2.5 bg-stone-800 text-stone-400 hover:text-white text-[10px] font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Descartar Edición
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
