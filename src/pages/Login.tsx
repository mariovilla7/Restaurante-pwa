import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError || !signInData.user) {
      setLoading(false);
      toast.error('Credenciales incorrectas');
      return;
    }

    setLoading(false);

    const userRole = signInData.user.app_metadata?.role;

    if (userRole === 'admin') {
      navigate('/admin');
    } else if (userRole === 'cocina') {
      navigate('/cocina');
    } else if (userRole) {
      navigate('/mesa');
    } else {
      toast.error('No tienes un rol asignado. Contacta al administrador.');
      // --- PASO DE DEPURACIÓN ---
      // Mostramos en la consola del navegador qué información del usuario estamos recibiendo.
      // Así podemos ver si el rol realmente no está llegando.
      console.log('DEBUG: Datos del usuario al fallar el login por rol:', signInData.user);
      // --- FIN DEL PASO DE DEPURACIÓN ---
      await supabase.auth.signOut();
    }
  }

  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <form onSubmit={handleLogin} className="bg-card p-8 rounded-xl shadow-lg border w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Acceso Personal</h1>
          <p className="text-muted-foreground mt-1">Ingresa tus credenciales</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="mt-1 w-full bg-background border rounded-lg px-4 py-3 text-foreground touch-target"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="mt-1 w-full bg-background border rounded-lg px-4 py-3 text-foreground touch-target"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="touch-target w-full bg-primary text-primary-foreground rounded-lg py-4 text-lg font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
