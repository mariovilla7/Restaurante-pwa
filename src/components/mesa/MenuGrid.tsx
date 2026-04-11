import type { Plato } from '@/types/database';
import { Plus } from 'lucide-react';

interface Props {
  platos: Plato[];
  onAddToCart: (plato: Plato) => void;
}

export function MenuGrid({ platos, onAddToCart }: Props) {
  if (platos.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-lg">
        No hay platos disponibles en esta categoría
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {platos.map(plato => (
        <div
          key={plato.id}
          className="bg-card rounded-lg overflow-hidden shadow-sm border hover:shadow-md transition-shadow"
        >
          <div className="aspect-[4/3] bg-muted overflow-hidden">
            {plato.imagen_url ? (
              <img
                src={plato.imagen_url}
                alt={plato.nombre}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl">
                🍽️
              </div>
            )}
          </div>
          <div className="p-3">
            <h3 className="font-semibold text-foreground text-base truncate">{plato.nombre}</h3>
            {plato.descripcion && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{plato.descripcion}</p>
            )}
            <div className="flex items-center justify-between mt-3">
              <span className="text-lg font-bold text-primary">{plato.precio.toFixed(2)} €</span>
              <button
                onClick={() => onAddToCart(plato)}
                className="touch-target bg-primary text-primary-foreground rounded-full w-10 h-10 flex items-center justify-center hover:opacity-90 transition-opacity"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
