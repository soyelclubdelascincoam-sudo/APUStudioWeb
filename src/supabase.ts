import { createClient } from '@supabase/supabase-js';

// Intentar leer las credenciales de Supabase del entorno del cliente
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

export const isLiveSupabase = !!(supabaseUrl && supabaseAnonKey);

// Rich mock data seeds for construction costing (APU)
const MOCK_INSUMOS_MAT = [
  { id: "MAT-001", id_insumo_mat: "MAT-001", name_insumo_mat: "Cemento Gris Portland (F-32)", precio_insumo_mat: 8.50, unidad: "bolsa 50kg", proveedor: "Industria Cemento" },
  { id: "MAT-002", id_insumo_mat: "MAT-002", name_insumo_mat: "Arena Gorda de Cantera", precio_insumo_mat: 18.00, unidad: "m³", proveedor: "Arenera Sur" },
  { id: "MAT-003", id_insumo_mat: "MAT-003", name_insumo_mat: "Piedra Triturada (Gravel 1-2cm)", precio_insumo_mat: 22.50, unidad: "m³", proveedor: "Cantera Central" },
  { id: "MAT-004", id_insumo_mat: "MAT-004", name_insumo_mat: "Hierro Corrugado de 10mm", precio_insumo_mat: 1.15, unidad: "kg", proveedor: "Siderúrgica SA" },
  { id: "MAT-005", id_insumo_mat: "MAT-005", name_insumo_mat: "Hierro Corrugado de 12mm", precio_insumo_mat: 1.18, unidad: "kg", proveedor: "Siderúrgica SA" },
  { id: "MAT-006", id_insumo_mat: "MAT-006", name_insumo_mat: "Ladrillo Común de Obra", precio_insumo_mat: 0.12, unidad: "unid", proveedor: "Ladrillera San Jose" },
  { id: "MAT-007", id_insumo_mat: "MAT-007", name_insumo_mat: "Madera Encofrado (Pino)", precio_insumo_mat: 15.00, unidad: "m²", proveedor: "Maderera Misiones" },
  { id: "MAT-008", id_insumo_mat: "MAT-008", name_insumo_mat: "Agua de Red para Mezcla", precio_insumo_mat: 2.00, unidad: "m³", proveedor: "Servicios" }
];

const MOCK_INSUMOS_MOB = [
  { id: "MOB-001", id_insumo_mob: "MOB-001", name_insumo_mob: "Maestro de Obra Principal", precio_insumo_mob: 32.00, categoria: "Profesional/Supervisor" },
  { id: "MOB-002", id_insumo_mob: "MOB-002", name_insumo_mob: "Albañil Oficial de Estructuras", precio_insumo_mob: 24.50, categoria: "Oficial Carpintero/Fierrero" },
  { id: "MOB-003", id_insumo_mob: "MOB-003", name_insumo_mob: "Albañil Oficial de Terminaciones", precio_insumo_mob: 22.00, categoria: "Oficial Acabados" },
  { id: "MOB-004", id_insumo_mob: "MOB-004", name_insumo_mob: "Peón / Ayudante Práctico", precio_insumo_mob: 16.50, categoria: "Ayudante de Obra" }
];

const MOCK_INSUMOS_EYH = [
  { id: "EYH-001", id_insumo_eyh: "EYH-001", name_insumo_eyh: "Hormigonera Portátil (Mezcladora 2HP)", precio_insumo_eyh: 4.50, tipo: "Equipo liviano" },
  { id: "EYH-002", id_insumo_eyh: "EYH-002", name_insumo_eyh: "Vibrador de Inmersión para Concreto", precio_insumo_eyh: 3.00, tipo: "Equipo de consolidación" },
  { id: "EYH-003", id_insumo_eyh: "EYH-003", name_insumo_eyh: "Andamio Metálico Tubular Completo", precio_insumo_eyh: 1.20, tipo: "Seguridad y elevación" },
  { id: "EYH-004", id_insumo_eyh: "EYH-004", name_insumo_eyh: "Herramientas Menores (Palas, Baldes, etc. - 3% MoB)", precio_insumo_eyh: 0.80, tipo: "Herramientas manuales" }
];

