-- ================================================
-- SQL PARA EJECUTAR EN TU SUPABASE DASHBOARD
-- SQL Editor → New Query → Pegar y ejecutar
-- ================================================

-- 1. Enum para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'cocina', 'mesa');

-- 2. Tabla de roles de usuario
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Función para verificar roles (evita recursión RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4. Tabla de categorías
CREATE TABLE public.categorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    orden INTEGER DEFAULT 0,
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

-- 5. Tabla de platos
CREATE TABLE public.platos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    categoria_id UUID REFERENCES public.categorias(id) ON DELETE CASCADE NOT NULL,
    nombre TEXT NOT NULL,
    descripcion TEXT DEFAULT '',
    precio NUMERIC(10,2) NOT NULL,
    imagen_url TEXT,
    disponible BOOLEAN DEFAULT true,
    orden INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.platos ENABLE ROW LEVEL SECURITY;

-- 6. Tabla de mesas
CREATE TABLE public.mesas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero INTEGER NOT NULL UNIQUE,
    dispositivo_id TEXT,
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.mesas ENABLE ROW LEVEL SECURITY;

-- 7. Tabla de pedidos
CREATE TABLE public.pedidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mesa_id UUID REFERENCES public.mesas(id) NOT NULL,
    estado TEXT DEFAULT 'en_espera' CHECK (estado IN ('en_espera', 'preparando', 'listo', 'servido')),
    total NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

-- 8. Tabla de items de pedido
CREATE TABLE public.pedido_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID REFERENCES public.pedidos(id) ON DELETE CASCADE NOT NULL,
    plato_id UUID REFERENCES public.platos(id) NOT NULL,
    cantidad INTEGER DEFAULT 1,
    notas TEXT,
    estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_cocina', 'listo')),
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.pedido_items ENABLE ROW LEVEL SECURITY;

-- 9. Tabla de notificaciones
CREATE TABLE public.notificaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mesa_id UUID REFERENCES public.mesas(id) NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('camarero', 'cuenta')),
    atendida BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

-- ================================================
-- RLS POLICIES
-- ================================================

-- Categorías: lectura pública, escritura admin
CREATE POLICY "Categorias read" ON public.categorias FOR SELECT USING (true);
CREATE POLICY "Categorias admin" ON public.categorias FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Platos: lectura pública, escritura admin
CREATE POLICY "Platos read" ON public.platos FOR SELECT USING (true);
CREATE POLICY "Platos admin" ON public.platos FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Mesas: lectura pública, escritura admin
CREATE POLICY "Mesas read" ON public.mesas FOR SELECT USING (true);
CREATE POLICY "Mesas admin" ON public.mesas FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Pedidos: lectura/escritura pública (los clientes crean pedidos sin auth)
CREATE POLICY "Pedidos read" ON public.pedidos FOR SELECT USING (true);
CREATE POLICY "Pedidos insert" ON public.pedidos FOR INSERT WITH CHECK (true);
CREATE POLICY "Pedidos update" ON public.pedidos FOR UPDATE USING (true);

-- Pedido Items: lectura/escritura pública
CREATE POLICY "PedidoItems read" ON public.pedido_items FOR SELECT USING (true);
CREATE POLICY "PedidoItems insert" ON public.pedido_items FOR INSERT WITH CHECK (true);
CREATE POLICY "PedidoItems update" ON public.pedido_items FOR UPDATE USING (true);

-- Notificaciones: lectura/escritura pública
CREATE POLICY "Notificaciones read" ON public.notificaciones FOR SELECT USING (true);
CREATE POLICY "Notificaciones insert" ON public.notificaciones FOR INSERT WITH CHECK (true);
CREATE POLICY "Notificaciones update" ON public.notificaciones FOR UPDATE USING (true);

-- User roles: solo admin puede ver
CREATE POLICY "Roles self read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Roles admin" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ================================================
-- STORAGE BUCKET
-- ================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('menu-images', 'menu-images', true);

CREATE POLICY "Menu images public read" ON storage.objects FOR SELECT USING (bucket_id = 'menu-images');
CREATE POLICY "Menu images auth upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'menu-images');
CREATE POLICY "Menu images auth update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'menu-images');
CREATE POLICY "Menu images auth delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'menu-images');

-- ================================================
-- REALTIME
-- Habilitar desde Dashboard > Database > Replication
-- Activar en tablas: pedidos, pedido_items, notificaciones
-- ================================================
