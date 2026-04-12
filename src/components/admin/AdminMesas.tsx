import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Mesa } from '@/types/database';
import { toast } from 'sonner';
import { Monitor, Trash2, Link, Unlink } from 'lucide-react';

export function AdminMesas() {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMesaNumero, setNewMesaNumero] = useState('');
  const [newMesaDeviceId, setNewMesaDeviceId] = useState('');
  const [deviceInputs, setDeviceInputs] = useState<Record<string, string>>({});

  useEffect(() => { loadMesas(); }, []);

  async function loadMesas() {
    setLoading(true);
    const { data, error } = await supabase.from('mesas').select('*').order('numero');
    
    if (error) {
      toast.error('Error al cargar las mesas: ' + error.message);
      setMesas([]);
    } else if (data) {
      setMesas(data);
      const inputs: Record<string, string> = {};
      data.forEach(m => { inputs[m.id] = m.dispositivo_id || ''; });
      setDeviceInputs(inputs);
    }
    setLoading(false);
  }

  async function addMesa() {
    const num = parseInt(newMesaNumero);
    if (!num || num <= 0) { toast.error('Número de mesa inválido'); return; }
    if (mesas.some(m => m.numero === num)) { toast.error('Ya existe esa mesa'); return; }

    const deviceId = newMesaDeviceId.trim();

    const { error } = await supabase.from('mesas').insert({ numero: num, activa: true, dispositivo_id: deviceId || null });

    if (error) {
      toast.error('Error al crear la mesa: ' + error.message);
    } else {
      setNewMesaNumero('');
      setNewMesaDeviceId('');
      toast.success(`Mesa ${num} creada` + (deviceId ? ' y vinculada.' : '.'));
      loadMesas();
    }
  }

  async function assignDevice(mesaId: string) {
    const deviceId = (deviceInputs[mesaId] || '').trim();
    const { error } = await supabase.from('mesas').update({ dispositivo_id: deviceId || null }).eq('id', mesaId);
    
    if (error) {
      toast.error('Error al vincular: ' + error.message);
    } else {
      toast.success(deviceId ? 'Dispositivo vinculado' : 'Dispositivo desvinculado');
      loadMesas();
    }
  }

  async function unlinkDevice(mesaId: string) {
    const { error } = await supabase.from('mesas').update({ dispositivo_id: null }).eq('id', mesaId);
    if (error) {
      toast.error('Error al desvincular: ' + error.message);
    } else {
      toast.success('Dispositivo desvinculado');
      loadMesas();
    }
  }

  async function toggleMesa(mesa: Mesa) {
    const { error } = await supabase.from('mesas').update({ activa: !mesa.activa }).eq('id', mesa.id);
    if (error) toast.error('Error al cambiar estado: ' + error.message);
    else loadMesas();
  }

  async function deleteMesa(id: string) {
    if (!confirm('¿Eliminar esta mesa?')) return;
    const { error } = await supabase.from('mesas').delete().eq('id', id);
    if (error) {
      toast.error('Error al eliminar: ' + error.message);
    } else {
      toast.success('Mesa eliminada');
      loadMesas();
    }
  }

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <h2 className="text-xl sm:text-2xl font-bold text-foreground">Gestión de Mesas</h2>

      {/* Instructions */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-sm text-foreground">
        <p className="font-semibold mb-1">¿Cómo vincular un dispositivo?</p>
        <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
          <li>Abre <code className="bg-secondary px-1 rounded">/mesa</code> en la tablet del cliente.</li>
          <li>Copia el <strong>ID del Dispositivo</strong> que aparece en pantalla.</li>
          <li>Pégalo en el campo "ID de dispositivo" al añadir una mesa, o en una mesa ya existente.</li>
          <li>Pulsa el botón <strong>Añadir Mesa</strong> o <strong>Vincular</strong>.</li>
        </ol>
      </div>

      {/* Add Mesa */}
      <div className="bg-card rounded-lg border p-4 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground">Número de Mesa <span className="text-muted-foreground font-normal">(obligatorio)</span></label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={newMesaNumero}
              onChange={e => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                setNewMesaNumero(val);
              }}
              onPaste={e => {
                const pasted = e.clipboardData.getData('text');
                if (pasted.includes('-') || /[a-zA-Z]/.test(pasted)) {
                  e.preventDefault();
                  toast.error('Estás pegando un ID de dispositivo en el campo de número de mesa. Pégalo en el campo de ID, a la derecha.', { duration: 8000 });
                  setNewMesaDeviceId(pasted);
                }
              }}
              placeholder="Ej: 1"
              className="mt-1 w-full border rounded-lg px-3 py-2 bg-background text-foreground"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">ID de Dispositivo <span className="text-muted-foreground font-normal">(opcional)</span></label>
            <input
              type="text"
              value={newMesaDeviceId}
              onChange={e => setNewMesaDeviceId(e.target.value)}
              placeholder="Pegar ID aquí..."
              className="mt-1 w-full border rounded-lg px-3 py-2 bg-background text-foreground font-mono"
            />
          </div>
        </div>
        <button onClick={addMesa} className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium touch-target whitespace-nowrap">
          Añadir Mesa
        </button>
      </div>

      {/* Mesas List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                <Monitor className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">
                  {mesa.dispositivo_id ? `Vinculado: ${mesa.dispositivo_id.slice(0, 12)}...` : 'Sin dispositivo'}
                </span>
                {mesa.dispositivo_id && (
                  <button onClick={() => unlinkDevice(mesa.id)} className="ml-auto text-destructive hover:opacity-70 flex-shrink-0" title="Desvincular">
                    <Unlink className="w-4 h-4" />
                  </button>
                )}
              </div>

              <label className="text-xs font-medium text-muted-foreground">ID de dispositivo (pegar UUID aquí)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ej: 0c931ba7-3fbe-4984-..."
                  value={deviceInputs[mesa.id] || ''}
                  onChange={e => setDeviceInputs(prev => ({ ...prev, [mesa.id]: e.target.value }))}
                  className="flex-1 border rounded-md px-3 py-2 text-sm bg-background text-foreground font-mono min-w-0"
                />
                <button
                  onClick={() => assignDevice(mesa.id)}
                  className="bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm font-medium touch-target flex items-center gap-1 flex-shrink-0"
                >
                  <Link className="w-4 h-4" />
                  <span className="hidden sm:inline">Vincular</span>
                </button>
              </div>
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
