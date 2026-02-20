import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, X, FileSignature } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useChantier } from '@/context/ChantierContext';

export function DocumentUploadModal({ isOpen, onClose, chantierId, onSuccess }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { taches, sousTraitants } = useChantier();
  
  const [file, setFile] = useState(null);
  const [partageType, setPartageType] = useState('tous');
  const [artisanId, setArtisanId] = useState('');
  const [necessiteSignature, setNecessiteSignature] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Artisans qui ont au moins 1 tâche sur ce chantier
  const artisansDuChantier = useMemo(() => {
    const tachesChantier = taches.filter(t => t.chantierid === chantierId && t.assignetype === 'soustraitant');
    const artisanIds = [...new Set(tachesChantier.map(t => t.assigneid))];
    return sousTraitants.filter(st => artisanIds.includes(st.id));
  }, [taches, sousTraitants, chantierId]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      toast({ title: 'Erreur', description: 'Veuillez sélectionner un fichier', variant: 'destructive' });
      return;
    }

    if (partageType === 'specifique' && !artisanId) {
      toast({ title: 'Erreur', description: 'Veuillez sélectionner un artisan', variant: 'destructive' });
      return;
    }

    // ✅ Si signature requise, vérifier qu'un artisan spécifique est sélectionné
    if (necessiteSignature) {
      if (partageType !== 'specifique' || !artisanId) {
        toast({ 
          title: 'Erreur', 
          description: 'Pour demander une signature, vous devez sélectionner un artisan spécifique', 
          variant: 'destructive' 
        });
        return;
      }
    }

    setUploading(true);

    try {
      // 1. Upload vers Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${chantierId}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `chantiers/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents-chantiers')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Récupérer URL publique
      const { data: urlData } = supabase.storage
        .from('documents-chantiers')
        .getPublicUrl(filePath);

      // 3. Insérer en BDD
      const { error: dbError } = await supabase
        .from('documents_chantier')
        .insert({
          chantier_id: chantierId,
          nom_fichier: file.name,
          url_fichier: urlData.publicUrl,
          storage_path: filePath,
          type_fichier: fileExt,
          taille_fichier: file.size,
          partage_type: partageType,
          artisan_id: partageType === 'specifique' ? artisanId : null,
          uploaded_by: user.id,
          // ✅ Signature : utilise artisanId si artisan spécifique + signature requise
          necessite_signature: necessiteSignature,
          artisan_assigne_signature: (necessiteSignature && partageType === 'specifique') ? artisanId : null,
          signature_statut: necessiteSignature ? 'en_attente' : 'non_requis',
        });

      if (dbError) throw dbError;

      toast({
        title: 'Document ajouté ✅',
        description: `${file.name} a été partagé${necessiteSignature ? ' et attend signature' : ''}`,
      });

      onSuccess?.();
      onClose();
      
      // Reset
      setFile(null);
      setPartageType('tous');
      setArtisanId('');
      setNecessiteSignature(false);

    } catch (error) {
      console.error('Erreur upload:', error);
      toast({
        title: 'Erreur ❌',
        description: 'Impossible d\'uploader le document',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter un document</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Upload fichier */}
          <div>
            <Label htmlFor="file-upload" className="cursor-pointer">
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-slate-50 transition">
                {file ? (
                  <div className="flex items-center justify-center gap-2">
                    <Upload className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-600">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.preventDefault();
                        setFile(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">Cliquez pour sélectionner un fichier</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, XLSX, images...</p>
                  </>
                )}
              </div>
            </Label>
            <input
              id="file-upload"
              type="file"
              className="hidden"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
            />
          </div>

          {/* Type de partage */}
          <div className="space-y-3">
            <Label>Partager avec :</Label>
            
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="partage-tous"
                value="tous"
                checked={partageType === 'tous'}
                onChange={(e) => setPartageType(e.target.value)}
                className="h-4 w-4"
              />
              <Label htmlFor="partage-tous" className="cursor-pointer font-normal">
                Tous les artisans du chantier
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="partage-specifique"
                value="specifique"
                checked={partageType === 'specifique'}
                onChange={(e) => setPartageType(e.target.value)}
                className="h-4 w-4"
              />
              <Label htmlFor="partage-specifique" className="cursor-pointer font-normal">
                Un artisan spécifique
              </Label>
            </div>
          </div>

          {/* Sélection artisan */}
          {partageType === 'specifique' && (
            <div>
              <Label htmlFor="artisan">Artisan</Label>
              <select
                id="artisan"
                value={artisanId}
                onChange={(e) => setArtisanId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2"
                required={partageType === 'specifique'}
              >
                <option value="">Sélectionner un artisan...</option>
                {artisansDuChantier.map(st => (
                  <option key={st.id} value={st.id}>
                    {st.nomsocieteST || `${st.PrenomST} ${st.nomST}`}
                  </option>
                ))}
              </select>
              {artisansDuChantier.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Aucun artisan n'a de tâche sur ce chantier
                </p>
              )}
            </div>
          )}

          {/* ✅ SIGNATURE ÉLECTRONIQUE */}
          <div className="pt-4 border-t space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="necessite_signature"
                checked={necessiteSignature}
                onCheckedChange={setNecessiteSignature}
                disabled={partageType === 'tous'}
              />
              <Label 
                htmlFor="necessite_signature" 
                className="text-sm font-medium cursor-pointer flex items-center gap-2"
              >
                <FileSignature className="h-4 w-4 text-orange-600" />
                Ce document nécessite une signature électronique
              </Label>
            </div>

            {necessiteSignature && (
              <div className="ml-6 p-3 bg-orange-50 border border-orange-200 rounded-md text-sm">
                <p className="text-orange-800">
                  📝 L'artisan <strong>{artisansDuChantier.find(st => st.id === artisanId)?.nomsocieteST || 'sélectionné'}</strong> devra signer électroniquement ce document.
                </p>
              </div>
            )}

            {partageType === 'tous' && necessiteSignature && (
              <p className="text-xs text-red-600 ml-6">
                ⚠️ Pour demander une signature, vous devez sélectionner un artisan spécifique.
              </p>
            )}
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={uploading}>
              Annuler
            </Button>
            <Button type="submit" disabled={!file || uploading}>
              {uploading ? 'Upload en cours...' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}