const MOCK_INSUMOS_TRANSP = [
  { id: "TRN-001", id_insumo_transp: "TRN-001", name_insumo_transp: "Flete de Camión de 10 Toneladas", precio_insumo_transp: 2.50, distancia_km: 15 },
  { id: "TRN-002", id_insumo_transp: "TRN-002", name_insumo_transp: "Volquete de Volteo Directo", precio_insumo_transp: 35.00, distancia_km: 25 },
  { id: "TRN-003", id_insumo_transp: "TRN-003", name_insumo_transp: "Transporte Manual Interno (Peada)", precio_insumo_transp: 1.50, distancia_km: 0.1 }
];

const MOCK_RUBROS = [
  { id: "RUB-001", id_rubro: "RUB-001", nombre_rubro: "Hormigón Simple para Zapatas H15", unidad: "m³", unidad_rubro: "m³", precio_rubro: 185.50 },
  { id: "RUB-002", id_rubro: "RUB-002", nombre_rubro: "Mampostería de Ladrillo Común e=15cm", unidad: "m²", unidad_rubro: "m²", precio_rubro: 28.75 },
  { id: "RUB-003", id_rubro: "RUB-003", nombre_rubro: "Viga de Encadenado de Hormigón Armado H21", unidad: "m³", unidad_rubro: "m³", precio_rubro: 420.00 },
  { id: "RUB-004", id_rubro: "RUB-004", nombre_rubro: "Excavación Manual de Cimiento de Obra", unidad: "m³", unidad_rubro: "m³", precio_rubro: 15.00 },
  { id: "RUB-005", id_rubro: "RUB-005", nombre_rubro: "Encofrado de Madera para Columnas", unidad: "m²", unidad_rubro: "m²", precio_rubro: 19.80 },
  { id: "RUB-006", id_rubro: "RUB-006", nombre_rubro: "Revoque Interior Dos Capas (Grueso+Fino)", unidad: "m²", unidad_rubro: "m²", precio_rubro: 12.50 }
];

const MOCK_RECETA_MAT: Record<string, any[]> = {
  "RUB-001": [
    { codigo: "MAT-001", descripcion: "Cemento Gris Portland", unidad: "bolsa", cantidad: 6.5, precio_unitario: 8.50, precio_total: 55.25 },
    { codigo: "MAT-002", descripcion: "Arena Gorda de Cantera", unidad: "m³", cantidad: 0.55, precio_unitario: 18.00, precio_total: 9.90 },
    { codigo: "MAT-003", descripcion: "Piedra Triturada (Gravel)", unidad: "m³", cantidad: 0.85, precio_unitario: 22.50, precio_total: 19.13 },
    { codigo: "MAT-008", descripcion: "Agua para Mezcla", unidad: "m³", cantidad: 0.18, precio_unitario: 2.00, precio_total: 0.36 }
  ],
  "RUB-002": [
    { codigo: "MAT-001", descripcion: "Cemento Gris Portland", unidad: "bolsa", cantidad: 0.35, precio_unitario: 8.50, precio_total: 2.98 },
    { codigo: "MAT-002", descripcion: "Arena Gorda", unidad: "m³", cantidad: 0.04, precio_unitario: 18.00, precio_total: 0.72 },
    { codigo: "MAT-006", descripcion: "Ladrillo Común de Obra", unidad: "unid", cantidad: 62, precio_unitario: 0.12, precio_total: 7.44 }
  ],
  "RUB-003": [
    { codigo: "MAT-001", descripcion: "Cemento Gris Portland", unidad: "bolsa", cantidad: 7.2, precio_unitario: 8.50, precio_total: 61.20 },
    { codigo: "MAT-002", descripcion: "Arena Gorda de Cantera", unidad: "m³", cantidad: 0.50, precio_unitario: 18.00, precio_total: 9.00 },
    { codigo: "MAT-003", descripcion: "Piedra Triturada", unidad: "m³", cantidad: 0.80, precio_unitario: 22.50, precio_total: 18.00 },
    { codigo: "MAT-004", descripcion: "Hierro Corrugado de 10mm", unidad: "kg", cantidad: 45, precio_unitario: 1.15, precio_total: 51.75 },
    { codigo: "MAT-005", descripcion: "Hierro Corrugado de 12mm", unidad: "kg", cantidad: 35, precio_unitario: 1.18, precio_total: 41.30 },
    { codigo: "MAT-007", descripcion: "Madera Encofrado (Pino)", unidad: "m²", cantidad: 1.8, precio_unitario: 15.00, precio_total: 27.00 }
  ]
};

