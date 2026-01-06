import React, { useState, useMemo, useEffect } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Building2, Menu, X, LogOut, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useChantier } from '@/context/ChantierContext';
import { useSousTraitant } from '@/context/SousTraitantContext';
import { useReferentielCQ } from '@/context/ReferentielCQContext';
import { supabase } from '@/lib/supabaseClient';

export function LayoutArtisan() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [savCount, setSavCount] = useState(0);
  const [ncCount, setNcCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();
  const { sousTraitants } = useSousTraitant();
  const { controles } = useReferentielCQ();
  const { taches } = useChantier();

  // Trouver l'ID du sous-traitant
  const monSousTraitantId = useMemo(() => {
    if (!profile?.id || !sousTraitants?.length) return null;
    const myST = sousTraitants.find(st => st.user_id === profile.id);
    return myST?.id || null;
  }, [profile, sousTraitants]);

  // ✅ Compter les NC non validées de l'artisan
  useEffect(() => {
    const loadNcCount = () => {
      if (!monSousTraitantId || !controles || !taches) return;

      try {
        // Récupérer les chantiers de l'artisan
        const mesChantierIds = [...new Set(
          taches
            .filter(t => t.assignetype === 'soustraitant' && t.assigneid === monSousTraitantId)
            .map(t => t.chantierid)
        )];

        let totalNC = 0;

        // Parcourir les contrôles des chantiers de l'artisan
        controles.forEach(ctrl => {
          if (!mesChantierIds.includes(ctrl.chantier_id)) return;
          if (!ctrl.resultats) return;

          Object.values(ctrl.resultats).forEach(categorie => {
            Object.values(categorie).forEach(sousCategorie => {
              Object.values(sousCategorie).forEach(point => {
                // NC assignée à cet artisan ET non validée
                if (
                  point.resultat === 'NC' &&
                  point.soustraitant_id === monSousTraitantId &&
                  !point.repriseValidee
                ) {
                  totalNC++;
                }
              });
            });
          });
        });

        console.log('📊 NC non validées pour artisan:', totalNC);
        setNcCount(totalNC);
      } catch (error) {
        console.error('Erreur comptage NC:', error);
      }
    };

    loadNcCount();

    // Recharger toutes les 30 secondes
    const interval = setInterval(loadNcCount, 30000);

    return () => clearInterval(interval);
  }, [monSousTraitantId, controles, taches]);

  // Charger le nombre de SAV
  useEffect(() => {
    const loadSavCount = async () => {
      if (!monSousTraitantId) return;

      try {
        console.log('🔍 Chargement SAV pour artisan:', monSousTraitantId);
        
        const { count, error } = await supabase
          .from('sav')
          .select('*', { count: 'exact', head: true })
          .eq('soustraitant_id', monSousTraitantId)
          .eq('constructeur_valide', false);

        if (error) {
          console.error('❌ Erreur chargement SAV:', error);
          throw error;
        }

        console.log('📊 Nombre de SAV non validés:', count);
        setSavCount(count || 0);
      } catch (error) {
        console.error('Erreur chargement SAV:', error);
      }
    };

    loadSavCount();

    // Recharger toutes les 30 secondes
    const interval = setInterval(loadSavCount, 30000);

    return () => clearInterval(interval);
  }, [monSousTraitantId]);

  // ✅ Menu artisan avec badge SAV et NC
  const navItems = [
    { name: 'Mon calendrier', href: '/artisan', icon: Calendar },
    { name: 'Mes chantiers', href: '/artisan/chantiers', icon: Building2, badge: ncCount },
    { name: 'SAV', href: '/artisan/sav', icon: Wrench, badge: savCount },
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
              <Building2 className="h-8 w-8 text-orange-500" />
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
                    "flex items-center justify-between px-4 py-3 text-sm font-medium rounded-md transition-all",
                    isActive 
                      ? "bg-orange-500 text-white" 
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <div className="flex items-center">
                    <Icon className={cn("mr-3 h-5 w-5", isActive ? "text-white" : "text-gray-500")} />
                    {item.name}
                  </div>
                  
                  {/* ✅ Badge SAV ou NC */}
                  {item.badge > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="ml-auto h-5 min-w-5 rounded-full p-0 flex items-center justify-center text-xs"
                    >
                      {item.badge}
                    </Badge>
                  )}
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