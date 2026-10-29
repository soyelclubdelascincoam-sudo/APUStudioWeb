-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector"; -- Habilitar pgvector para campos 'embedding'

-- Limpiar tablas en orden inverso de dependencia (para desarrollo/recreación)
DROP VIEW IF EXISTS vw_insumos_efectivos CASCADE;
DROP VIEW IF EXISTS vw_rubros_efectivos CASCADE;
DROP VIEW IF EXISTS vw_recetas_efectivas CASCADE;

DROP TABLE IF EXISTS "DETALLES_PRESUPUESTO" CASCADE;
DROP TABLE IF EXISTS "CAPITULOS_PRESUPUESTO" CASCADE;
DROP TABLE IF EXISTS "PRESUPUESTOS" CASCADE;

DROP TABLE IF EXISTS "BORRADORES_RECETA" CASCADE;
DROP TABLE IF EXISTS "BORRADORES_RUBRO" CASCADE;
DROP TABLE IF EXISTS "BORRADORES_INSUMO" CASCADE;

DROP TABLE IF EXISTS "RECETAS_MAESTRAS" CASCADE;
DROP TABLE IF EXISTS "RUBROS_MAESTROS" CASCADE;
DROP TABLE IF EXISTS "INSUMOS_MAESTROS" CASCADE;

DROP TABLE IF EXISTS "MIEMBROS_PROYECTO" CASCADE;
DROP TABLE IF EXISTS "PROYECTOS" CASCADE;
DROP TABLE IF EXISTS "CATALOGOS" CASCADE;
DROP TABLE IF EXISTS "PROFILES" CASCADE;

--------------------------------------------------------------------------------
-- 1. TABLAS DE GESTIÓN DE USUARIOS
--------------------------------------------------------------------------------

-- Tabla: PROFILES (Perfiles de usuarios autenticados)
CREATE TABLE "PROFILES" (
    "id" UUID PRIMARY KEY REFERENCES auth.users("id") ON DELETE CASCADE,
    "email" TEXT NOT NULL,
    "nombre" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

--------------------------------------------------------------------------------
-- 2. CAPA GLOBAL (CATÁLOGOS MAESTROS)
--------------------------------------------------------------------------------

-- Catálogos (Bases de datos independientes)
CREATE TABLE "CATALOGOS" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "nombre" TEXT NOT NULL,
    "admin_id" UUID NOT NULL REFERENCES auth.users("id") ON DELETE CASCADE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insumos del Catálogo Maestro
CREATE TABLE "INSUMOS_MAESTROS" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "catalogo_id" UUID NOT NULL REFERENCES "CATALOGOS"("id") ON DELETE CASCADE,
    "nombre" TEXT NOT NULL,
    "precio" NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
    "unidad" TEXT,
    "categoria" TEXT NOT NULL CHECK ("categoria" IN ('Materiales', 'Mano de Obra', 'Equipos y Herramientas', 'Transporte')),
    "rendimiento_defecto" NUMERIC(10, 4), -- Utilizado para EYH o MOB
    "es_porcentaje" BOOLEAN NOT NULL DEFAULT FALSE,
    "base_calculo" TEXT,
    "embedding" vector(1536)
);

-- Rubros del Catálogo Maestro
CREATE TABLE "RUBROS_MAESTROS" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "catalogo_id" UUID NOT NULL REFERENCES "CATALOGOS"("id") ON DELETE CASCADE,
    "codigo_rubro" TEXT,
    "nombre" TEXT NOT NULL,
    "unidad" TEXT,
    "precio" NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
    "embedding" vector(1536)
);

-- Composición de Rubros (Recetas) en Catálogo Maestro
CREATE TABLE "RECETAS_MAESTRAS" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "rubro_id" UUID NOT NULL REFERENCES "RUBROS_MAESTROS"("id") ON DELETE CASCADE,
    "insumo_id" UUID NOT NULL REFERENCES "INSUMOS_MAESTROS"("id") ON DELETE CASCADE,
    "cantidad" NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
    "rendimiento" NUMERIC(10, 4) DEFAULT 1.0000,
    "distancia" NUMERIC(15, 4) DEFAULT 0.0000,
    UNIQUE("rubro_id", "insumo_id")
);

--------------------------------------------------------------------------------
-- 3. CAPA PROYECTOS Y ACCESOS (Roles)
--------------------------------------------------------------------------------

