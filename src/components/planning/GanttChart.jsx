import React, { useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { parseISO, differenceInDays, format, addDays, startOfDay, endOfDay, isPast, isFuture } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { useChantier } from '@/context/ChantierContext';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const MIN_DAY_WIDTH = 20; 
const MAX_DAY_WIDTH = 120;
const DEFAULT_DAY_WIDTH = 40; 

export function GanttChart({ taches, chantierId, conflicts }) {
  const [dayWidth, setDayWidth] = useState(DEFAULT_DAY_WIDTH);
  const { updateTache, chantiers } = useChantier();

  const tachesDuChantier = useMemo(() => {
    return taches.filter(t => t.chantierId === chantierId && t.dateDebut && t.dateFin);
  }, [taches, chantierId]);

  const ganttItems = useMemo(() => {
    if (tachesDuChantier.length === 0) return [];
    const today = startOfDay(new Date());

    return tachesDuChantier.map(tache => {
      let color = 'bg-gray-400'; 
      const tacheDateDebut = parseISO(tache.dateDebut);
      const tacheDateFin = parseISO(tache.dateFin);
      let hasConflict = false;

      if (tache.assigneType === 'soustraitant' && tache.assigneId && conflicts) {
        const conflictKey = `${tache.assigneId}-${format(tacheDateDebut, 'yyyy-MM-dd')}`;
        const conflictDetails = conflicts[conflictKey];
        if (conflictDetails && conflictDetails.count > 1 && conflictDetails.chantierIds.includes(tache.chantierId)) {
          hasConflict = true;
        }
      }

      if (hasConflict) {
        color = 'bg-red-600';
      } else if (tache.terminee) {
        color = 'bg-green-500'; 
      } else if (isPast(tacheDateFin) && !tache.terminee) {
        color = 'bg-red-400'; 
      } else if (isFuture(tacheDateFin) || format(tacheDateFin, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
        if (tache.assigneType === 'fournisseur') {
          color = 'bg-blue-500'; 
        } else if (tache.assigneType === 'soustraitant') {
          color = 'bg-orange-400';
        }
      }

      return {
        id: tache.id, 
        name: tache.nom,
        start: tacheDateDebut,
        end: tacheDateFin,
        type: 'tache',
        color: color,
        duree: tache.duree, 
        rawTache: tache
      };
    }).sort((a, b) => a.start - b.start);
  }, [tachesDuChantier, conflicts, chantierId, chantiers]);

  const overallStartDate = useMemo(() => {
    if (ganttItems.length === 0) return startOfDay(new Date());
    return startOfDay(ganttItems[0].start);
  }, [ganttItems]);

  const overallEndDate = useMemo(() => {
    if (ganttItems.length === 0) return endOfDay(addDays(new Date(), 30));
    return endOfDay(ganttItems.reduce((max, item) => (item.end > max ? item.end : max), ganttItems[0].end));
  }, [ganttItems]);

  const totalDays = useMemo(() => differenceInDays(overallEndDate, overallStartDate) + 1, [overallEndDate, overallStartDate]);

  const handleDragEnd = useCallback((event, info, item) => {
    const dragX = info.offset.x;
    const daysDragged = Math.round(dragX / dayWidth);
    const newStartDate = addDays(item.start, daysDragged);

    if (item.duree) {
      const newEndDate = addDays(newStartDate, parseInt(item.duree, 10) - 1);
      updateTache(item.id, { 
        ...item.rawTache,
        dateDebut: format(newStartDate, 'yyyy-MM-dd'),
        dateFin: format(newEndDate, 'yyyy-MM-dd')
      });
    } else {
      const currentDuration = differenceInDays(item.end, item.start) + 1;
      const newEndDate = addDays(newStartDate, currentDuration - 1);
      updateTache(item.id, { 
        ...item.rawTache,
        dateDebut: format(newStartDate, 'yyyy-MM-dd'),
        dateFin: format(newEndDate, 'yyyy-MM-dd'),
        duree: currentDuration.toString() 
      });
    }
  }, [dayWidth, updateTache]);

  const handleDownloadPDF = async () => {
    const ganttElement = document.getElementById('gantt-container');
    if (!ganttElement) return;

    const canvas = await html2canvas(ganttElement, {
      scale: 1.5,
      useCORS: true
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [canvas.width+150, canvas.height+150],
    });

    const chantier = chantiers.find(c => c.id === chantierId);
    if (chantier) {
      pdf.setFontSize(14);
      pdf.text(`Chantier : ${chantier.nom || 'Sans nom'}`, 40, 40);
      pdf.setFontSize(10);
      if (chantier.adresse) pdf.text(`Adresse : ${chantier.adresse}`, 40, 60);
      if (chantier.dateDebut) pdf.text(`Début : ${format(parseISO(chantier.dateDebut), 'dd/MM/yyyy')}`, 40, 80);
      if (chantier.dateFin) pdf.text(`Fin prévisionnelle : ${format(parseISO(chantier.dateFin), 'dd/MM/yyyy')}`, 200, 80);
    }

    const topMargin = 100;
    pdf.addImage(imgData, 'PNG', 40, topMargin, canvas.width, canvas.height);
    pdf.save(`gantt-${chantierId}.pdf`);
  };

  if (ganttItems.length === 0) {
    return <p className="text-muted-foreground text-center py-8">Aucune tâche valide (avec dates) définie pour ce chantier pour afficher le diagramme de Gantt.</p>;
  }

  const chartHeight = ganttItems.length * 36 + 50 + 20;

  const handleZoomIn = () => setDayWidth(prev => Math.min(MAX_DAY_WIDTH, prev + 5));
  const handleZoomOut = () => setDayWidth(prev => Math.max(MIN_DAY_WIDTH, prev - 5));

  const getMonthHeaders = () => {
    const headers = [];
    let currentDate = overallStartDate;
    while (currentDate <= overallEndDate) {
      const monthStart = startOfDay(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
      const monthEnd = endOfDay(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0));
      const displayMonthStart = currentDate > monthStart ? currentDate : monthStart;
      const displayMonthEnd = monthEnd > overallEndDate ? overallEndDate : monthEnd;
      const daysInMonthVisible = differenceInDays(displayMonthEnd, displayMonthStart) + 1;
      if (daysInMonthVisible > 0) {
        headers.push({
          name: format(displayMonthStart, 'MMM yyyy', { locale: fr }),
          width: daysInMonthVisible * dayWidth,
          days: daysInMonthVisible,
          startDate: displayMonthStart
        });
      }
      currentDate = addDays(monthEnd, 1);
    }
    return headers;
  };

  const monthHeaders = getMonthHeaders();

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
        <div className="flex sticky top-0 bg-slate-100 z-20 border-b border-slate-300">
          {monthHeaders.map((month, index) => (
            <div 
              key={`month-${index}`} 
              className="h-7 flex items-center justify-center border-r border-slate-300"
              style={{ width: month.width }}
            >
              <span className="text-[10px] font-medium text-slate-600 leading-none pt-[1px]">{month.name}</span>
            </div>
          ))}
        </div>

        <div className="flex sticky top-7 bg-slate-100 z-20 border-b border-slate-300">
          {monthHeaders.map((month, monthIndex) => (
            Array.from({ length: month.days }).map((_, dayIndex) => {
              const currentDateForDay = addDays(month.startDate, dayIndex);
              const dayLabel = format(currentDateForDay, 'd', { locale: fr }); 
              const dayName = format(currentDateForDay, 'EEE', { locale: fr }).charAt(0);
              return (
                <div 
                  key={`day-${monthIndex}-${dayIndex}`} 
                  className="h-5 flex flex-col items-center justify-center border-r border-slate-200/80"
                  style={{ width: dayWidth }}
                >
                  <span className="text-[9px] text-slate-500 capitalize">{dayName}</span>
                  <span className="text-[10px] text-slate-700 font-medium">{dayLabel}</span>
                </div>
              );
            })
          ))}
        </div>

        <div className="absolute top-0 left-0 h-full pointer-events-none z-0">
          {Array.from({ length: totalDays + 1 }).map((_, i) => (
            <div key={`gridline-${i}`} className="absolute h-full border-l border-slate-200/60" style={{ left: i * dayWidth, top: 70 }} />
          ))}
        </div>

        <div className="relative" style={{ height: chartHeight - 70 }}>
          {ganttItems.map((item, index) => {
            const itemStartOffset = differenceInDays(item.start, overallStartDate);
            const itemDuration = differenceInDays(item.end, item.start) + 1;
            const topPosition = index * 36 + 4; 

            return (
              <motion.div
                key={item.id}
                drag="x"
                dragConstraints={{ left: -(itemStartOffset * dayWidth), right: (totalDays - itemStartOffset - itemDuration) * dayWidth }}
                dragElastic={0.1}
                onDragEnd={(event, info) => handleDragEnd(event, info, item)}
                className="absolute h-[28px] flex items-center px-2 text-white text-[10px] overflow-hidden cursor-grab active:cursor-grabbing"
                style={{
                 left: itemStartOffset * dayWidth,
                 width: Math.max(itemDuration * dayWidth - 1, 0),
                 top: topPosition,
                  height: 28, 
                }}
                
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
              >
                <div className={`absolute inset-0 ${item.color} opacity-100`}></div>
                <span className="relative z-10 truncate font-medium" title={item.name}>{item.name}</span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}