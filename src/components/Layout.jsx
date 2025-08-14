import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, Menu, X, LogOut, HardHat, Briefcase, Truck, Wrench, Settings, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  
  const navItems = [
    { name: 'Tableau de bord', href: '/', icon: LayoutDashboard },
    { name: 'Chantiers', href: '/chantiers', icon: HardHat },
    { name: 'Artisans', href: '/sous-traitants-list', icon: Users }, // Changé ici
    { name: 'Fournisseurs', href: '/fournisseurs', icon: Truck },
    { name: 'SAV', href: '/sav', icon: Wrench },
    { name: 'Paramètres', href: '/parametres', icon: Settings },
  ];

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="min-h-screen bg-gray-50">
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

      <motion.aside 
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        initial={false}
      >
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-center h-16 px-4 border-b">
            <Link to="/" className="flex items-center space-x-2">
              <HardHat className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                SuiviChantier
              </span>
            </Link>
          </div>
          
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href || 
                               (item.href === '/sous-traitants-list' && (location.pathname.startsWith('/sous-traitant-details/') || location.pathname === '/sous-traitants-list')) ||
                               (item.href === '/fournisseurs' && (location.pathname.startsWith('/fournisseurs') || location.pathname === '/fournisseurs-list')) || // Assurez-vous que FournisseursList a une route cohérente
                               (item.href === '/sav' && location.pathname.startsWith('/sav')) ||
                               (item.href === '/parametres' && location.pathname.startsWith('/parametres')); 
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center px-4 py-3 text-sm font-medium rounded-md transition-all",
                    isActive 
                      ? "bg-primary text-white" 
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
          
          <div className="p-4 border-t">
            <Button variant="outline" className="w-full justify-start text-gray-700">
              <LogOut className="mr-2 h-4 w-4" />
              Déconnexion
            </Button>
          </div>
        </div>
      </motion.aside>

      <main className={cn(
        "transition-all duration-300 ease-in-out",
        "lg:ml-64 min-h-screen"
      )}>
        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}