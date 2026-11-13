import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useChantier } from '@/context/ChantierContext.jsx';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, Edit, Trash2, ListChecks, CheckSquare, FileText, 
  User, Phone, Mail, MapPin, Package, FolderOpen, Briefcase, Camera
} from 'lucide-react';
import { PhotosTab, usePhotosChantier, estPhotoNonVue } from '@/components/photos/PhotosTab';
import { usePhotosVues } from '@/hooks/usePhotosVues';
import { usePhotosLibres } from '@/hooks/usePhotosLibres';
import { useAuth } from '@/hooks/useAuth';
import { ChantierForm } from '@/components/ChantierForm.jsx';
import { Planning } from '@/pages/Planning.jsx';
import { ControlQualite } from '@/pages/ControlQualite.jsx';
import { CompteRendu } from '@/pages/CompteRendu.jsx';
import { Commandes } from '@/pages/Commandes.jsx';
import { DocumentsTab } from '@/components/planning/DocumentsTab';
import { MarchesTravaux } from '@/components/planning/MarchesTravaux';

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

  // ✅ Notifications photos : point rouge tant que l'onglet Photos n'a pas été ouvert
  const { profile } = useAuth();
  const { photosLibres, changerLotPhotoLibre } = usePhotosLibres(id);
  const { photos: photosChantier } = usePhotosChantier(id, photosLibres);
  const {
    vuAt: photosVuAt,
    charge: photosVuesChargees,
    actif: notifsPhotosActives,
    marquerVu: marquerPhotosVues,
  } = usePhotosVues(id);
  const [photosVuAtPrecedent, setPhotosVuAtPrecedent] = useState(null);
  const visitePhotosEnregistree = useRef(false);

  useEffect(() => {
    if (activeTab !== "photos") {
      visitePhotosEnregistree.current = false;
      return;
    }
    if (!photosVuesChargees || visitePhotosEnregistree.current) return;
    visitePhotosEnregistree.current = true;
    // On garde la date de la visite précédente pour marquer les nouvelles photos pendant cette visite
    setPhotosVuAtPrecedent(photosVuAt);
    marquerPhotosVues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, photosVuesChargees]);

  const nbPhotosNonVues = notifsPhotosActives && activeTab !== "photos"
    ? photosChantier.filter((p) => estPhotoNonVue(p, photosVuAt, profile?.id)).length
    : 0;

  const chantier = useMemo(
    () => chantiers?.find((c) => c.id === id),
    [chantiers, id]
  );

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
          {/* EN-TÊTE COMPACT */}
          <div className="rounded-xl border bg-white shadow-sm p-4 sm:p-5 space-y-3">
            <div className="flex items-start gap-3">
              <Button variant="ghost" size="icon" asChild className="shrink-0 -ml-2" title="Retour aux chantiers">
                <Link to="/chantiers"><ArrowLeft className="h-5 w-5" /></Link>
              </Button>
              <h1 className="flex-1 min-w-0 text-2xl font-bold tracking-tight break-words pt-0.5">{chantier.nomchantier}</h1>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Modifier</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                  title="Supprimer le chantier"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600 sm:pl-10">
              <span className="flex items-center gap-2">
                <User className="h-4 w-4 text-slate-400" />
                {[chantier.client_prenom, chantier.client_nom].filter(Boolean).join(' ') || <span className="text-slate-400">Client non renseigné</span>}
              </span>
              {chantier.client_tel && (
                <a href={`tel:${chantier.client_tel}`} className="flex items-center gap-2 hover:text-primary">
                  <Phone className="h-4 w-4 text-slate-400" />{chantier.client_tel}
                </a>
              )}
              {chantier.client_mail && (
                <a href={`mailto:${chantier.client_mail}`} className="flex items-center gap-2 hover:text-primary break-all">
                  <Mail className="h-4 w-4 text-slate-400 shrink-0" />{chantier.client_mail}
                </a>
              )}
              {[chantier.adresse, [chantier.codepostal, chantier.ville].filter(Boolean).join(' ')].filter(Boolean).join(', ') && (
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-400 shrink-0" />{[chantier.adresse, [chantier.codepostal, chantier.ville].filter(Boolean).join(' ')].filter(Boolean).join(', ')}
                </span>
              )}
            </div>

            {chantier.description && (
              <p className="text-sm text-slate-500 whitespace-pre-wrap border-t pt-3 sm:pl-10">{chantier.description}</p>
            )}
          </div>

          {/* ONGLETS EN TUILES */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7 gap-2 h-auto bg-transparent p-0">
              {[
                { value: "planning", label: "Planning", icon: ListChecks },
                { value: "commandes", label: "Commandes", icon: Package },
                { value: "documents", label: "Documents", icon: FolderOpen },
                { value: "marches", label: "Marchés", icon: Briefcase },
                { value: "controle-qualite", label: "Contrôle qualité", court: "Qualité", icon: CheckSquare },
                { value: "compte-rendu", label: "Compte rendu", court: "C. rendu", icon: FileText },
                { value: "photos", label: "Photos", icon: Camera, badge: nbPhotosNonVues },
              ].map(({ value, label, court, icon: Icon, badge }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="relative flex flex-col items-center justify-center gap-1.5 h-auto min-h-[68px] px-1 py-3 rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm whitespace-normal text-center transition-colors hover:border-primary/50 hover:text-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary data-[state=active]:shadow-md"
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs sm:text-sm font-medium leading-tight">
                    {court ? (
                      <>
                        <span className="sm:hidden">{court}</span>
                        <span className="hidden sm:inline">{label}</span>
                      </>
                    ) : label}
                  </span>
                  {badge > 0 && (
                    <span
                      className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center ring-2 ring-white"
                      title={`${badge} nouvelle(s) photo(s)`}
                    >
                      {badge}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="planning" className="mt-6">
              <Planning isEmbedded embeddedChantierId={chantier.id} />
            </TabsContent>

            <TabsContent value="commandes" className="mt-6">
              <Commandes isEmbedded embeddedChantierId={chantier.id} />
            </TabsContent>

            <TabsContent value="documents" className="mt-6">
              <DocumentsTab chantierId={chantier.id} />
            </TabsContent>

            <TabsContent value="marches" className="mt-6">
              <MarchesTravaux chantierId={chantier.id} />
            </TabsContent>

            <TabsContent value="controle-qualite" className="mt-6">
              <ControlQualite isEmbedded embeddedChantierId={chantier.id} />
            </TabsContent>

            <TabsContent value="compte-rendu" className="mt-6">
              <CompteRendu isEmbedded embeddedChantierId={chantier.id} />
            </TabsContent>

            <TabsContent value="photos" className="mt-6">
              <PhotosTab
                chantierId={chantier.id}
                vuAtPrecedent={photosVuAtPrecedent}
                notificationsActives={notifsPhotosActives}
                photosLibres={photosLibres}
                changerLotPhotoLibre={changerLotPhotoLibre}
              />
            </TabsContent>
          </Tabs>
        </>
      )}
    </motion.div>
  );
}