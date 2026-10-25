import React, { useMemo, useState } from 'react';
import { useSAV } from '@/context/SAVContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AlertTriangle, CheckCircle, Camera, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { StorageImage } from '@/components/StorageImage.jsx';
import { openStorageFile } from '@/lib/storage';

// Même parcours que les non-conformités : planifier (date) → terminer (commentaire + photos) → validation constructeur
export function SAVArtisanCard({ sav }) {
  const { updateSAV } = useSAV();
  const { toast } = useToast();

  const [dateIntervention, setDateIntervention] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const descriptions = useMemo(() => {
    try {
      const parsed = typeof sav.description === 'string'
        ? JSON.parse(sav.description)
        : sav.description;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return sav.description ? [{ texte: sav.description }] : [];
    }
  }, [sav.description]);

  const estPlanifie = !!sav.artisan_date_intervention;

  const formatDateOnly = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(parseISO(dateString), 'dd MMM yyyy', { locale: fr });
    } catch (error) {
      return 'Date invalide';
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy HH:mm', { locale: fr });
    } catch (error) {
      return 'Date invalide';
    }
  };

  // Planifier l'intervention
  const handlePlanifier = async () => {
    if (!dateIntervention) {
      toast({
        title: 'Date requise',
        description: 'Veuillez sélectionner une date d\'intervention',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      await updateSAV(sav.id, {
        artisan_date_intervention: dateIntervention,
      });

      toast({
        title: 'Intervention planifiée',
        description: `Date : ${formatDateOnly(dateIntervention)}`,
      });

      setDateIntervention('');
    } catch (error) {
      console.error('Erreur planification SAV:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de planifier l\'intervention',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (files) => {
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      const uploadedUrls = [];

      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `sav_${sav.id}_${uuidv4()}.${fileExt}`;
        const filePath = fileName;

        const { error } = await supabase.storage
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

  // Marquer l'intervention comme terminée
  const handleMarquerTermine = async () => {
    if (!commentaire.trim()) return;

    setSaving(true);

    try {
      await updateSAV(sav.id, {
        artisan_termine: true,
        artisan_termine_date: new Date().toISOString(),
        artisan_commentaire: commentaire,
        artisan_photos: photos,
      });

      toast({
        title: 'Intervention terminée',
        description: 'Le constructeur sera notifié',
      });

      setCommentaire('');
      setPhotos([]);
    } catch (error) {
      console.error('Erreur marquage terminé SAV:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de marquer comme terminé',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      className={`${
        sav.artisan_termine
          ? 'bg-yellow-50 border-yellow-300'
          : estPlanifie
          ? 'bg-blue-50 border-blue-200'
          : 'bg-orange-50 border-orange-200'
      }`}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex flex-wrap items-center justify-between gap-2">
          <span className="min-w-0 break-words">{sav.nomClient}</span>
          {sav.artisan_termine ? (
            <span className="text-xs bg-yellow-500 text-white px-2 py-1 rounded-full font-normal flex-shrink-0">
              <CheckCircle className="inline h-3 w-3 mr-1" />
              En attente validation
            </span>
          ) : estPlanifie ? (
            <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full font-normal flex-shrink-0">
              <Calendar className="inline h-3 w-3 mr-1" />
              Planifiée
            </span>
          ) : (
            <span className="text-xs bg-orange-500 text-white px-2 py-1 rounded-full font-normal flex-shrink-0">
              <AlertTriangle className="inline h-3 w-3 mr-1" />
              À planifier
            </span>
          )}
        </CardTitle>
        <CardDescription className="text-xs">
          Ouvert le {formatDateOnly(sav.dateOuverture)}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* INFORMATIONS SAV */}
        <div className="p-3 bg-white rounded-md border space-y-2 text-sm">
          <div className="font-medium text-slate-900">Informations</div>

          {descriptions.length > 0 && (
            <div>
              <span className="text-xs font-medium text-slate-600">Description :</span>
              <ul className="mt-1 list-disc list-inside space-y-1">
                {descriptions.map((desc, i) => (
                  <li key={i} className="text-sm text-slate-700 break-words">{desc.texte}</li>
                ))}
              </ul>
            </div>
          )}

          {sav.datePrevisionnelle && (
            <div>
              <span className="text-xs font-medium text-slate-600">Date prévisionnelle (constructeur) :</span>
              <span className="text-sm text-orange-700 font-medium ml-2">
                {formatDateOnly(sav.datePrevisionnelle)}
              </span>
            </div>
          )}

          {sav.artisan_date_intervention && (
            <div>
              <span className="text-xs font-medium text-slate-600">Date intervention prévue :</span>
              <span className="text-sm text-blue-700 font-medium ml-2">
                {formatDateOnly(sav.artisan_date_intervention)}
              </span>
            </div>
          )}
        </div>

        {/* PLANIFIER L'INTERVENTION */}
        {!estPlanifie && !sav.artisan_termine && (
          <div className="p-3 bg-white rounded-md border">
            <div className="font-medium text-sm text-slate-900 mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              Planifier l'intervention
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor={`date-${sav.id}`} className="text-xs">
                  Date d'intervention prévue *
                </Label>
                <Input
                  id={`date-${sav.id}`}
                  type="date"
                  value={dateIntervention}
                  onChange={(e) => setDateIntervention(e.target.value)}
                  className="mt-2"
                />
              </div>

              <Button
                onClick={handlePlanifier}
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={!dateIntervention || saving}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        )}

        {/* INTERVENTION TERMINÉE */}
        {sav.artisan_termine && (
          <div className="p-3 bg-yellow-100 border border-yellow-300 rounded-md">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-yellow-700" />
              <span className="text-sm font-semibold text-yellow-800">
                Intervention terminée le {formatDateTime(sav.artisan_termine_date)}
              </span>
            </div>
            <p className="text-xs text-yellow-700">
              En attente de validation par le constructeur
            </p>

            {sav.artisan_commentaire && (
              <div className="mt-3 p-2 bg-white/50 rounded">
                <p className="text-xs font-medium text-slate-700">💬 Commentaire :</p>
                <p className="text-sm text-slate-800 mt-1 whitespace-pre-wrap">{sav.artisan_commentaire}</p>
              </div>
            )}

            {sav.artisan_photos && sav.artisan_photos.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-slate-700 mb-2">📸 Photos intervention :</p>
                <div className="grid grid-cols-4 gap-2">
                  {sav.artisan_photos.map((photo, i) => (
                    <StorageImage
                      key={i}
                      src={photo.url || photo}
                      alt={`Intervention ${i+1}`}
                      className="h-20 w-20 object-cover rounded border cursor-pointer hover:opacity-80"
                      onClick={() => openStorageFile(photo.url || photo)}
                      title="Cliquer pour télécharger"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TERMINER L'INTERVENTION */}
        {estPlanifie && !sav.artisan_termine && (
          <div className="p-3 bg-white rounded-md border">
            <div className="font-medium text-sm text-slate-900 mb-3 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Terminer l'intervention
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor={`commentaire-${sav.id}`} className="text-xs">
                  Commentaire (obligatoire)
                </Label>
                <Textarea
                  id={`commentaire-${sav.id}`}
                  placeholder="Décrivez l'intervention effectuée..."
                  rows={3}
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label className="text-xs flex items-center gap-2">
                  <Camera className="h-3 w-3" />
                  Photos de l'intervention (optionnel)
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
                      <StorageImage
                        key={i}
                        src={photo.url}
                        alt={`Upload ${i+1}`}
                        className="h-20 w-20 object-cover rounded border"
                      />
                    ))}
                  </div>
                )}
              </div>

              <Button
                onClick={handleMarquerTermine}
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={!commentaire.trim() || uploading || saving}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                {saving ? 'Enregistrement...' : 'Marquer comme terminée'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
