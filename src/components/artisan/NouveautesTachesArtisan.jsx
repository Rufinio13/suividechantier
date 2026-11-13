import React from 'react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Bell, ChevronRight, CheckCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const jour = (value) => {
  if (!value) return '—';
  try { return format(parseISO(value), 'dd/MM/yyyy', { locale: fr }); } catch { return value; }
};

// Liste des tâches avec une notification non vue (nouvelle tâche / date modifiée).
// Clic sur une ligne → ouvre la tâche (ce qui efface sa notification).
export function NouveautesTachesArtisan({ items, chantierNoms, onOuvrir, onToutMarquerVu }) {
  if (!items.length) return null;

  return (
    <Card id="nouveautes-taches" className="border-2 border-blue-200 bg-blue-50/40">
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-lg flex items-center">
          <Bell className="mr-2 h-5 w-5 text-blue-600" />
          Nouveautés sur vos tâches ({items.length})
        </CardTitle>
        {onToutMarquerVu && (
          <Button size="sm" variant="outline" className="bg-white" onClick={onToutMarquerVu}>
            <CheckCheck className="mr-2 h-4 w-4" /> Tout marquer comme vu
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Cliquez sur une tâche pour l'ouvrir : elle disparaît de cette liste.
        </p>
        {items.map(({ tache, nouvelle, modif }) => (
          <button
            key={tache.id}
            type="button"
            onClick={() => onOuvrir(tache)}
            className="group w-full flex items-center gap-3 rounded-lg border bg-white px-3 py-2 text-left hover:border-blue-300 hover:shadow-sm transition"
          >
            <div className="flex flex-col gap-1 shrink-0">
              {nouvelle && (
                <span className="text-xs font-semibold rounded-full px-2 py-0.5 bg-blue-500 text-white">Nouvelle</span>
              )}
              {modif && (
                <span className="text-xs font-semibold rounded-full px-2 py-0.5 bg-[#9FC760] text-[#27500A]">Date modifiée</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{tache.nom}</div>
              <div className="text-xs text-muted-foreground truncate">{chantierNoms[tache.chantierid] || ''}</div>
              <div className="text-xs text-slate-700 mt-0.5">
                {modif && (modif.ancienne_datedebut || modif.ancienne_datefin) ? (
                  <>
                    <span className="line-through text-slate-400">
                      {jour(modif.ancienne_datedebut)} → {jour(modif.ancienne_datefin)}
                    </span>
                    {'  '}
                    <span className="font-medium">{jour(tache.datedebut)} → {jour(tache.datefin)}</span>
                  </>
                ) : (
                  <span>Du {jour(tache.datedebut)} au {jour(tache.datefin)}</span>
                )}
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-blue-600 shrink-0" />
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
