import type { Categoria } from '@/types/database';

interface Props {
  categorias: Categoria[];
  activeCategory: string | null;
  onSelect: (id: string) => void;
}

export function CategoryTabs({ categorias, activeCategory, onSelect }: Props) {
  return (
    <div className="flex gap-2 px-4 py-3 overflow-x-auto border-b bg-card">
      {categorias.map(cat => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={`touch-target px-6 py-3 rounded-lg font-semibold text-base whitespace-nowrap transition-colors ${
            activeCategory === cat.id
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-muted'
          }`}
        >
          {cat.nombre}
        </button>
      ))}
    </div>
  );
}
