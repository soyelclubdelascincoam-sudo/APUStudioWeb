import React, { useState, useEffect } from 'react';

interface RubrosPanelProps {
  rubrosFiltrados: any[];
  rubroSeleccionado: any;
  seleccionarRubro: (r: any) => void;
  busquedaRubro: string;
  setBusquedaRubro: (v: string) => void;
  cargandoReceta: boolean;
  seccionesReceta: any[];
  actualizarRubro: (idRubro: string, nuevoNombre: string, nuevaUnidad: string) => Promise<void>;
  actualizarCantidadReceta: (idRubro: string, row: any, nuevaCantidad: number) => Promise<void>;
  eliminarInsumoReceta: (idRubro: string, row: any) => Promise<void>;
  agregarInsumoReceta: (idRubro: string, insumo: any, catKey: string, cantidad: number) => Promise<void>;
  insumosMat: any[];
  insumosMob: any[];
  insumosEyh: any[];
  insumosTransp: any[];
  crearRubro: (nombre: string, unidad: string) => Promise<any>;
}

export default function RubrosPanel({
  rubrosFiltrados,
  rubroSeleccionado,
  seleccionarRubro,
  busquedaRubro,
  setBusquedaRubro,
  cargandoReceta,
  seccionesReceta,
  actualizarRubro,
  actualizarCantidadReceta,
  eliminarInsumoReceta,
  agregarInsumoReceta,
  insumosMat,
  insumosMob,
  insumosEyh,
  insumosTransp,
  crearRubro,
}: RubrosPanelProps) {
  // Estados locales para edición de Rubro
  const [editandoRubro, setEditandoRubro] = useState(false);
  const [tempNombreRubro, setTempNombreRubro] = useState('');
  const [tempUnidadRubro, setTempUnidadRubro] = useState('');

  // Estados locales para creación de Rubro desde cero
  const [creandoRubro, setCreandoRubro] = useState(false);
  const [nombreNuevoRubro, setNombreNuevoRubro] = useState('');
  const [unidadNuevoRubro, setUnidadNuevoRubro] = useState('m');
  const [cargandoCrear, setCargandoCrear] = useState(false);

  // Estados locales para edición de cantidad de Receta
  const [filaEnEdicion, setFilaEnEdicion] = useState<string | null>(null);
  const [tempCantidad, setTempCantidad] = useState<number>(0);

  // Estado local para confirmación de eliminación de insumos (reemplazo de confirm)
  const [filaEnConfirmacionEliminar, setFilaEnConfirmacionEliminar] = useState<string | null>(null);

  // Estados locales para adición de insumos
  const [seccionDestino, setSeccionDestino] = useState<string | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [filtroCatalog, setFiltroCatalog] = useState('');
  const [insumoElegido, setInsumoElegido] = useState<any | null>(null);
  const [cantidadAñadir, setCantidadAñadir] = useState<number>(1);
  
  // Estado para prevenir clics múltiples
  const [cargandoAccion, setCargandoAccion] = useState(false);

  // Sincronizar datos temporales al seleccionar un rubro
  useEffect(() => {
    if (rubroSeleccionado) {
      setTempNombreRubro(rubroSeleccionado.nombre_rubro || '');
      setTempUnidadRubro(rubroSeleccionado.unidad_rubro || rubroSeleccionado.unidad || 'm³');
      setEditandoRubro(false);
      setFilaEnEdicion(null);
      setFilaEnConfirmacionEliminar(null);
      setCreandoRubro(false);
    }
  }, [rubroSeleccionado]);

  // Acciones
  const ejecutarCrearRubro = async () => {
    if (!nombreNuevoRubro.trim() || !unidadNuevoRubro.trim()) return;
    setCargandoCrear(true);
    try {
      await crearRubro(nombreNuevoRubro.trim(), unidadNuevoRubro.trim());
      setNombreNuevoRubro('');
      setUnidadNuevoRubro('m³');
      setCreandoRubro(false);
    } catch (err) {
      // Error is handled with toast in App.tsx
    } finally {
      setCargandoCrear(false);
    }
  };

  const guardarRubro = async () => {
    if (!tempNombreRubro.trim()) return;
    setCargandoAccion(true);
    try {
      await actualizarRubro(
        rubroSeleccionado.id_rubro || rubroSeleccionado.id,
        tempNombreRubro.trim(),
        tempUnidadRubro.trim()
      );
      setEditandoRubro(false);
    } finally {
      setCargandoAccion(false);
    }
  };

  const guardarCantidad = async (row: any) => {
    setCargandoAccion(true);
    try {
      await actualizarCantidadReceta(
        rubroSeleccionado.id_rubro || rubroSeleccionado.id,
        row,
        tempCantidad
      );
      setFilaEnEdicion(null);
    } finally {
      setCargandoAccion(false);
    }
  };

  const ejecutarEliminarInsumo = async (row: any) => {
    setCargandoAccion(true);
    try {
      await eliminarInsumoReceta(
        rubroSeleccionado.id_rubro || rubroSeleccionado.id,
        row
      );
      setFilaEnConfirmacionEliminar(null);
    } finally {
      setCargandoAccion(false);
    }
  };

  const iniciarAdicion = (labelSeccion: string) => {
    setSeccionDestino(labelSeccion);
    setInsumoElegido(null);
    setCantidadAñadir(1);
    setFiltroCatalog('');
    setModalAbierto(true);
  };

  const confirmarAñadirInsumo = async () => {
    if (!insumoElegido || cantidadAñadir <= 0) return;
    setCargandoAccion(true);
    try {
      let catKey = 'MAT';
      if (seccionDestino === 'Materiales') catKey = 'MAT';
      else if (seccionDestino === 'Mano de Obra') catKey = 'MOB';
      else if (seccionDestino === 'Equipos y Herramientas') catKey = 'EYH';
      else if (seccionDestino === 'Transporte y Flete') catKey = 'TRANSP';

      await agregarInsumoReceta(
        rubroSeleccionado.id_rubro || rubroSeleccionado.id,
        insumoElegido,
        catKey,
        cantidadAñadir
      );
      setModalAbierto(false);
    } finally {
      setCargandoAccion(false);
    }
  };

  // Helpers de Catálogo
  const getCatalogList = () => {
    if (seccionDestino === 'Materiales') return insumosMat;
    if (seccionDestino === 'Mano de Obra') return insumosMob;
    if (seccionDestino === 'Equipos y Herramientas') return insumosEyh;
    if (seccionDestino === 'Transporte y Flete') return insumosTransp;
    return [];
  };

  const getInsumoName = (item: any) => {
    return item.name_insumo_mat || item.name_insumo_mob || item.name_insumo_eyh || item.name_insumo_transp || item.nombre || item.descripcion || '';
  };

  const getInsumoPrice = (item: any) => {
    const val =
      item.precio_mat !== undefined ? item.precio_mat :
      item.precio_mob !== undefined ? item.precio_mob :
      item.precio_eyh !== undefined ? item.precio_eyh :
      item.precio_transp !== undefined ? item.precio_transp :
      item.precio_insumo_mat !== undefined ? item.precio_insumo_mat :
      item.precio_insumo_mob !== undefined ? item.precio_insumo_mob :
      item.precio_insumo_eyh !== undefined ? item.precio_insumo_eyh :
      item.precio_insumo_transp !== undefined ? item.precio_insumo_transp :
      item.precio !== undefined ? item.precio : 0;
    return Number(val) || 0;
  };

  const getInsumoUnit = (item: any) => {
    return item.unidad || item.unidad_mat || item.unidad_mob || item.unidad_eyh || item.unidad_transp || 'u';
  };

  const filteredCatalog = getCatalogList().filter(item => {
    const name = getInsumoName(item).toLowerCase();
    const id = String(item.id_insumo_mat || item.id_insumo_mob || item.id_insumo_eyh || item.id_insumo_transp || item.id || item.id_insumo || '').toLowerCase();
    const query = filtroCatalog.toLowerCase();
    return name.includes(query) || id.includes(query);
  });

  return (
    <div className="flex-1 flex overflow-hidden bg-stone-50">
      {/* Panel izquierdo: Lista de Rubros / Composición */}
      <div className="w-1/2 border-r border-stone-200 flex flex-col h-full bg-white">
        <div className="p-4 border-b border-stone-200">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              Análisis de Precios Unitarios (APU)
            </label>
            <button
              onClick={() => {
                seleccionarRubro(null);
                setCreandoRubro(true);
              }}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer shadow-sm"
              title="Generar un nuevo rubro desde cero"
            >
              <i className="ti ti-plus"></i> Nuevo Rubro
            </button>
          </div>
          <div className="relative">
            <i className="ti ti-search absolute left-3 top-3.5 text-stone-400"></i>
            <input
              type="text"
              placeholder="Buscar rubros por composición..."
              value={busquedaRubro}
              onChange={(e) => setBusquedaRubro(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-xl bg-stone-50 text-xs outline-none focus:border-orange-500 focus:bg-white transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {rubrosFiltrados.map((r) => {
            const sel = rubroSeleccionado?.id_rubro === r.id_rubro;
            return (
              <div
                key={r.id_rubro}
                onClick={() => seleccionarRubro(r)}
                className={`p-4 rounded-xl border cursor-pointer hover:bg-stone-50 transition-all flex items-center justify-between ${
                  sel ? 'bg-orange-50/50 border-orange-400 shadow-sm' : 'bg-white border-stone-200'
                }`}
              >
                <div className="flex flex-col text-left">
                  <span className="font-mono text-[9px] font-bold text-stone-400">
                    ID: {r.id_rubro}
                  </span>
                  <span className="text-xs font-bold text-stone-800 truncate mt-1 max-w-[260px]">
                    {r.nombre_rubro}
                  </span>
                  <span className="text-[10px] text-stone-500 mt-1">
                    Rendimiento por {r.unidad_rubro || r.unidad || 'm³'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs font-black text-orange-600 block">
                    ${Number(r.precio_rubro).toFixed(2)}
                  </span>
                  <span className="text-[9px] font-bold uppercase text-stone-400 bg-stone-100 border border-stone-200 px-1.5 py-0.5 rounded-full mt-1.5 block text-center min-w-[34px]">
                    {r.unidad_rubro || r.unidad || 'U'}
                  </span>
                </div>
              </div>
            );
          })}
          {rubrosFiltrados.length === 0 && (
            <div className="text-center py-16 text-stone-400 italic text-xs">
              No se encontraron rubros (Sin coincidencias).
            </div>
          )}
        </div>
      </div>

      {/* Panel derecho: Fórmulas y Recetas del Análisis Unitario */}
      <div className="w-1/2 flex flex-col h-full bg-stone-50">
        {creandoRubro ? (
          <div className="p-6 flex flex-col h-full overflow-y-auto space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-4 text-left font-sans">
              <div>
                <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest block">Nuevo Análisis de Precio</span>
                <h3 className="text-xs font-bold text-stone-850 uppercase mt-0.5 border-b border-stone-100 pb-2">
                  Generar Rubro desde Cero
                </h3>
              </div>
              
              <div className="space-y-4 pt-2">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Nombre o Designación del Rubro</span>
                  <input
                    type="text"
                    placeholder="Ej. Revoque Exterior en Dos Capas..."
                    value={nombreNuevoRubro}
                    onChange={(e) => setNombreNuevoRubro(e.target.value)}
                    className="w-full p-2.5 border border-stone-300 rounded-xl bg-white text-xs outline-none focus:border-orange-500 font-bold"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Unidad de Medida / Rendimiento</span>
                  <select
                    value={unidadNuevoRubro}
                    onChange={(e) => setUnidadNuevoRubro(e.target.value)}
                    className="w-full p-2.5 border border-stone-300 rounded-xl bg-white text-xs outline-none focus:border-orange-500 font-bold text-stone-700 cursor-pointer"
                  >
                    <option value="m">m (Metro lineal)</option>
                    <option value="m2">m2 (Metro cuadrado)</option>
                    <option value="m3">m3 (Metro cúbico)</option>
                    <option value="ml">ml (Metro lineal)</option>
                    <option value="u">u (Unidad)</option>
                    <option value="Kg">Kg (Kilogramo)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3">
                <button
                  onClick={() => {
                    setCreandoRubro(false);
                    setNombreNuevoRubro('');
                    setUnidadNuevoRubro('m');
                  }}
                  disabled={cargandoCrear}
                  className="px-4 py-2 border border-stone-300 text-stone-600 rounded-xl text-xs font-bold hover:bg-stone-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={ejecutarCrearRubro}
                  disabled={cargandoCrear || !nombreNuevoRubro.trim() || !unidadNuevoRubro.trim()}
                  className="px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-bold hover:bg-orange-700 disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {cargandoCrear && <i className="ti ti-loader-2 spin"></i>}
                  Crear Rubro
                </button>
              </div>
            </div>
          </div>
        ) : rubroSeleccionado ? (
          <div className="p-6 flex flex-col h-full overflow-y-auto space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-4">
              {editandoRubro ? (
                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Designación del Rubro</span>
                    <input
                      type="text"
                      value={tempNombreRubro}
                      onChange={(e) => setTempNombreRubro(e.target.value)}
                      className="w-full p-2.5 border border-stone-300 rounded-xl bg-white text-xs outline-none focus:border-orange-500 font-bold"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Unidad de Rendimiento</span>
                    <select
                      value={tempUnidadRubro}
                      onChange={(e) => setTempUnidadRubro(e.target.value)}
                      className="w-full p-2.5 border border-stone-300 rounded-xl bg-white text-xs outline-none focus:border-orange-500 font-bold text-stone-700 cursor-pointer"
                    >
                      {!['m', 'm2', 'm3', 'ml', 'u', 'Kg'].includes(tempUnidadRubro) && tempUnidadRubro && (
                        <option value={tempUnidadRubro}>{tempUnidadRubro} (Personalizado)</option>
                      )}
                      <option value="m">m (Metro lineal)</option>
                      <option value="m2">m2 (Metro cuadrado)</option>
                      <option value="m3">m3 (Metro cúbico)</option>
                      <option value="ml">ml (Metro lineal)</option>
                      <option value="u">u (Unidad)</option>
                      <option value="Kg">Kg (Kilogramo)</option>
                    </select>
                  </div>
                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      onClick={() => setEditandoRubro(false)}
                      disabled={cargandoAccion}
                      className="px-4 py-2 border border-stone-300 text-stone-600 rounded-xl text-xs font-bold hover:bg-stone-50 transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={guardarRubro}
                      disabled={cargandoAccion}
                      className="px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-bold hover:bg-orange-700 transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      {cargandoAccion && <i className="ti ti-loader-2 spin"></i>}
                      Guardar Cambios
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start">
                    <h4 className="font-extrabold text-sm text-stone-800 leading-tight flex-1 pr-2">
                      {rubroSeleccionado.nombre_rubro}
                    </h4>
                    <button
                      onClick={() => {
                        setTempNombreRubro(rubroSeleccionado.nombre_rubro || '');
                        setTempUnidadRubro(rubroSeleccionado.unidad_rubro || rubroSeleccionado.unidad || 'm³');
                        setEditandoRubro(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-orange-600 text-white rounded-xl text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap"
                    >
                      <i className="ti ti-pencil"></i> Modificar Rubro
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-mono text-[9px] font-bold bg-stone-100 text-stone-600 border border-stone-200 px-2.5 py-0.5 rounded-full select-none">
                      RUBRO: {rubroSeleccionado.id_rubro}
                    </span>
                    <span className="font-sans text-[9px] font-extrabold bg-orange-50 text-orange-700 border border-orange-200 px-2.5 py-0.5 rounded-full select-none">
                      UNIDAD RENDIMIENTO: {rubroSeleccionado.unidad_rubro || rubroSeleccionado.unidad || 'm³'}
                    </span>
                  </div>
                </>
              )}
              <div className="bg-orange-50/50 border border-orange-100 p-4 rounded-xl flex items-center justify-between font-bold">
                <span className="text-[10px] text-stone-600 uppercase tracking-wider">Costo Compuesto Homologado:</span>
                <strong className="text-base text-orange-600 font-mono">
                  ${(() => {
                    const dynamicTotal = seccionesReceta.reduce((sum, sec) => {
                      const subTotal = sec.data.reduce((a: number, r: any) => a + (Number(r.precio_total) || 0), 0);
                      return sum + subTotal;
                    }, 0);
                    return (dynamicTotal > 0 ? dynamicTotal : Number(rubroSeleccionado.precio_rubro || 0)).toFixed(2);
                  })()} / {rubroSeleccionado.unidad_rubro || rubroSeleccionado.unidad || 'm³'}
                </strong>
              </div>
            </div>

            {cargandoReceta ? (
              <div className="p-12 text-center text-xs text-stone-400 font-bold flex flex-col items-center gap-2">
                <i className="ti ti-loader-2 spin text-orange-600 text-xl"></i>
                <span>Calculando Coeficientes de Incidencia…</span>
              </div>
            ) : (
              <div className="space-y-5">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-stone-500 pl-1">
                  Estructura de Mano de Obra y Materiales (Insumos)
                </h4>
                {seccionesReceta.map((sec) => {
                  const subTotal = sec.data.reduce((a: number, r: any) => a + (Number(r.precio_total) || 0), 0);
                  return (
                    <div key={sec.label} className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
                      <div className="bg-stone-900 text-white p-3.5 font-bold flex justify-between items-center text-[10px] tracking-wider uppercase">
                        <span className="flex items-center gap-1.5 font-bold">
                          <i className={`ti ${sec.icon} text-orange-400`}></i> {sec.label}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-orange-400 font-black">${subTotal.toFixed(2)}</span>
                          <button
                            onClick={() => iniciarAdicion(sec.label)}
                            className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-[9px] px-2 py-1 rounded-lg transition-colors flex items-center gap-1 normal-case tracking-normal cursor-pointer"
                          >
                            <i className="ti ti-plus"></i> Añadir Insumo
                          </button>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-[10px] border-collapse">
                          <thead>
                            <tr className="bg-stone-50 border-b border-stone-200 text-stone-400 font-bold uppercase">
                              <th className="py-2 px-3 w-14">Código</th>
                              <th className="py-2 px-3">Descripción</th>
                              <th className="py-2 px-3 text-center">Unidad</th>
                              <th className="py-2 px-3 text-center w-24">Cant</th>
                              <th className="py-2 px-3 text-right">P. Unit</th>
                              <th className="py-2 px-3 text-right">Parcial</th>
                              <th className="py-2 px-3 text-center w-12">Acción</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100">
                            {sec.data.map((row: any, idx: number) => {
                              const isRowEditing = filaEnEdicion === row.codigo;
                              return (
                                <tr key={idx} className="hover:bg-stone-50/50 transition-colors">
                                  <td className="py-2 px-3 text-stone-400 font-mono text-[9px]">{row.codigo}</td>
                                  <td className="py-2 px-3 font-semibold text-stone-700 truncate max-w-[150px]" title={row.descripcion}>
                                    {row.descripcion}
                                  </td>
                                  <td className="py-2 px-3 text-center text-stone-500">{row.unidad}</td>
                                  <td className="py-2 px-3 text-center">
                                    {isRowEditing ? (
                                      <div className="flex flex-col items-center justify-center">
                                        <input
                                          type="number"
                                          step="any"
                                          value={tempCantidad}
                                          onChange={(e) => setTempCantidad(parseFloat(e.target.value) || 0)}
                                          className="w-16 p-1 border border-stone-300 rounded text-center text-xs font-bold font-mono outline-none focus:border-orange-500 bg-white"
                                          autoFocus
                                        />
                                        <div className="flex gap-2 items-center justify-center mt-1">
                                          <button
                                            onClick={() => guardarCantidad(row)}
                                            disabled={cargandoAccion}
                                            className="text-emerald-600 hover:text-emerald-700 p-0.5 cursor-pointer"
                                            title="Confirmar"
                                          >
                                            <i className="ti ti-check text-[11px] font-black"></i>
                                          </button>
                                          <button
                                            onClick={() => setFilaEnEdicion(null)}
                                            disabled={cargandoAccion}
                                            className="text-rose-600 hover:text-rose-700 p-0.5 cursor-pointer"
                                            title="Cancelar"
                                          >
                                            <i className="ti ti-x text-[11px] font-black"></i>
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <span
                                        onClick={() => {
                                          if (!cargandoAccion) {
                                            setFilaEnEdicion(row.codigo);
                                            setTempCantidad(row.cantidad);
                                          }
                                        }}
                                        className="cursor-pointer hover:bg-stone-100 hover:text-orange-650 px-2 py-1 rounded transition-all font-bold text-stone-600 inline-flex items-center gap-1"
                                        title="Haga clic para editar cantidad"
                                      >
                                        {row.cantidad} <i className="ti ti-pencil text-[8px] text-stone-400"></i>
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono text-stone-500">${Number(row.precio_unitario || 0).toFixed(2)}</td>
                                  <td className="py-2 px-3 text-right font-mono font-bold text-orange-600">
                                    ${Number(row.precio_total).toFixed(2)}
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    {filaEnConfirmacionEliminar === row.codigo ? (
                                      <div className="flex gap-2 items-center justify-center">
                                        <button
                                          onClick={() => ejecutarEliminarInsumo(row)}
                                          disabled={cargandoAccion}
                                          className="text-emerald-600 hover:text-emerald-700 p-0.5 cursor-pointer"
                                          title="Confirmar"
                                        >
                                          <i className="ti ti-check text-[11px] font-black"></i>
                                        </button>
                                        <button
                                          onClick={() => setFilaEnConfirmacionEliminar(null)}
                                          disabled={cargandoAccion}
                                          className="text-rose-600 hover:text-rose-700 p-0.5 cursor-pointer"
                                          title="Cancelar"
                                        >
                                          <i className="ti ti-x text-[11px] font-black"></i>
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => setFilaEnConfirmacionEliminar(row.codigo)}
                                        disabled={cargandoAccion}
                                        className="text-stone-300 hover:text-rose-600 transition-colors p-1 cursor-pointer"
                                        title="Quitar de la receta"
                                      >
                                        <i className="ti ti-trash text-sm"></i>
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                            {sec.data.length === 0 && (
                              <tr>
                                <td colSpan={7} className="py-4 px-3 text-center text-stone-400 italic">
                                  Sin insumos de esta categoría asignados.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}

                {(() => {
                  const dynamicTotal = seccionesReceta.reduce((sum, sec) => {
                    const subTotal = sec.data.reduce((a: number, r: any) => a + (Number(r.precio_total) || 0), 0);
                    return sum + subTotal;
                  }, 0);
                  return (
                    <div className="bg-stone-950 text-white p-4.5 rounded-2xl shadow-md flex items-center justify-between text-xs font-bold border border-stone-850">
                      <span className="uppercase text-[9px] tracking-wider text-stone-400 font-bold">Total Compuesto de Insumos</span>
                      <strong className="text-base font-mono font-black text-orange-400">
                        ${(dynamicTotal > 0 ? dynamicTotal : Number(rubroSeleccionado.precio_rubro || 0)).toFixed(2)}
                      </strong>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center p-8 text-center text-stone-400">
            <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center text-stone-300 border border-stone-200 mb-4">
              <i className="ti ti-clipboard-list text-2xl"></i>
            </div>
            <strong className="text-stone-700 text-xs">Seleccione un Rubro de Obra</strong>
            <p className="text-[11px] text-stone-400 max-w-xs mt-1">
              Haga clic en cualquiera de los componentes paramétricos en el listado para auditar su receta analítica y rendimientos unitarios.
            </p>
          </div>
        )}
      </div>

      {/* MODAL DE ADICIÓN DE INSUMOS */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-stone-250 shadow-xl max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]">
            {/* Cabecera */}
            <div className="p-5 border-b border-stone-150 bg-stone-50 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest block">Añadir Recurso</span>
                <h3 className="text-xs font-bold text-stone-800 uppercase mt-0.5">
                  {seccionDestino} para la receta
                </h3>
              </div>
              <button
                onClick={() => {
                  setModalAbierto(false);
                  setInsumoElegido(null);
                  setFiltroCatalog('');
                }}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 transition-colors flex items-center justify-center cursor-pointer border border-stone-200"
              >
                <i className="ti ti-x text-sm"></i>
              </button>
            </div>

            {/* Contenido */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              <div className="relative">
                <i className="ti ti-search absolute left-3 top-3 text-stone-400"></i>
                <input
                  type="text"
                  placeholder={`Buscar en el catálogo de ${seccionDestino?.toLowerCase()}...`}
                  value={filtroCatalog}
                  onChange={(e) => setFiltroCatalog(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-xl bg-stone-50 text-xs outline-none focus:border-orange-500 focus:bg-white transition-all shadow-sm"
                />
              </div>

              {/* Lista scrollable de insumos */}
              <div className="border border-stone-200 rounded-2xl divide-y divide-stone-100 max-h-52 overflow-y-auto bg-stone-50">
                {filteredCatalog.map((item) => {
                  const id = item.id_insumo_mat || item.id_insumo_mob || item.id_insumo_eyh || item.id_insumo_transp || item.id || item.id_insumo;
                  const name = getInsumoName(item);
                  const price = getInsumoPrice(item);
                  const unit = getInsumoUnit(item);
                  const esSeleccionado = insumoElegido && (
                    (insumoElegido.id_insumo_mat || insumoElegido.id_insumo_mob || insumoElegido.id_insumo_eyh || insumoElegido.id_insumo_transp || insumoElegido.id || insumoElegido.id_insumo) === id
                  );

                  return (
                    <div
                      key={id}
                      onClick={() => setInsumoElegido(item)}
                      className={`p-3 text-left cursor-pointer hover:bg-white flex items-center justify-between transition-colors ${
                        esSeleccionado ? 'bg-orange-50/50 border-l-4 border-orange-500 font-bold' : ''
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <span className="font-mono text-[8px] text-stone-400 block">COD: {id}</span>
                        <strong className="text-xs text-stone-800 truncate block mt-0.5">{name}</strong>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs text-orange-600 font-mono font-bold block">${Number(price).toFixed(2)}</span>
                        <span className="text-[9px] text-stone-400 block font-semibold uppercase">{unit}</span>
                      </div>
                    </div>
                  );
                })}
                {filteredCatalog.length === 0 && (
                  <div className="p-8 text-center text-xs text-stone-400 italic">
                    No hay recursos coincidentes en el catálogo.
                  </div>
                )}
              </div>

              {/* Si hay insumo seleccionado, pedir cantidad */}
              {insumoElegido && (
                <div className="bg-orange-50/20 border border-orange-100 rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-stone-500 font-semibold">Recurso seleccionado:</span>
                    <strong className="text-stone-800 truncate max-w-[280px]" title={getInsumoName(insumoElegido)}>{getInsumoName(insumoElegido)}</strong>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs text-stone-550 font-bold">Rendimiento / Cantidad:</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="any"
                        value={cantidadAñadir}
                        onChange={(e) => setCantidadAñadir(parseFloat(e.target.value) || 0)}
                        className="w-24 p-2 border border-stone-300 rounded-xl bg-white text-xs font-mono font-bold text-center outline-none focus:border-orange-500"
                        min="0.0001"
                      />
                      <span className="text-xs text-stone-400 font-bold uppercase">{getInsumoUnit(insumoElegido)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Pie de modal */}
            <div className="p-4 bg-stone-50 border-t border-stone-150 flex gap-3 text-xs justify-end">
              <button
                onClick={() => {
                  setModalAbierto(false);
                  setInsumoElegido(null);
                  setFiltroCatalog('');
                }}
                disabled={cargandoAccion}
                className="px-4 py-2.5 border border-stone-300 rounded-xl font-bold bg-white text-stone-600 hover:bg-stone-100 active:bg-stone-200 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarAñadirInsumo}
                disabled={!insumoElegido || cantidadAñadir <= 0 || cargandoAccion}
                className="px-5 py-2.5 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {cargandoAccion && <i className="ti ti-loader-2 spin"></i>}
                Confirmar e Insertar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
