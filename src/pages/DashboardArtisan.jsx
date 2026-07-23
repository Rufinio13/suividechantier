import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useChantier } from '@/context/ChantierContext';
import { useSousTraitant } from '@/context/SousTraitantContext';
import { useArtisanPreview } from '@/context/ArtisanPreviewContext';
import { useMonSousTraitantId } from '@/hooks/useMonSousTraitantId';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendrierView } from '@/components/planning/CalendrierView';
import { TacheDetailModalArtisan } from '@/components/TacheDetailModalArtisan';
import { Calendar, HardHat } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';

export function DashboardArtisan() {
  const { profile } = useAuth();
  const preview = useArtisanPreview();
  const { chantiers, taches, lots, loading: chantierLoading, loadTaches } = useChantier();
  const { loading: stLoading } = useSousTraitant();

  const [selectedTache, setSelectedTache] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // ✅ Ref pour éviter que le setInterval écrase les notifications déjà marquées vues
  const vuesLocalement = useRef(new Set());

  const monSousTraitantId = useMonSousTraitantId();

  useEffect(() => {
    const loadNotifications = async () => {
      if (!monSousTraitantId) return;
      try {
        const { data, error } = await supabase
          .from('notifications_taches_artisan')
          .select('*')
          .eq('soustraitant_id', monSousTraitantId)
          .order('created_at', { ascending: false });
        if (error) throw error;

        // ✅ Respecter les marquages locaux — ne pas écraser vu:true avec vu:false
        setNotifications(prev => {
          const newData = data || [];
          return newData.map(n => {
            // Si on a déjà marqué cette notif comme vue localement, garder vu:true
            if (vuesLocalement.current.has(n.id)) {
              return { ...n, vu: true };
            }
            return n;
          });
        });
      } catch (error) {
        console.error('Erreur chargement notifications:', error);
      }
    };
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [monSousTraitantId]);

  const mesTaches = useMemo(() => {
    if (!monSousTraitantId) return [];
    return taches.filter(t =>
      t.assignetype === 'soustraitant' && t.assigneid === monSousTraitantId
    );
  }, [taches, monSousTraitantId]);

  const mesChantiers = useMemo(() => {
    if (!mesTaches.length) return [];
    const chantierIds = [...new Set(mesTaches.map(t => t.chantierid))];
    return chantiers.filter(c => chantierIds.includes(c.id));
  }, [mesTaches, chantiers]);

  const chantierNoms = useMemo(() => {
    const map = {};
    mesChantiers.forEach(c => { map[c.id] = c.nomchantier; });
    return map;
  }, [mesChantiers]);

  const chantierColors = useMemo(() => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
    const colorMap = {};
    mesChantiers.forEach((c, i) => { colorMap[c.id] = colors[i % colors.length]; });
    return colorMap;
  }, [mesChantiers]);

  const handleTacheClick = async (tache) => {
    const notifsAMarquer = notifications.filter(n => n.tache_id === tache.id && !n.vu);

    if (notifsAMarquer.length > 0) {
      const ids = notifsAMarquer.map(n => n.id);

      // ✅ 1. Marquer localement IMMÉDIATEMENT
      ids.forEach(id => vuesLocalement.current.add(id));
      setNotifications(prev =>
        prev.map(n => ids.includes(n.id) ? { ...n, vu: true } : n)
      );

      // ✅ 2. Persister en BDD — ATTENDRE la confirmation
      const { error } = await supabase
        .from('notifications_taches_artisan')
        .update({ vu: true })
        .in('id', ids);

      if (error) {
        console.error('Erreur marquage notifications:', error);
        // Rollback local en cas d'erreur
        ids.forEach(id => vuesLocalement.current.delete(id));
        setNotifications(prev =>
          prev.map(n => ids.includes(n.id) ? { ...n, vu: false } : n)
        );
      } else {
        console.log('✅ Notifications marquées comme vues en BDD');
        // ✅ 3. Déclencher rechargement badge sidebar
        window.dispatchEvent(new CustomEvent('notifications-updated'));
      }
    }

    setSelectedTache(tache);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedTache(null);
  };

  const handleModalSuccess = async () => {
    // ✅ Ne recharger QUE les tâches — pas les notifications
    await loadTaches();
  };

  if (chantierLoading || stLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!monSousTraitantId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <HardHat className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Compte artisan non lié</h2>
        <p className="text-muted-foreground">
          Votre compte n'est pas encore lié à un sous-traitant. Contactez votre constructeur.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mon planning</h1>
        <p className="text-muted-foreground">
          {preview ? `Planning de ${preview.artisanNom || "l'artisan"}` : `Bienvenue, ${profile?.prenom} ${profile?.nom}`}
        </p>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center">
              <Calendar className="mr-3 h-6 w-6 text-orange-500" />
              Mon calendrier
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mesTaches.length > 0 ? (
              <CalendrierView
                taches={mesTaches}
                lots={lots}
                conflictsByChantier={{}}
                onEditTache={handleTacheClick}
                onAddTache={() => {}}
                chantierColors={chantierColors}
                chantierNoms={chantierNoms}
                readOnly={true}
                isArtisanView={true}
                notifications={notifications}
              />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="mx-auto h-12 w-12 mb-4" />
                <p>Aucune tâche assignée pour le moment.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {isModalOpen && selectedTache && (
        <TacheDetailModalArtisan
          isOpen={isModalOpen}
          onClose={handleModalClose}
          tache={selectedTache}
          lot={lots.find(l => l.id === selectedTache.lotid)}
          chantier={chantiers.find(c => c.id === selectedTache.chantierid)}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
}