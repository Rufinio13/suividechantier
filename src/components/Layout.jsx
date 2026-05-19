import React, { useState } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, Menu, X, LogOut, HardHat, Truck, Wrench, Users, ShieldCheck, ListChecks, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import logoEvabois from '@/assets/logo-evabois.png';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const navItems = [
    { name: 'Tableau de bord', href: '/', icon: LayoutDashboard },
    { name: 'Chantiers', href: '/chantiers', icon: HardHat },
    { name: 'Artisans', href: '/sous-traitants', icon: Users },
    { name: 'Fournisseurs', href: '/fournisseurs', icon: Truck },
    { name: 'Référentiel CQ', href: '/referentiel-cq', icon: ShieldCheck },
    { name: 'Référentiel Commande', href: '/referentiel-commande', icon: Package },
    { name: 'Lots', href: '/lots', icon: ListChecks },
    { name: 'SAV', href: '/sav', icon: Wrench },
  ];

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const handleSignOut = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      console.log('🔓 Déconnexion en cours...');
      await signOut();
      console.log('✅ Déconnexion OK');
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('❌ Erreur déconnexion:', error);
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f4ef]">

      {/* Mobile hamburger */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={toggleSidebar}
          className="rounded-full shadow-md"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </Button>
      </div>

      {/* Sidebar — fond blanc, bordure droite beige */}
      <motion.aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-[#e8e2d9] transform transition-transform duration-300 ease-in-out lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        initial={false}
      >
        <div className="h-full flex flex-col">

          {/* Logo EVAbois */}
          <div className="flex items-center justify-center h-20 px-4 border-b border-[#e8e2d9]">
            <Link to="/" className="flex items-center gap-3">
              <img src={logoEvabois} alt="EVAbois" className="h-12 object-contain" />
              </Link>
          </div>

          {/* Menu */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive =
                location.pathname === item.href ||
                (item.href !== '/' && location.pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center px-4 py-3 text-sm font-medium rounded-md transition-all",
                    isActive
                      ? "bg-[#f0ebe2] text-[#683B11] font-semibold"
                      : "text-[#5a4a3a] hover:bg-[#f7f4ef]"
                  )}
                  style={isActive ? { borderLeft: '3px solid #9FC760' } : { borderLeft: '3px solid transparent' }}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className={cn("mr-3 h-5 w-5", isActive ? "text-[#9FC760]" : "text-[#A3806D]")} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-[#e8e2d9]">
            <Button
              variant="outline"
              className="w-full justify-start text-[#5a4a3a] border-[#e8e2d9] hover:bg-[#f7f4ef] hover:text-[#683B11] bg-white"
              onClick={handleSignOut}
              disabled={isLoggingOut}
            >
              <LogOut className="mr-2 h-4 w-4 text-[#A3806D]" />
              {isLoggingOut ? 'Déconnexion...' : 'Déconnexion'}
            </Button>
          </div>
        </div>
      </motion.aside>

      {/* PAGE CONTENT */}
      <main className="transition-all duration-300 ease-in-out lg:ml-64 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}