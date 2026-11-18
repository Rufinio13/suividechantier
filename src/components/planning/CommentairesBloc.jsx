import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useCommentaires, nouvelId } from '@/context/CommentairesContext.jsx';
import {
  Plus, Edit2, Trash2, MessageSquare, Ruler, X, Check, Archive, ArchiveRestore, Reply, CornerDownRight,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

// Couleurs communes : bleu clair en cours, vert clair quand tout est coché, gris si archivé
const COULEURS = {
  enCours: {
    carte: 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-300',
    titre: 'text-blue-900',
    texte: 'text-blue-800',
  },
  termine: {
    carte: 'bg-gradient-to-r from-green-50 to-green-100 border-green-300',
    titre: 'text-green-900',
    texte: 'text-green-800',
  },
  archive: {
    carte: 'bg-slate-50 border-slate-300',
    titre: 'text-slate-700',
    texte: 'text-slate-600',
  },
};

// Libellés par catégorie de commentaire
export const CATEGORIES_COMMENTAIRE = {
  journal: {
    titre: 'Journal des Commentaires',
    description: 'Suivez les discussions et notes importantes relatives à ce chantier.',
    placeholder: 'Nouveau commentaire : titre…',
    vide: 'Aucun commentaire pour ce chantier pour le moment.',
    videArchive: 'Aucun commentaire archivé.',
    icon: MessageSquare,
  },
  bureau_etudes: {
    titre: "Bureau d'Études",
    description: "Notes et échanges avec le bureau d'études pour ce chantier.",
    placeholder: 'Nouvelle note BE : titre…',
    vide: "Aucune note du bureau d'études pour ce chantier pour le moment.",
    videArchive: 'Aucune note BE archivée.',
    icon: Ruler,
  },
};

export const parseLignes = (commentaire) => {
  try {
    const lignes = typeof commentaire.texte === 'string' ? JSON.parse(commentaire.texte) : commentaire.texte;
    return Array.isArray(lignes) ? lignes : [{ texte: String(commentaire.texte ?? ''), checked: false }];
  } catch {
    return [{ texte: commentaire.texte, checked: false }];
  }
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return format(parseISO(dateString), 'dd MMM yyyy HH:mm', { locale: fr });
  } catch {
    return 'Date invalide';
  }
};

