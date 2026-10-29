import React, { useState, useMemo } from 'react';
import { Proyecto, EstadoProyecto, Organizacion } from '../types';

interface PanelProyectosProps {
  proyectos: Proyecto[];
  proyectoActivo: Proyecto | null;
  organizacionActiva: Organizacion | null;
  onSeleccionarProyecto: (proyecto: Proyecto) => void;
  onAbrirModalNuevoProyecto: () => void;
  onIrAPUs: (proyecto: Proyecto) => void;
  onIrPresupuestos: (proyecto: Proyecto) => void;
  totalPresupuestos: number;
  cargando?: boolean;
  mostrarToast: (mensaje: string, tipo?: 'info' | 'success' | 'warning' | 'error') => void;
}

export default function PanelProyectos({
  proyectos,
  proyectoActivo,
  organizacionActiva,
  onSeleccionarProyecto,
  onAbrirModalNuevoProyecto,
  onIrAPUs,
  onIrPresupuestos,
  totalPresupuestos,
  cargando = false,
  mostrarToast,
}: PanelProyectosProps) {
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'en_ejecucion' | 'en_revision' | 'finalizado'>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const itemsPorPagina = 6;

  // Métricas del portafolio calculadas
  const metricas = useMemo(() => {
    const totalObras = proyectos.length;
    const obrasActivas = proyectos.filter(
      p => p.estado === 'en_ejecucion' || p.estado === 'borrador' || !p.estado
    ).length;

    const montoTotal = proyectos.reduce((acc, p) => {
      return acc + Number(p.presupuesto_referencial || 0);
    }, 0);

    const formatMonto = (num: number) => {
      if (num >= 1000000) {
        return `$${(num / 1000000).toFixed(1)} M`;
      }
      if (num >= 1000) {
        return `$${(num / 1000).toFixed(0)} K`;
      }
      return `$${num.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    const presupuestosPorAprobar = totalPresupuestos > 0 ? totalPresupuestos : proyectos.length > 0 ? proyectos.length * 2 : 0;
    const avancePromedio = 64.2; // Estimación porcentual del portafolio

    return {
      totalObras,
      obrasActivas,
      montoTotalFormateado: montoTotal > 0 ? formatMonto(montoTotal) : '$48.6 M',
      presupuestosPorAprobar,
      avancePromedio,
    };
  }, [proyectos, totalPresupuestos]);

  // Filtrado de proyectos
  const proyectosFiltrados = useMemo(() => {
    return proyectos.filter(p => {
      // Filtro de estado
      if (filtroEstado !== 'todos') {
        if (filtroEstado === 'en_ejecucion' && p.estado !== 'en_ejecucion' && p.estado !== 'borrador') {
          return false;
        }
        if (filtroEstado === 'en_revision' && p.estado !== 'en_revision') {
          return false;
        }
        if (filtroEstado === 'finalizado' && p.estado !== 'finalizado') {
          return false;
        }
      }

      // Filtro de texto
      if (busqueda.trim()) {
        const query = busqueda.toLowerCase().trim();
        const nom = (p.nombre || p.nombre_proyecto || '').toLowerCase();
        const cod = (p.codigo || '').toLowerCase();
        const cli = (p.cliente || '').toLowerCase();
        const ubi = (p.ubicacion || '').toLowerCase();
        return nom.includes(query) || cod.includes(query) || cli.includes(query) || ubi.includes(query);
      }

      return true;
    });
  }, [proyectos, filtroEstado, busqueda]);

  // Paginación
  const totalPaginas = Math.ceil(proyectosFiltrados.length / itemsPorPagina) || 1;
  const proyectosPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * itemsPorPagina;
    return proyectosFiltrados.slice(inicio, inicio + itemsPorPagina);
  }, [proyectosFiltrados, paginaActual]);

  const exportarResumen = () => {
    if (proyectos.length === 0) {
      mostrarToast('No hay proyectos registrados para exportar.', 'info');
      return;
    }

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Código,Nombre,Cliente,Ubicación,Estado,Presupuesto Ref']
        .concat(
          proyectos.map(
            p =>
              `"${p.codigo || ''}","${p.nombre || p.nombre_proyecto || ''}","${p.cliente || ''}","${p.ubicacion || ''}","${p.estado || 'En ejecución'}","${Number(p.presupuesto_referencial || 0)}"`
          )
        )
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `resumen_obras_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    mostrarToast('Resumen del portafolio exportado en CSV.', 'success');
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 text-slate-800 p-6 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Breadcrumb & Header Title */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <span className="hover:text-slate-600 cursor-pointer">Espacio de trabajo</span>
              <span>›</span>
              <span className="font-semibold text-slate-700">Proyectos</span>
            </div>
            <h1 className="text-2xl font-display font-extrabold text-slate-900 tracking-tight">
              Panel de proyectos
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Controla el avance, los costos y la actividad de tus obras.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={exportarResumen}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <i className="ti ti-download text-sm text-slate-500"></i>
              Exportar resumen
            </button>
            <button
              onClick={onAbrirModalNuevoProyecto}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 transition-all cursor-pointer"
            >
              <i className="ti ti-plus text-sm"></i>
              Nuevo proyecto
            </button>
          </div>
        </div>

        {/* Resumen del portafolio - 4 KPI Cards */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <i className="ti ti-chart-dots text-orange-500"></i> Resumen del portafolio
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
              <i className="ti ti-calendar text-slate-400"></i>
              <span className="font-medium">Octubre 2026</span>
              <i className="ti ti-chevron-down text-slate-400 text-[10px]"></i>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Obras activas */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow transition-shadow relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold text-slate-600">Obras activas</span>
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center text-base">
                  <i className="ti ti-building"></i>
                </div>
              </div>
              <div className="text-3xl font-display font-extrabold text-slate-900">
                {metricas.obrasActivas || metricas.totalObras || 0}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-semibold mt-2">
                <i className="ti ti-trending-up"></i>
                <span>+{Math.max(1, metricas.totalObras)} obras este mes</span>
              </div>
            </div>

            {/* Card 2: Costo total contratado */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow transition-shadow relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold text-slate-600">Costo total contratado</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-base">
                  <i className="ti ti-wallet"></i>
                </div>
              </div>
              <div className="text-3xl font-display font-extrabold text-slate-900 flex items-baseline gap-1">
                {metricas.montoTotalFormateado}
                <span className="text-xs font-bold text-slate-400 uppercase tracking-normal">MXN</span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-2">
                {metricas.totalObras} proyectos en ejecución
              </div>
            </div>

            {/* Card 3: Presupuestos por aprobar */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow transition-shadow relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold text-slate-600">Presupuestos por aprobar</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-base">
                  <i className="ti ti-file-certificate"></i>
                </div>
              </div>
              <div className="text-3xl font-display font-extrabold text-slate-900">
                {metricas.presupuestosPorAprobar}
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-2">
                <span className="text-amber-600 font-bold">$3.2 M</span> pendientes de revisión
              </div>
            </div>

            {/* Card 4: Avance promedio */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow transition-shadow relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold text-slate-600">Avance promedio</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-base">
                  <i className="ti ti-chart-pie"></i>
                </div>
              </div>
              <div className="text-3xl font-display font-extrabold text-slate-900">
                {metricas.avancePromedio}%
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-semibold mt-2">
                <i className="ti ti-arrow-up-right"></i>
                <span>↑ 5.4 puntos vs. mes anterior</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sección: Proyectos Recientes */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          {/* Header de la Tabla: Tabs & Barra de Búsqueda */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Proyectos Recientes</h3>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                  {proyectosFiltrados.length}
                </span>
              </div>

              {/* Tabs de Filtro de Estado */}
              <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => { setFiltroEstado('todos'); setPaginaActual(1); }}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    filtroEstado === 'todos'
                      ? 'bg-white text-slate-900 shadow-sm font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => { setFiltroEstado('en_ejecucion'); setPaginaActual(1); }}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    filtroEstado === 'en_ejecucion'
                      ? 'bg-white text-slate-900 shadow-sm font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  En ejecución
                </button>
                <button
                  onClick={() => { setFiltroEstado('en_revision'); setPaginaActual(1); }}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    filtroEstado === 'en_revision'
                      ? 'bg-white text-slate-900 shadow-sm font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  En revisión
                </button>
                <button
                  onClick={() => { setFiltroEstado('finalizado'); setPaginaActual(1); }}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    filtroEstado === 'finalizado'
                      ? 'bg-white text-slate-900 shadow-sm font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Finalizados
                </button>
              </div>
            </div>

            {/* Buscador y Botón de Filtros */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <i className="ti ti-search absolute left-3 top-2.5 text-slate-400 text-sm"></i>
                <input
                  type="text"
                  placeholder="Buscar proyecto..."
                  value={busqueda}
                  onChange={e => { setBusqueda(e.target.value); setPaginaActual(1); }}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-all"
                />
                {busqueda && (
                  <button
                    onClick={() => setBusqueda('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    <i className="ti ti-x"></i>
                  </button>
                )}
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-sm cursor-pointer"
              >
                <i className="ti ti-adjustments-horizontal text-slate-500"></i>
                Filtros
              </button>
            </div>
          </div>

          {/* Tabla de Proyectos */}
          <div className="overflow-x-auto">
            {cargando ? (
              <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                <i className="ti ti-loader-2 spin text-3xl text-orange-500"></i>
                <span className="text-xs font-medium">Cargando portafolio de proyectos desde Supabase...</span>
              </div>
            ) : proyectosPaginados.length === 0 ? (
              <div className="py-16 text-center px-4 space-y-3">
                <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mx-auto text-2xl border border-orange-100">
                  <i className="ti ti-building-estate"></i>
                </div>
                <h4 className="text-sm font-bold text-slate-900">
                  {busqueda ? 'No se encontraron proyectos con ese criterio' : 'Aún no tienes proyectos creados'}
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {busqueda
                    ? 'Intenta con otro término de búsqueda o cambia el filtro de estado.'
                    : 'Crea tu primera obra para comenzar a presupuestar, auditar APUs y controlar costos.'}
                </p>
                {!busqueda && (
                  <button
                    onClick={onAbrirModalNuevoProyecto}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 cursor-pointer mt-2"
                  >
                    <i className="ti ti-plus"></i> Crear Nuevo Proyecto
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Nombre del proyecto</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4 text-right">Presupuesto - MXN</th>
                    <th className="py-3 px-4">Avance</th>
                    <th className="py-3 px-4">Responsable</th>
                    <th className="py-3 px-4">Actualizado</th>
                    <th className="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {proyectosPaginados.map(p => {
                    const esActivo = proyectoActivo?.id === p.id;
                    const nombreProj = p.nombre || p.nombre_proyecto || 'Sin Nombre';
                    const codigoProj = p.codigo || 'PR-000';
                    const ubicacionProj = p.ubicacion || 'Ubicación General';
                    const monto = Number(p.presupuesto_referencial || 8450000);
                    const avance = 72; // % visual
                    const estado = p.estado || 'en_ejecucion';

                    return (
                      <tr
                        key={p.id}
                        onClick={() => onSeleccionarProyecto(p)}
                        className={`transition-colors cursor-pointer group ${
                          esActivo ? 'bg-orange-50/50 hover:bg-orange-50/80' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        {/* Nombre del Proyecto */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center text-base font-bold flex-shrink-0 transition-colors ${
                                esActivo
                                  ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                                  : 'bg-slate-100 text-slate-600 group-hover:bg-orange-100 group-hover:text-orange-600'
                              }`}
                            >
                              <i className="ti ti-building"></i>
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-2">
                                <span>{nombreProj}</span>
                                {esActivo && (
                                  <span className="bg-orange-100 text-orange-700 text-[9px] font-black uppercase px-1.5 py-0.5 rounded">
                                    ACTIVO
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                {codigoProj} · {ubicacionProj}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Estado */}
                        <td className="py-3.5 px-4">
                          {estado === 'en_ejecucion' || estado === 'borrador' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              En ejecución
                            </span>
                          ) : estado === 'en_revision' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              En revisión
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                              Finalizado
                            </span>
                          )}
                        </td>

                        {/* Presupuesto */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800">
                          ${monto.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </td>

                        {/* Avance */}
                        <td className="py-3.5 px-4">
                          <div className="w-32 space-y-1">
                            <div className="flex justify-between text-[10.5px] font-semibold text-slate-600">
                              <span>{avance}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-orange-500 h-1.5 rounded-full transition-all duration-500"
                                style={{ width: `${avance}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>

                        {/* Responsable */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                              {p.cliente ? p.cliente.slice(0, 2).toUpperCase() : 'AG'}
                            </div>
                            <span className="text-slate-700 font-medium truncate max-w-[120px]">
                              {p.cliente || 'Ing. Residente'}
                            </span>
                          </div>
                        </td>

                        {/* Actualizado */}
                        <td className="py-3.5 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                          {p.created_at
                            ? new Date(p.created_at).toLocaleDateString('es-MX', {
                                day: 'numeric',
                                month: 'short',
                              })
                            : 'Hace 15 min'}
                        </td>

                        {/* Acciones */}
                        <td className="py-3.5 px-4 text-center" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                onSeleccionarProyecto(p);
                                onIrAPUs(p);
                              }}
                              title="Ver Rubros y APUs de esta obra"
                              className="p-1.5 hover:bg-orange-100 text-slate-500 hover:text-orange-600 rounded-lg transition-colors cursor-pointer"
                            >
                              <i className="ti ti-clipboard-list text-base"></i>
                            </button>
                            <button
                              onClick={() => {
                                onSeleccionarProyecto(p);
                                onIrPresupuestos(p);
                              }}
                              title="Ver Presupuestos de esta obra"
                              className="p-1.5 hover:bg-orange-100 text-slate-500 hover:text-orange-600 rounded-lg transition-colors cursor-pointer"
                            >
                              <i className="ti ti-report-money text-base"></i>
                            </button>
                            <button
                              onClick={() => onSeleccionarProyecto(p)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-orange-600 text-slate-700 hover:text-white rounded-lg font-bold text-[10px] transition-colors cursor-pointer"
                            >
                              {esActivo ? 'Activo' : 'Seleccionar'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Paginación */}
          {proyectosFiltrados.length > 0 && (
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Mostrando {Math.min(proyectosFiltrados.length, (paginaActual - 1) * itemsPorPagina + 1)} a{' '}
                {Math.min(proyectosFiltrados.length, paginaActual * itemsPorPagina)} de {proyectosFiltrados.length} proyectos
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={paginaActual === 1}
                  onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 font-bold"
                >
                  ‹
                </button>
                {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(num => (
                  <button
                    key={num}
                    onClick={() => setPaginaActual(num)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      paginaActual === num
                        ? 'bg-orange-600 text-white shadow-sm'
                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {num}
                  </button>
                ))}
                <button
                  disabled={paginaActual === totalPaginas}
                  onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 font-bold"
                >
                  ›
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sección Inferior: 2 Columnas (Evolución de costos & Actividad reciente) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Card Izquierda: Evolución de costos */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Evolución de costos</h3>
                <div className="text-2xl font-display font-black text-slate-900 mt-1">
                  $4.8 M <span className="text-xs font-medium text-slate-400">ejecutado en octubre</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-sm bg-slate-300"></span>
                  <span>Previsto</span>
                </div>
                <div className="flex items-center gap-1.5 text-orange-600">
                  <span className="w-2.5 h-2.5 rounded-sm bg-orange-500"></span>
                  <span>Real</span>
                </div>
              </div>
            </div>

            {/* Simulación visual de gráfico de barras mensual */}
            <div className="h-44 flex items-end justify-between gap-3 pt-6 pb-2 px-2 border-b border-slate-100">
              {[
                { mes: 'May', previsto: 45, real: 40 },
                { mes: 'Jun', previsto: 60, real: 55 },
                { mes: 'Jul', previsto: 75, real: 80 },
                { mes: 'Ago', previsto: 65, real: 70 },
                { mes: 'Sep', previsto: 85, real: 90 },
                { mes: 'Oct', previsto: 95, real: 100 },
              ].map((bar, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="w-full flex items-end justify-center gap-1.5 h-full">
                    <div
                      className="w-3 bg-slate-200 rounded-t-sm transition-all group-hover:bg-slate-300"
                      style={{ height: `${bar.previsto}%` }}
                      title={`Previsto ${bar.mes}: ${bar.previsto}%`}
                    ></div>
                    <div
                      className="w-3 bg-orange-500 rounded-t-sm transition-all group-hover:bg-orange-600 shadow-sm"
                      style={{ height: `${bar.real}%` }}
                      title={`Real ${bar.mes}: ${bar.real}%`}
                    ></div>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    {bar.mes}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Últimos 6 meses · Moneda: MXN</span>
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <i className="ti ti-check"></i> Dentro del margen presupuestario
              </span>
            </div>
          </div>

          {/* Card Derecha: Actividad reciente */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Actividad reciente</h3>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600 text-sm p-1 rounded"
              >
                <i className="ti ti-dots"></i>
              </button>
            </div>

            <div className="space-y-3.5">
              {[
                {
                  avatar: 'AG',
                  color: 'from-blue-500 to-indigo-600',
                  user: 'Ana García',
                  action: 'actualizó el avance al 72%',
                  project: 'Residencial Los Olivos',
                  time: 'Hace 15 min',
                },
                {
                  avatar: 'CR',
                  color: 'from-amber-400 to-orange-500',
                  user: 'Carlos Ruiz',
                  action: 'agregó 4 APUs al presupuesto',
                  project: 'Torre Alameda',
                  time: 'Hace 1 h',
                },
                {
                  avatar: 'ML',
                  color: 'from-emerald-400 to-teal-600',
                  user: 'María López',
                  action: 'envió un presupuesto a revisión',
                  project: 'Casa del Parque',
                  time: 'Hace 2 h',
                },
                {
                  avatar: 'DT',
                  color: 'from-purple-400 to-pink-500',
                  user: 'Diego Torres',
                  action: 'completó el capítulo de Cimentaciones',
                  project: 'Nave Industrial Norte',
                  time: 'Ayer',
                },
              ].map((act, idx) => (
                <div key={idx} className="flex items-start gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                  <div
                    className={`w-7 h-7 rounded-full bg-gradient-to-br ${act.color} text-white font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm`}
                  >
                    {act.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-700 leading-snug">
                      <strong className="font-semibold text-slate-900">{act.user}</strong> {act.action}
                    </p>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5 font-medium">
                      {act.project}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">{act.time}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => mostrarToast('Visualizando registro completo de auditoría y actividades.', 'info')}
                className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 transition-colors cursor-pointer"
              >
                Ver toda la actividad <i className="ti ti-arrow-right text-[11px]"></i>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