-- Proyectos
CREATE TABLE "PROYECTOS" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "nombre_proyecto" TEXT NOT NULL,
    "codigo_acceso" TEXT UNIQUE NOT NULL DEFAULT substring(md5(random()::text), 1, 8),
    "creador_id" UUID NOT NULL REFERENCES auth.users("id") ON DELETE SET NULL,
    "catalogo_base_id" UUID NOT NULL REFERENCES "CATALOGOS"("id") ON DELETE RESTRICT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Miembros del Proyecto (RBAC)
CREATE TABLE "MIEMBROS_PROYECTO" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "proyecto_id" UUID NOT NULL REFERENCES "PROYECTOS"("id") ON DELETE CASCADE,
    "user_id" UUID NOT NULL REFERENCES auth.users("id") ON DELETE CASCADE,
    "rol" TEXT NOT NULL DEFAULT 'lector' CHECK ("rol" IN ('admin', 'editor', 'lector')),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE("proyecto_id", "user_id")
);

--------------------------------------------------------------------------------
-- 4. CAPA DE BORRADORES / SHADOW OVERRIDES
--------------------------------------------------------------------------------

-- Propuestas de cambio de un Insumo hechas por el Editor
CREATE TABLE "BORRADORES_INSUMO" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "proyecto_id" UUID NOT NULL REFERENCES "PROYECTOS"("id") ON DELETE CASCADE,
    "insumo_maestro_id" UUID REFERENCES "INSUMOS_MAESTROS"("id") ON DELETE CASCADE, -- NULL si es un insumo creado 100% nuevo
    "nuevo_nombre" TEXT,
    "nuevo_precio" NUMERIC(15, 4),
    "nueva_unidad" TEXT,
    "nueva_categoria" TEXT,
    "nuevo_rendimiento_defecto" NUMERIC(10, 4),
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK ("estado" IN ('PENDIENTE', 'APROBADO', 'RECHAZADO')),
    "editor_id" UUID NOT NULL REFERENCES auth.users("id") ON DELETE SET NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- UPSERT automático para resolución de conflictos: "el más reciente gana"
    UNIQUE("proyecto_id", "insumo_maestro_id") 
);

-- Propuestas de cambio de un Rubro hechas por el Editor
CREATE TABLE "BORRADORES_RUBRO" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "proyecto_id" UUID NOT NULL REFERENCES "PROYECTOS"("id") ON DELETE CASCADE,
    "rubro_maestro_id" UUID REFERENCES "RUBROS_MAESTROS"("id") ON DELETE CASCADE, -- NULL si es rubro nuevo
    "nuevo_codigo_rubro" TEXT,
    "nuevo_nombre" TEXT,
    "nueva_unidad" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK ("estado" IN ('PENDIENTE', 'APROBADO', 'RECHAZADO')),
    "editor_id" UUID NOT NULL REFERENCES auth.users("id") ON DELETE SET NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE("proyecto_id", "rubro_maestro_id")
);

-- Propuestas de cambio en la Receta de un Rubro
CREATE TABLE "BORRADORES_RECETA" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "proyecto_id" UUID NOT NULL REFERENCES "PROYECTOS"("id") ON DELETE CASCADE,
    "receta_maestra_id" UUID REFERENCES "RECETAS_MAESTRAS"("id") ON DELETE CASCADE, -- NULL si se añade insumo nuevo a rubro existente
    "rubro_maestro_id" UUID NOT NULL REFERENCES "RUBROS_MAESTROS"("id") ON DELETE CASCADE,
    "insumo_maestro_id" UUID NOT NULL REFERENCES "INSUMOS_MAESTROS"("id") ON DELETE CASCADE,
    "nueva_cantidad" NUMERIC(15, 4),
    "nuevo_rendimiento" NUMERIC(10, 4),
    "nueva_distancia" NUMERIC(15, 4),
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK ("estado" IN ('PENDIENTE', 'APROBADO', 'RECHAZADO', 'ELIMINADO')), -- ELIMINADO para cuando el editor borra un insumo de la receta
    "editor_id" UUID NOT NULL REFERENCES auth.users("id") ON DELETE SET NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE("proyecto_id", "receta_maestra_id")
);

--------------------------------------------------------------------------------
-- 5. VISTAS EFECTIVAS (Fusión en tiempo real Maestro + Borrador)
--------------------------------------------------------------------------------

