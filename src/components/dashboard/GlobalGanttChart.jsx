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
  isValid as isValidFn
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ChevronDown, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { corrigerTachesPourGantt } from '@/lib/ganttUtils';

// === Constantes pour une vue par SEMAINE ===
const MIN_WEEK_WIDTH = 24;
const MAX_WEEK_WIDTH = 120;
const DEFAULT_WEEK_WIDTH = 56; // largeur d'une colonne semaine
const ROW_HEIGHT = 36;
const TASK_ROW_HEIGHT = 32;

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
    const debut = safeParseDate(tache.dateDebut);
    const fin = safeParseDate(tache.dateFin);
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
  const stAssignments = {}; // key: ST id -> assignments

  allTaches.forEach(tache => {
    if (tache.assigneType === 'soustraitant' && tache.assigneId && tache.dateDebut && tache.dateFin) {
      const startDate = startOfDay(parseISO(tache.dateDebut));
      const endDate = endOfDay(parseISO(tache.dateFin));
      if (!isValidDate(startDate) || !isValidDate(endDate)) return;

      const stId = tache.assigneId;
      if (!stAssignments[stId]) stAssignments[stId] = [];
      stAssignments[stId].push({
        tacheId: tache.id,
        start: startDate,
        end: endDate,
        chantierId: tache.chantierId,
      });
    }
  });

  Object.keys(stAssignments).forEach(stId => {
    const assignments = stAssignments[stId].sort((a,b) => a.start - b.start);
    for (let i = 0; i < assignments.length; i++) {
      for (let j = i + 1; j < assignments.length; j++) {
        const assignA = assignments[i];
        const assignB = assignments[j];
        if (assignA.chantierId !== assignB.chantierId && isOverlap(assignA.start, assignA.end, assignB.start, assignB.end)) {
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

  // ====== Préparation des items (chantier + tâches) ======
  const ganttData = useMemo(() => {
    if (chantiers.length === 0) {
      const defaultStart = initialStartDate || startOfDay(new Date());
      const defaultStartWeek = startOfWeek(defaultStart, { weekStartsOn: 1 });
      const defaultEndWeek = endOfWeek(addWeeks(defaultStartWeek, 4), { weekStartsOn: 1 }); // ~5 semaines
      const totalWeeks = differenceInWeeks(defaultEndWeek, defaultStartWeek) + 1;
      return { items: [], overallStartDate: defaultStartWeek, overallEndDate: defaultEndWeek, totalWeeks };
    }

    const today = startOfDay(new Date());

    const items = chantiers.map(chantier => {
      const chantierTaches = cleanTaches
        .filter(t => t.chantierId === chantier.id)
        .sort((a,b) => {
          const dateA = parseISO(a.dateDebut);
          const dateB = parseISO(b.dateDebut);
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
        name: chantier.nom,
        start: startOfDay(chantierOverallStart),
        end: endOfDay(chantierOverallEnd),
        type: 'chantier',
        color: hasConflictInChantier ? 'bg-red-300' : 'bg-blue-300',
        tasks: chantierTaches
          .map(tache => {
            const tacheDateDebut = parseISO(tache.dateDebut);
            const tacheDateFin = parseISO(tache.dateFin);
            const isConflict = conflictingTaskIdsAcrossAllChantiers.has(tache.id);
            let taskColor = 'bg-gray-400';

            if (isConflict) {
              taskColor = 'bg-red-600';
            } else if (isValidDate(tacheDateFin) && isPast(tacheDateFin) && !tache.terminee) {
              taskColor = 'bg-red-400';
            } else if (tache.terminee) {
              taskColor = 'bg-green-500';
            } else if (isValidDate(tacheDateFin) && (isFuture(tacheDateFin) || format(tacheDateFin, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd'))) {
              if (tache.assigneType === 'fournisseur') {
                taskColor = 'bg-blue-500';
              } else if (tache.assigneType === 'soustraitant') {
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
              chantierId: chantier.id,
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

    // bornes globales alignées sur les semaines (lundi-dimanche)
    let overallStartDate = items.reduce((minDt, item) => (item.start < minDt ? item.start : minDt), items[0].start);
    let overallEndDate = items.reduce((maxDt, item) => (item.end > maxDt ? item.end : maxDt), items[0].end);

    if (initialStartDate) overallStartDate = startOfDay(initialStartDate);

    const overallStartAligned = startOfWeek(overallStartDate, { weekStartsOn: 1 });
    const overallEndAligned = endOfWeek(overallEndDate, { weekStartsOn: 1 });

    // garantie d'un minimum d'horizon (5 semaines)
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

  // === Génération des entêtes de mois et de semaines ===
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
      if (!isValidDate(current) || headers.length > 520) break; // sécurité
    }
    return headers;
  };

  const weekHeaders = getWeekHeaders();

  const getMonthHeaders = () => {
    // Regroupe les semaines consécutives appartenant au même mois
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

    // ajoute largeur en px
    return months.map(m => ({ ...m, width: m.weeksCount * weekWidth }));
  };

  const monthHeaders = getMonthHeaders();

  // === Placement des items (alignés sur les semaines) ===
  let currentTopOffset = 0;
  const renderedItems = [];

  items.forEach((chantierItem) => {
    if (!isValidDate(chantierItem.start) || !isValidDate(chantierItem.end) || !isValidDate(overallStartDate)) return;

    const chantierStartAligned = startOfWeek(chantierItem.start, { weekStartsOn: 1 });
    const chantierEndAligned = endOfWeek(chantierItem.end, { weekStartsOn: 1 });

    const chantierStartOffsetWeeks = differenceInWeeks(chantierStartAligned, overallStartDate);
    const chantierDurationWeeks = differenceInWeeks(chantierEndAligned, chantierStartAligned) + 1;

    if (chantierStartOffsetWeeks < -chantierDurationWeeks || chantierDurationWeeks <= 0) return;

    renderedItems.push({
      ...chantierItem,
      displayProps: {
        left: Math.max(0, chantierStartOffsetWeeks) * weekWidth,
        width: Math.max(0, (chantierDurationWeeks - Math.max(0, -chantierStartOffsetWeeks)) * weekWidth - 2),
        top: currentTopOffset,
        height: ROW_HEIGHT - 4,
      }
    });
    currentTopOffset += ROW_HEIGHT;

    if (expandedChantiers[chantierItem.id]) {
      chantierItem.tasks.forEach((taskItem) => {
        if (!isValidDate(taskItem.start) || !isValidDate(taskItem.end)) return;

        const taskStartAligned = startOfWeek(taskItem.start, { weekStartsOn: 1 });
        const taskEndAligned = endOfWeek(taskItem.end, { weekStartsOn: 1 });

        const taskStartOffsetWeeks = differenceInWeeks(taskStartAligned, overallStartDate);
        const taskDurationWeeks = differenceInWeeks(taskEndAligned, taskStartAligned) + 1;

        if (taskStartOffsetWeeks < -taskDurationWeeks || taskDurationWeeks <= 0) return;

        renderedItems.push({
          ...taskItem,
          displayProps: {
            left: Math.max(0, taskStartOffsetWeeks) * weekWidth,
            width: Math.max(0, (taskDurationWeeks - Math.max(0, -taskStartOffsetWeeks)) * weekWidth - 2),
            top: currentTopOffset,
            height: TASK_ROW_HEIGHT - 4,
          }
        });
        currentTopOffset += TASK_ROW_HEIGHT;
      });
    }
  });

  const chartHeight = currentTopOffset + 50 + 20; // 2 barres d'entêtes

  return (
    <div className="overflow-x-auto pb-4 bg-slate-50 p-1 rounded-lg shadow-inner relative">
      {/* Zoom */}
      <div className="absolute top-1 right-1 z-30 flex space-x-1">
        <Button variant="outline" size="icon" onClick={handleZoomIn} disabled={weekWidth >= MAX_WEEK_WIDTH} className="h-7 w-7">
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="icon" onClick={handleZoomOut} disabled={weekWidth <= MIN_WEEK_WIDTH} className="h-7 w-7">
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div style={{ width: totalWeeks * weekWidth + 250, minWidth: '100%' }}>
        {/* Ligne des mois */}
        <div className="flex sticky top-0 bg-slate-100 z-20" style={{ marginLeft: 250 }}>
          {monthHeaders.map((month, index) => (
            <div key={`month-${index}`} className="h-7 flex items-center justify-center border-r border-slate-300" style={{ width: month.width }}>
              <span className="text-[10px] font-medium text-slate-600">{month.name}</span>
            </div>
          ))}
        </div>

        {/* Ligne des semaines */}
        <div className="flex sticky top-7 bg-slate-100 z-20" style={{ marginLeft: 250 }}>
          {weekHeaders.map((w, idx) => (
            <div key={`week-${idx}`} className="h-5 flex flex-col items-center justify-center border-r border-slate-200/80" style={{ width: weekWidth }}>
              <span className="text-[10px] text-slate-700 font-medium">{w.label}</span>
            </div>
          ))}
        </div>

        {/* Grille verticale */}
        <div className="absolute top-0 left-250 h-full pointer-events-none z-0">
          {Array.from({ length: totalWeeks + 1 }).map((_, i) => (
            <div key={`gridline-v-${i}`} className="absolute h-full border-l border-slate-200/60" style={{ left: i * weekWidth, top: 50 + 20 }} />
          ))}
        </div>

        {/* Items */}
        <div className="relative" style={{ height: chartHeight - (50 + 20) }}>
          {renderedItems.map((item, index) => {
            if (!isValidDate(item.start) || !isValidDate(item.end) || item.displayProps.width <= 0) return null;
            const itemTextColor = item.type === 'chantier' && (item.color === 'bg-blue-300' || item.color === 'bg-red-300') ? 'text-slate-800' : 'text-white';
            return (
              <React.Fragment key={item.id}>
                <div
                  className="absolute left-0 border-b border-slate-200/60"
                  style={{
                    top: item.displayProps.top + (item.type === 'chantier' ? ROW_HEIGHT : TASK_ROW_HEIGHT) - 2,
                    width: totalWeeks * weekWidth + 250,
                    height: 1,
                    zIndex: 0
                  }}
                />

                {/* Libellé à gauche */}
                <div
                  className={`absolute flex items-center px-2 ${item.type === 'task' ? 'pl-8 text-slate-700' : 'font-semibold text-slate-800'}`}
                  style={{
                    left: 0,
                    width: 250,
                    top: item.displayProps.top,
                    height: item.type === 'chantier' ? ROW_HEIGHT : TASK_ROW_HEIGHT,
                    zIndex: 10
                  }}
                >
                  {item.type === 'chantier' && (
                    <Button variant="ghost" size="icon" onClick={() => toggleChantierExpand(item.id)} className="mr-1 h-7 w-7">
                      {expandedChantiers[item.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </Button>
                  )}
                  <Link
                    to={item.type === 'chantier' ? `/chantiers/${item.id}` : `/chantiers/${item.chantierId}/planning`}
                    className="truncate hover:underline"
                    title={item.name}
                  >
                    {item.name}
                  </Link>
                </div>

                {/* Barre */}
                <motion.div
                  className={`absolute flex items-center rounded-sm shadow-sm px-1.5 ${itemTextColor} text-[10px] overflow-hidden ${item.hasConflict && item.type === 'task' ? 'ring-2 ring-offset-1 ring-red-500' : 'hover:ring-1 hover:ring-offset-1 hover:ring-indigo-300'}`}
                  style={{
                    left: item.displayProps.left + 250,
                    width: item.displayProps.width,
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
                  {item.type !== 'chantier' && (
                  <span className="relative z-10 truncate">{item.name}</span>
                  )}
                  {item.hasConflict && item.type === 'task' && <AlertTriangle className="h-3 w-3 ml-auto text-yellow-300 flex-shrink-0" />}
                </motion.div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
