import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, AlertCircle, HelpCircle, XCircle, CalendarPlus, Edit2 as EditIcon, Trash2 } from 'lucide-react';
import { PointControleFormModal } from '@/components/controle-qualite/PointControleFormModal';
import { ImageUploadCQ } from '@/components/controle-qualite/ImageUploadCQ';
import { useChantier } from '@/context/ChantierContext';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const getResultatStyle = (resultat) => {
  switch (resultat) {
    case 'Conforme':
    case 'C':
      return { icon: <CheckCircle className="h-5 w-5 text-green-500" />, class: 'bg-green-100 text-green-800 border-green-300', label: 'Conforme' };
    case 'Non conforme':
    case 'NC':
      return { icon: <AlertCircle className="h-5 w-5 text-red-500" />, class: 'bg-red-100 text-red-800 border-red-300', label: 'Non Conforme' };
    case 'À surveiller': 
      return { icon: <AlertCircle className="h-5 w-5 text-yellow-500" />, class: 'bg-yellow-100 text-yellow-800 border-yellow-300', label: 'À surveiller' };
    case 'Sans Objet':
    case 'SO':
      return { icon: <XCircle className="h-5 w-5 text-gray-500" />, class: 'bg-gray-100 text-gray-700 border-gray-300', label: 'Sans Objet' };
    default:
      return { icon: <HelpCircle className="h-5 w-5 text-gray-400" />, class: 'bg-gray-50 text-gray-600 border-gray-200', label: 'Non défini' };
  }
};

