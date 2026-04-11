import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Categoria, Plato } from '@/types/database';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Save, X, Upload, GripVertical } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function AdminMenu() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [platos, setPlatos] = useState<Plato[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlato, setEditingPlato] = useState<Partial<Plato> | null>(null);
  const [editingCategoria, setEditingCategoria] = useState<Partial<Categoria> | null>(null);
  const [originalPlato, setOriginalPlato] = useState<Partial<Plato> | null>(null);
  const [platoDialogOpen, setPlatoDialogOpen] = useState(false);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [catRes, platRes] = await Promise.all([
      supabase.from('categorias').select('*').order('orden'),
      supabase.from('platos').select('*').order('orden'),
    ]);
    if (catRes.data) {
      setCategorias(catRes.data);
      if (!activeCategory && catRes.data.length > 0) setActiveCategory(catRes.data[0].id);
    }
    if (platRes.data) setPlatos(platRes.data);
    setLoading(false);
  }

  // Category CRUD
  function openNewCategoria() {
    setEditingCategoria({ nombre: '', orden: categorias.length, activa: true });
    setCatDialogOpen(true);
  }

  function openEditCategoria(cat: Categoria) {
    setEditingCategoria({ ...cat });
    setCatDialogOpen(true);
  }

  async function saveCategoria() {
    if (!editingCategoria?.nombre) { toast.error('Nombre requerido'); return; }
    if (editingCategoria.id) {
      await supabase.from('categorias').update({
        nombre: editingCategoria.nombre,
        orden: editingCategoria.orden,
        activa: editingCategoria.activa,
      }).eq('id', editingCategoria.id);
    } else {
      await supabase.from('categorias').insert({
        nombre: editingCategoria.nombre,
        orden: editingCategoria.orden ?? 0,
        activa: editingCategoria.activa ?? true,
      });
    }
    setCatDialogOpen(false);
    setEditingCategoria(null);
    toast.success('Categoría guardada');
    loadData();
  }

  async function deleteCategoria(id: string) {
    await supabase.from('categorias').delete().eq('id', id);
    toast.success('Categoría eliminada');
    loadData();
  }

  // Plato CRUD
  function openNewPlato() {
    const newPlato: Partial<Plato> = {
      nombre: '', descripcion: '', precio: 0, categoria_id: activeCategory || '',
      disponible: true, orden: platos.length, imagen_url: null,
    };
    setEditingPlato(newPlato);
    setOriginalPlato(newPlato);
    setImageFile(null);
    setPlatoDialogOpen(true);
  }

  function openEditPlato(plato: Plato) {
    setEditingPlato({ ...plato });
    setOriginalPlato({ ...plato });
    setImageFile(null);
    setPlatoDialogOpen(true);
  }

  function hasChanges(): boolean {
    if (!editingPlato || !originalPlato) return false;
    return JSON.stringify(editingPlato) !== JSON.stringify(originalPlato) || !!imageFile;
  }

  function handleClosePlatoDialog(open: boolean) {
    if (!open && hasChanges()) {
      if (!confirm('Hay cambios sin guardar. ¿Deseas salir?')) return;
    }
    setPlatoDialogOpen(open);
    if (!open) { setEditingPlato(null); setOriginalPlato(null); setImageFile(null); }
  }

  async function savePlato() {
    if (!editingPlato?.nombre) { toast.error('Nombre requerido'); return; }
    if (!editingPlato.precio || editingPlato.precio <= 0) { toast.error('Precio debe ser mayor a 0'); return; }
    if (!editingPlato.categoria_id) { toast.error('Selecciona una categoría'); return; }

    let imageUrl = editingPlato.imagen_url;

    // Upload image if provided
    if (imageFile) {
      const ext = imageFile.name.split('.').pop();
      const path = `platos/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('menu-images')
        .upload(path, imageFile, { cacheControl: '3600', upsert: true });

      if (uploadError) {
        toast.error('Error al subir imagen');
        return;
      }

      const { data: urlData } = supabase.storage.from('menu-images').getPublicUrl(path);
      imageUrl = urlData.publicUrl;
    }

    const platoData = {
      nombre: editingPlato.nombre,
      descripcion: editingPlato.descripcion || '',
      precio: editingPlato.precio,
      categoria_id: editingPlato.categoria_id,
      disponible: editingPlato.disponible ?? true,
      orden: editingPlato.orden ?? 0,
      imagen_url: imageUrl,
    };

    if (editingPlato.id) {
      await supabase.from('platos').update(platoData).eq('id', editingPlato.id);
    } else {
      await supabase.from('platos').insert(platoData);
    }

    setPlatoDialogOpen(false);
    setEditingPlato(null);
    setOriginalPlato(null);
    setImageFile(null);
    toast.success('Plato guardado');
    loadData();
  }

  async function deletePlato(id: string) {
    await supabase.from('platos').delete().eq('id', id);
    toast.success('Plato eliminado');
    loadData();
  }

  const filteredPlatos = platos.filter(p => p.categoria_id === activeCategory);

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Gestión del Menú</h2>
      </div>

      {/* Categories Section */}
      <div className="bg-card rounded-lg border p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground">Categorías</h3>
          <button onClick={openNewCategoria} className="flex items-center gap-1 text-sm bg-primary text-primary-foreground px-3 py-2 rounded-md">
            <Plus className="w-4 h-4" /> Nueva
          </button>
        </div>
        <div className="flex gap-2 flex-wrap">
          {categorias.map(cat => (
            <div key={cat.id} className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
              activeCategory === cat.id ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-muted'
            }`}>
              <button onClick={() => setActiveCategory(cat.id)} className="font-medium">
                {cat.nombre}
              </button>
              <button onClick={() => openEditCategoria(cat)} className="opacity-60 hover:opacity-100">
                <Pencil className="w-3 h-3" />
              </button>
              <button onClick={() => deleteCategoria(cat.id)} className="opacity-60 hover:opacity-100 text-destructive">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Platos Section */}
      <div className="bg-card rounded-lg border p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Platos</h3>
          <button onClick={openNewPlato} className="flex items-center gap-1 text-sm bg-primary text-primary-foreground px-3 py-2 rounded-md">
            <Plus className="w-4 h-4" /> Nuevo Plato
          </button>
        </div>
        <div className="space-y-2">
          {filteredPlatos.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No hay platos en esta categoría</p>
          ) : (
            filteredPlatos.map(plato => (
              <div key={plato.id} className="flex items-center gap-4 p-3 bg-secondary rounded-lg">
                <div className="w-16 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
                  {plato.imagen_url ? (
                    <img src={plato.imagen_url} alt={plato.nombre} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-foreground truncate">{plato.nombre}</h4>
                  <p className="text-sm text-muted-foreground truncate">{plato.descripcion}</p>
                </div>
                <span className="font-bold text-primary">{plato.precio.toFixed(2)} €</span>
                <span className={`text-xs px-2 py-1 rounded-full ${plato.disponible ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                  {plato.disponible ? 'Disponible' : 'No disponible'}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => openEditPlato(plato)} className="p-2 hover:bg-muted rounded-md">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => deletePlato(plato.id)} className="p-2 hover:bg-destructive/10 rounded-md text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Category Dialog */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategoria?.id ? 'Editar' : 'Nueva'} Categoría</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nombre</label>
              <input
                value={editingCategoria?.nombre || ''}
                onChange={e => setEditingCategoria(prev => prev ? { ...prev, nombre: e.target.value } : null)}
                className="mt-1 w-full border rounded-lg px-3 py-2 bg-background"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={editingCategoria?.activa ?? true}
                onChange={e => setEditingCategoria(prev => prev ? { ...prev, activa: e.target.checked } : null)}
              />
              <label className="text-sm">Activa</label>
            </div>
            <button onClick={saveCategoria} className="w-full bg-primary text-primary-foreground rounded-lg py-3 font-semibold">
              <Save className="w-4 h-4 inline mr-1" /> Guardar
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Plato Dialog */}
      <Dialog open={platoDialogOpen} onOpenChange={handleClosePlatoDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPlato?.id ? 'Editar' : 'Nuevo'} Plato</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div>
              <label className="text-sm font-medium">Nombre *</label>
              <input
                value={editingPlato?.nombre || ''}
                onChange={e => setEditingPlato(prev => prev ? { ...prev, nombre: e.target.value } : null)}
                className="mt-1 w-full border rounded-lg px-3 py-2 bg-background"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Descripción</label>
              <textarea
                value={editingPlato?.descripcion || ''}
                onChange={e => setEditingPlato(prev => prev ? { ...prev, descripcion: e.target.value } : null)}
                className="mt-1 w-full border rounded-lg px-3 py-2 bg-background"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Precio (€) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingPlato?.precio || ''}
                  onChange={e => setEditingPlato(prev => prev ? { ...prev, precio: parseFloat(e.target.value) || 0 } : null)}
                  className="mt-1 w-full border rounded-lg px-3 py-2 bg-background"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Categoría *</label>
                <select
                  value={editingPlato?.categoria_id || ''}
                  onChange={e => setEditingPlato(prev => prev ? { ...prev, categoria_id: e.target.value } : null)}
                  className="mt-1 w-full border rounded-lg px-3 py-2 bg-background"
                >
                  {categorias.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Imagen</label>
              <div className="mt-1 flex items-center gap-3">
                {(editingPlato?.imagen_url || imageFile) && (
                  <div className="w-20 h-20 rounded-md overflow-hidden bg-muted">
                    <img
                      src={imageFile ? URL.createObjectURL(imageFile) : editingPlato?.imagen_url || ''}
                      alt="preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <label className="cursor-pointer flex items-center gap-2 bg-secondary px-4 py-2 rounded-lg text-sm font-medium">
                  <Upload className="w-4 h-4" /> Subir imagen
                  <input type="file" accept="image/*" className="hidden" onChange={e => {
                    if (e.target.files?.[0]) setImageFile(e.target.files[0]);
                  }} />
                </label>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={editingPlato?.disponible ?? true}
                onChange={e => setEditingPlato(prev => prev ? { ...prev, disponible: e.target.checked } : null)}
              />
              <label className="text-sm">Disponible</label>
            </div>
            <button onClick={savePlato} className="w-full bg-primary text-primary-foreground rounded-lg py-3 font-semibold">
              <Save className="w-4 h-4 inline mr-1" /> Guardar Plato
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
