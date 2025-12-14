import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, PlusCircle } from 'lucide-react';
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
    documents = []
}) {
    const [isOpen, setIsOpen] = useState(false); // ✅ MODIFIÉ : Collapsed par défaut
    const [isPointFormModalOpen, setIsPointFormModalOpen] = useState(false);
    const [editingPoint, setEditingPoint] = useState(null);
    
    const pointsDeCetteSousCategorie = pointsControleStructure || sousCategorie.pointsControle || [];

    // ✅ NOUVEAU : Calculer les statistiques
    const stats = useMemo(() => {
        const total = pointsDeCetteSousCategorie.length;
        let conforme = 0;
        let nonConforme = 0;
        let sansObjet = 0;
        let aFaire = 0;

        pointsDeCetteSousCategorie.forEach(point => {
            const resultat = resultatsSousCategorie?.[point.id]?.resultat;
            
            if (resultat === 'C') conforme++;
            else if (resultat === 'NC') nonConforme++;
            else if (resultat === 'SO') sansObjet++;
            else aFaire++;
        });

        return { total, conforme, nonConforme, sansObjet, aFaire };
    }, [pointsDeCetteSousCategorie, resultatsSousCategorie]);

    const handleOpenPointFormModal = (point = null) => {
        setEditingPoint(point);
        setIsPointFormModalOpen(true);
    };

    return (
        <div className="border border-slate-200 rounded-md bg-white">
            <div 
                className="flex items-center gap-2 p-3 cursor-pointer hover:bg-slate-50"
                onClick={() => setIsOpen(!isOpen)}
            >
                {/* Chevron */}
                <motion.div
                    animate={{ rotate: isOpen ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <ChevronRight className="h-4 w-4 text-slate-500" />
                </motion.div>

                {/* Icône */}
                <span className="text-base">📝</span>

                {/* Titre */}
                <h5 className="font-medium text-sm text-slate-700 flex-1">
                    {sousCategorie.nom}
                </h5>

                {/* ✅ NOUVEAU : Badges statistiques */}
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {/* Badge Total */}
                    <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-xs px-2 py-0">
                        {stats.total}
                    </Badge>

                    {/* Badge Conforme */}
                    {stats.conforme > 0 && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs px-2 py-0">
                            {stats.conforme} C
                        </Badge>
                    )}

                    {/* Badge Non-Conforme */}
                    {stats.nonConforme > 0 && (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs px-2 py-0">
                            {stats.nonConforme} NC
                        </Badge>
                    )}

                    {/* Badge Sans Objet */}
                    {stats.sansObjet > 0 && (
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs px-2 py-0">
                            {stats.sansObjet} SO
                        </Badge>
                    )}

                    {/* Badge À Faire */}
                    {stats.aFaire > 0 && (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs px-2 py-0">
                            {stats.aFaire}
                        </Badge>
                    )}

                    {/* Séparateur */}
                    {stats.total > 0 && (
                        <div className="w-px h-5 bg-slate-200 mx-0.5" />
                    )}

                    {/* Bouton Ajouter */}
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            handleOpenPointFormModal(null); 
                        }} 
                        className="h-7 w-7 text-slate-500 hover:text-sky-600 hover:bg-slate-50"
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
                        <div className="p-3 pt-2 space-y-2 bg-slate-50">
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
                                    documents={documents}
                                />
                            ))}
                            {pointsDeCetteSousCategorie.length === 0 && (
                                <p className="text-xs text-slate-400 italic py-1">
                                    Aucun point de contrôle dans cette sous-catégorie.
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