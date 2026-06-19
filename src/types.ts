export interface InsumoMaterial {
  id: string;
  id_insumo_mat?: string;
  name_insumo_mat: string;
  precio_insumo_mat: number;
  unidad?: string;
  proveedor?: string;
  [key: string]: any;
}

export interface InsumoManoObra {
  id: string;
  id_insumo_mob?: string;
  name_insumo_mob: string;
  precio_insumo_mob: number;
  categoria?: string;
  [key: string]: any;
}

export interface InsumoEquipo {
  id: string;
  id_insumo_eyh?: string;
  name_insumo_eyh: string;
  precio_insumo_eyh: number;
  tipo?: string;
  [key: string]: any;
}

export interface InsumoTransporte {
  id: string;
  id_insumo_transp?: string;
  name_insumo_transp: string;
  precio_insumo_transp: number;
  distancia_km?: number;
  [key: string]: any;
}

export interface Rubro {
  id: string;
  id_rubro?: string;
  nombre_rubro: string;
  unidad: string;
  precio_rubro: number;
}

export interface RecetaItem {
  id_rubro: string;
  codigo: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
  precio_total: number;
  _tablaOrigen?: string;
  _originalRow?: any;
}

export interface DetallePresupuestoItem {
  id_rubro: string;
  nombre_rubro: string;
  unidad: string;
  precio: number;
  cantidad: number;
  subtotal: number;
  capitulo_presup?: string;
}

export interface Capitulo {
  nombre: string;
  items: DetallePresupuestoItem[];
}

export interface Presupuesto {
  id: string;
  proyecto: string;
  cliente: string;
  fecha: string;
  estado: "Borrador" | "Aprobado" | "Rechazado";
  monto: number;
  items: DetallePresupuestoItem[];
}

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
  tipo: "success" | "error" | "info";
}
