import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types/database';

export function AdminUsers() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('cocina');
  const [loading, setLoading] = useState(false);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.functions.invoke('create-user', {
      body: { email, password, role },
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Usuario creado con éxito.');
      setEmail('');
      setPassword('');
    }

    setLoading(false);
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-foreground">Gestión de Usuarios</h2>
        <p className="text-muted-foreground">Crear nuevos usuarios y asignar roles.</p>
      </header>

      <div className="max-w-lg">
        <form onSubmit={handleCreateUser} className="bg-card p-6 rounded-lg border space-y-4">
          <h3 className="text-lg font-semibold">Crear Nuevo Usuario</h3>
          <div>
            <label className="text-sm font-medium text-foreground">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="mt-1 w-full bg-background border rounded-lg px-4 py-3 text-foreground"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="mt-1 w-full bg-background border rounded-lg px-4 py-3 text-foreground"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Rol</label>
            <select value={role} onChange={e => setRole(e.target.value as UserRole)} className="mt-1 w-full bg-background border rounded-lg px-4 py-3 text-foreground">
              <option value="cocina">Cocina</option>
              <option value="mesa">Mesa</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground rounded-lg py-3 font-bold hover:opacity-90 disabled:opacity-50 transition-opacity">
            {loading ? 'Creando...' : 'Crear Usuario'}
          </button>
        </form>
      </div>
    </div>
  );
}