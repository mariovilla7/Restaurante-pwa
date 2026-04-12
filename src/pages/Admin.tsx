import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { AdminMenu } from '@/components/admin/AdminMenu';
import { AdminMesas } from '@/components/admin/AdminMesas';
import { AdminPedidos } from '@/components/admin/AdminPedidos';
import { UtensilsCrossed, Table, ClipboardList, LogOut, Menu, X } from 'lucide-react';

type Tab = 'menu' | 'mesas' | 'pedidos';

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('menu');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login', { replace: true });
      }
    };
    checkSession();
  }, [navigate]);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  }

  const tabs = [
    { id: 'menu' as Tab, label: 'Menú', icon: UtensilsCrossed },
    { id: 'mesas' as Tab, label: 'Mesas', icon: Table },
    { id: 'pedidos' as Tab, label: 'Pedidos', icon: ClipboardList },
  ];

  function selectTab(t: Tab) {
    setTab(t);
    setSidebarOpen(false);
  }

  return (
    <div className="h-screen flex flex-col md:flex-row bg-background">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-sidebar border-b border-sidebar-border">
        <h1 className="text-lg font-bold text-sidebar-foreground">🍴 Admin</h1>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-sidebar-foreground p-2">
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Mobile Nav Dropdown */}
      {sidebarOpen && (
        <nav className="md:hidden bg-sidebar border-b border-sidebar-border p-2 space-y-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => selectTab(t.id)}
              className={`touch-target w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left font-medium transition-colors ${
                tab === t.id
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent'
              }`}
            >
              <t.icon className="w-5 h-5" />
              {t.label}
            </button>
          ))}
          <button
            onClick={handleLogout}
            className="touch-target w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Cerrar Sesión
          </button>
        </nav>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-sidebar border-r flex-col flex-shrink-0">
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="text-xl font-bold text-sidebar-foreground">🍴 Admin</h1>
          <p className="text-sm text-sidebar-foreground/60">Panel de gestión</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`touch-target w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left font-medium transition-colors ${
                tab === t.id
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent'
              }`}
            >
              <t.icon className="w-5 h-5" />
              {t.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <button
            onClick={handleLogout}
            className="touch-target w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        {tab === 'menu' && <AdminMenu />}
        {tab === 'mesas' && <AdminMesas />}
        {tab === 'pedidos' && <AdminPedidos />}
      </main>
    </div>
  );
}
