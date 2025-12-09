import React, { useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useChantier } from '@/context/ChantierContext.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, Edit, Trash2, Users, Truck, FileText, CheckSquare, ListChecks, 
  MessageSquare, User, Phone, Mail, ExternalLink, Info, MapPin 
} from 'lucide-react';
import { ChantierForm } from '@/components/ChantierForm.jsx';
import { Planning } from '@/pages/Planning.jsx';
import { ControlQualite } from '@/pages/ControlQualite.jsx';
import { CompteRendu } from '@/pages/CompteRendu.jsx';
import { ChantierCommentaires } from '@/pages/ChantierCommentaires.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export function ChantierDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    chantiers,
    deleteChantier,
    updateChantier,
    loading,
    sousTraitants = [],
    fournisseurs = [],
    taches = [],
    lots = []
  } = useChantier();

  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("planning");

  const chantier = useMemo(
    () => chantiers?.find((c) => c.id === id),
    [chantiers, id]
  );

  // -------- ARTISANS ASSIGNÉS -------------
  const chantierSousTraitants = useMemo(() => {
    if (!chantier) return [];

    const ids = new Set(
      taches
        ?.filter(t => t.chantierid === chantier.id && t.assignetype === "soustraitant")
        ?.map(t => t.assigneid)
    );

    return sousTraitants.filter(st => ids.has(st.id));
  }, [chantier, taches, sousTraitants]);

  // -------- FOURNISSEURS ASSIGNÉS -------------
  const chantierFournisseurs = useMemo(() => {
    if (!chantier) return [];

    const ids = new Set(
      taches
        ?.filter(t => t.chantierid === chantier.id && t.assignetype === "fournisseur")
        ?.map(t => t.assigneid)
    );

    return fournisseurs.filter(f => ids.has(f.id));
  }, [chantier, taches, fournisseurs]);

  // -------- TÂCHES PAR FOURNISSEUR -------------
  const getTachesForFournisseur = (fid) => {
    return taches
      .filter(
        t =>
          t.chantierid === chantier?.id &&
          t.assignetype === "fournisseur" &&
          t.assigneid === fid
      )
      .sort((a, b) => {
        const da = a?.datedebut ? parseISO(a.datedebut) : 0;
        const db = b?.datedebut ? parseISO(b.datedebut) : 0;
        return da - db;
      });
  };

  const formatDate = (d) => {
    if (!d) return "N/A";
    try {
      return format(parseISO(d), "dd MMMM yyyy", { locale: fr });
    } catch {
      return "Date invalide";
    }
  };

  const handleDelete = () => {
    if (window.confirm(`Supprimer le chantier "${chantier?.nomchantier}" ?`)) {
      deleteChantier(id);
      navigate("/chantiers");
    }
  };

  if (loading)
    return <div className="flex justify-center items-center h-64">Chargement...</div>;

  if (!chantier)
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <h2 className="text-2xl font-bold mb-2">Chantier non trouvé</h2>
        <p className="text-muted-foreground mb-6">
          Le chantier que vous recherchez n'existe pas ou a été supprimé.
        </p>
        <Button asChild>
          <Link to="/chantiers">
            <ArrowLeft className="mr-2 h-4 w-4" /> Retour
          </Link>
        </Button>
      </div>
    );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >

      {isEditing ? (
        <ChantierForm chantier={chantier} onSuccess={() => setIsEditing(false)} />
      ) : (
        <>
          {/* HEADER */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div>
              <Button variant="outline" size="sm" asChild className="mb-3">
                <Link to="/chantiers">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Retour
                </Link>
              </Button>
              <h1 className="text-3xl font-bold tracking-tight">{chantier.nomchantier}</h1>
            </div>

            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" /> Modifier
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" /> Supprimer
              </Button>
            </div>
          </div>

          {/* INFO GÉNÉRALES */}
          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200 shadow-lg">
            <CardHeader>
              <CardTitle>Informations Générales</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="flex items-center">
                  <User className="mr-3 h-5 w-5 text-primary" />
                  <span className="font-medium">Client :</span>
                  &nbsp;{chantier.client_prenom} {chantier.client_nom}
                </div>

                <div className="flex items-center">
                  <Phone className="mr-3 h-5 w-5 text-green-600" />
                  <span className="font-medium">Téléphone :</span>
                  &nbsp;{chantier.client_tel || "N/A"}
                </div>

                <div className="flex items-center">
                  <Mail className="mr-3 h-5 w-5 text-red-600" />
                  <span className="font-medium">Email :</span>
                  &nbsp;{chantier.client_mail || "N/A"}
                </div>

                <div className="flex items-start">
                  <MapPin className="mr-3 h-5 w-5 text-primary" />
                  <span className="font-medium">Adresse :</span>
                  &nbsp;{chantier.adresse || "N/A"}
                </div>

                {chantier.description && (
                  <div className="md:col-span-2 lg:col-span-3 flex items-start pt-2 mt-2 border-t">
                    <Info className="mr-3 h-5 w-5 text-slate-500 mt-1" />
                    <p className="text-slate-600 whitespace-pre-wrap">
                      {chantier.description}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* TABS - SANS L'ONGLET DOCUMENTS */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="overflow-x-auto inline-flex w-max">
              <TabsTrigger value="planning">
                <ListChecks className="mr-2 h-4 w-4" /> Planning
              </TabsTrigger>
              <TabsTrigger value="controle-qualite">
                <CheckSquare className="mr-2 h-4 w-4" /> Contrôle Qualité
              </TabsTrigger>
              <TabsTrigger value="compte-rendu">
                <FileText className="mr-2 h-4 w-4" /> Compte Rendu
              </TabsTrigger>
              <TabsTrigger value="commentaires">
                <MessageSquare className="mr-2 h-4 w-4" /> Commentaires
              </TabsTrigger>
            </TabsList>

            <TabsContent value="planning" className="mt-6">
              <Planning isEmbedded embeddedChantierId={chantier.id} />
            </TabsContent>

            <TabsContent value="controle-qualite" className="mt-6">
              <ControlQualite isEmbedded embeddedChantierId={chantier.id} />
            </TabsContent>

            <TabsContent value="compte-rendu" className="mt-6">
              <CompteRendu isEmbedded embeddedChantierId={chantier.id} />
            </TabsContent>

            <TabsContent value="commentaires" className="mt-6">
              <ChantierCommentaires isEmbedded embeddedChantierId={chantier.id} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </motion.div>
  );
}