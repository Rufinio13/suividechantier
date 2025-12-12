import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Edit, Trash2, Clock, FileText, Package } from 'lucide-react';

export function ModeleCommandeItem({ modele, onEdit, onDelete }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!modele) return null;

  const commandesTypes = modele.commandes_types || [];

  return (
    <motion.div layout>
      <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300">
        <CardHeader
          className="flex flex-row items-center justify-between cursor-pointer p-4 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex-1">
            <CardTitle className="text-lg text-primary flex items-center gap-2">
              <Package className="h-5 w-5" />
              {modele.titre || 'Template sans titre'}
              <Badge variant="outline" className="ml-2">
                {commandesTypes.length} commande{commandesTypes.length > 1 ? 's' : ''}
              </Badge>
            </CardTitle>
            {modele.description && (
              <CardDescription className="mt-1">
                {modele.description}
              </CardDescription>
            )}
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
              <CardContent className="p-4 space-y-3 bg-white border-t">
                
                {/* Description longue */}
                {modele.description && (
                  <div className="flex items-start pb-3 border-b">
                    <FileText className="h-5 w-5 mr-3 text-slate-500 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm">Description</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {modele.description}
                      </p>
                    </div>
                  </div>
                )}

                {/* Liste des commandes types */}
                <div>
                  <h4 className="font-semibold text-sm mb-3 flex items-center">
                    <Package className="h-4 w-4 mr-2 text-orange-600" />
                    Commandes pré-configurées
                  </h4>
                  
                  {commandesTypes.length > 0 ? (
                    <div className="space-y-2">
                      {commandesTypes.map((commande, index) => (
                        <div 
                          key={index}
                          className="flex items-center justify-between p-3 bg-slate-50 rounded-md border"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-sm">{commande.nom}</p>
                          </div>
                          <Badge variant="outline" className="ml-3">
                            <Clock className="h-3 w-3 mr-1" />
                            {commande.delai_semaines} sem.
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      Aucune commande configurée
                    </p>
                  )}
                </div>

                {/* Info d'utilisation */}
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-3">
                  <p className="text-xs text-blue-900">
                    <strong>💡 Utilisation :</strong> Appliquez ce template à un chantier pour créer automatiquement 
                    toutes ces commandes. Vous n'aurez plus qu'à choisir le fournisseur et la date de livraison pour chaque commande.
                  </p>
                </div>

              </CardContent>
            </motion.section>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}