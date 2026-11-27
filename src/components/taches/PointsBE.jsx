// Tâches d'une note (journal des commentaires ou Bureau d'Études) :
// Désignation · Date prévisionnelle · Priorité · Action / commentaire · Qui · Terminé
// Ordinateur / tablette : tableau. Téléphone : une carte par tâche, désignation en gros.
// Utilisé par le Planning (journal + Bureau d'Études) et par l'onglet BE.
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, X, Plus } from 'lucide-react';
import { pourLaTache, formatDateHeure } from '@/components/taches/TachesInline.jsx';
import { IMPORTANCES, importanceDe, estEnRetard } from '@/lib/bureauEtudes';

// Date ISO → JJ/MM/AAAA (heure locale)
const formatJour = (iso) => {
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleDateString('fr-FR');
};

// Affichage téléphone (sous 768 px)
const REQUETE_MOBILE = '(max-width: 767px)';
function useEstMobile() {
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia(REQUETE_MOBILE).matches);
  useEffect(() => {
    const mq = window.matchMedia(REQUETE_MOBILE);
    const surChangement = (e) => setMobile(e.matches);
    mq.addEventListener('change', surChangement);
    return () => mq.removeEventListener('change', surChangement);
  }, []);
  return mobile;
}

const CHAMP = 'w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-sm hover:border-slate-200 focus:border-slate-300 focus:bg-white focus:outline-none disabled:hover:border-transparent';

