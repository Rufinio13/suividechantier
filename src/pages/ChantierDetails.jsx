import React, { useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useChantier } from '@/context/ChantierContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Edit, Trash2, Users, Truck, FileText, CheckSquare, ListChecks, MessageSquare, User, Phone, Mail, Plus, ExternalLink, Info, MapPin } from 'lucide-react';
import { ChantierForm } from '@/components/ChantierForm';
import { Planning } from '@/pages/Planning';
import { ControlQualite } from '@/pages/ControlQualite';
import { CompteRendu } from '@/pages/CompteRendu';
import { Documents } from '@/pages/Documents';
import { ChantierCommentaires } from '@/pages/ChantierCommentaires';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';



export function ChantierDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { chantiers, deleteChantier, updateChantier, loading, sousTraitants, fournisseurs, taches, lots } = useChantier();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("planning");

  const chantier = useMemo(() => chantiers.find(c => c.id === id), [chantiers, id]);

  const chantierSousTraitants = useMemo(() => {
    if (!chantier || !taches || !sousTraitants) return [];
    const stIdsInChantier = new Set(
      taches
        .filter(t => t.chantierId === chantier.id && t.assigneType === 'soustraitant' && t.assigneId)
        .map(t => t.assigneId)
    );
    return sousTraitants.filter(st => stIdsInChantier.has(st.id));
  }, [chantier, taches, sousTraitants]);

  const chantierFournisseurs = useMemo(() => {
    if (!chantier || !taches || !fournisseurs) return [];
    const fournisseurIdsInChantier = new Set(
      taches
        .filter(t => t.chantierId === chantier.id && t.assigneType === 'fournisseur' && t.assigneId)
        .map(t => t.assigneId)
    );
    return fournisseurs.filter(f => fournisseurIdsInChantier.has(f.id));
  }, [chantier, taches, fournisseurs]);

  const getTachesForFournisseur = (fournisseurId) => {
    return taches.filter(t => t.chantierId === chantier.id && t.assigneType === 'fournisseur' && t.assigneId === fournisseurId)
                 .sort((a, b) => (parseISO(a.dateDebut) || 0) - (parseISO(b.dateDebut) || 0));
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(parseISO(dateString), 'dd MMMM yyyy', { locale: fr });
    } catch (error) {
      return 'Date invalide';
    }
  };

  const handleStatutChange = (newStatut) => {
    if (chantier) {
      updateChantier(chantier.id, { ...chantier, statut: newStatut });
    }
  };


  if (loading) {
    return <div className="flex justify-center items-center h-64">Chargement...</div>;
  }

  if (!chantier && !isEditing) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <h2 className="text-2xl font-bold mb-2">Chantier non trouvé</h2>
        <p className="text-muted-foreground mb-6">Le chantier que vous recherchez n'existe pas ou a été supprimé.</p>
        <Button asChild>
          <Link to="/chantiers">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à la liste des chantiers
          </Link>
        </Button>
      </div>
    );
  }

  const handleDelete = () => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le chantier "${chantier?.nom}" ? Cette action est irréversible.`)) {
      deleteChantier(id);
      navigate('/chantiers');
    }
  };

  const handleEditSuccess = () => {
    setIsEditing(false);
  };
  

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {isEditing && chantier ? (
        <ChantierForm
          chantier={chantier}
          onSuccess={handleEditSuccess}
        />
      ) : chantier ? (
        <>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div>
              <Button variant="outline" size="sm" asChild className="mb-3">
                <Link to="/chantiers">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Retour aux chantiers
                </Link>
              </Button>
              <h1 className="text-3xl font-bold tracking-tight">{chantier.nom}</h1>
               </div>
            <div className="flex space-x-2 flex-shrink-0">
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" /> Modifier
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" /> Supprimer
              </Button>
            </div>
          </div>

          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200 shadow-lg">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl">Informations Générales</CardTitle>
                <div className="w-[180px]">
                  <Select value={chantier.statut || ''} onValueChange={handleStatutChange}>
                    <SelectTrigger id="statut-chantier-details">
                      <SelectValue placeholder="Définir statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="En cours">En cours</SelectItem>
                      <SelectItem value="Réceptionné">Réceptionné</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                <div className="flex items-center">
                  <User className="mr-3 h-5 w-5 text-primary" />
                  <div>
                    <span className="font-medium">Client:</span> {chantier.prenomClient} {chantier.nomClient}
                  </div>
                </div>
                <div className="flex items-center">
                  <Phone className="mr-3 h-5 w-5 text-green-600" />
                  <div>
                    <span className="font-medium">Téléphone:</span> {chantier.telClient || 'N/A'}
                  </div>
                </div>
                <div className="flex items-center">
                  <Mail className="mr-3 h-5 w-5 text-red-600" />
                  <div>
                    <span className="font-medium">Email:</span> {chantier.mailClient || 'N/A'}
                  </div>
                </div>
                <div className="flex items-start">
                  <MapPin className="mr-3 h-5 w-5 text-primary" />
                  <div>
                    <span className="font-medium">Adresse:</span> {chantier.adresse || 'N/A'}
                  </div>
                </div>
                {chantier.description && (
                  <div className="md:col-span-2 lg:col-span-3 flex items-start pt-2 mt-2 border-t border-slate-200/60">
                    <Info className="mr-3 h-5 w-5 text-slate-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium">Description:</span>
                      <p className="text-slate-600 whitespace-pre-wrap">{chantier.description}</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-200/60">
                  <Button variant="outline" size="sm" onClick={() => setActiveTab('sous-traitants')}>
                      <Users className="mr-2 h-4 w-4" /> Artisans ({chantierSousTraitants.length})
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab('fournisseurs')}>
                      <Truck className="mr-2 h-4 w-4" /> Fournisseurs ({chantierFournisseurs.length})
                  </Button>
              </div>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="overflow-x-auto pb-2">
                <TabsList className="inline-flex w-max">
                  <TabsTrigger value="planning"><ListChecks className="mr-2 h-4 w-4" />Planning</TabsTrigger>
                  <TabsTrigger value="controle-qualite"><CheckSquare className="mr-2 h-4 w-4" />Contrôle Qualité</TabsTrigger>
                  <TabsTrigger value="compte-rendu"><FileText className="mr-2 h-4 w-4" />Compte Rendu</TabsTrigger>
                  <TabsTrigger value="documents"><FileText className="mr-2 h-4 w-4" />Documents</TabsTrigger>
                  <TabsTrigger value="commentaires"><MessageSquare className="mr-2 h-4 w-4" />Commentaires</TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="planning" className="mt-6">
              <Planning isEmbedded={true} embeddedChantierId={id} />
            </TabsContent>
            <TabsContent value="controle-qualite" className="mt-6">
              <ControlQualite isEmbedded={true} embeddedChantierId={id} />
            </TabsContent>
            <TabsContent value="compte-rendu" className="mt-6">
              <CompteRendu isEmbedded={true} embeddedChantierId={id} />
            </TabsContent>
            <TabsContent value="documents" className="mt-6">
              <Documents isEmbedded={true} embeddedChantierId={id} />
            </TabsContent>
            <TabsContent value="commentaires" className="mt-6">
              <ChantierCommentaires isEmbedded={true} embeddedChantierId={id} />
            </TabsContent>
            
            <TabsContent value="sous-traitants" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Artisans Intervenant sur ce Chantier</CardTitle>
                  <CardDescription>Liste des artisans assignés à des tâches sur ce chantier.</CardDescription>
                </CardHeader>
                <CardContent>
                  {chantierSousTraitants.length > 0 ? (
                    <ul className="space-y-3">
                      {chantierSousTraitants.map(st => (
                        <li key={st.id} className="p-3 border rounded-md bg-slate-50 flex justify-between items-center">
                          <div>
                            <span className="font-medium text-primary">
                              {st.nomSociete || `${st.nomDirigeant} ${st.prenomDirigeant}`.trim()}
                            </span>
                            <p className="text-sm text-muted-foreground">{st.email} - {st.telephone}</p>
                          </div>
                           <Button variant="ghost" size="sm" asChild>
                                <Link to={`/sous-traitant-details/${st.id}`}>
                                    Voir <ExternalLink className="ml-2 h-3 w-3" />
                                </Link>
                            </Button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">Aucun artisan assigné à ce chantier pour le moment.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="fournisseurs" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Fournisseurs pour ce Chantier</CardTitle>
                  <CardDescription>Liste des fournisseurs dont les produits/matériaux sont utilisés sur ce chantier.</CardDescription>
                </CardHeader>
                <CardContent>
                  {chantierFournisseurs.length > 0 ? (
                    <ul className="space-y-4">
                      {chantierFournisseurs.map(f => {
                        const tachesDuFournisseur = getTachesForFournisseur(f.id);
                        return (
                          <li key={f.id} className="p-4 border rounded-lg bg-white shadow-sm">
                            <h3 className="font-semibold text-md text-blue-700">{f.nomSociete}</h3>
                            <p className="text-sm text-muted-foreground">{f.nomContact} - {f.email} - {f.telephone}</p>
                            {tachesDuFournisseur.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-slate-200">
                                <h4 className="text-xs font-medium text-slate-600 mb-1">Tâches associées :</h4>
                                <ul className="list-disc list-inside space-y-0.5 pl-1">
                                  {tachesDuFournisseur.map(tache => {
                                    const lotAssocie = lots.find(l => l.id === tache.lotId);
                                    return (
                                      <li key={tache.id} className="text-xs text-slate-500">
                                        {tache.nom} ({lotAssocie?.nom || 'Lot non spécifié'}) - Prévu du {formatDate(tache.dateDebut)} au {formatDate(tache.dateFin)}
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            )}
                            {tachesDuFournisseur.length === 0 && (
                                <p className="text-xs text-slate-400 italic mt-1">Aucune tâche spécifique assignée à ce fournisseur sur ce chantier.</p>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">Aucun fournisseur assigné à ce chantier pour le moment.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </>
      ) : null}
    </motion.div>
  );
}