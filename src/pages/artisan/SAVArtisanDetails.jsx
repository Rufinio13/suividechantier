import React, { useMemo, useState, useEffect } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Calendar, CheckCircle, Camera } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { v4 as uuidv4 } from 'uuid';

export function SAVArtisanDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { demandesSAV, updateSAV, toggleDescriptionLigne } = useSAV();
  const { sousTraitants } = useSousTraitant();
  const { toast } = useToast();

  const [dateIntervention, setDateIntervention] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);

  const monSousTraitantId = useMemo(() => {
    if (!profile?.id || !sousTraitants?.length) return null;
    const myST = sousTraitants.find(st => st.user_id === profile.id);
    return myST?.id || null;
  }, [profile, sousTraitants]);

  const sav = useMemo(
    () => demandesSAV?.find((s) => s.id === id),
    [demandesSAV, id]
  );

  const descriptions = useMemo(() => {
    if (!sav) return [];
    try {
      return typeof sav.description === 'string' 
        ? JSON.parse(sav.description) 
        : sav.description;
    } catch {
      return [{ texte: sav.description || '', checked: false }];
    }
  }, [sav]);

  const nbCoches = useMemo(() => descriptions.filter(d => d.checked).length, [descriptions]);
  const nbTotal = descriptions.length;

  const hasAccess = useMemo(() => {
    if (!sav || !monSousTraitantId) return false;
    return sav.soustraitant_id === monSousTraitantId && !sav.constructeur_valide;
  }, [sav, monSousTraitantId]);

  // ✅ Synchroniser les données depuis sav
  useEffect(() => {
    if (sav?.artisan_date_intervention) {
      setDateIntervention(format(parseISO(sav.artisan_date_intervention), 'yyyy-MM-dd'));
    } else {
      setDateIntervention('');
    }
    
    if (sav?.artisan_commentaire) {
      setCommentaire(sav.artisan_commentaire);
    } else {
      setCommentaire('');
    }
    
    if (sav?.artisan_photos) {
      setPhotos(sav.artisan_photos);
    } else {
      setPhotos([]);
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
        const filePath = fileName;

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

  // ✅ Enregistrement automatique de la date
  const handleDateChange = async (newDate) => {
    setDateIntervention(newDate);

    if (newDate) {
      try {
        await updateSAV(id, {
          artisan_date_intervention: newDate,
        });

        toast({
          title: 'Date enregistrée',
          description: 'Date d\'intervention sauvegardée automatiquement',
        });
      } catch (error) {
        console.error('Erreur sauvegarde date:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de sauvegarder la date',
          variant: 'destructive',
        });
      }
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
          <div className="flex items-center justify-between">
            <CardTitle>Informations</CardTitle>
            <span className={`text-sm font-medium px-3 py-1 rounded ${
              nbCoches === nbTotal 
                ? 'bg-green-100 text-green-700'
                : 'bg-blue-100 text-blue-700'
            }`}>
              {nbCoches}/{nbTotal} terminé{nbTotal > 1 ? 's' : ''}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <span className="font-medium">Client :</span> {sav.nomClient}
          </div>
          <div>
            <span className="font-medium">Date ouverture :</span> {formatDate(sav.dateOuverture)}
          </div>
          
          {/* DESCRIPTIONS AVEC CHECKBOXES */}
          <div>
            <span className="font-medium">Descriptions à traiter :</span>
            <ul className="mt-2 space-y-2">
              {descriptions.map((desc, index) => (
                <li key={index} className="flex items-start gap-2 p-2 bg-white rounded border">
                  <Checkbox
                    id={`desc-${index}`}
                    checked={desc.checked}
                    onCheckedChange={() => toggleDescriptionLigne(sav.id, index)}
                    className="mt-0.5"
                    disabled={sav.artisan_termine}
                  />
                  <label
                    htmlFor={`desc-${index}`}
                    className={`flex-1 text-sm cursor-pointer ${
                      desc.checked ? 'text-green-700 font-medium' : 'text-slate-700'
                    }`}
                  >
                    {desc.texte}
                  </label>
                </li>
              ))}
            </ul>
          </div>
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

      {/* ✅ PLANIFIER INTERVENTION - ENREGISTREMENT AUTO */}
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
              <Input
                id="dateIntervention"
                type="date"
                value={dateIntervention}
                onChange={(e) => handleDateChange(e.target.value)}
                className="mt-2"
              />
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