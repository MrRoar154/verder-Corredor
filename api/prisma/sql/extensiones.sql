CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION f_unaccent(text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;

CREATE INDEX IF NOT EXISTS especies_busqueda_trgm ON especies
  USING gin (f_unaccent(lower(nombre_comun || ' ' || coalesce(nombre_cientifico, ''))) gin_trgm_ops);

CREATE UNIQUE INDEX IF NOT EXISTS usuarios_email_uq ON usuarios (lower(email));

ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_negocio_chk;
ALTER TABLE usuarios
  ADD CONSTRAINT usuarios_rol_negocio_chk
  CHECK (rol <> 'vivero' OR negocio_id IS NOT NULL);

ALTER TABLE existencias DROP CONSTRAINT IF EXISTS existencias_precio_no_negativo;
ALTER TABLE existencias
  ADD CONSTRAINT existencias_precio_no_negativo CHECK (precio_cop >= 0);

ALTER TABLE existencias DROP CONSTRAINT IF EXISTS existencias_cantidad_no_negativa;
ALTER TABLE existencias
  ADD CONSTRAINT existencias_cantidad_no_negativa CHECK (cantidad >= 0);

ALTER TABLE pedido_items DROP CONSTRAINT IF EXISTS pedido_items_cantidad_positiva;
ALTER TABLE pedido_items
  ADD CONSTRAINT pedido_items_cantidad_positiva CHECK (cantidad > 0);

ALTER TABLE pedido_items DROP CONSTRAINT IF EXISTS pedido_items_precio_no_negativo;
ALTER TABLE pedido_items
  ADD CONSTRAINT pedido_items_precio_no_negativo CHECK (precio_unit_cop >= 0);

ALTER TABLE recordatorios DROP CONSTRAINT IF EXISTS recordatorios_cada_dias_positivo;
ALTER TABLE recordatorios
  ADD CONSTRAINT recordatorios_cada_dias_positivo CHECK (cada_dias IS NULL OR cada_dias > 0);