export function PointControleResultatItem({ 
    point, 
    resultatData, 
    chantierId, 
    modeleId, 
    domaineId, 
    sousCategorieId, 
    onResultatChange,
    onUpdatePointControle,
    onDeletePointControle,
    documents = []
}) {
  // ✅ Afficher historique si NC OU si Conforme avec reprise validée
  const [isExpanded, setIsExpanded] = useState(
    resultatData?.resultat === 'NC' || 
    (resultatData?.resultat === 'C' && resultatData?.repriseValidee)
  );
  const [isPointFormModalOpen, setIsPointFormModalOpen] = useState(false);

  const { sousTraitants, taches } = useChantier();

  const sousTraitantsDuChantier = useMemo(() => {
    const tachesChantier = taches.filter(t => t.chantierid === chantierId && t.assignetype === 'soustraitant');
    const artisanIds = [...new Set(tachesChantier.map(t => t.assigneid))];
    return sousTraitants.filter(st => artisanIds.includes(st.id));
  }, [taches, sousTraitants, chantierId]);

  const resultatOptions = [
    { value: 'C', label: 'C' },
    { value: 'NC', label: 'NC' },
    { value: 'SO', label: 'SO' },
  ];

  const currentData = resultatData || { 
    resultat: '', 
    explicationNC: '', 
    photos: [],
    plans: [],
    dateReprisePrevisionnelle: '',
    repriseValidee: false,
    soustraitant_id: '',
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try { 
      return format(parseISO(dateString), 'dd/MM/yyyy HH:mm', { locale: fr }); 
    } catch (error) { 
      return 'Date invalide'; 
    }
  };

  const formatDateOnly = (dateString) => {
    if (!dateString) return 'N/A';
    try { 
      return format(parseISO(dateString), 'dd MMM yyyy', { locale: fr }); 
    } catch (error) { 
      return 'Date invalide'; 
    }
  };

  const handleResultatButtonClick = (value) => {
    // ✅ Si on reclique sur le même bouton, on désélectionne (remet à vide)
    const newValue = currentData.resultat === value ? '' : value;
    
    onResultatChange(
      point.id, 
      newValue, 
      currentData.explicationNC, 
      currentData.photos, 
      currentData.plans, 
      currentData.dateReprisePrevisionnelle, 
      currentData.repriseValidee,
      currentData.soustraitant_id
    );
    
    // ✅ Garder expansé si reprise validée, sinon ouvrir seulement si NC
    setIsExpanded(newValue === 'NC' || (newValue === 'C' && currentData.repriseValidee));
  };

  const handleChange = (field, value) => {
    const updatedData = { ...currentData, [field]: value };
    onResultatChange(
      point.id, 
      updatedData.resultat, 
      updatedData.explicationNC,
      updatedData.photos,
      updatedData.plans,
      updatedData.dateReprisePrevisionnelle,
      updatedData.repriseValidee,
      updatedData.soustraitant_id
    );
  };

  const handleOpenEditModal = (e) => {
    e.stopPropagation();
    setIsPointFormModalOpen(true);
  };

  const handleDeletePoint = (e) => {
    e.stopPropagation();
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le point de contrôle "${point.libelle}" pour ce chantier ?`)) {
        onDeletePointControle(modeleId, domaineId, sousCategorieId, point.id);
    }
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="p-3 border rounded-md bg-slate-50 hover:shadow-sm transition-shadow"
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div className="flex-grow mb-2 sm:mb-0">
          <div className="flex items-center">
            <p className="text-sm font-medium text-slate-800">{point.libelle}</p>
            <Button variant="ghost" size="icon" onClick={handleOpenEditModal} className="h-6 w-6 ml-2 text-slate-500 hover:text-slate-700">
                <EditIcon size={14} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleDeletePoint} 
              className="h-6 w-6 ml-1 text-red-400 hover:text-red-600"
              title="Supprimer pour ce chantier"
            >
              <Trash2 size={14} />
            </Button>
          </div>
          {point.description && <p className="text-xs text-slate-500 mt-0.5">{point.description}</p>}
        </div>
        <div className="flex-shrink-0 flex items-center space-x-1.5">
          {resultatOptions.map(opt => (
            <Button
              key={opt.value}
              variant={currentData.resultat === opt.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleResultatButtonClick(opt.value)}
              className={`min-w-[50px] transition-all duration-150 ease-in-out 
                ${currentData.resultat === opt.value 
                  ? (opt.value === 'C' ? 'bg-green-500 hover:bg-green-600' 
                    : opt.value === 'NC' ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-gray-500 hover:bg-gray-600') + ' text-white'
                  : 'text-slate-700 hover:bg-slate-100'
                }`}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (currentData.resultat === 'NC' || (currentData.resultat === 'C' && currentData.repriseValidee)) && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: '0.75rem' }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            className="space-y-4 pt-3 border-t border-slate-200"
          >
            {/* ✅ Bandeau si reprise validée (point passé en Conforme) */}
            {currentData.resultat === 'C' && currentData.repriseValidee && (
              <div className="p-3 bg-green-50 border border-green-300 rounded-md">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <p className="text-sm font-semibold text-green-800">
                    ✅ Reprise validée - Point passé en Conforme
                  </p>
                </div>
                <p className="text-xs text-green-700 mt-1">
                  L'historique de la non-conformité est conservé ci-dessous.
                </p>
              </div>
            )}

            {/* Info artisan repris */}
            {currentData.artisan_repris && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-yellow-700" />
                  <p className="text-xs font-semibold text-yellow-800">
                    Reprise marquée par l'artisan le {formatDateTime(currentData.artisan_repris_date)}
                  </p>
                </div>
                
                {currentData.artisan_repris_commentaire && (
                  <div>
                    <p className="text-xs font-medium text-slate-700">Commentaire :</p>
                    <p className="text-sm text-slate-800">{currentData.artisan_repris_commentaire}</p>
                  </div>
                )}
                
                {currentData.artisan_repris_photos && currentData.artisan_repris_photos.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-700 mb-1">Photos de reprise :</p>
                    <div className="flex gap-2 flex-wrap">
                      {currentData.artisan_repris_photos.map((photo, i) => (
                        <img 
                          key={i} 
                          src={photo.url || photo} 
                          alt={`Reprise ${i+1}`}
                          className="h-20 w-20 object-cover rounded border cursor-pointer hover:opacity-80"
                          onClick={() => window.open(photo.url || photo, '_blank')}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 1. Explication NC */}
            <div>
              <Label htmlFor={`explicationNC-${point.id}`} className="text-xs font-medium text-slate-700">
                Explication NC
              </Label>
              <Textarea 
                id={`explicationNC-${point.id}`}
                value={currentData.explicationNC || ''}
                onChange={(e) => handleChange('explicationNC', e.target.value)}
                placeholder="Décrivez la non-conformité..."
                rows={2}
                className="mt-1 text-sm"
                disabled={currentData.resultat === 'C'}
              />
            </div>

            {/* 2. Photos NC */}
            <div>
              <Label className="text-xs font-medium text-slate-700">Photos NC</Label>
              <ImageUploadCQ
                images={currentData.photos || []}
                onImagesChange={(newPhotos) => handleChange('photos', newPhotos)}
                chantierId={chantierId}
                disabled={currentData.resultat === 'C'}
              />
            </div>

            {/* 3. Plans annotés */}
            <div>
              <Label className="text-xs font-medium text-slate-700">Plans annotés</Label>
              <ImageUploadCQ
                images={currentData.plans || []}
                onImagesChange={(newPlans) => handleChange('plans', newPlans)}
                chantierId={chantierId}
                label="plan"
                disabled={currentData.resultat === 'C'}
              />
            </div>

            {/* 4. Date Reprise au plus tard */}
            <div>
              <Label htmlFor={`dateReprisePrevisionnelle-${point.id}`} className="text-xs font-medium text-slate-700 flex items-center">
                <CalendarPlus size={12} className="mr-1.5 text-slate-500" /> Date Reprise au plus tard
              </Label>
              <Input 
                id={`dateReprisePrevisionnelle-${point.id}`}
                type="date"
                value={currentData.dateReprisePrevisionnelle || ''}
                onChange={(e) => handleChange('dateReprisePrevisionnelle', e.target.value)}
                className="mt-1 text-sm"
                disabled={currentData.resultat === 'C'}
              />
            </div>

            {/* 5. Sous-traitant concerné */}
            <div>
              <Label htmlFor={`soustraitant-${point.id}`} className="text-xs font-medium text-slate-700">
                Sous-traitant concerné
              </Label>
              <Select
                value={currentData.soustraitant_id || ''}
                onValueChange={(value) => handleChange('soustraitant_id', value)}
                disabled={currentData.resultat === 'C'}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sélectionner un artisan..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Aucun</SelectItem>
                  {sousTraitantsDuChantier.map(st => (
                    <SelectItem key={st.id} value={st.id}>
                      {st.nomsocieteST || `${st.PrenomST} ${st.nomST}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 6. Intervention prévue le */}
            {currentData.date_intervention_artisan && (
              <div className="p-2 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-xs text-blue-700">
                  📅 <strong>Intervention prévue le :</strong> {formatDateOnly(currentData.date_intervention_artisan)}
                </p>
              </div>
            )}
            
            {/* 7. Checkbox Reprise validée */}
            {currentData.resultat === 'NC' && (
              <div className="flex items-center space-x-2 mt-2">
                <input
                  type="checkbox"
                  id={`repriseValidee-${point.id}`}
                  checked={currentData.repriseValidee || false}
                  onChange={(e) => {
                    if (e.target.checked) {
                      // ✅ Passer en CONFORME + garder l'historique
                      const updatedData = {
                        ...currentData,
                        resultat: 'C', // ✅ Passe en Conforme
                        repriseValidee: true
                      };
                      onResultatChange(
                        point.id, 
                        updatedData.resultat,
                        updatedData.explicationNC,
                        updatedData.photos,
                        updatedData.plans,
                        updatedData.dateReprisePrevisionnelle,
                        updatedData.repriseValidee,
                        updatedData.soustraitant_id
                      );
                    } else {
                      handleChange('repriseValidee', false);
                    }
                  }}
                  className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <Label htmlFor={`repriseValidee-${point.id}`} className="text-xs font-medium text-slate-700">
                  Reprise validée (passe en Conforme)
                </Label>
              </div>
            )}

          </motion.div>
        )}
      </AnimatePresence>
      
      {isPointFormModalOpen && (
        <PointControleFormModal
            isOpen={isPointFormModalOpen}
            onClose={() => setIsPointFormModalOpen(false)}
            point={point}
            modeleId={modeleId}
            domaineId={domaineId}
            sousCategorieId={sousCategorieId}
            onSave={(data) => {
                console.log('📝 Sauvegarde modifications point:', {
                  modeleId,
                  domaineId,
                  sousCategorieId,
                  pointId: point.id,
                  data
                });
                onUpdatePointControle(modeleId, domaineId, sousCategorieId, point.id, data);
                console.log('✅ onUpdatePointControle appelé');
                setIsPointFormModalOpen(false);
            }}
        />
      )}
    </motion.div>
  );
}