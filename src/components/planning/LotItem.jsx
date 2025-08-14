import React from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Calendar, Edit, Trash2, User } from 'lucide-react';

export function LotItem({ lot, onEdit, onDelete, sousTraitants }) {
  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: fr });
    } catch (error) {
      return 'Date invalide';
    }
  };

  const sousTraitantAttitre = sousTraitants.find(st => st.id === lot.sousTraitantId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-medium">{lot.nom}</h3>
        <div className="flex space-x-2">
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {lot.description && <p className="text-sm text-muted-foreground mb-2">{lot.description}</p>}
      <div className="flex items-center text-sm text-muted-foreground">
        <Calendar className="mr-2 h-4 w-4" />
        <span>Du {formatDate(lot.dateDebut)} au {formatDate(lot.dateFin)}</span>
      </div>
      {sousTraitantAttitre && (
        <div className="flex items-center text-sm text-muted-foreground mt-1">
          <User className="mr-2 h-4 w-4" />
          <span>Artisan: {sousTraitantAttitre.nom}</span>
        </div>
      )}
    </motion.div>
  );
}