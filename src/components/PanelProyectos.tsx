import React, { useState, useMemo } from 'react';
import { Proyecto, EstadoProyecto, Organizacion, Presupuesto } from '../types';

interface PanelProyectosProps {
  proyectos: Proyecto[];
  presupuestos?: Presupuesto[];
  actividades?: any[];
  proyectoActivo: Proyecto | null;
  organizacionActiva: Organizacion | null;
  onSeleccionarProyecto: (proyecto: Proyecto) => void;
  onAbrirModalNuevoProyecto: () => void;
  onIrAPUs: (proyecto: Proyecto) => void;
  onIrPresupuestos: (proyecto: Proyecto) => void;
  onActualizarProyecto?: (proyecto: Partial<Proyecto> & { id: string }) => Promise<void>;
  totalPresupuestos: number;
  cargando?: boolean;
  mostrarToast: (mensaje: string, tipo?: 'info' | 'success' | 'warning' | 'error') => void;
}

export default function PanelProyectos({
  proyectos,
  presupuestos = [],
  actividades = [],
  proyectoActivo,
  organizacionActiva,
  onSeleccionarProyecto,
  onAbrirModalNuevoProyecto,
  onIrAPUs,
  onIrPresupuestos,
  onActualizarProyecto,
  totalPresupuestos,
  cargando = false,
  mostrarToast,
}: PanelProyectosProps) {
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'borrador' | 'en_ejecucion' | 'en_revision' | 'finalizado'>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const itemsPorPagina = 6;

  // Estado del modal de edición de obra
  const [obraParaEditar, setObraParaEditar] = useState<Proyecto | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editCodigo, setEditCodigo] = useState('');
  const [editCliente, setEditCliente] = useState('');
  const [editUbicacion, setEditUbicacion] = useState('');
  const [editPresupuesto, setEditPresupuesto] = useState<number | ''>(0);
  const [editAvance, setEditAvance] = useState<number>(0);
  const [editEstado, setEditEstado] = useState<EstadoProyecto>('borrador');
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  const abrirModalEditar = (p: Proyecto) => {
    setObraParaEditar(p);
    setEditNombre(p.nombre || p.nombre_proyecto || '');
    setEditCodigo(p.codigo || '');
    setEditCliente(p.cliente || '');
    setEditUbicacion(p.ubicacion || '');
    setEditPresupuesto(p.presupuesto_referencial ?? 0);
    setEditAvance(Number(p.porcentaje_avance ?? (p.estado === 'finalizado' ? 100 : 0)));
    setEditEstado((p.estado as EstadoProyecto) || 'borrador');
  };

  const cerrarModalEditar = () => {
    setObraParaEditar(null);
  };

  const guardarEdicionObra = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!obraParaEditar || !onActualizarProyecto) return;

    if (!editNombre.trim()) {
      mostrarToast('El nombre del proyecto no puede estar vacío.', 'warning');
      return;
    }

    setGuardandoEdicion(true);
    try {
      await onActualizarProyecto({
        id: obraParaEditar.id,
        nombre: editNombre.trim(),
        codigo: editCodigo.trim().toUpperCase() || null,
        cliente: editCliente.trim() || null,
        ubicacion: editUbicacion.trim() || null,
        presupuesto_referencial: Number(editPresupuesto) || 0,
        porcentaje_avance: Number(editAvance) || 0,
        estado: editEstado,
      });
      cerrarModalEditar();
    } catch (err: any) {
      console.error(err);
      mostrarToast('No se pudo guardar la información de la obra.', 'error');
    } finally {
      setGuardandoEdicion(false);
    }
  };

  // ── 1. MÉTRICAS REALES CALCULADAS DESDE LA BASE DE DATOS ───────────────────
  const metricas = useMemo(() => {
    const totalObras = proyectos.length;
    const obrasActivas = proyectos.filter(p => p.estado !== 'finalizado').length;

    // Suma real del presupuesto referencial de los proyectos
    const montoTotal = proyectos.reduce((acc, p) => {
      return acc + Number(p.presupuesto_referencial || 0);
    }, 0);

    const formatMonto = (num: number) => {
      if (num === 0) return '$0.00';
      if (num >= 1000000) {
        return `$${(num / 1000000).toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} M`;
      }
      if (num >= 1000) {
        return `$${(num / 1000).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 1 })} K`;
      }
      return `$${num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // Obras creadas en el mes en curso
    const now = new Date();
    const obrasNuevasMes = proyectos.filter(p => {
      if (!p.created_at) return false;
      const d = new Date(p.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    // Presupuestos en revisión o borrador
    const presupuestosPorAprobar = (presupuestos || []).filter(
      pr => pr.estado === 'borrador' || pr.estado === 'en_revision'
    ).length;

    // Avance promedio matemático real
    const totalAvance = proyectos.reduce((acc, p) => {
      const avanceVal = Number(p.porcentaje_avance ?? (p.estado === 'finalizado' ? 100 : 0));
      return acc + avanceVal;
    }, 0);
    const avancePromedio = totalObras > 0 ? (totalAvance / totalObras).toFixed(1) : '0.0';

    const obrasFinalizadas = proyectos.filter(
      p => p.estado === 'finalizado' || Number(p.porcentaje_avance || 0) >= 100
    ).length;

    return {
      totalObras,
      obrasActivas,
      obrasNuevasMes,
      montoTotal,
      montoTotalFormateado: formatMonto(montoTotal),
      presupuestosPorAprobar,
      totalPresupuestosBD: presupuestos && presupuestos.length > 0 ? presupuestos.length : totalPresupuestos,
      avancePromedio,
      obrasFinalizadas,
    };
  }, [proyectos, presupuestos, totalPresupuestos]);

  // ── 2. FILTRADO DE PROYECTOS ─────────────────────────────────────────────
  const proyectosFiltrados = useMemo(() => {
    return proyectos.filter(p => {
      // Filtro de estado
      if (filtroEstado !== 'todos') {
        if (filtroEstado === 'borrador' && p.estado !== 'borrador') return false;
        if (filtroEstado === 'en_ejecucion' && p.estado !== 'en_ejecucion') return false;
        if (filtroEstado === 'en_revision' && p.estado !== 'en_revision') return false;
        if (filtroEstado === 'finalizado' && p.estado !== 'finalizado') return false;
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

  // ── 3. EVOLUCIÓN MENSUAL REAL CALCULADA DESDE LA BD ──────────────────────
  const datosEvolucion = useMemo(() => {
    const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const now = new Date();
    const meses = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mIdx = d.getMonth();
      const anio = d.getFullYear();
      const nombreMes = mesesNombres[mIdx];

      // Proyectos de la BD en este mes
      const proysMes = proyectos.filter(p => {
        if (!p.created_at) return false;
        const pd = new Date(p.created_at);
        return pd.getMonth() === mIdx && pd.getFullYear() === anio;
      });

      const montoMes = proysMes.reduce((acc, p) => acc + Number(p.presupuesto_referencial || 0), 0);

      meses.push({
        mes: nombreMes,
        anio,
        conteo: proysMes.length,
        monto: montoMes,
      });
    }

    const maxMonto = Math.max(...meses.map(r => r.monto), 1);

    return meses.map(r => ({
      ...r,
      alturaPct: r.monto > 0 ? Math.max(20, Math.min(100, Math.round((r.monto / maxMonto) * 100))) : (r.conteo > 0 ? 30 : 6),
    }));
  }, [proyectos]);

  // ── 4. ACTIVIDADES REALES DE LA BITÁCORA DE SUPABASE ───────────────────────
  const listaActividades = useMemo(() => {
    if (actividades && actividades.length > 0) {
      return actividades.map(act => {
        const email = act.actor_email || 'Sistema';
        const iniciales = email.substring(0, 2).toUpperCase();
        const tabla = act.tabla_nombre || 'registro';
        const vals = act.valores_nuevos || {};
        const op = act.operacion || 'UPDATE';

        let accion = 'modificó un registro';
        let detalle = vals.nombre || vals.codigo || tabla;

        if (tabla === 'proyectos') {
          accion = op === 'INSERT' ? 'registró la obra' : op === 'DELETE' ? 'eliminó la obra' : 'actualizó la obra';
          detalle = vals.nombre ? `"${vals.nombre}"` : (vals.codigo ? `[${vals.codigo}]` : 'Obra');
        } else if (tabla === 'presupuestos') {
          accion = op === 'INSERT' ? 'creó el presupuesto' : 'actualizó el presupuesto';
          detalle = vals.nombre ? `"${vals.nombre}"` : 'Presupuesto';
        } else if (tabla === 'insumos') {
          accion = op === 'INSERT' ? 'agregó al catálogo' : 'modificó el insumo';
          detalle = vals.nombre ? `"${vals.nombre}"` : 'Insumo';
        } else if (tabla === 'rubros') {
          accion = op === 'INSERT' ? 'creó el APU' : 'modificó el APU';
          detalle = vals.nombre ? `"${vals.nombre}"` : 'Rubro APU';
        }

        // Formato relativo de tiempo
        let tiempoStr = 'Reciente';
        if (act.fecha_hora) {
          const diffMs = Date.now() - new Date(act.fecha_hora).getTime();
          const mins = Math.floor(diffMs / 60000);
          const horas = Math.floor(mins / 60);
          const dias = Math.floor(horas / 24);

          if (mins < 1) tiempoStr = 'Hace un momento';
          else if (mins < 60) tiempoStr = `Hace ${mins} min`;
          else if (horas < 24) tiempoStr = `Hace ${horas} h`;
          else if (dias === 1) tiempoStr = 'Ayer';
          else tiempoStr = new Date(act.fecha_hora).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
        }

        return {
          id: act.id,
          iniciales,
          usuario: email.split('@')[0],
          accion,
          detalle,
          tiempo: tiempoStr,
        };
      });
    }

    // Fallback con eventos reales basados en proyectos de la BD
    return proyectos.slice(0, 5).map(p => {
      const tiempoStr = p.created_at
        ? new Date(p.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
        : 'Reciente';
      return {
        id: p.id,
        iniciales: (p.cliente || p.nombre || 'OB').substring(0, 2).toUpperCase(),
        usuario: p.cliente || 'Responsable',
        accion: 'registró la obra en Supabase',
        detalle: `"${p.nombre || p.nombre_proyecto || 'Sin Nombre'}"`,
        tiempo: tiempoStr,
      };
    });
  }, [actividades, proyectos]);

  const exportarResumen = () => {
    if (proyectos.length === 0) {
      mostrarToast('No hay proyectos registrados para exportar.', 'info');
      return;
    }

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Código,Nombre,Cliente,Ubicación,Estado,Presupuesto Ref,Avance %']
        .concat(
          proyectos.map(
            p =>
              `"${p.codigo || ''}","${p.nombre || p.nombre_proyecto || ''}","${p.cliente || ''}","${p.ubicacion || ''}","${p.estado || 'borrador'}","${Number(p.presupuesto_referencial || 0)}","${Number(p.porcentaje_avance || 0)}%"`
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
              <span className="text-slate-700 font-semibold">Proyectos</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-display">
              Panel de proyectos
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Supervisión de obras, presupuestos y costos en tiempo real ({organizacionActiva?.nombre || 'Mi Constructora'}).
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={exportarResumen}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            >
              <i className="ti ti-download text-slate-400"></i>
              <span>Exportar resumen</span>
            </button>
            <button
              onClick={onAbrirModalNuevoProyecto}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-orange-500/20 transition-all cursor-pointer"
            >
              <i className="ti ti-plus"></i>
              <span>Nuevo proyecto</span>
            </button>
          </div>
        </div>

        {/* ── 4 TARJETAS KPI (RESUMEN DEL PORTAFOLIO REAL) ───────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <i className="ti ti-chart-dots text-orange-500"></i>
              <span>Resumen del portafolio</span>
            </h2>
            <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200/80 shadow-2xs">
              <i className="ti ti-calendar"></i>
              <span>{new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* KPI 1: Obras activas */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-3">
                <span className="text-xs font-semibold">Obras activas</span>
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center text-sm">
                  <i className="ti ti-building"></i>
                </div>
              </div>
              <div className="text-3xl font-display font-extrabold text-slate-900">
                {metricas.obrasActivas}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold mt-2">
                {metricas.obrasNuevasMes > 0 ? (
                  <span className="text-emerald-600 flex items-center gap-1">
                    <i className="ti ti-trending-up"></i>
                    +{metricas.obrasNuevasMes} registrada(s) este mes
                  </span>
                ) : (
                  <span className="text-slate-400">
                    {metricas.totalObras} obra(s) totales en BD
                  </span>
                )}
              </div>
            </div>

            {/* KPI 2: Presupuesto Total Referencial */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-3">
                <span className="text-xs font-semibold">Costo total contratado</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm">
                  <i className="ti ti-wallet"></i>
                </div>
              </div>
              <div className="text-3xl font-display font-extrabold text-slate-900 truncate">
                {metricas.montoTotalFormateado}
                <span className="text-xs font-semibold text-slate-400 ml-1.5">MXN</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold mt-2">
                <span>{metricas.obrasActivas} obra(s) en fase operativa</span>
              </div>
            </div>

            {/* KPI 3: Presupuestos por aprobar */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-3">
                <span className="text-xs font-semibold">Presupuestos por aprobar</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-sm">
                  <i className="ti ti-file-certificate"></i>
                </div>
              </div>
              <div className="text-3xl font-display font-extrabold text-slate-900">
                {metricas.presupuestosPorAprobar}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold mt-2">
                <span className="text-amber-600">
                  {metricas.totalPresupuestosBD} presupuesto(s) en total
                </span>
              </div>
            </div>

            {/* KPI 4: Avance promedio */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-3">
                <span className="text-xs font-semibold">Avance promedio</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-sm">
                  <i className="ti ti-chart-pie"></i>
                </div>
              </div>
              <div className="text-3xl font-display font-extrabold text-slate-900">
                {metricas.avancePromedio}%
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold mt-2">
                <span>{metricas.obrasFinalizadas} obra(s) completada(s)</span>
              </div>
            </div>

          </div>
        </div>

        {/* ── SECCIÓN: TABLA DE PROYECTOS RECIENTES ─────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          
          {/* Header de la Tabla: Tabs & Buscador */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Proyectos Recientes</h3>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                  {proyectosFiltrados.length}
                </span>
              </div>

              {/* Tabs de Filtro de Estado */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => { setFiltroEstado('todos'); setPaginaActual(1); }}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    filtroEstado === 'todos'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Todos ({proyectos.length})
                </button>
                <button
                  onClick={() => { setFiltroEstado('borrador'); setPaginaActual(1); }}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    filtroEstado === 'borrador'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Borrador ({proyectos.filter(p => p.estado === 'borrador' || !p.estado).length})
                </button>
                <button
                  onClick={() => { setFiltroEstado('en_ejecucion'); setPaginaActual(1); }}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    filtroEstado === 'en_ejecucion'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  En ejecución ({proyectos.filter(p => p.estado === 'en_ejecucion').length})
                </button>
                <button
                  onClick={() => { setFiltroEstado('en_revision'); setPaginaActual(1); }}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    filtroEstado === 'en_revision'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  En revisión ({proyectos.filter(p => p.estado === 'en_revision').length})
                </button>
                <button
                  onClick={() => { setFiltroEstado('finalizado'); setPaginaActual(1); }}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    filtroEstado === 'finalizado'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Finalizados ({proyectos.filter(p => p.estado === 'finalizado').length})
                </button>
              </div>
            </div>

            {/* Buscador */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <i className="ti ti-search absolute left-3 top-2.5 text-slate-400 text-sm"></i>
                <input
                  type="text"
                  placeholder="Buscar obra, cliente o código..."
                  value={busqueda}
                  onChange={e => { setBusqueda(e.target.value); setPaginaActual(1); }}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-all shadow-2xs"
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
            </div>
          </div>

          {/* Contenedor de la Tabla */}
          <div className="overflow-x-auto">
            {cargando ? (
              <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                <i className="ti ti-loader-2 spin text-3xl text-orange-500"></i>
                <span className="text-xs font-medium">Sincronizando obras con Supabase...</span>
              </div>
            ) : proyectosPaginados.length === 0 ? (
              <div className="py-16 text-center px-4 space-y-3">
                <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mx-auto text-2xl border border-orange-100">
                  <i className="ti ti-building-estate"></i>
                </div>
                <h4 className="text-sm font-bold text-slate-900">
                  {busqueda ? 'No se encontraron obras coincidentes' : 'No tienes obras registradas en esta constructora'}
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {busqueda
                    ? 'Prueba con otro término de búsqueda o limpia los filtros activos.'
                    : 'Crea tu primera obra para comenzar a presupuestar, armar APUs y supervisar costos en tiempo real.'}
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
                    <th className="py-3 px-4 text-right">Presupuesto Ref.</th>
                    <th className="py-3 px-4">Avance</th>
                    <th className="py-3 px-4">Cliente / Resp.</th>
                    <th className="py-3 px-4">Registrado</th>
                    <th className="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {proyectosPaginados.map(p => {
                    const esActivo = proyectoActivo?.id === p.id;
                    const nombreProj = p.nombre || p.nombre_proyecto || 'Sin Nombre';
                    const codigoProj = p.codigo || 'S/C';
                    const ubicacionProj = p.ubicacion || 'Sin ubicación registrada';
                    const monto = Number(p.presupuesto_referencial || 0);
                    const avance = Number(p.porcentaje_avance ?? (p.estado === 'finalizado' ? 100 : 0));
                    const estado = p.estado || 'borrador';
                    const clienteStr = p.cliente || 'Sin cliente';

                    return (
                      <tr
                        key={p.id}
                        onClick={() => onSeleccionarProyecto(p)}
                        className={`transition-colors cursor-pointer group ${
                          esActivo ? 'bg-orange-50/60 hover:bg-orange-50/90' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        {/* Nombre del Proyecto */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center text-base font-bold flex-shrink-0 transition-colors ${
                                esActivo
                                  ? 'bg-orange-600 text-white shadow-sm'
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

                        {/* Estado Real */}
                        <td className="py-3.5 px-4">
                          {estado === 'en_ejecucion' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              En ejecución
                            </span>
                          ) : estado === 'en_revision' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              En revisión
                            </span>
                          ) : estado === 'finalizado' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                              Finalizado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200/70">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                              Borrador
                            </span>
                          )}
                        </td>

                        {/* Presupuesto Real */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800">
                          ${monto.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* Avance Real */}
                        <td className="py-3.5 px-4">
                          <div className="w-28 space-y-1">
                            <div className="flex justify-between text-[10.5px] font-semibold text-slate-600">
                              <span>{avance}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-1.5 rounded-full transition-all duration-500 ${
                                  avance >= 100 ? 'bg-emerald-500' : 'bg-orange-500'
                                }`}
                                style={{ width: `${Math.min(100, Math.max(0, avance))}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>

                        {/* Cliente / Responsable */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                              {clienteStr.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="text-slate-700 font-medium truncate max-w-[120px]">
                              {clienteStr}
                            </span>
                          </div>
                        </td>

                        {/* Fecha de Registro en BD */}
                        <td className="py-3.5 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                          {p.created_at
                            ? new Date(p.created_at).toLocaleDateString('es-MX', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : 'Reciente'}
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
                            {onActualizarProyecto && (
                              <button
                                onClick={() => abrirModalEditar(p)}
                                title="Editar datos de la obra"
                                className="p-1.5 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-lg transition-colors cursor-pointer"
                              >
                                <i className="ti ti-pencil text-base"></i>
                              </button>
                            )}
                            <button
                              onClick={() => onSeleccionarProyecto(p)}
                              className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition-colors cursor-pointer ${
                                esActivo
                                  ? 'bg-orange-600 text-white'
                                  : 'bg-slate-100 hover:bg-orange-600 text-slate-700 hover:text-white'
                              }`}
                            >
                              {esActivo ? 'Activa' : 'Seleccionar'}
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
                {Math.min(proyectosFiltrados.length, paginaActual * itemsPorPagina)} de {proyectosFiltrados.length} obras
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

        {/* ── SECCIÓN INFERIOR: EVOLUCIÓN MENSUAL & BITÁCORA REAL ─────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Card Izquierda: Evolución de costos */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Evolución del portafolio</h3>
                <div className="text-2xl font-display font-black text-slate-900 mt-1">
                  {metricas.montoTotalFormateado} <span className="text-xs font-medium text-slate-400">en {metricas.totalObras} obra(s)</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-sm bg-slate-300"></span>
                  <span>Sin costo</span>
                </div>
                <div className="flex items-center gap-1.5 text-orange-600">
                  <span className="w-2.5 h-2.5 rounded-sm bg-orange-500"></span>
                  <span>Presupuestado</span>
                </div>
              </div>
            </div>

            {/* Gráfico de barras mensual calculado con las obras de la BD */}
            <div className="h-44 flex items-end justify-between gap-3 pt-6 pb-2 px-2 border-b border-slate-100">
              {datosEvolucion.map((bar, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="w-full flex items-end justify-center h-full">
                    <div
                      className={`w-6 rounded-t-md transition-all shadow-2xs ${
                        bar.monto > 0
                          ? 'bg-orange-500 group-hover:bg-orange-600'
                          : bar.conteo > 0
                          ? 'bg-amber-400 group-hover:bg-amber-500'
                          : 'bg-slate-200 group-hover:bg-slate-300'
                      }`}
                      style={{ height: `${bar.alturaPct}%` }}
                      title={`${bar.mes} ${bar.anio}: ${bar.conteo} obra(s) · $${bar.monto.toLocaleString('es-MX')}`}
                    ></div>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    {bar.mes}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Registro de los últimos 6 meses en Supabase</span>
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <i className="ti ti-check"></i> Datos sincronizados en vivo
              </span>
            </div>
          </div>

          {/* Card Derecha: Actividad reciente (Bitácora de auditoría real) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Actividad reciente</h3>
                <p className="text-[11px] text-slate-400">Eventos registrados en la bitácora de la empresa</p>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                {listaActividades.length} eventos
              </span>
            </div>

            <div className="space-y-3">
              {listaActividades.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                  <i className="ti ti-history text-2xl text-slate-300 block mb-1"></i>
                  No se ha registrado actividad reciente aún.
                </div>
              ) : (
                listaActividades.map((act, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                    <div
                      className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5 border border-orange-200"
                    >
                      {act.iniciales}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-700 leading-snug">
                        <strong className="font-semibold text-slate-900">{act.usuario}</strong> {act.accion}{' '}
                        <span className="font-medium text-slate-800">{act.detalle}</span>
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2 font-mono">
                      {act.tiempo}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-400">
                Auditoría multi-tenant protegida con Row Level Security.
              </span>
            </div>
          </div>

        </div>

      </div>

      {/* ── MODAL PARA EDITAR INFORMACIÓN DE LA OBRA EN BD ─────────────────── */}
      {obraParaEditar && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Editar Obra</h3>
                <p className="text-xs text-slate-400">Modifica los parámetros guardados en la base de datos</p>
              </div>
              <button
                type="button"
                onClick={cerrarModalEditar}
                className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <i className="ti ti-x text-base"></i>
              </button>
            </div>

            <form onSubmit={guardarEdicionObra} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre de la obra *</label>
                <input
                  type="text"
                  required
                  value={editNombre}
                  onChange={e => setEditNombre(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Código</label>
                  <input
                    type="text"
                    value={editCodigo}
                    onChange={e => setEditCodigo(e.target.value)}
                    placeholder="Ej. OBRA-01"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Estado</label>
                  <select
                    value={editEstado}
                    onChange={e => setEditEstado(e.target.value as EstadoProyecto)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                  >
                    <option value="borrador">Borrador</option>
                    <option value="en_ejecucion">En ejecución</option>
                    <option value="en_revision">En revisión</option>
                    <option value="finalizado">Finalizado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cliente</label>
                  <input
                    type="text"
                    value={editCliente}
                    onChange={e => setEditCliente(e.target.value)}
                    placeholder="Nombre o empresa cliente"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ubicación</label>
                  <input
                    type="text"
                    value={editUbicacion}
                    onChange={e => setEditUbicacion(e.target.value)}
                    placeholder="Ciudad o zona"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Presupuesto Referencial ($)</label>
                  <input
                    type="number"
                    step="any"
                    value={editPresupuesto}
                    onChange={e => setEditPresupuesto(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Avance Actual (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editAvance}
                    onChange={e => setEditAvance(Math.min(100, Math.max(0, Number(e.target.value))))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={cerrarModalEditar}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoEdicion}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {guardandoEdicion && <i className="ti ti-loader-2 spin"></i>}
                  <span>Guardar cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
