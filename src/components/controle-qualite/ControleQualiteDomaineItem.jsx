import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, PlusCircle } from 'lucide-react';
import { ControleQualiteSousCategorieItem } from '@/components/controle-qualite/ControleQualiteSousCategorieItem';
import { PointControleFormModal } from '@/components/controle-qualite/PointControleFormModal';

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
    documents = []
}) {
    const [isOpen, setIsOpen] = useState(false); // ✅ MODIFIÉ : Collapsed par défaut
    const [isPointFormModalOpen, setIsPointFormModalOpen] = useState(false);
    const [editingPoint, setEditingPoint] = useState(null);
    const [parentInfoForModal, setParentInfoForModal] = useState({});

    // ✅ NOUVEAU : Calculer les statistiques
    const stats = useMemo(() => {
        const allPoints = domaine.sousCategories.flatMap(sc => 
            (pointsControleStructure?.[sc.id]?.pointsControle || sc.pointsControle || [])
        );
        
        const total = allPoints.length;
        let conforme = 0;
        let nonConforme = 0;
        let sansObjet = 0;
        let aFaire = 0;

        allPoints.forEach(point => {
            let resultatFound = false;
            
            // Chercher le résultat dans toutes les sous-catégories
            domaine.sousCategories.forEach(sc => {
                const resultat = resultatsDomaine?.[sc.id]?.[point.id]?.resultat;
                if (resultat) {
                    resultatFound = true;
                    if (resultat === 'C') conforme++;
                    else if (resultat === 'NC') nonConforme++;
                    else if (resultat === 'SO') sansObjet++;
                }
            });
            
            if (!resultatFound) aFaire++;
        });

        return { total, conforme, nonConforme, sansObjet, aFaire };
    }, [domaine.sousCategories, resultatsDomaine, pointsControleStructure]);

    const handleOpenPointFormModal = (point = null, sousCategorieId = null) => {
        setEditingPoint(point);
        setParentInfoForModal({ domaineId: domaine.id, sousCategorieId });
        setIsPointFormModalOpen(true);
    };

    return (
        <div className="border border-slate-200 rounded-lg bg-white hover:shadow-md transition-shadow">
            <div 
                className="flex items-center gap-3 p-4 cursor-pointer"
                onClick={() => setIsOpen(!isOpen)}
            >
                {/* Chevron */}
                <motion.div
                    animate={{ rotate: isOpen ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <ChevronRight className="h-5 w-5 text-slate-600" />
                </motion.div>

                {/* Icône catégorie */}
                <span className="text-xl">📋</span>

                {/* Titre */}
                <h4 className="font-semibold text-base text-slate-800 flex-1">
                    {domaine.nom}
                </h4>

                {/* ✅ NOUVEAU : Badges statistiques */}
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {/* Badge Total */}
                    <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                        {stats.total} contrôle{stats.total > 1 ? 's' : ''}
                    </Badge>

                    {/* Badge Conforme */}
                    {stats.conforme > 0 && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            {stats.conforme} C
                        </Badge>
                    )}

                    {/* Badge Non-Conforme */}
                    {stats.nonConforme > 0 && (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            {stats.nonConforme} NC
                        </Badge>
                    )}

                    {/* Badge Sans Objet */}
                    {stats.sansObjet > 0 && (
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                            {stats.sansObjet} SO
                        </Badge>
                    )}

                    {/* Badge À Faire */}
                    {stats.aFaire > 0 && (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                            {stats.aFaire} à faire
                        </Badge>
                    )}

                    {/* Séparateur */}
                    <div className="w-px h-6 bg-slate-200 mx-1" />

                    {/* Bouton Ajouter */}
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            handleOpenPointFormModal(null, null); 
                        }} 
                        className="h-8 w-8 text-slate-600 hover:text-sky-600 hover:bg-slate-50"
                        title="Ajouter un contrôle"
                    >
                        <PlusCircle className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Contenu collapsed */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-slate-200"
                    >
                        <div className="p-4 pt-3 space-y-2 bg-slate-50">
                            {domaine.sousCategories.map((sc) => (
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
                                    documents={documents}
                                />
                            ))}
                            {domaine.sousCategories.length === 0 && (
                                <p className="text-sm text-slate-500 italic py-2">
                                    Aucune sous-catégorie dans ce domaine. Vous pouvez ajouter des points de contrôle directement.
                                </p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal ajout/édition point */}
            {isPointFormModalOpen && (
                <PointControleFormModal
                    isOpen={isPointFormModalOpen}
                    onClose={() => setIsPointFormModalOpen(false)}
                    point={editingPoint}
                    modeleId={modeleId}
                    domaineId={parentInfoForModal.domaineId}
                    sousCategorieId={parentInfoForModal.sousCategorieId} 
                    onSave={(data) => {
                        if (editingPoint) {
                            onUpdatePointControle(modeleId, parentInfoForModal.domaineId, parentInfoForModal.sousCategorieId, editingPoint.id, data);
                        } else {
                            onAddPointControle(modeleId, parentInfoForModal.domaineId, parentInfoForModal.sousCategorieId, data);
                        }
                    }}
                />
            )}
        </div>
    );
}