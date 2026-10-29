import type { Database } from './types/database';

export type { Database };

// Helper types para filas, inserciones y actualizaciones
export type DbRow<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type DbInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type DbUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

// =====================================================================
// ROLES Y ESTADOS DEL SISTEMA
// =====================================================================
export type RolOrganizacion = 'dueño' | 'administrador' | 'miembro';

export type RolProyecto =
  | 'owner'
  | 'editor'
  | 'viewer'
  | 'director'
  | 'residente'
  | 'editor_borradores'
  | 'fiscalizador_lectura'
  | 'admin'; // Compatibilidad frontend anterior

export type EstadoProyecto =
  | 'borrador'
  | 'en_estudio'
  | 'licitacion'
  | 'en_ejecucion'
  | 'finalizado'
  | 'archivado';

export type EstadoPresupuesto =
  | 'borrador'
  | 'en_revision'
  | 'aprobado'
  | 'adjudicado'
  | 'rechazado';

export type CategoriaInsumo =
  | 'materiales'
  | 'mano_de_obra'
  | 'equipos_herramientas'
  | 'transporte';

// =====================================================================
// MÓDULO 1: ORGANIZACIONES Y USUARIOS
// =====================================================================
export type Organizacion = DbRow<'organizaciones'>;
export type Perfil = DbRow<'perfiles'>;
export type MiembroOrganizacion = DbRow<'miembros_organizacion'> & {
  perfil?: Perfil | null;
  organizacion?: Organizacion | null;
};

export interface UserProfile {
  id: string;
  email: string;
  nombre?: string;
  nombre_completo?: string | null;
  avatar_url?: string | null;
  organizacion_activa_id?: string | null;
  created_at?: string;
}

// =====================================================================
// MÓDULO 2: PROYECTOS Y COLABORADORES
// =====================================================================
export type ProyectoDb = DbRow<'proyectos'>;

export interface Proyecto {
  id: string;
  nombre?: string;
  codigo?: string | null;
  descripcion?: string | null;
  cliente?: string | null;
  ubicacion?: string | null;
  fecha_inicio?: string | null;
  fecha_fin_estimada?: string | null;
  estado?: EstadoProyecto | string;
  presupuesto_referencial?: number;
  organizacion_id?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;

  // Campos de compatibilidad con componentes previos
  nombre_proyecto?: string;
  codigo_acceso?: string;
  creador_id?: string;
  miRol?: RolProyecto;
  catalogo_base_id?: string | null;
}

export interface MiembroProyecto {
  id: string;
  proyecto_id: string;
  user_id: string;
  rol: RolProyecto;
  activo?: boolean;
  email_usuario?: string;
  nombre_usuario?: string;
  created_at?: string;
}

export type InvitacionProyecto = DbRow<'invitaciones_proyecto'>;

// =====================================================================
// MÓDULO 3: CATÁLOGOS E INSUMOS
// =====================================================================
export type Catalogo = DbRow<'catalogos'>;
export type InsumoDb = DbRow<'insumos'>;
export type BorradorInsumo = DbRow<'borradores_insumo'>;

export interface InsumoMaterial {
  id: string;
  id_insumo_mat?: string;
  name_insumo_mat: string;
  precio_insumo_mat: number;
  unidad?: string;
  proveedor?: string | null;
  proyecto_id?: string | null;
  codigo?: string | null;
  [key: string]: unknown;
}

export interface InsumoManoObra {
  id: string;
  id_insumo_mob?: string;
  name_insumo_mob: string;
  precio_insumo_mob: number;
  categoria?: string | null;
  proyecto_id?: string | null;
  codigo?: string | null;
  [key: string]: unknown;
}

export interface InsumoEquipo {
  id: string;
  id_insumo_eyh?: string;
  name_insumo_eyh: string;
  precio_insumo_eyh: number;
  tipo?: string | null;
  es_porcentaje?: boolean;
  porcentaje?: number | null;
  base_calculo?: string | null;
  proyecto_id?: string | null;
  codigo?: string | null;
  [key: string]: unknown;
}

export interface InsumoTransporte {
  id: string;
  id_insumo_transp?: string;
  name_insumo_transp: string;
  precio_insumo_transp: number;
  distancia_km?: number | null;
  proyecto_id?: string | null;
  codigo?: string | null;
  [key: string]: unknown;
}

// =====================================================================
// MÓDULO 4: MOTOR APU (RUBROS Y RECETAS)
// =====================================================================
export type RubroDb = DbRow<'rubros'>;
export type RubroInsumoDb = DbRow<'rubro_insumos'>;
export type BorradorRubro = DbRow<'borradores_rubro'>;

export interface Rubro {
  id: string;
  nombre: string;
  unidad: string;
  precio_unitario: number;
  codigo_rubro?: string | null;
  descripcion?: string | null;
  especificaciones_tecnicas?: string | null;
  rendimiento?: number;
  costo_materiales?: number;
  costo_mano_obra?: number;
  costo_equipos?: number;
  costo_transporte?: number;
  es_global?: boolean;
  organizacion_id?: string | null;
  proyecto_id?: string | null;
  created_at?: string;
  updated_at?: string;

  // Campos de compatibilidad con componentes previos
  id_rubro?: string;
  nombre_rubro?: string;
  unidad_rubro?: string;
  precio_rubro?: number;
}

export interface RecetaItem {
  id_rubro: string;
  codigo: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
  precio_total: number;
  rendimiento?: number;
  distancia?: number;
  es_porcentaje?: boolean;
  porcentaje?: number;
  categoria?: CategoriaInsumo;
  _tablaOrigen?: string;
  _originalRow?: unknown;
}

// =====================================================================
// MÓDULO 5: PRESUPUESTOS Y EDT/WBS
// =====================================================================
export type PresupuestoDb = DbRow<'presupuestos'>;
export type PresupuestoCapituloDb = DbRow<'presupuesto_capitulos'>;
export type PresupuestoItemDb = DbRow<'presupuesto_items'>;

export interface DetallePresupuestoItem {
  id_rubro: string;
  nombre_rubro: string;
  unidad: string;
  precio: number;
  cantidad: number;
  subtotal: number;
  capitulo_presup?: string;
  numero_orden?: number;
  especificaciones?: string | null;
}

export interface Capitulo {
  id?: string;
  nombre: string;
  codigo?: string | null;
  costo_directo?: number;
  items: DetallePresupuestoItem[];
}

export interface Presupuesto {
  id: string;
  codigo?: string | null;
  nombre?: string;
  proyecto: string;
  cliente: string;
  fecha: string;
  estado: "Borrador" | "Aprobado" | "Rechazado" | string;
  monto: number;
  porcentaje_indirectos?: number;
  porcentaje_utilidad?: number;
  porcentaje_iva?: number;
  costo_directo_total?: number;
  costo_indirecto_total?: number;
  monto_utilidad?: number;
  subtotal_sin_iva?: number;
  monto_iva?: number;
  monto_total?: number;
  items: DetallePresupuestoItem[];
  capitulos?: Capitulo[];
  proyecto_id?: string | null;
  organizacion_id?: string | null;
}

// =====================================================================
// MÓDULO 6: AUDITORÍA
// =====================================================================
export type BitacoraAuditoria = DbRow<'bitacora_auditoria'>;

// =====================================================================
// UTILIDADES E IA
// =====================================================================
export interface ConfigIA {
  modelo: string;
  temperatura: number;
  normalizarUnidades: boolean;
  filtroAntiDuplicados: boolean;
  apiKey?: string;
}

export interface ToastState {
  visible: boolean;
  mensaje: string;
  tipo: "success" | "error" | "info" | "warning";
}
