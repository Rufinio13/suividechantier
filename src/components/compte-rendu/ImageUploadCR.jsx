import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, X, Eye, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export function ImageUploadCR({ 
  chantierId, 
  photos = [], 
  onPhotosChange 
}) {
  const { profile } = useAuth();
  const nomsociete = profile?.nomsociete;

  const [uploading, setUploading] = useState(false);
  const [viewingImage, setViewingImage] = useState(null);

  // =========================================
  // UPLOAD PHOTOS
  // =========================================
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    const newPhotos = [];

    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${nomsociete}/${chantierId}/compte-rendu/${fileName}`;

        console.log('📤 Upload photo CR:', filePath);

        const { data, error } = await supabase.storage
          .from('controle-qualite-images')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          console.error('❌ Erreur upload:', error);
          throw error;
        }

        // Générer URL publique
        const { data: { publicUrl } } = supabase.storage
          .from('controle-qualite-images')
          .getPublicUrl(filePath);

        newPhotos.push({
          url: publicUrl,
          nom: fileName,
          description: '',
          uploadedAt: new Date().toISOString()
        });

        console.log('✅ Photo uploadée:', publicUrl);
      }

      // Ajouter les nouvelles photos
      onPhotosChange([...photos, ...newPhotos]);

    } catch (error) {
      console.error('❌ Erreur upload photos:', error);
      alert('Erreur lors de l\'upload des photos');
    } finally {
      setUploading(false);
      e.target.value = ''; // Reset input
    }
  };

  // =========================================
  // SUPPRIMER PHOTO
  // =========================================
  const handleDeletePhoto = async (index) => {
    if (!window.confirm('Supprimer cette photo ?')) return;

    const photoToDelete = photos[index];
    
    try {
      // Extraire le chemin du fichier depuis l'URL
      const urlParts = photoToDelete.url.split('/');
      const bucketIndex = urlParts.findIndex(part => part === 'controle-qualite-images');
      const filePath = urlParts.slice(bucketIndex + 1).join('/');

      console.log('🗑️ Suppression photo:', filePath);

      const { error } = await supabase.storage
        .from('controle-qualite-images')
        .remove([filePath]);

      if (error) {
        console.error('❌ Erreur suppression storage:', error);
      }

      // Supprimer de la liste
      onPhotosChange(photos.filter((_, i) => i !== index));

      console.log('✅ Photo supprimée');

    } catch (error) {
      console.error('❌ Erreur suppression photo:', error);
      alert('Erreur lors de la suppression de la photo');
    }
  };

  // =========================================
  // MODIFIER DESCRIPTION
  // =========================================
  const handleDescriptionChange = (index, description) => {
    const updatedPhotos = [...photos];
    updatedPhotos[index] = { ...updatedPhotos[index], description };
    onPhotosChange(updatedPhotos);
  };

  return (
    <div className="space-y-3">
      {/* Bouton Upload */}
      <div className="flex items-center gap-2">
        <Label 
          htmlFor="photo-upload-cr" 
          className="cursor-pointer flex-1"
        >
          <div className="flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-md hover:bg-slate-50 transition">
            {uploading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm font-medium">Upload en cours...</span>
              </>
            ) : (
              <>
                <Camera className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Ajouter des photos</span>
              </>
            )}
          </div>
        </Label>
        <Input
          id="photo-upload-cr"
          type="file"
          accept="image/*"
          multiple
          capture="environment"
          onChange={handleFileUpload}
          className="hidden"
          disabled={uploading}
        />
      </div>

      {/* Liste des photos */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((photo, index) => (
            <div key={index} className="relative group">
              {/* Image */}
              <div 
                className="aspect-square rounded-md overflow-hidden border bg-slate-100 cursor-pointer"
                onClick={() => setViewingImage(photo.url)}
              >
                <img 
                  src={photo.url} 
                  alt={photo.description || `Photo ${index + 1}`}
                  className="w-full h-full object-cover hover:scale-105 transition-transform"
                />
              </div>

              {/* Boutons action */}
              <div className="absolute top-1 right-1 flex gap-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-7 w-7 bg-white/90 hover:bg-white"
                  onClick={() => setViewingImage(photo.url)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleDeletePhoto(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Description */}
              <Input
                placeholder="Description..."
                value={photo.description || ''}
                onChange={(e) => handleDescriptionChange(index, e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 border rounded-md border-dashed bg-slate-50">
          <Camera className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Aucune photo ajoutée</p>
        </div>
      )}

      {/* Modal Fullscreen */}
      {viewingImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setViewingImage(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={() => setViewingImage(null)}
          >
            <X className="h-6 w-6" />
          </Button>
          <img 
            src={viewingImage} 
            alt="Aperçu" 
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}