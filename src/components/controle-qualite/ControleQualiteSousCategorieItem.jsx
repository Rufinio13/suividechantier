import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, ListChecks, PieChart as PieChartIcon, PlusCircle } from 'lucide-react';
import { CategorieStatsPieChart } from '@/components/controle-qualite/CategorieStatsPieChart';
import { PointControleResultatItem } from '@/components/controle-qualite/ControleQualiteListItem';
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
    documents = [] // ✅ AJOUT: Passer les documents
}) {
    const [isOpen, setIsOpen] = useState(true);
    const [showStats, setShowStats] = useState(false);
    const [isPointFormModalOpen, setIsPointFormModalOpen] = useState(false);
    const [editingPoint, setEditingPoint] = useState(null);
    
    const pointsDeCetteSousCategorie = pointsControleStructure || sousCategorie.pointsControle || [];

    const handleOpenPointFormModal = (point = null) => {
        setEditingPoint(point);
        setIsPointFormModalOpen(true);
    };

    return (
        <div className="py-2 pl-4 border-l-2 border-slate-300">
            <div 
                className="flex justify-between items-center cursor-pointer hover:bg-slate-100 p-2 rounded-md -ml-2 -mr-2"
            >
                <div onClick={() => setIsOpen(!isOpen)} className="flex-grow flex items-center">
                    {isOpen ? <ChevronUp size={16} className="text-slate-500 mr-2" /> : <ChevronDown size={16} className="text-slate-500 mr-2" />}
                    <h5 className="font-medium text-sm text-slate-700 flex items-center">
                        <ListChecks size={16} className="mr-2 text-slate-500" />
                        {sousCategorie.nom}
                    </h5>
                </div>
                <div className="flex items-center">
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleOpenPointFormModal(null); }} className="h-7 w-7 ml-2 text-slate-500 hover:text-slate-700">
                        <PlusCircle size={16} />
                    </Button>
                    {pointsDeCetteSousCategorie.length > 0 && (
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setShowStats(!showStats); }} className="h-7 w-7 ml-2">
                            <PieChartIcon size={16} className={`text-slate-500 ${showStats ? 'text-blue-600' : ''}`} />
                        </Button>
                    )}
                </div>
            </div>
            <AnimatePresence>
                {showStats && pointsDeCetteSousCategorie.length > 0 && (
                     <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="my-2 p-3 bg-slate-50 rounded-md border"
                    >
                        <CategorieStatsPieChart resultatsPoints={resultatsSousCategorie} pointsControle={pointsDeCetteSousCategorie} />
                    </motion.div>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 space-y-2"
                    >
                        {pointsDeCetteSousCategorie.map((pc) => (
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
                                documents={documents} // ✅ AJOUT: Passer les documents
                            />
                        ))}
                        {pointsDeCetteSousCategorie.length === 0 && (
                            <p className="text-xs text-slate-400 italic py-1">Aucun point de contrôle dans cette sous-catégorie.</p>
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
                    domaineId={domaineId}
                    sousCategorieId={sousCategorie.id}
                    onSave={(data) => {
                        if (editingPoint) {
                            onUpdatePointControle(modeleId, domaineId, sousCategorie.id, editingPoint.id, data);
                        } else {
                            onAddPointControle(modeleId, domaineId, sousCategorie.id, data);
                        }
                    }}
                />
            )}
        </div>
    );
}