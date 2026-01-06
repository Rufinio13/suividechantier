import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useChantier } from '@/context/ChantierContext.jsx';
import { useReferentielCQ } from '@/context/ReferentielCQContext.jsx';
import { useCommentaires } from '@/context/CommentairesContext.jsx';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, MessageSquare, Send, AlertTriangle, Edit2, Trash2, CheckSquare, Plus, CheckCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

export function ChantierCommentaires({ isEmbedded = false, embeddedChantierId = null }) {
  const params = useParams();
  const chantierId = isEmbedded ? embeddedChantierId : params.id;

  const { chantiers, sousTraitants } = useChantier();
  const { modelesCQ, controles, saveControleFromModele } = useReferentielCQ();
  const { 
    getCommentairesByChantier, 
    addCommentaire, 
    updateCommentaire,
    deleteCommentaire,
    togglePrisEnCompte,
    loading: loadingCommentaires 
  } = useCommentaires();

  const [isCommentaireModalOpen, setIsCommentaireModalOpen] = useState(false);
  const [editingCommentaire, setEditingCommentaire] = useState(null);

  const chantier = useMemo(() => chantiers.find(c => c.id === chantierId), [chantiers, chantierId]);
  const commentaires = useMemo(() => getCommentairesByChantier(chantierId), [chantierId, getCommentairesByChantier]);

  // =========================================
  // RÉCUPÉRER LES POINTS NC NON VALIDÉS
  // =========================================
  const pointsNCNonValides = useMemo(() => {
    const points = [];
    const controlesChantier = controles.filter(c => c.chantier_id === chantierId);

    controlesChantier.forEach(ctrl => {
      const modele = modelesCQ.find(m => m.id === ctrl.modele_cq_id);
      if (!modele || !ctrl.resultats) return;

      Object.entries(ctrl.resultats).forEach(([categorieId, resultatsCategorie]) => {
        const categorie = modele.categories?.find(c => c.id === categorieId);
        if (!categorie) return;

        Object.entries(resultatsCategorie).forEach(([sousCategorieId, resultatsSousCategorie]) => {
          const sousCategorie = categorie.sousCategories?.find(sc => sc.id === sousCategorieId);
          if (!sousCategorie) return;

          Object.entries(resultatsSousCategorie).forEach(([pointControleId, resultatPoint]) => {
            if (resultatPoint.resultat === 'NC' && !resultatPoint.repriseValidee) {
              const pointControle = sousCategorie.pointsControle?.find(pc => pc.id === pointControleId);
              if (pointControle) {
                points.push({
                  ...resultatPoint,
                  pointControleId,
                  libelle: pointControle.libelle,
                  modeleTitre: modele.titre,
                  categorieNom: categorie.nom,
                  sousCategorieNom: sousCategorie.nom,
                  controleId: ctrl.id,
                  modeleId: modele.id,
                  categorieId,
                  sousCategorieId,
                });
              }
            }
          });
        });
      });
    });

    return points.sort((a, b) => {
      const dateA = a.dateReprisePrevisionnelle ? parseISO(a.dateReprisePrevisionnelle) : new Date(0);
      const dateB = b.dateReprisePrevisionnelle ? parseISO(b.dateReprisePrevisionnelle) : new Date(0);
      return dateA - dateB;
    });
  }, [controles, modelesCQ, chantierId]);

  // =========================================
  // GESTION DES COMMENTAIRES
  // =========================================
  const handleOpenCommentaireModal = (commentaire = null) => {
    if (commentaire) {
      setEditingCommentaire({
        id: commentaire.id,
        titre: commentaire.titre,
        texte: commentaire.texte
      });
    } else {
      setEditingCommentaire({
        id: null,
        titre: '',
        texte: ''
      });
    }
    setIsCommentaireModalOpen(true);
  };

  const handleCloseCommentaireModal = () => {
    setIsCommentaireModalOpen(false);
    setEditingCommentaire(null);
  };

  const handleSaveCommentaire = async () => {
    if (!editingCommentaire) return;
    
    if (!editingCommentaire.titre.trim() || !editingCommentaire.texte.trim()) {
      alert('Veuillez remplir le titre et le texte');
      return;
    }

    try {
      if (editingCommentaire.id) {
        await updateCommentaire(editingCommentaire.id, {
          titre: editingCommentaire.titre,
          texte: editingCommentaire.texte
        });
      } else {
        await addCommentaire(
          chantierId, 
          editingCommentaire.titre.trim(), 
          editingCommentaire.texte.trim()
        );
      }
      handleCloseCommentaireModal();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du commentaire:', error);
      alert('Erreur lors de la sauvegarde du commentaire');
    }
  };

  const handleDeleteCommentaire = async (commentaireId) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce commentaire ?")) {
      try {
        await deleteCommentaire(commentaireId);
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        alert('Erreur lors de la suppression du commentaire');
      }
    }
  };

  const handleTogglePrisEnCompte = async (commentaireId) => {
    try {
      await togglePrisEnCompte(commentaireId);
    } catch (error) {
      console.error('Erreur lors du toggle:', error);
      alert('Erreur lors de la mise à jour');
    }
  };

  // =========================================
  // ✅ VALIDATION REPRISE NC
  // =========================================
  const handleValiderReprise = async (pointNC) => {
    try {
      const controle = controles.find(c => c.id === pointNC.controleId);
      if (!controle) {
        alert('Contrôle non trouvé');
        return;
      }

      const updatedResultats = { ...controle.resultats };
      if (updatedResultats[pointNC.categorieId]?.[pointNC.sousCategorieId]?.[pointNC.pointControleId]) {
        // ✅ Passer en CONFORME + garder l'historique
        updatedResultats[pointNC.categorieId][pointNC.sousCategorieId][pointNC.pointControleId] = {
          ...updatedResultats[pointNC.categorieId][pointNC.sousCategorieId][pointNC.pointControleId],
          resultat: 'C', // ✅ Passe en Conforme
          repriseValidee: true
        };
      }

      await saveControleFromModele(
        chantierId, 
        pointNC.modeleId, 
        updatedResultats, 
        controle.points_specifiques || {}
      );

    } catch (error) {
      console.error('Erreur lors de la validation de la reprise:', error);
      alert('Erreur lors de la validation de la reprise');
    }
  };

  // =========================================
  // FORMATAGE DES DATES
  // =========================================
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try { 
      return format(parseISO(dateString), 'dd MMM yyyy HH:mm', { locale: fr }); 
    } catch (error) { 
      return 'Date invalide'; 
    }
  };
  
  const formatDateOnly = (dateString) => {
    if (!dateString) return 'N/A';
    try { 
      return format(parseISO(dateString), 'dd MMM yyyy', { locale: fr }); 
    } catch (error) { 
      return 'Date invalide'; 
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try { 
      return format(parseISO(dateString), 'dd/MM/yyyy HH:mm', { locale: fr }); 
    } catch (error) { 
      return 'Date invalide'; 
    }
  };

  if (loadingCommentaires && !isEmbedded) {
    return <div className="flex justify-center items-center h-64">Chargement...</div>;
  }

  if (!chantier && !isEmbedded) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-bold">Chantier non trouvé</h2>
        <Button asChild className="mt-4">
          <Link to="/chantiers"><ArrowLeft className="mr-2 h-4 w-4" />Retour</Link>
        </Button>
      </div>
    );
  }

  const pageHeader = !isEmbedded ? (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
      <div>
        <Button variant="outline" size="sm" asChild className="mb-2">
          <Link to={`/chantiers/${chantierId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour au chantier
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Commentaires et Suivi des Non-Conformités</h1>
        <p className="text-muted-foreground">{chantier?.nom}</p>
      </div>
    </div>
  ) : null;

  return (
    <div className={`space-y-6 ${isEmbedded ? 'py-0' : ''}`}>
      {pageHeader}

      {/* SECTION NON-CONFORMITÉS */}
      <Card className={isEmbedded ? 'shadow-none border-0' : ''}>
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5 text-red-500" /> 
            Non-Conformités à traiter
          </CardTitle>
          <CardDescription>
            Liste des points de contrôle marqués "Non Conforme" et dont la reprise n'est pas encore validée.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pointsNCNonValides.length > 0 ? (
            <ul className="space-y-3">
              {pointsNCNonValides.map((pnc, idx) => (
                <li key={`${pnc.modeleId}-${pnc.pointControleId}-${idx}`} className={`p-3 border rounded-md ${
                  pnc.artisan_repris ? 'bg-yellow-50 border-yellow-300' : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-sm text-red-700">{pnc.libelle}</p>
                      <p className="text-xs text-slate-500">
                        {pnc.modeleTitre} &gt; {pnc.categorieNom} &gt; {pnc.sousCategorieNom}
                      </p>
                      {pnc.explicationNC && (
                        <p className="text-xs text-slate-600 mt-1">
                          Explication: {pnc.explicationNC}
                        </p>
                      )}
                      {/* Statut artisan repris */}
                      {pnc.artisan_repris && (
                        <p className="text-xs text-yellow-700 mt-1 font-medium bg-yellow-100 px-2 py-1 rounded inline-block">
                          ✅ Reprise marquée par l'artisan le {formatDateTime(pnc.artisan_repris_date)}
                        </p>
                      )}
                    </div>
                    
                    {/* ✅ CHECKBOX VALIDATION au lieu du bouton Edit */}
                    <div className="flex items-center space-x-2 ml-3">
                      <Checkbox
                        id={`valider-${pnc.modeleId}-${pnc.pointControleId}`}
                        checked={false}
                        onCheckedChange={() => handleValiderReprise(pnc)}
                      />
                      <Label 
                        htmlFor={`valider-${pnc.modeleId}-${pnc.pointControleId}`}
                        className="text-xs font-medium text-green-700 cursor-pointer"
                      >
                        Valider
                      </Label>
                    </div>
                  </div>

                  {/* Photos reprise artisan */}
                  {pnc.artisan_repris_photos && pnc.artisan_repris_photos.length > 0 && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-xs font-medium text-green-700 mb-1">📸 Photos de reprise (artisan) :</p>
                      <div className="flex gap-2 flex-wrap">
                        {pnc.artisan_repris_photos.map((photo, i) => (
                          <img 
                            key={i} 
                            src={photo.url || photo} 
                            alt={`Reprise ${i+1}`}
                            className="h-16 w-16 object-cover rounded border cursor-pointer hover:opacity-80"
                            onClick={() => window.open(photo.url || photo, '_blank')}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Commentaire reprise artisan */}
                  {pnc.artisan_repris_commentaire && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-xs font-medium text-green-700 mb-1">💬 Commentaire reprise (artisan) :</p>
                      <p className="text-sm text-green-800">{pnc.artisan_repris_commentaire}</p>
                    </div>
                  )}

                  <div className="mt-2 pt-2 border-t border-red-100 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="font-medium text-slate-600">Reprise au plus tard: </span> 
                        {pnc.dateReprisePrevisionnelle ? (
                          formatDateOnly(pnc.dateReprisePrevisionnelle)
                        ) : (
                          <span className="italic text-slate-400">Non déf.</span>
                        )}
                      </div>
                      <div>
                        <span className="font-medium text-slate-600">Statut: </span> 
                        {pnc.artisan_repris ? (
                          <span className="text-yellow-600 font-semibold">En attente validation</span>
                        ) : (
                          <span className="text-red-600 font-semibold">À reprendre</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Artisan concerné */}
                    {pnc.soustraitant_id && (
                      <div className="text-xs">
                        <span className="font-medium text-slate-600">Artisan concerné: </span>
                        <span className="text-orange-700 font-medium">
                          {sousTraitants.find(st => st.id === pnc.soustraitant_id)?.nomsocieteST || 
                          `${sousTraitants.find(st => st.id === pnc.soustraitant_id)?.PrenomST} ${sousTraitants.find(st => st.id === pnc.soustraitant_id)?.nomST}` ||
                          'Inconnu'}
                        </span>
                      </div>
                    )}
                    
                    {/* Date intervention artisan */}
                    {pnc.date_intervention_artisan && (
                      <div className="text-xs">
                        <span className="font-medium text-slate-600">Intervention prévue le: </span>
                        <span className="text-blue-700 font-medium">{formatDateOnly(pnc.date_intervention_artisan)}</span>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              Aucune non-conformité en attente de reprise pour ce chantier. Bravo !
            </p>
          )}
        </CardContent>
      </Card>

      {/* SECTION COMMENTAIRES */}
      <Card className={isEmbedded ? 'shadow-none border-0 mt-4' : 'mt-6'}>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-xl flex items-center">
                <MessageSquare className="mr-2 h-5 w-5 text-primary" /> 
                Journal des Commentaires
              </CardTitle>
              <CardDescription>
                Suivez les discussions et notes importantes relatives à ce chantier.
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenCommentaireModal()}>
              <Plus className="mr-2 h-4 w-4" /> Ajouter un commentaire
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {commentaires.length > 0 ? (
            <ul className="space-y-3">
              {commentaires.map(commentaire => (
                <li 
                  key={commentaire.id} 
                  className={`p-3 border rounded-md ${
                    commentaire.pris_en_compte 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-sm text-slate-800">{commentaire.titre}</h4>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap mt-1">
                        {commentaire.texte}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        Par {commentaire.auteur} - {formatDate(commentaire.date)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleOpenCommentaireModal(commentaire)} 
                        className="h-7 w-7 text-slate-500 hover:text-slate-700"
                      >
                        <Edit2 size={14} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDeleteCommentaire(commentaire.id)} 
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 size={14} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleTogglePrisEnCompte(commentaire.id)} 
                        className={`h-7 w-7 ${
                          commentaire.pris_en_compte 
                            ? 'text-green-600 hover:text-green-700' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        <CheckSquare size={16} />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              Aucun commentaire pour ce chantier pour le moment.
            </p>
          )}
        </CardContent>
      </Card>

      {/* MODALE COMMENTAIRE (Création / Édition) */}
      {isCommentaireModalOpen && editingCommentaire && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4"
          onClick={handleCloseCommentaireModal}
        >
          <Card className="w-full max-w-md z-50" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>
                {editingCommentaire.id ? 'Modifier le commentaire' : 'Nouveau commentaire'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="commentaire-titre">Titre</Label>
                <Input
                  id="commentaire-titre"
                  value={editingCommentaire.titre}
                  onChange={(e) => setEditingCommentaire(prev => ({ 
                    ...prev, 
                    titre: e.target.value 
                  }))}
                  placeholder="Sujet du commentaire..."
                />
              </div>
              <div>
                <Label htmlFor="commentaire-texte">Commentaire</Label>
                <Textarea
                  id="commentaire-texte"
                  rows={4}
                  value={editingCommentaire.texte}
                  onChange={(e) => setEditingCommentaire(prev => ({ 
                    ...prev, 
                    texte: e.target.value 
                  }))}
                  placeholder="Ajouter un commentaire détaillé..."
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={handleCloseCommentaireModal}>
                  Annuler
                </Button>
                <Button onClick={handleSaveCommentaire}>
                  <Send className="mr-2 h-4 w-4" /> 
                  {editingCommentaire.id ? 'Enregistrer' : 'Ajouter'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}