import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Edit, Trash2, CheckSquare, Layers, ListChecks } from 'lucide-react';

/* ---------------------------------------------------
 *  Sécurisation des accès : éviter les undefined
 * --------------------------------------------------- */
const safeArray = (item) => (Array.isArray(item) ? item : []);

/* ---------------------------------------------------
 *  POINT DE CONTRÔLE
 * --------------------------------------------------- */
function PointControleDisplay({ point }) {
  if (!point) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="ml-12 py-1 flex items-start"
    >
      <CheckSquare size={16} className="mr-2 mt-1 text-slate-500 flex-shrink-0" />
      <div>
        <p className="text-sm text-slate-700">{point.libelle || 'Point sans libellé'}</p>
        {point.description && (
          <p className="text-xs text-slate-500">{point.description}</p>
        )}
      </div>
    </motion.div>
  );
}

/* ---------------------------------------------------
 *  SOUS-CATÉGORIE
 * --------------------------------------------------- */
function SousCategorieDisplay({ sousCategorie }) {
  const [isOpen, setIsOpen] = useState(false);
  const points = safeArray(sousCategorie?.pointsControle);

  return (
    <div className="ml-8 py-2 border-l border-slate-300 pl-3">
      <div
        className="flex justify-between items-center cursor-pointer hover:bg-slate-100 p-2 rounded-md"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center">
          <ListChecks size={18} className="mr-2 text-slate-600" />
          <h5 className="font-medium text-sm text-slate-800">
            {sousCategorie?.nom || 'Sous-catégorie sans nom'}
          </h5>
        </div>
        {isOpen ? (
          <ChevronUp size={16} className="text-slate-500" />
        ) : (
          <ChevronDown size={16} className="text-slate-500" />
        )}
      </div>

      <AnimatePresence>
        {isOpen && points.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-1 space-y-1"
          >
            {points.map((pc) => (
              <PointControleDisplay key={pc.id} point={pc} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {isOpen && points.length === 0 && (
        <p className="text-xs text-slate-400 italic ml-8 py-1">
          Aucun point de contrôle.
        </p>
      )}
    </div>
  );
}

/* ---------------------------------------------------
 *  CATÉGORIE (ancien DOMAINE)
 * --------------------------------------------------- */
function CategorieDisplay({ categorie }) {
  const [isOpen, setIsOpen] = useState(false);
  const sousCategories = safeArray(categorie?.sousCategories);

  return (
    <div className="ml-4 py-2 border-l-2 border-blue-300 pl-3">
      <div
        className="flex justify-between items-center cursor-pointer hover:bg-blue-50 p-2 rounded-md"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center">
          <Layers size={18} className="mr-2 text-blue-600" />
          <h4 className="font-semibold text-md text-blue-700">
            {categorie?.nom || 'Catégorie sans nom'}
          </h4>
        </div>

        {isOpen ? (
          <ChevronUp size={18} className="text-blue-500" />
        ) : (
          <ChevronDown size={18} className="text-blue-500" />
        )}
      </div>

      <AnimatePresence>
        {isOpen && sousCategories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-1 space-y-1"
          >
            {sousCategories.map((sc) => (
              <SousCategorieDisplay key={sc.id} sousCategorie={sc} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {isOpen && sousCategories.length === 0 && (
        <p className="text-xs text-slate-400 italic ml-8 py-1">
          Aucune sous-catégorie dans cette catégorie.
        </p>
      )}
    </div>
  );
}

/* ---------------------------------------------------
 *  COMPOSANT PRINCIPAL
 * --------------------------------------------------- */
export function ModeleCQItem({ modele, onEdit, onDelete }) {
  const [isExpanded, setIsExpanded] = useState(false);
  // ✅ CORRIGÉ : On charge depuis 'categories' maintenant (pas 'domaines')
  const categories = safeArray(modele?.categories);

  return (
    <motion.div layout>
      <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300">
        <CardHeader
          className="flex flex-row items-center justify-between cursor-pointer p-4 bg-gradient-to-r from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-200"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div>
            <CardTitle className="text-lg text-primary">
              {modele?.titre || 'Modèle sans titre'}
            </CardTitle>
            <CardDescription>
              {categories.length} catégorie{categories.length !== 1 ? 's' : ''} de contrôle
            </CardDescription>
          </div>

          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="text-slate-600 hover:text-primary h-8 w-8"
            >
              <Edit size={18} />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-destructive hover:bg-destructive/10 h-8 w-8"
            >
              <Trash2 size={18} />
            </Button>

            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </CardHeader>

        <AnimatePresence>
          {isExpanded && (
            <motion.section
              key="content"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <CardContent className="p-4 space-y-2 bg-white">
                {categories.length > 0 ? (
                  categories.map((cat) => (
                    <CategorieDisplay key={cat.id} categorie={cat} />
                  ))
                ) : (
                  <p className="text-sm text-slate-500 italic text-center py-4">
                    Aucune catégorie définie pour ce modèle.
                  </p>
                )}
              </CardContent>
            </motion.section>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}