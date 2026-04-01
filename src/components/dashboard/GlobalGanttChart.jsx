import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  parseISO,
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  isPast,
  eachDayOfInterval,
  eachWeekOfInterval,
  isSameDay,
  isSameWeek,
  isWeekend,
  nextMonday,
  getMonth,
  getDate
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ZoomIn, ZoomOut, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useChantier } from '@/context/ChantierContext';
import { useSousTraitant } from '@/context/SousTraitantContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { calculateDateFinLogic, calculateDureeOuvree } from '@/context/chantierContextLogics/tacheLogics';

const MIN_DAY_WIDTH = 16;
const MAX_DAY_WIDTH = 48;
const DEFAULT_DAY_WIDTH = 24;
const ROW_HEIGHT = 40;
const DAY_GAP = 2;

const CHANTIER_COL_WIDTH_DESKTOP = 200;
const CHANTIER_COL_WIDTH_TABLET = 150;
const CHANTIER_COL_WIDTH_MOBILE = 100;

// ✅ NOUVEAU : Liste des jours fériés français (fixes + Pâques approximatif)
const JOURS_FERIES = [
  { month: 1, day: 1 },   // Jour de l'an
  { month: 5, day: 1 },   // Fête du travail
  { month: 5, day: 8 },   // Victoire 1945
  { month: 7, day: 14 },  // Fête nationale
  { month: 8, day: 15 },  // Assomption
  { month: 11, day: 1 },  // Toussaint
  { month: 11, day: 11 }, // Armistice 1918
  { month: 12, day: 25 }, // Noël
  // Note: Pâques, Ascension, Pentecôte sont variables (pas inclus ici pour simplifier)
];

const isJourFerie = (date) => {
  const month = getMonth(date) + 1; // getMonth retourne 0-11
  const day = getDate(date);
  return JOURS_FERIES.some(jf => jf.month === month && jf.day === day);
};

const isValidDate = (date) => date instanceof Date && !isNaN(date.getTime());

const safeParseDate = (value) => {
  if (!value || typeof value !== 'string') return null;
  const parsed = parseISO(value);
  return isValidDate(parsed) ? parsed : null;
};

const isCurrentWeek = (weekStart) => {
  const today = new Date();
  return isSameWeek(weekStart, today, { weekStartsOn: 1 });
};

const isToday = (date) => {
  return isSameDay(date, new Date());
};

const getClosestWorkday = (date) => {
  if (isWeekend(date)) {
    return nextMonday(date);
  }
  return date;
};

