-- Define el tipo de estado para un pedido, lo que nos permite tener un control estricto de los estados posibles.
CREATE TYPE public.estado_pedido AS ENUM ('pendiente', 'en_preparacion', 'listo', 'servido', 'cancelado');

-- Crea la tabla 'pedidos' para almacenar los pedidos realizados por las mesas.
CREATE TABLE public.pedidos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  mesa_id uuid NOT NULL,
  -- El contenido del pedido se almacena como JSONB.
  -- Esto nos da flexibilidad para guardar un array de platos con sus cantidades y precios.
  -- Ejemplo: [{"plato_id": "...", "nombre": "Paella", "cantidad": 1, "precio": 15.50}]
  contenido jsonb NOT NULL,
  estado public.estado_pedido NOT NULL DEFAULT 'pendiente'::public.estado_pedido,
  total numeric NOT NULL,
  CONSTRAINT pedidos_pkey PRIMARY KEY (id),
  CONSTRAINT pedidos_mesa_id_fkey FOREIGN KEY (mesa_id) REFERENCES mesas (id) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- Habilita Row Level Security en la nueva tabla. Es una mejor práctica de seguridad.
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

-- Política para administradores: Los administradores tienen acceso completo a todos los pedidos.
CREATE POLICY "Admin full access on pedidos"
ON public.pedidos FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Política para la cocina: El personal de cocina puede leer y actualizar el estado de todos los pedidos.
-- No pueden crear ni eliminar pedidos.
CREATE POLICY "Kitchen can read and update pedidos"
ON public.pedidos FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'cocina'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'cocina'::app_role));

-- Política para las mesas: Una mesa (dispositivo) puede crear pedidos para sí misma y leer sus propios pedidos.
-- No puede modificar ni eliminar pedidos una vez creados.
CREATE POLICY "Mesa can create and read its own pedidos"
ON public.pedidos FOR ALL
TO authenticated
USING (
  (auth.jwt() ->> 'sub') = (SELECT dispositivo_id FROM mesas WHERE id = mesa_id)
)
WITH CHECK (
  (auth.jwt() ->> 'sub') = (SELECT dispositivo_id FROM mesas WHERE id = mesa_id)
);
