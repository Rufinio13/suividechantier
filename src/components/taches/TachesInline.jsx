// Tâches à cocher éditables sur place, avec fil de réponses par tâche.
// Utilisé par le journal / bureau d'études (Planning) et par les SAV.
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit2, Trash2, X, Check, Reply, CornerDownRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export const formatDateHeure = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return format(parseISO(dateString), 'dd MMM yyyy HH:mm', { locale: fr });
  } catch {
    return 'Date invalide';
  }
};

// Lit un tableau de tâches stocké en JSON (ou texte brut des anciennes données)
export const parseTaches = (valeur) => {
  try {
    const lignes = typeof valeur === 'string' ? JSON.parse(valeur) : valeur;
    if (Array.isArray(lignes)) return lignes;
  } catch { /* texte brut */ }
  return valeur ? [{ texte: String(valeur), checked: false }] : [];
};

// Applique `transformer(lignes, i)` à la tâche visée, retrouvée par id (nouvelles tâches) ou par position
export const pourLaTache = (ligne, index, transformer) => (lignes) => {
  const i = ligne.id ? lignes.findIndex(l => l.id === ligne.id) : index;
  if (i === -1 || !lignes[i]) return lignes;
  return transformer(lignes, i);
};

// Champ texte qui valide sur Entrée et annule sur Échap
export function SaisieRapide({ value, onChange, onSubmit, onCancel, placeholder, autoFocus, className = '' }) {
  return (
    <Input
      value={value}
      autoFocus={autoFocus}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { e.preventDefault(); onSubmit(); }
        if (e.key === 'Escape' && onCancel) { e.preventDefault(); onCancel(); }
      }}
      className={`h-8 text-sm bg-white ${className}`}
    />
  );
}