// Zone de texte dont la hauteur suit exactement son contenu (le texte revient à la ligne).
// Recalculée quand le texte change ET quand la largeur change (rotation du téléphone,
// onglet affiché après coup, animation d'ouverture…), sinon la hauteur reste figée trop grande.
function TexteAuto({ className = '', ...props }) {
  const ref = useRef(null);

  const ajuster = () => {
    const el = ref.current;
    if (!el || !el.offsetWidth) return; // invisible : on attend d'avoir une vraie largeur
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  useLayoutEffect(ajuster, [props.value]);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    let largeur = el.offsetWidth;
    const ro = new ResizeObserver(() => {
      if (el.offsetWidth !== largeur) { largeur = el.offsetWidth; ajuster(); }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return <textarea ref={ref} rows={1} {...props} className={`block resize-none overflow-hidden leading-snug ${className}`} />;
}

// Texte modifiable sur place : enregistré en quittant le champ ou sur Entrée, Échap annule
function ChampTexte({ valeur, placeholder, onEnregistrer, disabled, className = '', obligatoire = false }) {
  const [texte, setTexte] = useState(valeur || '');
  useEffect(() => { setTexte(valeur || ''); }, [valeur]);

  const enregistrer = () => {
    const t = texte.trim();
    if (obligatoire && !t) { setTexte(valeur || ''); return; }
    if (t !== (valeur || '').trim()) onEnregistrer(t);
  };

  return (
    <TexteAuto value={texte} placeholder={placeholder} disabled={disabled}
      onChange={(e) => setTexte(e.target.value)}
      onBlur={enregistrer}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
        if (e.key === 'Escape') { setTexte(valeur || ''); e.currentTarget.blur(); }
      }}
      className={`${CHAMP} placeholder:text-slate-400 ${className}`} />
  );
}

function PastillePriorite({ valeur, onChange, disabled }) {
  const imp = importanceDe(valeur || 'normale');
  return (
    <span className={`relative inline-flex items-center gap-1.5 whitespace-nowrap rounded-full pl-2.5 pr-6 py-1 text-xs font-medium ${imp.pastille}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${imp.point}`} />
      {imp.label}
      <ChevronDown className="pointer-events-none absolute right-1.5 h-3.5 w-3.5 opacity-70" />
      <select value={valeur || 'normale'} disabled={disabled} aria-label="Priorité"
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-default">
        {IMPORTANCES.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
      </select>
    </span>
  );
}

function CaseTermine({ ligne, disabled, onBasculer }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <Checkbox checked={!!ligne.checked} disabled={disabled} aria-label="Terminé" onCheckedChange={onBasculer}
        className={ligne.checked ? 'border-green-600 data-[state=checked]:bg-green-600 data-[state=checked]:text-white' : ''} />
      {ligne.checked && ligne.termine_le && (
        <span className="text-xs font-medium text-green-700" title={`Terminé le ${formatDateHeure(ligne.termine_le)}`}>
          {formatJour(ligne.termine_le)}
        </span>
      )}
    </span>
  );
}

const infoCommentaire = (ligne) => (ligne.commentaire && ligne.commentaire_par
  ? `Commentaire de ${ligne.commentaire_par}${ligne.commentaire_le ? ` · ${formatDateHeure(ligne.commentaire_le)}` : ''}`
  : undefined);

// Réponses saisies avant le passage au commentaire : lecture seule
function AnciennesReponses({ ligne }) {
  const reponses = Array.isArray(ligne.reponses) ? ligne.reponses : [];
  if (!reponses.length) return null;
  const texte = reponses.map(r => `${r.auteur} : ${r.texte}`);
  return <p className="px-2 text-[11px] text-slate-500" title={texte.join('\n')}>{texte.join(' · ')}</p>;
}

// ─── Saisie d'une nouvelle tâche ──────────────────────────────────────────────
const SAISIE = 'w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm placeholder:text-slate-400 focus:border-slate-400 focus:outline-none';
const NOUVEAU_VIDE = { importance: 'normale', texte: '', date_prevue: '', commentaire: '', qui: '' };

function useNouvellePoint({ auteur, onAjouter, onFermer }) {
  const [point, setPoint] = useState(NOUVEAU_VIDE);
  const [envoi, setEnvoi] = useState(false);
  const champ = (nom) => ({ value: point[nom], onChange: (e) => setPoint(p => ({ ...p, [nom]: e.target.value })) });

  const ajouter = async () => {
    const texte = point.texte.trim();
    if (!texte || envoi) return;
    setEnvoi(true);
    const commentaire = point.commentaire.trim();
    const ok = await onAjouter({
      texte,
      importance: point.importance,
      date_prevue: point.date_prevue || null,
      qui: point.qui.trim() || null,
      commentaire: commentaire || null,
      ...(commentaire ? { commentaire_par: auteur, commentaire_le: new Date().toISOString() } : {}),
    });
    setEnvoi(false);
    if (ok !== false) { setPoint(NOUVEAU_VIDE); onFermer(); }
  };

  // Entrée = Ajouter (Maj+Entrée : retour à la ligne), Échap = Annuler
  const surTouche = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ajouter(); }
    if (e.key === 'Escape') { e.preventDefault(); onFermer(); }
  };

  const boutons = (
    <div className="flex items-center justify-end gap-1">
      <button type="button" onClick={ajouter} disabled={!point.texte.trim() || envoi}
        className="h-8 rounded-md px-4 text-sm font-medium text-white disabled:opacity-40" style={{ background: '#9FC760' }}>
        Ajouter
      </button>
      <button type="button" onClick={onFermer} title="Annuler" className="p-1 text-slate-400 hover:text-slate-700">
        <X size={16} />
      </button>
    </div>
  );

  const priorite = <PastillePriorite valeur={point.importance} onChange={(importance) => setPoint(p => ({ ...p, importance }))} />;

  return { champ, surTouche, boutons, priorite };
}

function LigneAjout(props) {
  const { champ, surTouche, boutons, priorite } = useNouvellePoint(props);
  return (
    <tr className="border-t border-slate-200 bg-slate-50/70 align-top" onKeyDown={surTouche}>
      <td className="px-1 py-2"><TexteAuto autoFocus placeholder="+ Nouvelle action…" className={SAISIE} {...champ('texte')} /></td>
      <td className="px-1 py-2"><input type="date" aria-label="Date prévisionnelle" className={SAISIE} {...champ('date_prevue')} /></td>
      <td className="px-3 py-2">{priorite}</td>
      <td className="px-1 py-2"><TexteAuto placeholder="Action / commentaire" className={SAISIE} {...champ('commentaire')} /></td>
      <td className="px-1 py-2"><TexteAuto placeholder="Qui ?" className={SAISIE} {...champ('qui')} /></td>
      <td className="px-3 py-2" colSpan={2}>{boutons}</td>
    </tr>
  );
}

