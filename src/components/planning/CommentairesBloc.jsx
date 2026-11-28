import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useCommentaires, nouvelId } from '@/context/CommentairesContext.jsx';
import { Plus, Edit2, Trash2, MessageSquare, Ruler, Check, Archive, ArchiveRestore, CalendarDays } from 'lucide-react';
import { SaisieRapide, parseTaches, formatDateHeure } from '@/components/taches/TachesInline.jsx';
import { TableauPointsBE } from '@/components/taches/PointsBE.jsx';
import { estPourAujourdhui } from '@/lib/bureauEtudes';

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

export const parseLignes = (commentaire) => parseTaches(commentaire.texte);

// Filtre « Aujourd'hui » : la note a au moins une tâche prévue aujourd'hui ou sans date
export const noteAPourAujourdhui = (commentaire) => parseLignes(commentaire).some(estPourAujourdhui);

// Bouton bascule du filtre « Aujourd'hui »
export function BoutonAujourdhui({ actif, onClick }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={actif}
      title="Tâches prévues aujourd'hui, en retard et sans date"
      className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition ${actif
        ? 'border-[#9FC760] bg-[#9FC760] text-white'
        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>
      <CalendarDays size={15} /> Aujourd'hui
    </button>
  );
}

// Une note (journal ou BE) : titre + points à cocher. Utilisée par le Planning et l'onglet BE.
export function CommentaireCarte({ commentaire, archives, filtreJour = false }) {
  const { toast } = useToast();
  const {
    updateCommentaire, deleteCommentaire, modifierLignes, setArchive, auteur,
  } = useCommentaires();

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

  // Point complet { texte, importance, date_prevue, commentaire, qui } saisi dans le tableau
  const ajouterLigne = async (point) => {
    try {
      await modifierLignes(commentaire.id, (l) => [...l, {
        id: nouvelId(), checked: false, importance: 'normale', ...point,
      }]);
      return true;
    } catch (error) {
      erreur("Impossible d'ajouter la tâche.", error);
      return false;
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

      {/* Tableau priorité / désignation / date / commentaire / qui / terminé (journal et BE) */}
      <TableauPointsBE
        lignes={lignes}
        lectureSeule={archives}
        auteur={auteur}
        onModifier={(transformer) => modifierLignes(commentaire.id, transformer)}
        onErreur={erreur}
        onAjouter={(point) => ajouterLigne(point)}
        filtreJour={filtreJour}
      />

      <p className="text-xs mt-3 italic text-slate-600">
        Par {commentaire.auteur} - {formatDateHeure(commentaire.date)}
        {archives && commentaire.archive_le && (
          <> · Archivé {commentaire.archive_par ? `par ${commentaire.archive_par} ` : ''}le {formatDateHeure(commentaire.archive_le)}</>
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
  const [envoi, setEnvoi] = useState(false);
  const [filtreJour, setFiltreJour] = useState(false);

  const notesAffichees = filtreJour ? commentaires.filter(noteAPourAujourdhui) : commentaires;

  // Les tâches s'ajoutent ensuite dans le tableau de la note
  const creer = async () => {
    const t = titre.trim();
    if (!t || envoi) return;
    setEnvoi(true);
    try {
      await addCommentaire(chantierId, t, JSON.stringify([]), categorie);
      setTitre('');
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-xl flex items-center">
            <Icon className="mr-2 h-5 w-5 text-primary" />
            {theme.titre}{archives ? ' — archivés' : ''}
          </CardTitle>
          {!archives && commentaires.length > 0 && (
            <BoutonAujourdhui actif={filtreJour} onClick={() => setFiltreJour(f => !f)} />
          )}
        </div>
        <CardDescription>{theme.description}</CardDescription>

        {/* Création directe d'un commentaire */}
        {!archives && (
          <div className="flex flex-col sm:flex-row gap-2 pt-3">
            <SaisieRapide value={titre} onChange={setTitre} onSubmit={creer}
              placeholder={theme.placeholder} className="h-9 sm:flex-1" />
            <Button onClick={creer} disabled={!titre.trim() || envoi} className="h-9">
              <Plus className="mr-1 h-4 w-4" /> Ajouter
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {notesAffichees.length > 0 ? (
          <ul className="space-y-3">
            {notesAffichees.map(commentaire => (
              <CommentaireCarte key={commentaire.id} commentaire={commentaire} archives={archives}
                filtreJour={filtreJour && !archives} />
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-center py-4">
            {filtreJour && commentaires.length > 0
              ? "Aucune tâche pour aujourd'hui, en retard ou sans date."
              : archives ? theme.videArchive : theme.vide}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
