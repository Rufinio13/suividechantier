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
  const [isExpanded, setIsExpanded] = useState(resultatData?.resultat === 'NC');
  const [isPointFormModalOpen, setIsPointFormModalOpen] = useState(false);

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
  };

  const handleResultatButtonClick = (value) => {
    onResultatChange(
      point.id, 
      value, 
      currentData.explicationNC, 
      currentData.photos, 
      currentData.plans, 
      '', 
      '', 
      currentData.dateReprisePrevisionnelle, 
      currentData.repriseValidee
    );
    setIsExpanded(value === 'NC');
  };

  const handleChange = (field, value) => {
    const updatedData = { ...currentData, [field]: value };
    onResultatChange(
      point.id, 
      updatedData.resultat, 
      updatedData.explicationNC,
      updatedData.photos,
      updatedData.plans,
      '',
      '',
      updatedData.dateReprisePrevisionnelle,
      updatedData.repriseValidee
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
            {/* ✅ Bouton Supprimer visible pour TOUS les points */}
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
        {isExpanded && currentData.resultat === 'NC' && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: '0.75rem' }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            className="space-y-4 pt-3 border-t border-slate-200"
          >
            {/* Explication NC */}
            <div>
              <Label htmlFor={`explicationNC-${point.id}`} className="text-xs font-medium text-slate-700">
                Explication (obligatoire si Non Conforme)
              </Label>
              <Textarea 
                id={`explicationNC-${point.id}`}
                value={currentData.explicationNC || ''}
                onChange={(e) => handleChange('explicationNC', e.target.value)}
                placeholder="Décrivez la non-conformité..."
                rows={2}
                className="mt-1 text-sm"
                required
              />
            </div>
            
            {/* Upload Photos */}
            <ImageUploadCQ
              type="photo"
              images={currentData.photos || []}
              chantierId={chantierId}
              onImagesChange={(newPhotos) => handleChange('photos', newPhotos)}
            />

            {/* Upload Plans annotés */}
            <ImageUploadCQ
              type="plan"
              images={currentData.plans || []}
              chantierId={chantierId}
              onImagesChange={(newPlans) => handleChange('plans', newPlans)}
            />

            {/* Date reprise prévisionnelle */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`dateReprisePrevisionnelle-${point.id}`} className="text-xs font-medium text-slate-700 flex items-center">
                  <CalendarPlus size={12} className="mr-1.5 text-slate-500" /> Date Reprise Prév.
                </Label>
                <Input 
                  id={`dateReprisePrevisionnelle-${point.id}`}
                  type="date"
                  value={currentData.dateReprisePrevisionnelle || ''}
                  onChange={(e) => handleChange('dateReprisePrevisionnelle', e.target.value)}
                  className="mt-1 text-sm"
                />
              </div>
            </div>
            
            {/* Checkbox Reprise validée */}
            <div className="flex items-center space-x-2 mt-2">
              <input
                type="checkbox"
                id={`repriseValidee-${point.id}`}
                checked={currentData.repriseValidee || false}
                onChange={(e) => handleChange('repriseValidee', e.target.checked)}
                className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <Label htmlFor={`repriseValidee-${point.id}`} className="text-xs font-medium text-slate-700">
                Reprise validée
              </Label>
            </div>

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
                onUpdatePointControle(modeleId, domaineId, sousCategorieId, point.id, data);
            }}
        />
      )}
    </motion.div>
  );
}