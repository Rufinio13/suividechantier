import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, parseISO, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Calendar, Edit, Trash2, User, Truck, AlertTriangle } from 'lucide-react';
import { useChantier } from '@/context/ChantierContext';

export function TacheItem({ tache, lots, onEdit, onDelete, conflicts }) {
  const { sousTraitants, fournisseurs, updateTache, chantiers } = useChantier();

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: fr });
    } catch (error) {
      return 'Date invalide';
    }
  };

  const handleTermineeChange = (checked) => {
    updateTache(tache.id, { ...tache, terminee: checked });
  };

  const lot = lots.find(l => l.id === tache.lotId);
  
  let assigneEntity = null;
  let AssigneIcon = User; 
  if (tache.assigneType === 'soustraitant' && tache.assigneId) {
    assigneEntity = sousTraitants.find(st => st.id === tache.assigneId);
    AssigneIcon = User;
  } else if (tache.assigneType === 'fournisseur' && tache.assigneId) {
    assigneEntity = fournisseurs.find(f => f.id === tache.assigneId);
    AssigneIcon = Truck;
  }
  const assigneNom = assigneEntity ? (assigneEntity.nomSociete || assigneEntity.nomDirigeant || assigneEntity.nomContact) : 'Non assigné';

  const isRetard = !tache.terminee && tache.dateFin && isPast(parseISO(tache.dateFin));
  
  const tacheConflictInfo = useMemo(() => {
    if (!conflicts || !tache.assigneId || tache.assigneType !== 'soustraitant') return null;
    
    const conflictKey = `${tache.assigneId}-${format(parseISO(tache.dateDebut), 'yyyy-MM-dd')}`;
    const conflictDetails = conflicts[conflictKey];

    if (conflictDetails && conflictDetails.count > 1 && conflictDetails.chantierIds.includes(tache.chantierId)) {
      const otherChantierIds = conflictDetails.chantierIds.filter(id => id !== tache.chantierId);
      if (otherChantierIds.length > 0) {
        const otherChantierNames = otherChantierIds.map(id => chantiers.find(c => c.id === id)?.nom).filter(Boolean);
        return {
          message: `Artisan en conflit le ${formatDate(tache.dateDebut)} avec chantier(s): ${otherChantierNames.join(', ')}.`,
          conflictingChantierNames: otherChantierNames
        };
      }
    }
    return null;
  }, [conflicts, tache, chantiers]);


  const hasConflict = !!tacheConflictInfo;
  const cardClasses = `p-4 border rounded-lg hover:bg-gray-50 transition-colors 
    ${hasConflict ? 'border-red-600 bg-red-100' : (isRetard ? 'border-red-500 bg-red-50' : '')}`;
  const titleClasses = `font-medium ${hasConflict ? 'text-red-700' : (isRetard ? 'text-red-700' : '')}`;


  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cardClasses}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className={titleClasses}>{tache.nom}</h3>
          {lot && <p className="text-xs text-muted-foreground">Lot: {lot.nom}</p>}
        </div>
        <div className="flex space-x-2">
          <Button variant="ghost" size="icon" onClick={onEdit} className="h-8 w-8">
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8 text-destructive hover:text-destructive/10">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {tache.description && <p className="text-sm text-muted-foreground mb-2">{tache.description}</p>}
      <div className="flex flex-col sm:flex-row sm:justify-between gap-3 items-start">
        <div className="flex items-center text-sm text-muted-foreground">
          <Calendar className="mr-2 h-4 w-4" />
          <span>Du {formatDate(tache.dateDebut)} au {formatDate(tache.dateFin)}</span>
          {isRetard && !hasConflict && <span className="ml-2 text-xs font-semibold text-red-600">(En retard)</span>}
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id={`terminee-${tache.id}`}
            checked={tache.terminee || false}
            onCheckedChange={handleTermineeChange}
            disabled={hasConflict}
          />
          <Label htmlFor={`terminee-${tache.id}`} className="text-sm font-medium">
            Terminé
          </Label>
        </div>
      </div>
      {tache.assigneId && (
        <div className="flex items-center text-sm text-muted-foreground mt-2 pt-2 border-t">
          <AssigneIcon className="mr-2 h-4 w-4" />
          <span>{tache.assigneType === 'soustraitant' ? 'Artisan: ' : 'Fournisseur: '} {assigneNom}</span>
        </div>
      )}
      {hasConflict && (
        <div className="mt-2 p-2 bg-red-200 border border-red-400 rounded-md text-xs text-red-800 flex items-center">
          <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
          {tacheConflictInfo.message}
        </div>
      )}
    </motion.div>
  );
}