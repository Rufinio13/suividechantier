import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Plus, Trash2, Pencil } from 'lucide-react';
import { ControleQualiteSousCategorieItem } from '@/components/controle-qualite/ControleQualiteSousCategorieItem.jsx';
import { PointControleFormModal } from '@/components/controle-qualite/PointControleFormModal';
import { v4 as uuidv4 } from 'uuid';

export function ControleQualiteDomaineItem({ 
    domaine, 
    resultatsDomaine, 
    chantierId, 
    modeleId,
    onPointResultatChangeForDomaine, 
    pointsControleStructure,
    onAddPointControle,
    onUpdatePointControle,
    onDeletePointControle,
    onUpdateNomCategorie,
    onSupprimerCategorie,
    onSupprimerSousCategorie,
    onAddSousCategorie,
    documents = []
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAddPointModalOpen, setIsAddPointModalOpen] = useState(false);
  const [isEditingNom, setIsEditingNom] = useState(false);
  const [editedNom, setEditedNom] = useState(domaine.nom);

  // ✅ CALCUL DES STATISTIQUES DU DOMAINE
  const stats = useMemo(() => {
    let totalPoints = 0;
    let conformes = 0;
    let nonConformes = 0;
    let sansObjet = 0;

    domaine.sousCategories?.forEach(sc => {
      const pointsControle = pointsControleStructure?.[sc.id]?.pointsControle || sc.pointsControle || [];
      totalPoints += pointsControle.length;

      pointsControle.forEach(pc => {
        const resultat = resultatsDomaine[sc.id]?.[pc.id]?.resultat;
        if (resultat === 'C' || resultat === 'Conforme') conformes++;
        if (resultat === 'NC' || resultat === 'Non conforme') nonConformes++;
        if (resultat === 'SO' || resultat === 'Sans Objet') sansObjet++;
      });
    });

    return { totalPoints, conformes, nonConformes, sansObjet };
  }, [domaine.sousCategories, resultatsDomaine, pointsControleStructure]);

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

  const handleSaveNewPoint = (pointData) => {
    onAddPointControle(modeleId, domaine.id, null, pointData);
    setIsAddPointModalOpen(false);
  };

  const handleSaveNomCategorie = () => {
    if (editedNom.trim() && editedNom !== domaine.nom) {
      onUpdateNomCategorie?.(modeleId, domaine.id, editedNom.trim());
    }
    setIsEditingNom(false);
  };

  const handleCancelEditNom = () => {
    setEditedNom(domaine.nom);
    setIsEditingNom(false);
  };

  return (
    <Card className={`mb-4 shadow-md border-l-4 border-l-blue-500 ${isComplete ? 'bg-emerald-50' : ''}`}>
      <CardHeader 
        className={`cursor-pointer transition-colors py-3 ${isComplete ? 'hover:bg-emerald-100' : 'hover:bg-slate-50'}`}
        onClick={toggleExpand}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e) => { e.stopPropagation(); toggleExpand(); }}
              className="h-8 w-8"
            >
              {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            </Button>
            
            {isEditingNom ? (
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={editedNom}
                  onChange={(e) => setEditedNom(e.target.value)}
                  onBlur={handleSaveNomCategorie}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveNomCategorie();
                    if (e.key === 'Escape') handleCancelEditNom();
                  }}
                  className="px-2 py-1 border rounded text-lg font-semibold"
                  autoFocus
                />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-semibold text-slate-800">
                  {domaine.nom}
                </CardTitle>
                {onUpdateNomCategorie && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditingNom(true);
                    }}
                    className="h-6 w-6 text-slate-400 hover:text-slate-600"
                    title="Modifier le nom de la catégorie"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}

            {/* ✅ BADGES STATISTIQUES */}
            <div className="flex items-center gap-2 ml-4">
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
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e) => { 
                e.stopPropagation(); 
                onAddSousCategorie?.(domaine.id, domaine.nom);
              }} 
              className="h-8 w-8 text-green-500 hover:text-green-700"
              title="Ajouter une sous-catégorie"
            >
              <Plus className="h-4 w-4" />
            </Button>

            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e) => { 
                e.stopPropagation(); 
                onSupprimerCategorie(); 
              }} 
              className="h-8 w-8 text-red-400 hover:text-red-600"
              title="Supprimer cette catégorie pour ce chantier"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent className="pt-0 pb-3">
              {domaine.sousCategories && domaine.sousCategories.length > 0 ? (
                <div className="space-y-3">
                  {domaine.sousCategories.map(sc => (
                    <ControleQualiteSousCategorieItem
                      key={sc.id}
                      sousCategorie={sc}
                      resultatsSousCategorie={resultatsDomaine[sc.id] || {}}
                      chantierId={chantierId}
                      modeleId={modeleId}
                      domaineId={domaine.id}
                      onPointResultatChange={(pointId, res, expl, photo, planId, annotations, dateRepPrev, repValidee) => 
                        onPointResultatChangeForDomaine(sc.id, pointId, res, expl, photo, planId, annotations, dateRepPrev, repValidee)
                      }
                      pointsControleStructure={pointsControleStructure?.[sc.id]?.pointsControle}
                      onAddPointControle={onAddPointControle}
                      onUpdatePointControle={onUpdatePointControle}
                      onDeletePointControle={onDeletePointControle}
                      onUpdateNomCategorie={onUpdateNomCategorie}
                      onSupprimerSousCategorie={() => onSupprimerSousCategorie(sc.id)}
                      documents={documents}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">Aucune sous-catégorie disponible.</p>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>

      {isAddPointModalOpen && (
        <PointControleFormModal
          isOpen={isAddPointModalOpen}
          onClose={() => setIsAddPointModalOpen(false)}
          modeleId={modeleId}
          domaineId={domaine.id}
          sousCategorieId={null}
          onSave={handleSaveNewPoint}
        />
      )}
    </Card>
  );
}