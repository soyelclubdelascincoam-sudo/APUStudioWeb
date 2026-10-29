import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isLiveSupabase, getSupabaseClient } from '../supabase';
import type {
  Organizacion,
  Perfil,
  MiembroOrganizacion,
  Proyecto,
  RolOrganizacion,
  RolProyecto,
} from '../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  perfil: Perfil | null;
  organizaciones: Organizacion[];
  organizacionActiva: Organizacion | null;
  rolOrg: RolOrganizacion | null;
  proyectoActivo: Proyecto | null;
  rolProyecto: RolProyecto | null;
  cargando: boolean;

  // Permisos derivados en UI
  esDuenoOAdmin: boolean;
  puedeEditarProyecto: boolean;
  puedeAprobarEnProyecto: boolean;
  esSoloLectura: boolean;

  // Acciones
  cambiarOrganizacionActiva: (orgId: string) => Promise<void>;
  cambiarProyectoActivo: (proyecto: Proyecto | null) => void;
  actualizarPerfil: (datos: { nombre_completo?: string | null; telefono?: string | null; avatar_url?: string | null }) => Promise<void>;
  actualizarOrganizacionActiva: (datos: { nombre?: string; ruc_identificacion?: string | null }) => Promise<void>;
  cerrarSesion: () => Promise<void>;
  refrescarSesionYDatos: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [organizaciones, setOrganizaciones] = useState<Organizacion[]>([]);
  const [organizacionActiva, setOrganizacionActiva] = useState<Organizacion | null>(null);
  const [rolOrg, setRolOrg] = useState<RolOrganizacion | null>(null);
  const [proyectoActivo, setProyectoActivo] = useState<Proyecto | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('apustudio_proyecto_activo') || localStorage.getItem('proyecto_activo');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parsed.id)) {
            return parsed;
          }
          localStorage.removeItem('apustudio_proyecto_activo');
          localStorage.removeItem('proyecto_activo');
        } catch {
          // ignore error
        }
      }
    }
    return null;
  });
  const [rolProyecto, setRolProyecto] = useState<RolProyecto | null>(null);
  const [cargando, setCargando] = useState(true);

  // Cargar perfil y organizaciones asociadas
  const cargarDatosUsuario = useCallback(async (userId: string) => {
    try {
      if (!isLiveSupabase) {
        // Modo local simulado
        const mockOrg: Organizacion = {
          id: 'org-demo-001',
          nombre: 'Constructora Demo',
          slug: 'constructora-demo',
          plan: 'profesional',
          ruc_identificacion: '1790000000001',
          configuracion: {},
          created_by: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setOrganizaciones([mockOrg]);
        setOrganizacionActiva(mockOrg);
        setRolOrg('dueño');
        setPerfil({
          id: userId,
          email: 'demo@apustudio.com',
          nombre_completo: 'Usuario Demo',
          avatar_url: null,
          telefono: null,
          organizacion_activa_id: mockOrg.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        return;
      }

      const client = getSupabaseClient();

      // 1. Obtener perfil
      const { data: perfilData, error: perfilError } = await client
        .from('perfiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (perfilError) {
        console.error('Error al cargar perfil:', perfilError);
      }

      setPerfil(perfilData);

      // 2. Obtener membresías de organización
      const { data: membresiasData, error: memError } = await client
        .from('miembros_organizacion')
        .select('rol, organizacion_id, organizaciones (*)')
        .eq('user_id', userId)
        .eq('activo', true);

      if (memError) {
        console.error('Error al cargar organizaciones:', memError);
      }

      const orgs: Organizacion[] = [];
      let rolActual: RolOrganizacion | null = null;
      let orgActivaObj: Organizacion | null = null;

      if (membresiasData && membresiasData.length > 0) {
        membresiasData.forEach((m: any) => {
          if (m.organizaciones) {
            orgs.push(m.organizaciones as Organizacion);
          }
        });

        // Determinar organización activa
        const idDeseada = perfilData?.organizacion_activa_id;
        const encontrada = orgs.find(o => o.id === idDeseada) || orgs[0];

        if (encontrada) {
          orgActivaObj = encontrada;
          const miembroActivo = membresiasData.find((m: any) => m.organizacion_id === encontrada.id);
          rolActual = (miembroActivo?.rol as RolOrganizacion) || 'miembro';
        }
      }

      setOrganizaciones(orgs);
      setOrganizacionActiva(orgActivaObj);
      setRolOrg(rolActual);
    } catch (err) {
      console.error('Error cargando datos de usuario:', err);
    }
  }, []);

  // Determinar rol del usuario en el proyecto activo
  const cargarRolProyecto = useCallback(async (userId: string, projId: string) => {
    try {
      if (!isLiveSupabase) {
        setRolProyecto('owner');
        return;
      }

      const client = getSupabaseClient();
      const { data, error } = await client
        .from('miembros_proyecto')
        .select('rol')
        .eq('proyecto_id', projId)
        .eq('user_id', userId)
        .eq('activo', true)
        .maybeSingle();

      if (!error && data?.rol) {
        setRolProyecto(data.rol as RolProyecto);
      } else {
        // Si no está explícito pero es dueño/admin de la org, asume rol total
        if (rolOrg === 'dueño' || rolOrg === 'administrador') {
          setRolProyecto('owner');
        } else {
          setRolProyecto('viewer');
        }
      }
    } catch (err) {
      console.error('Error cargando rol de proyecto:', err);
      setRolProyecto('viewer');
    }
  }, [rolOrg]);

  // Inicialización de la sesión Supabase
  useEffect(() => {
    if (!isLiveSupabase) {
      const savedUser = localStorage.getItem('demo_user');
      if (savedUser) {
        try {
          const u = JSON.parse(savedUser);
          setUser(u);
          cargarDatosUsuario(u.id);
        } catch {
          // ignore
        }
      }
      setCargando(false);
      return;
    }

    const client = getSupabaseClient();

    // 1. Obtener sesión actual
    client.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        cargarDatosUsuario(session.user.id).finally(() => setCargando(false));
      } else {
        setCargando(false);
      }
    });

    // 2. Escuchar cambios de estado en Auth
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        await cargarDatosUsuario(newSession.user.id);
      } else {
        setPerfil(null);
        setOrganizaciones([]);
        setOrganizacionActiva(null);
        setRolOrg(null);
        setProyectoActivo(null);
        setRolProyecto(null);
        localStorage.removeItem('apustudio_proyecto_activo');
      }
      setCargando(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [cargarDatosUsuario]);

  // Actualizar rol de proyecto cuando cambie el proyecto o el usuario
  useEffect(() => {
    if (user && proyectoActivo) {
      cargarRolProyecto(user.id, proyectoActivo.id);
    } else {
      setRolProyecto(null);
    }
  }, [user, proyectoActivo, cargarRolProyecto]);

  // Cambiar organización activa
  const cambiarOrganizacionActiva = async (orgId: string) => {
    if (!user) return;
    try {
      const nuevaOrg = organizaciones.find(o => o.id === orgId);
      if (!nuevaOrg) return;

      setOrganizacionActiva(nuevaOrg);

      if (isLiveSupabase) {
        const client = getSupabaseClient();
        await client
          .from('perfiles')
          .update({ organizacion_activa_id: orgId })
          .eq('id', user.id);

        const { data: mData } = await client
          .from('miembros_organizacion')
          .select('rol')
          .eq('organizacion_id', orgId)
          .eq('user_id', user.id)
          .maybeSingle();

        setRolOrg((mData?.rol as RolOrganizacion) || 'miembro');
      }

      // Reiniciar proyecto activo porque pertenece a otra organización
      setProyectoActivo(null);
      localStorage.removeItem('apustudio_proyecto_activo');
    } catch (err) {
      console.error('Error cambiando organización:', err);
    }
  };

  // Cambiar proyecto activo
  const cambiarProyectoActivo = (proyecto: Proyecto | null) => {
    setProyectoActivo(proyecto);
    if (proyecto) {
      localStorage.setItem('apustudio_proyecto_activo', JSON.stringify(proyecto));
    } else {
      localStorage.removeItem('apustudio_proyecto_activo');
    }
  };

  // Cerrar sesión
  const cerrarSesion = async () => {
    try {
      if (isLiveSupabase) {
        const client = getSupabaseClient();
        await client.auth.signOut();
      } else {
        localStorage.removeItem('demo_user');
      }
      setUser(null);
      setSession(null);
      setPerfil(null);
      setOrganizaciones([]);
      setOrganizacionActiva(null);
      setRolOrg(null);
      setProyectoActivo(null);
      setRolProyecto(null);
      localStorage.removeItem('apustudio_proyecto_activo');
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    }
  };

  // Actualizar perfil de usuario
  const actualizarPerfil = async (datos: { nombre_completo?: string | null; telefono?: string | null; avatar_url?: string | null }) => {
    if (!user) return;
    if (isLiveSupabase) {
      const client = getSupabaseClient();
      const { error } = await client
        .from('perfiles')
        .update(datos)
        .eq('id', user.id);
      if (error) throw error;
    }
    setPerfil(prev => prev ? { ...prev, ...datos } : null);
  };

  // Actualizar datos de la organización activa
  const actualizarOrganizacionActiva = async (datos: { nombre?: string; ruc_identificacion?: string | null }) => {
    if (!organizacionActiva) return;
    if (isLiveSupabase) {
      const client = getSupabaseClient();
      const { error } = await client
        .from('organizaciones')
        .update(datos)
        .eq('id', organizacionActiva.id);
      if (error) throw error;
    }
    setOrganizacionActiva(prev => prev ? { ...prev, ...datos } : null);
    setOrganizaciones(prev => prev.map(o => o.id === organizacionActiva.id ? { ...o, ...datos } : o));
  };

  // Refrescar manualmente
  const refrescarSesionYDatos = async () => {
    if (user) {
      await cargarDatosUsuario(user.id);
    }
  };

  // Permisos computados según el rol organizacional y de obra
  const esDuenoOAdmin = rolOrg === 'dueño' || rolOrg === 'administrador';
  const puedeEditarProyecto =
    esDuenoOAdmin ||
    rolProyecto === 'owner' ||
    rolProyecto === 'editor' ||
    rolProyecto === 'director' ||
    rolProyecto === 'residente' ||
    rolProyecto === 'editor_borradores' ||
    rolProyecto === 'admin';

  const puedeAprobarEnProyecto =
    esDuenoOAdmin || rolProyecto === 'owner' || rolProyecto === 'director';

  const esSoloLectura =
    !puedeEditarProyecto && (rolProyecto === 'viewer' || rolProyecto === 'fiscalizador_lectura');

  const value: AuthContextType = {
    user,
    session,
    perfil,
    organizaciones,
    organizacionActiva,
    rolOrg,
    proyectoActivo,
    rolProyecto,
    cargando,
    esDuenoOAdmin,
    puedeEditarProyecto,
    puedeAprobarEnProyecto,
    esSoloLectura,
    cambiarOrganizacionActiva,
    cambiarProyectoActivo,
    actualizarPerfil,
    actualizarOrganizacionActiva,
    cerrarSesion,
    refrescarSesionYDatos,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};
