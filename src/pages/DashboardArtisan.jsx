import React, { useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useChantier } from '@/context/ChantierContext';
import { useSousTraitant } from '@/context/SousTraitantContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendrierView } from '@/components/planning/CalendrierView';
import { TacheDetailModalArtisan } from '@/components/TacheDetailModalArtisan';
import { Calendar, HardHat } from 'lucide-react';
import { motion } from 'framer-motion';

export function DashboardArtisan() {
  const { profile } = useAuth();
  const { chantiers, taches, lots, loading: chantierLoading, loadTaches } = useChantier();
  const { sousTraitants, loading: stLoading } = useSousTraitant();

  // États pour modal
  const [selectedTache, setSelectedTache] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 1️⃣ Trouver l'ID du sous-traitant correspondant à l'artisan connecté
  const monSousTraitantId = useMemo(() => {
    if (!profile?.id || !sousTraitants?.length) return null;
    
    const myST = sousTraitants.find(st => st.user_id === profile.id);
    console.log('👤 Mon sous-traitant:', myST);
    return myST?.id || null;
  }, [profile, sousTraitants]);

  // 2️⃣ Filtrer MES tâches uniquement
  const mesTaches = useMemo(() => {
    if (!monSousTraitantId) return [];
    
    const filtered = taches.filter(t => 
      t.assignetype === 'soustraitant' && 
      t.assigneid === monSousTraitantId
    );
    
    console.log('📋 Mes tâches:', filtered.length);
    return filtered;
  }, [taches, monSousTraitantId]);

  // 3️⃣ Mes chantiers (chantiers où j'ai au moins une tâche)
  const mesChantiers = useMemo(() => {
    if (!mesTaches.length) return [];
    
    const chantierIds = [...new Set(mesTaches.map(t => t.chantierid))];
    const filtered = chantiers.filter(c => chantierIds.includes(c.id));
    
    console.log('🏗️ Mes chantiers:', filtered.length);
    return filtered;
  }, [mesTaches, chantiers]);

  // 5️⃣ Générer une couleur par chantier pour le calendrier
  const chantierColors = useMemo(() => {
    const colors = [
      '#3b82f6', // blue
      '#10b981', // green
      '#f59e0b', // amber
      '#ef4444', // red
      '#8b5cf6', // violet
      '#ec4899', // pink
      '#14b8a6', // teal
      '#f97316', // orange
    ];
    
    const colorMap = {};
    mesChantiers.forEach((chantier, index) => {
      colorMap[chantier.id] = colors[index % colors.length];
    });
    
    return colorMap;
  }, [mesChantiers]);

  // Handler clic sur tâche
  const handleTacheClick = (tache) => {
    console.log('📋 Clic sur tâche:', tache);
    setSelectedTache(tache);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedTache(null);
  };

  const handleModalSuccess = async () => {
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
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Mon planning</h1>
        <p className="text-muted-foreground">
          Bienvenue, {profile?.prenom} {profile?.nom}
        </p>
      </div>

      {/* Légende couleurs */}
      {mesChantiers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Légende des chantiers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {mesChantiers.map(chantier => (
                <div key={chantier.id} className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: chantierColors[chantier.id] }}
                  />
                  <span className="text-sm">{chantier.nomchantier}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendrier */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
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
                readOnly={true}
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

      {/* Modal détails tâche */}
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