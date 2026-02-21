import React, { useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, eachWeekOfInterval, eachDayOfInterval, isSameMonth, parseISO, addMonths, subMonths, startOfWeek, endOfWeek, isWithinInterval, startOfDay, isWeekend } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const JOURS_FERIES = [
  '2025-01-01', '2025-04-21', '2025-05-01', '2025-05-08', '2025-05-29', '2025-06-09',
  '2025-07-14', '2025-08-15', '2025-11-01', '2025-11-11', '2025-12-25',
  '2026-01-01', '2026-04-06', '2026-05-01', '2026-05-08', '2026-05-14', '2026-05-25',
  '2026-07-14', '2026-08-15', '2026-11-01', '2026-11-11', '2026-12-25',
];

export function CalendrierView({ 
  taches = [], 
  lots = [], 
  conflictsByChantier = {}, 
  onEditTache, 
  onAddTache,
  chantierColors = null,
  chantierNoms = null,
  readOnly = false,
  isArtisanView = false,
  notifications = []
}) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const goToPreviousMonth = () => setCurrentDate(prev => subMonths(prev, 1));
  const goToNextMonth = () => setCurrentDate(prev => addMonths(prev, 1));
  const goToToday = () => setCurrentDate(new Date());

  const handleDayClick = (day) => {
    if (readOnly || !onAddTache) return;
    
    const dateStr = format(day, 'yyyy-MM-dd');
    console.log('📅 Clic sur date:', dateStr);
    onAddTache(dateStr);
  };

  const getTacheColorByChantier = (tache) => {
    if (!chantierColors || !tache.chantierid) {
      return 'bg-gray-100 border-gray-300 text-gray-600';
    }
    
    const color = chantierColors[tache.chantierid];
    if (!color) return 'bg-gray-100 border-gray-300 text-gray-600';
    
    const isEnRetard = isArtisanView && 
                       tache.datefin &&
                       new Date(tache.datefin) < new Date() &&
                       !tache.artisan_termine &&
                       !tache.constructeur_valide;
    
    return {
      backgroundColor: `${color}20`,
      borderColor: isEnRetard ? '#dc2626' : color,
      color: color,
      borderWidth: '2px'
    };
  };

  const getColorForDay = (tache, dayStr) => {
    if (!tache.datedebut || !tache.datefin) return 'bg-gray-100 border-gray-300 text-gray-600';

    const tacheDateDebut = parseISO(tache.datedebut);
    const tacheDateFin = parseISO(tache.datefin);
    const today = startOfDay(new Date());

    let hasConflictThisDay = false;
    if (tache.assignetype === 'soustraitant' && tache.assigneid) {
      try {
        const key = `${tache.assigneid}-${dayStr}`;
        const conflict = conflictsByChantier[key];
        
        if (conflict && conflict.chantierids && conflict.chantierids.length > 1) {
          hasConflictThisDay = true;
        }
      } catch (err) {
        console.error("Erreur check conflit:", err);
      }
    }

    if (hasConflictThisDay) {
      return 'bg-red-100 border-red-400 text-red-800';
    } 
    else if (tache.artisan_termine && !tache.constructeur_valide) {
      return 'bg-yellow-100 border-yellow-400 text-yellow-800';
    }
    else if (tache.constructeur_valide || tache.terminee) {
      return 'bg-blue-100 border-blue-400 text-blue-800';
    } 
    else if (tacheDateFin < today) {
      return 'bg-orange-100 border-orange-400 text-orange-800';
    } else {
      return 'bg-green-100 border-green-400 text-green-800';
    }
  };

  const weeks = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    
    return eachWeekOfInterval(
      { start, end },
      { weekStartsOn: 1 }
    ).map(weekStart => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
      
      return {
        weekStart,
        weekEnd,
        days,
        weekNumber: format(weekStart, 'w', { locale: fr })
      };
    });
  }, [currentDate]);

  const tachesAvecLot = useMemo(() => {
    return taches.map(tache => {
      const lot = lots.find(l => l.id === tache.lotid);
      const lotNom = lot?.lot || 'Sans lot';
      
      const displayName = (isArtisanView && chantierNoms && tache.chantierid) 
        ? chantierNoms[tache.chantierid] 
        : tache.nom;
      
      const isEnRetard = isArtisanView && 
                         tache.datefin &&
                         new Date(tache.datefin) < new Date() &&
                         !tache.artisan_termine &&
                         !tache.constructeur_valide;
      
      const isNouvelleTache = isArtisanView && notifications.some(
        n => n.tache_id === tache.id && n.type === 'nouvelle_tache' && !n.vu
      );
      
      return {
        ...tache,
        lotNom,
        displayName,
        isEnRetard,
        isNouvelleTache,
      };
    });
  }, [taches, lots, conflictsByChantier, chantierColors, chantierNoms, isArtisanView, notifications]);

  const getTachesForDay = (day) => {
    if (isWeekend(day)) return [];
    
    const dayStr = format(day, 'yyyy-MM-dd');
    
    if (JOURS_FERIES.includes(dayStr)) return [];
    
    return tachesAvecLot.filter(tache => {
      if (!tache.datedebut) return false;
      
      const tacheStart = format(parseISO(tache.datedebut), 'yyyy-MM-dd');
      const tacheEnd = tache.datefin ? format(parseISO(tache.datefin), 'yyyy-MM-dd') : tacheStart;
      
      return dayStr >= tacheStart && dayStr <= tacheEnd;
    }).map(tache => {
      const tacheColor = chantierColors 
        ? getTacheColorByChantier(tache)
        : getColorForDay(tache, dayStr);
      
      return {
        ...tache,
        tacheColor: typeof tacheColor === 'string' ? tacheColor : null,
        tacheStyle: typeof tacheColor === 'object' ? tacheColor : null
      };
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-bold min-w-[200px] text-center">
            {format(currentDate, 'MMMM yyyy', { locale: fr })}
          </h2>
          <Button variant="outline" size="sm" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={goToToday}>
          Aujourd'hui
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="grid grid-cols-8 bg-muted border-b">
          <div className="p-2 text-center text-sm font-medium">Semaine</div>
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium">
              {day}
            </div>
          ))}
        </div>

        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-8 border-b last:border-b-0">
            <div className="border-r p-2 bg-muted/30 flex items-start justify-center">
              <div className="text-xs font-medium">S-{week.weekNumber}</div>
            </div>

            {week.days.map((day, dayIndex) => {
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
              const dayStr = format(day, 'yyyy-MM-dd');
              const isWeekendDay = isWeekend(day);
              const isFerie = JOURS_FERIES.includes(dayStr);
              const isNonOuvre = isWeekendDay || isFerie;
              const tachesForDay = getTachesForDay(day);

              return (
                <div
                  key={dayIndex}
                  className={cn(
                    'border-r last:border-r-0 p-1 min-h-[100px]',
                    !isCurrentMonth && 'bg-muted/20',
                    isToday && 'bg-blue-50',
                    isNonOuvre && isCurrentMonth && !isToday && 'bg-slate-100',
                    !readOnly && isCurrentMonth && !isNonOuvre && 'cursor-pointer hover:bg-slate-50'
                  )}
                  onClick={() => {
                    if (isCurrentMonth && !isNonOuvre) {
                      handleDayClick(day);
                    }
                  }}
                >
                  <div className={cn(
                    'text-xs font-medium mb-1',
                    !isCurrentMonth && 'text-muted-foreground',
                    isToday && 'text-blue-600 font-bold'
                  )}>
                    {format(day, 'd')}
                  </div>

                  <div className="space-y-1">
                    {tachesForDay.map((tache, idx) => (
                      <div
                        key={`${tache.id}-${idx}`}
                        className={cn(
                          'p-1 rounded border text-[10px] transition-opacity relative',
                          tache.tacheColor || '',
                          onEditTache && 'cursor-pointer hover:opacity-80'
                        )}
                        style={tache.tacheStyle || {}}
                        title={`${tache.lotNom}: ${tache.displayName}${onEditTache ? ' - Cliquer pour voir détails' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onEditTache) {
                            onEditTache(tache);
                          }
                        }}
                      >
                        <div className="font-medium flex items-center gap-1">
                          {isArtisanView && tache.isNouvelleTache && (
                            <span 
                              className="inline-block w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" 
                              title="Nouvelle tâche"
                            ></span>
                          )}
                          
                          <span className="truncate">{tache.displayName}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {!chantierColors && (
        <div className="flex flex-wrap gap-3 text-xs items-center">
          <span className="font-medium">Légende :</span>
          <span className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-green-500"></div>
            À faire
          </span>
          <span className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-yellow-500"></div>
            Terminée par artisan
          </span>
          <span className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-blue-500"></div>
            Validée
          </span>
          <span className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-orange-500"></div>
            En retard
          </span>
          <span className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-red-600"></div>
            Conflit artisan
          </span>
        </div>
      )}
    </div>
  );
}