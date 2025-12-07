import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Layers, PieChart as PieChartIcon, PlusCircle } from 'lucide-react';
import { CategorieStatsPieChart } from '@/components/controle-qualite/CategorieStatsPieChart';
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
    documents = [] // ✅ AJOUT: Passer les documents
}) {
    const [isOpen, setIsOpen] = useState(true);
    const [showStats, setShowStats] = useState(false);
    const [isPointFormModalOpen, setIsPointFormModalOpen] = useState(false);
    const [editingPoint, setEditingPoint] = useState(null);
    const [parentInfoForModal, setParentInfoForModal] = useState({});

    const allPointsInDomaine = domaine.sousCategories.flatMap(sc => 
        (pointsControleStructure?.[sc.id]?.pointsControle || sc.pointsControle || [])
    );
    const allResultsInDomaine = domaine.sousCategories.reduce((acc, sc) => {
        return {...acc, ...(resultatsDomaine[sc.id] || {})};
    }, {});

    const handleOpenPointFormModal = (point = null, sousCategorieId = null) => {
        setEditingPoint(point);
        setParentInfoForModal({ domaineId: domaine.id, sousCategorieId });
        setIsPointFormModalOpen(true);
    };

    return (
        <div className="py-2">
            <div 
                className="flex justify-between items-center cursor-pointer hover:bg-blue-50 p-2 rounded-md -ml-2 -mr-2"
            >
                <div onClick={() => setIsOpen(!isOpen)} className="flex-grow flex items-center">
                     {isOpen ? <ChevronUp size={18} className="text-blue-500 mr-2" /> : <ChevronDown size={18} className="text-blue-500 mr-2" />}
                    <h4 className="font-semibold text-md text-blue-700 flex items-center">
                        <Layers size={18} className="mr-2 text-blue-500" />
                        {domaine.nom}
                    </h4>
                </div>
                <div className="flex items-center">
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleOpenPointFormModal(null, null); }} className="h-7 w-7 ml-2 text-blue-500 hover:text-blue-700">
                        <PlusCircle size={16} />
                    </Button>
                    {allPointsInDomaine.length > 0 && (
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setShowStats(!showStats); }} className="h-7 w-7 ml-2">
                            <PieChartIcon size={16} className={`text-blue-500 ${showStats ? 'text-blue-700' : ''}`} />
                        </Button>
                    )}
                </div>
            </div>
            <AnimatePresence>
                {showStats && allPointsInDomaine.length > 0 && (
                     <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="my-2 p-3 bg-blue-50 rounded-md border border-blue-200"
                    >
                        <CategorieStatsPieChart resultatsPoints={allResultsInDomaine} pointsControle={allPointsInDomaine} />
                    </motion.div>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 space-y-2 pl-3"
                    >
                        {domaine.sousCategories.map((sc) => (
                            <ControleQualiteSousCategorieItem
                                key={sc.id}
                                sousCategorie={sc}
                                resultatsSousCategorie={resultatsDomaine[sc.id] || {}}
                                chantierId={chantierId}
                                modeleId={modeleId}
                                domaineId={domaine.id}
                                onPointResultatChange={(pointId, res, expl, photo, planId, annotations, dateRepPrev, repValidee) => onPointResultatChangeForDomaine(sc.id, pointId, res, expl, photo, planId, annotations, dateRepPrev, repValidee)}
                                pointsControleStructure={pointsControleStructure?.[sc.id]?.pointsControle}
                                onAddPointControle={onAddPointControle}
                                onUpdatePointControle={onUpdatePointControle}
                                onDeletePointControle={onDeletePointControle}
                                onUpdateNomCategorie={onUpdateNomCategorie}
                                documents={documents} // ✅ AJOUT: Passer les documents
                            />
                        ))}
                        {domaine.sousCategories.length === 0 && (
                            <p className="text-sm text-slate-500 italic py-1">Aucune sous-catégorie dans ce domaine. Vous pouvez ajouter des points de contrôle directement ici.</p>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
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