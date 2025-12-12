import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Edit, Trash2, Check, Calendar, Truck, Clock, FileText, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export function CommandeItem({ commande, isEnRetard, onEdit, onDelete, onToggleLivraison }) {
  if (!commande) return null;

  const estLivree = !!commande.livraison_realisee;
  const estCommandee = !!commande.date_commande_reelle;
  const fournisseurNom = commande.fournisseurs?.nomsocieteF || 'Fournisseur inconnu';

  // Déterminer la couleur de la card
  let cardBgClass = 'bg-white border-slate-200'; // Blanc par défaut
  let badgeVariant = 'outline';
  let badgeText = 'Non commandée';
  let badgeIcon = Clock;

  if (estCommandee) {
    // Vert si commandée
    cardBgClass = 'bg-green-50 border-green-200';
    badgeVariant = 'default';
    badgeText = 'Commandée';
    badgeIcon = Check;
  } else if (isEnRetard) {
    // Rouge si date prévisionnelle dépassée et pas commandée
    cardBgClass = 'bg-red-50 border-red-300';
    badgeVariant = 'destructive';
    badgeText = 'En retard';
    badgeIcon = AlertTriangle;
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Non définie';
    try {
      return format(parseISO(dateString), 'dd MMMM yyyy', { locale: fr });
    } catch {
      return 'Date invalide';
    }
  };

  const BadgeIconComponent = badgeIcon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      layout
    >
      <Card className={`hover:shadow-md transition-shadow ${cardBgClass}`}>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                {commande.nom_commande}
                
                {/* Badge statut */}
                <Badge 
                  variant={badgeVariant}
                  className={
                    estCommandee 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : isEnRetard 
                      ? 'animate-pulse' 
                      : 'bg-slate-100 text-slate-700'
                  }
                >
                  <BadgeIconComponent className="h-3 w-3 mr-1" />
                  {badgeText}
                </Badge>
              </CardTitle>
              
              {/* Fournisseur */}
              <p className="text-sm text-muted-foreground mt-1 flex items-center">
                <Truck className="h-4 w-4 mr-1" />
                {fournisseurNom}
              </p>
            </div>

            {/* Actions */}
            <div className="flex space-x-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onEdit}
                className="h-8 w-8"
              >
                <Edit className="h-4 w-4" />
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onDelete}
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 text-sm">
          
          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-start">
              <Calendar className="h-4 w-4 mr-2 text-blue-600 mt-0.5" />
              <div>
                <p className="font-semibold text-xs">Livraison souhaitée</p>
                <p className="text-muted-foreground">{formatDate(commande.date_livraison_souhaitee)}</p>
              </div>
            </div>

            <div className="flex items-start">
              <Clock className="h-4 w-4 mr-2 text-orange-600 mt-0.5" />
              <div>
                <p className="font-semibold text-xs">Commande prévisionnelle</p>
                <p className={`${isEnRetard && !estCommandee ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
                  {formatDate(commande.date_commande_previsionnelle)}
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <Check className="h-4 w-4 mr-2 text-green-600 mt-0.5" />
              <div>
                <p className="font-semibold text-xs">Commande réelle</p>
                <p className="text-muted-foreground">
                  {commande.date_commande_reelle 
                    ? formatDate(commande.date_commande_reelle)
                    : <em className="text-slate-400">Non commandée</em>
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Délai */}
          <div className="flex items-center text-xs text-muted-foreground pt-2 border-t">
            <Clock className="h-3 w-3 mr-1" />
            Délai : {commande.delai_commande_semaines} semaine{commande.delai_commande_semaines > 1 ? 's' : ''}
          </div>

          {/* Notes */}
          {commande.notes && (
            <div className="flex items-start text-xs pt-2 border-t">
              <FileText className="h-3 w-3 mr-2 text-slate-500 mt-0.5" />
              <p className="text-muted-foreground">{commande.notes}</p>
            </div>
          )}

          {/* Checkbox Livraison réalisée */}
          <div className="pt-3 border-t">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id={`livraison-${commande.id}`}
                checked={estLivree}
                onCheckedChange={() => onToggleLivraison(commande.id, !estLivree)}
              />
              <Label 
                htmlFor={`livraison-${commande.id}`}
                className={`text-sm cursor-pointer ${estLivree ? 'text-green-600 font-semibold' : 'text-slate-600'}`}
              >
                {estLivree ? '✅ Livraison réalisée' : '📦 Marquer comme livrée'}
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}