import React, { useState } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, HardHat, Menu, X, LogOut, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

export function LayoutArtisan() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  // ✅ Menu simplifié pour artisan
  const navItems = [
    { name: 'Mon calendrier', href: '/artisan', icon: Calendar },
    { name: 'Mes chantiers', href: '/artisan/chantiers', icon: HardHat },
    { name: 'SAV', href: '/artisan/sav', icon: Wrench },
  ];

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const handleSignOut = async () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    
    try {
      console.log('🔓 Déconnexion artisan...');
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
    <div className="min-h-screen bg-gray-50">
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

      {/* Sidebar */}
      <motion.aside 
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        initial={false}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 px-4 border-b">
            <Link to="/artisan" className="flex items-center space-x-2">
              <HardHat className="h-8 w-8 text-orange-500" />
              <span className="text-xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
                Espace Artisan
              </span>
            </Link>
          </div>
          
          {/* Menu */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive =
                location.pathname === item.href ||
                (item.href !== '/artisan' && location.pathname.startsWith(item.href));

              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center px-4 py-3 text-sm font-medium rounded-md transition-all",
                    isActive 
                      ? "bg-orange-500 text-white" 
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className={cn("mr-3 h-5 w-5", isActive ? "text-white" : "text-gray-500")} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          
          {/* Logout */}
          <div className="p-4 border-t">
            <Button 
              variant="outline" 
              className="w-full justify-start text-gray-700"
              onClick={handleSignOut}
              disabled={isLoggingOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
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