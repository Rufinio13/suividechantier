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
  nextMonday
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { Link } from 'react-router-dom';

const MIN_DAY_WIDTH = 16;
const MAX_DAY_WIDTH = 48;
const DEFAULT_DAY_WIDTH = 24;
const ROW_HEIGHT = 40;
const DAY_GAP = 2;

const CHANTIER_COL_WIDTH_DESKTOP = 200;
const CHANTIER_COL_WIDTH_TABLET = 150;
const CHANTIER_COL_WIDTH_MOBILE = 100;

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

// ✅ Trouver le jour ouvré le plus proche (aujourd'hui si ouvré, sinon lundi suivant)
const getClosestWorkday = (date) => {
  if (isWeekend(date)) {
    return nextMonday(date);
  }
  return date;
};

export function GlobalGanttChart({ chantiers, taches, initialStartDate, sousTraitants }) {
  const [dayWidth, setDayWidth] = useState(DEFAULT_DAY_WIDTH);
  const [chantierColWidth, setChantierColWidth] = useState(CHANTIER_COL_WIDTH_DESKTOP);
  const [selectedDayData, setSelectedDayData] = useState(null);
  
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

  // ✅ DÉTECTER LES CONFLITS PAR JOUR
  const conflictsByDay = useMemo(() => {
    const conflicts = {};
    const stAssignments = {};

    cleanTaches.forEach(tache => {
      if (tache.assignetype === 'soustraitant' && tache.assigneid && tache.datedebut && tache.datefin) {
        const startDate = safeParseDate(tache.datedebut);
        const endDate = safeParseDate(tache.datefin);
        
        if (!startDate || !endDate) return;

        const days = eachDayOfInterval({ start: startOfDay(startDate), end: endOfDay(endDate) });
        
        days.forEach(day => {
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

  // ✅ FONCTION POUR DÉTERMINER LA COULEUR D'UNE TÂCHE
  const getTaskColor = (tache, hasConflict) => {
    if (hasConflict) {
      return 'bg-red-600'; // 🔴 Conflit artisan
    }
    
    if (tache.artisan_termine && !tache.constructeur_valide) {
      return 'bg-yellow-500'; // 🟡 Terminée par artisan (en attente validation)
    }
    
    if (tache.constructeur_valide || tache.terminee) {
      return 'bg-blue-500'; // 🔵 Validée
    }
    
    const dateFinTache = safeParseDate(tache.datefin);
    if (dateFinTache && isPast(endOfDay(dateFinTache))) {
      return 'bg-orange-500'; // 🟠 En retard
    }
    
    return 'bg-green-500'; // 🟢 À faire
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

      // ✅ Stocker les jours avec leurs tâches (pour déterminer la couleur)
      const daysTasks = new Map(); // dayKey -> array of tasks
      
      chantierTaches.forEach(tache => {
        const startDate = safeParseDate(tache.datedebut);
        const endDate = safeParseDate(tache.datefin);
        
        if (startDate && endDate) {
          const days = eachDayOfInterval({ start: startOfDay(startDate), end: endOfDay(endDate) });
          days.forEach(day => {
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
        daysTasks, // Map de jour -> tâches
        tasks: chantierTaches,
        earliestTaskDate: earliestTaskDate || new Date(8640000000000000),
      };
    });

    items.sort((a, b) => {
      return a.earliestTaskDate - b.earliestTaskDate;
    });

    // ✅ FORCER L'INCLUSION DU JOUR OUVRÉ ACTUEL
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

    if (!overallStartDate || todayWorkday < overallStartDate) {
      overallStartDate = subWeeks(todayWorkday, 4);
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

  const allDays = eachDayOfInterval({ start: overallStartDate, end: overallEndDate }).filter(day => !isWeekend(day));

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
      }).filter(day => !isWeekend(day));

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
        const todayIndex = allDays.findIndex(day => isSameDay(day, targetScrollDay));
        
        if (todayIndex !== -1) {
          const todayPosition = getDayPosition(todayIndex);
          const containerWidth = scrollContainerRef.current.offsetWidth;
          const scrollPosition = todayPosition - (containerWidth / 2) + (dayWidth / 2);
          
          scrollContainerRef.current.scrollLeft = Math.max(0, scrollPosition);
          hasScrolledToToday.current = true;
        }
      };

      setTimeout(scrollToToday, 100);
      setTimeout(scrollToToday, 300);
      setTimeout(scrollToToday, 500);
    }
  }, [allDays, dayWidth, targetScrollDay]);

  const handleDayClick = (chantier, day) => {
    const dayKey = format(day, 'yyyy-MM-dd');
    
    const tasksOfDay = chantier.tasks.filter(tache => {
      const startDate = safeParseDate(tache.datedebut);
      const endDate = safeParseDate(tache.datefin);
      
      if (!startDate || !endDate) return false;
      
      return day >= startOfDay(startDate) && day <= endOfDay(endDate);
    });

    if (tasksOfDay.length === 0) return;

    setSelectedDayData({
      chantierName: chantier.name,
      day,
      dayKey,
      tasks: tasksOfDay,
    });
  };

  const getArtisanNom = (soustraitantId) => {
    if (!soustraitantId || !sousTraitants) return 'Non assigné';
    const st = sousTraitants.find(s => s.id === soustraitantId);
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

        {/* ✅ LÉGENDE */}
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
          {/* COLONNE CHANTIERS */}
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

          {/* ZONE DE PLANNING */}
          <div className="flex-1 overflow-x-auto" ref={scrollContainerRef}>
            <div style={{ minWidth: totalWidth }}>
              {/* EN-TÊTE MOIS */}
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

              {/* EN-TÊTE SEMAINES */}
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

              {/* EN-TÊTE JOURS (L M M J V uniquement) avec dates */}
              <div className="flex sticky top-13 bg-slate-50 z-20 border-b border-slate-300" style={{ gap: `${DAY_GAP}px` }}>
                {allDays.map((day, idx) => {
                  const dayLetter = format(day, 'EEEEE', { locale: fr });
                  const dayNumber = format(day, 'd');
                  const isTargetDay = isSameDay(day, targetScrollDay);
                  
                  return (
                    <div 
                      key={`day-header-${idx}`} 
                      className={`h-5 flex flex-col items-center justify-center text-[9px] font-medium ${
                        isTargetDay ? 'bg-blue-500 text-white font-bold' : 'bg-white text-slate-600'
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

              {/* GRILLE DE FOND */}
              <div className="relative pointer-events-none">
                {allDays.map((day, i) => {
                  const isTargetDay = isSameDay(day, targetScrollDay);
                  
                  return (
                    <React.Fragment key={`gridline-v-${i}`}>
                      {isTargetDay && (
                        <div 
                          className="absolute bg-blue-200 opacity-30" 
                          style={{ 
                            left: getDayPosition(i),
                            top: 0,
                            width: dayWidth,
                            height: chartHeight - 100
                          }} 
                        />
                      )}
                      <div 
                        className="absolute border-l border-slate-200/40" 
                        style={{ 
                          left: getDayPosition(i),
                          top: 0,
                          bottom: 0,
                          height: chartHeight - 100
                        }} 
                      />
                    </React.Fragment>
                  );
                })}
              </div>

              {/* LIGNES DES CHANTIERS */}
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
                        const dayKey = format(day, 'yyyy-MM-dd');
                        const tasksForDay = chantier.daysTasks.get(dayKey);
                        
                        if (!tasksForDay || tasksForDay.length === 0) return null;

                        // ✅ Déterminer si ce jour a un conflit
                        const hasConflict = conflictsByDay[dayKey]?.has(chantier.id);
                        
                        // ✅ Prendre la couleur de la première tâche (ou rouge si conflit)
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
                            onClick={() => handleDayClick(chantier, day)}
                            title={`${chantier.name} - ${format(day, 'dd MMM yyyy', { locale: fr })}${hasConflict ? ' - CONFLIT ARTISAN' : ''}\n${tasksForDay.length} tâche(s)`}
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

      {/* ✅ MODAL DÉTAILS DU JOUR */}
      <AnimatePresence>
        {selectedDayData && (
          <Dialog open={!!selectedDayData} onOpenChange={() => setSelectedDayData(null)}>
            <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  📅 {format(selectedDayData.day, 'EEEE dd MMMM yyyy', { locale: fr })} - {selectedDayData.chantierName}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-3 mt-4">
                <p className="font-semibold text-sm text-slate-700">
                  Tâches du jour ({selectedDayData.tasks.length}) :
                </p>

                {selectedDayData.tasks.map(tache => {
                  const hasConflict = conflictsByDay[selectedDayData.dayKey]?.has(tache.chantierid);
                  const taskColor = getTaskColor(tache, hasConflict);
                  
                  return (
                    <motion.div
                      key={tache.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 transition-colors"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded ${taskColor}`}></div>
                            <p className="font-medium text-sm text-slate-800">{tache.nom}</p>
                          </div>
                          
                          {tache.description && (
                            <p className="text-xs text-slate-600 mt-1">{tache.description}</p>
                          )}

                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
                            <span>
                              📅 Du {format(parseISO(tache.datedebut), 'dd/MM/yy', { locale: fr })} au {format(parseISO(tache.datefin), 'dd/MM/yy', { locale: fr })}
                            </span>
                            
                            {tache.assignetype === 'soustraitant' && tache.assigneid && (
                              <span className="text-orange-700 font-medium">
                                👷 {getArtisanNom(tache.assigneid)}
                              </span>
                            )}
                          </div>

                          <div className="mt-2">
                            {hasConflict && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 mr-2">
                                ⚠️ Conflit artisan
                              </span>
                            )}
                            {tache.constructeur_valide || tache.terminee ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                ✅ Validée
                              </span>
                            ) : tache.artisan_termine ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                ⏳ En attente validation
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                🚧 À faire
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </>
  );
}