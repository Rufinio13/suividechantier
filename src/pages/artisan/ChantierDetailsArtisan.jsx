import React, { useMemo, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useChantier } from '@/context/ChantierContext';
import { useReferentielCQ } from '@/context/ReferentielCQContext';
import { useArtisanPreview } from '@/context/ArtisanPreviewContext';
import { useMonSousTraitantId } from '@/hooks/useMonSousTraitantId';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ListChecks, FolderOpen, AlertTriangle, User, MapPin } from 'lucide-react';
import { TachesArtisanTab } from '@/components/artisan/TachesArtisanTab';
import { DocumentsArtisanTab } from '@/components/artisan/DocumentsArtisanTab';
import { NonConformitesArtisanTab } from '@/components/artisan/NonConformitesArtisanTab';
import { supabase } from '@/lib/supabaseClient';

export function ChantierDetailsArtisan() {
  const { id } = useParams();
  const preview = useArtisanPreview();
  const basePath = preview?.basePath || '/artisan';
  const { chantiers, taches, loading } = useChantier();
  const { controles, modelesCQ } = useReferentielCQ();

  const [activeTab, setActiveTab] = useState('documents');
  const [docsASignerCount, setDocsASignerCount] = useState(0);
  const [nouveauxDocsCount, setNouveauxDocsCount] = useState(0);

  const monSousTraitantId = useMonSousTraitantId();

  const chantier = useMemo(
    () => chantiers?.find((c) => c.id === id),
    [chantiers, id]
  );

  const hasAccessToChantier = useMemo(() => {
    if (!monSousTraitantId || !id) return false;
    return taches.some(t => 
      t.chantierid === id && 
      t.assignetype === 'soustraitant' && 
      t.assigneid === monSousTraitantId
    );
  }, [taches, id, monSousTraitantId]);

  const ncCount = useMemo(() => {
    if (!monSousTraitantId || !id || !controles || !modelesCQ) return 0;
    let count = 0;
    const controlesChantier = controles.filter(c => c.chantier_id === id);
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
                if (pointControle) count++;
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
            Object.entries(pointsMap).forEach(([pointControleId]) => {
              const pointsSupprimes = ctrl.controles_supprimes?.points?.[categorieId]?.[sousCategorieKey] || [];
              if (pointsSupprimes.includes(pointControleId)) return;
              const resultatPoint = ctrl.resultats?.[categorieId]?.[sousCategorieKey]?.[pointControleId];
              if (
                resultatPoint?.resultat === 'NC' && 
                resultatPoint.soustraitant_id === monSousTraitantId &&
                !resultatPoint.repriseValidee
              ) count++;
            });
          });
        });
      }
    });
    return count;
  }, [monSousTraitantId, id, controles, modelesCQ]);

  // ✅ Compter les documents — filtrés par partage_type
  useEffect(() => {
    const loadDocsCount = async () => {
      if (!monSousTraitantId || !id) return;
      try {
        const { data, error } = await supabase
          .from('documents_chantier')
          .select('necessite_signature, signature_statut, artisan_assigne_signature, artisans_vus')
          .eq('chantier_id', id)
          // ✅ Uniquement les docs visibles par cet artisan
          .or(`partage_type.eq.tous,artisan_id.eq.${monSousTraitantId}`);

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

        setDocsASignerCount(aSignerCount);
        setNouveauxDocsCount(nouveauxCount);
      } catch (error) {
        console.error('Erreur comptage documents:', error);
      }
    };

    loadDocsCount();
    const interval = setInterval(loadDocsCount, 10000);
    return () => clearInterval(interval);
  }, [monSousTraitantId, id, activeTab]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!chantier || !hasAccessToChantier) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <h2 className="text-2xl font-bold mb-2">Chantier non accessible</h2>
        <p className="text-muted-foreground mb-6">Vous n'avez pas accès à ce chantier.</p>
        <Button asChild>
          <Link to={`${basePath}/chantiers`}><ArrowLeft className="mr-2 h-4 w-4" /> Retour à mes chantiers</Link>
        </Button>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <Button variant="outline" size="sm" asChild className="mb-3">
            <Link to={`${basePath}/chantiers`}><ArrowLeft className="mr-2 h-4 w-4" /> Retour</Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">{chantier.nomchantier}</h1>
        </div>
      </div>

      <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200 shadow-lg">
        <CardHeader><CardTitle>Informations du Chantier</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center">
              <User className="mr-3 h-5 w-5 text-primary" />
              <span className="font-medium">Client :</span>
              &nbsp;{chantier.client_prenom} {chantier.client_nom}
            </div>
            <div className="flex items-center">
              <MapPin className="mr-3 h-5 w-5 text-primary" />
              <span className="font-medium">Adresse :</span>
              &nbsp;
              <span className="text-slate-700">
                {chantier.adresse && chantier.adresse}
                {chantier.adresse && (chantier.codepostal || chantier.ville) && ", "}
                {chantier.codepostal} {chantier.ville}
                {!chantier.adresse && !chantier.codepostal && !chantier.ville && <span className="text-slate-400">N/A</span>}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 gap-2 h-auto p-2">
          <TabsTrigger value="taches" className="flex items-center justify-center">
            <ListChecks className="mr-2 h-4 w-4" /> Mes Tâches
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center justify-center relative">
            <FolderOpen className="mr-2 h-4 w-4" /> Documents
            {(docsASignerCount > 0 || nouveauxDocsCount > 0) && (
              <div className="flex gap-1 ml-2">
                {docsASignerCount > 0 && (
                  <Badge className="h-5 min-w-5 rounded-full p-0 flex items-center justify-center text-xs bg-orange-500 hover:bg-orange-600">
                    {docsASignerCount}
                  </Badge>
                )}
                {nouveauxDocsCount > 0 && (
                  <Badge className="h-5 min-w-5 rounded-full p-0 flex items-center justify-center text-xs bg-blue-500 hover:bg-blue-600">
                    {nouveauxDocsCount}
                  </Badge>
                )}
              </div>
            )}
          </TabsTrigger>
          <TabsTrigger value="nc" className="flex items-center justify-center relative">
            <AlertTriangle className="mr-2 h-4 w-4" /> Non-Conformités
            {ncCount > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 min-w-5 rounded-full p-0 flex items-center justify-center text-xs">
                {ncCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="taches" className="mt-6">
          <TachesArtisanTab chantierId={id} soustraitantId={monSousTraitantId} />
        </TabsContent>
        <TabsContent value="documents" className="mt-6">
          <DocumentsArtisanTab
            chantierId={id}
            soustraitantId={monSousTraitantId}
            disableSignature={!!preview}
            onDocumentView={() => {
              setTimeout(() => setActiveTab('documents'), 500);
            }}
          />
        </TabsContent>
        <TabsContent value="nc" className="mt-6">
          <NonConformitesArtisanTab chantierId={id} soustraitantId={monSousTraitantId} />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}