const MOCK_RECETA_MOB: Record<string, any[]> = {
  "RUB-001": [
    { codigo: "MOB-002", descripcion: "Albañil Oficial", unidad: "hh", cantidad: 3.5, precio_unitario: 24.50, precio_total: 85.75 },
    { codigo: "MOB-004", descripcion: "Peón / Ayudante Práctico", unidad: "hh", cantidad: 4.8, precio_unitario: 16.50, precio_total: 79.20 }
  ],
  "RUB-002": [
    { codigo: "MOB-003", descripcion: "Albañil Oficial de Terminaciones", unidad: "hh", cantidad: 0.6, precio_unitario: 22.00, precio_total: 13.20 },
    { codigo: "MOB-004", descripcion: "Ayudante Práctico", unidad: "hh", cantidad: 0.6, precio_unitario: 16.50, precio_total: 9.90 }
  ],
  "RUB-003": [
    { codigo: "MOB-002", descripcion: "Albañil Oficial de Estructuras", unidad: "hh", cantidad: 12.0, precio_unitario: 24.50, precio_total: 294.00 },
    { codigo: "MOB-004", descripcion: "Peón / Ayudante Práctico", unidad: "hh", cantidad: 18.5, precio_unitario: 16.50, precio_total: 305.25 }
  ]
};

const MOCK_RECETA_EYH: Record<string, any[]> = {
  "RUB-001": [
    { codigo: "EYH-001", descripcion: "Hormigonera Portátil", unidad: "hr", cantidad: 1.2, precio_unitario: 4.50, precio_total: 5.40 },
    { codigo: "EYH-002", descripcion: "Vibrador de Inmersión", unidad: "hr", cantidad: 0.8, precio_unitario: 3.00, precio_total: 2.40 },
    { codigo: "EYH-004", descripcion: "Herramientas Menores", unidad: "glb", cantidad: 1.0, precio_unitario: 0.80, precio_total: 0.80 }
  ],
  "RUB-002": [
    { codigo: "EYH-004", descripcion: "Herramientas de Albañilería", unidad: "glb", cantidad: 1.0, precio_unitario: 0.40, precio_total: 0.40 }
  ],
  "RUB-003": [
    { codigo: "EYH-001", descripcion: "Hormigonera Mecánica", unidad: "hr", cantidad: 2.5, precio_unitario: 4.50, precio_total: 11.25 },
    { codigo: "EYH-002", descripcion: "Vibrador de Inmersión", unidad: "hr", cantidad: 1.5, precio_unitario: 3.00, precio_total: 4.50 },
    { codigo: "EYH-003", descripcion: "Andamio Metálico Tubular", unidad: "día", cantidad: 0.5, precio_unitario: 1.20, precio_total: 0.60 }
  ]
};

const MOCK_RECETA_TRANSP: Record<string, any[]> = {
  "RUB-001": [
    { codigo: "TRN-001", descripcion: "Flete de Camión de Hierro/Cemento", unidad: "ton/km", cantidad: 12, precio_unitario: 2.50, precio_total: 3.00 }
  ],
  "RUB-003": [
    { codigo: "TRN-002", descripcion: "Volquete de Volteo de Agregados", unidad: "viaje", cantidad: 0.25, precio_unitario: 35.00, precio_total: 8.75 }
  ]
};

