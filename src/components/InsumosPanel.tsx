import React from 'react';

interface InsumosPanelProps {
  categorias: any[];
  categoriaAbierta: string | null;
  setCategoriaAbierta: (cat: string | null) => void;
  insumoSeleccionado: any;
  seleccionarInsumo: (item: any, catKey: string) => void;
  busqueda: string;
  setBusqueda: (v: string) => void;
  listaPorCategoria: (catKey: string) => any[];
  editando: boolean;
  setEditando: (v: boolean) => void;
  tempEdit: any;
  setTempEdit: any;
  iniciarEdicion: () => void;
  cancelarEdicion: () => void;
  guardarCambios: () => void;
  isMobile: boolean;
  vista: string;
  setVista: (v: string) => void;
  getNombre: (item: any) => string;
  getPrecio: (item: any) => any;
  camposExtra: [string, any][];
}

export default function InsumosPanel({
  categorias,
  categoriaAbierta,
  setCategoriaAbierta,
  insumoSeleccionado,
  seleccionarInsumo,
  busqueda,
  setBusqueda,
  listaPorCategoria,
  editando,
  setEditando,
  tempEdit,
  setTempEdit,
  iniciarEdicion,
  cancelarEdicion,
  guardarCambios,
  isMobile,
  vista,
  setVista,
  getNombre,
  getPrecio,
  camposExtra,
}: InsumosPanelProps) {
  return (
    <div className="flex-1 flex overflow-hidden bg-stone-50">
      {/* Panel izquierdo: Lista de categorías e insumos */}
      <div className="w-1/2 border-r border-stone-200 flex flex-col h-full bg-white">
        <div className="p-4 border-b border-stone-200">
          <label className="text-xs font-bold text-stone-500 uppercase tracking-wider block mb-2">
            Catálogo de Recursos de Obra
          </label>
          <div className="relative">
            <i className="ti ti-search absolute left-3 top-3.5 text-stone-400"></i>
            <input
              type="text"
              placeholder="Buscar insumos por designación..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-xl bg-stone-50 text-xs outline-none focus:border-orange-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {categorias.map((cat) => {
            const items = listaPorCategoria(cat.key);
            const isOpen = categoriaAbierta === cat.key;
            return (
              <div key={cat.key} className="border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
                <button
                  onClick={() => setCategoriaAbierta(isOpen ? null : cat.key)}
                  className="w-full p-4 flex items-center gap-3 bg-stone-50 hover:bg-stone-100 transition-colors"
                >
                  <span
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: cat.color + '15' }}
                  >
                    <i className={`ti ${cat.icon} text-sm`} style={{ color: cat.color }}></i>
                  </span>
                  <span className="text-xs font-bold text-stone-800 flex-1 text-left">{cat.label}</span>
                  <span className="text-[10px] bg-stone-200 px-2 py-0.5 rounded-full font-bold text-stone-600">
                    {items.length}
                  </span>
                  <i className={`ti ti-chevron-down text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
                </button>

                {isOpen && (
                  <div className="divide-y divide-stone-100 bg-white">
                    {items.map((item) => {
                      const itemId = item.id_insumo_mat || item.id_insumo_mob || item.id_insumo_eyh || item.id_insumo_transp || item.id || item.id_insumo;
                      const sel = (insumoSeleccionado?.id_insumo_mat || insumoSeleccionado?.id_insumo_mob || insumoSeleccionado?.id_insumo_eyh || insumoSeleccionado?.id_insumo_transp || insumoSeleccionado?.id || insumoSeleccionado?.id_insumo) === itemId;
                      return (
                        <div
                          key={itemId}
                          onClick={() => seleccionarInsumo(item, cat.key)}
                          className={`p-4 cursor-pointer hover:bg-stone-50 flex items-center justify-between transition-colors ${
                            sel ? 'bg-orange-50/50 border-l-4 border-orange-500' : ''
                          }`}
                        >
                          <div className="flex flex-col text-left py-0.5">
                            <span className="text-xs font-bold text-stone-800 truncate max-w-xs">
                              {getNombre(item)}
                            </span>
                            <span className="text-[9px] text-stone-400 font-mono mt-0.5">Cod: {itemId}</span>
                          </div>
                          <div className="text-right flex flex-col items-end">
                            <span className="text-xs font-bold text-orange-600 font-mono">
                              ${getPrecio(item) || '0.00'}
                            </span>
                            <span className="text-[9px] text-stone-400 mt-0.5">{item.unidad || 'U'}</span>
                          </div>
                        </div>
                      );
                    })}
                    {items.length === 0 && (
                      <div className="p-4 text-center text-xs text-stone-400 italic">
                        No se encontraron elementos (Sin coincidencias).
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Panel derecho: Detalles y edición de insumos */}
      <div className="w-1/2 flex flex-col h-full bg-stone-50">
        {insumoSeleccionado ? (
          <div className="p-6 flex flex-col h-full overflow-y-auto space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-stone-100">
                <div className="flex gap-2">
                  <span className="bg-orange-50 text-orange-700 border border-orange-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full select-none">
                    <i className="ti ti-check-double"></i> Verificado
                  </span>
                  <span className="bg-stone-100 text-stone-600 border border-stone-200 text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full select-none">
                    ID: {insumoSeleccionado.id_insumo_mat || insumoSeleccionado.id_insumo_mob || insumoSeleccionado.id_insumo_eyh || insumoSeleccionado.id_insumo_transp || insumoSeleccionado.id || insumoSeleccionado.id_insumo}
                  </span>
                </div>
                {!editando && (
                  <button
                    onClick={iniciarEdicion}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 text-white rounded-xl text-xs font-bold hover:bg-orange-600 transition-colors cursor-pointer"
                  >
                    <i className="ti ti-pencil"></i> Modificar
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Designación Técnica</span>
                {editando ? (
                  <input
                    type="text"
                    value={tempEdit[Object.keys(tempEdit).find((k) => k.includes('name')) || ''] || ''}
                    onChange={(e) => {
                      const key = Object.keys(tempEdit).find((k) => k.includes('name')) || '';
                      setTempEdit((prev: any) => ({ ...prev, [key]: e.target.value }));
                    }}
                    className="w-full p-2.5 border border-stone-300 rounded-xl bg-white text-xs outline-none focus:border-orange-500"
                  />
                ) : (
                  <div className="font-extrabold text-sm text-stone-800 bg-stone-50 p-3.5 rounded-xl border border-stone-200">
                    {getNombre(insumoSeleccionado)}
                  </div>
                )}
              </div>

              <div className="space-y-4 pt-3 border-t border-stone-100">
                {camposExtra.map(([key, val]) => {
                  const isPrice = key.toLowerCase().includes('precio');
                  return (
                    <div key={key} className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                        {key.replace(/_/g, ' ')}
                      </span>
                      {editando ? (
                        isPrice ? (
                          <input
                            type="number"
                            step="0.01"
                            value={tempEdit[key] ?? ''}
                            onChange={(e) =>
                              setTempEdit((prev: any) => ({
                                ...prev,
                                [key]: parseFloat(e.target.value) || 0,
                              }))
                            }
                            className="w-full p-2.5 border border-stone-300 rounded-xl bg-white text-xs font-mono font-bold text-orange-600 outline-none focus:border-orange-500"
                          />
                        ) : (
                          <input
                            type="text"
                            value={tempEdit[key] ?? ''}
                            onChange={(e) =>
                              setTempEdit((prev: any) => ({ ...prev, [key]: e.target.value }))
                            }
                            className="w-full p-2.5 border border-stone-300 rounded-xl bg-white text-xs outline-none focus:border-orange-500"
                          />
                        )
                      ) : (
                        <div
                          className={`p-3 rounded-xl border text-xs min-h-[38px] flex items-center ${
                            isPrice
                              ? 'font-bold font-mono text-orange-600 bg-orange-50/40 border-orange-100'
                              : 'bg-stone-50 border-stone-200 text-stone-700'
                          }`}
                        >
                          {isPrice && val ? '$ ' + Number(val).toFixed(2) : (val || '—')}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {editando && (
              <div className="flex gap-3 text-xs w-full">
                <button
                  onClick={cancelarEdicion}
                  className="flex-1 py-3 border border-stone-300 rounded-xl font-bold bg-white text-stone-600 hover:bg-stone-50 active:bg-stone-100 cursor-pointer transition-colors"
                >
                  Descartar Cambios
                </button>
                <button
                  onClick={guardarCambios}
                  className="flex-1 py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 cursor-pointer transition-colors"
                >
                  Consolidar Datos
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center p-8 text-center text-stone-400">
            <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center text-stone-300 border border-stone-200 mb-4">
              <i className="ti ti-box text-2xl"></i>
            </div>
            <strong className="text-stone-700 text-xs">Seleccione un Recurso</strong>
            <p className="text-[11px] text-stone-400 max-w-xs mt-1">
              Explore las categorías en el catálogo para auditar precios, proveedores e índices del rubro.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