// Champ « Nouvelle tâche » + bouton (pratique au téléphone), Entrée marche aussi
export function AjoutTache({ onAjouter, placeholder = 'Nouvelle tâche…' }) {
  const [texte, setTexte] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const ajouter = async () => {
    const t = texte.trim();
    if (!t || envoi) return;
    setEnvoi(true);
    setTexte('');
    try {
      const ok = await onAjouter(t);
      if (ok === false) setTexte(t);
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="flex items-center gap-2 mt-2">
      <SaisieRapide value={texte} onChange={setTexte} onSubmit={ajouter}
        placeholder={placeholder} className="bg-white/70 flex-1" />
      <Button size="sm" onClick={ajouter} disabled={!texte.trim() || envoi} className="h-8 shrink-0">
        <Plus className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Ajouter</span>
      </Button>
    </div>
  );
}

/**
 * Une tâche : case à cocher, modification sur place et fil de réponses.
 * - onModifier(transformer)  : transformer(lignes, i) → nouvelles lignes (i = position de cette tâche)
 * - onAddReponse(texte), onDeleteReponse(reponseId)
 * - onErreur(message, error)
 */
export function LigneTache({
  idCase, ligne, index, lectureSeule, couleurTexte = '', auteur,
  onModifier, onAddReponse, onDeleteReponse, onErreur,
}) {
  const [edition, setEdition] = useState(null);
  const [repondre, setRepondre] = useState(false);
  const [reponse, setReponse] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const reponses = Array.isArray(ligne.reponses) ? ligne.reponses : [];

  const modifier = (transformer, message) =>
    onModifier(pourLaTache(ligne, index, transformer)).catch((error) => onErreur(message, error));

  const toggle = () =>
    modifier((lignes, i) => {
      lignes[i] = { ...lignes[i], checked: !lignes[i].checked };
      return lignes;
    }, "Impossible d'enregistrer la modification.");

  const validerEdition = async () => {
    const texte = (edition ?? '').trim();
    setEdition(null);
    if (!texte || texte === ligne.texte) return;
    await modifier((lignes, i) => {
      lignes[i] = { ...lignes[i], texte };
      return lignes;
    }, "Impossible d'enregistrer la tâche.");
  };

  const supprimer = async () => {
    if (reponses.length > 0 && !window.confirm('Supprimer cette tâche et ses réponses ?')) return;
    await modifier((lignes, i) => lignes.filter((_, k) => k !== i), 'Impossible de supprimer la tâche.');
  };

  const envoyerReponse = async () => {
    const texte = reponse.trim();
    if (!texte || envoi) return;
    setEnvoi(true);
    try {
      await onAddReponse(texte);
      setReponse('');
      setRepondre(false);
    } catch (error) {
      onErreur("Impossible d'envoyer la réponse.", error);
    } finally {
      setEnvoi(false);
    }
  };

  const supprimerReponse = async (reponseId) => {
    if (!window.confirm('Supprimer cette réponse ?')) return;
    try {
      await onDeleteReponse(reponseId);
    } catch (error) {
      onErreur('Impossible de supprimer la réponse.', error);
    }
  };

  return (
    <li>
      <div className="group flex items-start gap-2">
        <Checkbox id={idCase} checked={!!ligne.checked} disabled={lectureSeule} onCheckedChange={toggle} className="mt-0.5" />
        {edition !== null ? (
          <div className="flex-1 flex items-center gap-1">
            <SaisieRapide value={edition} onChange={setEdition} onSubmit={validerEdition}
              onCancel={() => setEdition(null)} autoFocus className="flex-1" />
            <Button size="icon" className="h-8 w-8 shrink-0" onClick={validerEdition} title="Valider">
              <Check size={16} />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => setEdition(null)} title="Annuler">
              <X size={16} />
            </Button>
          </div>
        ) : (
          <>
            <label htmlFor={idCase}
              className={`flex-1 text-sm cursor-pointer ${couleurTexte} ${ligne.checked ? 'line-through opacity-70' : ''}`}>
              {ligne.texte}
            </label>
            {!lectureSeule && (
              <span className="flex items-center gap-0.5 shrink-0">
                <button type="button" title="Répondre à cette tâche" onClick={() => setRepondre(r => !r)}
                  className="p-1 text-slate-500 hover:text-slate-900 inline-flex items-center gap-0.5 text-xs">
                  <Reply size={14} />
                  {reponses.length > 0 && <span>{reponses.length}</span>}
                </button>
                <span className="flex gap-0.5 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition">
                  <button type="button" title="Modifier" onClick={() => setEdition(ligne.texte)}
                    className="p-1 text-slate-500 hover:text-slate-800">
                    <Edit2 size={13} />
                  </button>
                  <button type="button" title="Supprimer la tâche" onClick={supprimer}
                    className="p-1 text-slate-500 hover:text-red-600">
                    <X size={14} />
                  </button>
                </span>
              </span>
            )}
          </>
        )}
      </div>

      {/* Réponses à cette tâche */}
      {(reponses.length > 0 || repondre) && (
        <div className="ml-6 mt-1.5 mb-1 pl-3 border-l-2 border-slate-300 space-y-1.5">
          {reponses.map((r) => (
            <div key={r.id} className="group/rep bg-white/70 rounded-md px-3 py-1.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-slate-600">
                  <CornerDownRight size={12} className="inline mr-1 -mt-0.5" />
                  <span className="font-semibold text-slate-800">{r.auteur}</span> · {formatDateHeure(r.date)}
                </p>
                {!lectureSeule && r.auteur === auteur && (
                  <button type="button" title="Supprimer la réponse" onClick={() => supprimerReponse(r.id)}
                    className="p-0.5 text-slate-400 hover:text-red-600 opacity-60 sm:opacity-0 sm:group-hover/rep:opacity-100 transition">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
              <p className="text-sm text-slate-800 whitespace-pre-wrap mt-0.5">{r.texte}</p>
            </div>
          ))}

          {repondre && !lectureSeule && (
            <div className="space-y-2">
              <Textarea autoFocus value={reponse} onChange={(e) => setReponse(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); envoyerReponse(); }
                  if (e.key === 'Escape') { setRepondre(false); setReponse(''); }
                }}
                placeholder={`Réponse à « ${ligne.texte} »…`}
                className="min-h-[60px] text-sm bg-white" />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => { setRepondre(false); setReponse(''); }}>Annuler</Button>
                <Button size="sm" onClick={envoyerReponse} disabled={!reponse.trim() || envoi}>
                  <Check className="mr-1 h-4 w-4" /> Répondre
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
