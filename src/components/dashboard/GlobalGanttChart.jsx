import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  parseISO,
  format,
  startOfDay,
  endOfDay,
  isPast,
  isFuture,
  startOfWeek,
  endOfWeek,
  differenceInWeeks,
  addWeeks,
  isValid as isValidFn,
  eachWeekOfInterval
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ChevronDown, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { Link } from 'react-router-dom';

// === Constantes pour une vue par SEMAINE ===
const MIN_WEEK_WIDTH = 24;
const MAX_WEEK_WIDTH = 120;
const DEFAULT_WEEK_WIDTH = 56;
const ROW_HEIGHT = 36;
const TASK_ROW_HEIGHT = 32;
const WEEK_GAP = 4; // ✅ NOUVEAU : Espace entre les semaines

const isValidDate = (date) => date instanceof Date && !isNaN(date.getTime());

const safeParseDate = (value) => {
  if (!value || typeof value !== 'string') return null;
  const parsed = parseISO(value);
  return isValidDate(parsed) ? parsed : null;
};

const calculerPeriodeChantier = (tachesDuChantier) => {
  const debuts = [];
  const fins = [];

  tachesDuChantier.forEach(tache => {
    const debut = safeParseDate(tache.datedebut);
    const fin = safeParseDate(tache.datefin);
    if (isValidDate(debut)) debuts.push(startOfDay(debut));
    if (isValidDate(fin)) fins.push(endOfDay(fin));
  });

  const datesDebutValid = debuts.filter(d => d instanceof Date && !isNaN(d));
  const datesFinValid = fins.filter(d => d instanceof Date && !isNaN(d));

  if (datesDebutValid.length === 0 || datesFinValid.length === 0) {
    console.warn('❌ Aucune date valide pour dateMin/dateMax après filtrage');
    return null;
  }

  const debutGlobal = new Date(Math.min(...datesDebutValid.map(d => d.getTime())));
  const finGlobal = new Date(Math.max(...datesFinValid.map(d => d.getTime())));

  return {
    debutGlobal,
    finGlobal,
  };
};

const isOverlap = (startA, endA, startB, endB) => {
  return startA <= endB && startB <= endA;
};

const detectGlobalConflicts = (allTaches) => {
  const taskConflicts = new Set();
  const stAssignments = {};

  allTaches.forEach(tache => {
    if (tache.assignetype === 'soustraitant' && tache.assigneid && tache.datedebut && tache.datefin) {
      const startDate = startOfDay(parseISO(tache.datedebut));
      const endDate = endOfDay(parseISO(tache.datefin));
      if (!isValidDate(startDate) || !isValidDate(endDate)) return;

      const stId = tache.assigneid;
      if (!stAssignments[stId]) stAssignments[stId] = [];
      stAssignments[stId].push({
        tacheId: tache.id,
        start: startDate,
        end: endDate,
        chantierid: tache.chantierid,
      });
    }
  });

  Object.keys(stAssignments).forEach(stId => {
    const assignments = stAssignments[stId].sort((a,b) => a.start - b.start);
    for (let i = 0; i < assignments.length; i++) {
      for (let j = i + 1; j < assignments.length; j++) {
        const assignA = assignments[i];
        const assignB = assignments[j];
        if (assignA.chantierid !== assignB.chantierid && isOverlap(assignA.start, assignA.end, assignB.start, assignB.end)) {
          taskConflicts.add(assignA.tacheId);
          taskConflicts.add(assignB.tacheId);
        }
      }
    }
  });
  return taskConflicts;
};

