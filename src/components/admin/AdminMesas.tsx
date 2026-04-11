import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Mesa } from '@/types/database';
import { toast } from 'sonner';
import { Monitor, Save, Trash2 } from 'lucide-react';

export function AdminMesas() {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMesaNumero, setNewMesaNumero] = useState('');

  useEffect(() => { loadMesas(); }, []);

  async function loadMesas() {
    const { data } = await supabase.from('mesas').select('*').order('numero');
    if (data) setMesas(data);
    setLoading(false);
  }

  async function addMesa() {
    const num = parseInt(newMesaNumero);
    if (!num || num <= 0) { toast.error('Número de mesa inválido'); return; }
    if (mesas.some(m => m.numero === num)) { toast.error('Ya existe esa mesa'); return; }

    await supabase.from('mesas').insert({ numero: num, activa: true });
    setNewMesaNumero('');
    toast.success(`Mesa ${num} creada`);
    loadMesas();
  }

  async function assignDevice(mesaId: string, deviceId: string) {
    await supabase.from('mesas').update({ dispositivo_id: deviceId || null }).eq('id', mesaId);
    toast.success('Dispositivo asignado');
    loadMesas();
  }

  async function toggleMesa(mesa: Mesa) {
    await supabase.from('mesas').update({ activa: !mesa.activa }).eq('id', mesa.id);
    loadMesas();
  }

  async function deleteMesa(id: string) {
    await supabase.from('mesas').delete().eq('id', id);
    toast.success('Mesa eliminada');
    loadMesas();
  }

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Gestión de Mesas</h2>

      {/* Add Mesa */}
      <div className="bg-card rounded-lg border p-4 flex items-end gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium">Número de Mesa</label>
          <input
            type="number"
            value={newMesaNumero}
            onChange={e => setNewMesaNumero(e.target.value)}
            placeholder="Ej: 1"
            className="mt-1 w-full border rounded-lg px-3 py-2 bg-background"
          />
        </div>
        <button onClick={addMesa} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium touch-target">
          Añadir Mesa
        </button>
      </div>

      {/* Mesas List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mesas.map(mesa => (
          <div key={mesa.id} className={`bg-card rounded-lg border p-4 ${!mesa.activa ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-bold text-foreground">Mesa {mesa.numero}</h3>
              <div className="flex gap-1">
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
                <Monitor className="w-4 h-4" />
                <span>{mesa.dispositivo_id ? `ID: ${mesa.dispositivo_id.slice(0, 8)}...` : 'Sin dispositivo'}</span>
              </div>
              <input
                type="text"
                placeholder="ID de dispositivo"
                defaultValue={mesa.dispositivo_id || ''}
                onBlur={e => assignDevice(mesa.id, e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              />
            </div>
          </div>
        ))}
      </div>

      {mesas.length === 0 && (
        <p className="text-center text-muted-foreground py-8">No hay mesas configuradas</p>
      )}
    </div>
  );
}