// Initialize localStorage engine helper
const initLocalStorage = () => {
  if (typeof window !== 'undefined') {
    if (!localStorage.getItem('INSUMOS_MAT')) localStorage.setItem('INSUMOS_MAT', JSON.stringify(MOCK_INSUMOS_MAT));
    if (!localStorage.getItem('INSUMOS_MOB')) localStorage.setItem('INSUMOS_MOB', JSON.stringify(MOCK_INSUMOS_MOB));
    if (!localStorage.getItem('INSUMOS_EYH')) localStorage.setItem('INSUMOS_EYH', JSON.stringify(MOCK_INSUMOS_EYH));
    if (!localStorage.getItem('INSUMOS_TRANSP')) localStorage.setItem('INSUMOS_TRANSP', JSON.stringify(MOCK_INSUMOS_TRANSP));
    if (!localStorage.getItem('RUBROS')) localStorage.setItem('RUBROS', JSON.stringify(MOCK_RUBROS));
    if (!localStorage.getItem('PRESUPUESTOS')) localStorage.setItem('PRESUPUESTOS', JSON.stringify([]));

    // Seed recipe flat tables to enable fully functional local recipe editing
    if (!localStorage.getItem('RECETA_MAT')) {
      const flat: any[] = [];
      Object.entries(MOCK_RECETA_MAT).forEach(([rubroId, items]) => {
        items.forEach((item) => {
          flat.push({
            id_rubro: rubroId,
            id_insumo_: item.codigo,
            name_insumo_: item.descripcion,
            cantidad_: item.cantidad,
            precio_unitario_: item.precio_unitario,
            precio_receta_mat: item.precio_total
          });
        });
      });
      localStorage.setItem('RECETA_MAT', JSON.stringify(flat));
    }
    if (!localStorage.getItem('RECETA_MOB')) {
      const flat: any[] = [];
      Object.entries(MOCK_RECETA_MOB).forEach(([rubroId, items]) => {
        items.forEach((item) => {
          flat.push({
            id_rubro: rubroId,
            id_insumo_: item.codigo,
            name_insumo_: item.descripcion,
            cantidad_: item.cantidad,
            precio_unitario_: item.precio_unitario,
            precio_receta_mob: item.precio_total
          });
        });
      });
      localStorage.setItem('RECETA_MOB', JSON.stringify(flat));
    }
    if (!localStorage.getItem('RECETA_EYH')) {
      const flat: any[] = [];
      Object.entries(MOCK_RECETA_EYH).forEach(([rubroId, items]) => {
        items.forEach((item) => {
          flat.push({
            id_rubro: rubroId,
            id_insumo_: item.codigo,
            name_insumo_: item.descripcion,
            cantidad_: item.cantidad,
            precio_unitario_: item.precio_unitario,
            precio_receta_eyh: item.precio_total
          });
        });
      });
      localStorage.setItem('RECETA_EYH', JSON.stringify(flat));
    }
    if (!localStorage.getItem('RECETA_TRANSP')) {
      const flat: any[] = [];
      Object.entries(MOCK_RECETA_TRANSP).forEach(([rubroId, items]) => {
        items.forEach((item) => {
          flat.push({
            id_rubro: rubroId,
            id_insumo_: item.codigo,
            name_insumo_: item.descripcion,
            cantidad_: item.cantidad,
            precio_unitario_: item.precio_unitario,
            precio_receta_transp: item.precio_total
          });
        });
      });
      localStorage.setItem('RECETA_TRANSP', JSON.stringify(flat));
    }
  }
};

initLocalStorage();

class MockQueryBuilder {
  private table: string;
  private filters: { col: string; val: any }[] = [];
  private orderCol?: string;
  private orderAscending = true;
  private limitCount?: number;

  constructor(table: string) {
    this.table = table;
  }

  select(columns = '*') {
    return this;
  }

  insert(payload: any[] | any) {
    const payloads = Array.isArray(payload) ? payload : [payload];
    const listRaw = localStorage.getItem(this.table) || '[]';
    const list = JSON.parse(listRaw);
    const withIds = payloads.map((row, idx) => ({
      id: row.id || `row-${Date.now()}-${idx}`,
      created_at: new Date().toISOString(),
      fecha_creacion: new Date().toISOString(),
      ...row
    }));
    localStorage.setItem(this.table, JSON.stringify([...list, ...withIds]));

    return {
      select() {
        return {
          single() {
            return Promise.resolve({ data: withIds[0], error: null });
          },
          then(resolve: any) {
            return Promise.resolve({ data: withIds, error: null }).then(resolve);
          }
        };
      },
      then(resolve: any) {
        return Promise.resolve({ data: withIds, error: null }).then(resolve);
      }
    };
  }

