import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase, supabaseKey, supabaseUrl } from '@/integrations/supabase/client';
import { UserRole } from '@/types/database';
import { Trash2 } from 'lucide-react';

interface ManagedUser {
  id: string;
  email?: string;
  role: UserRole | 'sin_rol';
  created_at: string;
}

export function AdminUsers() {
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('cocina');
  const [createLoading, setCreateLoading] = useState(false);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [editLoading, setEditLoading] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    setListLoading(true);
    const { data, error } = await supabase.functions.invoke<ManagedUser[]>('list-users');
    if (error) {
      toast.error(`Error al cargar usuarios: ${error.message}`);
    } else if (data) {
      setUsers(data.filter((user) => Boolean(user.email?.trim())));
    }
    setListLoading(false);
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      const { error } = await supabase.functions.invoke('create-user', {
        body: { email: newEmail, password: newPassword, role: newRole },
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Usuario creado con éxito.');
        setNewEmail('');
        setNewPassword('');
        await loadUsers();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado.';
      toast.error(`Error al crear usuario: ${message}`);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdateRole = async (userId: string, role: UserRole) => {
    setEditLoading(userId);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const { error } = await supabase.functions.invoke('update-user-role', {
        body: { userId, newRole: role },
      });
      if (error) {
        toast.error(`Error al actualizar rol: ${error.message}`);
      } else {
        toast.success('Rol actualizado.');
        setUsers(prev => prev.map(u => (u.id === userId ? { ...u, role } : u)));
        if (currentUser && currentUser.id === userId) {
          await supabase.auth.refreshSession();
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado.';
      toast.error(`Error: ${message}`);
    } finally {
      setEditLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string, email?: string) => {
    if (!confirm(`¿Eliminar permanentemente al usuario ${email || userId}?`)) return;
    setDeleteLoading(userId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error('Tu sesión ha expirado. Vuelve a iniciar sesión.');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/delete-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          apikey: supabaseKey,
        },
        body: JSON.stringify({ userId }),
      });

      const rawResponse = await response.text();
      const parsedResponse = rawResponse ? JSON.parse(rawResponse) : null;

      if (!response.ok) {
        throw new Error(parsedResponse?.error || parsedResponse?.message || `Error ${response.status}`);
      }

      toast.success('Usuario eliminado.');
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado.';
      toast.error(`Error: ${message}`);
    } finally {
      setDeleteLoading(null);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8">
      <header>
        <h2 className="text-2xl font-bold text-foreground">Gestión de Usuarios</h2>
        <p className="text-muted-foreground">Crear nuevos usuarios y gestionar sus roles.</p>
      </header>

      {/* Create User Form */}
      <div className="max-w-lg">
        <form onSubmit={handleCreateUser} className="bg-card p-6 rounded-lg border space-y-4">
          <h3 className="text-lg font-semibold">Crear Nuevo Usuario</h3>
          <div>
            <label className="text-sm font-medium text-foreground">Email</label>
            <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="mt-1 w-full bg-background border rounded-lg px-4 py-3 text-foreground" required />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Contraseña</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="mt-1 w-full bg-background border rounded-lg px-4 py-3 text-foreground" required />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Rol</label>
            <select value={newRole} onChange={e => setNewRole(e.target.value as UserRole)} className="mt-1 w-full bg-background border rounded-lg px-4 py-3 text-foreground">
              <option value="cocina">Cocina</option>
              <option value="mesa">Mesa</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <button type="submit" disabled={createLoading} className="w-full bg-primary text-primary-foreground rounded-lg py-3 font-bold hover:opacity-90 disabled:opacity-50 transition-opacity">
            {createLoading ? 'Creando...' : 'Crear Usuario'}
          </button>
        </form>
      </div>

      {/* User List */}
      <div className="bg-card p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">Usuarios Existentes</h3>
        {listLoading ? (
          <p className="text-muted-foreground">Cargando usuarios...</p>
        ) : users.length === 0 ? (
          <p className="text-muted-foreground">No hay usuarios registrados.</p>
        ) : (
          <div className="space-y-2">
            {users.map(user => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg flex-wrap gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{user.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Creado: {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={user.role === 'sin_rol' ? '' : user.role}
                    onChange={e => handleUpdateRole(user.id, e.target.value as UserRole)}
                    disabled={editLoading === user.id}
                    className={`bg-background border rounded-lg px-3 py-2 text-sm ${user.role === 'sin_rol' ? 'border-destructive text-destructive' : ''}`}
                  >
                    {user.role === 'sin_rol' && <option value="" disabled>Asignar un rol...</option>}
                    <option value="admin">Administrador</option>
                    <option value="cocina">Cocina</option>
                    <option value="mesa">Mesa</option>
                  </select>
                  {editLoading === user.id && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />}
                  <button
                    onClick={() => handleDeleteUser(user.id, user.email)}
                    disabled={deleteLoading === user.id}
                    className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
                    title="Eliminar usuario"
                  >
                    {deleteLoading === user.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-destructive" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
