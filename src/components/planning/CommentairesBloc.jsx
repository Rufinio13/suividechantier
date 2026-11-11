import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Edit2, Trash2, MessageSquare, Ruler } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

// Couleurs communes : bleu clair en cours, vert clair quand tout est coché
const COULEURS = {
  enCours: {
    carte: 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-300',
    titre: 'text-blue-900',
    texte: 'text-blue-800',
    meta: 'text-slate-600',
    compteur: 'text-slate-600 bg-white/50',
    checkbox: '',
    actions: 'text-slate-600 hover:text-slate-800 hover:bg-white/50',
    supprimer: 'text-red-600 hover:text-red-700 hover:bg-red-100',
  },
  termine: {
    carte: 'bg-gradient-to-r from-green-50 to-green-100 border-green-300',
    titre: 'text-green-900',
    texte: 'text-green-800',
    meta: 'text-slate-600',
    compteur: 'text-slate-600 bg-white/50',
    checkbox: '',
    actions: 'text-slate-600 hover:text-slate-800 hover:bg-white/50',
    supprimer: 'text-red-600 hover:text-red-700 hover:bg-red-100',
  },
};

// Libellés par catégorie de commentaire
export const CATEGORIES_COMMENTAIRE = {
  journal: {
    titre: 'Journal des Commentaires',
    description: 'Suivez les discussions et notes importantes relatives à ce chantier.',
    bouton: 'Ajouter un commentaire',
    vide: 'Aucun commentaire pour ce chantier pour le moment.',
    icon: MessageSquare,
    ...COULEURS,
  },
  bureau_etudes: {
    titre: "Bureau d'Études",
    description: "Notes et échanges avec le bureau d'études pour ce chantier.",
    bouton: 'Ajouter une note BE',
    vide: "Aucune note du bureau d'études pour ce chantier pour le moment.",
    icon: Ruler,
    ...COULEURS,
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

// Bloc de commentaires multi-lignes à cocher (journal, bureau d'études…)
export function CommentairesBloc({ categorie, commentaires, onAdd, onEdit, onDelete, onToggleLigne, className = '' }) {
  const theme = CATEGORIES_COMMENTAIRE[categorie];
  const Icon = theme.icon;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div>
            <CardTitle className="text-xl flex items-center">
              <Icon className="mr-2 h-5 w-5 text-primary" />
              {theme.titre}
            </CardTitle>
            <CardDescription>{theme.description}</CardDescription>
          </div>
          <Button onClick={onAdd}>
            <Plus className="mr-2 h-4 w-4" /> {theme.bouton}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {commentaires.length > 0 ? (
          <ul className="space-y-3">
            {commentaires.map(commentaire => {
              const lignes = parseLignes(commentaire);
              const nbCoches = lignes.filter(l => l.checked).length;
              const nbTotal = lignes.length;
              const s = nbCoches === nbTotal ? theme.termine : theme.enCours;

              return (
                <li key={commentaire.id} className={`p-4 border-2 rounded-lg shadow-sm ${s.carte}`}>
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <h4 className={`font-semibold text-base ${s.titre}`}>{commentaire.titre}</h4>
                        <span className={`shrink-0 text-xs px-2 py-1 rounded ${s.compteur}`}>
                          {nbCoches}/{nbTotal} cochés
                        </span>
                      </div>

                      <ul className="space-y-2">
                        {lignes.map((ligne, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <Checkbox
                              id={`ligne-${commentaire.id}-${index}`}
                              checked={!!ligne.checked}
                              onCheckedChange={() => onToggleLigne(commentaire, index)}
                              className={`mt-0.5 ${s.checkbox}`}
                            />
                            <label
                              htmlFor={`ligne-${commentaire.id}-${index}`}
                              className={`flex-1 text-sm cursor-pointer ${s.texte}`}
                            >
                              {ligne.texte}
                            </label>
                          </li>
                        ))}
                      </ul>

                      <p className={`text-xs mt-3 italic ${s.meta}`}>
                        Par {commentaire.auteur} - {formatDate(commentaire.date)}
                      </p>
                    </div>

                    <div className="flex flex-col space-y-1">
                      <Button variant="ghost" size="icon" onClick={() => onEdit(commentaire)} className={`h-8 w-8 ${s.actions}`}>
                        <Edit2 size={16} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onDelete(commentaire.id)} className={`h-8 w-8 ${s.supprimer}`}>
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-muted-foreground text-center py-4">{theme.vide}</p>
        )}
      </CardContent>
    </Card>
  );
}