function CarteAjout(props) {
  const { champ, surTouche, boutons, priorite } = useNouvellePoint(props);
  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3" onKeyDown={surTouche}>
      <TexteAuto autoFocus placeholder="+ Nouvelle action…" className={`${SAISIE} text-base font-semibold`} {...champ('texte')} />
      <div className="flex flex-wrap items-center gap-2">
        <input type="date" aria-label="Date prévisionnelle" className={`${SAISIE} w-auto`} {...champ('date_prevue')} />
        {priorite}
      </div>
      <TexteAuto placeholder="Action / commentaire" className={SAISIE} {...champ('commentaire')} />
      <TexteAuto placeholder="Qui ?" className={SAISIE} {...champ('qui')} />
      {boutons}
    </div>
  );
}

/**
 * - lignes : tâches de la note
 * - onModifier(transformer) : transformer(lignes) → nouvelles lignes (relu en base avant écriture)
 * - onAjouter(point) : ajoute une tâche ; absent = pas d'ajout
 * - auteur : nom de l'utilisateur connecté (auteur des commentaires)
 */
export function TableauPointsBE({ lignes, lectureSeule, auteur, onModifier, onErreur, onAjouter }) {
  const mobile = useEstMobile();
  const [ajoutOuvert, setAjoutOuvert] = useState(false);
  const peutAjouter = !lectureSeule && !!onAjouter;

  const maj = (ligne, index, patch) =>
    onModifier(pourLaTache(ligne, index, (pts, i) => {
      pts[i] = { ...pts[i], ...patch };
      return pts;
    })).catch((e) => onErreur("Impossible d'enregistrer la modification.", e));

  const supprimer = (ligne, index) => {
    if (!window.confirm(`Supprimer la tâche « ${ligne.texte} » ?`)) return;
    onModifier(pourLaTache(ligne, index, (pts, i) => pts.filter((_, k) => k !== i)))
      .catch((e) => onErreur('Impossible de supprimer la tâche.', e));
  };

  // Actions communes aux deux affichages
  const actions = (ligne, index) => ({
    texte: (texte) => maj(ligne, index, { texte }),
    date: (e) => maj(ligne, index, { date_prevue: e.target.value || null }),
    priorite: (importance) => maj(ligne, index, { importance }),
    commentaire: (commentaire) => maj(ligne, index, {
      commentaire: commentaire || null,
      commentaire_par: commentaire ? auteur : null,
      commentaire_le: commentaire ? new Date().toISOString() : null,
    }),
    qui: (qui) => maj(ligne, index, { qui }),
    termine: () => maj(ligne, index, {
      checked: !ligne.checked,
      termine_le: !ligne.checked ? new Date().toISOString() : null,
    }),
    supprimer: () => supprimer(ligne, index),
  });

  const fermerAjout = () => setAjoutOuvert(false);
  const boutonAjout = peutAjouter && !ajoutOuvert && (
    <button type="button" onClick={() => setAjoutOuvert(true)}
      className="mt-2 inline-flex h-8 items-center gap-1 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
      <Plus size={15} /> Ajouter une tâche
    </button>
  );

  if (lignes.length === 0 && !ajoutOuvert) {
    return boutonAjout || <p className="rounded-md bg-white/70 px-3 py-2 text-sm italic text-slate-500">Aucune tâche.</p>;
  }

  // ─── Téléphone : une carte par tâche ─────────────────────────────────────
  if (mobile) {
    return (
      <div className="space-y-2">
        {lignes.map((ligne, index) => {
          const a = actions(ligne, index);
          const retard = estEnRetard(ligne);
          return (
            <div key={ligne.id || index}
              className={`rounded-lg border p-2.5 ${ligne.checked ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-white'}`}>
              <div className="flex items-start gap-1">
                <div className="min-w-0 flex-1">
                  <ChampTexte valeur={ligne.texte} disabled={lectureSeule} obligatoire onEnregistrer={a.texte}
                    className={`text-base font-semibold ${ligne.checked ? 'text-green-900' : 'text-slate-900'}`} />
                </div>
                {!lectureSeule && (
                  <button type="button" title="Supprimer la tâche" onClick={a.supprimer} className="mt-1 p-1 text-slate-300 hover:text-red-600">
                    <X size={16} />
                  </button>
                )}
              </div>
              <AnciennesReponses ligne={ligne} />
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5 px-2">
                <input type="date" value={ligne.date_prevue || ''} disabled={lectureSeule} aria-label="Date prévisionnelle"
                  onChange={a.date}
                  className={`rounded-md border border-slate-200 bg-white px-2 py-1 text-sm ${retard ? 'font-semibold text-red-700 border-red-300' : 'text-slate-700'}`} />
                <PastillePriorite valeur={ligne.importance} disabled={lectureSeule} onChange={a.priorite} />
                <span className="ml-auto"><CaseTermine ligne={ligne} disabled={lectureSeule} onBasculer={a.termine} /></span>
              </div>
              <div className="mt-1.5 min-w-0 space-y-0.5" title={infoCommentaire(ligne)}>
                <ChampTexte valeur={ligne.commentaire} disabled={lectureSeule} placeholder="Action / commentaire…"
                  className="text-slate-800" onEnregistrer={a.commentaire} />
                <ChampTexte valeur={ligne.qui} disabled={lectureSeule} placeholder="Qui ?"
                  className="text-xs text-slate-600" onEnregistrer={a.qui} />
              </div>
            </div>
          );
        })}
        {peutAjouter && ajoutOuvert && <CarteAjout auteur={auteur} onAjouter={onAjouter} onFermer={fermerAjout} />}
        {boutonAjout}
      </div>
    );
  }

  // ─── Ordinateur / tablette : tableau ─────────────────────────────────────
  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[760px] table-fixed text-sm">
          <colgroup>
            <col />
            <col className="w-36" />
            <col className="w-32" />
            <col />
            <col className="w-32" />
            <col className="w-32" />
            <col className="w-8" />
          </colgroup>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
              <th className="px-3 py-2 font-medium">Désignation</th>
              <th className="px-3 py-2 font-medium">Date prévisionnelle</th>
              <th className="px-3 py-2 font-medium">Priorité</th>
              <th className="px-3 py-2 font-medium">Action / commentaire</th>
              <th className="px-3 py-2 font-medium">Qui</th>
              <th className="px-3 py-2 font-medium text-center">Terminé</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lignes.map((ligne, index) => {
              const a = actions(ligne, index);
              const retard = estEnRetard(ligne);
              return (
                <tr key={ligne.id || index} className={`border-b last:border-0 align-top ${ligne.checked ? 'bg-green-50 border-green-100' : 'border-slate-100'}`}>
                  <td className="px-1 py-1.5">
                    <ChampTexte valeur={ligne.texte} disabled={lectureSeule} obligatoire onEnregistrer={a.texte}
                      className={`font-semibold ${ligne.checked ? 'text-green-900' : 'text-slate-900'}`} />
                    <AnciennesReponses ligne={ligne} />
                  </td>
                  <td className="px-1 py-1.5">
                    <input type="date" value={ligne.date_prevue || ''} disabled={lectureSeule} aria-label="Date prévisionnelle"
                      onChange={a.date}
                      className={`${CHAMP} ${retard ? 'font-semibold text-red-700' : 'text-slate-700'}`}
                      title={retard ? 'Date prévisionnelle dépassée' : undefined} />
                  </td>
                  <td className="px-3 py-1.5">
                    <PastillePriorite valeur={ligne.importance} disabled={lectureSeule} onChange={a.priorite} />
                  </td>
                  <td className="px-1 py-1.5" title={infoCommentaire(ligne)}>
                    <ChampTexte valeur={ligne.commentaire} disabled={lectureSeule} placeholder="Ajouter…"
                      className="text-slate-800" onEnregistrer={a.commentaire} />
                  </td>
                  <td className="px-1 py-1.5">
                    {/* Personne en charge, texte libre (jamais rempli automatiquement) */}
                    <ChampTexte valeur={ligne.qui} disabled={lectureSeule} placeholder="Qui ?"
                      className="text-slate-800" onEnregistrer={a.qui} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <CaseTermine ligne={ligne} disabled={lectureSeule} onBasculer={a.termine} />
                  </td>
                  <td className="pr-2 py-1.5 text-right">
                    {!lectureSeule && (
                      <button type="button" title="Supprimer la tâche" onClick={a.supprimer} className="p-1 text-slate-300 hover:text-red-600">
                        <X size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {peutAjouter && ajoutOuvert && (
            <tfoot>
              <LigneAjout auteur={auteur} onAjouter={onAjouter} onFermer={fermerAjout} />
            </tfoot>
          )}
        </table>
      </div>
      {boutonAjout}
    </>
  );
}
