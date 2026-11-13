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
import { useIndicateursArtisan, estTacheAFaire } from '@/hooks/useIndicateursArtisan';
import { IndicateursArtisan } from '@/components/artisan/IndicateursArtisan';
import { NouveautesTachesArtisan } from '@/components/artisan/NouveautesTachesArtisan';
import { BandeauConformiteArtisan } from '@/components/artisan/BandeauConformiteArtisan';

export function DashboardArtisan() {
  const { profile } = useAuth();
  const preview = useArtisanPreview();
  const { chantiers, taches, lots, loading: chantierLoading, loadTaches } = useChantier();
  const { loading: stLoading, indisponibilites, addIndisponibilite, removeIndisponibilite, getConformite } = useSousTraitant();

  const [selectedTache, setSelectedTache] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // ✅ Ref pour éviter que le setInterval écrase les notifications déjà marquées vues
  const vuesLocalement = useRef(new Set());

  const monSousTraitantId = useMonSousTraitantId();
  const { totaux } = useIndicateursArtisan();
  const basePath = preview?.basePath || '/artisan';

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
    // Retour sur l'onglet / l'appli : relire tout de suite (la modif a pu être faite ailleurs)
    const onVisible = () => { if (document.visibilityState === 'visible') loadNotifications(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', loadNotifications);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', loadNotifications);
    };
  }, [monSousTraitantId]);

  const mesTaches = useMemo(() => {
    if (!monSousTraitantId) return [];
    return taches.filter(t =>
      t.assignetype === 'soustraitant' && t.assigneid === monSousTraitantId
    );
  }, [taches, monSousTraitantId]);

  // Bloc "Tâches à faire" : nombre de tâches à faire avec une notification non vue.
  // Seules les tâches datées comptent (elles s'ouvrent depuis le calendrier, ce qui efface la notification).
  const nouveautesTaches = useMemo(() => {
    const nonVues = notifications.filter(n => !n.vu);
    return mesTaches
      .filter(t => t.datedebut && estTacheAFaire(t))
      .map(tache => ({
        tache,
        nouvelle: nonVues.some(n => n.tache_id === tache.id && n.type === 'nouvelle_tache'),
        modif: nonVues.find(n => n.tache_id === tache.id && n.type === 'date_modifiee') || null,
      }))
      .filter(i => i.nouvelle || i.modif)
      .sort((a, b) => String(a.tache.datedebut).localeCompare(String(b.tache.datedebut)));
  }, [mesTaches, notifications]);

  const notifsTachesAFaire = useMemo(() => ({
    nouvelles: nouveautesTaches.filter(i => i.nouvelle).length,
    modifiees: nouveautesTaches.filter(i => i.modif).length,
  }), [nouveautesTaches]);

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

  // Calendrier : nom du client en majuscules au-dessus du nom de la tâche
  const codesClient = useMemo(() => {
    const map = {};
    mesChantiers.forEach(c => {
      map[c.id] = (c.client_nom || c.nomchantier || '').trim().toUpperCase();
    });
    return map;
  }, [mesChantiers]);

  const mesIndisponibiliteDates = useMemo(() => {
    if (!monSousTraitantId) return new Set();
    return new Set(
      indisponibilites
        .filter(i => i.soustraitant_id === monSousTraitantId)
        .map(i => i.date)
    );
  }, [indisponibilites, monSousTraitantId]);

  const handleToggleIndisponibilite = async (dateStr) => {
    if (!monSousTraitantId) return;
    try {
      if (mesIndisponibiliteDates.has(dateStr)) {
        await removeIndisponibilite(monSousTraitantId, dateStr);
      } else {
        await addIndisponibilite(monSousTraitantId, dateStr);
      }
    } catch (error) {
      console.error('Erreur mise à jour indisponibilité:', error);
      alert("Erreur lors de la mise à jour de votre disponibilité.");
    }
  };

  const marquerNotificationsVues = async (ids) => {
    // Aperçu agence : ne pas consommer les notifications de l'artisan
    if (preview || !ids.length) return;

    // ✅ 1. Marquer localement IMMÉDIATEMENT
    ids.forEach(id => vuesLocalement.current.add(id));
    setNotifications(prev =>
      prev.map(n => ids.includes(n.id) ? { ...n, vu: true } : n)
    );

    // ✅ 2. Persister en BDD via RPC (un UPDATE direct était filtré en silence par les RLS)
    const { data: nbMarquees, error } = await supabase
      .rpc('marquer_notifications_vues', { p_ids: ids.map(String) });

    if (!error && nbMarquees === 0) {
      console.warn('⚠️ Aucune notification marquée vue en base pour :', ids);
    }

    if (error) {
      console.error('Erreur marquage notifications:', error);
      // Rollback local en cas d'erreur
      ids.forEach(id => vuesLocalement.current.delete(id));
      setNotifications(prev =>
        prev.map(n => ids.includes(n.id) ? { ...n, vu: false } : n)
      );
    } else {
      // ✅ 3. Déclencher rechargement badge sidebar
      window.dispatchEvent(new CustomEvent('notifications-updated'));
    }
  };

  const handleTacheClick = async (tache) => {
    const ids = notifications.filter(n => n.tache_id === tache.id && !n.vu).map(n => n.id);
    await marquerNotificationsVues(ids);

    setSelectedTache(tache);
    setIsModalOpen(true);
  };

  // Depuis la liste des nouveautés : ouvrir la tâche comme depuis le calendrier
  const handleOuvrirNouveaute = (tache) => {
    const aModif = nouveautesTaches.some(i => i.tache.id === tache.id && i.modif);
    handleTacheClick({ ...tache, isDateModifiee: aModif });
  };

  const handleToutMarquerVu = () => {
    marquerNotificationsVues(notifications.filter(n => !n.vu).map(n => n.id));
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
        <h1 className="text-2xl sm:text-3xl font-bold">
          {preview ? `Espace de ${preview.artisanNom || "l'artisan"}` : `Bonjour ${profile?.prenom || ''}`}
        </h1>
        <p className="text-muted-foreground">Voici ce qui vous attend</p>
      </div>

      <BandeauConformiteArtisan conformite={getConformite(monSousTraitantId)} />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <IndicateursArtisan
          totaux={totaux}
          basePath={basePath}
          tachesNouvelles={notifsTachesAFaire.nouvelles}
          tachesModifiees={notifsTachesAFaire.modifiees}
        />
      </motion.div>

      <NouveautesTachesArtisan
        items={nouveautesTaches}
        chantierNoms={chantierNoms}
        onOuvrir={handleOuvrirNouveaute}
        onToutMarquerVu={preview ? null : handleToutMarquerVu}
      />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center">
              <Calendar className="mr-3 h-6 w-6 text-orange-500" />
              Mon planning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CalendrierView
              taches={mesTaches}
              lots={lots}
              conflictsByChantier={{}}
              onEditTache={handleTacheClick}
              onAddTache={() => {}}
              chantierNoms={codesClient}
              readOnly={true}
              isArtisanView={true}
              notifications={notifications}
              /* Les notifications ne passent « vues » qu'à l'ouverture de la tâche (handleTacheClick) */
              indisponibiliteDates={mesIndisponibiliteDates}
              onToggleIndisponibilite={handleToggleIndisponibilite}
              canManageIndisponibilites={true}
            />
            {mesTaches.length === 0 && (
              <p className="text-center text-sm text-muted-foreground mt-4">
                Aucune tâche assignée pour le moment. Vous pouvez cliquer sur un jour pour indiquer une indisponibilité.
              </p>
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
          modificationDate={notifications.find(n =>
            n.tache_id === selectedTache.id && n.type === 'date_modifiee' && (n.ancienne_datedebut || n.nouvelle_datedebut)
          )}
          modificationNonVue={!!selectedTache.isDateModifiee}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
}