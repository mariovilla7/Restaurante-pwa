-- STEP 1: Crear el tipo de estado para los pedidos, solo si no existe.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_pedido') THEN
    CREATE TYPE public.estado_pedido AS ENUM ('pendiente', 'en_preparacion', 'listo', 'servido', 'cancelado');
  END IF;
END$$;

-- STEP 2: Crear la tabla 'pedidos', solo si no existe.
CREATE TABLE IF NOT EXISTS public.pedidos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  mesa_id uuid NOT NULL,
  contenido jsonb NOT NULL,
  estado public.estado_pedido NOT NULL DEFAULT 'pendiente'::public.estado_pedido,
  total numeric NOT NULL,
  CONSTRAINT pedidos_pkey PRIMARY KEY (id),
  CONSTRAINT pedidos_mesa_id_fkey FOREIGN KEY (mesa_id) REFERENCES mesas (id) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- STEP 3: Habilitar RLS y definir políticas de seguridad de forma idempotente.
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes para asegurar una actualización limpia.
DROP POLICY IF EXISTS "Admin full access on pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Kitchen can read and update pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Mesa can create and read its own pedidos" ON public.pedidos;

-- Política para administradores
CREATE POLICY "Admin full access on pedidos"
ON public.pedidos FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Política para la cocina
CREATE POLICY "Kitchen can read and update pedidos"
ON public.pedidos FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'cocina'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'cocina'::app_role));

-- Política para las mesas (dispositivos)
CREATE POLICY "Mesa can create and read its own pedidos"
ON public.pedidos FOR ALL
TO authenticated
USING (
  (SELECT dispositivo_id FROM mesas WHERE id = mesa_id) = (auth.jwt() ->> 'sub')
)
WITH CHECK (
  (SELECT dispositivo_id FROM mesas WHERE id = mesa_id) = (auth.jwt() ->> 'sub')
);
