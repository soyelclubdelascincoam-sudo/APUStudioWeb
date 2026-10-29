import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, isLiveSupabase, getSupabaseClient } from './supabase';

const isValidUuid = (id?: string | null): boolean => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};
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
  Proyecto,
  RolProyecto,
} from './types';

// Import our cohesive modular components
import InsumosPanel from './components/InsumosPanel';
import RubrosPanel from './components/RubrosPanel';
import PresupuestosPanel from './components/PresupuestosPanel';
import ConfigPanel from './components/ConfigPanel';
import ReportModal from './components/ReportModal';
import UploadPanel from './components/UploadPanel';
import Login from './components/Login';
import ProyectoSelectorModal from './components/ProyectoSelectorModal';
import OrganizacionSelectorModal from './components/OrganizacionSelectorModal';
import AprobacionesPanel from './components/AprobacionesPanel';
import { useAuth } from './context/AuthContext';

export default function App() {
  const {
    user: authUser,
    cargando: authCargando,
    organizaciones,
    organizacionActiva,
    rolOrg,
    proyectoActivo: contextProyectoActivo,
    cambiarProyectoActivo,
    cerrarSesion: authCerrarSesion,
    esDuenoOAdmin,
    puedeEditarProyecto,
    puedeAprobarEnProyecto,
    esSoloLectura,
  } = useAuth();

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

  // Derivar usuario desde AuthContext con useMemo para prevenir render loops infinitos
  const usuario = useMemo(() => {
    return authUser ? { email: authUser.email || '', id: authUser.id } : null;
  }, [authUser?.id, authUser?.email]);

  // Active Project & Roles State
  const [proyectoActivo, setProyectoActivo] = useState<Proyecto | null>(() => {
    const saved = localStorage.getItem('apustudio_proyecto_activo') || localStorage.getItem('proyecto_activo');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.id && isValidUuid(parsed.id)) {
          return parsed;
        }
        localStorage.removeItem('apustudio_proyecto_activo');
        localStorage.removeItem('proyecto_activo');
      } catch (e) {}
    }
    return null;
  });
  const [mostrarModalProyectos, setMostrarModalProyectos] = useState(false);
  const [mostrarModalOrganizaciones, setMostrarModalOrganizaciones] = useState(false);

  // Sincronizar proyectoActivo con el contexto
  useEffect(() => {
    if (contextProyectoActivo && !proyectoActivo) {
      setProyectoActivo(contextProyectoActivo);
    }
  }, [contextProyectoActivo, proyectoActivo]);

  const seleccionarProyecto = (proj: Proyecto) => {
    setProyectoActivo(proj);
    cambiarProyectoActivo(proj);
    localStorage.setItem('apustudio_proyecto_activo', JSON.stringify(proj));
    localStorage.setItem('proyecto_activo', JSON.stringify(proj));
    setMostrarModalProyectos(false);
    mostrarToast(`Proyecto activo: "${proj.nombre_proyecto || proj.nombre}"`, 'info');
  };

  const cerrarSesion = async () => {
    try {
      await authCerrarSesion();
      setProyectoActivo(null);
      localStorage.removeItem('apustudio_proyecto_activo');
      localStorage.removeItem('proyecto_activo');
      mostrarToast('Sesión cerrada correctamente.', 'info');
    } catch (error: any) {
      console.error('Error al cerrar sesión:', error);
      mostrarToast('No se pudo cerrar la sesión: ' + error.message, 'error');
    }
  };

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
  const [tabActiva, setTabActiva] = useState<'insumos' | 'rubros' | 'presupuestos' | 'config' | 'upload' | 'aprobaciones'>('insumos');
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
  const cargarPresupuestos = useCallback(async () => {
    if (!authUser) return;
    if (isLiveSupabase && !organizacionActiva) return;

    try {
      if (isLiveSupabase && organizacionActiva) {
        if (!isValidUuid(organizacionActiva.id)) return;

        const client = getSupabaseClient();
        let query = client
          .from('presupuestos')
          .select(`
            id,
            codigo,
            nombre,
            descripcion,
            estado,
            porcentaje_indirectos,
            porcentaje_utilidad,
            porcentaje_iva,
            costo_directo_total,
            costo_indirecto_total,
            monto_utilidad,
            subtotal_sin_iva,
            monto_iva,
            monto_total,
            fecha_creacion,
            proyecto_id,
            presupuesto_capitulos (
              id,
              nombre,
              numero_orden,
              costo_directo,
              presupuesto_items (
                id,
                rubro_id,
                codigo_item,
                nombre_rubro,
                unidad,
                precio_unitario,
                cantidad,
                precio_total,
                numero_orden
              )
            )
          `)
          .eq('organizacion_id', organizacionActiva.id);

        if (isValidUuid(proyectoActivo?.id)) {
          query = query.eq('proyecto_id', proyectoActivo!.id);
        }

        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) {
          console.error('Error al consultar presupuestos de Supabase:', error);
          mostrarToast('No se pudieron cargar los presupuestos de Supabase.', 'error');
          return;
        }

        if (data) {
          setPresupuestos(
            data.map((p: any) => {
              const capitulosList = p.presupuesto_capitulos || [];
              const allItems: any[] = [];
              capitulosList.forEach((cap: any) => {
                (cap.presupuesto_items || []).forEach((it: any) => {
                  allItems.push({
                    id: it.id,
                    id_rubro: it.rubro_id,
                    nombre_rubro: it.nombre_rubro,
                    unidad: it.unidad,
                    precio: Number(it.precio_unitario || 0),
                    cantidad: Number(it.cantidad || 0),
                    subtotal: Number(it.precio_total || 0),
                    capitulo_presup: cap.nombre,
                  });
                });
              });

              return {
                id: p.id,
                codigo: p.codigo,
                proyecto: p.nombre,
                cliente: p.descripcion ? p.descripcion.replace('Cliente: ', '') : 'Cliente General',
                fecha: p.fecha_creacion ? p.fecha_creacion.split('T')[0] : new Date().toISOString().split('T')[0],
                estado: p.estado || 'borrador',
                porcentaje_indirectos: Number(p.porcentaje_indirectos || 0),
                porcentaje_utilidad: Number(p.porcentaje_utilidad || 0),
                porcentaje_iva: Number(p.porcentaje_iva || 0),
                monto: Number(p.monto_total || 0),
                costo_directo_total: Number(p.costo_directo_total || 0),
                costo_indirecto_total: Number(p.costo_indirecto_total || 0),
                monto_utilidad: Number(p.monto_utilidad || 0),
                subtotal_sin_iva: Number(p.subtotal_sin_iva || 0),
                monto_iva: Number(p.monto_iva || 0),
                monto_total: Number(p.monto_total || 0),
                proyecto_id: p.proyecto_id,
                items: allItems,
                capitulos: capitulosList.map((c: any) => ({
                  id: c.id,
                  nombre: c.nombre,
                  costo_directo: Number(c.costo_directo || 0),
                  items: (c.presupuesto_items || []).map((it: any) => ({
                    id: it.id,
                    id_rubro: it.rubro_id,
                    nombre_rubro: it.nombre_rubro,
                    unidad: it.unidad,
                    precio: Number(it.precio_unitario || 0),
                    cantidad: Number(it.cantidad || 0),
                    subtotal: Number(it.precio_total || 0),
                  }))
                })),
              };
            })
          );
        }
      }
    } catch (error) {
      console.error('Error cargando presupuestos:', error);
      mostrarToast('No se pudieron cargar los presupuestos de Supabase.', 'error');
    }
  }, [authUser?.id, organizacionActiva?.id, proyectoActivo?.id]);

  const cargarDatos = useCallback(async () => {
    if (!authUser) return;
    if (isLiveSupabase && !organizacionActiva) {
      // Esperar a que AuthContext termine de cargar la organización activa
      return;
    }

    setCargando(true);
    try {
      if (isLiveSupabase && organizacionActiva) {
        const client = getSupabaseClient();
        const orgIdValida = isValidUuid(organizacionActiva.id);
        const proyIdValido = isValidUuid(proyectoActivo?.id);

        // 1. Obtener catálogos: global + el privado de la organización activa
        let catsQuery = client.from('catalogos').select('id, nombre, es_global');
        if (orgIdValida) {
          catsQuery = catsQuery.or(`es_global.eq.true,organizacion_id.eq.${organizacionActiva.id}`);
        } else {
          catsQuery = catsQuery.eq('es_global', true);
        }

        const { data: cats, error: errCats } = await catsQuery;
        if (errCats) {
          console.error('Error cargando catálogos:', errCats);
        }

        const catalogoIds = (cats || []).map(c => c.id);

        // 2. Cargar insumos de los catálogos accesibles
        let insumosQuery = client.from('insumos').select('*');
        if (catalogoIds.length > 0) {
          insumosQuery = insumosQuery.in('catalogo_id', catalogoIds);
        }

        const { data: insumosDb, error: errInsumos } = await insumosQuery.order('nombre');
        if (errInsumos) {
          console.error('Error cargando insumos:', errInsumos);
        }

        const allInsumos = insumosDb || [];

        const mat = allInsumos
          .filter(i => i.categoria === 'materiales')
          .map(i => ({
            ...i,
            id: i.id,
            id_insumo_mat: i.id,
            name_insumo_mat: i.nombre,
            nombre: i.nombre,
            precio_insumo_mat: Number(i.precio_unitario || 0),
            precio: Number(i.precio_unitario || 0),
            precio_unitario: Number(i.precio_unitario || 0),
            unidad_insumo_mat: i.unidad,
            unidad: i.unidad,
          }));

        const mob = allInsumos
          .filter(i => i.categoria === 'mano_de_obra')
          .map(i => ({
            ...i,
            id: i.id,
            id_insumo_mob: i.id,
            name_insumo_mob: i.nombre,
            nombre: i.nombre,
            precio_insumo_mob: Number(i.precio_unitario || 0),
            precio: Number(i.precio_unitario || 0),
            precio_unitario: Number(i.precio_unitario || 0),
            unidad_insumo_mob: i.unidad,
            unidad: i.unidad,
            categoria: i.categoria_trabajador,
          }));

        const eyh = allInsumos
          .filter(i => i.categoria === 'equipos_herramientas')
          .map(i => ({
            ...i,
            id: i.id,
            id_insumo_eyh: i.id,
            name_insumo_eyh: i.nombre,
            nombre: i.nombre,
            precio_insumo_eyh: Number(i.precio_unitario || 0),
            precio: Number(i.precio_unitario || 0),
            precio_unitario: Number(i.precio_unitario || 0),
            unidad_insumo_eyh: i.unidad,
            unidad: i.unidad,
            es_porcentaje: i.es_porcentaje,
            porcentaje: Number(i.porcentaje || 0),
            base_calculo: i.base_calculo,
          }));

        const transp = allInsumos
          .filter(i => i.categoria === 'transporte')
          .map(i => ({
            ...i,
            id: i.id,
            id_insumo_transp: i.id,
            name_insumo_transp: i.nombre,
            nombre: i.nombre,
            precio_insumo_transp: Number(i.precio_unitario || 0),
            precio: Number(i.precio_unitario || 0),
            precio_unitario: Number(i.precio_unitario || 0),
            unidad_insumo_transp: i.unidad,
            unidad: i.unidad,
            distancia_km: Number(i.distancia_km || 0),
          }));

        setInsumosMat(mat);
        setInsumosMob(mob);
        setInsumoEyh(eyh);
        setInsumosTransp(transp);

        // 3. Cargar rubros: biblioteca global de APUs + rubros de la organización y proyecto
        let rubrosQuery = client.from('rubros').select('*');

        if (orgIdValida && proyIdValido) {
          rubrosQuery = rubrosQuery.or(`es_global.eq.true,organizacion_id.eq.${organizacionActiva.id},proyecto_id.eq.${proyectoActivo!.id}`);
        } else if (orgIdValida) {
          rubrosQuery = rubrosQuery.or(`es_global.eq.true,organizacion_id.eq.${organizacionActiva.id}`);
        } else {
          rubrosQuery = rubrosQuery.eq('es_global', true);
        }

        const { data: rubrosDb, error: errRubros } = await rubrosQuery.order('nombre');
        if (errRubros) {
          console.error('Error cargando rubros:', errRubros);
        }

        const normalizedRubros = (rubrosDb || []).map(r => ({
          ...r,
          id: r.id,
          id_rubro: r.id,
          nombre_rubro: r.nombre,
          unidad_rubro: r.unidad,
          precio_rubro: Number(r.precio_unitario || 0),
          costo_materiales: Number(r.costo_materiales || 0),
          costo_mano_obra: Number(r.costo_mano_obra || 0),
          costo_equipos: Number(r.costo_equipos || 0),
          costo_transporte: Number(r.costo_transporte || 0),
        }));

        setTodosLosRubros(normalizedRubros);
      }
      await cargarPresupuestos();
    } catch (err) {
      console.error(err);
      mostrarToast('Fallo al sincronizar datos con el servidor principal.', 'error');
    } finally {
      setCargando(false);
    }
  }, [authUser?.id, organizacionActiva?.id, proyectoActivo?.id, cargarPresupuestos]);

  useEffect(() => {
    if (authUser?.id && (!isLiveSupabase || organizacionActiva?.id)) {
      cargarDatos();
    }
  }, [authUser?.id, organizacionActiva?.id, proyectoActivo?.id, cargarDatos]);

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
      if (isLiveSupabase) {
        const client = getSupabaseClient();
        const { data: rows, error } = await client
          .from('rubro_insumos')
          .select('*')
          .eq('rubro_id', id)
          .order('created_at', { ascending: true });

        if (error) throw error;

        const normalizarFila = (r: any) => ({
          id: r.id,
          id_rubro: r.rubro_id,
          codigo: r.codigo_insumo || '',
          descripcion: r.nombre_insumo,
          unidad: r.unidad_insumo,
          amount: Number(r.cantidad || 0),
          cantidad: Number(r.cantidad || 0),
          rendimiento: Number(r.rendimiento || 1.0),
          distancia: Number(r.distancia || 0),
          precio_unitario: Number(r.precio_unitario || 0),
          precio_total: Number(r.subtotal || 0),
          es_porcentaje: !!r.es_porcentaje,
          porcentaje: Number(r.porcentaje || 0),
          _originalRow: r,
          _tablaOrigen: 'rubro_insumos',
        });

        const mat = (rows || []).filter(r => r.categoria === 'materiales').map(normalizarFila);
        const mob = (rows || []).filter(r => r.categoria === 'mano_de_obra').map(normalizarFila);
        const eyh = (rows || []).filter(r => r.categoria === 'equipos_herramientas').map(normalizarFila);
        const transp = (rows || []).filter(r => r.categoria === 'transporte').map(normalizarFila);

        setRecetaMat(mat);
        setRecetaMob(mob);
        setRecetaEyh(eyh);
        setRecetaTransp(transp);
      }
    } catch (err) {
      console.error('Error al obtener receta APU:', err);
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

    const insumoId = item.id || item.id_insumo_mat || item.id_insumo_mob || item.id_insumo_eyh || item.id_insumo_transp;
    if (!insumoId) {
      mostrarToast('Error interno: Identificador del insumo no hallado.', 'error');
      return;
    }

    const nuevoNombre = tempEdit.name_insumo_mat || tempEdit.name_insumo_mob || tempEdit.name_insumo_eyh || tempEdit.name_insumo_transp || tempEdit.nombre;
    const nuevoPrecio = tempEdit.precio_insumo_mat || tempEdit.precio_insumo_mob || tempEdit.precio_insumo_eyh || tempEdit.precio_insumo_transp || tempEdit.precio || tempEdit.precio_unitario;
    const nuevaUnidad = tempEdit.unidad_insumo_mat || tempEdit.unidad_insumo_mob || tempEdit.unidad_insumo_eyh || tempEdit.unidad_insumo_transp || tempEdit.unidad;

    try {
      if (isLiveSupabase) {
        const client = getSupabaseClient();

        if (esDuenoOAdmin || puedeEditarProyecto) {
          // Actualización directa del insumo en el catálogo
          const { error } = await client
            .from('insumos')
            .update({
              nombre: nuevoNombre,
              precio_unitario: Number(nuevoPrecio),
              unidad: nuevaUnidad,
            })
            .eq('id', insumoId);

          if (error) throw error;
          mostrarToast('Insumo actualizado correctamente en el catálogo.', 'success');
        } else {
          // Crear un borrador de sugerencia de precio para aprobación
          const { error } = await client
            .from('borradores_insumo')
            .insert({
              catalogo_id: item.catalogo_id,
              insumo_id: insumoId,
              categoria: item.categoria || 'materiales',
              nombre: nuevoNombre,
              nuevo_precio: Number(nuevoPrecio),
              unidad: nuevaUnidad,
              estado: 'pendiente',
              solicitado_por: usuario?.id || null,
            });

          if (error) throw error;
          mostrarToast('Propuesta de precio enviada a la bandeja de aprobación.', 'info');
        }

        setInsumoSeleccionado({ ...insumoSeleccionado, ...tempEdit });
        setEditando(false);
        await cargarDatos();
      }
    } catch (err: unknown) {
      console.error('Excepción en guardarCambios:', err);
      const msg = err instanceof Error ? err.message : 'Error al guardar insumo';
      mostrarToast(`Fallo al actualizar insumo: ${msg}`, 'error');
    }
  };

  // ── GESTIÓN DE RUBROS Y RECETAS (CONEXIÓN BD SUPABASE) ──────────────────────────
  const crearRubro = async (nombre: string, unidad: string) => {
    try {
      if (!organizacionActiva) {
        mostrarToast('Debes tener una constructora activa para crear rubros.', 'error');
        return;
      }

      if (isLiveSupabase) {
        const client = getSupabaseClient();
        const codigoRubro = `RUB-${Date.now().toString().slice(-4)}`;

        const { data: newRubro, error } = await client
          .from('rubros')
          .insert({
            organizacion_id: organizacionActiva.id,
            proyecto_id: proyectoActivo?.id || null,
            codigo_rubro: codigoRubro,
            nombre: nombre.trim(),
            unidad: unidad.trim(),
            rendimiento: 1.0,
            created_by: usuario?.id || null,
          })
          .select()
          .single();

        if (error) throw error;

        mostrarToast(`¡Rubro "${newRubro.nombre}" creado exitosamente!`, 'success');
        await cargarDatos();

        const rubroNormalizado = {
          ...newRubro,
          id_rubro: newRubro.id,
          nombre_rubro: newRubro.nombre,
          unidad_rubro: newRubro.unidad,
          precio_rubro: Number(newRubro.precio_unitario || 0),
        };

        setRubroSeleccionado(rubroNormalizado);
        await cargarReceta(rubroNormalizado);
        return rubroNormalizado;
      }
    } catch (err: unknown) {
      console.error('Error al crear rubro:', err);
      const msg = err instanceof Error ? err.message : 'No se pudo crear el rubro';
      mostrarToast(`No se pudo crear el rubro: ${msg}`, 'error');
      throw err;
    }
  };

  const actualizarRubro = async (idRubro: string, nuevoNombre: string, nuevaUnidad: string) => {
    try {
      if (isLiveSupabase) {
        const client = getSupabaseClient();
        const { error } = await client
          .from('rubros')
          .update({
            nombre: nuevoNombre.trim(),
            unidad: nuevaUnidad.trim(),
          })
          .eq('id', idRubro);

        if (error) throw error;

        mostrarToast('Rubro actualizado correctamente.', 'success');
        if (rubroSeleccionado && (rubroSeleccionado.id_rubro === idRubro || rubroSeleccionado.id === idRubro)) {
          setRubroSeleccionado({
            ...rubroSeleccionado,
            nombre: nuevoNombre.trim(),
            nombre_rubro: nuevoNombre.trim(),
            unidad: nuevaUnidad.trim(),
            unidad_rubro: nuevaUnidad.trim(),
          });
        }
        await cargarDatos();
      }
    } catch (err: unknown) {
      console.error('Error al actualizar rubro:', err);
      const msg = err instanceof Error ? err.message : 'Error al actualizar rubro';
      mostrarToast(`No se pudo actualizar el rubro: ${msg}`, 'error');
    }
  };

  const actualizarComponenteReceta = async (
    idRubro: string,
    row: any,
    valores: { cantidad: number; rendimiento?: number; distancia?: number }
  ) => {
    try {
      if (isLiveSupabase) {
        const client = getSupabaseClient();
        const rowId = row.id || row._originalRow?.id;
        if (!rowId) throw new Error('Identificador de insumo en receta no hallado.');

        // Actualizar en rubro_insumos (el trigger recalcular_rubro_trigger actualiza el rubro en BD)
        const { error } = await client
          .from('rubro_insumos')
          .update({
            cantidad: Number(valores.cantidad || 0),
            rendimiento: Number(valores.rendimiento ?? 1.0),
            distancia: Number(valores.distancia ?? 0.0),
          })
          .eq('id', rowId);

        if (error) throw error;

        mostrarToast('Cantidad de receta actualizada.', 'success');
        await cargarDatos();
        if (rubroSeleccionado) {
          await cargarReceta(rubroSeleccionado);
        }
      }
    } catch (err: unknown) {
      console.error('Error al actualizar componente en receta:', err);
      const msg = err instanceof Error ? err.message : 'Error al actualizar';
      mostrarToast(`No se pudo actualizar el componente: ${msg}`, 'error');
    }
  };

  const eliminarInsumoReceta = async (idRubro: string, row: any) => {
    try {
      if (isLiveSupabase) {
        const client = getSupabaseClient();
        const rowId = row.id || row._originalRow?.id;
        if (!rowId) throw new Error('Identificador del insumo no hallado.');

        const { error } = await client
          .from('rubro_insumos')
          .delete()
          .eq('id', rowId);

        if (error) throw error;

        mostrarToast('Insumo eliminado de la receta.', 'success');
        await cargarDatos();
        if (rubroSeleccionado) {
          await cargarReceta(rubroSeleccionado);
        }
      }
    } catch (err: unknown) {
      console.error('Error al eliminar insumo de la receta:', err);
      const msg = err instanceof Error ? err.message : 'Error al eliminar insumo';
      mostrarToast(`No se pudo eliminar el insumo: ${msg}`, 'error');
    }
  };

  const agregarInsumoReceta = async (idRubro: string, insumo: any, catKey: string, cantidad: number) => {
    try {
      if (isLiveSupabase) {
        const client = getSupabaseClient();

        const catMap: Record<string, 'materiales' | 'mano_de_obra' | 'equipos_herramientas' | 'transporte'> = {
          MAT: 'materiales',
          materiales: 'materiales',
          MOB: 'mano_de_obra',
          mano_de_obra: 'mano_de_obra',
          EYH: 'equipos_herramientas',
          equipos_herramientas: 'equipos_herramientas',
          TRANSP: 'transporte',
          transporte: 'transporte',
        };
        const categoriaDb = catMap[catKey] || 'materiales';

        const idInsumo = insumo.id || insumo.id_insumo_mat || insumo.id_insumo_mob || insumo.id_insumo_eyh || insumo.id_insumo_transp;
        const nombreInsumo = insumo.nombre || insumo.name_insumo_mat || insumo.name_insumo_mob || insumo.name_insumo_eyh || insumo.name_insumo_transp || '';
        const unidadInsumo = insumo.unidad || insumo.unidad_insumo_mat || 'u';
        const precioUnitario = Number(insumo.precio_unitario || insumo.precio_insumo_mat || insumo.precio_insumo_mob || insumo.precio_insumo_eyh || insumo.precio_insumo_transp || insumo.precio || 0);

        const { error } = await client
          .from('rubro_insumos')
          .insert({
            rubro_id: idRubro,
            insumo_id: idInsumo || null,
            categoria: categoriaDb,
            codigo_insumo: insumo.codigo || null,
            nombre_insumo: nombreInsumo,
            unidad_insumo: unidadInsumo,
            precio_unitario: precioUnitario,
            cantidad: Number(cantidad || 1),
            rendimiento: 1.0,
            distancia: 0.0,
            es_porcentaje: !!insumo.es_porcentaje,
            porcentaje: Number(insumo.porcentaje || 0),
          });

        if (error) throw error;

        mostrarToast('Insumo añadido al análisis de precio unitario.', 'success');
        await cargarDatos();
        if (rubroSeleccionado) {
          await cargarReceta(rubroSeleccionado);
        }
      }
    } catch (err: unknown) {
      console.error('Error al agregar insumo a la receta:', err);
      const msg = err instanceof Error ? err.message : 'Error al agregar insumo';
      mostrarToast(`No se pudo añadir el insumo: ${msg}`, 'error');
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
      const client = getSupabaseClient();
      const { data: rows, error } = await client
        .from('rubro_insumos')
        .select('*')
        .eq('rubro_id', idRubro)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const normalizarFilaReceta = (r: any) => ({
        id: r.id,
        codigo: r.codigo_insumo || '',
        descripcion: r.nombre_insumo || '',
        unidad: r.unidad_insumo || 'u',
        amount: Number(r.cantidad || 0),
        cantidad: Number(r.cantidad || 0),
        precio_unitario: Number(r.precio_unitario || 0),
        precio_total: Number(r.subtotal || 0),
      });

      const mat = (rows || []).filter(r => r.categoria === 'materiales').map(normalizarFilaReceta);
      const mob = (rows || []).filter(r => r.categoria === 'mano_de_obra').map(normalizarFilaReceta);
      const eyh = (rows || []).filter(r => r.categoria === 'equipos_herramientas').map(normalizarFilaReceta);
      const transp = (rows || []).filter(r => r.categoria === 'transporte').map(normalizarFilaReceta);

      setApuAuditor({
        id_rubro: idRubro,
        mat,
        mob,
        eyh,
        transp,
      });
    } catch (err) {
      console.error('Error analizando composición APU:', err);
      mostrarToast('Error al analizar composición APU.', 'error');
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

  const getTotalesCalculados = React.useMemo(() => {
    const sub = nuevoPresupuesto.capitulos.reduce((acc, cap) => 
      acc + cap.items.reduce((sum, item) => sum + (item.subtotal || 0), 0), 0);
    const ind = (sub * (nuevoPresupuesto.indirectosPct || 0)) / 100;
    const uti = ((sub + ind) * (nuevoPresupuesto.utilidadPct || 0)) / 100;
    const iva = ((sub + ind + uti) * (nuevoPresupuesto.ivaPct || 0)) / 100;
    const tot = sub + ind + uti + iva;
    const dir = sub;
    return [Number(dir), Number(ind), Number(uti), Number(sub), Number(iva), Number(tot)];
  }, [nuevoPresupuesto]);

  // Autoguardado de Presupuesto (Debounce)
  useEffect(() => {
    if (!mostrarCreadorPresupuesto || !editandoPresupuestoId || !nuevoPresupuesto.proyecto || !nuevoPresupuesto.cliente) return;
    if (proyectoActivo?.miRol === 'lector') return;

    const handler = setTimeout(() => {
      guardarNuevoPresupuesto(true);
    }, 2500);

    return () => clearTimeout(handler);
  }, [nuevoPresupuesto, mostrarCreadorPresupuesto, editandoPresupuestoId, proyectoActivo]);

  const guardarNuevoPresupuesto = async (silencioso = false) => {
    if (!nuevoPresupuesto.proyecto || !nuevoPresupuesto.cliente) {
      if (!silencioso) mostrarToast('Por favor, ingrese el nombre del proyecto y de su cliente.', 'error');
      return;
    }

    if (!organizacionActiva?.id) {
      if (!silencioso) mostrarToast('Debe seleccionar una constructora / organización activa.', 'error');
      return;
    }

    if (!proyectoActivo?.id) {
      if (!silencioso) mostrarToast('Debe seleccionar una obra / proyecto activo para guardar el presupuesto.', 'error');
      return;
    }

    if (esSoloLectura || proyectoActivo?.miRol === 'viewer' || proyectoActivo?.miRol === 'fiscalizador_lectura') {
      if (!silencioso) mostrarToast('No tiene permisos de escritura en este proyecto.', 'error');
      return;
    }

    const capitulosConItems = nuevoPresupuesto.capitulos.filter(
      (c: any) => c.items && c.items.length > 0
    );

    if (capitulosConItems.length === 0) {
      if (!silencioso) mostrarToast('No hay elementos para presupuestar.', 'error');
      return;
    }

    try {
      if (!silencioso) mostrarToast('Guardando en Supabase...', 'info');
      const client = getSupabaseClient();

      let presId = '';
      if (editandoPresupuestoId) {
        presId = editandoPresupuestoId;
        const { error: presError } = await client
          .from('presupuestos')
          .update({
            nombre: nuevoPresupuesto.proyecto,
            descripcion: `Cliente: ${nuevoPresupuesto.cliente}${nuevoPresupuesto.notas ? ` | ${nuevoPresupuesto.notas}` : ''}`,
            porcentaje_indirectos: Number(nuevoPresupuesto.indirectosPct || 0),
            porcentaje_utilidad: Number(nuevoPresupuesto.utilidadPct || 0),
            porcentaje_iva: Number(nuevoPresupuesto.ivaPct || 0),
          })
          .eq('id', editandoPresupuestoId);

        if (presError) throw presError;

        // Limpiar capítulos y partidas anteriores (CASCADE limpia presupuesto_items)
        await client.from('presupuesto_capitulos').delete().eq('presupuesto_id', editandoPresupuestoId);
      } else {
        const { data: presData, error: presError } = await client
          .from('presupuestos')
          .insert({
            organizacion_id: organizacionActiva.id,
            proyecto_id: proyectoActivo.id,
            codigo: `PRE-${Date.now().toString().slice(-6)}`,
            nombre: nuevoPresupuesto.proyecto,
            descripcion: `Cliente: ${nuevoPresupuesto.cliente}${nuevoPresupuesto.notas ? ` | ${nuevoPresupuesto.notas}` : ''}`,
            estado: 'borrador',
            porcentaje_indirectos: Number(nuevoPresupuesto.indirectosPct || 0),
            porcentaje_utilidad: Number(nuevoPresupuesto.utilidadPct || 0),
            porcentaje_iva: Number(nuevoPresupuesto.ivaPct || 0),
            created_by: usuario?.id || null,
          })
          .select('id')
          .single();

        if (presError) throw presError;
        presId = presData.id;

        if (silencioso) setEditandoPresupuestoId(presId);
      }

      // Insertar capítulos e ítems estructurados
      // NOTA: Los totales se calculan automáticamente vía triggers PostgreSQL en la base de datos
      for (let cIdx = 0; cIdx < nuevoPresupuesto.capitulos.length; cIdx++) {
        const cap = nuevoPresupuesto.capitulos[cIdx];
        if (!cap.items || cap.items.length === 0) continue;

        const { data: capData, error: capError } = await client
          .from('presupuesto_capitulos')
          .insert({
            presupuesto_id: presId,
            nombre: cap.nombre,
            numero_orden: cIdx + 1,
          })
          .select('id')
          .single();

        if (capError) throw capError;

        const itemsPayload = cap.items.map((it: any, iIdx: number) => ({
          presupuesto_id: presId,
          capitulo_id: capData.id,
          rubro_id: it.id_rubro || it.id || null,
          codigo_item: it.codigo || it.codigo_item || `ITM-${cIdx + 1}.${iIdx + 1}`,
          nombre_rubro: it.nombre_rubro || it.nombre || 'Rubro',
          unidad: it.unidad || 'u',
          precio_unitario: Number(it.precio || it.precio_unitario || 0),
          cantidad: Number(it.cantidad || 0),
          numero_orden: iIdx + 1,
        }));

        const { error: itemsError } = await client
          .from('presupuesto_items')
          .insert(itemsPayload);

        if (itemsError) throw itemsError;
      }

      if (!silencioso) {
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
      } else {
        cargarPresupuestos();
      }
    } catch (error: any) {
      console.error('Error al guardar presupuesto:', error);
      if (!silencioso) mostrarToast('Error al guardar presupuesto: ' + (error.message || ''), 'error');
    }
  };

  const eliminarPresupuesto = async (id: string) => {
    try {
      mostrarToast('Eliminando...', 'info');
      const client = getSupabaseClient();
      const { error } = await client.from('presupuestos').delete().eq('id', id);
      if (error) throw error;

      mostrarToast('Presupuesto eliminado con éxito.', 'info');
      await cargarPresupuestos();
    } catch (err: any) {
      console.error('Error al eliminar:', err);
      mostrarToast('Error al eliminar presupuesto: ' + (err.message || ''), 'error');
    }
  };

  const actualizarEstadoPresupuesto = async (id: string, nuevoEstado: string) => {
    try {
      const mapeoEstado: Record<string, 'borrador' | 'en_revision' | 'aprobado' | 'rechazado'> = {
        'Borrador': 'borrador',
        'borrador': 'borrador',
        'Aprobado': 'aprobado',
        'aprobado': 'aprobado',
        'Rechazado': 'rechazado',
        'rechazado': 'rechazado',
        'En Revision': 'en_revision',
        'en_revision': 'en_revision',
      };
      const estadoNormalizado = mapeoEstado[nuevoEstado] || 'borrador';

      setPresupuestos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, estado: estadoNormalizado } : p))
      );

      const client = getSupabaseClient();
      const { error } = await client
        .from('presupuestos')
        .update({ estado: estadoNormalizado })
        .eq('id', id);

      if (error) throw error;
      mostrarToast(`Estado cambiado a ${estadoNormalizado}.`, 'success');
    } catch (error: any) {
      console.error('Error al actualizar estado:', error);
      mostrarToast('Error al actualizar el estado: ' + (error.message || ''), 'error');
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
      capituloActivo: capitulosList[0]?.nombre || '1. OBRAS PRELIMINARES',
      capituloNuevo: '',
      capitulos: capitulosList,
      indirectosPct: p.porcentaje_indirectos ?? 12,
      utilidadPct: p.porcentaje_utilidad ?? 8,
      ivaPct: p.porcentaje_iva ?? 10,
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

  if (authCargando) {
    return (
      <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-stone-950 text-white font-sans">
        <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center font-display font-extrabold text-xl shadow-xl shadow-orange-500/25 mb-4 animate-pulse">
          APU
        </div>
        <div className="flex items-center gap-2 text-stone-400 text-xs">
          <i className="ti ti-loader-2 spin text-orange-500 text-base"></i>
          <span>Cargando sesión y espacio de trabajo...</span>
        </div>
      </div>
    );
  }

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

      {!usuario ? (
        <Login onLoginSuccess={() => {}} mostrarToast={mostrarToast} />
      ) : (
        <>
          {/* Modal de Selector de Organización / Constructora Multi-tenant */}
          {(!organizacionActiva || mostrarModalOrganizaciones) && (
            <OrganizacionSelectorModal
              abierto={true}
              onCerrar={() => setMostrarModalOrganizaciones(false)}
              mostrarToast={mostrarToast}
            />
          )}

          {/* Proyecto Selector Modal (Aparece si hay org activa pero no hay proyecto activo o al hacer clic en Cambiar) */}
          {organizacionActiva && (!proyectoActivo || mostrarModalProyectos) && (
            <ProyectoSelectorModal
              usuarioId={usuario.id}
              usuarioEmail={usuario.email}
              organizacionId={organizacionActiva.id}
              proyectoActivo={proyectoActivo}
              onSeleccionarProyecto={seleccionarProyecto}
              mostrarToast={mostrarToast}
              onCerrarSesion={cerrarSesion}
              onCerrarModal={() => setMostrarModalProyectos(false)}
            />
          )}

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

            {/* Selector de Organización / Constructora Activa */}
            {organizacionActiva && (
              <div
                onClick={() => setMostrarModalOrganizaciones(true)}
                className="flex items-center gap-2 bg-stone-900 border border-stone-800 hover:border-orange-500/40 px-3 py-1.5 rounded-2xl text-xs shadow-sm cursor-pointer transition-colors mr-2 select-none"
                title="Cambiar de Constructora / Organización"
              >
                <i className="ti ti-building-skyscraper text-orange-400 text-sm"></i>
                <span className="font-bold text-white max-w-[150px] truncate">
                  {organizacionActiva.nombre}
                </span>
                <span className="bg-orange-500/20 text-orange-400 text-[9px] font-black uppercase px-1.5 py-0.5 rounded">
                  {rolOrg || 'Miembro'}
                </span>
                <i className="ti ti-selector text-stone-500 text-xs"></i>
              </div>
            )}

            {/* Active Project Badge Selector */}
            {proyectoActivo && (
              <div className="flex items-center gap-2 bg-stone-900 border border-stone-800 px-3 py-1.5 rounded-2xl text-xs shadow-sm">
                <i className="ti ti-building font-medium text-orange-400"></i>
                <span className="font-bold text-white max-w-[140px] truncate" title={proyectoActivo.nombre_proyecto}>
                  {proyectoActivo.nombre_proyecto}
                </span>
                {proyectoActivo.miRol === 'admin' && (
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-black uppercase px-1.5 py-0.5 rounded">
                    ADMIN
                  </span>
                )}
                {proyectoActivo.miRol === 'editor' && (
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-black uppercase px-1.5 py-0.5 rounded">
                    EDITOR
                  </span>
                )}
                {proyectoActivo.miRol === 'viewer' && (
                  <span className="bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[9px] font-black uppercase px-1.5 py-0.5 rounded">
                    LECTOR
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setMostrarModalProyectos(true)}
                  className="text-[10.5px] text-orange-400 hover:text-orange-300 font-bold ml-1 border-none bg-transparent cursor-pointer underline"
                >
                  Cambiar
                </button>
              </div>
            )}

            <nav className="desk-nav flex items-center ml-auto">
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
              {(esDuenoOAdmin || puedeAprobarEnProyecto || proyectoActivo?.miRol === 'admin' || proyectoActivo?.miRol === 'director') && (
                <a
                  id="tab-btn-aprobaciones"
                  className={tabActiva === 'aprobaciones' ? 'active font-bold' : ''}
                  onClick={() => cambiarTab('aprobaciones')}
                >
                  <i className="ti ti-check text-orange-500"></i> Aprobaciones y Auditoría
                </a>
              )}
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
            <div className="desk-topbar-right flex items-center gap-3">
              <span className={`desk-badge text-[10px] ${cargando ? 'loading' : ''} px-2.5 py-1 rounded-md`}>
                <i className={`ti ${cargando ? 'ti-loader-2 spin' : 'ti-database'}`}></i>
                {cargando ? 'Conectando...' : isLiveSupabase ? 'CONECTADO' : 'MODO LOCAL'}
              </span>
              <div className="flex items-center gap-2 bg-stone-850 px-3 py-1.5 rounded-xl border border-stone-800">
                <span className="desk-user text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                  <i className="ti ti-user-circle"></i> {usuario?.email || 'Usuario'}
                </span>
                <button
                  onClick={cerrarSesion}
                  title="Cerrar Sesión"
                  className="text-stone-400 hover:text-red-400 transition-colors ml-1 p-0.5 rounded cursor-pointer border-none bg-transparent flex items-center justify-center"
                >
                  <i className="ti ti-logout text-sm font-bold"></i>
                </button>
              </div>
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
                {(esDuenoOAdmin || puedeAprobarEnProyecto || proyectoActivo?.miRol === 'admin' || proyectoActivo?.miRol === 'director') && (
                  <div
                    id="side-btn-aprobaciones"
                    className={`desk-sidebar-item ${tabActiva === 'aprobaciones' ? 'active' : ''}`}
                    onClick={() => cambiarTab('aprobaciones')}
                  >
                    <i className="ti ti-check text-orange-500"></i>
                    {!sidebarColapsado && <span className="sidebar-text">Aprobaciones y Auditoría</span>}
                  </div>
                )}
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
                actualizarCantidadReceta={actualizarComponenteReceta}
                eliminarInsumoReceta={eliminarInsumoReceta}
                agregarInsumoReceta={agregarInsumoReceta}
                insumosMat={insumosMat}
                insumosMob={insumosMob}
                insumosEyh={insumosEyh}
                insumosTransp={insumosTransp}
                crearRubro={crearRubro}
                proyectoActivo={proyectoActivo}
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
              <UploadPanel proyectoActivo={proyectoActivo} />
            )}

            {tabActiva === 'config' && (
              <ConfigPanel
                configIA={configIA}
                setConfigIA={setConfigIA}
                proyectoActivo={proyectoActivo}
                mostrarToast={mostrarToast}
                abrirSelectorOrg={() => setMostrarModalOrganizaciones(true)}
                abrirSelectorProyecto={() => setMostrarModalProyectos(true)}
              />
            )}
            
            {tabActiva === 'aprobaciones' && (esDuenoOAdmin || puedeAprobarEnProyecto || proyectoActivo?.miRol === 'admin' || proyectoActivo?.miRol === 'director') && (
              <AprobacionesPanel 
                proyectoActivo={proyectoActivo}
                supabase={supabase}
                mostrarToast={mostrarToast}
              />
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
                {organizacionActiva && (
                  <button
                    onClick={() => setMostrarModalOrganizaciones(true)}
                    className="flex items-center gap-1.5 bg-stone-850 px-2 py-0.5 rounded-lg border border-stone-750 text-[10px] text-orange-400 font-bold"
                  >
                    <i className="ti ti-building-skyscraper text-[11px]"></i>
                    <span className="truncate max-w-[90px]">{organizacionActiva.nombre}</span>
                    <i className="ti ti-selector text-stone-500 text-[9px]"></i>
                  </button>
                )}
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
              {vista === 'lista' && (
                <button
                  onClick={cerrarSesion}
                  title="Cerrar Sesión"
                  className="mob-btn-icon cursor-pointer text-stone-400 hover:text-red-400 p-1 flex items-center justify-center"
                >
                  <i className="ti ti-logout text-base font-bold"></i>
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
              <UploadPanel proyectoActivo={proyectoActivo} />
            )}
            
            {/* VIEW list - Aprobaciones */}
            {tabActiva === 'aprobaciones' && proyectoActivo?.miRol === 'admin' && (
              <AprobacionesPanel 
                proyectoActivo={proyectoActivo}
                supabase={supabase}
                mostrarToast={mostrarToast}
              />
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
      )}
    </>
  );
}
