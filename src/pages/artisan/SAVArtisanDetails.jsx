import React, { useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useSAV } from '@/context/SAVContext';
import { useSousTraitant } from '@/context/SousTraitantContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Calendar, CheckCircle, Camera, Upload } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { v4 as uuidv4 } from 'uuid';

export function SAVArtisanDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { demandesSAV, updateSAV } = useSAV();
  const { sousTraitants } = useSousTraitant();
  const { toast } = useToast();

  const [dateIntervention, setDateIntervention] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Trouver l'ID du sous-traitant
  const monSousTraitantId = useMemo(() => {
    if (!profile?.id || !sousTraitants?.length) return null;
    const myST = sousTraitants.find(st => st.user_id === profile.id);
    return myST?.id || null;
  }, [profile, sousTraitants]);

  const sav = useMemo(
    () => demandesSAV?.find((s) => s.id === id),
    [demandesSAV, id]
  );

  // Vérifier accès
  const hasAccess = useMemo(() => {
    if (!sav || !monSousTraitantId) return false;
    return sav.soustraitant_id === monSousTraitantId && !sav.constructeur_valide;
  }, [sav, monSousTraitantId]);

  // Init date intervention si déjà définie
  React.useEffect(() => {
    if (sav?.artisan_date_intervention) {
      setDateIntervention(format(parseISO(sav.artisan_date_intervention), 'yyyy-MM-dd'));
    }
    if (sav?.artisan_commentaire) {
      setCommentaire(sav.artisan_commentaire);
    }
    if (sav?.artisan_photos) {
      setPhotos(sav.artisan_photos);
    }
  }, [sav]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(parseISO(dateString), 'dd MMMM yyyy', { locale: fr });
    } catch {
      return 'Date invalide';
    }
  };

  const handlePhotoUpload = async (files) => {
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      const uploadedUrls = [];

      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `sav_${id}_${uuidv4()}.${fileExt}`;
        const filePath = fileName; // ✅ Directement à la racine

        const { data, error } = await supabase.storage
          .from('photos-reprises')
          .upload(filePath, file);

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from('photos-reprises')
          .getPublicUrl(filePath);

        uploadedUrls.push({ url: urlData.publicUrl, name: file.name });
      }

      setPhotos(prev => [...prev, ...uploadedUrls]);

      toast({
        title: 'Photos ajoutées',
        description: `${uploadedUrls.length} photo(s) uploadée(s)`,
      });
    } catch (error) {
      console.error('Erreur upload photos:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'uploader les photos',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveDateIntervention = async () => {
    if (!dateIntervention) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner une date',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateSAV(id, {
        ...sav,
        artisan_date_intervention: dateIntervention,
      });

      toast({
        title: 'Date enregistrée',
        description: 'Date d\'intervention sauvegardée',
      });
    } catch (error) {
      console.error('Erreur sauvegarde date:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder la date',
        variant: 'destructive',
      });
    }
  };

  const handleMarquerTermine = async () => {
    if (!commentaire.trim()) {
      toast({
        title: 'Commentaire requis',
        description: 'Veuillez ajouter un commentaire avant de terminer',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateSAV(id, {
        ...sav,
        artisan_termine: true,
        artisan_termine_date: new Date().toISOString(),
        artisan_commentaire: commentaire,
        artisan_photos: photos,
      });

      toast({
        title: 'Intervention terminée',
        description: 'Le constructeur sera notifié',
      });

      navigate('/artisan/sav');
    } catch (error) {
      console.error('Erreur marquage terminé:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de marquer comme terminé',
        variant: 'destructive',
      });
    }
  };

  if (!sav) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-bold">SAV non trouvé</h2>
        <Button asChild className="mt-4">
          <Link to="/artisan/sav">
            <ArrowLeft className="mr-2 h-4 w-4" />Retour
          </Link>
        </Button>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-bold">Accès refusé</h2>
        <p className="text-muted-foreground mt-2">
          Vous n'avez pas accès à ce SAV
        </p>
        <Button asChild className="mt-4">
          <Link to="/artisan/sav">
            <ArrowLeft className="mr-2 h-4 w-4" />Retour
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
      <div>
        <Button variant="outline" size="sm" asChild className="mb-3">
          <Link to="/artisan/sav">
            <ArrowLeft className="mr-2 h-4 w-4" /> Retour
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Détails SAV</h1>
      </div>

      {/* INFO SAV */}
      <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
        <CardHeader>
          <CardTitle>Informations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <span className="font-medium">Client :</span> {sav.nomClient}
          </div>
          <div>
            <span className="font-medium">Date ouverture :</span> {formatDate(sav.dateOuverture)}
          </div>
          <div>
            <span className="font-medium">Description :</span>
            <p className="mt-1 text-slate-700">{sav.description}</p>
          </div>
          {sav.notes && (
            <div>
              <span className="font-medium">Notes :</span>
              <p className="mt-1 text-slate-600 text-xs">{sav.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* STATUT TERMINÉ */}
      {sav.artisan_termine && (
        <Card className="bg-yellow-50 border-yellow-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <CheckCircle className="h-5 w-5" />
              Intervention terminée
            </CardTitle>
            <CardDescription className="text-yellow-700">
              En attente de validation par le constructeur
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* PLANIFIER INTERVENTION */}
      {!sav.artisan_termine && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Planifier l'intervention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="dateIntervention">Date d'intervention prévue</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="dateIntervention"
                  type="date"
                  value={dateIntervention}
                  onChange={(e) => setDateIntervention(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleSaveDateIntervention}>
                  Enregistrer
                </Button>
              </div>
            </div>

            {sav.artisan_date_intervention && (
              <p className="text-sm text-blue-600">
                ✓ Intervention planifiée le {formatDate(sav.artisan_date_intervention)}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* TERMINER INTERVENTION */}
      {!sav.artisan_termine && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Terminer l'intervention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="commentaire">Commentaire (obligatoire)</Label>
              <Textarea
                id="commentaire"
                placeholder="Décrivez l'intervention effectuée..."
                rows={4}
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                className="mt-2"
              />
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Photos (optionnel)
              </Label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handlePhotoUpload(Array.from(e.target.files))}
                className="mt-2 text-sm"
                disabled={uploading}
              />
              {photos.length > 0 && (
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {photos.map((photo, i) => (
                    <img 
                      key={i} 
                      src={photo.url} 
                      alt={`Photo ${i+1}`}
                      className="h-20 w-20 object-cover rounded border"
                    />
                  ))}
                </div>
              )}
            </div>

            <Button 
              onClick={handleMarquerTermine}
              className="w-full bg-green-600 hover:bg-green-700"
              disabled={uploading}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Marquer comme terminé
            </Button>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}