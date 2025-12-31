import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, parseISO, isPast, eachDayOfInterval, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Calendar, Edit, Trash2, User, Truck, AlertTriangle, CheckCircle, Camera } from 'lucide-react';
import { useChantier } from '@/context/ChantierContext';

export function TacheItem({ tache, lots, onEdit, onDelete, conflicts }) {
  const { sousTraitants, fournisseurs, updateTache, chantiers } = useChantier();

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: fr });
    } catch {
      return 'Date invalide';
    }
  };

  // ✅ MODIFIÉ : Permettre de décocher même si artisan a terminé
  const handleTermineeChange = (checked) => {
    updateTache(tache.id, { 
      ...tache, 
      terminee: checked,
      constructeur_valide: checked,
      constructeur_valide_date: checked ? new Date().toISOString() : null
    });
  };

  // --------------------- LOT ---------------------
  const lot = lots.find(l => l.id === tache.lotid);

  // --------------------- ASSIGNÉ ---------------------
  let assigneEntity = null;
  let AssigneIcon = User;

  if (tache.assignetype === 'soustraitant' && tache.assigneid) {
    assigneEntity = sousTraitants.find(st => st.id === tache.assigneid);
  } 
  else if (tache.assignetype === 'fournisseur' && tache.assigneid) {
    assigneEntity = fournisseurs.find(f => f.id === tache.assigneid);
    AssigneIcon = Truck;
  }

  const assigneNom = assigneEntity
    ? (tache.assignetype === 'soustraitant' 
        ? (assigneEntity.nomsocieteST || `${assigneEntity.PrenomST || ''} ${assigneEntity.nomST || ''}`.trim() || 'Artisan')
        : (assigneEntity.nomsocieteF || assigneEntity.nomcontact || 'Fournisseur'))
    : 'Non assigné';

  // --------------------- RETARD ---------------------
  const isRetard = !tache.constructeur_valide && !tache.terminee && tache.datefin && isPast(parseISO(tache.datefin));

  // --------------------- CONFLITS ---------------------
  const tacheConflictInfo = useMemo(() => {
    if (!tache.assigneid || tache.assignetype !== 'soustraitant' || !tache.datedebut || !tache.datefin) return null;

    try {
      const start = startOfDay(parseISO(tache.datedebut));
      const end = startOfDay(parseISO(tache.datefin));
      const days = eachDayOfInterval({ start, end });
      
      for (const day of days) {
        const key = `${tache.assigneid}-${format(day, "yyyy-MM-dd")}`;
        const conflict = conflicts[key];
        
        if (conflict && conflict.chantierids && conflict.chantierids.length > 1) {
          const otherIds = conflict.chantierids.filter(id => id !== tache.chantierid);
          
          if (otherIds.length > 0) {
            const otherNames = otherIds
              .map(id => chantiers.find(c => c.id === id)?.nomchantier)
              .filter(Boolean);
            
            return {
              message: `Artisan en conflit le ${format(day, 'dd/MM/yyyy')} avec: ${otherNames.join(', ')}.`,
            };
          }
        }
      }
    } catch (err) {
      console.error("Erreur parsing conflit:", err);
    }
    
    return null;
  }, [tache, conflicts, chantiers]);

  const hasConflict = !!tacheConflictInfo;

  // ✅ Classes conditionnelles selon statut
  const getCardClasses = () => {
    if (hasConflict) return 'p-4 border rounded-lg hover:bg-gray-50 transition-colors border-red-600 bg-red-50';
    if (tache.artisan_termine && !tache.constructeur_valide) return 'p-4 border rounded-lg hover:bg-gray-50 transition-colors border-yellow-500 bg-yellow-50';
    if (isRetard) return 'p-4 border rounded-lg hover:bg-gray-50 transition-colors border-orange-500 bg-orange-50';
    return 'p-4 border rounded-lg hover:bg-gray-50 transition-colors';
  };

  const getTitleClasses = () => {
    if (hasConflict) return 'font-medium text-red-700';
    if (tache.artisan_termine && !tache.constructeur_valide) return 'font-medium text-yellow-700';
    if (isRetard) return 'font-medium text-orange-700';
    return 'font-medium';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={getCardClasses()}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className={getTitleClasses()}>{tache.nom}</h3>
          {lot && <p className="text-xs text-muted-foreground">Lot: {lot.lot}</p>}
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

      {/* DESCRIPTION */}
      {tache.description && (
        <p className="text-sm text-muted-foreground mb-2">{tache.description}</p>
      )}

      {/* ✅ STATUT ARTISAN - Seulement si en attente validation */}
      {tache.artisan_termine && !tache.constructeur_valide && (
        <div className="mb-2 p-2 bg-yellow-100 border border-yellow-300 rounded-md flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-yellow-700" />
          <span className="text-xs font-semibold text-yellow-800">
            ✅ Terminée par l'artisan le {formatDate(tache.artisan_termine_date)}
          </span>
        </div>
      )}

      {/* ✅ PHOTOS ARTISAN - TOUJOURS VISIBLE si elles existent */}
      {tache.artisan_photos && Array.isArray(tache.artisan_photos) && tache.artisan_photos.length > 0 && (
        <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center gap-2 mb-2">
            <Camera className="h-4 w-4 text-blue-700" />
            <span className="text-xs font-semibold text-blue-800">
              {tache.artisan_photos.length} photo(s) de l'artisan
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {tache.artisan_photos.slice(0, 4).map((photo, idx) => (
              <img 
                key={idx}
                src={photo.url} 
                alt={photo.name || `Photo ${idx + 1}`}
                className="w-full h-16 object-cover rounded border cursor-pointer hover:opacity-80"
                onClick={() => window.open(photo.url, '_blank')}
              />
            ))}
          </div>
          {tache.artisan_photos.length > 4 && (
            <p className="text-xs text-blue-600 mt-1">
              +{tache.artisan_photos.length - 4} autre(s) photo(s)
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:justify-between gap-3 items-start">
        <div className="flex items-center text-sm text-muted-foreground">
          <Calendar className="mr-2 h-4 w-4" />
          <span>Du {formatDate(tache.datedebut)} au {formatDate(tache.datefin)}</span>
          {isRetard && !hasConflict && (
            <span className="ml-2 text-xs font-semibold text-orange-600">(En retard)</span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id={`terminee-${tache.id}`}
            checked={tache.constructeur_valide || tache.terminee || false}
            onCheckedChange={handleTermineeChange}
            disabled={hasConflict}
          />
          <Label htmlFor={`terminee-${tache.id}`} className="text-sm font-medium">
            {tache.artisan_termine && !tache.constructeur_valide ? 'Valider' : 'Terminé'}
          </Label>
        </div>
      </div>

      {/* ASSIGNÉ */}
      {tache.assigneid && (
        <div className="flex items-center text-sm text-muted-foreground mt-2 pt-2 border-t">
          <AssigneIcon className="mr-2 h-4 w-4" />
          <span>
            {tache.assignetype === 'soustraitant' ? 'Artisan: ' : 'Fournisseur: '}
            {assigneNom}
          </span>
        </div>
      )}

      {/* CONFLIT */}
      {hasConflict && (
        <div className="mt-2 p-2 bg-red-200 border border-red-400 rounded-md text-xs text-red-800 flex items-center">
          <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
          {tacheConflictInfo.message}
        </div>
      )}
    </motion.div>
  );
}