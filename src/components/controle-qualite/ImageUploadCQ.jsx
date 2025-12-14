import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, X, Image as ImageIcon, FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';

export function ImageUploadCQ({ 
  type = 'photo', // 'photo' ou 'plan'
  images = [], // Array d'objets {url, nom, uploadedAt}
  chantierId,
  onImagesChange 
}) {
  const { profile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);

    try {
      const uploadedImages = [];

      for (const file of files) {
        // Validation
        if (!file.type.startsWith('image/')) {
          alert(`${file.name} n'est pas une image`);
          continue;
        }

        // Nom du fichier avec timestamp
        const timestamp = Date.now();
        const fileExt = file.name.split('.').pop();
        const fileName = `${timestamp}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        // Path dans Storage
        const filePath = `${profile.nomsociete}/${chantierId}/${type}s/${fileName}`;

        console.log('📤 Upload vers:', filePath);

        // Upload vers Supabase Storage
        const { data, error } = await supabase.storage
          .from('controle-qualite-images')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          console.error('❌ Erreur upload:', error);
          alert(`Erreur lors de l'upload de ${file.name}: ${error.message}`);
          continue;
        }

        console.log('✅ Upload réussi:', data);

        // Récupérer l'URL publique
        const { data: { publicUrl } } = supabase.storage
          .from('controle-qualite-images')
          .getPublicUrl(filePath);

        console.log('🔗 URL publique:', publicUrl);

        uploadedImages.push({
          url: publicUrl,
          nom: file.name,
          uploadedAt: new Date().toISOString()
        });
      }

      if (uploadedImages.length > 0) {
        // Ajouter aux images existantes
        onImagesChange([...images, ...uploadedImages]);
        console.log('✅ Images ajoutées:', uploadedImages.length);
      }

    } catch (error) {
      console.error('❌ Erreur upload images:', error);
      alert('Erreur lors de l\'upload des images');
    } finally {
      setUploading(false);
      // ✅ CORRIGÉ : Reset l'input après upload réussi ou échoué
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (imageToDelete) => {
    try {
      // Extraire le path depuis l'URL
      const urlParts = imageToDelete.url.split('/controle-qualite-images/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        
        // Supprimer de Storage
        const { error } = await supabase.storage
          .from('controle-qualite-images')
          .remove([filePath]);

        if (error) {
          console.error('Erreur suppression Storage:', error);
        }
      }

      // Retirer de la liste
      onImagesChange(images.filter(img => img.url !== imageToDelete.url));

    } catch (error) {
      console.error('Erreur suppression image:', error);
      alert('Erreur lors de la suppression de l\'image');
    }
  };

  const typeConfig = {
    photo: {
      icon: ImageIcon,
      label: 'Photos',
      buttonText: 'Ajouter une photo',
      emptyText: 'Aucune photo ajoutée'
    },
    plan: {
      icon: FileText,
      label: 'Plans annotés',
      buttonText: 'Ajouter un plan annoté',
      emptyText: 'Aucun plan annoté'
    }
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {config.label}
        </label>
        
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            capture={type === 'photo' ? 'environment' : undefined}
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-xs"
          >
            {uploading ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Upload...
              </>
            ) : (
              <>
                <Upload className="h-3 w-3 mr-1" />
                {config.buttonText}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Liste des images */}
      {images.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {images.map((image, index) => (
            <Card key={index} className="relative group overflow-hidden">
              <img
                src={image.url}
                alt={image.nom}
                className="w-full h-32 object-cover"
              />
              
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={() => handleDelete(image)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 truncate">
                {image.nom}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic py-2">
          {config.emptyText}
        </p>
      )}
    </div>
  );
}