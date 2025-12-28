import React, { useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Plus, Trash2, Pencil } from 'lucide-react';
import { PointControleResultatItem } from '@/components/controle-qualite/ControleQualiteListItem.jsx';
import { PointControleFormModal } from '@/components/controle-qualite/PointControleFormModal';

export function ControleQualiteSousCategorieItem({ 
    sousCategorie, 
    resultatsSousCategorie, 
    chantierId, 
    modeleId,
    domaineId,
    onPointResultatChange, 
    pointsControleStructure,
    onAddPointControle,
    onUpdatePointControle,
    onDeletePointControle,
    onUpdateNomCategorie,
    onSupprimerSousCategorie,
    documents = []
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAddPointModalOpen, setIsAddPointModalOpen] = useState(false);
  const [isEditingNom, setIsEditingNom] = useState(false);
  const [editedNom, setEditedNom] = useState(sousCategorie.nom);
  const isAddingRef = useRef(false);

  const pointsControle = pointsControleStructure || sousCategorie.pointsControle || [];

  const stats = useMemo(() => {
    let totalPoints = pointsControle.length;
    let conformes = 0;
    let nonConformes = 0;
    let sansObjet = 0;

    pointsControle.forEach(pc => {
      const resultat = resultatsSousCategorie[pc.id]?.resultat;
      if (resultat === 'C' || resultat === 'Conforme') conformes++;
      if (resultat === 'NC' || resultat === 'Non conforme') nonConformes++;
      if (resultat === 'SO' || resultat === 'Sans Objet') sansObjet++;
    });

    return { totalPoints, conformes, nonConformes, sansObjet };
  }, [pointsControle, resultatsSousCategorie]);

  // ✅ VÉRIFIER SI TOUS LES POINTS SONT VÉRIFIÉS
  const isComplete = useMemo(() => {
    if (stats.totalPoints === 0) return false;
    const verifies = stats.conformes + stats.nonConformes + stats.sansObjet;
    return verifies === stats.totalPoints;
  }, [stats]);

  const toggleExpand = () => {
    setIsExpanded(prev => !prev);
  };

  const handleAddPointClick = () => {
    setIsAddPointModalOpen(true);
  };

  const handleSaveNewPoint = useCallback((pointData) => {
    if (isAddingRef.current) {
      console.log('⚠️ Ajout déjà en cours, ignoré');
      return;
    }
    
    isAddingRef.current = true;
    console.log('🎯 handleSaveNewPoint - Début ajout');
    
    onAddPointControle(modeleId, domaineId, sousCategorie.id, pointData);
    
    setTimeout(() => {
      isAddingRef.current = false;
      setIsAddPointModalOpen(false);
      console.log('✅ handleSaveNewPoint - Ajout terminé');
    }, 500);
  }, [modeleId, domaineId, sousCategorie.id, onAddPointControle]);

  const handleSaveNomSousCategorie = () => {
    if (editedNom.trim() && editedNom !== sousCategorie.nom) {
      onUpdateNomCategorie?.(modeleId, domaineId, sousCategorie.id, editedNom.trim());
    }
    setIsEditingNom(false);
  };

  const handleCancelEditNom = () => {
    setEditedNom(sousCategorie.nom);
    setIsEditingNom(false);
  };

  return (
    <Card className={`shadow-sm ${isComplete ? 'bg-emerald-50/70' : 'bg-slate-50/50'}`}>
      <CardHeader 
        className={`cursor-pointer transition-colors py-2 px-4 ${isComplete ? 'hover:bg-emerald-100/70' : 'hover:bg-slate-100/50'}`}
        onClick={toggleExpand}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e) => { e.stopPropagation(); toggleExpand(); }}
              className="h-7 w-7"
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
            
            {isEditingNom ? (
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={editedNom}
                  onChange={(e) => setEditedNom(e.target.value)}
                  onBlur={handleSaveNomSousCategorie}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveNomSousCategorie();
                    if (e.key === 'Escape') handleCancelEditNom();
                  }}
                  className="px-2 py-1 border rounded text-sm font-medium"
                  autoFocus
                />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium text-slate-700">
                  {sousCategorie.nom}
                </h4>
                {onUpdateNomCategorie && !sousCategorie.isChantierSpecificContainer && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditingNom(true);
                    }}
                    className="h-5 w-5 text-slate-400 hover:text-slate-600"
                    title="Modifier le nom de la sous-catégorie"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}
            
            <div className="flex items-center gap-2 ml-2">
              <span className={`px-2 py-0.5 text-xs font-medium rounded ${isComplete ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
                {stats.totalPoints} point{stats.totalPoints > 1 ? 's' : ''}
              </span>
              {stats.conformes > 0 && (
                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                  {stats.conformes} C
                </span>
              )}
              {stats.nonConformes > 0 && (
                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
                  {stats.nonConformes} NC
                </span>
              )}
              {stats.sansObjet > 0 && (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                  {stats.sansObjet} SO
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {!sousCategorie.isChantierSpecificContainer && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={(e) => { e.stopPropagation(); handleAddPointClick(); }} 
                className="h-7 w-7 text-green-500 hover:text-green-700"
                title="Ajouter un point de contrôle"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}

            {!sousCategorie.isChantierSpecificContainer && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  onSupprimerSousCategorie(); 
                }} 
                className="h-7 w-7 text-red-400 hover:text-red-600"
                title="Supprimer cette sous-catégorie pour ce chantier"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
          >
            <CardContent className="pt-2 pb-3 px-4 space-y-2">
              {pointsControle.length > 0 ? (
                pointsControle.map(pc => (
                  <PointControleResultatItem 
                    key={pc.id}
                    point={pc}
                    resultatData={resultatsSousCategorie[pc.id]}
                    chantierId={chantierId}
                    modeleId={modeleId}
                    domaineId={domaineId}
                    sousCategorieId={sousCategorie.id}
                    onResultatChange={onPointResultatChange}
                    onUpdatePointControle={onUpdatePointControle}
                    onDeletePointControle={onDeletePointControle}
                    documents={documents}
                  />
                ))
              ) : (
                <p className="text-xs text-slate-500 italic py-2">
                  Aucun point de contrôle disponible.
                </p>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>

      {isAddPointModalOpen && (
        <PointControleFormModal
          isOpen={isAddPointModalOpen}
          onClose={() => {
            if (!isAddingRef.current) {
              setIsAddPointModalOpen(false);
            }
          }}
          modeleId={modeleId}
          domaineId={domaineId}
          sousCategorieId={sousCategorie.id}
          onSave={handleSaveNewPoint}
        />
      )}
    </Card>
  );
}