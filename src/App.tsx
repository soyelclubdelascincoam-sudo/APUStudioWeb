import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, isLiveSupabase } from './supabase';
import {
  InsumoMaterial,
  InsumoManoObra,
  InsumoEquipo,
  InsumoTransporte,
  Rubro,
  RecetaItem,
  Presupuesto,
  Capitulo,
  ConfigIA,
  ToastState,
} from './types';

// Import our cohesive modular components
import InsumosPanel from './components/InsumosPanel';
import RubrosPanel from './components/RubrosPanel';
import PresupuestosPanel from './components/PresupuestosPanel';
import ConfigPanel from './components/ConfigPanel';
import ReportModal from './components/ReportModal';
import UploadPanel from './components/UploadPanel';

export default function App() {
  // Responsive check
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [sidebarColapsado, setSidebarColapsado] = useState(false);
  const toggleSidebar = () => setSidebarColapsado((p) => !p);

  // Toast notification state
  const [toast, setToast] = useState<ToastState>({ visible: false, mensaje: '', tipo: 'info' });
  const toastTimerRef = useRef<any>(null);

  const mostrarToast = (mensaje: string, tipo = 'info') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ visible: true, mensaje, tipo });
    toastTimerRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 4000);
  };

  // ERP Database Collections
  const [insumosMat, setInsumosMat] = useState<InsumoMaterial[]>([]);
  const [insumosMob, setInsumosMob] = useState<InsumoManoObra[]>([]);
  const [insumosEyh, setInsumoEyh] = useState<InsumoEquipo[]>([]);
  const [insumosTransp, setInsumosTransp] = useState<InsumoTransporte[]>([]);
  const [todosLosRubros, setTodosLosRubros] = useState<Rubro[]>([]);

  // Detailed Recipe states (APU structure)
  const [recetaMat, setRecetaMat] = useState<RecetaItem[]>([]);
  const [recetaMob, setRecetaMob] = useState<RecetaItem[]>([]);
  const [recetaEyh, setRecetaEyh] = useState<RecetaItem[]>([]);
  const [recetaTransp, setRecetaTransp] = useState<RecetaItem[]>([]);

  // Loading indicator states
  const [cargando, setCargando] = useState(false);
  const [cargandoReceta, setCargandoReceta] = useState(false);

  // View state machines
  const [tabActiva, setTabActiva] = useState<'insumos' | 'rubros' | 'presupuestos' | 'config' | 'upload'>('insumos');
  const [vista, setVista] = useState<'lista' | 'detalle' | 'apu'>('lista');
  const [categoriaAbierta, setCategoriaAbierta] = useState<string | null>(null);

  // Selection frames
  const [insumoSeleccionado, setInsumoSeleccionado] = useState<any | null>(null);
  const [rubroSeleccionado, setRubroSeleccionado] = useState<Rubro | null>(null);

  // In-line editing variables
  const [editando, setEditando] = useState(false);
  const [tempEdit, setTempEdit] = useState<any>({});

  // Native query inputs
  const [busqueda, setBusqueda] = useState('');
  const [busquedaRubro, setBusquedaRubro] = useState('');

  // Presupuesto State (Engineering Estimate)
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [mostrarCreadorPresupuesto, setMostrarCreadorPresupuesto] = useState(false);
  const [reporteActivo, setReporteActivo] = useState<Presupuesto | null>(null);
  const [editandoPresupuestoId, setEditandoPresupuestoId] = useState<string | null>(null);

  const [nuevoPresupuesto, setNuevoPresupuesto] = useState({
    proyecto: '',
    cliente: '',
    notas: '',
    capituloActivo: '1. OBRAS PRELIMINARES',
    capituloNuevo: '',
    capitulos: [
      { nombre: '1. OBRAS PRELIMINARES', items: [] as any[] },
      { nombre: '2. ESTRUCTURAS Y HORMIGONES', items: [] as any[] },
      { nombre: '3. MAMPOSTERÍAS Y ACABADOS', items: [] as any[] },
    ] as Capitulo[],
    indirectosPct: 12,
    utilidadPct: 8,
    ivaPct: 10,
  });

  // AI assistant configurations page
  const [configIA, setConfigIA] = useState<ConfigIA>(() => {
    const saved = localStorage.getItem('configIA');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          modelo: parsed.modelo || 'gemini-2.5-flash',
          temperatura: typeof parsed.temperatura === 'number' ? parsed.temperatura : 0.1,
          normalizarUnidades: parsed.normalizarUnidades !== undefined ? parsed.normalizarUnidades : true,
          filtroAntiDuplicados: parsed.filtroAntiDuplicados !== undefined ? parsed.filtroAntiDuplicados : true,
          apiKey: parsed.apiKey || '',
        };
      } catch (e) {
        console.error("Error parsing configIA from localStorage", e);
      }
    }
    return {
      modelo: 'gemini-2.5-flash',
      temperatura: 0.1,
      normalizarUnidades: true,
      filtroAntiDuplicados: true,
      apiKey: '',
    };
  });

  useEffect(() => {
    localStorage.setItem('configIA', JSON.stringify(configIA));
  }, [configIA]);

  // APU Auditor frame
  const [apuAuditor, setApuAuditor] = useState<any | null>(null);

  // ── COMPUTATIONS AND DERIVED ESTIMATES ───────────────────────────────────────────
  const metricasPresupuesto = React.useMemo(() => {
    const totalValores = presupuestos.reduce((acc, curr) => acc + (Number(curr.monto) || 0), 0);
    const promedioValores = presupuestos.length ? totalValores / presupuestos.length : 0;
    return {
      totalAcumulado: totalValores,
      conteo: presupuestos.length,
      promedio: promedioValores,
    };
  }, [presupuestos]);

  const costoDirectoNuevoPresupuesto = React.useMemo(() => {
    let subtotal = 0;
    nuevoPresupuesto.capitulos.forEach((cap) => {
      cap.items.forEach((item) => {
        subtotal += Number(item.precio || 0) * Number(item.cantidad || 0);
      });
    });
    return subtotal;
  }, [nuevoPresupuesto.capitulos]);

  const montoIndirectos = costoDirectoNuevoPresupuesto * (nuevoPresupuesto.indirectosPct / 100);
  const montoUtilidad = costoDirectoNuevoPresupuesto * (nuevoPresupuesto.utilidadPct / 100);
  const subtotalConIndirectos = costoDirectoNuevoPresupuesto + montoIndirectos + montoUtilidad;
  const montoIva = subtotalConIndirectos * (nuevoPresupuesto.ivaPct / 100);
  const granTotalNuevoPresupuesto = subtotalConIndirectos + montoIva;

  // ── DATA SYNCHRONIZATION FROM SUPABASE/V_DB ──────────────────────────────────────
  const cargarPresupuestos = async () => {
    try {
      const { data, error } = await supabase
        .from('PRESUPUESTOS')
        .select(`
          id,
          nombre,
          estado,
          precio_presup_total,
          fecha_creacion,
          DETALLES_PRESUPUESTO (
            id_rubro_presup,
            nombre_rubro_presup,
            unidad_rubro_presup,
            precio_rubro_presup,
            cantidad_presup,
            precio_presup,
            capitulo_presup
          )
        `)
        .order('fecha_creacion', { ascending: false });

      if (error) throw error;

      if (data) {
        setPresupuestos(
          data.map((p: any) => {
            const parts = (p.nombre || '').split(' | ');
            return {
              id: p.id,
              proyecto: parts[0] || 'Sin nombre',
              cliente: parts[1] || 'No registrado',
              fecha: p.fecha_creacion ? p.fecha_creacion.split('T')[0] : 'Upeva ndojehai',
              estado: p.estado || 'Borrador',
              monto: Number(p.precio_presup_total || 0),
              items: (p.DETALLES_PRESUPUESTO || []).map((d: any) => ({
                id_rubro: d.id_rubro_presup,
                nombre_rubro: d.nombre_rubro_presup,
                unidad: d.unidad_rubro_presup,
                precio: Number(d.precio_rubro_presup || 0),
                cantidad: Number(d.cantidad_presup || 0),
                subtotal: Number(d.precio_presup || 0),
                capitulo_presup: d.capitulo_presup || '',
              })),
            };
          })
        );
      }
    } catch (error) {
      console.error('Error cargando presupuestos:', error);
      mostrarToast('No se pudieron cargar los presupuestos de Supabase.', 'error');
    }
  };

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [rM, rO, rE, rT, rR] = await Promise.all([
        supabase.from('INSUMOS_MAT').select('*'),
        supabase.from('INSUMOS_MOB').select('*'),
        supabase.from('INSUMOS_EYH').select('*'),
        supabase.from('INSUMOS_TRANSP').select('*'),
        supabase.from('RUBROS').select('*'),
      ]);

      // Informar si hay errores específicos en las consultas remota de Supabase
      const errores = [];
      if (rM.error) errores.push(`INSUMOS_MAT: ${rM.error.message}`);
      if (rO.error) errores.push(`INSUMOS_MOB: ${rO.error.message}`);
      if (rE.error) errores.push(`INSUMOS_EYH: ${rE.error.message}`);
      if (rT.error) errores.push(`INSUMOS_TRANSP: ${rT.error.message}`);
      if (rR.error) errores.push(`RUBROS: ${rR.error.message}`);

      if (errores.length > 0) {
        console.error('Errores en Supabase:', errores);
        mostrarToast(`Error Supabase: ${errores.slice(0, 2).join(' | ')}${errores.length > 2 ? ' ...' : ''}`, 'warning');
      }

      setInsumosMat(rM.data || []);
      setInsumosMob(rO.data || []);
      setInsumoEyh(rE.data || []);
      setInsumosTransp(rT.data || []);
      const NormalizedRubros = (rR.data || []).map((item: any) => {
        const u = item.unidad_rubro || item.unidad || 'm³';
        return {
          ...item,
          unidad: u,
          unidad_rubro: u
        };
      });

      setTodosLosRubros(
        NormalizedRubros.sort((a: any, b: any) =>
          (a.nombre_rubro || '').localeCompare(b.nombre_rubro || '')
        )
      );

      await cargarPresupuestos();
    } catch (err) {
      console.error(err);
      mostrarToast('Fallo al sincronizar datos con el servidor principal.', 'error');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // ── CORE ACTIONS AND EVENT CONTROLLERS ───────────────────────────────────────────
  const cambiarTab = (tab: typeof tabActiva) => {
    setTabActiva(tab);
    setVista('lista');
    setBusqueda('');
    setBusquedaRubro('');
    setCategoriaAbierta(null);
    setMostrarCreadorPresupuesto(false);
  };
  const seleccionarInsumo = (item: any, key: string) => {
    setInsumoSeleccionado(item);
    setCategoriaAbierta(key);
    setEditando(false);
    if (isMobile) {
      setBusqueda('');
      setVista('detalle');
    }
  };

  const cargarReceta = async (item: any) => {
    if (!item) return;
    setCargandoReceta(true);
    setRecetaMat([]);
    setRecetaMob([]);
    setRecetaEyh([]);
    setRecetaTransp([]);
    const id = item.id_rubro || item.id;
    try {
      // Función resiliente para consultar diferentes variaciones de tablas, ortografía y columnas de ID
      const queryCategory = async (primaryTable: string, fallbackTable: string) => {
        const tableOpts = [
          primaryTable,
          primaryTable.toLowerCase(),
          fallbackTable,
          fallbackTable.toLowerCase()
        ].filter(Boolean);
        const columnOpts = ['id_rubro', 'rubro_id', 'id_rubro_presup', 'id'];
        const idOptions = [item.id_rubro, item.id].filter(Boolean);

        for (const table of tableOpts) {
          for (const col of columnOpts) {
            for (const idVal of idOptions) {
              try {
                const { data, error } = await supabase.from(table).select('*').eq(col, idVal);
                if (!error && data && data.length > 0) {
                  return { data, table };
                }
              } catch (err) {
                // Siguiente combinación
              }
            }
          }
        }
        return { data: [], table: primaryTable };
      };

      // Realizar búsquedas usando las tablas solicitadas: RECETA_MAT, RECETA_MOB, RECETA_EYH y RECETA_TRANSP
      const [rMResult, rOResult, rEResult, rTResult] = await Promise.all([
        queryCategory('RECETA_MAT', 'receta_mat'),
        queryCategory('RECETA_MOB', 'receta_mob'),
        queryCategory('RECETA_EYH', 'receta_eyh'),
        queryCategory('RECETA_TRANSP', 'RECETA_TRANSP')
      ]);

      const rM = rMResult.data || [];
      const rO = rOResult.data || [];
      const rE = rEResult.data || [];
      const rT = rTResult.data || [];

      // Normalizador para asegurar la compatibilidad con las especificaciones de columnas del frontend
      const normalizarFilaReceta = (row: any, cat?: string, tablaOrigen?: string) => {
        if (!row) return { codigo: '', descripcion: '', unidad: '', cantidad: 0, precio_unitario: 0, precio_total: 0 };
        const keys = Object.keys(row);

        // id_insumo_ o similar
        const idKey = keys.find(k =>
          k.toLowerCase().startsWith('id_insumo') ||
          k.toLowerCase() === 'codigo' ||
          k.toLowerCase() === 'codigo_insumo' ||
          k.toLowerCase() === 'insumo_id' ||
          k.toLowerCase() === 'id'
        );
        const codigo = idKey ? row[idKey] : (row.codigo || row.id_insumo || '');

        // name_insumo_ o similar
        const descKey = keys.find(k =>
          k.toLowerCase().startsWith('name_insumo') ||
          k.toLowerCase() === 'descripcion' ||
          k.toLowerCase() === 'nombre' ||
          k.toLowerCase() === 'nombre_insumo' ||
          k.toLowerCase() === 'description'
        );
        const descripcion = descKey ? row[descKey] : (row.descripcion || row.nombre || '');

        // unidad_ o similar
        const unitKey = keys.find(k =>
          k.toLowerCase().startsWith('unidad') ||
          k.toLowerCase() === 'u' ||
          k.toLowerCase() === 'medida' ||
          k.toLowerCase() === 'unidad_medida'
        );
        const unidad = unitKey ? row[unitKey] : (row.unidad || row.unid || 'u');

        // cantidad_ o similar
        const cantKey = keys.find(k =>
          k.toLowerCase().startsWith('cantidad') ||
          k.toLowerCase() === 'coeficiente' ||
          k.toLowerCase() === 'rendimiento' ||
          k.toLowerCase() === 'cant'
        );
        const cantidadVal = cantKey ? parseFloat(row[cantKey]) : 1;
        const cantidad = isNaN(cantidadVal) ? 1 : cantidadVal;

        // Búsqueda específica de precio_unitario_mat, etc. de las tablas RECETA_MAT, etc.
        let databasePrecioUnitario = 0;
        let databasePrecioReceta = 0;

        const pUnitKey = keys.find(k =>
          k.toLowerCase().startsWith('precio_unitario') ||
          k.toLowerCase() === 'precio_insumo' ||
          k.toLowerCase() === 'precio' ||
          k.toLowerCase() === 'costo'
        );
        if (pUnitKey) {
          databasePrecioUnitario = parseFloat(row[pUnitKey]) || 0;
        }

        const pRecetaKey = keys.find(k =>
          k.toLowerCase().startsWith('precio_receta_') ||
          k.toLowerCase().startsWith('precio_total_') ||
          k.toLowerCase() === 'precio_receta' ||
          k.toLowerCase() === 'precio_total' ||
          k.toLowerCase() === 'subtotal' ||
          k.toLowerCase() === 'total' ||
          k.toLowerCase() === 'precio_parcial' ||
          k.toLowerCase() === 'parcial'
        );
        if (pRecetaKey) {
          databasePrecioReceta = parseFloat(row[pRecetaKey]) || 0;
        }

        // BÚSQUEDA DEL INSUMO EN LAS TABLAS INSUMOS_MAT, ETC. PARA OBTENER LA UNIDAD Y PRECIO ACTUALIZADOS LIVE
        let resolvedDescription = String(descripcion || '');
        let resolvedUnidad = String(unidad || 'u');

        let resolvedPrecioUnitario = databasePrecioUnitario;
        let hasInsumoMatch = false;

        const lookupId = String(codigo || '').trim().toLowerCase();
        if (lookupId) {
          let guessedCat = cat;
          if (!guessedCat) {
            const upCod = lookupId.toUpperCase();
            if (upCod.startsWith('MAT-') || row.id_insumo_mat || 'id_insumo_mat' in row) {
              guessedCat = 'MAT';
            } else if (upCod.startsWith('MOB-') || upCod.startsWith('MO-') || row.id_insumo_mob || 'id_insumo_mob' in row) {
              guessedCat = 'MOB';
            } else if (upCod.startsWith('EYH-') || upCod.startsWith('EQ-') || row.id_insumo_eyh || 'id_insumo_eyh' in row) {
              guessedCat = 'EYH';
            } else if (upCod.startsWith('TRN-') || upCod.startsWith('TR-') || row.id_insumo_transp || 'id_insumo_transp' in row) {
              guessedCat = 'TRANSP';
            }
          }

          if (guessedCat === 'MAT') {
            const match = insumosMat.find(i =>
              String(i.id_insumo_mat || i.id || '').trim().toLowerCase() === lookupId
            );
            if (match) {
              hasInsumoMatch = true;
              resolvedDescription = match.name_insumo_mat || match.nombre || resolvedDescription;
              resolvedUnidad = match.unidad_mat || match.unidad || resolvedUnidad;
              const rawPrice = match.precio_mat !== undefined ? match.precio_mat : match.precio_insumo_mat;
              const matchPrice = typeof rawPrice === 'number' ? rawPrice : parseFloat(rawPrice);
              if (matchPrice !== undefined && !isNaN(matchPrice)) {
                resolvedPrecioUnitario = matchPrice;
              }
            }
          } else if (guessedCat === 'MOB') {
            const match = insumosMob.find(i =>
              String(i.id_insumo_mob || i.id || '').trim().toLowerCase() === lookupId
            );
            if (match) {
              hasInsumoMatch = true;
              resolvedDescription = match.name_insumo_mob || match.nombre || resolvedDescription;
              resolvedUnidad = match.unidad_mob || match.unidad || resolvedUnidad;
              const rawPrice = match.precio_mob !== undefined ? match.precio_mob : match.precio_insumo_mob;
              const matchPrice = typeof rawPrice === 'number' ? rawPrice : parseFloat(rawPrice);
              if (matchPrice !== undefined && !isNaN(matchPrice)) {
                resolvedPrecioUnitario = matchPrice;
              }
            }
          } else if (guessedCat === 'EYH') {
            const match = insumosEyh.find(i =>
              String(i.id_insumo_eyh || i.id || '').trim().toLowerCase() === lookupId
            );
            if (match) {
              hasInsumoMatch = true;
              resolvedDescription = match.name_insumo_eyh || match.nombre || resolvedDescription;
              resolvedUnidad = match.unidad_eyh || match.unidad || resolvedUnidad;
              const rawPrice = match.precio_eyh !== undefined ? match.precio_eyh : match.precio_insumo_eyh;
              const matchPrice = typeof rawPrice === 'number' ? rawPrice : parseFloat(rawPrice);
              if (matchPrice !== undefined && !isNaN(matchPrice)) {
                resolvedPrecioUnitario = matchPrice;
              }
            }
          } else if (guessedCat === 'TRANSP') {
            const match = insumosTransp.find(i =>
              String(i.id_insumo_transp || i.id || '').trim().toLowerCase() === lookupId
            );
            if (match) {
              hasInsumoMatch = true;
              resolvedDescription = match.name_insumo_transp || match.nombre || resolvedDescription;
              resolvedUnidad = match.unidad_transp || match.unidad || resolvedUnidad;
              const rawPrice = match.precio_transp !== undefined ? match.precio_transp : match.precio_insumo_transp;
              const matchPrice = typeof rawPrice === 'number' ? rawPrice : parseFloat(rawPrice);
              if (matchPrice !== undefined && !isNaN(matchPrice)) {
                resolvedPrecioUnitario = matchPrice;
              }
            }
          }
        }

        const resolvedPrecioTotal = databasePrecioReceta || (resolvedPrecioUnitario * cantidad);

        return {
          id_rubro: item.id_rubro || item.id || '',
          codigo: String(codigo || ''),
          descripcion: resolvedDescription,
          unidad: resolvedUnidad,
          amount: cantidad,
          cantidad,
          precio_unitario: resolvedPrecioUnitario || databasePrecioUnitario,
          precio_total: resolvedPrecioTotal,
          _tablaOrigen: tablaOrigen,
          _originalRow: row,
        };
      };

      let dataMat = (rM || []).map(row => normalizarFilaReceta(row, 'MAT', rMResult.table));
      let dataMob = (rO || []).map(row => normalizarFilaReceta(row, 'MOB', rOResult.table));
      let dataEyh = (rE || []).map(row => normalizarFilaReceta(row, 'EYH', rEResult.table));
      let dataTransp = (rT || []).map(row => normalizarFilaReceta(row, 'TRANSP', rTResult.table));

      // Fallback a tabla unificada "RECETA" o "RECETAS" de Supabase si los resultados específicos están vacíos
      if (dataMat.length === 0 && dataMob.length === 0 && dataEyh.length === 0 && dataTransp.length === 0) {
        let unifiedRows: any[] = [];
        let unifiedTable = 'RECETA';
        try {
          const { data } = await supabase.from('RECETA').select('*').eq('id_rubro', id);
          if (data && data.length > 0) {
            unifiedRows = data;
            unifiedTable = 'RECETA';
          }
        } catch (e) { }

        if (unifiedRows.length === 0) {
          try {
            const { data } = await supabase.from('RECETA').select('*').eq('rubro_id', id);
            if (data && data.length > 0) {
              unifiedRows = data;
              unifiedTable = 'RECETA';
            }
          } catch (e) { }
        }

        if (unifiedRows.length === 0) {
          try {
            const { data } = await supabase.from('RECETAS').select('*').eq('id_rubro', id);
            if (data && data.length > 0) {
              unifiedRows = data;
              unifiedTable = 'RECETAS';
            }
          } catch (e) { }
        }

        if (unifiedRows.length > 0) {
          unifiedRows.forEach((row: any) => {
            const t = (row.tipo || row.categoria || row.tipo_insumo || row.grupo || row.tabla || '').toString().toUpperCase();
            let cat = 'MAT';
            const normCod = String(row.codigo || row.id_insumo || '').toString().toUpperCase();
            if (t.includes('MAT') || t.includes('MATERIAL') || normCod.startsWith('MAT-')) {
              cat = 'MAT';
            } else if (t.includes('MOB') || t.includes('MANO') || t.includes('OPER') || t.includes('OBRA') || t.includes('TRABAJ') || normCod.startsWith('MOB-') || normCod.startsWith('MO-')) {
              cat = 'MOB';
            } else if (t.includes('EYH') || t.includes('EQU') || t.includes('MAQ') || t.includes('HERR') || normCod.startsWith('EYH-') || normCod.startsWith('EQ-')) {
              cat = 'EYH';
            } else if (t.includes('TRA') || t.includes('FLE') || normCod.startsWith('TRN-') || normCod.startsWith('TR-')) {
              cat = 'TRANSP';
            }

            const normalized = normalizarFilaReceta(row, cat, unifiedTable);
            if (cat === 'MAT') {
              dataMat.push(normalized);
            } else if (cat === 'MOB') {
              dataMob.push(normalized);
            } else if (cat === 'EYH') {
              dataEyh.push(normalized);
            } else if (cat === 'TRANSP') {
              dataTransp.push(normalized);
            }
          });
        }
      }
      setRecetaMat(dataMat);
      setRecetaMob(dataMob);
      setRecetaEyh(dataEyh);
      setRecetaTransp(dataTransp);

      // Recalcular el total compuesto del rubro y guardarlo en la base de datos
      const totalReceta = [...dataMat, ...dataMob, ...dataEyh, ...dataTransp].reduce(
        (sum, row) => sum + (Number(row.precio_total) || 0),
        0
      );

      const oldPrecio = Number(item.precio_rubro || 0);
      if (Math.abs(totalReceta - oldPrecio) > 0.001) {
        console.log(`Sincronizando precio de rubro ${id}: de $${oldPrecio} a $${totalReceta}`);
        await supabase
          .from('RUBROS')
          .update({ precio_rubro: totalReceta })
          .eq('id_rubro', id);

        // Actualizar el estado local para evitar inconsistencias visuales
        setTodosLosRubros((prev) =>
          prev.map((r) =>
            r.id_rubro === id || r.id === id ? { ...r, precio_rubro: totalReceta } : r
          )
        );
      }
    } catch (err) {
      console.error(err);
      mostrarToast('Error al obtener la estructura del análisis.', 'error');
    } finally {
      setCargandoReceta(false);
    }
  };

  const seleccionarRubro = async (item: any) => {
    setRubroSeleccionado(item);
    if (isMobile) {
      setBusquedaRubro('');
      setVista('apu');
    }
    await cargarReceta(item);
  };

  const iniciarEdicion = () => {
    setTempEdit({ ...insumoSeleccionado });
    setEditando(true);
  };

  const cancelarEdicion = () => {
    setEditando(false);
    setTempEdit({});
  };

  const guardarCambios = async () => {
    const item = insumoSeleccionado;
    if (!item) {
      mostrarToast('Error interno: No hay ningún insumo seleccionado para modificar.', 'error');
      return;
    }

    // Auto-detectar la tabla correspondiente en Supabase basándonos en las columnas del insumo o categoría activa
    let tabla = '';
    if ('id_insumo_mat' in item || 'name_insumo_mat' in item || 'precio_insumo_mat' in item) {
      tabla = 'INSUMOS_MAT';
    } else if ('id_insumo_mob' in item || 'name_insumo_mob' in item || 'precio_insumo_mob' in item) {
      tabla = 'INSUMOS_MOB';
    } else if ('id_insumo_eyh' in item || 'name_insumo_eyh' in item || 'precio_insumo_eyh' in item) {
      tabla = 'INSUMOS_EYH';
    } else if ('id_insumo_transp' in item || 'name_insumo_transp' in item || 'precio_insumo_transp' in item) {
      tabla = 'INSUMOS_TRANSP';
    } else {
      const tablaMap: Record<string, string> = {
        MAT: 'INSUMOS_MAT',
        MOB: 'INSUMOS_MOB',
        EYH: 'INSUMOS_EYH',
        TRANSP: 'INSUMOS_TRANSP',
      };
      tabla = tablaMap[categoriaAbierta || ''] || '';
    }

    if (!tabla) {
      mostrarToast('Error interno: Tabla de destino no determinada para este insumo.', 'error');
      return;
    }

    // Identificar el mejor ID col (preferir ID absoluto en base de datos si existe)
    let idCol = 'id';
    if (tabla === 'INSUMOS_MAT' && 'id_insumo_mat' in item) {
      idCol = 'id_insumo_mat';
    } else if (tabla === 'INSUMOS_MOB' && 'id_insumo_mob' in item) {
      idCol = 'id_insumo_mob';
    } else if (tabla === 'INSUMOS_EYH' && 'id_insumo_eyh' in item) {
      idCol = 'id_insumo_eyh';
    } else if (tabla === 'INSUMOS_TRANSP' && 'id_insumo_transp' in item) {
      idCol = 'id_insumo_transp';
    } else if (item.id) {
      idCol = 'id';
    } else if (item.id_insumo_mat) {
      idCol = 'id_insumo_mat';
    } else if (item.id_insumo_mob) {
      idCol = 'id_insumo_mob';
    } else if (item.id_insumo_eyh) {
      idCol = 'id_insumo_eyh';
    } else if (item.id_insumo_transp) {
      idCol = 'id_insumo_transp';
    } else if (item.id_insumo) {
      idCol = 'id_insumo';
    }

    const idRow = item[idCol];
    if (!idRow) {
      mostrarToast('Error interno: Identificador principal no hallado.', 'error');
      return;
    }

    // Clonar y limpiar el payload
    const payload = { ...tempEdit };

    // Eliminar IDs principales y campos del sistema para evitar errores de restricción SQL
    delete payload.id;
    delete payload.id_insumo_mat;
    delete payload.id_insumo_mob;
    delete payload.id_insumo_eyh;
    delete payload.id_insumo_transp;
    delete payload.id_insumo;
    delete payload.created_at;
    delete payload.updated_at;

    // Eliminar cualquier tipo complejo u objetos no planos del frontend
    Object.keys(payload).forEach((key) => {
      if (payload[key] !== null && (typeof payload[key] === 'object' || Array.isArray(payload[key]))) {
        delete payload[key];
      }
    });

    console.log('Intentando actualizar insumo en Supabase:', {
      tabla,
      idCol,
      idRow,
      payload
    });

    try {
      const { error } = await supabase.from(tabla).update(payload).eq(idCol, idRow);
      if (error) {
        console.error('Error detallado de Supabase al actualizar:', error);
        let mensajeAyuda = '';
        if (error.message?.toLowerCase().includes('policy') || error.code === '42501') {
          mensajeAyuda = `\n\n💡 Causa probable: Row Level Security (RLS) o Privilegios. Aunque desactivaras el RLS para materiales, comprueba si necesitas desactivarlo para "${tabla}".\n\nEjecuta esto en el SQL Editor de Supabase:\nALTER TABLE "${tabla}" DISABLE ROW LEVEL SECURITY;\nGRANT ALL ON TABLE "${tabla}" TO anon, authenticated;`;
        } else if (error.message?.toLowerCase().includes('column') || error.code === '42703') {
          mensajeAyuda = `\n\n💡 Causa probable: Estás enviando columnas que no existen en "${tabla}". Comprueba las columnas del payload impreso en la consola Web del navegador.`;
        }

        mostrarToast(
          `Fallo al actualizar [Código: ${error.code || 'S/C'}]: ${error.message}` +
          (error.details ? `\nDetalles: ${error.details}` : '') +
          (error.hint ? `\nSugerencia: ${error.hint}` : '') +
          mensajeAyuda,
          'error'
        );
        return;
      }
      setInsumoSeleccionado({ ...insumoSeleccionado, ...tempEdit });
      setEditando(false);
      mostrarToast('Registro de insumo actualizado correctamente.', 'success');
      await cargarDatos();
    } catch (err) {
      console.error('Excepción en guardarCambios:', err);
      mostrarToast('Pérdida de conexión durante el proceso de guardado.', 'error');
    }
  };

  // ── GESTIÓN DE RUBROS Y RECETAS (CONEXIÓN BD) ──────────────────────────────────
  const crearRubro = async (nombre: string, unidad: string) => {
    try {
      const nuevoId = typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID() 
        : `rub-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      
      console.log('Intentando crear nuevo rubro en Supabase:', { nuevoId, nombre, unidad });
      
      const { data, error } = await supabase
        .from('RUBROS')
        .insert({
          id_rubro: nuevoId,
          nombre_rubro: nombre,
          unidad_rubro: unidad,
          precio_rubro: 0,
          proyecto_origen: 'Creado manualmente'
        })
        .select();

      if (error) {
        throw error;
      }

      mostrarToast('Rubro creado correctamente.', 'success');
      await cargarDatos();

      const creado = data && (Array.isArray(data) ? data[0] : data);
      const rubroObj = creado || {
        id_rubro: nuevoId,
        nombre_rubro: nombre,
        unidad_rubro: unidad,
        unidad: unidad,
        precio_rubro: 0
      };

      const u = rubroObj.unidad_rubro || rubroObj.unidad || 'm³';
      const rubroNormalizado = {
        ...rubroObj,
        id_rubro: rubroObj.id_rubro || nuevoId,
        unidad: u,
        unidad_rubro: u
      };

      setRubroSeleccionado(rubroNormalizado);
      await cargarReceta(rubroNormalizado);
      return rubroNormalizado;
    } catch (err: any) {
      console.error('Error al crear rubro:', err);
      mostrarToast(`No se pudo crear el rubro: ${err.message || err}`, 'error');
      throw err;
    }
  };

  const actualizarRubro = async (idRubro: string, nuevoNombre: string, nuevaUnidad: string) => {
    try {
      console.log('Intentando actualizar rubro en Supabase:', { idRubro, nuevoNombre, nuevaUnidad });
      const { error } = await supabase
        .from('RUBROS')
        .update({
          nombre_rubro: nuevoNombre,
          unidad_rubro: nuevaUnidad
        })
        .eq('id_rubro', idRubro);

      if (error) {
        throw error;
      }

      mostrarToast('Rubro actualizado correctamente.', 'success');
      if (rubroSeleccionado && (rubroSeleccionado.id_rubro === idRubro || rubroSeleccionado.id === idRubro)) {
        setRubroSeleccionado({
          ...rubroSeleccionado,
          nombre_rubro: nuevoNombre,
          unidad_rubro: nuevaUnidad,
          unidad: nuevaUnidad
        });
      }
      await cargarDatos();
    } catch (err: any) {
      console.error('Error al actualizar rubro:', err);
      mostrarToast(`No se pudo actualizar el rubro: ${err.message || err}`, 'error');
    }
  };

  const actualizarCantidadReceta = async (idRubro: string, row: any, nuevaCantidad: number) => {
    try {
      const orig = row._originalRow;
      if (!orig || !row._tablaOrigen) {
        mostrarToast('Error interno: No se hallaron metadatos del registro original.', 'error');
        return;
      }

      const keys = Object.keys(orig);
      const cantKey = keys.find(k =>
        k.toLowerCase().startsWith('cantidad') ||
        k.toLowerCase() === 'coeficiente' ||
        k.toLowerCase() === 'rendimiento' ||
        k.toLowerCase() === 'cant'
      ) || 'cantidad_';

      const rubroIdKey = keys.find(k =>
        k.toLowerCase() === 'id_rubro' ||
        k.toLowerCase() === 'rubro_id' ||
        k.toLowerCase() === 'id_rubro_presup' ||
        k.toLowerCase() === 'id'
      ) || 'id_rubro';

      const insumoIdKey = keys.find(k =>
        k.toLowerCase().startsWith('id_insumo') ||
        k.toLowerCase() === 'codigo' ||
        k.toLowerCase() === 'codigo_insumo' ||
        k.toLowerCase() === 'insumo_id' ||
        k.toLowerCase() === 'id'
      ) || 'id_insumo_';

      console.log('Actualizando cantidad en receta:', {
        tabla: row._tablaOrigen,
        [cantKey]: nuevaCantidad,
        [rubroIdKey]: orig[rubroIdKey],
        [insumoIdKey]: orig[insumoIdKey]
      });

      const { error } = await supabase
        .from(row._tablaOrigen)
        .update({ [cantKey]: nuevaCantidad })
        .eq(rubroIdKey, orig[rubroIdKey])
        .eq(insumoIdKey, orig[insumoIdKey]);

      if (error) {
        throw error;
      }

      mostrarToast('Cantidad actualizada correctamente.', 'success');
      await cargarDatos();
      if (rubroSeleccionado) {
        await cargarReceta(rubroSeleccionado);
      }
    } catch (err: any) {
      console.error('Error al actualizar cantidad en receta:', err);
      mostrarToast(`No se pudo actualizar la cantidad: ${err.message || err}`, 'error');
    }
  };

  const eliminarInsumoReceta = async (idRubro: string, row: any) => {
    try {
      const orig = row._originalRow;
      if (!orig || !row._tablaOrigen) {
        mostrarToast('Error interno: No se hallaron metadatos del registro original.', 'error');
        return;
      }

      const keys = Object.keys(orig);
      const rubroIdKey = keys.find(k =>
        k.toLowerCase() === 'id_rubro' ||
        k.toLowerCase() === 'rubro_id' ||
        k.toLowerCase() === 'id_rubro_presup' ||
        k.toLowerCase() === 'id'
      ) || 'id_rubro';

      const insumoIdKey = keys.find(k =>
        k.toLowerCase().startsWith('id_insumo') ||
        k.toLowerCase() === 'codigo' ||
        k.toLowerCase() === 'codigo_insumo' ||
        k.toLowerCase() === 'insumo_id' ||
        k.toLowerCase() === 'id'
      ) || 'id_insumo_';

      console.log('Eliminando insumo de la receta:', {
        tabla: row._tablaOrigen,
        [rubroIdKey]: orig[rubroIdKey],
        [insumoIdKey]: orig[insumoIdKey]
      });

      const { error } = await supabase
        .from(row._tablaOrigen)
        .delete()
        .eq(rubroIdKey, orig[rubroIdKey])
        .eq(insumoIdKey, orig[insumoIdKey]);

      if (error) {
        console.error('Error detallado de Supabase al eliminar:', error);
        let mensajeAyuda = '';
        if (error.message?.toLowerCase().includes('policy') || error.code === '42501') {
          mensajeAyuda = `\n\n💡 Causa probable: Row Level Security (RLS) o Privilegios. Ejecuta esto en el SQL Editor de Supabase:\nALTER TABLE "${row._tablaOrigen}" DISABLE ROW LEVEL SECURITY;\nGRANT ALL ON TABLE "${row._tablaOrigen}" TO anon, authenticated;`;
        }
        mostrarToast(`Fallo al eliminar [Código: ${error.code || 'S/C'}]: ${error.message}${mensajeAyuda}`, 'error');
        return;
      }

      mostrarToast('Insumo eliminado de la receta.', 'success');
      await cargarDatos();
      if (rubroSeleccionado) {
        await cargarReceta(rubroSeleccionado);
      }
    } catch (err: any) {
      console.error('Error al eliminar insumo de la receta:', err);
      mostrarToast(`No se pudo eliminar el insumo: ${err.message || err}`, 'error');
    }
  };

  const agregarInsumoReceta = async (idRubro: string, insumo: any, catKey: string, cantidad: number) => {
    try {
      let tablaDestino = '';

      const todasLasFilas = [...recetaMat, ...recetaMob, ...recetaEyh, ...recetaTransp];
      const algunaFilaMismaCat = todasLasFilas.find(r => r._tablaOrigen);
      if (algunaFilaMismaCat && algunaFilaMismaCat._tablaOrigen) {
        const to = algunaFilaMismaCat._tablaOrigen.toUpperCase();
        if (to === 'RECETA' || to === 'RECETAS') {
          tablaDestino = to;
        }
      }

      if (!tablaDestino) {
        const tablaMap: Record<string, string> = {
          MAT: 'RECETA_MAT',
          MOB: 'RECETA_MOB',
          EYH: 'RECETA_EYH',
          TRANSP: 'RECETA_TRANSP',
        };
        tablaDestino = tablaMap[catKey] || 'RECETA_MAT';
      }

      const idInsumo = insumo.id_insumo_mat || insumo.id_insumo_mob || insumo.id_insumo_eyh || insumo.id_insumo_transp || insumo.id || insumo.id_insumo;
      const nombreInsumo = insumo.name_insumo_mat || insumo.name_insumo_mob || insumo.name_insumo_eyh || insumo.name_insumo_transp || insumo.nombre || insumo.descripcion || '';
      const unidadInsumo = insumo.unidad || insumo.unidad_mat || insumo.unidad_mob || insumo.unidad_eyh || insumo.unidad_transp || 'u';
      const precioUnitario = insumo.precio_mat || insumo.precio_mob || insumo.precio_eyh || insumo.precio_transp || insumo.precio_insumo_mat || insumo.precio_insumo_mob || insumo.precio_insumo_eyh || insumo.precio_insumo_transp || insumo.precio || 0;

      const esTablaUnificada = tablaDestino === 'RECETA' || tablaDestino === 'RECETAS';

      const payload: any = {};
      if (esTablaUnificada) {
        payload.id_rubro = idRubro;
        payload.rubro_id = idRubro;
        payload.codigo = idInsumo;
        payload.id_insumo = idInsumo;
        payload.descripcion = nombreInsumo;
        payload.unidad = unidadInsumo;
        payload.cantidad = cantidad;
        payload.precio_unitario = precioUnitario;
        payload.tipo = catKey;
      } else {
        payload.id_rubro = idRubro;
        payload.id_insumo_ = idInsumo;
        payload.name_insumo_ = nombreInsumo;
        payload.cantidad_ = cantidad;
        payload.precio_unitario_ = precioUnitario;
      }

      console.log('Insertando nuevo insumo en receta:', { tabla: tablaDestino, payload });

      const { error } = await supabase
        .from(tablaDestino)
        .insert(payload);

      if (error) {
        throw error;
      }

      mostrarToast('Insumo añadido a la receta correctamente.', 'success');
      await cargarDatos();
      if (rubroSeleccionado) {
        await cargarReceta(rubroSeleccionado);
      }
    } catch (err: any) {
      console.error('Error al agregar insumo a la receta:', err);
      mostrarToast(`No se pudo añadir el insumo: ${err.message || err}`, 'error');
    }
  };

  // ── WBS CHAPTERS MANAGEMENT ───────────────────────────────────────────────────
  const agregarCapitulo = () => {
    const { capituloNuevo } = nuevoPresupuesto;
    if (!capituloNuevo || !capituloNuevo.trim()) return;
    const nombreNormalizado = capituloNuevo.trim().toUpperCase();
    const existe = nuevoPresupuesto.capitulos.some((c) => c.nombre === nombreNormalizado);
    if (existe) {
      mostrarToast('Este capítulo ya existe en la planilla.', 'error');
      return;
    }

    setNuevoPresupuesto((prev) => ({
      ...prev,
      capituloNuevo: '',
      capituloActivo: nombreNormalizado,
      capitulos: [...prev.capitulos, { nombre: nombreNormalizado, items: [] }],
    }));
    mostrarToast('Capítulo estructural agregado.', 'success');
  };

  const agregarRubroAPlanilla = (rubroObj: Rubro) => {
    if (!rubroObj) return;
    const id = rubroObj.id_rubro || rubroObj.id;
    const { capituloActivo } = nuevoPresupuesto;

    setNuevoPresupuesto((prev) => {
      // Safety check chapter active
      let caps = [...prev.capitulos];
      let capIdx = caps.findIndex((c) => c.nombre === capituloActivo);
      if (capIdx === -1) {
        mostrarToast("Por favor, seleccione un capítulo activo para trabajar.", 'error');
        return prev;
      }

      const cap = caps[capIdx];
      const itemExistenteIdx = cap.items.findIndex((item) => item.id_rubro === id);

      if (itemExistenteIdx !== -1) {
        const uItems = [...cap.items];
        const prevQty = uItems[itemExistenteIdx].cantidad;
        uItems[itemExistenteIdx] = {
          ...uItems[itemExistenteIdx],
          cantidad: prevQty + 1,
          subtotal: (prevQty + 1) * uItems[itemExistenteIdx].precio,
        };
        caps[capIdx] = { ...cap, items: uItems };
        mostrarToast('Se incrementó la cantidad del rubro.', 'info');
      } else {
        const newItem = {
          id_rubro: id,
          nombre_rubro: rubroObj.nombre_rubro,
          unidad: rubroObj.unidad || 'm³',
          precio: Number(rubroObj.precio_rubro || 0),
          cantidad: 1,
          subtotal: Number(rubroObj.precio_rubro || 0),
        };
        caps[capIdx] = { ...cap, items: [...cap.items, newItem] };
        mostrarToast(`Rubro agregado al capítulo: ${cap.nombre}`, 'success');
      }

      return { ...prev, capitulos: caps };
    });
  };

  // Safe quantity controls
  const actualizarCantidadPlanilla = (capNombre: string, itemIdx: number, val: number) => {
    setNuevoPresupuesto((prev) => {
      const caps = prev.capitulos.map((cap) => {
        if (cap.nombre === capNombre) {
          const uItems = [...cap.items];
          const target = uItems[itemIdx];
          const qty = isNaN(val) || val < 0 ? 0 : val;
          uItems[itemIdx] = {
            ...target,
            cantidad: qty,
            subtotal: qty * target.precio,
          };
          return { ...cap, items: uItems };
        }
        return cap;
      });
      return { ...prev, capitulos: caps };
    });
  };

  const removerFilaPlanilla = (capNombre: string, idx: number) => {
    setNuevoPresupuesto((prev) => {
      const caps = prev.capitulos.map((cap) => {
        if (cap.nombre === capNombre) {
          const uItems = [...cap.items];
          uItems.splice(idx, 1);
          return { ...cap, items: uItems };
        }
        return cap;
      });
      return { ...prev, capitulos: caps };
    });
    mostrarToast('Rubro eliminado de la planilla.', 'info');
  };

  // Hot APU audits
  const auditarAPUEnVivo = async (idRubro: string) => {
    setCargandoReceta(true);
    setApuAuditor({ id_rubro: idRubro, mat: [], mob: [], eyh: [], transp: [] });
    try {
      // Función resiliente para consultar diferentes variaciones de tablas, ortografía y columnas de ID
      const queryCategory = async (primaryTable: string, fallbackTable: string) => {
        const tableOpts = [
          primaryTable,
          primaryTable.toLowerCase(),
          fallbackTable,
          fallbackTable.toLowerCase()
        ];
        const columnOpts = ['id_rubro', 'rubro_id', 'id_rubro_presup', 'id'];
        const idOptions = [idRubro].filter(Boolean);

        for (const table of tableOpts) {
          for (const col of columnOpts) {
            for (const idVal of idOptions) {
              try {
                const { data, error } = await supabase.from(table).select('*').eq(col, idVal);
                if (!error && data && data.length > 0) {
                  return data;
                }
              } catch (err) {
                // Siguiente combinación
              }
            }
          }
        }
        return [];
      };

      const [rM, rO, rE, rT] = await Promise.all([
        queryCategory('RECETA_MAT', 'receta_mat'),
        queryCategory('RECETA_MOB', 'receta_mob'),
        queryCategory('RECETA_EYH', 'receta_eyh'),
        queryCategory('RECETA_TRANSP', 'RECETA_TRASNP')
      ]);

      // Normalizador para asegurar la compatibilidad con las especificaciones de columnas del frontend
      const normalizarFilaReceta = (row: any, cat?: string) => {
        if (!row) return { codigo: '', descripcion: '', unidad: '', cantidad: 0, precio_unitario: 0, precio_total: 0 };
        const keys = Object.keys(row);

        // id_insumo_ o similar
        const idKey = keys.find(k =>
          k.toLowerCase().startsWith('id_insumo') ||
          k.toLowerCase() === 'codigo' ||
          k.toLowerCase() === 'codigo_insumo' ||
          k.toLowerCase() === 'insumo_id' ||
          k.toLowerCase() === 'id'
        );
        const codigo = idKey ? row[idKey] : (row.codigo || row.id_insumo || '');

        // name_insumo_ o similar
        const descKey = keys.find(k =>
          k.toLowerCase().startsWith('name_insumo') ||
          k.toLowerCase() === 'descripcion' ||
          k.toLowerCase() === 'nombre' ||
          k.toLowerCase() === 'nombre_insumo' ||
          k.toLowerCase() === 'description'
        );
        const descripcion = descKey ? row[descKey] : (row.descripcion || row.nombre || '');

        // unidad_ o similar
        const unitKey = keys.find(k =>
          k.toLowerCase().startsWith('unidad') ||
          k.toLowerCase() === 'u' ||
          k.toLowerCase() === 'medida' ||
          k.toLowerCase() === 'unidad_medida'
        );
        const unidad = unitKey ? row[unitKey] : (row.unidad || row.unid || 'u');

        // cantidad_ o similar
        const cantKey = keys.find(k =>
          k.toLowerCase().startsWith('cantidad') ||
          k.toLowerCase() === 'coeficiente' ||
          k.toLowerCase() === 'rendimiento' ||
          k.toLowerCase() === 'cant'
        );
        const cantidadVal = cantKey ? parseFloat(row[cantKey]) : 1;
        const cantidad = isNaN(cantidadVal) ? 1 : cantidadVal;

        // Búsqueda específica de precio_unitario_mat, etc. de las tablas RECETA_MAT, etc.
        let databasePrecioUnitario = 0;
        let databasePrecioReceta = 0;

        const pUnitKey = keys.find(k =>
          k.toLowerCase().startsWith('precio_unitario') ||
          k.toLowerCase() === 'precio_insumo' ||
          k.toLowerCase() === 'precio' ||
          k.toLowerCase() === 'costo'
        );
        if (pUnitKey) {
          databasePrecioUnitario = parseFloat(row[pUnitKey]) || 0;
        }

        const pRecetaKey = keys.find(k =>
          k.toLowerCase().startsWith('precio_receta_') ||
          k.toLowerCase().startsWith('precio_total_') ||
          k.toLowerCase() === 'precio_receta' ||
          k.toLowerCase() === 'precio_total' ||
          k.toLowerCase() === 'subtotal' ||
          k.toLowerCase() === 'total' ||
          k.toLowerCase() === 'precio_parcial' ||
          k.toLowerCase() === 'parcial'
        );
        if (pRecetaKey) {
          databasePrecioReceta = parseFloat(row[pRecetaKey]) || 0;
        }

        // BÚSQUEDA DEL INSUMO EN LAS TABLAS INSUMOS_MAT, ETC. PARA OBTENER LA UNIDAD Y PRECIO ACTUALIZADOS LIVE
        let resolvedDescription = String(descripcion || '');
        let resolvedUnidad = String(unidad || 'u');

        let resolvedPrecioUnitario = databasePrecioUnitario;
        let hasInsumoMatch = false;

        const lookupId = String(codigo || '').trim().toLowerCase();
        if (lookupId) {
          let guessedCat = cat;
          if (!guessedCat) {
            const upCod = lookupId.toUpperCase();
            if (upCod.startsWith('MAT-') || row.id_insumo_mat || 'id_insumo_mat' in row) {
              guessedCat = 'MAT';
            } else if (upCod.startsWith('MOB-') || upCod.startsWith('MO-') || row.id_insumo_mob || 'id_insumo_mob' in row) {
              guessedCat = 'MOB';
            } else if (upCod.startsWith('EYH-') || upCod.startsWith('EQ-') || row.id_insumo_eyh || 'id_insumo_eyh' in row) {
              guessedCat = 'EYH';
            } else if (upCod.startsWith('TRN-') || upCod.startsWith('TR-') || row.id_insumo_transp || 'id_insumo_transp' in row) {
              guessedCat = 'TRANSP';
            }
          }

          if (guessedCat === 'MAT') {
            const match = insumosMat.find(i =>
              String(i.id_insumo_mat || i.id || '').trim().toLowerCase() === lookupId
            );
            if (match) {
              hasInsumoMatch = true;
              resolvedDescription = match.name_insumo_mat || match.nombre || resolvedDescription;
              resolvedUnidad = match.unidad_mat || match.unidad || resolvedUnidad;
              const rawPrice = match.precio_mat !== undefined ? match.precio_mat : match.precio_insumo_mat;
              const matchPrice = typeof rawPrice === 'number' ? rawPrice : parseFloat(rawPrice);
              if (matchPrice !== undefined && !isNaN(matchPrice)) {
                resolvedPrecioUnitario = matchPrice;
              }
            }
          } else if (guessedCat === 'MOB') {
            const match = insumosMob.find(i =>
              String(i.id_insumo_mob || i.id || '').trim().toLowerCase() === lookupId
            );
            if (match) {
              hasInsumoMatch = true;
              resolvedDescription = match.name_insumo_mob || match.nombre || resolvedDescription;
              resolvedUnidad = match.unidad_mob || match.unidad || resolvedUnidad;
              const rawPrice = match.precio_mob !== undefined ? match.precio_mob : match.precio_insumo_mob;
              const matchPrice = typeof rawPrice === 'number' ? rawPrice : parseFloat(rawPrice);
              if (matchPrice !== undefined && !isNaN(matchPrice)) {
                resolvedPrecioUnitario = matchPrice;
              }
            }
          } else if (guessedCat === 'EYH') {
            const match = insumosEyh.find(i =>
              String(i.id_insumo_eyh || i.id || '').trim().toLowerCase() === lookupId
            );
            if (match) {
              hasInsumoMatch = true;
              resolvedDescription = match.name_insumo_eyh || match.nombre || resolvedDescription;
              resolvedUnidad = match.unidad_eyh || match.unidad || resolvedUnidad;
              const rawPrice = match.precio_eyh !== undefined ? match.precio_eyh : match.precio_insumo_eyh;
              const matchPrice = typeof rawPrice === 'number' ? rawPrice : parseFloat(rawPrice);
              if (matchPrice !== undefined && !isNaN(matchPrice)) {
                resolvedPrecioUnitario = matchPrice;
              }
            }
          } else if (guessedCat === 'TRANSP') {
            const match = insumosTransp.find(i =>
              String(i.id_insumo_transp || i.id || '').trim().toLowerCase() === lookupId
            );
            if (match) {
              hasInsumoMatch = true;
              resolvedDescription = match.name_insumo_transp || match.nombre || resolvedDescription;
              resolvedUnidad = match.unidad_transp || match.unidad || resolvedUnidad;
              const rawPrice = match.precio_transp !== undefined ? match.precio_transp : match.precio_insumo_transp;
              const matchPrice = typeof rawPrice === 'number' ? rawPrice : parseFloat(rawPrice);
              if (matchPrice !== undefined && !isNaN(matchPrice)) {
                resolvedPrecioUnitario = matchPrice;
              }
            }
          }
        }

        const resolvedPrecioTotal = databasePrecioReceta || (resolvedPrecioUnitario * cantidad);

        return {
          codigo: String(codigo || ''),
          descripcion: resolvedDescription,
          unidad: resolvedUnidad,
          amount: cantidad,
          cantidad,
          precio_unitario: resolvedPrecioUnitario || databasePrecioUnitario,
          precio_total: resolvedPrecioTotal,
        };
      };

      let dataMat = (rM || []).map(row => normalizarFilaReceta(row, 'MAT'));
      let dataMob = (rO || []).map(row => normalizarFilaReceta(row, 'MOB'));
      let dataEyh = (rE || []).map(row => normalizarFilaReceta(row, 'EYH'));
      let dataTransp = (rT || []).map(row => normalizarFilaReceta(row, 'TRANSP'));

      // Fallback a tabla unificada "RECETA" o "RECETAS" de Supabase si los resultados específicos están vacíos
      if (dataMat.length === 0 && dataMob.length === 0 && dataEyh.length === 0 && dataTransp.length === 0) {
        let unifiedRows: any[] = [];
        try {
          const { data } = await supabase.from('RECETA').select('*').eq('id_rubro', idRubro);
          if (data && data.length > 0) unifiedRows = data;
        } catch (e) { }

        if (unifiedRows.length === 0) {
          try {
            const { data } = await supabase.from('RECETA').select('*').eq('rubro_id', idRubro);
            if (data && data.length > 0) unifiedRows = data;
          } catch (e) { }
        }

        if (unifiedRows.length === 0) {
          try {
            const { data } = await supabase.from('RECETAS').select('*').eq('id_rubro', idRubro);
            if (data && data.length > 0) unifiedRows = data;
          } catch (e) { }
        }

        if (unifiedRows.length > 0) {
          unifiedRows.forEach((row: any) => {
            const t = (row.tipo || row.categoria || row.tipo_insumo || row.grupo || row.tabla || '').toString().toUpperCase();
            let cat = 'MAT';
            const normCod = String(row.codigo || row.id_insumo || '').toString().toUpperCase();
            if (t.includes('MAT') || t.includes('MATERIAL') || normCod.startsWith('MAT-')) {
              cat = 'MAT';
            } else if (t.includes('MOB') || t.includes('MANO') || t.includes('OPER') || t.includes('OBRA') || t.includes('TRABAJ') || normCod.startsWith('MOB-') || normCod.startsWith('MO-')) {
              cat = 'MOB';
            } else if (t.includes('EYH') || t.includes('EQU') || t.includes('MAQ') || t.includes('HERR') || normCod.startsWith('EYH-') || normCod.startsWith('EQ-')) {
              cat = 'EYH';
            } else if (t.includes('TRA') || t.includes('FLE') || normCod.startsWith('TRN-') || normCod.startsWith('TR-')) {
              cat = 'TRANSP';
            }

            const normalized = normalizarFilaReceta(row, cat);
            if (cat === 'MAT') {
              dataMat.push(normalized);
            } else if (cat === 'MOB') {
              dataMob.push(normalized);
            } else if (cat === 'EYH') {
              dataEyh.push(normalized);
            } else if (cat === 'TRANSP') {
              dataTransp.push(normalized);
            }
          });
        }
      }

      setApuAuditor({
        id_rubro: idRubro,
        mat: dataMat,
        mob: dataMob,
        eyh: dataEyh,
        transp: dataTransp,
      });
    } catch (err) {
      mostrarToast("Error analizando composición APU.", 'error');
    } finally {
      setCargandoReceta(false);
    }
  };

  const [cargandoIA, setCargandoIA] = useState(false);

  const generarPresupuestoConIA = async (ubicacion: string, tipoProyecto: string, descripcion: string) => {
    if (!configIA.apiKey) {
      mostrarToast('Por favor configure su Gemini API Key en la pestaña Configuración IA.', 'error');
      setTabActiva('config');
      return;
    }

    if (!descripcion.trim()) {
      mostrarToast('Por favor ingrese una descripción del proyecto.', 'error');
      return;
    }

    setCargandoIA(true);
    mostrarToast('Generando presupuesto con Gemini...', 'info');

    try {
      const catalogoTexto = todosLosRubros.map(r =>
        `- ID: "${r.id_rubro || r.id}", Nombre: "${r.nombre_rubro}", Unidad: "${r.unidad || 'm³'}", Precio: $${r.precio_rubro}`
      ).join('\n');

      const systemInstruction = `Eres un ingeniero civil de control de costos experto en cotización y presupuesto de obras.
Genera un presupuesto estructurado utilizando EXCLUSIVAMENTE los rubros disponibles en el catálogo de rubros provisto.
No inventes nuevos IDs de rubros ni agregues rubros que no estén en la lista provista.
Para cada rubro recomendado, determina una cantidad lógica coherente con la descripción de la obra y la unidad de medida del rubro.
Divide el presupuesto en capítulos lógicos relevantes (por ejemplo: "1. OBRAS PRELIMINARES", "2. ESTRUCTURAS", "3. ACABADOS").
El resultado debe ser devuelto estrictamente en formato JSON que cumpla con el esquema requerido.`;

      const prompt = `Detalles del Proyecto:
- Ubicación: ${ubicacion}
- Tipo de Proyecto: ${tipoProyecto}
- Descripción: ${descripcion}

Catálogo de Rubros disponibles (DEBES usar ÚNICAMENTE los IDs exactos de esta lista, no inventes IDs):
${catalogoTexto}`;

      const modelName = configIA.modelo || 'gemini-2.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${configIA.apiKey}`;

      const payload = {
        contents: [
          {
            parts: [
              {
                text: `${systemInstruction}\n\n${prompt}`
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              capitulos: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    nombre: { type: "STRING", description: "Nombre del capítulo del presupuesto" },
                    items: {
                      type: "ARRAY",
                      items: {
                        type: "OBJECT",
                        properties: {
                          id_rubro: { type: "STRING", description: "ID exacto del rubro del catálogo provisto" },
                          cantidad: { type: "NUMBER", description: "Cantidad estimada para la obra" }
                        },
                        required: ["id_rubro", "cantidad"]
                      }
                    }
                  },
                  required: ["nombre", "items"]
                }
              }
            },
            required: ["capitulos"]
          },
          temperature: configIA.temperatura ?? 0.1
        }
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || `Error HTTP ${res.status}`);
      }

      const resJson = await res.json();
      const text = resJson?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error('Respuesta vacía del modelo.');
      }

      const data = JSON.parse(text);
      if (!data.capitulos || !Array.isArray(data.capitulos)) {
        throw new Error('Formato de presupuesto no estructurado.');
      }

      // Mapear capítulos y sus items a rubros reales
      const capitulosMapeados: Capitulo[] = data.capitulos.map((cap: any) => {
        const itemsValidos: any[] = [];
        (cap.items || []).forEach((item: any) => {
          const rubroObj = todosLosRubros.find(r => (r.id_rubro || r.id) === item.id_rubro);
          if (rubroObj) {
            const qty = Number(item.cantidad) || 0;
            const price = Number(rubroObj.precio_rubro || 0);
            itemsValidos.push({
              id_rubro: rubroObj.id_rubro || rubroObj.id,
              nombre_rubro: rubroObj.nombre_rubro,
              unidad: rubroObj.unidad || 'm³',
              precio: price,
              cantidad: qty,
              subtotal: qty * price
            });
          } else {
            console.warn(`Rubro con ID "${item.id_rubro}" recomendado por la IA no fue encontrado en el catálogo.`);
          }
        });
        return {
          nombre: String(cap.nombre).toUpperCase(),
          items: itemsValidos
        };
      }).filter((cap: any) => cap.items.length > 0);

      if (capitulosMapeados.length === 0) {
        throw new Error('La IA no pudo emparejar ningún rubro del catálogo con la obra descrita.');
      }

      setNuevoPresupuesto((prev: any) => ({
        ...prev,
        proyecto: prev.proyecto || `${tipoProyecto} en ${ubicacion}`.trim(),
        cliente: prev.cliente || 'Cliente Estimado',
        capitulos: capitulosMapeados,
        capituloActivo: capitulosMapeados[0]?.nombre || prev.capituloActivo
      }));

      mostrarToast('✨ ¡Presupuesto generado con éxito por el Asistente IA!', 'success');
    } catch (error: any) {
      console.error(error);
      mostrarToast(`Error de IA: ${error.message || 'No se pudo generar el presupuesto.'}`, 'error');
    } finally {
      setCargandoIA(false);
    }
  };

  const guardarNuevoPresupuesto = async () => {
    if (!nuevoPresupuesto.proyecto || !nuevoPresupuesto.cliente) {
      mostrarToast('Por favor, ingrese el nombre del proyecto y de su cliente.', 'error');
      return;
    }

    const todosLosItemsAplanados: any[] = [];
    nuevoPresupuesto.capitulos.forEach((cap) => {
      cap.items.forEach((item) => {
        todosLosItemsAplanados.push({
          ...item,
          capitulo_nombre: cap.nombre
        });
      });
    });

    if (todosLosItemsAplanados.length === 0) {
      mostrarToast("No hay elementos para presupuestar.", 'error');
      return;
    }

    try {
      mostrarToast('Guardando en Supabase...', 'info');

      let presId = '';
      if (editandoPresupuestoId) {
        presId = editandoPresupuestoId;
        const { error: presError } = await supabase
          .from('PRESUPUESTOS')
          .update({
            nombre: `${nuevoPresupuesto.proyecto} | ${nuevoPresupuesto.cliente}`,
            precio_presup_total: Number(granTotalNuevoPresupuesto),
          })
          .eq('id', editandoPresupuestoId);

        if (presError) throw presError;

        // Limpiar detalles viejos
        await supabase.from('DETALLES_PRESUPUESTO').delete().eq('presupuesto_id', editandoPresupuestoId);
      } else {
        const { data: presData, error: presError } = await supabase
          .from('PRESUPUESTOS')
          .insert([
            {
              nombre: `${nuevoPresupuesto.proyecto} | ${nuevoPresupuesto.cliente}`,
              estado: 'Borrador',
              precio_presup_total: Number(granTotalNuevoPresupuesto),
            },
          ])
          .select()
          .single();

        if (presError) throw presError;
        presId = presData.id;
      }

      const detallesParaBD = todosLosItemsAplanados.map((item) => ({
        presupuesto_id: presId,
        id_rubro_presup: item.id_rubro,
        nombre_rubro_presup: item.nombre_rubro,
        unidad_rubro_presup: item.unidad,
        precio_rubro_presup: Number(item.precio),
        cantidad_presup: Number(item.cantidad),
        capitulo_presup: item.capitulo_nombre,
      }));

      const { error: detError } = await supabase
        .from('DETALLES_PRESUPUESTO')
        .insert(detallesParaBD);

      if (detError) throw detError;

      // Reset estimate form state
      setNuevoPresupuesto({
        proyecto: '',
        cliente: '',
        notas: '',
        capituloActivo: '1. OBRAS PRELIMINARES',
        capituloNuevo: '',
        capitulos: [
          { nombre: '1. OBRAS PRELIMINARES', items: [] },
          { nombre: '2. ESTRUCTURAS Y HORMIGONES', items: [] },
          { nombre: '3. MAMPOSTERÍAS Y ACABADOS', items: [] },
        ],
        indirectosPct: 12,
        utilidadPct: 8,
        ivaPct: 10,
      });

      setEditandoPresupuestoId(null);
      setMostrarCreadorPresupuesto(false);
      setBusquedaRubro('');
      await cargarPresupuestos();
      mostrarToast('¡Presupuesto guardado exitosamente en Supabase!', 'success');
    } catch (error: any) {
      console.error('Error al guardar:', error);
      mostrarToast('Error al guardar presupuesto: ' + error.message, 'error');
    }
  };

  const eliminarPresupuesto = async (id: string) => {
    try {
      mostrarToast('Eliminando...', 'info');
      await supabase.from('DETALLES_PRESUPUESTO').delete().eq('presupuesto_id', id);
      const { error } = await supabase.from('PRESUPUESTOS').delete().eq('id', id);
      if (error) throw error;

      mostrarToast('Presupuesto eliminado con éxito.', 'info');
      await cargarPresupuestos();
    } catch (err) {
      console.error('Error al eliminar:', err);
      mostrarToast('Error al eliminar presupuesto.', 'error');
    }
  };

  const actualizarEstadoPresupuesto = async (id: string, nuevoEstado: 'Borrador' | 'Aprobado' | 'Rechazado') => {
    try {
      setPresupuestos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, estado: nuevoEstado } : p))
      );

      const { error } = await supabase
        .from('PRESUPUESTOS')
        .update({ estado: nuevoEstado })
        .eq('id', id);

      if (error) throw error;
      mostrarToast(`Estado cambiado a ${nuevoEstado}.`, 'success');
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      mostrarToast('Error al actualizar el estado del presupuesto.', 'error');
      await cargarPresupuestos();
    }
  };

  const editarPresupuesto = (p: Presupuesto) => {
    setEditandoPresupuestoId(p.id);

    const defaultCapNames = [
      '1. OBRAS PRELIMINARES',
      '2. ESTRUCTURAS Y HORMIGONES',
      '3. MAMPOSTERÍAS Y ACABADOS'
    ];

    const capNames = new Set(defaultCapNames);
    (p.items || []).forEach((item: any) => {
      if (item.capitulo_presup) {
        capNames.add(item.capitulo_presup);
      }
    });

    const capitulosList = Array.from(capNames).map((name) => ({
      nombre: name,
      items: (p.items || []).filter((item: any) => {
        const itemCap = item.capitulo_presup || '1. OBRAS PRELIMINARES';
        return itemCap === name;
      })
    }));

    setNuevoPresupuesto({
      proyecto: p.proyecto,
      cliente: p.cliente,
      notas: '',
      capituloActivo: '1. OBRAS PRELIMINARES',
      capituloNuevo: '',
      capitulos: capitulosList,
      indirectosPct: 12,
      utilidadPct: 8,
      ivaPct: 10,
    });
    setMostrarCreadorPresupuesto(true);
  };

  const setMostrarCreadorYLimpiar = (show: boolean) => {
    setMostrarCreadorPresupuesto(show);
    if (!show) {
      setEditandoPresupuestoId(null);
      setNuevoPresupuesto({
        proyecto: '',
        cliente: '',
        notas: '',
        capituloActivo: '1. OBRAS PRELIMINARES',
        capituloNuevo: '',
        capitulos: [
          { nombre: '1. OBRAS PRELIMINARES', items: [] },
          { nombre: '2. ESTRUCTURAS Y HORMIGONES', items: [] },
          { nombre: '3. MAMPOSTERÍAS Y ACABADOS', items: [] },
        ],
        indirectosPct: 12,
        utilidadPct: 8,
        ivaPct: 10,
      });
    }
  };

  // High-fidelity invoice report pre-viewer
  const generarReporte = (pres: Presupuesto) => {
    setReporteActivo(pres);
  };

  const triggerBrowserPrint = () => {
    window.print();
  };

  // ── FILTERING DATA PIPELINES ─────────────────────────────────────────────────────
  const MAP_LISTS = React.useMemo(() => ({
    MAT: insumosMat,
    MOB: insumosMob,
    EYH: insumosEyh,
    TRANSP: insumosTransp,
  }), [insumosMat, insumosMob, insumosEyh, insumosTransp]);

  const listaPorCategoria = (key: string) => {
    const list = (MAP_LISTS as any)[key] || [];
    if (!busqueda) return list;
    const q = busqueda.toLowerCase().trim();
    return list.filter((item: any) => getNombre(item).toLowerCase().includes(q));
  };

  const rubrosFiltrados = React.useMemo(() => {
    const q = busquedaRubro.toLowerCase().trim();
    if (!q) return todosLosRubros;
    return todosLosRubros.filter((r) => (r.nombre_rubro || '').toLowerCase().includes(q));
  }, [todosLosRubros, busquedaRubro]);

  const getNombre = (i: any) => {
    return (
      i?.name_insumo_mat ||
      i?.name_insumo_mob ||
      i?.name_insumo_eyh ||
      i?.name_insumo_transp ||
      '—'
    );
  };

  const getPrecio = (i: any) => {
    if (!i) return null;
    const priceKey = Object.keys(i).find((k) => k.includes('precio'));
    return priceKey ? Number(i[priceKey]).toFixed(2) : null;
  };

  const camposExtra = React.useMemo(() => {
    if (!insumoSeleccionado) return [];
    const src = editando ? tempEdit : insumoSeleccionado;
    return Object.entries(src).filter(
      ([k]) =>
        !k.includes('name') &&
        k !== 'id' &&
        !k.startsWith('id_insumo') &&
        k !== 'created_at'
    );
  }, [insumoSeleccionado, editando, tempEdit]);

  const sRecetas = React.useMemo(() => [
    { label: 'Materiales', icon: 'ti-box', data: recetaMat },
    { label: 'Mano de Obra', icon: 'ti-users', data: recetaMob },
    { label: 'Equipos y Herramientas', icon: 'ti-crane', data: recetaEyh },
    { label: 'Transporte y Flete', icon: 'ti-truck', data: recetaTransp },
  ], [recetaMat, recetaMob, recetaEyh, recetaTransp]);

  // CATEGORIAS DATA
  const categorias = [
    { key: 'MAT', label: 'Materiales', icon: 'ti-box', color: '#f97316' },
    { key: 'MOB', label: 'Mano de Obra', icon: 'ti-users', color: '#ea580c' },
    { key: 'EYH', label: 'Equipos', icon: 'ti-crane', color: '#c2410c' },
    { key: 'TRANSP', label: 'Transporte', icon: 'ti-truck', color: '#9a3412' },
  ];

  // MOBILE EXTRA ADAPTERS (For budget creator)
  const mobileFlatItems = React.useMemo(() => {
    return nuevoPresupuesto.capitulos.flatMap((c) =>
      c.items.map((it) => ({ ...it, parentCapitulo: c.nombre }))
    );
  }, [nuevoPresupuesto.capitulos]);

  const agregarRubroNube = (r: Rubro) => {
    agregarRubroAPlanilla(r);
  };

  const eliminarItemDelPresupuesto = (flatIdx: number) => {
    const item = mobileFlatItems[flatIdx];
    if (!item) return;
    const capName = item.parentCapitulo;
    setNuevoPresupuesto((prev) => {
      const uCaps = prev.capitulos.map((c) => {
        if (c.nombre === capName) {
          const uItems = c.items.filter((it) => it.id_rubro !== item.id_rubro);
          return { ...c, items: uItems };
        }
        return c;
      });
      return { ...prev, capitulos: uCaps };
    });
    mostrarToast('Rubro eliminado de la planilla.', 'info');
  };

  const actualizarSubtotalItem = (item: any, qty: number) => {
    setNuevoPresupuesto((prev) => {
      const uCaps = prev.capitulos.map((c) => {
        if (c.nombre === item.parentCapitulo) {
          const uItems = c.items.map((it) => {
            if (it.id_rubro === item.id_rubro) {
              const checkedQty = isNaN(qty) || qty < 0 ? 0 : qty;
              return { ...it, cantidad: checkedQty, subtotal: checkedQty * it.precio };
            }
            return it;
          });
          return { ...c, items: uItems };
        }
        return c;
      });
      return { ...prev, capitulos: uCaps };
    });
  };

  return (
    <>
      {/* Toast Alert */}
      <AnimatePresence>
        {toast.visible && (
          <motion.div
            id="custom-toast"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`custom-toast ${toast.tipo}`}
          >
            <i className={`ti ${toast.tipo === 'error' ? 'ti-alert-circle' : 'ti-circle-check'}`}></i>
            <span>{toast.mensaje}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invoice Pre-view sheet */}
      {reporteActivo && (
        <ReportModal
          presupuesto={reporteActivo}
          onClose={() => setReporteActivo(null)}
          onTriggerBrowserPrint={triggerBrowserPrint}
        />
      )}

      {/* ╔══════════════════════════════════════╗ */}
      {/* ║            LAYOUT DESKTOP             ║ */}
      {/* ╚══════════════════════════════════════╝ */}
      {!isMobile ? (
        <div className="desk-root flex flex-col w-screen h-screen overflow-hidden">
          {/* Header */}
          <header id="desktop-app-header" className="desk-topbar">
            <div className="desk-logo select-none">APUStudio</div>
            <div className="desk-topbar-sep"></div>
            <span className="desk-brand font-black tracking-widest text-[11px]">ERP de Costos y Presupuestos</span>
            <nav className="desk-nav flex items-center">
              <a
                id="tab-btn-insumos"
                className={tabActiva === 'insumos' ? 'active font-bold' : ''}
                onClick={() => cambiarTab('insumos')}
              >
                <i className="ti ti-building-warehouse"></i> Insumos
              </a>
              <a
                id="tab-btn-rubros"
                className={tabActiva === 'rubros' ? 'active font-bold' : ''}
                onClick={() => cambiarTab('rubros')}
              >
                <i className="ti ti-clipboard-list"></i> Rubros (APU)
              </a>
              <a
                id="tab-btn-presupuestos"
                className={tabActiva === 'presupuestos' ? 'active font-bold' : ''}
                onClick={() => cambiarTab('presupuestos')}
              >
                <i className="ti ti-report-money"></i> Presupuestos
              </a>
              <a
                id="tab-btn-config"
                className={tabActiva === 'config' ? 'active font-bold' : ''}
                onClick={() => cambiarTab('config')}
              >
                <i className="ti ti-adjustments"></i> Configuración IA
              </a>
              <a
                id="tab-btn-upload"
                className={tabActiva === 'upload' ? 'active font-bold' : ''}
                onClick={() => cambiarTab('upload')}
              >
                <i className="ti ti-file-upload"></i> Importar APU
              </a>
            </nav>
            <div className="desk-topbar-right">
              <span className={`desk-badge text-[10px] ${cargando ? 'loading' : ''} px-2.5 py-1 rounded-md`}>
                <i className={`ti ${cargando ? 'ti-loader-2 spin' : 'ti-database'}`}></i>
                {cargando ? 'Conectando...' : isLiveSupabase ? 'CONECTADO' : 'MODO LOCAL'}
              </span>
              <span className="desk-user text-xs font-semibold text-stone-300">
                <i className="ti ti-user-circle"></i> Administrador
              </span>
            </div>
          </header>

          <div className="desk-workspace flex flex-1 overflow-hidden">
            {/* Sidebar Desktop */}
            <aside id="desktop-app-sidebar" className={`desk-sidebar ${sidebarColapsado ? 'collapsed' : ''}`}>
              <div className="desk-sidebar-toggle-row">
                <button
                  id="btn-toggle-sidebar"
                  className="desk-sidebar-toggle-btn cursor-pointer"
                  onClick={toggleSidebar}
                  title="Alternar visibilidad del panel lateral"
                >
                  <i
                    className={`ti ${sidebarColapsado ? 'ti-layout-sidebar-expand' : 'ti-layout-sidebar-collapse'}`}
                  ></i>
                </button>
              </div>

              <div className="desk-sidebar-section flex flex-col">
                {!sidebarColapsado && <div className="desk-sidebar-label">Gestión Operativa</div>}
                <div
                  id="side-btn-insumos"
                  className={`desk-sidebar-item ${tabActiva === 'insumos' ? 'active' : ''}`}
                  onClick={() => cambiarTab('insumos')}
                >
                  <i className="ti ti-box"></i>
                  {!sidebarColapsado && <span className="sidebar-text">Inventario e Insumos</span>}
                </div>
                <div
                  id="side-btn-rubros"
                  className={`desk-sidebar-item ${tabActiva === 'rubros' ? 'active' : ''}`}
                  onClick={() => cambiarTab('rubros')}
                >
                  <i className="ti ti-list-check"></i>
                  {!sidebarColapsado && <span className="sidebar-text">Precios Unitarios</span>}
                </div>
                <div
                  id="side-btn-presupuestos"
                  className={`desk-sidebar-item ${tabActiva === 'presupuestos' ? 'active' : ''}`}
                  onClick={() => cambiarTab('presupuestos')}
                >
                  <i className="ti ti-file-invoice"></i>
                  {!sidebarColapsado && <span className="sidebar-text">Presupuestos</span>}
                </div>
                <div
                  id="side-btn-upload"
                  className={`desk-sidebar-item ${tabActiva === 'upload' ? 'active' : ''}`}
                  onClick={() => cambiarTab('upload')}
                >
                  <i className="ti ti-file-upload"></i>
                  {!sidebarColapsado && <span className="sidebar-text">Importar APU (PDF)</span>}
                </div>
              </div>

              <div className="desk-sidebar-hr"></div>

              <div className="desk-sidebar-section flex flex-col">
                {!sidebarColapsado && <div className="desk-sidebar-label">Configuración</div>}
                <div
                  id="side-btn-config"
                  className={`desk-sidebar-item ${tabActiva === 'config' ? 'active' : ''}`}
                  onClick={() => cambiarTab('config')}
                >
                  <i className="ti ti-settings"></i>
                  {!sidebarColapsado && <span className="sidebar-text">Ajustes e IA</span>}
                </div>
              </div>

              {!sidebarColapsado && (
                <div className="desk-sidebar-footer text-[10px] text-stone-500 font-semibold uppercase mt-auto p-4 border-t border-stone-850">
                  v2.5.0 · <span>Plataforma ERP</span>
                </div>
              )}
            </aside>

            {/* TAB CONTROLS DESKTOP */}
            {tabActiva === 'insumos' && (
              <InsumosPanel
                categorias={categorias}
                categoriaAbierta={categoriaAbierta}
                setCategoriaAbierta={setCategoriaAbierta}
                insumoSeleccionado={insumoSeleccionado}
                seleccionarInsumo={seleccionarInsumo}
                busqueda={busqueda}
                setBusqueda={setBusqueda}
                listaPorCategoria={listaPorCategoria}
                editando={editando}
                setEditando={setEditando}
                tempEdit={tempEdit}
                setTempEdit={setTempEdit}
                iniciarEdicion={iniciarEdicion}
                cancelarEdicion={cancelarEdicion}
                guardarCambios={guardarCambios}
                isMobile={isMobile}
                vista={vista}
                setVista={setVista}
                getNombre={getNombre}
                getPrecio={getPrecio}
                camposExtra={camposExtra}
              />
            )}

            {tabActiva === 'rubros' && (
              <RubrosPanel
                rubrosFiltrados={rubrosFiltrados}
                rubroSeleccionado={rubroSeleccionado}
                seleccionarRubro={seleccionarRubro}
                busquedaRubro={busquedaRubro}
                setBusquedaRubro={setBusquedaRubro}
                cargandoReceta={cargandoReceta}
                seccionesReceta={sRecetas}
                actualizarRubro={actualizarRubro}
                actualizarCantidadReceta={actualizarCantidadReceta}
                eliminarInsumoReceta={eliminarInsumoReceta}
                agregarInsumoReceta={agregarInsumoReceta}
                insumosMat={insumosMat}
                insumosMob={insumosMob}
                insumosEyh={insumosEyh}
                insumosTransp={insumosTransp}
                crearRubro={crearRubro}
              />
            )}

            {tabActiva === 'presupuestos' && (
              <PresupuestosPanel
                presupuestos={presupuestos}
                mostrarCreadorPresupuesto={mostrarCreadorPresupuesto}
                setMostrarCreadorPresupuesto={setMostrarCreadorYLimpiar}
                nuevoPresupuesto={nuevoPresupuesto}
                setNuevoPresupuesto={setNuevoPresupuesto}
                rubrosFiltrados={rubrosFiltrados}
                busquedaRubro={busquedaRubro}
                setBusquedaRubro={setBusquedaRubro}
                agregarRubroAPlanilla={agregarRubroAPlanilla}
                eliminarPresupuesto={eliminarPresupuesto}
                generarReporte={generarReporte}
                metricasPresupuesto={metricasPresupuesto}
                costoDirectoNuevoPresupuesto={costoDirectoNuevoPresupuesto}
                montoIndirectos={montoIndirectos}
                montoUtilidad={montoUtilidad}
                subtotalConIndirectos={subtotalConIndirectos}
                montoIva={montoIva}
                granTotalNuevoPresupuesto={granTotalNuevoPresupuesto}
                agregarCapitulo={agregarCapitulo}
                removerFilaPlanilla={removerFilaPlanilla}
                actualizarCantidadPlanilla={actualizarCantidadPlanilla}
                guardarNuevoPresupuesto={guardarNuevoPresupuesto}
                auditarAPUEnVivo={auditarAPUEnVivo}
                apuAuditor={apuAuditor}
                setApuAuditor={setApuAuditor}
                cargandoReceta={cargandoReceta}
                todosLosRubros={todosLosRubros}
                cambiarEstadoPresupuesto={actualizarEstadoPresupuesto}
                editarPresupuesto={editarPresupuesto}
                generarPresupuestoConIA={generarPresupuestoConIA}
                cargandoIA={cargandoIA}
              />
            )}

            {tabActiva === 'upload' && (
              <UploadPanel />
            )}

            {tabActiva === 'config' && (
              <ConfigPanel configIA={configIA} setConfigIA={setConfigIA} />
            )}
          </div>

          {/* Footer Statusbar */}
          <footer id="desktop-app-statusbar" className="desk-statusbar">
            <span>
              <span className="desk-dot"></span> Base de Datos Sincronizada
            </span>
            <span className="desk-status-sep">|</span>
            <span>
              Resumen de Inventarios: {insumosMat.length} mat · {insumosMob.length} mob ·{' '}
              {insumosEyh.length} eyh · {insumosTransp.length} trns
            </span>
            <span className="desk-status-sep">|</span>
            <span>{todosLosRubros.length} Índices Compuestos</span>
            <span style={{ marginLeft: 'auto' }}>SaaS Control Patrimonial v2.5.0</span>
          </footer>
        </div>
      ) : (
        <div className="mob-root flex flex-col w-screen h-screen overflow-hidden">
          {/* ╔══════════════════════════════════════╗ */}
          {/* ║             LAYOUT MÓVIL             ║ */}
          {/* ╚══════════════════════════════════════╝ */}
          <header id="mobile-app-header" className="mob-topbar flex items-center shrink-0">
            {vista !== 'lista' && (
              <button onClick={() => setVista('lista')} className="mob-back cursor-pointer p-1">
                <i className="ti ti-chevron-left text-lg text-white"></i>
              </button>
            )}
            {vista === 'lista' ? (
              <div className="mob-brand flex items-center gap-2">
                <span className="mob-brand-mark">APUStudio</span>
                <span className="mob-brand-name font-black tracking-widest text-xs uppercase text-white">
                  Sistema de Costos
                </span>
              </div>
            ) : (
              <div className="mob-topbar-title font-bold text-xs uppercase text-white truncate px-2">
                {vista === 'detalle' ? 'Especificación Técnica' : 'Estructura Analítica'}
              </div>
            )}
            <div className="mob-topbar-right ml-auto flex items-center gap-2 pr-3">
              {cargando && <i className="ti ti-loader-2 spin text-orange-500"></i>}
              {vista === 'detalle' && !editando && (
                <button className="mob-btn-icon cursor-pointer text-white" onClick={iniciarEdicion}>
                  <i className="ti ti-pencil"></i>
                </button>
              )}
            </div>
          </header>

          <main className="mob-scroll flex-1 overflow-y-auto bg-stone-100 p-4 pb-20">
            {/* VIEW list - Insumos */}
            {vista === 'lista' && tabActiva === 'insumos' && (
              <div className="space-y-4">
                <div className="mob-search-wrap relative flex-shrink-0">
                  <i className="ti ti-search mob-search-icon absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"></i>
                  <input
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    type="search"
                    placeholder="Consultar inventario…"
                    className="mob-search-input w-full pl-9 pr-3 py-2 border border-stone-300 rounded-xl bg-white text-xs outline-none"
                  />
                </div>
                {categorias.map((cat) => {
                  const list = listaPorCategoria(cat.key);
                  const isOpen = categoriaAbierta === cat.key;
                  return (
                    <div key={cat.key} className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
                      <button
                        onClick={() => setCategoriaAbierta(isOpen ? null : cat.key)}
                        className="w-full p-4 flex items-center gap-3 active:bg-stone-50"
                      >
                        <span
                          className="w-8 h-8 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: cat.color + '15' }}
                        >
                          <i className={`ti ${cat.icon} text-sm`} style={{ color: cat.color }}></i>
                        </span>
                        <span className="text-xs font-bold text-stone-800 flex-1 text-left">{cat.label}</span>
                        <span className="text-[10px] bg-stone-100 font-bold px-2 py-0.5 rounded-full text-stone-500">
                          {list.length}
                        </span>
                        <i
                          className={`ti ti-chevron-right text-stone-400 transition-transform ${isOpen ? 'rotate-90' : ''
                            }`}
                        ></i>
                      </button>
                      {isOpen && (
                        <div className="divide-y divide-stone-100 border-t border-stone-100">
                          {list.map((item) => {
                            const itemId = item.id_insumo_mat || item.id_insumo_mob || item.id_insumo_eyh || item.id_insumo_transp || item.id || item.id_insumo;
                            return (
                              <button
                                key={itemId}
                                onClick={() => seleccionarInsumo(item, cat.key)}
                                className="w-full px-4 py-3 hover:bg-stone-50/50 flex items-center justify-between"
                              >
                                <div className="flex flex-col text-left">
                                  <span className="text-[11px] font-bold text-stone-800 truncate max-w-56">
                                    {getNombre(item)}
                                  </span>
                                  <span className="text-[9px] text-stone-400 font-mono">ID: {itemId}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs font-bold text-orange-600 font-mono">
                                  {getPrecio(item) && <span>${getPrecio(item)}</span>}
                                  <i className="ti ti-chevron-right text-stone-300"></i>
                                </div>
                              </button>
                            );
                          })}
                          {list.length === 0 && (
                            <div className="p-4 text-center text-xs text-stone-400 italic">
                              No se encontraron elementos.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* VIEW list - Rubros */}
            {vista === 'lista' && tabActiva === 'rubros' && (
              <div className="space-y-4">
                <div className="mob-search-wrap relative flex-shrink-0">
                  <i className="ti ti-search mob-search-icon absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-bold"></i>
                  <input
                    value={busquedaRubro}
                    onChange={(e) => setBusquedaRubro(e.target.value)}
                    type="search"
                    placeholder="Investigar composición…"
                    className="mob-search-input w-full pl-9 pr-3 py-2 border border-stone-350 rounded-xl bg-white text-xs outline-none"
                  />
                </div>
                <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden divide-y divide-stone-100">
                  {rubrosFiltrados.map((r) => (
                    <button
                      key={r.id_rubro}
                      onClick={() => seleccionarRubro(r)}
                      className="w-full p-4 hover:bg-stone-50/55 flex items-center gap-3 text-left"
                    >
                      <span className="font-mono text-[9px] bg-stone-100 text-stone-500 font-bold px-1.5 py-0.5 rounded">
                        {r.id_rubro}
                      </span>
                      <span className="text-[11px] font-bold text-stone-850 flex-1 truncate">{r.nombre_rubro}</span>
                      <span className="font-mono text-xs font-black text-orange-600">${Number(r.precio_rubro).toFixed(2)}</span>
                    </button>
                  ))}
                  {rubrosFiltrados.length === 0 && (
                    <div className="text-center py-12 text-stone-400 italic text-xs">
                      No se encontraron rubros.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW list - Presupuestos */}
            {vista === 'lista' && tabActiva === 'presupuestos' && (
              <div>
                {!mostrarCreadorPresupuesto ? (
                  <div className="space-y-4">
                    <button
                      onClick={() => setMostrarCreadorPresupuesto(true)}
                      className="bg-orange-600 active:bg-orange-700 text-white w-full py-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md animate-pulse cursor-pointer"
                    >
                      <i className="ti ti-plus"></i> Iniciar Nueva Cotización
                    </button>

                    <h3 className="text-xs font-black uppercase tracking-wider text-stone-500 mb-2 pl-1">
                      Directorio de Documentos
                    </h3>
                    {presupuestos.map((p) => (
                      <div
                        key={p.id}
                        className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col"
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-stone-350"></div>
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex gap-2 items-center">
                            <span className="text-[10px] font-mono font-bold text-stone-400">
                              ID: {p.id.slice(0, 8).toUpperCase()}
                            </span>
                            <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border border-orange-200 bg-orange-50 text-orange-600 select-none">
                              {p.estado}
                            </span>
                          </div>
                          <button
                            className="text-stone-300 active:text-red-500 cursor-pointer"
                            onClick={() => eliminarPresupuesto(p.id)}
                          >
                            <i className="ti ti-trash"></i>
                          </button>
                        </div>
                        <h4 className="font-bold text-xs text-stone-800 m-0 leading-tight pl-2">{p.proyecto}</h4>
                        <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wider pl-2 mt-1 mb-4">
                          <i className="ti ti-building text-[9px] text-stone-400"></i> {p.cliente}
                        </p>

                        <div className="border-t border-stone-100 pt-3 flex justify-between items-center pl-2">
                          <div>
                            <span className="text-[8px] uppercase tracking-widest text-stone-400 font-bold block mb-0.5">
                              Estimación Base
                            </span>
                            <strong className="text-stone-850 text-base font-mono">
                              ${p.monto.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                            </strong>
                          </div>
                          <button
                            onClick={() => generarReporte(p)}
                            className="bg-stone-900 active:bg-orange-600 text-white font-bold font-sans text-[11px] px-4 py-2 rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <i className="ti ti-file-export"></i> PDF
                          </button>
                        </div>
                      </div>
                    ))}
                    {presupuestos.length === 0 && (
                      <div className="text-center py-20 bg-stone-50 border-2 border-dashed border-stone-200 rounded-2xl text-stone-400 italic text-xs">
                        No se encontraron presupuestos registrados.
                      </div>
                    )}
                  </div>
                ) : (
                  // MOBILE CREATOR SHEET (Nubes)
                  <div className="space-y-4">
                    <button
                      className="text-stone-500 font-bold text-xs flex items-center gap-1 active:text-orange-600"
                      onClick={() => setMostrarCreadorPresupuesto(false)}
                    >
                      <i className="ti ti-arrow-left"></i> Retornar al Directorio
                    </button>

                    <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm text-xs">
                      <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-3">
                        Metadatos del Proyecto
                      </h4>
                      <div className="flex flex-col gap-3">
                        <input
                          id="mobile-input-proyecto"
                          type="text"
                          placeholder="Obra o Proyecto..."
                          className="w-full text-xs p-2.5 border border-stone-305 rounded-xl bg-stone-50 outline-none"
                          value={nuevoPresupuesto.proyecto}
                          onChange={(e) => setNuevoPresupuesto((prev) => ({ ...prev, proyecto: e.target.value }))}
                        />
                        <input
                          id="mobile-input-cliente"
                          type="text"
                          placeholder="Cliente Contratante..."
                          className="w-full text-xs p-2.5 border border-stone-305 rounded-xl bg-stone-50 outline-none"
                          value={nuevoPresupuesto.cliente}
                          onChange={(e) => setNuevoPresupuesto((prev) => ({ ...prev, cliente: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm text-xs">
                      <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-3">
                        Nube de Inserción Rápida
                      </h4>
                      <div className="relative mb-3 flex-shrink-0">
                        <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"></i>
                        <input
                          id="mobile-nube-search"
                          value={busquedaRubro}
                          onChange={(e) => setBusquedaRubro(e.target.value)}
                          type="text"
                          placeholder="Buscar rubro para añadir..."
                          className="w-full text-xs pl-9 pr-3 py-2 border border-stone-300 rounded-xl bg-stone-50 outline-none"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5 mb-4">
                        <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest pl-1">
                          Capítulo de Destino (Añadir a):
                        </label>
                        <select
                          id="mobile-capitulo-activo"
                          value={nuevoPresupuesto.capituloActivo || ''}
                          onChange={(e) => setNuevoPresupuesto((prev: any) => ({ ...prev, capituloActivo: e.target.value }))}
                          className="w-full text-xs p-2.5 border border-stone-300 rounded-xl bg-stone-50 outline-none font-semibold text-stone-700 cursor-pointer"
                        >
                          {(nuevoPresupuesto.capitulos || []).map((cap) => (
                            <option key={cap.nombre} value={cap.nombre}>
                              {cap.nombre}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pb-1 scrollbar-thin">
                        {rubrosFiltrados.map((r) => (
                          <button
                            key={r.id_rubro}
                            onClick={() => agregarRubroNube(r)}
                            className="bg-stone-50 hover:bg-orange-50 border border-stone-200 px-3 py-1.5 rounded-full shadow-sm text-[10px] font-bold text-stone-600 flex items-center gap-1.5 active:bg-orange-100"
                          >
                            <i className="ti ti-plus text-stone-400"></i> {r.nombre_rubro}
                          </button>
                        ))}
                      </div>
                    </div>

                    <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pl-1 mt-5">
                      Planilla Asignada
                    </h4>
                    <div className="flex flex-col gap-3">
                      {mobileFlatItems.map((item, idx) => (
                        <div
                          key={idx}
                          className="bg-white rounded-2xl p-4 border border-stone-250 shadow-sm relative overflow-hidden"
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-400"></div>
                          <div className="flex justify-between items-start pl-2 text-xs">
                            <div className="flex-1 pr-2">
                              <span className="font-mono text-[9px] text-stone-400 font-bold uppercase">{item.id_rubro}</span>
                              <h4 className="font-bold text-stone-800 text-[12px] leading-snug mt-0.5">
                                {item.nombre_rubro}
                              </h4>
                            </div>
                            <button
                              onClick={() => eliminarItemDelPresupuesto(idx)}
                              className="text-stone-300 active:text-red-500 p-1"
                            >
                              <i className="ti ti-trash"></i>
                            </button>
                          </div>

                          <div className="flex items-center justify-between bg-stone-50 p-2.5 rounded-xl border border-stone-100 mt-3 ml-2">
                            <div className="flex flex-col text-xs">
                              <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider block mb-0.5">
                                Cant ({item.unidad})
                              </span>
                              <input
                                id={`qty-mob-${idx}`}
                                type="number"
                                min="0"
                                step="any"
                                className="w-16 bg-transparent font-bold text-orange-600 border-b border-orange-200 outline-none text-xs focus:border-orange-550"
                                value={item.cantidad || ''}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  actualizarSubtotalItem(item, isNaN(val) ? 0 : val);
                                }}
                              />
                            </div>
                            <div className="text-right text-xs">
                              <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider block mb-0.5">
                                Parcial
                              </span>
                              <span className="font-mono font-bold text-emerald-600 text-sm">
                                ${item.subtotal.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}

                      {mobileFlatItems.length === 0 && (
                        <div className="text-center py-8 bg-stone-50 border-2 border-dashed border-stone-200 rounded-2xl text-stone-400 text-xs">
                          La matriz está vacía. Seleccione componentes paramétricos arriba.
                        </div>
                      )}
                    </div>

                    <div className="bg-stone-900 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden mt-6 flex flex-col">
                      <div className="absolute -right-4 -top-4 w-16 h-16 bg-orange-600 rounded-full opacity-30 blur-xl"></div>
                      <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider z-10 block mb-0.5">
                        Monto Global Estimado (C. Directo)
                      </span>
                      <strong className="text-2xl font-mono font-black text-orange-400 z-10 leading-tight">
                        ${costoDirectoNuevoPresupuesto.toFixed(2)}
                      </strong>
                    </div>

                    <button
                      onClick={guardarNuevoPresupuesto}
                      className="bg-orange-600 active:bg-orange-700 text-white w-full py-4 rounded-2xl font-black text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-2 cursor-pointer mt-3"
                    >
                      <i className="ti ti-device-floppy"></i> Consolidar Obra
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* VIEW list - Config */}
            {vista === 'lista' && tabActiva === 'config' && (
              <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm text-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider mb-4 text-stone-800">
                  Ajustes de Modelo Generativo
                </h3>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest pl-1">Estándar Activo</span>
                    <select
                      id="mobile-model-ia"
                      className="w-full text-xs p-2.5 border border-stone-305 rounded-xl bg-stone-50 outline-none"
                      value={configIA.modelo}
                      onChange={(e) => setConfigIA((prev) => ({ ...prev, modelo: e.target.value }))}
                    >
                      <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                      <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                    </select>
                  </div>
                  <p className="text-[10px] text-stone-400 m-0 mt-2 italic leading-relaxed">
                    Prevención de colisiones activa. El proceso transaccional emplea directivas tipo Upsert para mantener sincronizada su base local.
                  </p>
                </div>
              </div>
            )}

            {/* VIEW list - Upload */}
            {vista === 'lista' && tabActiva === 'upload' && (
              <UploadPanel />
            )}

            {/* VIEW detail - Insumo */}
            {vista === 'detalle' && insumoSeleccionado && (
              <div className="space-y-4">
                <div className="flex gap-2 flex-wrap pb-1">
                  <span className="bg-orange-50 text-orange-700 border border-orange-150 text-[10px] font-bold px-2 py-0.5 rounded-full select-none">
                    <i className="ti ti-check"></i> Activo
                  </span>
                  <span className="bg-stone-200 text-stone-600 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full select-none">
                    ID: {insumoSeleccionado.id_insumo_mat || insumoSeleccionado.id_insumo_mob || insumoSeleccionado.id_insumo_eyh || insumoSeleccionado.id_insumo_transp || insumoSeleccionado.id || insumoSeleccionado.id_insumo}
                  </span>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm space-y-4 text-xs">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">Designación Técnica</span>
                    {editando ? (
                      <input
                        id="mob-edit-name"
                        type="text"
                        className="w-full p-2.5 border border-stone-300 rounded-xl bg-white text-xs outline-none"
                        value={tempEdit[Object.keys(tempEdit).find((k) => k.includes('name')) || ''] || ''}
                        onChange={(e) => {
                          const key = Object.keys(tempEdit).find((k) => k.includes('name')) || '';
                          setTempEdit((prev: any) => ({ ...prev, [key]: e.target.value }));
                        }}
                      />
                    ) : (
                      <div className="font-extrabold text-[14px] text-stone-850 bg-stone-50 p-3 rounded-xl border border-stone-150">
                        {getNombre(insumoSeleccionado)}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3.5 border-t border-stone-100 pt-4">
                    {camposExtra.map(([key, val]) => {
                      const isPrice = key.toLowerCase().includes('precio');
                      return (
                        <div key={key} className="flex flex-col gap-1">
                          <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">
                            {key.replace(/_/g, ' ')}
                          </span>
                          {editando ? (
                            isPrice ? (
                              <input
                                id={`mob-edit-key-${key}`}
                                type="number"
                                step="0.01"
                                className="w-full p-2.5 border border-stone-300 rounded-xl bg-white text-xs font-mono font-bold text-orange-600 outline-none"
                                value={tempEdit[key] ?? ''}
                                onChange={(e) =>
                                  setTempEdit((prev: any) => ({
                                    ...prev,
                                    [key]: parseFloat(e.target.value) || 0,
                                  }))
                                }
                              />
                            ) : (
                              <input
                                id={`mob-edit-key-${key}`}
                                type="text"
                                className="w-full p-2.5 border border-stone-300 rounded-xl bg-white text-xs outline-none"
                                value={tempEdit[key] ?? ''}
                                onChange={(e) =>
                                  setTempEdit((prev: any) => ({ ...prev, [key]: e.target.value }))
                                }
                              />
                            )
                          ) : (
                            <div
                              className={`p-2.5 rounded-lg border text-xs min-h-[34px] flex items-center ${isPrice
                                ? 'font-bold font-mono text-orange-600 bg-orange-50 border-orange-100'
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
                  <div className="flex gap-2 text-xs">
                    <button
                      onClick={cancelarEdicion}
                      className="flex-1 py-3 border border-stone-300 rounded-xl font-bold bg-white text-stone-500 active:bg-stone-100 cursor-pointer"
                    >
                      Descartar
                    </button>
                    <button
                      onClick={guardarCambios}
                      className="flex-1 py-3 bg-orange-600 text-white rounded-xl font-bold active:bg-orange-700 cursor-pointer"
                    >
                      Consolidar
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* VIEW apu - Unitary Price Analysis */}
            {vista === 'apu' && rubroSeleccionado && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm text-xs">
                  <h4 className="font-extrabold text-xs text-stone-850 uppercase tracking-tight leading-snug m-0">
                    {rubroSeleccionado.nombre_rubro}
                  </h4>
                  <div className="flex gap-2 mt-2">
                    <span className="font-mono text-[9px] font-bold uppercase tracking-wide bg-stone-100 text-stone-500 border border-stone-150 px-2 py-0.5 rounded-full select-none">
                      {rubroSeleccionado.id_rubro}
                    </span>
                    <span className="font-sans text-[9px] font-bold uppercase tracking-wide bg-orange-50 text-orange-700 border border-orange-150 px-2 py-0.5 rounded-full select-none">
                      {rubroSeleccionado.unidad || 'm³'}
                    </span>
                  </div>
                  <div className="bg-orange-50 border border-orange-150 p-3.5 rounded-xl flex items-center justify-between font-bold mt-4">
                    <span className="text-[10px] text-stone-600 uppercase tracking-wide">Valor unitario estimado:</span>
                    <strong className="text-base text-orange-600 font-mono">
                      ${Number(rubroSeleccionado.precio_rubro || 0).toFixed(2)}
                    </strong>
                  </div>
                </div>

                {cargandoReceta ? (
                  <div className="p-8 text-center text-xs text-stone-400 font-bold flex flex-col items-center gap-2">
                    <i className="ti ti-loader-2 spin text-orange-600"></i>
                    <span>Calculando variables analíticas…</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sRecetas.map((sec) => {
                      const sTotal = sec.data.reduce((a, r) => a + (Number(r.precio_total) || 0), 0);
                      return (
                        <div key={sec.label} className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm text-xs">
                          <div className="bg-stone-800 text-white p-3 font-bold flex justify-between items-center text-[10px] tracking-wide uppercase">
                            <span className="flex items-center gap-1.5"><i className={`ti ${sec.icon}`}></i> {sec.label}</span>
                            <span className="font-mono text-orange-400 font-black">${sTotal.toFixed(2)}</span>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-[10px] border-collapse m-0">
                              <thead>
                                <tr className="bg-stone-50 border-b border-stone-200 text-stone-400 font-bold uppercase">
                                  <th className="py-2 px-3 w-12">Cod</th>
                                  <th className="py-2 px-3">Descripción</th>
                                  <th className="py-2 px-3 text-center">Unidad</th>
                                  <th className="py-2 px-3 text-center">Cant</th>
                                  <th className="py-2 px-3 text-right">P. Unit</th>
                                  <th className="py-2 px-3 text-right">Parcial</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-stone-100">
                                {sec.data.map((row, idx) => (
                                  <tr key={idx} className="hover:bg-stone-50/50">
                                    <td className="py-2 px-3 text-stone-400 font-mono text-[9px]">{row.codigo}</td>
                                    <td className="py-2 px-3 font-semibold text-stone-700 truncate max-w-44">{row.descripcion}</td>
                                    <td className="py-2 px-3 text-center">{row.unidad}</td>
                                    <td className="py-2 px-3 text-center font-bold text-stone-600">{row.cantidad}</td>
                                    <td className="py-2 px-3 text-right font-mono text-stone-600">${Number(row.precio_unitario || 0).toFixed(2)}</td>
                                    <td className="py-2 px-3 text-right font-mono font-bold text-orange-600">${Number(row.precio_total).toFixed(2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}

                    <div className="bg-stone-900 text-white p-4 rounded-2xl shadow flex items-center justify-between text-xs mt-4">
                      <span className="uppercase text-[9px] font-bold text-stone-400 tracking-wider">PRECIO TOTAL DIRECTO COMPUESTO</span>
                      <strong className="text-lg font-mono font-black text-orange-400">
                        ${Number(rubroSeleccionado.precio_rubro || 0).toFixed(2)}
                      </strong>
                    </div>
                  </div>
                )}
              </div>
            )}
          </main>

          {/* Navigation bar mobile */}
          <nav id="mobile-app-tabbar" className="mob-tabbar flex-shrink-0">
            <button
              className={`mob-tab ${tabActiva === 'insumos' ? 'active' : ''}`}
              onClick={() => cambiarTab('insumos')}
            >
              <i className="ti ti-box"></i>
              <span>Catálogo</span>
            </button>
            <button
              className={`mob-tab ${tabActiva === 'rubros' ? 'active' : ''}`}
              onClick={() => cambiarTab('rubros')}
            >
              <i className="ti ti-clipboard-list"></i>
              <span>Índices</span>
            </button>
            <button
              className={`mob-tab ${tabActiva === 'presupuestos' ? 'active' : ''}`}
              onClick={() => cambiarTab('presupuestos')}
            >
              <i className="ti ti-report-money"></i>
              <span>Reportes</span>
            </button>
            <button
              className={`mob-tab ${tabActiva === 'upload' ? 'active' : ''}`}
              onClick={() => cambiarTab('upload')}
            >
              <i className="ti ti-file-upload"></i>
              <span>Cargar APU</span>
            </button>
            <button
              className={`mob-tab ${tabActiva === 'config' ? 'active' : ''}`}
              onClick={() => cambiarTab('config')}
            >
              <i className="ti ti-adjustments"></i>
              <span>Gestión</span>
            </button>
          </nav>
        </div>
      )}
    </>
  );
}
