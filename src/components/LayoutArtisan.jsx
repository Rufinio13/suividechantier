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
import logoEvabois from '@/assets/logo-evabois.png';

export function LayoutArtisan() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [savCount, setSavCount] = useState(0);
  const [ncCount, setNcCount] = useState(0);
  const [docsASignerCount, setDocsASignerCount] = useState(0);
  const [nouveauxDocsCount, setNouveauxDocsCount] = useState(0);
  const [tachesEnRetardCount, setTachesEnRetardCount] = useState(0);
  const [nouvellesTachesCount, setNouvellesTachesCount] = useState(0);
  const [tachesModifieesCount, setTachesModifieesCount] = useState(0);

  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();
  const { sousTraitants } = useSousTraitant();
  const { controles, modelesCQ } = useReferentielCQ();
  const { taches } = useChantier();

  // Trouver l'ID du sous-traitant
  const monSousTraitantId = useMemo(() => {
    if (!profile?.id || !sousTraitants?.length) return null;
    const myST = sousTraitants.find(st => st.user_id === profile.id);
    return myST?.id || null;
  }, [profile, sousTraitants]);

  // Récupérer les chantiers de l'artisan
  const mesChantierIds = useMemo(() => {
    if (!monSousTraitantId || !taches) return [];
    return [...new Set(
      taches
        .filter(t => t.assignetype === 'soustraitant' && t.assigneid === monSousTraitantId)
        .map(t => t.chantierid)
    )];
  }, [monSousTraitantId, taches]);

  // ✅ Compter les tâches en retard
  useEffect(() => {
    const loadTachesEnRetard = () => {
      if (!monSousTraitantId || !taches) return;
      try {
        const maintenant = new Date();
        const enRetard = taches.filter(t => {
          const estMonTache = t.assignetype === 'soustraitant' && t.assigneid === monSousTraitantId;
          const nonTerminee = !t.artisan_termine && !t.constructeur_valide;
          const dateFinPassee = t.datefin && new Date(t.datefin) < maintenant;
          return estMonTache && nonTerminee && dateFinPassee;
        });
        console.log('📊 Tâches en retard:', enRetard.length);
        setTachesEnRetardCount(enRetard.length);
      } catch (error) {
        console.error('Erreur comptage tâches en retard:', error);
      }
    };
    loadTachesEnRetard();
    const interval = setInterval(loadTachesEnRetard, 30000);
    return () => clearInterval(interval);
  }, [monSousTraitantId, taches]);

  // ✅ Compter les notifications
  useEffect(() => {
    const loadNotificationsCount = async () => {
      if (!monSousTraitantId) return;
      try {
        const { data, error } = await supabase
          .from('notifications_taches_artisan')
          .select('type, vu')
          .eq('soustraitant_id', monSousTraitantId)
          .eq('vu', false);
        if (error) throw error;
        const nouvelles = data.filter(n => n.type === 'nouvelle_tache').length;
        const modifiees = data.filter(n => n.type === 'date_modifiee').length;
        console.log('📊 Nouvelles tâches:', nouvelles);
        console.log('📊 Tâches modifiées:', modifiees);
        setNouvellesTachesCount(nouvelles);
        setTachesModifieesCount(modifiees);
      } catch (error) {
        console.error('Erreur comptage notifications:', error);
      }
    };
    loadNotificationsCount();
    const interval = setInterval(loadNotificationsCount, 30000);
    return () => clearInterval(interval);
  }, [monSousTraitantId]);

  // ✅ Compter les NC
  useEffect(() => {
    const loadNcCount = () => {
      if (!monSousTraitantId || !controles || !modelesCQ || mesChantierIds.length === 0) return;
      try {
        let totalNC = 0;
        const controlesChantier = controles.filter(c => mesChantierIds.includes(c.chantier_id));
        controlesChantier.forEach(ctrl => {
          const modele = modelesCQ.find(m => m.id === ctrl.modele_cq_id);
          if (!modele) return;
          if (ctrl.resultats) {
            Object.entries(ctrl.resultats).forEach(([categorieId, resultatsCategorie]) => {
              const categorie = modele.categories?.find(c => c.id === categorieId);
              if (!categorie) return;
              const categoriesSupprimees = ctrl.controles_supprimes?.categories || [];
              if (categoriesSupprimees.includes(categorieId)) return;
              Object.entries(resultatsCategorie).forEach(([sousCategorieId, resultatsSousCategorie]) => {
                const sousCategorie = categorie.sousCategories?.find(sc => sc.id === sousCategorieId);
                if (!sousCategorie) return;
                const sousCategoriesSupprimees = ctrl.controles_supprimes?.sous_categories?.[categorieId] || [];
                if (sousCategoriesSupprimees.includes(sousCategorieId)) return;
                Object.entries(resultatsSousCategorie).forEach(([pointControleId, resultatPoint]) => {
                  const pointsSupprimes = ctrl.controles_supprimes?.points?.[categorieId]?.[sousCategorieId] || [];
                  if (pointsSupprimes.includes(pointControleId)) return;
                  if (
                    resultatPoint.resultat === 'NC' &&
                    resultatPoint.soustraitant_id === monSousTraitantId &&
                    !resultatPoint.repriseValidee
                  ) {
                    const pointControle = sousCategorie.pointsControle?.find(pc => pc.id === pointControleId);
                    if (pointControle) totalNC++;
                  }
                });
              });
            });
          }
          if (ctrl.points_specifiques) {
            Object.entries(ctrl.points_specifiques).forEach(([categorieId, categoriePoints]) => {
              const categorie = modele.categories?.find(c => c.id === categorieId);
              const categoriesSupprimees = ctrl.controles_supprimes?.categories || [];
              if (categoriesSupprimees.includes(categorieId)) return;
              Object.entries(categoriePoints).forEach(([sousCategorieKey, pointsMap]) => {
                const sousCategorie = sousCategorieKey === '_global'
                  ? { id: '_global', nom: 'Points spécifiques' }
                  : categorie?.sousCategories?.find(sc => sc.id === sousCategorieKey);
                if (!sousCategorie) return;
                const sousCategoriesSupprimees = ctrl.controles_supprimes?.sous_categories?.[categorieId] || [];
                if (sousCategoriesSupprimees.includes(sousCategorieKey)) return;
                Object.entries(pointsMap).forEach(([pointControleId, pointData]) => {
                  const pointsSupprimes = ctrl.controles_supprimes?.points?.[categorieId]?.[sousCategorieKey] || [];
                  if (pointsSupprimes.includes(pointControleId)) return;
                  const resultatPoint = ctrl.resultats?.[categorieId]?.[sousCategorieKey]?.[pointControleId];
                  if (
                    resultatPoint?.resultat === 'NC' &&
                    resultatPoint.soustraitant_id === monSousTraitantId &&
                    !resultatPoint.repriseValidee
                  ) {
                    totalNC++;
                  }
                });
              });
            });
          }
        });
        console.log('📊 NC non validées:', totalNC);
        setNcCount(totalNC);
      } catch (error) {
        console.error('Erreur comptage NC:', error);
      }
    };
    loadNcCount();
    const interval = setInterval(loadNcCount, 30000);
    return () => clearInterval(interval);
  }, [monSousTraitantId, controles, modelesCQ, mesChantierIds]);

  // ✅ Compter les documents
  useEffect(() => {
    const loadDocsCount = async () => {
      if (!monSousTraitantId || mesChantierIds.length === 0) return;
      try {
        const { data, error } = await supabase
          .from('documents_chantier')
          .select('necessite_signature, signature_statut, artisan_assigne_signature, artisans_vus, chantier_id')
          .in('chantier_id', mesChantierIds);
        if (error) throw error;
        let aSignerCount = 0;
        let nouveauxCount = 0;
        data.forEach(doc => {
          if (
            doc.necessite_signature &&
            doc.artisan_assigne_signature === monSousTraitantId &&
            doc.signature_statut === 'en_attente'
          ) {
            aSignerCount++;
          } else if (
            !doc.necessite_signature &&
            (!doc.artisans_vus || !doc.artisans_vus.includes(monSousTraitantId))
          ) {
            nouveauxCount++;
          }
        });
        console.log('📊 Documents à signer:', aSignerCount);
        console.log('📊 Nouveaux documents:', nouveauxCount);
        setDocsASignerCount(aSignerCount);
        setNouveauxDocsCount(nouveauxCount);
      } catch (error) {
        console.error('Erreur comptage documents:', error);
      }
    };
    loadDocsCount();
    const interval = setInterval(loadDocsCount, 30000);
    return () => clearInterval(interval);
  }, [monSousTraitantId, mesChantierIds]);

  // ✅ Compter les SAV
  useEffect(() => {
    const loadSavCount = async () => {
      if (!monSousTraitantId) return;
      try {
        const { count, error } = await supabase
          .from('sav')
          .select('*', { count: 'exact', head: true })
          .eq('soustraitant_id', monSousTraitantId)
          .eq('constructeur_valide', false);
        if (error) throw error;
        console.log('📊 SAV non validés:', count);
        setSavCount(count || 0);
      } catch (error) {
        console.error('Erreur chargement SAV:', error);
      }
    };
    loadSavCount();
    const interval = setInterval(loadSavCount, 30000);
    return () => clearInterval(interval);
  }, [monSousTraitantId]);

  const navItems = [
    {
      name: 'Mon calendrier',
      href: '/artisan',
      icon: Calendar,
      badges: [
        { count: tachesEnRetardCount, variant: 'destructive', label: 'En retard' },
        { count: nouvellesTachesCount, variant: 'info', label: 'Nouvelles' },
        { count: tachesModifieesCount, variant: 'success', label: 'Modifiées' }
      ]
    },
    {
      name: 'Mes chantiers',
      href: '/artisan/chantiers',
      icon: Building2,
      badges: [
        { count: ncCount, variant: 'destructive', label: 'NC' },
        { count: docsASignerCount, variant: 'warning', label: 'À signer' },
        { count: nouveauxDocsCount, variant: 'info', label: 'Nouveaux' }
      ]
    },
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

          {/* Logo EVAbois — Espace Artisan */}
          <div className="flex items-center justify-center h-20 px-4 border-b border-[#e8e2d9]">
            <Link to="/artisan" className="flex items-center gap-3">
              <img src={logoEvabois} alt="EVAbois" className="h-12 object-contain" />
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
                      ? "bg-[#f0ebe2] text-[#683B11] font-semibold"
                      : "text-[#5a4a3a] hover:bg-[#f7f4ef]"
                  )}
                  style={isActive ? { borderLeft: '3px solid #9FC760' } : { borderLeft: '3px solid transparent' }}
                  onClick={() => setSidebarOpen(false)}
                >
                  <div className="flex items-center">
                    <Icon className={cn("mr-3 h-5 w-5", isActive ? "text-[#9FC760]" : "text-[#A3806D]")} />
                    {item.name}
                  </div>

                  {/* Badges multiples */}
                  {item.badges && (
                    <div className="flex gap-1">
                      {item.badges.map((badge, idx) =>
                        badge.count > 0 && (
                          <Badge
                            key={idx}
                            className={cn(
                              "h-5 min-w-5 rounded-full p-0 flex items-center justify-center text-xs",
                              badge.variant === 'destructive' && "bg-red-500 hover:bg-red-600 text-white",
                              badge.variant === 'warning' && "bg-[#F8B45B] hover:bg-[#e0a040] text-[#633806]",
                              badge.variant === 'info' && "bg-blue-500 hover:bg-blue-600 text-white",
                              badge.variant === 'success' && "bg-[#9FC760] hover:bg-[#8ab550] text-[#27500A]"
                            )}
                          >
                            {badge.count}
                          </Badge>
                        )
                      )}
                    </div>
                  )}

                  {/* Badge unique SAV */}
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