-- Vista: Insumos Efectivos por Proyecto (Alimenta el presupuesto al instante)
CREATE OR REPLACE VIEW vw_insumos_efectivos AS
SELECT
    im.id AS insumo_id,
    p.id AS proyecto_id,
    COALESCE(bi.nuevo_nombre, im.nombre) AS nombre,
    COALESCE(bi.nuevo_precio, im.precio) AS precio,
    COALESCE(bi.nueva_unidad, im.unidad) AS unidad,
    COALESCE(bi.nueva_categoria, im.categoria) AS categoria,
    COALESCE(bi.nuevo_rendimiento_defecto, im.rendimiento_defecto) AS rendimiento_defecto,
    CASE WHEN bi.id IS NOT NULL THEN true ELSE false END AS tiene_borrador_pendiente,
    bi.id AS borrador_id
FROM "PROYECTOS" p
JOIN "CATALOGOS" c ON p.catalogo_base_id = c.id
JOIN "INSUMOS_MAESTROS" im ON im.catalogo_id = c.id
LEFT JOIN "BORRADORES_INSUMO" bi 
    ON bi.insumo_maestro_id = im.id 
    AND bi.proyecto_id = p.id 
    AND bi.estado = 'PENDIENTE'

UNION ALL

-- Insumos totalmente nuevos creados en el proyecto (no existen en maestro aún)
SELECT 
    bi.id AS insumo_id,
    bi.proyecto_id,
    bi.nuevo_nombre AS nombre,
    bi.nuevo_precio AS precio,
    bi.nueva_unidad AS unidad,
    bi.nueva_categoria AS categoria,
    bi.nuevo_rendimiento_defecto AS rendimiento_defecto,
    true AS tiene_borrador_pendiente,
    bi.id AS borrador_id
FROM "BORRADORES_INSUMO" bi
WHERE bi.insumo_maestro_id IS NULL AND bi.estado = 'PENDIENTE';


-- Vista: Rubros Efectivos por Proyecto
CREATE OR REPLACE VIEW vw_rubros_efectivos AS
SELECT
    rm.id AS rubro_id,
    p.id AS proyecto_id,
    COALESCE(br.nuevo_codigo_rubro, rm.codigo_rubro) AS codigo_rubro,
    COALESCE(br.nuevo_nombre, rm.nombre) AS nombre,
    COALESCE(br.nueva_unidad, rm.unidad) AS unidad,
    CASE WHEN br.id IS NOT NULL THEN true ELSE false END AS tiene_borrador_pendiente,
    br.id AS borrador_id
FROM "PROYECTOS" p
JOIN "CATALOGOS" c ON p.catalogo_base_id = c.id
JOIN "RUBROS_MAESTROS" rm ON rm.catalogo_id = c.id
LEFT JOIN "BORRADORES_RUBRO" br 
    ON br.rubro_maestro_id = rm.id 
    AND br.proyecto_id = p.id 
    AND br.estado = 'PENDIENTE'

UNION ALL

-- Rubros totalmente nuevos
SELECT 
    br.id AS rubro_id,
    br.proyecto_id,
    br.nuevo_codigo_rubro AS codigo_rubro,
    br.nuevo_nombre AS nombre,
    br.nueva_unidad AS unidad,
    true AS tiene_borrador_pendiente,
    br.id AS borrador_id
FROM "BORRADORES_RUBRO" br
WHERE br.rubro_maestro_id IS NULL AND br.estado = 'PENDIENTE';


-- Vista: Recetas Efectivas por Proyecto
CREATE OR REPLACE VIEW vw_recetas_efectivas AS
SELECT
    rem.id AS receta_id,
    p.id AS proyecto_id,
    rem.rubro_id,
    rem.insumo_id,
    COALESCE(bre.nueva_cantidad, rem.cantidad) AS cantidad,
    COALESCE(bre.nuevo_rendimiento, rem.rendimiento) AS rendimiento,
    COALESCE(bre.nueva_distancia, rem.distancia) AS distancia,
    CASE WHEN bre.id IS NOT NULL THEN true ELSE false END AS tiene_borrador_pendiente,
    bre.id AS borrador_id
