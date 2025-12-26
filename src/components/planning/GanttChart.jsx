import React, { useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { parseISO, differenceInDays, format, addDays, startOfDay, endOfDay, isPast, isFuture, isWeekend, getDay, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { useChantier } from '@/context/ChantierContext';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const MIN_DAY_WIDTH = 20;
const MAX_DAY_WIDTH = 120;
const DEFAULT_DAY_WIDTH = 40;

const JOURS_FERIES = [
  '2025-01-01', '2025-04-21', '2025-05-01', '2025-05-08', '2025-05-29', '2025-06-09',
  '2025-07-14', '2025-08-15', '2025-11-01', '2025-11-11', '2025-12-25',
  '2026-01-01', '2026-04-06', '2026-05-01', '2026-05-08', '2026-05-14', '2026-05-25',
  '2026-07-14', '2026-08-15', '2026-11-01', '2026-11-11', '2026-12-25',
];

const isJourFerie = (date) => {
  const dateStr = format(date, 'yyyy-MM-dd');
  return JOURS_FERIES.includes(dateStr);
};

const isJourOuvre = (date) => {
  return !isWeekend(date) && !isJourFerie(date);
};

const countJoursOuvres = (startDate, endDate) => {
  let count = 0;
  let current = startOfDay(startDate);
  const end = startOfDay(endDate);
  
  while (current <= end) {
    if (isJourOuvre(current)) {
      count++;
    }
    current = addDays(current, 1);
  }
  
  return count;
};

const isToday = (date) => {
  return isSameDay(date, new Date());
};

export function GanttChart({ taches, chantierId }) {
  const [dayWidth, setDayWidth] = useState(DEFAULT_DAY_WIDTH);
  const { updateTache, chantiers, conflictsByChantier } = useChantier();

  const tachesDuChantier = useMemo(
    () => taches.filter(t => t.chantierid === chantierId && t.datedebut && t.datefin),
    [taches, chantierId]
  );

  const ganttItems = useMemo(() => {
    if (!tachesDuChantier.length) return [];
    const today = startOfDay(new Date());

    return tachesDuChantier.map(tache => {
      const tacheDateDebut = parseISO(tache.datedebut);
      const tacheDateFin = parseISO(tache.datefin);
      let color = 'bg-gray-400';

      let hasConflict = false;
      if (tache.assignetype === 'soustraitant' && tache.assigneid) {
        const key = `${tache.assigneid}-${format(tacheDateDebut, 'yyyy-MM-dd')}`;
        const conflict = conflictsByChantier[key];
        if (conflict && conflict.count > 1 && conflict.chantierids.includes(tache.chantierid)) {
          hasConflict = true;
        }
      }

      if (hasConflict) color = 'bg-red-600';
      else if (tache.terminee) color = 'bg-green-500';
      else if (isPast(tacheDateFin)) color = 'bg-red-400';
      else if (isFuture(tacheDateFin)) {
        color = tache.assignetype === 'fournisseur' ? 'bg-blue-500' : 'bg-orange-400';
      }

      return {
        id: tache.id,
        name: tache.nom,
        start: tacheDateDebut,
        end: tacheDateFin,
        color,
        rawTache: tache
      };
    }).sort((a, b) => a.start - b.start);
  }, [tachesDuChantier, conflictsByChantier, chantierId]);

  const overallStartDate = useMemo(
    () => (ganttItems.length ? startOfDay(ganttItems[0].start) : startOfDay(new Date())),
    [ganttItems]
  );

  const overallEndDate = useMemo(
    () =>
      ganttItems.length
        ? endOfDay(ganttItems.reduce((max, item) => (item.end > max ? item.end : max), ganttItems[0].end))
        : endOfDay(addDays(new Date(), 30)),
    [ganttItems]
  );

  const totalDays = useMemo(
    () => differenceInDays(overallEndDate, overallStartDate) + 1,
    [overallEndDate, overallStartDate]
  );

  const handleDragEnd = useCallback(
    (event, info, item) => {
      const daysDragged = Math.round(info.offset.x / dayWidth);
      const newStartDate = addDays(item.start, daysDragged);
      
      const joursOuvres = countJoursOuvres(item.start, item.end);
      
      let newEndDate = newStartDate;
      let joursOuvresComptes = 0;
      
      while (joursOuvresComptes < joursOuvres) {
        if (isJourOuvre(newEndDate)) {
          joursOuvresComptes++;
        }
        if (joursOuvresComptes < joursOuvres) {
          newEndDate = addDays(newEndDate, 1);
        }
      }

      updateTache(item.id, {
        ...item.rawTache,
        datedebut: format(newStartDate, 'yyyy-MM-dd'),
        datefin: format(newEndDate, 'yyyy-MM-dd'),
        duree: joursOuvres.toString()
      });
    },
    [dayWidth, updateTache]
  );

  const handleDownloadPDF = async () => {
    const ganttElement = document.getElementById('gantt-container');
    if (!ganttElement) return;

    const canvas = await html2canvas(ganttElement, { scale: 1.5, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width + 150, canvas.height + 150] });

    const chantier = chantiers.find(c => c.id === chantierId);
    if (chantier) {
      pdf.setFontSize(14);
      pdf.text(`Chantier : ${chantier.nomchantier || 'Sans nom'}`, 40, 40);
      pdf.setFontSize(10);
      if (chantier.adresse) pdf.text(`Adresse : ${chantier.adresse}`, 40, 60);
      if (chantier.date_debut) pdf.text(`Début : ${format(parseISO(chantier.date_debut), 'dd/MM/yyyy')}`, 40, 80);
      if (chantier.date_livraison_prevue) pdf.text(`Fin prévisionnelle : ${format(parseISO(chantier.date_livraison_prevue), 'dd/MM/yyyy')}`, 200, 80);
    }

    pdf.addImage(imgData, 'PNG', 40, 100, canvas.width, canvas.height);
    pdf.save(`gantt-${chantierId}.pdf`);
  };

  if (!ganttItems.length)
    return <p className="text-muted-foreground text-center py-8">Aucune tâche valide avec dates pour ce chantier.</p>;

  const chartHeight = ganttItems.length * 36 + 50 + 20;
  const handleZoomIn = () => setDayWidth(prev => Math.min(MAX_DAY_WIDTH, prev + 5));
  const handleZoomOut = () => setDayWidth(prev => Math.max(MIN_DAY_WIDTH, prev - 5));

  const monthHeaders = useMemo(() => {
    const headers = [];
    let current = overallStartDate;
    while (current <= overallEndDate) {
      const monthStart = startOfDay(new Date(current.getFullYear(), current.getMonth(), 1));
      const monthEnd = endOfDay(new Date(current.getFullYear(), current.getMonth() + 1, 0));
      const displayStart = current > monthStart ? current : monthStart;
      const displayEnd = monthEnd > overallEndDate ? overallEndDate : monthEnd;
      const daysVisible = differenceInDays(displayEnd, displayStart) + 1;
      if (daysVisible > 0) {
        headers.push({ name: format(displayStart, 'MMM yyyy', { locale: fr }), width: daysVisible * dayWidth, days: daysVisible, startDate: displayStart });
      }
      current = addDays(monthEnd, 1);
    }
    return headers;
  }, [overallStartDate, overallEndDate, dayWidth]);

  return (
    <div className="overflow-x-auto pb-4 bg-slate-50 p-1 rounded-lg shadow-inner relative">
      <div className="absolute top-1 right-1 z-30 flex space-x-1">
        <Button variant="outline" size="icon" onClick={handleZoomIn} disabled={dayWidth >= MAX_DAY_WIDTH} className="h-7 w-7">
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="icon" onClick={handleZoomOut} disabled={dayWidth <= MIN_DAY_WIDTH} className="h-7 w-7">
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="icon" onClick={handleDownloadPDF} className="h-7 w-7" title="Télécharger en PDF">
          🖨️
        </Button>
      </div>

      <div id="gantt-container" style={{ width: totalDays * dayWidth, minWidth: '100%' }}>
        {/* Header mois */}
        <div className="flex sticky top-0 bg-slate-100 z-20 border-b border-slate-300">
          {monthHeaders.map((m, i) => (
            <div key={i} className="h-7 flex items-center justify-center border-r border-slate-300" style={{ width: m.width }}>
              <span className="text-[10px] font-medium text-slate-600">{m.name}</span>
            </div>
          ))}
        </div>

        {/* Header jours */}
        <div className="flex sticky top-7 bg-slate-100 z-20 border-b border-slate-300">
          {monthHeaders.map((m, mi) =>
            Array.from({ length: m.days }).map((_, di) => {
              const date = addDays(m.startDate, di);
              const isNonOuvre = !isJourOuvre(date);
              const isTodayDate = isToday(date);
              
              return (
                <div 
                  key={`${mi}-${di}`} 
                  className={`h-5 flex flex-col items-center justify-center border-r border-slate-200/80 ${
                    isTodayDate 
                      ? 'bg-cyan-300'
                      : isNonOuvre 
                      ? 'bg-slate-200' 
                      : ''
                  }`}
                  style={{ width: dayWidth }}
                >
                  <span className={`text-[9px] capitalize ${
                    isTodayDate 
                      ? 'text-cyan-900 font-bold' 
                      : isNonOuvre 
                      ? 'text-slate-400' 
                      : 'text-slate-500'
                  }`}>
                    {format(date, 'EEE', { locale: fr }).charAt(0)}
                  </span>
                  <span className={`text-[10px] font-medium ${
                    isTodayDate 
                      ? 'text-cyan-900 font-bold' 
                      : isNonOuvre 
                      ? 'text-slate-400' 
                      : 'text-slate-700'
                  }`}>
                    {format(date, 'd', { locale: fr })}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* ✅ CORRIGÉ : Conteneur relatif pour les barres avec grille de fond intégrée */}
        <div className="relative" style={{ height: chartHeight - 70 }}>
          {/* Grille verticale de fond (cyan/gris) - MÊME NIVEAU que les barres */}
          {monthHeaders.map((m, mi) =>
            Array.from({ length: m.days }).map((_, di) => {
              const date = addDays(m.startDate, di);
              const isNonOuvre = !isJourOuvre(date);
              const isTodayDate = isToday(date);
              const dayIndex = differenceInDays(date, overallStartDate);
              
              return (
                <div
                  key={`bg-${mi}-${di}`}
                  className={`absolute pointer-events-none ${
                    isTodayDate 
                      ? 'bg-cyan-200' 
                      : isNonOuvre 
                      ? 'bg-slate-200/40' 
                      : ''
                  } border-r border-slate-200/60`}
                  style={{ 
                    left: dayIndex * dayWidth, 
                    top: 0, 
                    width: dayWidth, 
                    height: '100%',
                    zIndex: 0
                  }}
                />
              );
            })
          )}

          {/* Barres tâches - AU-DESSUS de la grille */}
          {ganttItems.map((item, index) => {
            const topPos = index * 36 + 4;
            
            const segments = [];
            let current = startOfDay(item.start);
            const end = startOfDay(item.end);
            
            while (current <= end) {
              if (isJourOuvre(current)) {
                const offset = differenceInDays(current, overallStartDate);
                segments.push({
                  date: current,
                  offset: offset * dayWidth,
                  width: dayWidth - 1
                });
              }
              current = addDays(current, 1);
            }

            return (
              <React.Fragment key={item.id}>
                {segments.map((segment, segIndex) => (
                  <motion.div
                    key={`${item.id}-${segIndex}`}
                    className="absolute h-[28px] flex items-center px-1 text-white text-[10px] overflow-hidden rounded-sm"
                    style={{ 
                      left: segment.offset, 
                      width: segment.width, 
                      top: topPos, 
                      height: 28,
                      zIndex: 10
                    }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.03 }}
                  >
                    <div className={`absolute inset-0 ${item.color} opacity-100`}></div>
                    {segIndex === 0 && (
                      <span className="relative z-10 truncate font-medium text-[9px]" title={item.name}>
                        {item.name}
                      </span>
                    )}
                  </motion.div>
                ))}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}