import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useChantier } from '@/context/ChantierContext';
import { useSousTraitant } from '@/context/SousTraitantContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, ListChecks, FolderOpen, AlertTriangle, User, MapPin } from 'lucide-react';
import { TachesArtisanTab } from '@/components/artisan/TachesArtisanTab';
import { DocumentsArtisanTab } from '@/components/artisan/DocumentsArtisanTab';
import { NonConformitesArtisanTab } from '@/components/artisan/NonConformitesArtisanTab';

export function ChantierDetailsArtisan() {
  const { id } = useParams();
  const { profile } = useAuth();
  const { chantiers, taches, loading } = useChantier();
  const { sousTraitants } = useSousTraitant();
  
  const [activeTab, setActiveTab] = useState('taches');

  // Trouver l'ID du sous-traitant
  const monSousTraitantId = useMemo(() => {
    if (!profile?.id || !sousTraitants?.length) return null;
    const myST = sousTraitants.find(st => st.user_id === profile.id);
    return myST?.id || null;
  }, [profile, sousTraitants]);

  const chantier = useMemo(
    () => chantiers?.find((c) => c.id === id),
    [chantiers, id]
  );

  // Vérifier que l'artisan a bien des tâches sur ce chantier
  const hasAccessToChantier = useMemo(() => {
    if (!monSousTraitantId || !id) return false;
    return taches.some(t => 
      t.chantierid === id && 
      t.assignetype === 'soustraitant' && 
      t.assigneid === monSousTraitantId
    );
  }, [taches, id, monSousTraitantId]);

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
        <p className="text-muted-foreground mb-6">
          Vous n'avez pas accès à ce chantier.
        </p>
        <Button asChild>
          <Link to="/artisan/chantiers">
            <ArrowLeft className="mr-2 h-4 w-4" /> Retour à mes chantiers
          </Link>
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
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <Button variant="outline" size="sm" asChild className="mb-3">
            <Link to="/artisan/chantiers">
              <ArrowLeft className="mr-2 h-4 w-4" /> Retour
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">{chantier.nomchantier}</h1>
        </div>
      </div>

      {/* INFO GÉNÉRALES */}
      <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200 shadow-lg">
        <CardHeader>
          <CardTitle>Informations du Chantier</CardTitle>
        </CardHeader>
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
                {!chantier.adresse && !chantier.codepostal && !chantier.ville && (
                  <span className="text-slate-400">N/A</span>
                )}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TABS */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 gap-2 h-auto p-2">
          <TabsTrigger value="taches" className="flex items-center justify-center">
            <ListChecks className="mr-2 h-4 w-4" /> 
            Mes Tâches
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center justify-center">
            <FolderOpen className="mr-2 h-4 w-4" /> 
            Documents
          </TabsTrigger>
          <TabsTrigger value="nc" className="flex items-center justify-center">
            <AlertTriangle className="mr-2 h-4 w-4" /> 
            Non-Conformités
          </TabsTrigger>
        </TabsList>

        <TabsContent value="taches" className="mt-6">
          <TachesArtisanTab chantierId={id} soustraitantId={monSousTraitantId} />
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <DocumentsArtisanTab chantierId={id} soustraitantId={monSousTraitantId} />
        </TabsContent>

        <TabsContent value="nc" className="mt-6">
          <NonConformitesArtisanTab chantierId={id} soustraitantId={monSousTraitantId} />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}