  update(row: any) {
    return {
      eq: (col: string, val: any) => {
        this.filters.push({ col, val });
        return {
          eq: (col2: string, val2: any) => {
            this.filters.push({ col: col2, val: val2 });
            return this.updateAction(row);
          },
          then: (resolve: any) => {
            return this.updateAction(row).then(resolve);
          }
        };
      },
      then: (resolve: any) => {
        return this.updateAction(row).then(resolve);
      }
    };
  }

  private updateAction(row: any) {
    const listRaw = localStorage.getItem(this.table) || '[]';
    let list = JSON.parse(listRaw);
    let updatedItem: any = null;
    list = list.map((item: any) => {
      const match = this.filters.every(f => String(item[f.col]) === String(f.val));
      if (match) {
        updatedItem = { ...item, ...row };
        return updatedItem;
      }
      return item;
    });
    localStorage.setItem(this.table, JSON.stringify(list));
    return {
      then(resolve: any) {
        return Promise.resolve({ data: updatedItem, error: null }).then(resolve);
      }
    };
  }

  delete() {
    return {
      eq: (col: string, val: any) => {
        this.filters.push({ col, val });
        return {
          eq: (col2: string, val2: any) => {
            this.filters.push({ col: col2, val: val2 });
            return this.deleteAction();
          },
          then: (resolve: any) => {
            return this.deleteAction().then(resolve);
          }
        };
      },
      then: (resolve: any) => {
        return this.deleteAction().then(resolve);
      }
    };
  }

  private deleteAction() {
    const listRaw = localStorage.getItem(this.table) || '[]';
    let list = JSON.parse(listRaw);
    list = list.filter((item: any) => {
      const match = this.filters.every(f => String(item[f.col]) === String(f.val));
      return !match;
    });
    localStorage.setItem(this.table, JSON.stringify(list));
    return {
      then(resolve: any) {
        return Promise.resolve({ error: null }).then(resolve);
      }
    };
  }

  eq(col: string, val: any) {
    this.filters.push({ col, val });
    return this;
  }

  order(col: string, { ascending } = { ascending: true }) {
    this.orderCol = col;
    this.orderAscending = ascending;
    return this;
  }

  limit(n: number) {
    this.limitCount = n;
    return this;
  }

  async then(resolve: any, reject?: any) {
    try {
      const listRaw = localStorage.getItem(this.table) || '[]';
      let list = JSON.parse(listRaw);

      if (this.filters.length > 0) {
        list = list.filter((item: any) => {
          return this.filters.every(f => String(item[f.col]) === String(f.val));
        });
      }

      if (this.orderCol) {
        list.sort((a: any, b: any) => {
          const vA = a[this.orderCol!] || '';
          const vB = b[this.orderCol!] || '';
          return this.orderAscending ? String(vA).localeCompare(String(vB)) : String(vB).localeCompare(String(vA));
        });
      }

      if (this.limitCount !== undefined) {
        list = list.slice(0, this.limitCount);
      }

      // Add budget resolution simulation
      if (this.table === 'PRESUPUESTOS') {
        const detRaw = localStorage.getItem('DETALLES_PRESUPUESTO') || '[]';
        const bDetails = JSON.parse(detRaw);
        list = list.map((b: any) => ({
          ...b,
          DETALLES_PRESUPUESTO: bDetails.filter((d: any) => d.presupuesto_id === b.id)
        }));
      }

      return resolve({ data: list, error: null });
    } catch (err) {
      if (reject) return reject(err);
      return resolve({ data: [], error: err });
    }
  }
}

// Standard supabase client instance or fluent Mock builder
let liveClient: any = null;
if (isLiveSupabase) {
  liveClient = createClient(supabaseUrl, supabaseAnonKey);
}

const mockClient = {
  from(table: string) {
    let resolvedTable = table;
    if (table.toUpperCase() === 'RECETA_TRASNP') {
      resolvedTable = 'RECETA_TRANSP';
    }
    return new MockQueryBuilder(resolvedTable);
  }
};

export const supabase = isLiveSupabase ? liveClient : mockClient;