FROM "PROYECTOS" p
JOIN "CATALOGOS" c ON p.catalogo_base_id = c.id
JOIN "RUBROS_MAESTROS" rm ON rm.catalogo_id = c.id
JOIN "RECETAS_MAESTRAS" rem ON rem.rubro_id = rm.id
LEFT JOIN "BORRADORES_RECETA" bre 
    ON bre.receta_maestra_id = rem.id 
    AND bre.proyecto_id = p.id 
    AND bre.estado IN ('PENDIENTE', 'ELIMINADO')
WHERE bre.estado IS NULL OR bre.estado != 'ELIMINADO' -- Filtramos los que el editor decidió borrar temporalmente

UNION ALL

-- Recetas totalmente nuevas
SELECT 
    bre.id AS receta_id,
    bre.proyecto_id,
    bre.rubro_maestro_id AS rubro_id,
    bre.insumo_maestro_id AS insumo_id,
    bre.nueva_cantidad AS cantidad,
    bre.nuevo_rendimiento AS rendimiento,
    bre.nueva_distancia AS distancia,
    true AS tiene_borrador_pendiente,
    bre.id AS borrador_id
FROM "BORRADORES_RECETA" bre
WHERE bre.receta_maestra_id IS NULL AND bre.estado = 'PENDIENTE';

--------------------------------------------------------------------------------
-- 6. CAPA EJECUCIÓN (PRESUPUESTOS)
--------------------------------------------------------------------------------

CREATE TABLE "PRESUPUESTOS" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "proyecto_id" UUID NOT NULL REFERENCES "PROYECTOS"("id") ON DELETE CASCADE,
    "nombre" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'Borrador',
    "precio_presup_total" NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
    "fecha_creacion" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "CAPITULOS_PRESUPUESTO" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "presupuesto_id" UUID NOT NULL REFERENCES "PRESUPUESTOS"("id") ON DELETE CASCADE,
    "nombre_capitulo" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0
);

-- Los detalles apuntan a la vista indirectamente a través de rubro_id
CREATE TABLE "DETALLES_PRESUPUESTO" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "capitulo_id" UUID NOT NULL REFERENCES "CAPITULOS_PRESUPUESTO"("id") ON DELETE CASCADE,
    "rubro_id" UUID NOT NULL, -- Puede ser de RUBROS_MAESTROS o de BORRADORES_RUBRO
    "cantidad" NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
    "orden" INTEGER NOT NULL DEFAULT 0
);

--------------------------------------------------------------------------------
-- 7. FUNCIONES RPC Y SEGURIDAD RLS
--------------------------------------------------------------------------------