// Champ texte qui valide sur Entrée et annule sur Échap
function SaisieRapide({ value, onChange, onSubmit, onCancel, placeholder, autoFocus, className = '' }) {
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

// Une tâche : case à cocher, modification sur place et fil de réponses
function LigneTache({ commentaire, ligne, index, archives, couleurTexte, onErreur }) {
  const { modifierLignes, addReponse, deleteReponse, auteur } = useCommentaires();

  const [edition, setEdition] = useState(null);
  const [repondre, setRepondre] = useState(false);
  const [reponse, setReponse] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const reponses = Array.isArray(ligne.reponses) ? ligne.reponses : [];
  const idCase = `ligne-${commentaire.id}-${index}`;

  // Applique une modification à cette tâche (retrouvée par id, sinon par position)
  const modifierCetteLigne = (transformer, message) =>
    modifierLignes(commentaire.id, (lignes) => {
      const i = ligne.id ? lignes.findIndex(l => l.id === ligne.id) : index;
      if (i === -1 || !lignes[i]) return lignes;
      return transformer(lignes, i);
    }).catch((error) => onErreur(message, error));

  const toggle = () =>
    modifierCetteLigne((lignes, i) => {
      lignes[i] = { ...lignes[i], checked: !lignes[i].checked };
      return lignes;
    }, "Impossible d'enregistrer la modification.");

  const validerEdition = async () => {
    const texte = (edition ?? '').trim();
    setEdition(null);
    if (!texte || texte === ligne.texte) return;
    await modifierCetteLigne((lignes, i) => {
      lignes[i] = { ...lignes[i], texte };
      return lignes;
    }, "Impossible d'enregistrer la tâche.");
  };

  const supprimer = async () => {
    if (reponses.length > 0 && !window.confirm('Supprimer cette tâche et ses réponses ?')) return;
    await modifierCetteLigne((lignes, i) => lignes.filter((_, k) => k !== i), 'Impossible de supprimer la tâche.');
  };

  const envoyerReponse = async () => {
    const texte = reponse.trim();
    if (!texte || envoi) return;
    setEnvoi(true);
    try {
      await addReponse(commentaire.id, ligne.id, index, texte);
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
      await deleteReponse(commentaire.id, reponseId);
    } catch (error) {
      onErreur('Impossible de supprimer la réponse.', error);
    }
  };

  return (
    <li>
      <div className="group flex items-start gap-2">
        <Checkbox id={idCase} checked={!!ligne.checked} disabled={archives} onCheckedChange={toggle} className="mt-0.5" />
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
            {!archives && (
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
                  <span className="font-semibold text-slate-800">{r.auteur}</span> · {formatDate(r.date)}
                </p>
                {!archives && r.auteur === auteur && (
                  <button type="button" title="Supprimer la réponse" onClick={() => supprimerReponse(r.id)}
                    className="p-0.5 text-slate-400 hover:text-red-600 opacity-60 sm:opacity-0 sm:group-hover/rep:opacity-100 transition">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
              <p className="text-sm text-slate-800 whitespace-pre-wrap mt-0.5">{r.texte}</p>
            </div>
          ))}

          {repondre && !archives && (
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

function CommentaireCarte({ commentaire, archives }) {
  const { toast } = useToast();
  const { updateCommentaire, deleteCommentaire, modifierLignes, setArchive } = useCommentaires();

  const [nouvelleLigne, setNouvelleLigne] = useState('');
  const [titreEdite, setTitreEdite] = useState(null);

  const lignes = parseLignes(commentaire);
  const nbCoches = lignes.filter(l => l.checked).length;
  const nbTotal = lignes.length;
  const s = archives
    ? COULEURS.archive
    : (nbTotal > 0 && nbCoches === nbTotal ? COULEURS.termine : COULEURS.enCours);

  const erreur = (message, error) => {
    console.error(message, error);
    toast({ title: 'Erreur', description: message, variant: 'destructive' });
  };

  const ajouterLigne = async () => {
    const texte = nouvelleLigne.trim();
    if (!texte) return;
    setNouvelleLigne('');
    try {
      await modifierLignes(commentaire.id, (l) => [...l, { id: nouvelId(), texte, checked: false }]);
    } catch (error) {
      setNouvelleLigne(texte);
      erreur("Impossible d'ajouter la tâche.", error);
    }
  };

  const validerTitre = async () => {
    const titre = (titreEdite ?? '').trim();
    setTitreEdite(null);
    if (!titre || titre === commentaire.titre) return;
    try {
      await updateCommentaire(commentaire.id, { titre });
    } catch (error) {
      erreur("Impossible d'enregistrer le titre.", error);
    }
  };

  const basculerArchive = async () => {
    try {
      await setArchive(commentaire.id, !archives);
      toast({ title: archives ? 'Commentaire restauré' : 'Commentaire archivé' });
    } catch (error) {
      erreur("Impossible de modifier l'archivage.", error);
    }
  };

  const supprimer = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce commentaire ?')) return;
    try {
      await deleteCommentaire(commentaire.id);
    } catch (error) {
      erreur('Impossible de supprimer le commentaire.', error);
    }
  };

  return (
    <li className={`p-4 border-2 rounded-lg shadow-sm ${s.carte}`}>
      {/* En-tête : titre + compteur + actions */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          {titreEdite !== null ? (
            <div className="flex items-center gap-1">
              <SaisieRapide value={titreEdite} onChange={setTitreEdite} onSubmit={validerTitre}
                onCancel={() => setTitreEdite(null)} autoFocus className="flex-1" />
              <Button size="icon" className="h-8 w-8 shrink-0" onClick={validerTitre} title="Valider">
                <Check size={16} />
              </Button>
            </div>
          ) : (
            <h4
              className={`font-semibold text-base ${s.titre} ${archives ? '' : 'cursor-text'}`}
              onDoubleClick={() => !archives && setTitreEdite(commentaire.titre || '')}
              title={archives ? undefined : 'Double-clic pour modifier le titre'}
            >
              {commentaire.titre}
            </h4>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {nbTotal > 0 && (
            <span className="text-xs px-2 py-1 rounded text-slate-600 bg-white/50">
              {nbCoches}/{nbTotal} cochés
            </span>
          )}
          {!archives && (
            <Button variant="ghost" size="icon" title="Modifier le titre"
              onClick={() => setTitreEdite(commentaire.titre || '')}
              className="h-8 w-8 text-slate-600 hover:text-slate-800 hover:bg-white/50">
              <Edit2 size={15} />
            </Button>
          )}
          <Button variant="ghost" size="icon" title={archives ? 'Restaurer' : 'Archiver'}
            onClick={basculerArchive}
            className="h-8 w-8 text-slate-600 hover:text-slate-800 hover:bg-white/50">
            {archives ? <ArchiveRestore size={15} /> : <Archive size={15} />}
          </Button>
          <Button variant="ghost" size="icon" title="Supprimer" onClick={supprimer}
            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100">
            <Trash2 size={15} />
          </Button>
        </div>
      </div>

      {/* Tâches à cocher, chacune avec ses réponses */}
      <ul className="space-y-1.5">
        {lignes.map((ligne, index) => (
          <LigneTache
            key={ligne.id || index}
            commentaire={commentaire}
            ligne={ligne}
            index={index}
            archives={archives}
            couleurTexte={s.texte}
            onErreur={erreur}
          />
        ))}
      </ul>

      {/* Ajout direct d'une tâche : bouton (téléphone) ou Entrée (ordinateur) */}
      {!archives && (
        <div className="flex items-center gap-2 mt-2">
          <SaisieRapide
            value={nouvelleLigne}
            onChange={setNouvelleLigne}
            onSubmit={ajouterLigne}
            placeholder="Nouvelle tâche…"
            className="bg-white/70 flex-1"
          />
          <Button size="sm" onClick={ajouterLigne} disabled={!nouvelleLigne.trim()} className="h-8 shrink-0">
            <Plus className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Ajouter</span>
          </Button>
        </div>
      )}

      <p className="text-xs mt-3 italic text-slate-600">
        Par {commentaire.auteur} - {formatDate(commentaire.date)}
        {archives && commentaire.archive_le && (
          <> · Archivé {commentaire.archive_par ? `par ${commentaire.archive_par} ` : ''}le {formatDate(commentaire.archive_le)}</>
        )}
      </p>
    </li>
  );
}

// Bloc de commentaires multi-lignes à cocher (journal, bureau d'études…)
export function CommentairesBloc({ categorie, chantierId, commentaires, archives = false, className = '' }) {
  const theme = CATEGORIES_COMMENTAIRE[categorie];
  const Icon = theme.icon;
  const { toast } = useToast();
  const { addCommentaire } = useCommentaires();

  const [titre, setTitre] = useState('');
  const [premiereTache, setPremiereTache] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const creer = async () => {
    const t = titre.trim();
    if (!t || envoi) return;
    setEnvoi(true);
    try {
      const lignes = premiereTache.trim() ? [{ id: nouvelId(), texte: premiereTache.trim(), checked: false }] : [];
      await addCommentaire(chantierId, t, JSON.stringify(lignes), categorie);
      setTitre('');
      setPremiereTache('');
    } catch (error) {
      console.error('Erreur création commentaire:', error);
      toast({ title: 'Erreur', description: "Impossible d'ajouter le commentaire.", variant: 'destructive' });
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
          <Icon className="mr-2 h-5 w-5 text-primary" />
          {theme.titre}{archives ? ' — archivés' : ''}
        </CardTitle>
        <CardDescription>{theme.description}</CardDescription>

        {/* Création directe d'un commentaire */}
        {!archives && (
          <div className="flex flex-col sm:flex-row gap-2 pt-3">
            <SaisieRapide value={titre} onChange={setTitre} onSubmit={creer}
              placeholder={theme.placeholder} className="h-9 sm:flex-1" />
            <SaisieRapide value={premiereTache} onChange={setPremiereTache} onSubmit={creer}
              placeholder="Première tâche (facultatif)" className="h-9 sm:flex-1" />
            <Button onClick={creer} disabled={!titre.trim() || envoi} className="h-9">
              <Plus className="mr-1 h-4 w-4" /> Ajouter
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {commentaires.length > 0 ? (
          <ul className="space-y-3">
            {commentaires.map(commentaire => (
              <CommentaireCarte key={commentaire.id} commentaire={commentaire} archives={archives} />
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-center py-4">{archives ? theme.videArchive : theme.vide}</p>
        )}
      </CardContent>
    </Card>
  );
}
