import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Ruler, Plus, ExternalLink, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useChantier } from '@/context/ChantierContext';
import { useCommentaires } from '@/context/CommentairesContext.jsx';
import { parseTaches, SaisieRapide } from '@/components/taches/TachesInline.jsx';
import { CommentaireCarte, BoutonAujourdhui, noteAPourAujourdhui } from '@/components/planning/CommentairesBloc.jsx';
import { estEnRetard } from '@/lib/bureauEtudes';

const SELECT = 'h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const STATUTS = [
  { value: 'a_faire', label: 'À réaliser' },
  { value: 'tous', label: 'Toutes les notes' },
];

// Note encore à traiter : aucun point, ou au moins un point non coché
const noteARealiser = (note) => {
  const pts = parseTaches(note.texte);
  return pts.length === 0 || pts.some(p => !p.checked);
};

export function BureauEtudes() {
  const { toast } = useToast();
  const { chantiers = [] } = useChantier();
  const { commentaires, loading, addCommentaire } = useCommentaires();

  const [filtreChantier, setFiltreChantier] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('a_faire');
  const [filtreJour, setFiltreJour] = useState(false);

  // Nouvelle note
  const [nvChantier, setNvChantier] = useState('');
  const [nvTitre, setNvTitre] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const chantiersTries = useMemo(
    () => [...chantiers].sort((a, b) => (a.nomchantier || '').localeCompare(b.nomchantier || '')),
    [chantiers]
  );

  const notesBE = useMemo(
    () => commentaires.filter(c => c.categorie === 'bureau_etudes' && !c.archive),
    [commentaires]
  );

  const compteurs = useMemo(() => {
    const pts = notesBE.flatMap(n => parseTaches(n.texte));
    return {
      aFaire: pts.filter(p => !p.checked).length,
      enRetard: pts.filter(estEnRetard).length,
      haute: pts.filter(p => !p.checked && p.importance === 'haute').length,
    };
  }, [notesBE]);

  // Une section par chantier, ses notes en dessous (les plus récentes en premier)
  const sections = useMemo(() => {
    const parChantier = new Map();
    notesBE.forEach(note => {
      if (filtreChantier && note.chantier_id !== filtreChantier) return;
      if (filtreStatut === 'a_faire' && !noteARealiser(note)) return;
      if (filtreJour && !noteAPourAujourdhui(note)) return;
      if (!parChantier.has(note.chantier_id)) parChantier.set(note.chantier_id, []);
      parChantier.get(note.chantier_id).push(note);
    });
    return chantiersTries
      .filter(c => parChantier.has(c.id))
      .map(c => {
        const notes = parChantier.get(c.id).sort((a, b) => new Date(b.date) - new Date(a.date));
        const pts = notes.flatMap(n => parseTaches(n.texte));
        return {
          chantier: c,
          notes,
          nbPoints: pts.length,
          nbRealises: pts.filter(p => p.checked).length,
          nbRetard: pts.filter(estEnRetard).length,
        };
      });
  }, [notesBE, chantiersTries, filtreChantier, filtreStatut, filtreJour]);

  const chantiersAvecNotes = useMemo(() => {
    const ids = new Set(notesBE.map(n => n.chantier_id));
    return chantiersTries.filter(c => ids.has(c.id));
  }, [chantiersTries, notesBE]);

  const creerNote = async () => {
    if (!nvChantier || !nvTitre.trim() || envoi) return;
    setEnvoi(true);
    try {
      await addCommentaire(nvChantier, nvTitre.trim(), JSON.stringify([]), 'bureau_etudes');
      setNvTitre('');
      toast({ title: 'Note BE ajoutée ✅', description: chantiers.find(c => c.id === nvChantier)?.nomchantier });
    } catch (e) {
      console.error('Erreur création note BE:', e);
      toast({ title: 'Erreur', description: "Impossible d'ajouter la note.", variant: 'destructive' });
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" style={{ color: '#683B11' }}>
          <Ruler className="h-6 w-6" style={{ color: '#F8B45B' }} /> Bureau d'Études
        </h1>
        <p className="text-sm mt-1" style={{ color: '#A3806D' }}>
          Les notes du bureau d'études de tous les chantiers. Cocher ici coche aussi dans le planning du chantier.
        </p>
      </div>

      {/* Compteurs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border border-[#e8e2d9] bg-white p-4">
          <p className="text-3xl font-bold tabular-nums" style={{ color: '#683B11' }}>{compteurs.aFaire}</p>
          <p className="text-sm" style={{ color: '#A3806D' }}>Points à réaliser</p>
        </div>
        <div className={`rounded-lg border p-4 ${compteurs.enRetard ? 'border-red-300 bg-red-50' : 'border-[#e8e2d9] bg-white'}`}>
          <p className={`text-3xl font-bold tabular-nums ${compteurs.enRetard ? 'text-red-700' : 'text-[#683B11]'}`}>{compteurs.enRetard}</p>
          <p className={`text-sm ${compteurs.enRetard ? 'text-red-700' : 'text-[#A3806D]'}`}>Date prévisionnelle dépassée</p>
        </div>
        <div className="rounded-lg border border-[#e8e2d9] bg-white p-4">
          <p className="text-3xl font-bold tabular-nums" style={{ color: '#683B11' }}>{compteurs.haute}</p>
          <p className="text-sm" style={{ color: '#A3806D' }}>Importance haute à réaliser</p>
        </div>
      </div>

      {/* Nouvelle note */}
      <Card className="border border-[#e8e2d9] shadow-sm bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold uppercase tracking-wide" style={{ color: '#683B11' }}>Nouvelle note BE</CardTitle>
          <CardDescription>Elle apparaît aussi dans le bloc « Bureau d'Études » du planning du chantier.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-2">
            <select value={nvChantier} onChange={(e) => setNvChantier(e.target.value)} className={`${SELECT} lg:w-56`} aria-label="Chantier">
              <option value="">Chantier…</option>
              {chantiersTries.map(c => <option key={c.id} value={c.id}>{c.nomchantier}</option>)}
            </select>
            <SaisieRapide value={nvTitre} onChange={setNvTitre} onSubmit={creerNote}
              placeholder="Titre de la note" className="h-9 lg:flex-1" />
            <Button onClick={creerNote} disabled={!nvChantier || !nvTitre.trim() || envoi}
              className="h-9 text-white border-0" style={{ background: '#9FC760' }}>
              <Plus className="mr-1 h-4 w-4" /> Ajouter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-2">
        <select value={filtreChantier} onChange={(e) => setFiltreChantier(e.target.value)} className={SELECT} aria-label="Filtrer par chantier">
          <option value="">Tous les chantiers</option>
          {chantiersAvecNotes.map(c => <option key={c.id} value={c.id}>{c.nomchantier}</option>)}
        </select>
        <div className="inline-flex rounded-md border border-input p-0.5 bg-white">
          {STATUTS.map(s => (
            <button key={s.value} type="button" onClick={() => setFiltreStatut(s.value)}
              className={`px-3 h-8 text-sm rounded ${filtreStatut === s.value ? 'bg-[#f0ebe2] font-semibold text-[#683B11]' : 'text-slate-600'}`}>
              {s.label}
            </button>
          ))}
        </div>
        <BoutonAujourdhui actif={filtreJour} onClick={() => setFiltreJour(f => !f)} />
      </div>

      {/* Tableau : une ligne par chantier, ses notes en dessous */}
      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Chargement…</p>
      ) : sections.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {notesBE.length === 0
            ? "Aucune note du bureau d'études pour le moment."
            : filtreJour ? "Aucune tâche pour aujourd'hui, en retard ou sans date." : 'Aucune note à réaliser.'}
        </p>
      ) : (
        <div className="rounded-lg border border-[#e8e2d9] bg-white overflow-hidden">
          {sections.map(({ chantier, notes, nbPoints, nbRealises, nbRetard }) => (
            <section key={chantier.id} className="border-b border-[#e8e2d9] last:border-b-0">
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-[#f0ebe2]">
                <Link to={`/chantiers/${chantier.id}`}
                  className="inline-flex items-center gap-1.5 text-base font-bold text-[#683B11] hover:underline">
                  {chantier.nomchantier}
                  <ExternalLink className="h-3.5 w-3.5 opacity-50" />
                </Link>
                <div className="flex items-center gap-2 text-xs">
                  {nbRetard > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 font-semibold text-white">
                      <AlertTriangle className="h-3 w-3" /> {nbRetard} en retard
                    </span>
                  )}
                  <span className="rounded-full bg-white px-2 py-0.5 font-medium text-slate-700">
                    {nbRealises}/{nbPoints} réalisé{nbRealises > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <ul className="space-y-3 p-3 sm:p-4">
                {notes.map(note => (
                  <CommentaireCarte key={note.id} commentaire={note} archives={false} filtreJour={filtreJour} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