export function GlobalGanttChart({ chantiers, taches, initialStartDate, sousTraitants }) {
  const { updateTache, chantiers: allChantiers } = useChantier();
  const { sousTraitants: allSousTraitants } = useSousTraitant();
  
  const [dayWidth, setDayWidth] = useState(DEFAULT_DAY_WIDTH);
  const [chantierColWidth, setChantierColWidth] = useState(CHANTIER_COL_WIDTH_DESKTOP);
  const [selectedTask, setSelectedTask] = useState(null);
  const [formData, setFormData] = useState({
    datedebut: '',
    duree: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  
  const scrollContainerRef = useRef(null);
  const hasScrolledToToday = useRef(false);

  const cleanTaches = useMemo(() => taches || [], [taches]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setChantierColWidth(CHANTIER_COL_WIDTH_MOBILE);
      } else if (window.innerWidth < 1024) {
        setChantierColWidth(CHANTIER_COL_WIDTH_TABLET);
      } else {
        setChantierColWidth(CHANTIER_COL_WIDTH_DESKTOP);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const conflictsByDay = useMemo(() => {
    const conflicts = {};
    const stAssignments = {};

    const tachesNonValidees = cleanTaches.filter(t => !t.constructeur_valide && !t.terminee);

    tachesNonValidees.forEach(tache => {
      if (tache.assignetype === 'soustraitant' && tache.assigneid && tache.datedebut && tache.datefin) {
        const startDate = safeParseDate(tache.datedebut);
        const endDate = safeParseDate(tache.datefin);
        
        if (!startDate || !endDate) return;

        const days = eachDayOfInterval({ start: startOfDay(startDate), end: endOfDay(endDate) });
        
        days.forEach(day => {
          // ✅ Ne pas compter les weekends dans les conflits
          if (isWeekend(day)) return;
          
          const dayKey = format(day, 'yyyy-MM-dd');
          const stId = tache.assigneid;

          if (!stAssignments[dayKey]) stAssignments[dayKey] = {};
          if (!stAssignments[dayKey][stId]) stAssignments[dayKey][stId] = [];
          
          stAssignments[dayKey][stId].push({
            tacheId: tache.id,
            chantierid: tache.chantierid,
          });
        });
      }
    });

    Object.keys(stAssignments).forEach(dayKey => {
      Object.keys(stAssignments[dayKey]).forEach(stId => {
        const assignments = stAssignments[dayKey][stId];
        const chantierIds = [...new Set(assignments.map(a => a.chantierid))];
        
        if (chantierIds.length > 1) {
          if (!conflicts[dayKey]) conflicts[dayKey] = new Set();
          chantierIds.forEach(cid => conflicts[dayKey].add(cid));
        }
      });
    });

    return conflicts;
  }, [cleanTaches]);

  const getTaskColor = (tache, hasConflict) => {
    if (hasConflict) {
      return 'bg-red-600';
    }
    
    if (tache.artisan_termine && !tache.constructeur_valide) {
      return 'bg-yellow-500';
    }
    
    if (tache.constructeur_valide || tache.terminee) {
      return 'bg-blue-500';
    }
    
    const dateFinTache = safeParseDate(tache.datefin);
    if (dateFinTache && isPast(endOfDay(dateFinTache))) {
      return 'bg-orange-500';
    }
    
    return 'bg-green-500';
  };

  const ganttData = useMemo(() => {
    const today = startOfDay(new Date());
    const todayWorkday = getClosestWorkday(today);
    
    if (chantiers.length === 0) {
      const defaultStartWeek = startOfWeek(todayWorkday, { weekStartsOn: 1 });
      const defaultEndWeek = endOfWeek(addWeeks(defaultStartWeek, 4), { weekStartsOn: 1 });
      return { items: [], overallStartDate: defaultStartWeek, overallEndDate: defaultEndWeek };
    }

    const items = chantiers.map((chantier) => {
      const chantierTaches = cleanTaches.filter(t => t.chantierid === chantier.id);

      let earliestTaskDate = null;
      
      chantierTaches.forEach(tache => {
        const startDate = safeParseDate(tache.datedebut);
        if (startDate) {
          if (!earliestTaskDate || startDate < earliestTaskDate) {
            earliestTaskDate = startDate;
          }
        }
      });

      const daysTasks = new Map();
      
      chantierTaches.forEach(tache => {
        const startDate = safeParseDate(tache.datedebut);
        const endDate = safeParseDate(tache.datefin);
        
        if (startDate && endDate) {
          const days = eachDayOfInterval({ start: startOfDay(startDate), end: endOfDay(endDate) });
          days.forEach(day => {
            // ✅ Ne pas afficher les tâches sur les weekends
            if (!isWeekend(day)) {
              const dayKey = format(day, 'yyyy-MM-dd');
              if (!daysTasks.has(dayKey)) {
                daysTasks.set(dayKey, []);
              }
              daysTasks.get(dayKey).push(tache);
            }
          });
        }
      });

      return {
        id: chantier.id,
        name: chantier.nomchantier,
        daysTasks,
        tasks: chantierTaches,
        earliestTaskDate: earliestTaskDate || new Date(8640000000000000),
      };
    });

    items.sort((a, b) => {
      return a.earliestTaskDate - b.earliestTaskDate;
    });

    let overallStartDate = null;
    let overallEndDate = null;

    items.forEach(item => {
      item.tasks.forEach(tache => {
        const startDate = safeParseDate(tache.datedebut);
        const endDate = safeParseDate(tache.datefin);
        
        if (startDate) {
          if (!overallStartDate || startDate < overallStartDate) {
            overallStartDate = startDate;
          }
        }
        if (endDate) {
          if (!overallEndDate || endDate > overallEndDate) {
            overallEndDate = endDate;
          }
        }
      });
    });

    const oneWeekBeforeToday = startOfWeek(subWeeks(todayWorkday, 1), { weekStartsOn: 1 });

    if (!overallStartDate) {
      overallStartDate = oneWeekBeforeToday;
    } else if (overallStartDate > oneWeekBeforeToday) {
      overallStartDate = oneWeekBeforeToday;
    }

    if (!overallEndDate || todayWorkday > overallEndDate) {
      overallEndDate = addWeeks(todayWorkday, 8);
    }

    overallStartDate = startOfWeek(overallStartDate, { weekStartsOn: 1 });
    overallEndDate = endOfWeek(overallEndDate, { weekStartsOn: 1 });

    return { items, overallStartDate, overallEndDate };
  }, [chantiers, cleanTaches]);

  const { items, overallStartDate, overallEndDate } = ganttData;

  if (items.length === 0 && chantiers.length > 0) {
    return <p className="text-muted-foreground text-center py-8">Aucune tâche planifiée pour les chantiers en cours.</p>;
  }
  if (chantiers.length === 0) {
    return <p className="text-muted-foreground text-center py-8">Aucun chantier en cours à afficher.</p>;
  }

  const handleZoomIn = () => setDayWidth(prev => Math.min(MAX_DAY_WIDTH, prev + 4));
  const handleZoomOut = () => setDayWidth(prev => Math.max(MIN_DAY_WIDTH, prev - 4));

  // ✅ MODIFIÉ : Afficher TOUS les jours (y compris weekends)
  const allDays = eachDayOfInterval({ start: overallStartDate, end: overallEndDate });

  const targetScrollDay = getClosestWorkday(startOfDay(new Date()));

  const weekHeaders = useMemo(() => {
    const weeks = eachWeekOfInterval(
      { start: overallStartDate, end: overallEndDate },
      { weekStartsOn: 1 }
    );

    return weeks.map(weekStart => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const daysInWeek = eachDayOfInterval({ 
        start: weekStart > overallStartDate ? weekStart : overallStartDate, 
        end: weekEnd < overallEndDate ? weekEnd : overallEndDate 
      });

      return {
        startDate: weekStart,
        label: format(weekStart, "'S'ww", { locale: fr }),
        isCurrentWeek: isCurrentWeek(weekStart),
        daysCount: daysInWeek.length,
      };
    });
  }, [overallStartDate, overallEndDate]);

  const monthHeaders = useMemo(() => {
    const months = [];
    let currentMonth = null;
    let dayCount = 0;

    allDays.forEach((day, index) => {
      const monthKey = format(day, 'yyyy-MM');

      if (monthKey !== currentMonth) {
        if (currentMonth !== null) {
          months.push({
            monthKey: currentMonth,
            name: format(allDays[index - 1], 'MMM yyyy', { locale: fr }),
            daysCount: dayCount,
          });
        }
        currentMonth = monthKey;
        dayCount = 1;
      } else {
        dayCount++;
      }

      if (index === allDays.length - 1) {
        months.push({
          monthKey: currentMonth,
          name: format(day, 'MMM yyyy', { locale: fr }),
          daysCount: dayCount,
        });
      }
    });

    return months.map(m => ({ 
      ...m, 
      width: m.daysCount * (dayWidth + DAY_GAP) 
    }));
  }, [allDays, dayWidth]);

  const getDayPosition = (dayIndex) => {
    return dayIndex * (dayWidth + DAY_GAP);
  };

  const totalWidth = getDayPosition(allDays.length);
  const chartHeight = items.length * ROW_HEIGHT + 100;

  useEffect(() => {
    if (scrollContainerRef.current && allDays.length > 0 && !hasScrolledToToday.current) {
      const scrollToToday = () => {
        const currentWeekMonday = startOfWeek(new Date(), { weekStartsOn: 1 });
        const mondayIndex = allDays.findIndex(day => isSameDay(day, currentWeekMonday));
        
        if (mondayIndex !== -1) {
          const mondayPosition = getDayPosition(mondayIndex);
          scrollContainerRef.current.scrollLeft = Math.max(0, mondayPosition);
          hasScrolledToToday.current = true;
        } else {
          const todayIndex = allDays.findIndex(day => isSameDay(day, targetScrollDay));
          if (todayIndex !== -1) {
            const todayPosition = getDayPosition(todayIndex);
            scrollContainerRef.current.scrollLeft = Math.max(0, todayPosition - 100);
            hasScrolledToToday.current = true;
          }
        }
      };

      setTimeout(scrollToToday, 100);
      setTimeout(scrollToToday, 300);
      setTimeout(scrollToToday, 500);
    }
  }, [allDays, dayWidth, targetScrollDay]);

  const handleTaskClick = (tache, chantierName) => {
    const duree = tache.datedebut && tache.datefin
      ? calculateDureeOuvree(tache.datedebut, tache.datefin)
      : '';

    setSelectedTask({ ...tache, chantierName });
    setFormData({
      datedebut: tache.datedebut || '',
      duree: duree || '',
    });
  };

  const handleSave = async () => {
    if (!selectedTask) return;

    if (!formData.datedebut || !formData.duree) {
      alert('La date de début et la durée sont obligatoires');
      return;
    }

    const dureeNum = parseInt(formData.duree, 10);
    if (isNaN(dureeNum) || dureeNum < 1) {
      alert('La durée doit être un nombre positif');
      return;
    }

    const datefin = calculateDateFinLogic(formData.datedebut, dureeNum);

    setIsSaving(true);

    try {
      await updateTache(selectedTask.id, {
        nom: selectedTask.nom,
        description: selectedTask.description,
        chantierid: selectedTask.chantierid,
        lotid: selectedTask.lotid,
        assigneid: selectedTask.assigneid,
        assignetype: selectedTask.assignetype,
        datedebut: formData.datedebut,
        datefin: datefin,
        terminee: selectedTask.terminee || false,
      });

      setSelectedTask(null);
    } catch (error) {
      console.error('❌ Erreur mise à jour tâche:', error);
      alert('Erreur lors de la mise à jour de la tâche');
    } finally {
      setIsSaving(false);
    }
  };

  const getChantierNom = (chantierId) => {
    const chantier = allChantiers?.find(c => c.id === chantierId);
    return chantier?.nomchantier || 'Chantier inconnu';
  };

  const getArtisanNom = (soustraitantId) => {
    if (!soustraitantId) return 'Non assigné';
    const st = allSousTraitants?.find(s => s.id === soustraitantId);
    return st ? (st.nomsocieteST || `${st.PrenomST} ${st.nomST}`) : 'Inconnu';
  };

  return (
    <>
      <div className="overflow-x-auto pb-4 bg-slate-50 p-1 rounded-lg shadow-inner relative">
        <div className="absolute top-1 right-1 z-30 flex space-x-1">
          <Button variant="outline" size="icon" onClick={handleZoomIn} disabled={dayWidth >= MAX_DAY_WIDTH} className="h-7 w-7">
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleZoomOut} disabled={dayWidth <= MIN_DAY_WIDTH} className="h-7 w-7">
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="absolute top-1 left-1 z-30 flex items-center gap-3 text-xs bg-white/90 px-2 py-1 rounded-md shadow-sm">
          <span className="font-semibold text-slate-700">Légende :</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>À faire</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
            <span>Terminée par artisan</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>Validée</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-orange-500 rounded"></div>
            <span>En retard</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-600 rounded"></div>
            <span>Conflit artisan</span>
          </div>
        </div>

        <div className="flex mt-10">
          <div className="flex-shrink-0 bg-slate-200" style={{ width: chantierColWidth }}>
            <div className="h-7 border-r border-slate-300 border-b border-slate-300 flex items-center justify-center bg-slate-200 sticky top-0 z-20">
              <span className="text-[10px] font-semibold text-slate-700">CHANTIER</span>
            </div>

            <div className="h-6 border-r border-slate-300 border-b border-slate-300 bg-slate-200 sticky top-7 z-20"></div>
            <div className="h-5 border-r border-slate-300 border-b border-slate-300 bg-slate-200 sticky top-13 z-20"></div>

            <div className="border-r border-slate-300">
              {items.map((chantier) => (
                <div
                  key={`label-${chantier.id}`}
                  className="flex items-center px-2 font-semibold text-slate-800 bg-slate-100 border-b border-slate-200/60"
                  style={{ height: ROW_HEIGHT }}
                >
                  <Link
                    to={`/chantiers/${chantier.id}`}
                    className="truncate hover:underline text-xs w-full"
                    title={chantier.name}
                  >
                    {chantier.name}
                  </Link>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-x-auto" ref={scrollContainerRef}>
            <div style={{ minWidth: totalWidth }}>
              <div className="flex sticky top-0 bg-slate-100 z-20 border-b border-slate-300">
                {monthHeaders.map((month, index) => (
                  <div 
                    key={`month-${index}`} 
                    className="h-7 flex items-center justify-center border-r border-slate-300" 
                    style={{ width: month.width }}
                  >
                    <span className="text-[10px] font-medium text-slate-600">{month.name}</span>
                  </div>
                ))}
              </div>

              <div className="flex sticky top-7 bg-slate-100 z-20 border-b border-slate-300" style={{ gap: `${DAY_GAP}px` }}>
                {weekHeaders.map((week, idx) => (
                  <div 
                    key={`week-${idx}`} 
                    className="h-6 flex items-center justify-center border-r border-slate-200/80 bg-white"
                    style={{ width: week.daysCount * (dayWidth + DAY_GAP) - DAY_GAP }}
                  >
                    <span className="text-[10px] font-medium text-slate-700">
                      {week.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex sticky top-13 bg-slate-50 z-20 border-b border-slate-300" style={{ gap: `${DAY_GAP}px` }}>
                {allDays.map((day, idx) => {
                  const dayLetter = format(day, 'EEEEE', { locale: fr });
                  const dayNumber = format(day, 'd');
                  const isTargetDay = isSameDay(day, targetScrollDay);
                  const isWE = isWeekend(day);
                  const isFerie = isJourFerie(day);
                  
                  return (
                    <div 
                      key={`day-header-${idx}`} 
                      className={`h-5 flex flex-col items-center justify-center text-[9px] font-medium ${
                        isTargetDay 
                          ? 'bg-blue-500 text-white font-bold' 
                          : (isWE || isFerie)
                            ? 'bg-gray-300 text-slate-600'
                            : 'bg-white text-slate-600'
                      }`}
                      style={{ width: dayWidth }}
                      title={format(day, 'dd MMM yyyy', { locale: fr })}
                    >
                      <span className="leading-none">{dayLetter}</span>
                      <span className="leading-none text-[8px] opacity-70">{dayNumber}</span>
                    </div>
                  );
                })}
              </div>

              {/* ✅ Colonnes de fond grisées pour weekends et jours fériés */}
              <div className="relative pointer-events-none">
                {allDays.map((day, i) => {
                  const isTargetDay = isSameDay(day, targetScrollDay);
                  const isWE = isWeekend(day);
                  const isFerie = isJourFerie(day);
                  
                  return (
                    <React.Fragment key={`gridline-v-${i}`}>
                      {/* Fond gris pour weekends et jours fériés */}
                      {(isWE || isFerie) && (
                        <div 
                          className="absolute bg-gray-200" 
                          style={{ 
                            left: getDayPosition(i),
                            top: 0,
                            width: dayWidth,
                            height: chartHeight - 100,
                            zIndex: 1
                          }} 
                        />
                      )}
                      
                      {/* Fond bleu pour aujourd'hui */}
                      {isTargetDay && !isWE && (
                        <div 
                          className="absolute bg-blue-200 opacity-30" 
                          style={{ 
                            left: getDayPosition(i),
                            top: 0,
                            width: dayWidth,
                            height: chartHeight - 100,
                            zIndex: 2
                          }} 
                        />
                      )}
                      
                      {/* Lignes de grille */}
                      <div 
                        className="absolute border-l border-slate-200/40" 
                        style={{ 
                          left: getDayPosition(i),
                          top: 0,
                          bottom: 0,
                          height: chartHeight - 100,
                          zIndex: 3
                        }} 
                      />
                    </React.Fragment>
                  );
                })}
              </div>

              <div className="relative" style={{ height: chartHeight - 100 }}>
                {items.map((chantier, chantierIndex) => {
                  const rowTop = chantierIndex * ROW_HEIGHT;

                  return (
                    <React.Fragment key={`chantier-row-${chantier.id}`}>
                      <div
                        className="absolute left-0 right-0 border-b border-slate-200/60"
                        style={{ top: rowTop + ROW_HEIGHT - 1, height: 1, zIndex: 0 }}
                      />

                      {allDays.map((day, dayIndex) => {
                        // ✅ Ne pas afficher de tâches sur les weekends
                        if (isWeekend(day)) return null;
                        
                        const dayKey = format(day, 'yyyy-MM-dd');
                        const tasksForDay = chantier.daysTasks.get(dayKey);
                        
                        if (!tasksForDay || tasksForDay.length === 0) return null;

                        const hasConflict = conflictsByDay[dayKey]?.has(chantier.id);
                        
                        const firstTask = tasksForDay[0];
                        const boxColor = getTaskColor(firstTask, hasConflict);

                        return (
                          <motion.div
                            key={`${chantier.id}-day-${dayIndex}`}
                            className={`absolute ${boxColor} rounded-sm cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-slate-400 pointer-events-auto`}
                            style={{
                              left: getDayPosition(dayIndex),
                              width: dayWidth,
                              top: rowTop + 6,
                              height: ROW_HEIGHT - 12,
                              zIndex: 5
                            }}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.2, delay: chantierIndex * 0.02 + dayIndex * 0.001 }}
                            onClick={() => handleTaskClick(firstTask, chantier.name)}
                            title={`${firstTask.nom}\nClic pour modifier`}
                          />
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedTask && (
          <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
            <DialogContent className="sm:max-w-[520px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Modifier la tâche
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2 p-3 bg-slate-50 rounded-md border">
                  <div>
                    <Label className="text-xs text-slate-500">Nom de la tâche</Label>
                    <p className="font-semibold text-slate-900">{selectedTask.nom}</p>
                  </div>

                  <div>
                    <Label className="text-xs text-slate-500">Chantier (client)</Label>
                    <p className="font-medium text-slate-800">{getChantierNom(selectedTask.chantierid)}</p>
                  </div>

                  {selectedTask.assignetype === 'soustraitant' && selectedTask.assigneid && (
                    <div>
                      <Label className="text-xs text-slate-500">Sous-traitant</Label>
                      <p className="font-medium text-orange-700">
                        👷 {getArtisanNom(selectedTask.assigneid)}
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="datedebut">
                      Date de début <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="datedebut"
                      type="date"
                      value={formData.datedebut}
                      onChange={(e) => setFormData(prev => ({ ...prev, datedebut: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duree">
                      Durée (jours) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="duree"
                      type="number"
                      min="1"
                      value={formData.duree}
                      onChange={(e) => setFormData(prev => ({ ...prev, duree: e.target.value }))}
                    />
                  </div>
                </div>

                {formData.datedebut && formData.duree && (
                  <div className="text-sm text-slate-600 bg-blue-50 p-2 rounded">
                    📅 Date de fin calculée : {' '}
                    <span className="font-semibold">
                      {format(parseISO(calculateDateFinLogic(formData.datedebut, parseInt(formData.duree, 10))), 'dd/MM/yyyy', { locale: fr })}
                    </span>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setSelectedTask(null)}
                  disabled={isSaving}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </>
  );
}