export function GlobalGanttChart({ chantiers, taches, initialStartDate }) {
  const [expandedChantiers, setExpandedChantiers] = useState({});
  const [weekWidth, setWeekWidth] = useState(DEFAULT_WEEK_WIDTH);

  const cleanTaches = useMemo(() => taches || [], [taches]);
  const conflictingTaskIdsAcrossAllChantiers = useMemo(() => detectGlobalConflicts(cleanTaches), [cleanTaches]);

  const ganttData = useMemo(() => {
    if (chantiers.length === 0) {
      const defaultStart = initialStartDate || startOfDay(new Date());
      const defaultStartWeek = startOfWeek(defaultStart, { weekStartsOn: 1 });
      const defaultEndWeek = endOfWeek(addWeeks(defaultStartWeek, 4), { weekStartsOn: 1 });
      const totalWeeks = differenceInWeeks(defaultEndWeek, defaultStartWeek) + 1;
      return { items: [], overallStartDate: defaultStartWeek, overallEndDate: defaultEndWeek, totalWeeks };
    }

    const today = startOfDay(new Date());

    const items = chantiers.map(chantier => {
      const chantierTaches = cleanTaches
        .filter(t => t.chantierid === chantier.id)
        .sort((a,b) => {
          const dateA = parseISO(a.datedebut);
          const dateB = parseISO(b.datedebut);
          if (!isValidDate(dateA) || !isValidDate(dateB)) return 0;
          return dateA - dateB;
        });

      let chantierOverallStart = null;
      let chantierOverallEnd = null;
      let hasConflictInChantier = false;

      const periode = calculerPeriodeChantier(chantierTaches);

      if (periode && isValidDate(periode.debutGlobal) && isValidDate(periode.finGlobal)) {
        chantierOverallStart = periode.debutGlobal;
        chantierOverallEnd = periode.finGlobal;
      }

      hasConflictInChantier = chantierTaches.some(t => conflictingTaskIdsAcrossAllChantiers.has(t.id));

      if (!isValidDate(chantierOverallStart) || !isValidDate(chantierOverallEnd)) {
        chantierOverallStart = startOfDay(new Date());
        chantierOverallEnd = endOfDay(new Date());
      }

      return {
        id: chantier.id,
        name: chantier.nomchantier,
        start: startOfDay(chantierOverallStart),
        end: endOfDay(chantierOverallEnd),
        type: 'chantier',
        color: hasConflictInChantier ? 'bg-red-300' : 'bg-blue-300',
        tasks: chantierTaches
          .map(tache => {
            const tacheDateDebut = parseISO(tache.datedebut);
            const tacheDateFin = parseISO(tache.datefin);
            const isConflict = conflictingTaskIdsAcrossAllChantiers.has(tache.id);
            let taskColor = 'bg-gray-400';

            if (isConflict) {
              taskColor = 'bg-red-600';
            } else if (isValidDate(tacheDateFin) && isPast(tacheDateFin) && !tache.terminee) {
              taskColor = 'bg-red-400';
            } else if (tache.terminee) {
              taskColor = 'bg-green-500';
            } else if (isValidDate(tacheDateFin) && (isFuture(tacheDateFin) || format(tacheDateFin, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd'))) {
              if (tache.assignetype === 'fournisseur') {
                taskColor = 'bg-blue-500';
              } else if (tache.assignetype === 'soustraitant') {
                taskColor = 'bg-orange-400';
              }
            }

            return {
              id: `task-${tache.id}`,
              name: tache.nom,
              start: isValidDate(tacheDateDebut) ? startOfDay(tacheDateDebut) : (initialStartDate || startOfDay(new Date())),
              end: isValidDate(tacheDateFin) ? endOfDay(tacheDateFin) : endOfDay(startOfDay(initialStartDate || new Date())),
              type: 'task',
              color: taskColor,
              chantierid: chantier.id,
              hasConflict: isConflict,
            };
          })
          .sort((a,b) => a.start - b.start)
      };
    }).sort((a, b) => a.start - b.start);

    if (items.length === 0) {
      const defaultStart = initialStartDate || startOfDay(new Date());
      const defaultStartWeek = startOfWeek(defaultStart, { weekStartsOn: 1 });
      const defaultEndWeek = endOfWeek(addWeeks(defaultStartWeek, 4), { weekStartsOn: 1 });
      const totalWeeks = differenceInWeeks(defaultEndWeek, defaultStartWeek) + 1;
      return { items: [], overallStartDate: defaultStartWeek, overallEndDate: defaultEndWeek, totalWeeks };
    }

    let overallStartDate = items.reduce((minDt, item) => (item.start < minDt ? item.start : minDt), items[0].start);
    let overallEndDate = items.reduce((maxDt, item) => (item.end > maxDt ? item.end : maxDt), items[0].end);

    if (initialStartDate) overallStartDate = startOfDay(initialStartDate);

    const overallStartAligned = startOfWeek(overallStartDate, { weekStartsOn: 1 });
    const overallEndAligned = endOfWeek(overallEndDate, { weekStartsOn: 1 });

    const minEnd = endOfWeek(addWeeks(overallStartAligned, 4), { weekStartsOn: 1 });
    const finalOverallEnd = overallEndAligned < minEnd ? minEnd : overallEndAligned;

    const totalWeeks = Math.max(1, differenceInWeeks(finalOverallEnd, overallStartAligned) + 1);

    return { items, overallStartDate: overallStartAligned, overallEndDate: finalOverallEnd, totalWeeks };
  }, [chantiers, cleanTaches, conflictingTaskIdsAcrossAllChantiers, initialStartDate]);

  const { items, overallStartDate, overallEndDate, totalWeeks } = ganttData;

  useEffect(() => {
    setExpandedChantiers({});
  }, [chantiers]);

  if (items.length === 0 && chantiers.length > 0) {
    return <p className="text-muted-foreground text-center py-8">Aucune tâche planifiée pour les chantiers en cours pour afficher le planning.</p>;
  }
  if (chantiers.length === 0) {
    return <p className="text-muted-foreground text-center py-8">Aucun chantier en cours à afficher.</p>;
  }

  const toggleChantierExpand = (chantierId) => {
    setExpandedChantiers(prev => ({ ...prev, [chantierId]: !prev[chantierId] }));
  };

  const handleZoomIn = () => setWeekWidth(prev => Math.min(MAX_WEEK_WIDTH, prev + 6));
  const handleZoomOut = () => setWeekWidth(prev => Math.max(MIN_WEEK_WIDTH, prev - 6));

  const getWeekHeaders = () => {
    const headers = [];
    if (!isValidDate(overallStartDate) || !isValidDate(overallEndDate)) return headers;

    let current = overallStartDate;
    while (current <= overallEndDate) {
      headers.push({
        startDate: current,
        endDate: endOfWeek(current, { weekStartsOn: 1 }),
        label: format(current, "'S'ww", { locale: fr })
      });
      current = addWeeks(current, 1);
      if (!isValidDate(current) || headers.length > 520) break;
    }
    return headers;
  };

  const weekHeaders = getWeekHeaders();

  const getMonthHeaders = () => {
    const months = [];
    if (weekHeaders.length === 0) return months;

    let group = {
      monthKey: format(weekHeaders[0].startDate, 'yyyy-MM'),
      name: format(weekHeaders[0].startDate, 'MMM yyyy', { locale: fr }),
      weeksCount: 0
    };

    weekHeaders.forEach((w, idx) => {
      const wMonthKey = format(w.startDate, 'yyyy-MM');
      if (wMonthKey !== group.monthKey) {
        months.push({ ...group });
        group = {
          monthKey: wMonthKey,
          name: format(w.startDate, 'MMM yyyy', { locale: fr }),
          weeksCount: 1
        };
      } else {
        group.weeksCount += 1;
      }
      if (idx === weekHeaders.length - 1) months.push({ ...group });
    });

    return months.map(m => ({ ...m, width: m.weeksCount * (weekWidth + WEEK_GAP) }));
  };

  const monthHeaders = getMonthHeaders();

  // ✅ NOUVEAU : Fonction pour calculer la position d'une semaine avec gaps
  const getWeekPosition = (weekIndex) => {
    return weekIndex * (weekWidth + WEEK_GAP);
  };

  let currentTopOffset = 0;
  const renderedItems = [];

  items.forEach((chantierItem) => {
    if (!isValidDate(chantierItem.start) || !isValidDate(chantierItem.end) || !isValidDate(overallStartDate)) return;

    const chantierStartAligned = startOfWeek(chantierItem.start, { weekStartsOn: 1 });
    const chantierEndAligned = endOfWeek(chantierItem.end, { weekStartsOn: 1 });

    // ✅ MODIFIÉ : Ne pas créer de segments pour les chantiers, juste générer les segments de barres
    const chantierWeeks = eachWeekOfInterval(
      { start: chantierStartAligned, end: chantierEndAligned },
      { weekStartsOn: 1 }
    );

    const chantierSegments = chantierWeeks.map(weekStart => {
      const weekIndex = differenceInWeeks(weekStart, overallStartDate);
      return {
        weekIndex,
        left: getWeekPosition(weekIndex),
        width: weekWidth
      };
    });

    // ✅ NOUVEAU : Ajouter l'item chantier UNE SEULE FOIS avec ses segments
    renderedItems.push({
      ...chantierItem,
      segments: chantierSegments,
      displayProps: {
        top: currentTopOffset,
        height: ROW_HEIGHT - 4,
      }
    });

    currentTopOffset += ROW_HEIGHT;

    if (expandedChantiers[chantierItem.id]) {
      let ligne1End = null;
      let ligne2End = null;
      
      chantierItem.tasks.forEach((taskItem) => {
        if (!isValidDate(taskItem.start) || !isValidDate(taskItem.end)) return;

        const taskStartAligned = startOfWeek(taskItem.start, { weekStartsOn: 1 });
        const taskEndAligned = endOfWeek(taskItem.end, { weekStartsOn: 1 });

        const taskWeeks = eachWeekOfInterval(
          { start: taskStartAligned, end: taskEndAligned },
          { weekStartsOn: 1 }
        );

        const taskSegments = taskWeeks.map(weekStart => {
          const weekIndex = differenceInWeeks(weekStart, overallStartDate);
          return {
            weekIndex,
            left: getWeekPosition(weekIndex),
            width: weekWidth
          };
        });

        let rowOffset = 0;
        
        if (!ligne1End || taskItem.start > ligne1End) {
          rowOffset = 0;
          ligne1End = taskItem.end;
        } else if (!ligne2End || taskItem.start > ligne2End) {
          rowOffset = TASK_ROW_HEIGHT;
          ligne2End = taskItem.end;
        } else {
          rowOffset = TASK_ROW_HEIGHT;
          ligne2End = taskItem.end > ligne2End ? taskItem.end : ligne2End;
        }

        renderedItems.push({
          ...taskItem,
          segments: taskSegments,
          displayProps: {
            top: currentTopOffset + rowOffset,
            height: TASK_ROW_HEIGHT - 4,
          }
        });
      });
      
      currentTopOffset += TASK_ROW_HEIGHT * 2;
    }
  });

  const chartHeight = currentTopOffset + 50 + 20;
  const totalWidth = getWeekPosition(totalWeeks);

  return (
    <div className="overflow-x-auto pb-4 bg-slate-50 p-1 rounded-lg shadow-inner relative">
      <div className="absolute top-1 right-1 z-30 flex space-x-1">
        <Button variant="outline" size="icon" onClick={handleZoomIn} disabled={weekWidth >= MAX_WEEK_WIDTH} className="h-7 w-7">
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="icon" onClick={handleZoomOut} disabled={weekWidth <= MIN_WEEK_WIDTH} className="h-7 w-7">
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* ✅ NOUVEAU : Layout en Flexbox - 2 colonnes */}
      <div className="flex">
        {/* ========== COLONNE 1 : NOMS DES CHANTIERS (fixe) ========== */}
        <div className="flex-shrink-0 w-[250px] bg-slate-200">
          {/* Header "CHANTIER" */}
          <div className="h-7 border-r border-slate-300 border-b border-slate-300 flex items-center justify-center bg-slate-200 sticky top-0 z-20">
            <span className="text-[10px] font-semibold text-slate-700">CHANTIER</span>
          </div>

          {/* Ligne vide pour aligner avec les semaines */}
          <div className="h-5 border-r border-slate-300 border-b border-slate-300 bg-slate-200 sticky top-7 z-20"></div>

          {/* Liste des noms de chantiers - PAS DE SCROLL, PAS D'ABSOLUTE */}
          <div className="border-r border-slate-300">
            {renderedItems.map((item) => {
              // ✅ Afficher ligne pour chantier uniquement
              if (item.type !== 'chantier') return null;
              
              const isExpanded = expandedChantiers[item.id];
              
              return (
                <React.Fragment key={`label-group-${item.id}`}>
                  {/* Ligne du chantier */}
                  <div
                    className="flex items-center px-2 font-semibold text-slate-800 bg-slate-200 border-b border-slate-200/60"
                    style={{ height: ROW_HEIGHT }}
                  >
                    <Button variant="ghost" size="icon" onClick={() => toggleChantierExpand(item.id)} className="mr-1 h-7 w-7">
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </Button>
                    <Link
                      to={`/chantiers/${item.id}`}
                      className="truncate hover:underline text-sm"
                      title={item.name}
                    >
                      {item.name}
                    </Link>
                  </div>

                  {/* ✅ NOUVEAU : Si déplié, ajouter 2 lignes vides pour les tâches */}
                  {isExpanded && (
                    <>
                      <div style={{ height: TASK_ROW_HEIGHT }} className="bg-slate-200 border-b border-slate-200/60"></div>
                      <div style={{ height: TASK_ROW_HEIGHT }} className="bg-slate-200 border-b border-slate-200/60"></div>
                    </>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* ========== COLONNE 2 : GANTT (scrollable horizontalement) ========== */}
        <div className="flex-1 overflow-x-auto">
          <div style={{ minWidth: totalWidth }}>
            {/* Header mois */}
            <div className="flex sticky top-0 bg-slate-100 z-20 border-b border-slate-300">
              {monthHeaders.map((month, index) => (
                <div key={`month-${index}`} className="h-7 flex items-center justify-center border-r border-slate-300" style={{ width: month.width }}>
                  <span className="text-[10px] font-medium text-slate-600">{month.name}</span>
                </div>
              ))}
            </div>

            {/* Header semaines */}
            <div className="flex sticky top-7 bg-slate-100 z-20 border-b border-slate-300" style={{ gap: `${WEEK_GAP}px` }}>
              {weekHeaders.map((w, idx) => (
                <div 
                  key={`week-${idx}`} 
                  className="h-5 flex flex-col items-center justify-center bg-white border-r border-slate-200/80"
                  style={{ width: weekWidth }}
                >
                  <span className="text-[10px] text-slate-700 font-medium">{w.label}</span>
                </div>
              ))}
            </div>

            {/* Grille verticale */}
            <div className="relative pointer-events-none">
              {Array.from({ length: totalWeeks }).map((_, i) => (
                <div 
                  key={`gridline-v-${i}`}
                  className="absolute border-l border-slate-200/40" 
                  style={{ 
                    left: getWeekPosition(i),
                    top: 0,
                    bottom: 0,
                    height: chartHeight - (50 + 20)
                  }} 
                />
              ))}
            </div>

            {/* Conteneur des lignes de chantiers/tâches */}
            <div className="relative" style={{ height: chartHeight - (50 + 20) }}>
              {renderedItems.map((item, index) => {
                if (!isValidDate(item.start) || !isValidDate(item.end)) return null;
                const itemTextColor = item.type === 'chantier' && (item.color === 'bg-blue-300' || item.color === 'bg-red-300') ? 'text-slate-800' : 'text-white';
                
                return (
                  <React.Fragment key={item.id}>
                    {/* Ligne de séparation horizontale */}
                    <div
                      className="absolute left-0 right-0 border-b border-slate-200/60"
                      style={{
                        top: item.displayProps.top + (item.type === 'chantier' ? ROW_HEIGHT : TASK_ROW_HEIGHT) - 2,
                        height: 1,
                        zIndex: 0
                      }}
                    />

                    {/* Segments de barres */}
                    {item.segments && item.segments.map((segment, segIndex) => (
                      <motion.div
                        key={`${item.id}-seg-${segIndex}`}
                        className={`absolute flex items-center px-1.5 ${itemTextColor} text-[10px] overflow-hidden ${item.hasConflict && item.type === 'task' ? 'ring-2 ring-offset-1 ring-red-500' : 'hover:ring-1 hover:ring-offset-1 hover:ring-indigo-300'}`}
                        style={{
                          left: segment.left,
                          width: segment.width,
                          top: item.displayProps.top + 2,
                          height: item.displayProps.height,
                          zIndex: 5
                        }}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.02 }}
                        title={`${item.name}\nDu ${format(item.start, 'dd/MM/yy')} au ${format(item.end, 'dd/MM/yy')}${item.hasConflict && item.type === 'task' ? `\nConflit` : ''}`}
                      >
                        <div className={`absolute inset-0 ${item.color} ${item.type === 'task' ? 'opacity-80' : 'opacity-95'}`}></div>
                        {/* Nom uniquement sur le premier segment */}
                        {segIndex === 0 && (
                          <>
                            <span className="relative z-10 truncate text-[9px] font-medium">{item.name}</span>
                            {item.hasConflict && item.type === 'task' && <AlertTriangle className="h-3 w-3 ml-auto text-yellow-300 flex-shrink-0" />}
                          </>
                        )}
                      </motion.div>
                    ))}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}