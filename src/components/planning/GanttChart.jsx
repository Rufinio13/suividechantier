import React, { useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { parseISO, differenceInDays, format, addDays, startOfDay, endOfDay, isPast, isSameDay, eachDayOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { useChantier } from '@/context/ChantierContext';
import { useSousTraitant } from '@/context/SousTraitantContext';
import { useConfirm } from '@/hooks/useConfirm';
import { isJourOuvre, countJoursOuvres, diffJoursOuvres } from '@/lib/joursOuvres';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const MIN_DAY_WIDTH = 20;
const MAX_DAY_WIDTH = 120;
const DEFAULT_DAY_WIDTH = 40;

const isToday = (date) => isSameDay(date, new Date());

export function GanttChart({ taches, chantierId, onEditTache }) {
  const [dayWidth, setDayWidth] = useState(DEFAULT_DAY_WIDTH);
  const { updateTache, shiftTachesSuivantes, chantiers, conflictsByChantier } = useChantier();
  const { isArtisanIndisponible } = useSousTraitant();
  const { confirm, ConfirmDialog } = useConfirm();

  const tachesDuChantier = useMemo(
    () => taches.filter(t => t.chantierid === chantierId && t.datedebut && t.datefin),
    [taches, chantierId]
  );

  const ganttItems = useMemo(() => {
    if (!tachesDuChantier.length) return [];
    return tachesDuChantier.map(tache => {
      const tacheDateDebut = parseISO(tache.datedebut);
      const tacheDateFin = parseISO(tache.datefin);
      let joursEnConflit = new Set();
      let joursIndisponible = new Set();
      if (tache.assignetype === 'soustraitant' && tache.assigneid) {
        try {
          const days = eachDayOfInterval({ start: startOfDay(tacheDateDebut), end: startOfDay(tacheDateFin) });
          for (const day of days) {
            const dateStr = format(day, 'yyyy-MM-dd');
            const key = `${tache.assigneid}-${dateStr}`;
            const conflict = conflictsByChantier[key];
            if (conflict && conflict.chantierids && conflict.chantierids.length > 1) joursEnConflit.add(dateStr);
            if (isArtisanIndisponible(tache.assigneid, dateStr)) joursIndisponible.add(dateStr);
          }
        } catch (err) { console.error("Erreur check conflit:", err); }
      }
      return { id: tache.id, name: tache.nom, start: tacheDateDebut, end: tacheDateFin, rawTache: tache, joursEnConflit, joursIndisponible };
    }).sort((a, b) => a.start - b.start);
  }, [tachesDuChantier, conflictsByChantier, chantierId, isArtisanIndisponible]);

  const overallStartDate = useMemo(() => ganttItems.length ? startOfDay(ganttItems[0].start) : startOfDay(new Date()), [ganttItems]);
  const overallEndDate = useMemo(() => ganttItems.length ? endOfDay(ganttItems.reduce((max, item) => (item.end > max ? item.end : max), ganttItems[0].end)) : endOfDay(addDays(new Date(), 30)), [ganttItems]);
  const totalDays = useMemo(() => differenceInDays(overallEndDate, overallStartDate) + 1, [overallEndDate, overallStartDate]);

  // ✅ Drag sans email — juste updateTache
  const handleDragEnd = useCallback(async (event, info, item) => {
    const daysDragged = Math.round(info.offset.x / dayWidth);
    if (daysDragged === 0) return;

    const newStartDate = addDays(item.start, daysDragged);
    const joursOuvres = countJoursOuvres(item.start, item.end);
    let newEndDate = newStartDate;
    let joursOuvresComptes = 0;
    while (joursOuvresComptes < joursOuvres) {
      if (isJourOuvre(newEndDate)) joursOuvresComptes++;
      if (joursOuvresComptes < joursOuvres) newEndDate = addDays(newEndDate, 1);
    }

    const ancienneDateDebut = format(item.start, 'yyyy-MM-dd');
    await updateTache(item.id, {
      ...item.rawTache,
      datedebut: format(newStartDate, 'yyyy-MM-dd'),
      datefin: format(newEndDate, 'yyyy-MM-dd'),
      duree: joursOuvres.toString()
    });

    if (shiftTachesSuivantes) {
      const diffOuvres = diffJoursOuvres(item.start, newStartDate);
      if (diffOuvres !== 0) {
        const sens = diffOuvres > 0 ? "plus tard" : "plus tôt";
        const confirmShift = await confirm(
          `Cette tâche a été décalée de ${Math.abs(diffOuvres)} jour(s) ouvré(s) ${sens}.\n\nDécaler également toutes les interventions suivantes de ce chantier du même nombre de jours ouvrés ?`
        );
        if (confirmShift) await shiftTachesSuivantes(chantierId, ancienneDateDebut, item.id, diffOuvres);
      }
    }
  }, [dayWidth, updateTache, shiftTachesSuivantes, chantierId, confirm]);

  const handleDownloadPDF = async () => {
    const ganttElement = document.getElementById('gantt-container');
    if (!ganttElement) return;
    const canvas = await html2canvas(ganttElement, { scale: 1.5, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width + 150, canvas.height + 150] });
    const chantier = chantiers.find(c => c.id === chantierId);
    if (chantier) {
      pdf.setFontSize(14); pdf.text(`Chantier : ${chantier.nomchantier || 'Sans nom'}`, 40, 40);
      pdf.setFontSize(10);
      if (chantier.adresse) pdf.text(`Adresse : ${chantier.adresse}`, 40, 60);
      if (chantier.date_debut) pdf.text(`Début : ${format(parseISO(chantier.date_debut), 'dd/MM/yyyy')}`, 40, 80);
      if (chantier.date_livraison_prevue) pdf.text(`Fin prévisionnelle : ${format(parseISO(chantier.date_livraison_prevue), 'dd/MM/yyyy')}`, 200, 80);
    }
    pdf.addImage(imgData, 'PNG', 40, 100, canvas.width, canvas.height);
    pdf.save(`gantt-${chantierId}.pdf`);
  };

  if (!ganttItems.length) return <p className="text-muted-foreground text-center py-8">Aucune tâche valide avec dates pour ce chantier.</p>;

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
      if (daysVisible > 0) headers.push({ name: format(displayStart, 'MMM yyyy', { locale: fr }), width: daysVisible * dayWidth, days: daysVisible, startDate: displayStart });
      current = addDays(monthEnd, 1);
    }
    return headers;
  }, [overallStartDate, overallEndDate, dayWidth]);

  const getColorForSegment = (tache, segmentDate) => {
    const dateStr = format(segmentDate, 'yyyy-MM-dd');
    if (tache.joursEnConflit.has(dateStr) || tache.joursIndisponible.has(dateStr)) return 'bg-red-600';
    else if (tache.rawTache.artisan_termine && !tache.rawTache.constructeur_valide) return 'bg-yellow-500';
    else if (tache.rawTache.constructeur_valide || tache.rawTache.terminee) return 'bg-blue-500';
    else if (isPast(tache.end)) return 'bg-orange-500';
    else return 'bg-green-500';
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto pb-4 bg-slate-50 p-1 rounded-lg shadow-inner relative">
        <div className="absolute top-1 right-1 z-30 flex space-x-1">
          <Button variant="outline" size="icon" onClick={handleZoomIn} disabled={dayWidth >= MAX_DAY_WIDTH} className="h-7 w-7"><ZoomIn className="h-3.5 w-3.5" /></Button>
          <Button variant="outline" size="icon" onClick={handleZoomOut} disabled={dayWidth <= MIN_DAY_WIDTH} className="h-7 w-7"><ZoomOut className="h-3.5 w-3.5" /></Button>
          <Button variant="outline" size="icon" onClick={handleDownloadPDF} className="h-7 w-7" title="Télécharger en PDF">🖨️</Button>
        </div>

        <div id="gantt-container" style={{ width: totalDays * dayWidth, minWidth: '100%' }}>
          <div className="flex sticky top-0 bg-slate-100 z-20 border-b border-slate-300">
            {monthHeaders.map((m, i) => (
              <div key={i} className="h-7 flex items-center justify-center border-r border-slate-300" style={{ width: m.width }}>
                <span className="text-[10px] font-medium text-slate-600">{m.name}</span>
              </div>
            ))}
          </div>
          <div className="flex sticky top-7 bg-slate-100 z-20 border-b border-slate-300">
            {monthHeaders.map((m, mi) =>
              Array.from({ length: m.days }).map((_, di) => {
                const date = addDays(m.startDate, di);
                const isNonOuvre = !isJourOuvre(date);
                const isTodayDate = isToday(date);
                return (
                  <div key={`${mi}-${di}`} className={`h-5 flex flex-col items-center justify-center border-r border-slate-200/80 ${isTodayDate ? 'bg-cyan-300' : isNonOuvre ? 'bg-slate-200' : ''}`} style={{ width: dayWidth }}>
                    <span className={`text-[9px] capitalize ${isTodayDate ? 'text-cyan-900 font-bold' : isNonOuvre ? 'text-slate-400' : 'text-slate-500'}`}>{format(date, 'EEE', { locale: fr }).charAt(0)}</span>
                    <span className={`text-[10px] font-medium ${isTodayDate ? 'text-cyan-900 font-bold' : isNonOuvre ? 'text-slate-400' : 'text-slate-700'}`}>{format(date, 'd', { locale: fr })}</span>
                  </div>
                );
              })
            )}
          </div>
          <div className="relative" style={{ height: chartHeight - 70 }}>
            {monthHeaders.map((m, mi) =>
              Array.from({ length: m.days }).map((_, di) => {
                const date = addDays(m.startDate, di);
                const isNonOuvre = !isJourOuvre(date);
                const isTodayDate = isToday(date);
                const dayIndex = differenceInDays(date, overallStartDate);
                return (
                  <div key={`bg-${mi}-${di}`} className={`absolute pointer-events-none ${isTodayDate ? 'bg-cyan-200' : isNonOuvre ? 'bg-slate-200/40' : ''} border-r border-slate-200/60`}
                    style={{ left: dayIndex * dayWidth, top: 0, width: dayWidth, height: '100%', zIndex: 0 }} />
                );
              })
            )}
            {ganttItems.map((item, index) => {
              const topPos = index * 36 + 4;
              const segments = [];
              let current = startOfDay(item.start);
              const end = startOfDay(item.end);
              while (current <= end) {
                if (isJourOuvre(current)) {
                  const offset = differenceInDays(current, overallStartDate);
                  segments.push({ date: current, offset: offset * dayWidth, width: dayWidth - 1, color: getColorForSegment(item, current) });
                }
                current = addDays(current, 1);
              }
              return (
                <React.Fragment key={item.id}>
                  {segments.map((segment, segIndex) => (
                    <motion.div key={`${item.id}-${segIndex}`}
                      className="absolute h-[28px] flex items-center px-1 text-white text-[10px] overflow-hidden rounded-sm cursor-pointer hover:opacity-90 transition-opacity"
                      style={{ left: segment.offset, width: segment.width, top: topPos, height: 28, zIndex: 10 }}
                      drag="x" dragMomentum={false} dragConstraints={{ top: 0, bottom: 0 }}
                      onDragEnd={(event, info) => handleDragEnd(event, info, item)}
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.03 }}
                      onClick={() => onEditTache && onEditTache(item.rawTache)}
                      title={`${item.name} - Glisser pour déplacer, cliquer pour modifier`}>
                      <div className={`absolute inset-0 ${segment.color} opacity-100`}></div>
                      {segIndex === 0 && <span className="relative z-10 truncate font-medium text-[9px]">{item.name}</span>}
                    </motion.div>
                  ))}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs items-center p-3 bg-white rounded border">
        <span className="font-medium">Légende :</span>
        <span className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-green-500"></div>À faire</span>
        <span className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-yellow-500"></div>Terminée par artisan</span>
        <span className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-blue-500"></div>Validée</span>
        <span className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-orange-500"></div>En retard</span>
        <span className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-red-600"></div>Conflit / Artisan indisponible</span>
      </div>
      {ConfirmDialog}
    </div>
  );
}