-- Auxiliar: check_project_access
CREATE OR REPLACE FUNCTION public.check_project_access(p_proyecto_id UUID, p_roles TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM "MIEMBROS_PROYECTO" 
    WHERE proyecto_id = p_proyecto_id 
      AND user_id = auth.uid() 
      AND rol = ANY(p_roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auxiliar: check_catalog_access (Retorna TRUE si el usuario es dueño del catálogo)
CREATE OR REPLACE FUNCTION public.check_catalog_access(p_catalogo_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Eres el dueño
  IF EXISTS (SELECT 1 FROM "CATALOGOS" WHERE id = p_catalogo_id AND admin_id = auth.uid()) THEN
    RETURN TRUE;
  END IF;
  -- Perteneces a un proyecto que usa este catálogo
  RETURN EXISTS (
    SELECT 1 FROM "PROYECTOS" p
    JOIN "MIEMBROS_PROYECTO" mp ON p.id = mp.proyecto_id
    WHERE p.catalogo_base_id = p_catalogo_id AND mp.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Políticas para CATALOGOS
CREATE POLICY "Lectura Catalogos" ON "CATALOGOS" FOR SELECT USING (public.check_catalog_access(id));
CREATE POLICY "Escritura Catalogos" ON "CATALOGOS" FOR ALL USING (auth.uid() = admin_id) WITH CHECK (auth.uid() = admin_id);

-- 2. Políticas para INSUMOS_MAESTROS

-- RLS
ALTER TABLE "CATALOGOS" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "INSUMOS_MAESTROS" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RUBROS_MAESTROS" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RECETAS_MAESTRAS" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PROYECTOS" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MIEMBROS_PROYECTO" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BORRADORES_INSUMO" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BORRADORES_RUBRO" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BORRADORES_RECETA" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PRESUPUESTOS" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CAPITULOS_PRESUPUESTO" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DETALLES_PRESUPUESTO" ENABLE ROW LEVEL SECURITY;

-- Políticas de Lectura Lector/Editor/Admin
CREATE POLICY "Lectura Catalogos" ON "CATALOGOS" FOR SELECT USING (public.check_catalog_access(id));
CREATE POLICY "Lectura Insumos Maestros" ON "INSUMOS_MAESTROS" FOR SELECT USING (public.check_catalog_access(catalogo_id));
CREATE POLICY "Lectura Rubros Maestros" ON "RUBROS_MAESTROS" FOR SELECT USING (public.check_catalog_access(catalogo_id));
CREATE POLICY "Lectura Recetas Maestras" ON "RECETAS_MAESTRAS" FOR SELECT USING (
    EXISTS (SELECT 1 FROM "RUBROS_MAESTROS" r WHERE r.id = rubro_id AND public.check_catalog_access(r.catalogo_id))
);

-- Políticas Escritura Admin en Maestro
CREATE POLICY "Escritura Insumos Maestros" ON "INSUMOS_MAESTROS" FOR ALL USING (
    EXISTS (SELECT 1 FROM "CATALOGOS" c WHERE c.id = catalogo_id AND c.admin_id = auth.uid())
);
CREATE POLICY "Escritura Rubros Maestros" ON "RUBROS_MAESTROS" FOR ALL USING (
    EXISTS (SELECT 1 FROM "CATALOGOS" c WHERE c.id = catalogo_id AND c.admin_id = auth.uid())
);
CREATE POLICY "Escritura Recetas Maestras" ON "RECETAS_MAESTRAS" FOR ALL USING (
    EXISTS (SELECT 1 FROM "RUBROS_MAESTROS" r JOIN "CATALOGOS" c ON r.catalogo_id = c.id WHERE r.id = rubro_id AND c.admin_id = auth.uid())
);

-- Políticas Borradores (Editor y Admin)
CREATE POLICY "Lectura Borradores Insumo" ON "BORRADORES_INSUMO" FOR SELECT USING (public.check_project_access(proyecto_id, ARRAY['admin', 'editor', 'lector']));
CREATE POLICY "Escritura Borradores Insumo" ON "BORRADORES_INSUMO" FOR ALL USING (public.check_project_access(proyecto_id, ARRAY['admin', 'editor']));

CREATE POLICY "Lectura Borradores Rubro" ON "BORRADORES_RUBRO" FOR SELECT USING (public.check_project_access(proyecto_id, ARRAY['admin', 'editor', 'lector']));
CREATE POLICY "Escritura Borradores Rubro" ON "BORRADORES_RUBRO" FOR ALL USING (public.check_project_access(proyecto_id, ARRAY['admin', 'editor']));

CREATE POLICY "Lectura Borradores Receta" ON "BORRADORES_RECETA" FOR SELECT USING (public.check_project_access(proyecto_id, ARRAY['admin', 'editor', 'lector']));
CREATE POLICY "Escritura Borradores Receta" ON "BORRADORES_RECETA" FOR ALL USING (public.check_project_access(proyecto_id, ARRAY['admin', 'editor']));

-- Políticas Presupuestos (Editor y Admin)
CREATE POLICY "Lectura Presupuestos" ON "PRESUPUESTOS" FOR SELECT USING (public.check_project_access(proyecto_id, ARRAY['admin', 'editor', 'lector']));
CREATE POLICY "Escritura Presupuestos" ON "PRESUPUESTOS" FOR ALL USING (public.check_project_access(proyecto_id, ARRAY['admin', 'editor']));

CREATE POLICY "Lectura Capítulos" ON "CAPITULOS_PRESUPUESTO" FOR SELECT USING (
    EXISTS (SELECT 1 FROM "PRESUPUESTOS" p WHERE p.id = presupuesto_id AND public.check_project_access(p.proyecto_id, ARRAY['admin', 'editor', 'lector']))
);
CREATE POLICY "Escritura Capítulos" ON "CAPITULOS_PRESUPUESTO" FOR ALL USING (
    EXISTS (SELECT 1 FROM "PRESUPUESTOS" p WHERE p.id = presupuesto_id AND public.check_project_access(p.proyecto_id, ARRAY['admin', 'editor']))
);

CREATE POLICY "Lectura Detalles" ON "DETALLES_PRESUPUESTO" FOR SELECT USING (
    EXISTS (SELECT 1 FROM "CAPITULOS_PRESUPUESTO" cp JOIN "PRESUPUESTOS" p ON cp.presupuesto_id = p.id WHERE cp.id = capitulo_id AND public.check_project_access(p.proyecto_id, ARRAY['admin', 'editor', 'lector']))
);
CREATE POLICY "Escritura Detalles" ON "DETALLES_PRESUPUESTO" FOR ALL USING (
    EXISTS (SELECT 1 FROM "CAPITULOS_PRESUPUESTO" cp JOIN "PRESUPUESTOS" p ON cp.presupuesto_id = p.id WHERE cp.id = capitulo_id AND public.check_project_access(p.proyecto_id, ARRAY['admin', 'editor']))
);

-- RPC para Aprobar Cambio (Solo Admin)
CREATE OR REPLACE FUNCTION aprobar_cambio_insumo(p_borrador_id UUID)
RETURNS VOID AS $$
DECLARE
    v_borrador RECORD;
    v_catalogo_id UUID;
    v_admin_id UUID;
BEGIN
    SELECT * INTO v_borrador FROM "BORRADORES_INSUMO" WHERE id = p_borrador_id AND estado = 'PENDIENTE';
    IF NOT FOUND THEN RAISE EXCEPTION 'Borrador no encontrado o ya procesado'; END IF;

    SELECT c.id, c.admin_id INTO v_catalogo_id, v_admin_id 
    FROM "PROYECTOS" p JOIN "CATALOGOS" c ON p.catalogo_base_id = c.id 
    WHERE p.id = v_borrador.proyecto_id;

    IF v_admin_id != auth.uid() THEN RAISE EXCEPTION 'Solo el dueño del catálogo puede aprobar'; END IF;

    IF v_borrador.insumo_maestro_id IS NOT NULL THEN
        -- Actualizar maestro existente
        UPDATE "INSUMOS_MAESTROS" SET
            precio = COALESCE(v_borrador.nuevo_precio, precio),
            nombre = COALESCE(v_borrador.nuevo_nombre, nombre),
            unidad = COALESCE(v_borrador.nueva_unidad, unidad),
            categoria = COALESCE(v_borrador.nueva_categoria, categoria),
            rendimiento_defecto = COALESCE(v_borrador.nuevo_rendimiento_defecto, rendimiento_defecto)
        WHERE id = v_borrador.insumo_maestro_id;
    ELSE
        -- Insertar nuevo insumo maestro
        INSERT INTO "INSUMOS_MAESTROS" (catalogo_id, nombre, precio, unidad, categoria, rendimiento_defecto)
        VALUES (v_catalogo_id, v_borrador.nuevo_nombre, COALESCE(v_borrador.nuevo_precio, 0), v_borrador.nueva_unidad, v_borrador.nueva_categoria, v_borrador.nuevo_rendimiento_defecto);
    END IF;

    UPDATE "BORRADORES_INSUMO" SET estado = 'APROBADO' WHERE id = p_borrador_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- RPC para Aprobar Cambio de Rubro (Solo Admin)
CREATE OR REPLACE FUNCTION aprobar_cambio_rubro(p_borrador_id UUID)
RETURNS VOID AS $$
DECLARE
    v_borrador RECORD;
    v_catalogo_id UUID;
    v_admin_id UUID;
BEGIN
    SELECT * INTO v_borrador FROM "BORRADORES_RUBRO" WHERE id = p_borrador_id AND estado = 'PENDIENTE';
    IF NOT FOUND THEN RAISE EXCEPTION 'Borrador no encontrado o ya procesado'; END IF;

    SELECT c.id, c.admin_id INTO v_catalogo_id, v_admin_id 
    FROM "PROYECTOS" p JOIN "CATALOGOS" c ON p.catalogo_base_id = c.id 
    WHERE p.id = v_borrador.proyecto_id;

    IF v_admin_id != auth.uid() THEN RAISE EXCEPTION 'Solo el dueño del catálogo puede aprobar'; END IF;

    IF v_borrador.rubro_maestro_id IS NOT NULL THEN
        -- Actualizar rubro maestro existente
        UPDATE "RUBROS_MAESTROS" SET
            codigo_rubro = COALESCE(v_borrador.nuevo_codigo_rubro, codigo_rubro),
            nombre = COALESCE(v_borrador.nuevo_nombre, nombre),
            unidad = COALESCE(v_borrador.nueva_unidad, unidad)
        WHERE id = v_borrador.rubro_maestro_id;
    ELSE
        -- Insertar nuevo rubro maestro
        INSERT INTO "RUBROS_MAESTROS" (catalogo_id, codigo_rubro, nombre, unidad, precio)
        VALUES (v_catalogo_id, v_borrador.nuevo_codigo_rubro, v_borrador.nuevo_nombre, v_borrador.nueva_unidad, 0.0000);
    END IF;

    UPDATE "BORRADORES_RUBRO" SET estado = 'APROBADO' WHERE id = p_borrador_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- RPC para Aprobar Cambio de Receta (Solo Admin)
CREATE OR REPLACE FUNCTION aprobar_cambio_receta(p_borrador_id UUID)
RETURNS VOID AS $$
DECLARE
    v_borrador RECORD;
    v_catalogo_id UUID;
    v_admin_id UUID;
BEGIN
    SELECT * INTO v_borrador FROM "BORRADORES_RECETA" WHERE id = p_borrador_id AND estado IN ('PENDIENTE', 'ELIMINADO');
    IF NOT FOUND THEN RAISE EXCEPTION 'Borrador no encontrado o ya procesado'; END IF;

    SELECT c.id, c.admin_id INTO v_catalogo_id, v_admin_id 
    FROM "PROYECTOS" p JOIN "CATALOGOS" c ON p.catalogo_base_id = c.id 
    WHERE p.id = v_borrador.proyecto_id;

    IF v_admin_id != auth.uid() THEN RAISE EXCEPTION 'Solo el dueño del catálogo puede aprobar'; END IF;

    IF v_borrador.estado = 'ELIMINADO' THEN
        -- Si el borrador era una propuesta de eliminación, borrar de la maestra
        DELETE FROM "RECETAS_MAESTRAS" WHERE id = v_borrador.receta_maestra_id;
    ELSIF v_borrador.receta_maestra_id IS NOT NULL THEN
        -- Actualizar receta maestra existente
        UPDATE "RECETAS_MAESTRAS" SET
            cantidad = COALESCE(v_borrador.nueva_cantidad, cantidad),
            rendimiento = COALESCE(v_borrador.nuevo_rendimiento, rendimiento),
            distancia = COALESCE(v_borrador.nueva_distancia, distancia)
        WHERE id = v_borrador.receta_maestra_id;
    ELSE
        -- Insertar nueva receta maestra
        INSERT INTO "RECETAS_MAESTRAS" (rubro_id, insumo_id, cantidad, rendimiento, distancia)
        VALUES (v_borrador.rubro_maestro_id, v_borrador.insumo_maestro_id, COALESCE(v_borrador.nueva_cantidad, 0), COALESCE(v_borrador.nuevo_rendimiento, 1), COALESCE(v_borrador.nueva_distancia, 0));
    END IF;

    UPDATE "BORRADORES_RECETA" SET estado = 'APROBADO' WHERE id = p_borrador_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- RPC: procesar_receta_rubro_catalogo
-- Invocada por procesar-apu-deterministico para poblar recetas en el Catálogo Maestro
CREATE OR REPLACE FUNCTION procesar_receta_rubro_catalogo(
    p_catalogo_id UUID,
    p_codigo_rubro TEXT,
    p_nombre_rubro TEXT,
    p_unidad_rubro TEXT,
    p_precio_rubro NUMERIC,
    p_insumos JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_rubro_id UUID;
    v_insumo_receta JSONB;
    v_insumo_id UUID;
    v_inserted_count INT := 0;
BEGIN
    -- 1. UPSERT Rubro Maestro
    INSERT INTO "RUBROS_MAESTROS" (catalogo_id, codigo_rubro, nombre, unidad, precio)
    VALUES (p_catalogo_id, p_codigo_rubro, p_nombre_rubro, p_unidad_rubro, p_precio_rubro)
    ON CONFLICT (catalogo_id, nombre) DO UPDATE 
    SET precio = EXCLUDED.precio, unidad = EXCLUDED.unidad, codigo_rubro = EXCLUDED.codigo_rubro
    RETURNING id INTO v_rubro_id;

    -- 2. Procesar Insumos de la Receta
    FOR v_insumo_receta IN SELECT * FROM jsonb_array_elements(p_insumos) LOOP
        
        -- Buscar Insumo Maestro por nombre y catálogo
        SELECT id INTO v_insumo_id FROM "INSUMOS_MAESTROS"
        WHERE catalogo_id = p_catalogo_id AND nombre ILIKE (v_insumo_receta->>'nombre_insumo_detalle')
        LIMIT 1;

        -- Si no existe, crearlo
        IF v_insumo_id IS NULL THEN
            INSERT INTO "INSUMOS_MAESTROS" (catalogo_id, nombre, precio, unidad, categoria)
            VALUES (
                p_catalogo_id, 
                v_insumo_receta->>'nombre_insumo_detalle', 
                COALESCE((v_insumo_receta->>'precio_referencia')::NUMERIC, 0),
                v_insumo_receta->>'unidad_referencia',
                v_insumo_receta->>'categoria_insumo'
            ) RETURNING id INTO v_insumo_id;
        END IF;

        -- UPSERT en Receta Maestra
        INSERT INTO "RECETAS_MAESTRAS" (rubro_id, insumo_id, cantidad, rendimiento, distancia)
        VALUES (
            v_rubro_id,
            v_insumo_id,
            COALESCE((v_insumo_receta->>'cantidad')::NUMERIC, 0),
            COALESCE((v_insumo_receta->>'rendimiento')::NUMERIC, 1),
            COALESCE((v_insumo_receta->>'distancia')::NUMERIC, 0)
        )
        ON CONFLICT (rubro_id, insumo_id) DO UPDATE
        SET cantidad = EXCLUDED.cantidad, rendimiento = EXCLUDED.rendimiento, distancia = EXCLUDED.distancia;

        v_inserted_count := v_inserted_count + 1;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'rubro_id', v_rubro_id, 'insumos_procesados', v_inserted_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- RPC: actualizar_precios_insumos_catalogo
-- Invocada por procesar-apu para guardar insumos puros
CREATE OR REPLACE FUNCTION actualizar_precios_insumos_catalogo(
    p_catalogo_id UUID,
    p_insumos JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_insumo JSONB;
    v_inserted_count INT := 0;
BEGIN
    FOR v_insumo IN SELECT * FROM jsonb_array_elements(p_insumos) LOOP
        -- UPSERT INSUMO MAESTRO basado en nombre y catalogo_id (Asumiendo que deberíamos tener UNIQUE en catalogo_id, nombre, pero lo haremos con un id si existe, o limit 1)
        -- Para evitar crear un UNIQUE contraint costoso, haremos un bloque manual
        BEGIN
            INSERT INTO "INSUMOS_MAESTROS" (catalogo_id, nombre, precio, unidad, categoria)
            VALUES (
                p_catalogo_id,
                v_insumo->>'nombre_insumo_detalle',
                COALESCE((v_insumo->>'precio_referencia')::NUMERIC, 0),
                v_insumo->>'unidad_referencia',
                v_insumo->>'categoria_insumo'
            );
            v_inserted_count := v_inserted_count + 1;
        EXCEPTION WHEN unique_violation THEN
            UPDATE "INSUMOS_MAESTROS" SET
                precio = COALESCE((v_insumo->>'precio_referencia')::NUMERIC, precio),
                unidad = COALESCE((v_insumo->>'unidad_referencia'), unidad),
                categoria = COALESCE((v_insumo->>'categoria_insumo'), categoria)
            WHERE catalogo_id = p_catalogo_id AND nombre = (v_insumo->>'nombre_insumo_detalle');
            v_inserted_count := v_inserted_count + 1;
        END;
    END LOOP;
    
    RETURN jsonb_build_object('success', true, 'procesados', v_inserted_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Pol�ticas para Proyectos y Miembros
CREATE POLICY "Lectura Proyectos" ON "PROYECTOS" FOR SELECT USING (
    creador_id = auth.uid() OR public.check_project_access(id, ARRAY['admin', 'editor', 'lector'])
);
CREATE POLICY "Escritura Proyectos" ON "PROYECTOS" FOR ALL USING (
    creador_id = auth.uid() OR public.check_project_access(id, ARRAY['admin'])
);

CREATE POLICY "Lectura Miembros" ON "MIEMBROS_PROYECTO" FOR SELECT USING (
    user_id = auth.uid() OR public.check_project_access(proyecto_id, ARRAY['admin', 'editor', 'lector'])
);
CREATE POLICY "Escritura Miembros" ON "MIEMBROS_PROYECTO" FOR ALL USING (
    user_id = auth.uid() OR public.check_project_access(proyecto_id, ARRAY['admin'])
);
