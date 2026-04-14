export type OrderStatus = 'en_espera' | 'preparando' | 'listo' | 'servido' | 'pagado';
export type OrderItemStatus = 'pendiente' | 'en_cocina' | 'listo';
export type NotificationType = 'camarero' | 'cuenta';
export type UserRole = 'admin' | 'cocina' | 'mesa';

export interface Categoria {
  id: string;
  nombre: string;
  orden: number;
  activa: boolean;
  created_at: string;
}

export interface Plato {
  id: string;
  categoria_id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  imagen_url: string | null;
  disponible: boolean;
  orden: number;
  created_at: string;
}

export interface Mesa {
  id: string;
  numero: number;
  dispositivo_id: string | null;
  activa: boolean;
  created_at: string;
}

export interface Pedido {
  id: string;
  mesa_id: string;
  estado: OrderStatus;
  total: number;
  created_at: string;
  mesa?: Mesa;
}

export interface PedidoItem {
  id: string;
  pedido_id: string;
  plato_id: string;
  cantidad: number;
  notas: string | null;
  estado: OrderItemStatus;
  created_at: string;
  plato?: Plato;
}

export interface Notificacion {
  id: string;
  mesa_id: string;
  tipo: NotificationType;
  atendida: boolean;
  created_at: string;
  mesa?: Mesa;
}

export interface CartItem {
  plato: Plato;
  cantidad: number;
  notas: string;
}

export interface DeviceConfig {
  deviceId: string;
  mesaId: string | null;
  mesaNumero: number | null;
}
