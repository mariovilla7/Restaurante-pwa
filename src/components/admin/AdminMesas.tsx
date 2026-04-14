import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Mesa } from '@/types/database';
import { toast } from 'sonner';
import { Trash2, QrCode, Copy, XCircle } from 'lucide-react';

export function AdminMesas() {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMesaNumero, setNewMesaNumero] = useState('');

  useEffect(() => { loadMesas(); }, []);

  async function loadMesas() {
    setLoading(true);
    const { data, error } = await supabase.from('mesas').select('*').order('numero');
    if (error) toast.error('Error al cargar las mesas: ' + error.message);
    else if (data) setMesas(data);
    setLoading(false);
  }

  async function addMesa() {
    const num = parseInt(newMesaNumero);
    if (!num || num <= 0) { toast.error('Número de mesa inválido'); return; }
    if (mesas.some(m => m.numero === num)) { toast.error('Ya existe esa mesa'); return; }

    const { data: newMesa, error } = await supabase
      .from('mesas')
      .insert({ numero: num, activa: true })
      .select()
      .single();

    if (error) {
      toast.error('Error al crear la mesa: ' + error.message);
    } else if (newMesa) {
      setNewMesaNumero('');
      toast.success(`Mesa ${num} creada`);
      setMesas(prev => [...prev, newMesa].sort((a, b) => a.numero - b.numero));
    }
  }

  function getQrUrl(mesaId: string) {
    return `${window.location.origin}/validar-mesa/${mesaId}`;
  }

  function copyUrl(mesaId: string) {
    navigator.clipboard.writeText(getQrUrl(mesaId));
    toast.success('URL copiada. Genera un QR con esta URL.');
  }

  async function toggleMesa(mesa: Mesa) {
    const { error } = await supabase.from('mesas').update({ activa: !mesa.activa }).eq('id', mesa.id);
    if (error) toast.error('Error: ' + error.message);
    else loadMesas();
  }

  async function deleteMesa(id: string) {
    if (!confirm('¿Seguro que quieres eliminar esta mesa?')) return;
    const { error } = await supabase.from('mesas').delete().eq('id', id);
    if (error) {
      if (error.code === '23503') {
        toast.error('No se puede eliminar: tiene pedidos asociados. Márcala como inactiva.', { duration: 8000 });
      } else {
        toast.error('Error: ' + error.message);
      }
    } else {
      toast.success('Mesa eliminada');
      setMesas(prev => prev.filter(m => m.id !== id));
    }
  }

  async function cerrarMesa(mesa: Mesa) {
    if (!confirm(`¿Cerrar Mesa ${mesa.numero}? Se vaciará el carrito y se archivarán los pedidos como "pagado".`)) return;

    const [cartRes, pedidoRes] = await Promise.all([
      supabase.from('carrito_items').delete().eq('mesa_id', mesa.id),
      supabase.from('pedidos').update({ estado: 'pagado' }).eq('mesa_id', mesa.id).neq('estado', 'pagado'),
    ]);

    if (cartRes.error) toast.error('Error limpiando carrito: ' + cartRes.error.message);
    if (pedidoRes.error) toast.error('Error archivando pedidos: ' + pedidoRes.error.message);

    if (!cartRes.error && !pedidoRes.error) {
      toast.success(`Mesa ${mesa.numero} cerrada. Carrito y pedidos archivados.`);
    }
  }

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <h2 className="text-xl sm:text-2xl font-bold text-foreground">Gestión de Mesas</h2>

      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-sm text-foreground">
        <p className="font-semibold mb-1">Sistema de QR Seguro</p>
        <p className="text-muted-foreground">
          Cada mesa tiene una URL segura con su UUID (no el número). El QR apunta a <code>/validar-mesa/UUID</code>. 
          Al escanearlo, se valida que la mesa existe y está activa, se crea una sesión temporal de 3h y se redirige al menú.
        </p>
      </div>

      {/* Add mesa form */}
      <div className="bg-card rounded-lg border p-4 space-y-4">
        <h3 className="font-semibold text-lg">Añadir Nueva Mesa</h3>
        <div className="flex gap-3">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={newMesaNumero}
            onChange={e => setNewMesaNumero(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="Número de mesa (ej: 1)"
            className="flex-1 border rounded-lg px-3 py-2 bg-background text-foreground"
          />
          <button onClick={addMesa} className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium touch-target">
            Añadir
          </button>
        </div>
      </div>

      {/* Mesas grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {mesas.map(mesa => (
          <div key={mesa.id} className={`bg-card rounded-lg border p-4 ${!mesa.activa ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-bold text-foreground">Mesa {mesa.numero}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleMesa(mesa)}
                  className={`text-xs px-2 py-1 rounded-full ${mesa.activa ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}
                >
                  {mesa.activa ? 'Activa' : 'Inactiva'}
                </button>
                <button onClick={() => deleteMesa(mesa.id)} className="p-1 text-destructive hover:opacity-70">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <QrCode className="w-4 h-4 flex-shrink-0" />
                <code className="text-xs truncate flex-1">/validar-mesa/{mesa.id.slice(0, 8)}...</code>
                <button
                  onClick={() => copyUrl(mesa.id)}
                  className="text-primary hover:opacity-70 flex-shrink-0"
                  title="Copiar URL para QR"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>

              {mesa.activa && (
                <button
                  onClick={() => cerrarMesa(mesa)}
                  className="w-full mt-2 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg px-3 py-2 text-sm font-medium hover:bg-destructive/20 transition-colors flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Cobrar y Liberar Mesa
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {mesas.length === 0 && !loading && (
        <p className="text-center text-muted-foreground py-8">No hay mesas configuradas. Añade una arriba.</p>
      )}
    </div>
  );
}
