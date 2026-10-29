export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      bitacora_auditoria: {
        Row: {
          actor_email: string | null
          actor_id: string | null
          campos_modificados: string[] | null
          fecha_hora: string
          id: number
          operacion: string
          organizacion_id: string | null
          proyecto_id: string | null
          registro_id: string
          tabla_nombre: string
          valores_anteriores: Json | null
          valores_nuevos: Json | null
        }
        Insert: {
          actor_email?: string | null
          actor_id?: string | null
          campos_modificados?: string[] | null
          fecha_hora?: string
          id?: number
          operacion: string
          organizacion_id?: string | null
          proyecto_id?: string | null
          registro_id: string
          tabla_nombre: string
          valores_anteriores?: Json | null
          valores_nuevos?: Json | null
        }
        Update: {
          actor_email?: string | null
          actor_id?: string | null
          campos_modificados?: string[] | null
          fecha_hora?: string
          id?: number
          operacion?: string
          organizacion_id?: string | null
          proyecto_id?: string | null
          registro_id?: string
          tabla_nombre?: string
          valores_anteriores?: Json | null
          valores_nuevos?: Json | null
        }
        Relationships: []
      }
      borradores_insumo: {
        Row: {
          catalogo_id: string
          categoria: string
          created_at: string
          estado: string
          fecha_revision: string | null
          id: string
          insumo_id: string | null
          justificacion: string | null
          nombre: string
          nuevo_precio: number
          proveedor: string | null
          revisado_por: string | null
          solicitado_por: string | null
          unidad: string
          updated_at: string
        }
        Insert: {
          catalogo_id: string
          categoria: string
          created_at?: string
          estado?: string
          fecha_revision?: string | null
          id?: string
          insumo_id?: string | null
          justificacion?: string | null
          nombre: string
          nuevo_precio: number
          proveedor?: string | null
          revisado_por?: string | null
          solicitado_por?: string | null
          unidad: string
          updated_at?: string
        }
        Update: {
          catalogo_id?: string
          categoria?: string
          created_at?: string
          estado?: string
          fecha_revision?: string | null
          id?: string
          insumo_id?: string | null
          justificacion?: string | null
          nombre?: string
          nuevo_precio?: number
          proveedor?: string | null
          revisado_por?: string | null
          solicitado_por?: string | null
          unidad?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "borradores_insumo_catalogo_id_fkey"
            columns: ["catalogo_id"]
            isOneToOne: false
            referencedRelation: "catalogos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "borradores_insumo_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "borradores_insumo_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "INSUMOS_EYH"
            referencedColumns: ["id_insumo_eyh"]
          },
          {
            foreignKeyName: "borradores_insumo_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "INSUMOS_MAT"
            referencedColumns: ["id_insumo_mat"]
          },
          {
            foreignKeyName: "borradores_insumo_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "INSUMOS_MOB"
            referencedColumns: ["id_insumo_mob"]
          },
          {
            foreignKeyName: "borradores_insumo_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "INSUMOS_TRANSP"
            referencedColumns: ["id_insumo_transp"]
          },
          {
            foreignKeyName: "borradores_insumo_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "REFERENCIAS_IA_INSUMOS"
            referencedColumns: ["id_referencia"]
          },
        ]
      }
      borradores_rubro: {
        Row: {
          created_at: string
          editor_id: string | null
          estado: string
          id: string
          justificacion: string | null
          nueva_unidad: string | null
          nuevo_codigo: string | null
          nuevo_nombre: string | null
          nuevo_rendimiento: number | null
          proyecto_id: string
          revisado_por: string | null
          rubro_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          editor_id?: string | null
          estado?: string
          id?: string
          justificacion?: string | null
          nueva_unidad?: string | null
          nuevo_codigo?: string | null
          nuevo_nombre?: string | null
          nuevo_rendimiento?: number | null
          proyecto_id: string
          revisado_por?: string | null
          rubro_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          editor_id?: string | null
          estado?: string
          id?: string
          justificacion?: string | null
          nueva_unidad?: string | null
          nuevo_codigo?: string | null
          nuevo_nombre?: string | null
          nuevo_rendimiento?: number | null
          proyecto_id?: string
          revisado_por?: string | null
          rubro_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "borradores_rubro_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "borradores_rubro_rubro_id_fkey"
            columns: ["rubro_id"]
            isOneToOne: false
            referencedRelation: "rubros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "borradores_rubro_rubro_id_fkey"
            columns: ["rubro_id"]
            isOneToOne: false
            referencedRelation: "RUBROS"
            referencedColumns: ["id_rubro"]
          },
          {
            foreignKeyName: "borradores_rubro_rubro_id_fkey"
            columns: ["rubro_id"]
            isOneToOne: false
            referencedRelation: "SUMA"
            referencedColumns: ["id_rubro"]
          },
        ]
      }
      catalogos: {
        Row: {
          created_at: string
          descripcion: string | null
          es_global: boolean
          id: string
          moneda: string
          nombre: string
          organizacion_id: string | null
          updated_at: string
          version: string | null
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          es_global?: boolean
          id?: string
          moneda?: string
          nombre: string
          organizacion_id?: string | null
          updated_at?: string
          version?: string | null
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          es_global?: boolean
          id?: string
          moneda?: string
          nombre?: string
          organizacion_id?: string | null
          updated_at?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalogos_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      insumos: {
        Row: {
          base_calculo: string | null
          catalogo_id: string
          categoria: string
          categoria_trabajador: string | null
          codigo: string | null
          created_at: string
          created_by: string | null
          distancia_km: number | null
          es_porcentaje: boolean
          id: string
          nombre: string
          nombre_normalizado: string | null
          porcentaje: number | null
          precio_unitario: number
          proveedor: string | null
          proyecto_origen: string | null
          rendimiento_defecto: number | null
          unidad: string
          updated_at: string
        }
        Insert: {
          base_calculo?: string | null
          catalogo_id: string
          categoria: string
          categoria_trabajador?: string | null
          codigo?: string | null
          created_at?: string
          created_by?: string | null
          distancia_km?: number | null
          es_porcentaje?: boolean
          id?: string
          nombre: string
          nombre_normalizado?: string | null
          porcentaje?: number | null
          precio_unitario?: number
          proveedor?: string | null
          proyecto_origen?: string | null
          rendimiento_defecto?: number | null
          unidad: string
          updated_at?: string
        }
        Update: {
          base_calculo?: string | null
          catalogo_id?: string
          categoria?: string
          categoria_trabajador?: string | null
          codigo?: string | null
          created_at?: string
          created_by?: string | null
          distancia_km?: number | null
          es_porcentaje?: boolean
          id?: string
          nombre?: string
          nombre_normalizado?: string | null
          porcentaje?: number | null
          precio_unitario?: number
          proveedor?: string | null
          proyecto_origen?: string | null
          rendimiento_defecto?: number | null
          unidad?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insumos_catalogo_id_fkey"
            columns: ["catalogo_id"]
            isOneToOne: false
            referencedRelation: "catalogos"
            referencedColumns: ["id"]
          },
        ]
      }
      invitaciones_proyecto: {
        Row: {
          created_at: string
          email: string
          estado: string
          expira_en: string
          id: string
          invitado_por: string | null
          proyecto_id: string
          rol: string
          token: string
        }
        Insert: {
          created_at?: string
          email: string
          estado?: string
          expira_en?: string
          id?: string
          invitado_por?: string | null
          proyecto_id: string
          rol: string
          token?: string
        }
        Update: {
          created_at?: string
          email?: string
          estado?: string
          expira_en?: string
          id?: string
          invitado_por?: string | null
          proyecto_id?: string
          rol?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitaciones_proyecto_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
        ]
      }
      miembros_organizacion: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          organizacion_id: string
          rol: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          organizacion_id: string
          rol: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          organizacion_id?: string
          rol?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "miembros_organizacion_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      miembros_proyecto: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          proyecto_id: string
          rol: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          proyecto_id: string
          rol: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          proyecto_id?: string
          rol?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "miembros_proyecto_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
        ]
      }
      organizaciones: {
        Row: {
          configuracion: Json
          created_at: string
          created_by: string | null
          id: string
          nombre: string
          plan: string
          ruc_identificacion: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          configuracion?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          nombre: string
          plan?: string
          ruc_identificacion?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          configuracion?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          nombre?: string
          plan?: string
          ruc_identificacion?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      perfiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          nombre_completo: string | null
          organizacion_activa_id: string | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          nombre_completo?: string | null
          organizacion_activa_id?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          nombre_completo?: string | null
          organizacion_activa_id?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfiles_organizacion_activa_id_fkey"
            columns: ["organizacion_activa_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      presupuesto_capitulos: {
        Row: {
          capitulo_padre_id: string | null
          codigo: string | null
          costo_directo: number
          created_at: string
          id: string
          nombre: string
          numero_orden: number
          presupuesto_id: string
          updated_at: string
        }
        Insert: {
          capitulo_padre_id?: string | null
          codigo?: string | null
          costo_directo?: number
          created_at?: string
          id?: string
          nombre: string
          numero_orden?: number
          presupuesto_id: string
          updated_at?: string
        }
        Update: {
          capitulo_padre_id?: string | null
          codigo?: string | null
          costo_directo?: number
          created_at?: string
          id?: string
          nombre?: string
          numero_orden?: number
          presupuesto_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "presupuesto_capitulos_capitulo_padre_id_fkey"
            columns: ["capitulo_padre_id"]
            isOneToOne: false
            referencedRelation: "CAPITULOS_PRESUPUESTO"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presupuesto_capitulos_capitulo_padre_id_fkey"
            columns: ["capitulo_padre_id"]
            isOneToOne: false
            referencedRelation: "presupuesto_capitulos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presupuesto_capitulos_presupuesto_id_fkey"
            columns: ["presupuesto_id"]
            isOneToOne: false
            referencedRelation: "presupuestos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presupuesto_capitulos_presupuesto_id_fkey"
            columns: ["presupuesto_id"]
            isOneToOne: false
            referencedRelation: "PRESUPUESTOS"
            referencedColumns: ["id"]
          },
        ]
      }
      presupuesto_items: {
        Row: {
          cantidad: number
          capitulo_id: string
          codigo_item: string | null
          created_at: string
          especificaciones: string | null
          id: string
          nombre_rubro: string
          numero_orden: number
          precio_total: number
          precio_unitario: number
          presupuesto_id: string
          rubro_id: string
          unidad: string
          updated_at: string
        }
        Insert: {
          cantidad?: number
          capitulo_id: string
          codigo_item?: string | null
          created_at?: string
          especificaciones?: string | null
          id?: string
          nombre_rubro: string
          numero_orden?: number
          precio_total?: number
          precio_unitario?: number
          presupuesto_id: string
          rubro_id: string
          unidad: string
          updated_at?: string
        }
        Update: {
          cantidad?: number
          capitulo_id?: string
          codigo_item?: string | null
          created_at?: string
          especificaciones?: string | null
          id?: string
          nombre_rubro?: string
          numero_orden?: number
          precio_total?: number
          precio_unitario?: number
          presupuesto_id?: string
          rubro_id?: string
          unidad?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "presupuesto_items_capitulo_id_fkey"
            columns: ["capitulo_id"]
            isOneToOne: false
            referencedRelation: "CAPITULOS_PRESUPUESTO"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presupuesto_items_capitulo_id_fkey"
            columns: ["capitulo_id"]
            isOneToOne: false
            referencedRelation: "presupuesto_capitulos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presupuesto_items_presupuesto_id_fkey"
            columns: ["presupuesto_id"]
            isOneToOne: false
            referencedRelation: "presupuestos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presupuesto_items_presupuesto_id_fkey"
            columns: ["presupuesto_id"]
            isOneToOne: false
            referencedRelation: "PRESUPUESTOS"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presupuesto_items_rubro_id_fkey"
            columns: ["rubro_id"]
            isOneToOne: false
            referencedRelation: "rubros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presupuesto_items_rubro_id_fkey"
            columns: ["rubro_id"]
            isOneToOne: false
            referencedRelation: "RUBROS"
            referencedColumns: ["id_rubro"]
          },
          {
            foreignKeyName: "presupuesto_items_rubro_id_fkey"
            columns: ["rubro_id"]
            isOneToOne: false
            referencedRelation: "SUMA"
            referencedColumns: ["id_rubro"]
          },
        ]
      }
      presupuestos: {
        Row: {
          codigo: string | null
          costo_directo_total: number
          costo_indirecto_total: number
          created_at: string
          created_by: string | null
          descripcion: string | null
          estado: string
          fecha_creacion: string
          id: string
          monto_iva: number
          monto_total: number
          monto_utilidad: number
          nombre: string
          organizacion_id: string
          porcentaje_indirectos: number
          porcentaje_iva: number
          porcentaje_utilidad: number
          proyecto_id: string
          subtotal_sin_iva: number
          updated_at: string
          version: number
        }
        Insert: {
          codigo?: string | null
          costo_directo_total?: number
          costo_indirecto_total?: number
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          estado?: string
          fecha_creacion?: string
          id?: string
          monto_iva?: number
          monto_total?: number
          monto_utilidad?: number
          nombre: string
          organizacion_id: string
          porcentaje_indirectos?: number
          porcentaje_iva?: number
          porcentaje_utilidad?: number
          proyecto_id: string
          subtotal_sin_iva?: number
          updated_at?: string
          version?: number
        }
        Update: {
          codigo?: string | null
          costo_directo_total?: number
          costo_indirecto_total?: number
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          estado?: string
          fecha_creacion?: string
          id?: string
          monto_iva?: number
          monto_total?: number
          monto_utilidad?: number
          nombre?: string
          organizacion_id?: string
          porcentaje_indirectos?: number
          porcentaje_iva?: number
          porcentaje_utilidad?: number
          proyecto_id?: string
          subtotal_sin_iva?: number
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "presupuestos_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presupuestos_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
        ]
      }
      proyectos: {
        Row: {
          cliente: string | null
          codigo: string | null
          created_at: string
          created_by: string | null
          descripcion: string | null
          estado: string
          fecha_fin_estimada: string | null
          fecha_inicio: string | null
          id: string
          nombre: string
          organizacion_id: string | null
          presupuesto_referencial: number
          ubicacion: string | null
          updated_at: string
        }
        Insert: {
          cliente?: string | null
          codigo?: string | null
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          estado?: string
          fecha_fin_estimada?: string | null
          fecha_inicio?: string | null
          id?: string
          nombre: string
          organizacion_id?: string | null
          presupuesto_referencial?: number
          ubicacion?: string | null
          updated_at?: string
        }
        Update: {
          cliente?: string | null
          codigo?: string | null
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          estado?: string
          fecha_fin_estimada?: string | null
          fecha_inicio?: string | null
          id?: string
          nombre?: string
          organizacion_id?: string | null
          presupuesto_referencial?: number
          ubicacion?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proyectos_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      rubro_insumos: {
        Row: {
          cantidad: number
          categoria: string
          codigo_insumo: string | null
          created_at: string
          distancia: number | null
          es_porcentaje: boolean
          id: string
          insumo_id: string | null
          nombre_insumo: string
          porcentaje: number | null
          precio_unitario: number
          rendimiento: number | null
          rubro_id: string
          subtotal: number
          unidad_insumo: string
          updated_at: string
        }
        Insert: {
          cantidad?: number
          categoria: string
          codigo_insumo?: string | null
          created_at?: string
          distancia?: number | null
          es_porcentaje?: boolean
          id?: string
          insumo_id?: string | null
          nombre_insumo: string
          porcentaje?: number | null
          precio_unitario?: number
          rendimiento?: number | null
          rubro_id: string
          subtotal?: number
          unidad_insumo: string
          updated_at?: string
        }
        Update: {
          cantidad?: number
          categoria?: string
          codigo_insumo?: string | null
          created_at?: string
          distancia?: number | null
          es_porcentaje?: boolean
          id?: string
          insumo_id?: string | null
          nombre_insumo?: string
          porcentaje?: number | null
          precio_unitario?: number
          rendimiento?: number | null
          rubro_id?: string
          subtotal?: number
          unidad_insumo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rubro_insumos_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rubro_insumos_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "INSUMOS_EYH"
            referencedColumns: ["id_insumo_eyh"]
          },
          {
            foreignKeyName: "rubro_insumos_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "INSUMOS_MAT"
            referencedColumns: ["id_insumo_mat"]
          },
          {
            foreignKeyName: "rubro_insumos_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "INSUMOS_MOB"
            referencedColumns: ["id_insumo_mob"]
          },
          {
            foreignKeyName: "rubro_insumos_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "INSUMOS_TRANSP"
            referencedColumns: ["id_insumo_transp"]
          },
          {
            foreignKeyName: "rubro_insumos_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "REFERENCIAS_IA_INSUMOS"
            referencedColumns: ["id_referencia"]
          },
          {
            foreignKeyName: "rubro_insumos_rubro_id_fkey"
            columns: ["rubro_id"]
            isOneToOne: false
            referencedRelation: "rubros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rubro_insumos_rubro_id_fkey"
            columns: ["rubro_id"]
            isOneToOne: false
            referencedRelation: "RUBROS"
            referencedColumns: ["id_rubro"]
          },
          {
            foreignKeyName: "rubro_insumos_rubro_id_fkey"
            columns: ["rubro_id"]
            isOneToOne: false
            referencedRelation: "SUMA"
            referencedColumns: ["id_rubro"]
          },
        ]
      }
      rubros: {
        Row: {
          codigo_rubro: string | null
          costo_equipos: number
          costo_mano_obra: number
          costo_materiales: number
          costo_transporte: number
          created_at: string
          created_by: string | null
          descripcion: string | null
          es_global: boolean
          especificaciones_tecnicas: string | null
          id: string
          nombre: string
          nombre_normalizado: string | null
          organizacion_id: string | null
          precio_unitario: number
          proyecto_id: string | null
          proyecto_origen: string | null
          rendimiento: number
          unidad: string
          updated_at: string
        }
        Insert: {
          codigo_rubro?: string | null
          costo_equipos?: number
          costo_mano_obra?: number
          costo_materiales?: number
          costo_transporte?: number
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          es_global?: boolean
          especificaciones_tecnicas?: string | null
          id?: string
          nombre: string
          nombre_normalizado?: string | null
          organizacion_id?: string | null
          precio_unitario?: number
          proyecto_id?: string | null
          proyecto_origen?: string | null
          rendimiento?: number
          unidad: string
          updated_at?: string
        }
        Update: {
          codigo_rubro?: string | null
          costo_equipos?: number
          costo_mano_obra?: number
          costo_materiales?: number
          costo_transporte?: number
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          es_global?: boolean
          especificaciones_tecnicas?: string | null
          id?: string
          nombre?: string
          nombre_normalizado?: string | null
          organizacion_id?: string | null
          precio_unitario?: number
          proyecto_id?: string | null
          proyecto_origen?: string | null
          rendimiento?: number
          unidad?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rubros_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rubros_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      CAPITULOS_PRESUPUESTO: {
        Row: {
          id: string | null
          nombre_capitulo: string | null
          orden: number | null
          presupuesto_id: string | null
        }
        Insert: {
          id?: string | null
          nombre_capitulo?: string | null
          orden?: number | null
          presupuesto_id?: string | null
        }
        Update: {
          id?: string | null
          nombre_capitulo?: string | null
          orden?: number | null
          presupuesto_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "presupuesto_capitulos_presupuesto_id_fkey"
            columns: ["presupuesto_id"]
            isOneToOne: false
            referencedRelation: "presupuestos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presupuesto_capitulos_presupuesto_id_fkey"
            columns: ["presupuesto_id"]
            isOneToOne: false
            referencedRelation: "PRESUPUESTOS"
            referencedColumns: ["id"]
          },
        ]
      }
      DETALLES_PRESUPUESTO: {
        Row: {
          cantidad: number | null
          capitulo_id: string | null
          id: string | null
          orden: number | null
          precio_total: number | null
          precio_unitario: number | null
          rubro_id: string | null
        }
        Insert: {
          cantidad?: number | null
          capitulo_id?: string | null
          id?: string | null
          orden?: number | null
          precio_total?: number | null
          precio_unitario?: number | null
          rubro_id?: string | null
        }
        Update: {
          cantidad?: number | null
          capitulo_id?: string | null
          id?: string | null
          orden?: number | null
          precio_total?: number | null
          precio_unitario?: number | null
          rubro_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "presupuesto_items_capitulo_id_fkey"
            columns: ["capitulo_id"]
            isOneToOne: false
            referencedRelation: "CAPITULOS_PRESUPUESTO"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presupuesto_items_capitulo_id_fkey"
            columns: ["capitulo_id"]
            isOneToOne: false
            referencedRelation: "presupuesto_capitulos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presupuesto_items_rubro_id_fkey"
            columns: ["rubro_id"]
            isOneToOne: false
            referencedRelation: "rubros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presupuesto_items_rubro_id_fkey"
            columns: ["rubro_id"]
            isOneToOne: false
            referencedRelation: "RUBROS"
            referencedColumns: ["id_rubro"]
          },
          {
            foreignKeyName: "presupuesto_items_rubro_id_fkey"
            columns: ["rubro_id"]
            isOneToOne: false
            referencedRelation: "SUMA"
            referencedColumns: ["id_rubro"]
          },
        ]
      }
      INSUMOS_EYH: {
        Row: {
          base_calculo: string | null
          es_porcentaje: boolean | null
          id_insumo_eyh: string | null
          name_insumo_eyh: string | null
          precio_eyh: number | null
          proyecto_origen_eyh: string | null
          rendimiento_eyh: number | null
          unidad_eyh: string | null
          user_id: string | null
        }
        Insert: {
          base_calculo?: string | null
          es_porcentaje?: boolean | null
          id_insumo_eyh?: string | null
          name_insumo_eyh?: string | null
          precio_eyh?: number | null
          proyecto_origen_eyh?: string | null
          rendimiento_eyh?: number | null
          unidad_eyh?: string | null
          user_id?: string | null
        }
        Update: {
          base_calculo?: string | null
          es_porcentaje?: boolean | null
          id_insumo_eyh?: string | null
          name_insumo_eyh?: string | null
          precio_eyh?: number | null
          proyecto_origen_eyh?: string | null
          rendimiento_eyh?: number | null
          unidad_eyh?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      INSUMOS_MAT: {
        Row: {
          id_insumo_mat: string | null
          name_insumo_mat: string | null
          precio_mat: number | null
          proyecto_origen_mat: string | null
          unidad_mat: string | null
          user_id: string | null
        }
        Insert: {
          id_insumo_mat?: string | null
          name_insumo_mat?: string | null
          precio_mat?: number | null
          proyecto_origen_mat?: string | null
          unidad_mat?: string | null
          user_id?: string | null
        }
        Update: {
          id_insumo_mat?: string | null
          name_insumo_mat?: string | null
          precio_mat?: number | null
          proyecto_origen_mat?: string | null
          unidad_mat?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      INSUMOS_MOB: {
        Row: {
          id_insumo_mob: string | null
          name_insumo_mob: string | null
          precio_mob: number | null
          proyecto_origen_mob: string | null
          unidad_mob: string | null
          user_id: string | null
        }
        Insert: {
          id_insumo_mob?: string | null
          name_insumo_mob?: string | null
          precio_mob?: number | null
          proyecto_origen_mob?: string | null
          unidad_mob?: string | null
          user_id?: string | null
        }
        Update: {
          id_insumo_mob?: string | null
          name_insumo_mob?: string | null
          precio_mob?: number | null
          proyecto_origen_mob?: string | null
          unidad_mob?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      INSUMOS_TRANSP: {
        Row: {
          id_insumo_transp: string | null
          name_insumo_transp: string | null
          precio_transp: number | null
          proyecto_origen_transp: string | null
          unidad_transp: string | null
          user_id: string | null
        }
        Insert: {
          id_insumo_transp?: string | null
          name_insumo_transp?: string | null
          precio_transp?: number | null
          proyecto_origen_transp?: string | null
          unidad_transp?: string | null
          user_id?: string | null
        }
        Update: {
          id_insumo_transp?: string | null
          name_insumo_transp?: string | null
          precio_transp?: number | null
          proyecto_origen_transp?: string | null
          unidad_transp?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      PRESUPUESTOS: {
        Row: {
          estado: string | null
          fecha_creacion: string | null
          id: string | null
          nombre: string | null
          precio_presup_total: number | null
          proyecto_id: string | null
          user_id: string | null
        }
        Insert: {
          estado?: string | null
          fecha_creacion?: string | null
          id?: string | null
          nombre?: string | null
          precio_presup_total?: number | null
          proyecto_id?: string | null
          user_id?: string | null
        }
        Update: {
          estado?: string | null
          fecha_creacion?: string | null
          id?: string | null
          nombre?: string | null
          precio_presup_total?: number | null
          proyecto_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "presupuestos_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
        ]
      }
      RECETA_EYH: {
        Row: {
          cantidad_: number | null
          id_insumo_: string | null
          id_rubro: string | null
          name_insumo_: string | null
          precio_receta_eyh: number | null
          precio_unitario_: number | null
          rendimiento_: number | null
        }
        Insert: {
          cantidad_?: number | null
          id_insumo_?: string | null
          id_rubro?: string | null
          name_insumo_?: string | null
          precio_receta_eyh?: number | null
          precio_unitario_?: number | null
          rendimiento_?: number | null
        }
        Update: {
          cantidad_?: number | null
          id_insumo_?: string | null
          id_rubro?: string | null
          name_insumo_?: string | null
          precio_receta_eyh?: number | null
          precio_unitario_?: number | null
          rendimiento_?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rubro_insumos_insumo_id_fkey"
            columns: ["id_insumo_"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rubro_insumos_insumo_id_fkey"
            columns: ["id_insumo_"]
            isOneToOne: false
            referencedRelation: "INSUMOS_EYH"
            referencedColumns: ["id_insumo_eyh"]
          },
          {
            foreignKeyName: "rubro_insumos_insumo_id_fkey"
            columns: ["id_insumo_"]
            isOneToOne: false
            referencedRelation: "INSUMOS_MAT"
            referencedColumns: ["id_insumo_mat"]
          },
          {
            foreignKeyName: "rubro_insumos_insumo_id_fkey"
            columns: ["id_insumo_"]
            isOneToOne: false
            referencedRelation: "INSUMOS_MOB"
            referencedColumns: ["id_insumo_mob"]
          },
          {
            foreignKeyName: "rubro_insumos_insumo_id_fkey"
            columns: ["id_insumo_"]
            isOneToOne: false
            referencedRelation: "INSUMOS_TRANSP"
            referencedColumns: ["id_insumo_transp"]
          },
          {
            foreignKeyName: "rubro_insumos_insumo_id_fkey"
            columns: ["id_insumo_"]
            isOneToOne: false
            referencedRelation: "REFERENCIAS_IA_INSUMOS"
            referencedColumns: ["id_referencia"]
          },
          {
            foreignKeyName: "rubro_insumos_rubro_id_fkey"
            columns: ["id_rubro"]
            isOneToOne: false
            referencedRelation: "rubros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rubro_insumos_rubro_id_fkey"
            columns: ["id_rubro"]
            isOneToOne: false
            referencedRelation: "RUBROS"
            referencedColumns: ["id_rubro"]
          },
          {
            foreignKeyName: "rubro_insumos_rubro_id_fkey"
            columns: ["id_rubro"]
            isOneToOne: false
            referencedRelation: "SUMA"
            referencedColumns: ["id_rubro"]
          },
        ]
      }
      RECETA_MAT: {
        Row: {
          cantidad_: number | null
          id_insumo_: string | null
          id_rubro: string | null
          name_insumo_: string | null
          precio_receta_mat: number | null
          precio_unitario_: number | null
          rendimiento_: number | null
        }
        Insert: {
          cantidad_?: number | null
          id_insumo_?: string | null
          id_rubro?: string | null
          name_insumo_?: string | null
          precio_receta_mat?: number | null
          precio_unitario_?: number | null
          rendimiento_?: number | null
        }
        Update: {
          cantidad_?: number | null
          id_insumo_?: string | null
          id_rubro?: string | null
          name_insumo_?: string | null
          precio_receta_mat?: number | null
          precio_unitario_?: number | null
          rendimiento_?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rubro_insumos_insumo_id_fkey"
            columns: ["id_insumo_"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rubro_insumos_insumo_id_fkey"
            columns: ["id_insumo_"]
            isOneToOne: false
            referencedRelation: "INSUMOS_EYH"
            referencedColumns: ["id_insumo_eyh"]
          },
          {
            foreignKeyName: "rubro_insumos_insumo_id_fkey"
            columns: ["id_insumo_"]
            isOneToOne: false
            referencedRelation: "INSUMOS_MAT"
            referencedColumns: ["id_insumo_mat"]
          },
          {
            foreignKeyName: "rubro_insumos_insumo_id_fkey"
            columns: ["id_insumo_"]
            isOneToOne: false
            referencedRelation: "INSUMOS_MOB"
            referencedColumns: ["id_insumo_mob"]
          },
          {
            foreignKeyName: "rubro_insumos_insumo_id_fkey"
            columns: ["id_insumo_"]
            isOneToOne: false
            referencedRelation: "INSUMOS_TRANSP"
            referencedColumns: ["id_insumo_transp"]
          },
          {
            foreignKeyName: "rubro_insumos_insumo_id_fkey"
            columns: ["id_insumo_"]
            isOneToOne: false
            referencedRelation: "REFERENCIAS_IA_INSUMOS"
            referencedColumns: ["id_referencia"]
          },
          {
            foreignKeyName: "rubro_insumos_rubro_id_fkey"
            columns: ["id_rubro"]
            isOneToOne: false
            referencedRelation: "rubros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rubro_insumos_rubro_id_fkey"
            columns: ["id_rubro"]
            isOneToOne: false
            referencedRelation: "RUBROS"
            referencedColumns: ["id_rubro"]
          },
          {
            foreignKeyName: "rubro_insumos_rubro_id_fkey"
            columns: ["id_rubro"]
            isOneToOne: false
            referencedRelation: "SUMA"
            referencedColumns: ["id_rubro"]
          },
        ]
      }
      RECETA_MOB: {
        Row: {
          cantidad_: number | null
          id_insumo_: string | null
          id_rubro: string | null
          name_insumo_: string | null
          precio_receta_mob: number | null
          precio_unitario_: number | null
          rendimiento_: number | null
        }
        Insert: {
          cantidad_?: number | null
          id_insumo_?: string | null
          id_rubro?: string | null
          name_insumo_?: string | null
          precio_receta_mob?: number | null
          precio_unitario_?: number | null
          rendimiento_?: number | null
        }
        Update: {
          cantidad_?: number | null
          id_insumo_?: string | null
          id_rubro?: string | null
          name_insumo_?: string | null
          precio_receta_mob?: number | null
          precio_unitario_?: number | null
          rendimiento_?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rubro_insumos_insumo_id_fkey"
            columns: ["id_insumo_"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rubro_insumos_insumo_id_fkey"
            columns: ["id_insumo_"]
            isOneToOne: false
            referencedRelation: "INSUMOS_EYH"
            referencedColumns: ["id_insumo_eyh"]
          },
          {
            foreignKeyName: "rubro_insumos_insumo_id_fkey"
            columns: ["id_insumo_"]
            isOneToOne: false
            referencedRelation: "INSUMOS_MAT"
            referencedColumns: ["id_insumo_mat"]
          },
          {
            foreignKeyName: "rubro_insumos_insumo_id_fkey"
            columns: ["id_insumo_"]
            isOneToOne: false
            referencedRelation: "INSUMOS_MOB"
            referencedColumns: ["id_insumo_mob"]
          },
          {
            foreignKeyName: "rubro_insumos_insumo_id_fkey"
            columns: ["id_insumo_"]
            isOneToOne: false
            referencedRelation: "INSUMOS_TRANSP"
            referencedColumns: ["id_insumo_transp"]
          },
          {
            foreignKeyName: "rubro_insumos_insumo_id_fkey"
            columns: ["id_insumo_"]
            isOneToOne: false
            referencedRelation: "REFERENCIAS_IA_INSUMOS"
            referencedColumns: ["id_referencia"]
          },
          {
            foreignKeyName: "rubro_insumos_rubro_id_fkey"
            columns: ["id_rubro"]
            isOneToOne: false
            referencedRelation: "rubros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rubro_insumos_rubro_id_fkey"
            columns: ["id_rubro"]
            isOneToOne: false
            referencedRelation: "RUBROS"
            referencedColumns: ["id_rubro"]
          },
          {
            foreignKeyName: "rubro_insumos_rubro_id_fkey"
            columns: ["id_rubro"]
            isOneToOne: false
            referencedRelation: "SUMA"
            referencedColumns: ["id_rubro"]
          },
        ]
      }
      RECETA_TRANSP: {
        Row: {
          cantidad_: number | null
          distancia_: number | null
          id_insumo_: string | null
          id_rubro: string | null
          name_insumo_: string | null
          precio_receta_transp: number | null
          precio_unitario_: number | null
        }
        Insert: {
          cantidad_?: number | null
          distancia_?: number | null
          id_insumo_?: string | null
          id_rubro?: string | null
          name_insumo_?: string | null
          precio_receta_transp?: number | null
          precio_unitario_?: number | null
        }
        Update: {
          cantidad_?: number | null
          distancia_?: number | null
          id_insumo_?: string | null
          id_rubro?: string | null
          name_insumo_?: string | null
          precio_receta_transp?: number | null
          precio_unitario_?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rubro_insumos_insumo_id_fkey"
            columns: ["id_insumo_"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rubro_insumos_insumo_id_fkey"
            columns: ["id_insumo_"]
            isOneToOne: false
            referencedRelation: "INSUMOS_EYH"
            referencedColumns: ["id_insumo_eyh"]
          },
          {
            foreignKeyName: "rubro_insumos_insumo_id_fkey"
            columns: ["id_insumo_"]
            isOneToOne: false
            referencedRelation: "INSUMOS_MAT"
            referencedColumns: ["id_insumo_mat"]
          },
          {
            foreignKeyName: "rubro_insumos_insumo_id_fkey"
            columns: ["id_insumo_"]
            isOneToOne: false
            referencedRelation: "INSUMOS_MOB"
            referencedColumns: ["id_insumo_mob"]
          },
          {
            foreignKeyName: "rubro_insumos_insumo_id_fkey"
            columns: ["id_insumo_"]
            isOneToOne: false
            referencedRelation: "INSUMOS_TRANSP"
            referencedColumns: ["id_insumo_transp"]
          },
          {
            foreignKeyName: "rubro_insumos_insumo_id_fkey"
            columns: ["id_insumo_"]
            isOneToOne: false
            referencedRelation: "REFERENCIAS_IA_INSUMOS"
            referencedColumns: ["id_referencia"]
          },
          {
            foreignKeyName: "rubro_insumos_rubro_id_fkey"
            columns: ["id_rubro"]
            isOneToOne: false
            referencedRelation: "rubros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rubro_insumos_rubro_id_fkey"
            columns: ["id_rubro"]
            isOneToOne: false
            referencedRelation: "RUBROS"
            referencedColumns: ["id_rubro"]
          },
          {
            foreignKeyName: "rubro_insumos_rubro_id_fkey"
            columns: ["id_rubro"]
            isOneToOne: false
            referencedRelation: "SUMA"
            referencedColumns: ["id_rubro"]
          },
        ]
      }
      REFERENCIAS_IA_INSUMOS: {
        Row: {
          categoria_insumo: string | null
          created_at: string | null
          id_referencia: string | null
          nombre_insumo_detalle: string | null
          precio_referencia: number | null
          proyecto_origen: string | null
          unidad_referencia: string | null
          user_id: string | null
        }
        Insert: {
          categoria_insumo?: never
          created_at?: string | null
          id_referencia?: string | null
          nombre_insumo_detalle?: string | null
          precio_referencia?: number | null
          proyecto_origen?: string | null
          unidad_referencia?: string | null
          user_id?: string | null
        }
        Update: {
          categoria_insumo?: never
          created_at?: string | null
          id_referencia?: string | null
          nombre_insumo_detalle?: string | null
          precio_referencia?: number | null
          proyecto_origen?: string | null
          unidad_referencia?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      RUBROS: {
        Row: {
          created_at: string | null
          id_rubro: string | null
          nombre_rubro: string | null
          organizacion_id: string | null
          precio_rubro: number | null
          proyecto_id: string | null
          proyecto_origen: string | null
          suma_eyh: number | null
          suma_mat: number | null
          suma_mob: number | null
          suma_transp: number | null
          unidad_rubro: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id_rubro?: string | null
          nombre_rubro?: string | null
          organizacion_id?: string | null
          precio_rubro?: number | null
          proyecto_id?: string | null
          proyecto_origen?: string | null
          suma_eyh?: number | null
          suma_mat?: number | null
          suma_mob?: number | null
          suma_transp?: number | null
          unidad_rubro?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id_rubro?: string | null
          nombre_rubro?: string | null
          organizacion_id?: string | null
          precio_rubro?: number | null
          proyecto_id?: string | null
          proyecto_origen?: string | null
          suma_eyh?: number | null
          suma_mat?: number | null
          suma_mob?: number | null
          suma_transp?: number | null
          unidad_rubro?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rubros_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rubros_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
        ]
      }
      SUMA: {
        Row: {
          id_rubro: string | null
          suma_eyh: number | null
          suma_mat: number | null
          suma_mob: number | null
          suma_t: number | null
          suma_transp: number | null
        }
        Insert: {
          id_rubro?: string | null
          suma_eyh?: number | null
          suma_mat?: number | null
          suma_mob?: number | null
          suma_t?: number | null
          suma_transp?: number | null
        }
        Update: {
          id_rubro?: string | null
          suma_eyh?: number | null
          suma_mat?: number | null
          suma_mob?: number | null
          suma_t?: number | null
          suma_transp?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      actualizar_precios_insumos: {
        Args: { p_insumos: Json; p_proyecto_origen: string; p_user_id?: string }
        Returns: undefined
      }
      aprobar_borrador_insumo: {
        Args: { p_borrador_id: string }
        Returns: string
      }
      cambiar_rol_miembro_proyecto: {
        Args: { p_nuevo_rol: string; p_proyecto_id: string; p_user_id: string }
        Returns: boolean
      }
      clonar_catalogo_maestro_a_organizacion: {
        Args: { p_nombre_nuevo_catalogo?: string; p_organizacion_id: string }
        Returns: Json
      }
      clonar_rubro_maestro_a_organizacion: {
        Args: {
          p_organizacion_id: string
          p_proyecto_id?: string
          p_rubro_id: string
        }
        Returns: string
      }
      consultar_auditoria_proyecto: {
        Args: { p_limite?: number; p_proyecto_id: string }
        Returns: {
          actor_email: string
          campos_modificados: string[]
          fecha_hora: string
          id: number
          operacion: string
          registro_id: string
          tabla_nombre: string
        }[]
      }
      consultar_historial_auditoria: {
        Args: { p_registro_id: string; p_tabla: string }
        Returns: {
          actor_email: string
          campos_modificados: string[]
          fecha_hora: string
          id: number
          operacion: string
          valores_anteriores: Json
          valores_nuevos: Json
        }[]
      }
      expulsar_miembro_proyecto: {
        Args: { p_proyecto_id: string; p_user_id: string }
        Returns: boolean
      }
      invitar_miembro_proyecto: {
        Args: { p_email: string; p_proyecto_id: string; p_rol: string }
        Returns: Json
      }
      normalizar_nombre: { Args: { p_nombre: string }; Returns: string }
      obtener_miembros_proyecto: {
        Args: { p_proyecto_id: string }
        Returns: {
          avatar_url: string
          email: string
          es_creador: boolean
          fecha_asignacion: string
          nombre_completo: string
          rol: string
          user_id: string
        }[]
      }
      procesar_receta_rubro: {
        Args: {
          p_insumos: Json
          p_nombre_rubro: string
          p_proyecto_origen: string
          p_unidad_rubro: string
          p_user_id?: string
        }
        Returns: string
      }
      recalcular_presupuesto: {
        Args: { p_presupuesto_id: string }
        Returns: undefined
      }
      recalcular_rubro: { Args: { p_rubro_id: string }; Returns: undefined }
      recalculate_precio_rubro: {
        Args: { rubro_id: string }
        Returns: undefined
      }
      regularize_name: { Args: { p_name: string }; Returns: string }
      sync_percentage_eyh: { Args: { rubro_id: string }; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
