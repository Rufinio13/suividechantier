import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useChantier } from '@/context/ChantierContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, MessageSquare, Send, AlertTriangle, CalendarCheck, Edit2, Trash2, CheckSquare } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

export function ChantierCommentaires({ isEmbedded = false, embeddedChantierId = null }) {
  const params = useParams();
  const chantierId = isEmbedded ? embeddedChantierId : params.id;

  const { 
    chantiers, 
    modelesCQ, 
    controles, 
    addCommentaireChantier, 
    updateCommentaireChantier,
    updatePointControleReprise,
    deleteCommentaireChantier,
    toggleCommentairePrisEnCompte,
    loading 
  } = useChantier();

  const [nouveauCommentaireTitre, setNouveauCommentaireTitre] = useState('');
  const [nouveauCommentaireTexte, setNouveauCommentaireTexte] = useState('');
  const [editingReprise, setEditingReprise] = useState(null);
  const [editingCommentaire, setEditingCommentaire] = useState(null);

  const chantier = useMemo(() => chantiers.find(c => c.id === chantierId), [chantiers, chantierId]);
  const commentaires = useMemo(() => chantier?.commentaires?.sort((a, b) => new Date(b.date) - new Date(a.date)) || [], [chantier]);

  const pointsNCNonValides = useMemo(() => {
    const points = [];
    const controlesModeleChantier = controles.filter(c => c.chantierId === chantierId && c.type === 'modele');

    controlesModeleChantier.forEach(ctrl => {
      const modele = modelesCQ.find(m => m.id === ctrl.modeleCQId);
      if (!modele || !ctrl.resultats) return;

      Object.entries(ctrl.resultats).forEach(([domaineId, resultatsDomaine]) => {
        const domaine = modele.domaines.find(d => d.id === domaineId);
        if (!domaine) return;

        Object.entries(resultatsDomaine).forEach(([sousCategorieId, resultatsSousCategorie]) => {
          const sousCategorie = domaine.sousCategories.find(sc => sc.id === sousCategorieId);
          if (!sousCategorie) return;

          Object.entries(resultatsSousCategorie).forEach(([pointControleId, resultatPoint]) => {
            if (resultatPoint.resultat === 'NC' && !resultatPoint.repriseValidee) {
              const pointControle = sousCategorie.pointsControle.find(pc => pc.id === pointControleId);
              if (pointControle) {
                points.push({
                  ...resultatPoint,
                  pointControleId,
                  libelle: pointControle.libelle,
                  modeleTitre: modele.titre,
                  domaineNom: domaine.nom,
                  sousCategorieNom: sousCategorie.nom,
                  modeleId: modele.id,
                  domaineId,
                  sousCategorieId,
                });
              }
            }
          });
        });
      });
    });
    return points.sort((a,b) => {
        const dateA = a.dateReprisePrevisionnelle ? parseISO(a.dateReprisePrevisionnelle) : new Date(0);
        const dateB = b.dateReprisePrevisionnelle ? parseISO(b.dateReprisePrevisionnelle) : new Date(0);
        return dateA - dateB;
    });
  }, [controles, modelesCQ, chantierId]);

  const handleAddCommentaire = () => {
    if (nouveauCommentaireTitre.trim() && nouveauCommentaireTexte.trim()) {
      addCommentaireChantier(chantierId, nouveauCommentaireTitre.trim(), nouveauCommentaireTexte.trim());
      setNouveauCommentaireTitre('');
      setNouveauCommentaireTexte('');
    }
  };

  const handleDeleteCommentaire = (commentaireId) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce commentaire ?")) {
      deleteCommentaireChantier(chantierId, commentaireId);
    }
  };

  const handleTogglePrisEnCompte = (commentaireId) => {
    toggleCommentairePrisEnCompte(chantierId, commentaireId);
  };

  const handleOpenEditCommentaire = (commentaire) => { 
    setEditingCommentaire({ id: commentaire.id, titre: commentaire.titre, texte: commentaire.texte });
  };

  const handleSaveCommentaire = () => { 
    if (!editingCommentaire) return;
    updateCommentaireChantier(chantierId, editingCommentaire.id, {
      titre: editingCommentaire.titre,
      texte: editingCommentaire.texte
    });
    setEditingCommentaire(null);
  };

  const handleEditReprise = (pointNC) => {
    setEditingReprise({
      modeleId: pointNC.modeleId,
      domaineId: pointNC.domaineId,
      sousCategorieId: pointNC.sousCategorieId,
      pointControleId: pointNC.pointControleId,
      data: {
        dateReprisePrevisionnelle: pointNC.dateReprisePrevisionnelle || '',
        repriseValidee: pointNC.repriseValidee || false,
      }
    });
  };

  const handleSaveReprise = () => {
    if (!editingReprise) return;
    updatePointControleReprise(
      chantierId,
      editingReprise.modeleId,
      editingReprise.domaineId,
      editingReprise.sousCategorieId,
      editingReprise.pointControleId,
      editingReprise.data
    );
    setEditingReprise(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try { return format(parseISO(dateString), 'dd MMM yyyy HH:mm', { locale: fr }); }
    catch (error) { return 'Date invalide'; }
  };
  
  const formatDateOnly = (dateString) => {
    if (!dateString) return 'N/A';
    try { return format(parseISO(dateString), 'dd MMM yyyy', { locale: fr }); }
    catch (error) { return 'Date invalide'; }
  };


  if (loading && !isEmbedded) {
    return <div className="flex justify-center items-center h-64">Chargement...</div>;
  }
  if (!chantier && !isEmbedded) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-bold">Chantier non trouvé</h2>
        <Button asChild className="mt-4"><Link to="/chantiers"><ArrowLeft className="mr-2 h-4 w-4" />Retour</Link></Button>
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

      <Card className={isEmbedded ? 'shadow-none border-0' : ''}>
        <CardHeader>
          <CardTitle className="text-xl flex items-center"><AlertTriangle className="mr-2 h-5 w-5 text-red-500" /> Non-Conformités à traiter</CardTitle>
          <CardDescription>Liste des points de contrôle marqués "Non Conforme" et dont la reprise n'est pas encore validée.</CardDescription>
        </CardHeader>
        <CardContent>
          {pointsNCNonValides.length > 0 ? (
            <ul className="space-y-3">
              {pointsNCNonValides.map(pnc => (
                <li key={`${pnc.modeleId}-${pnc.pointControleId}`} className="p-3 border rounded-md bg-red-50 border-red-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm text-red-700">{pnc.libelle}</p>
                      <p className="text-xs text-slate-500">
                        {pnc.modeleTitre} &gt; {pnc.domaineNom} &gt; {pnc.sousCategorieNom}
                      </p>
                      {pnc.explicationNC && <p className="text-xs text-slate-600 mt-1">Explication: {pnc.explicationNC}</p>}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleEditReprise(pnc)} className="h-7 w-7 text-slate-500 hover:text-slate-700">
                      <Edit2 size={14} />
                    </Button>
                  </div>
                  <div className="mt-2 pt-2 border-t border-red-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                        <span className="font-medium text-slate-600">Reprise Prév.: </span> 
                        {formatDateOnly(pnc.dateReprisePrevisionnelle) || <span className="italic text-slate-400">Non déf.</span>}
                    </div>
                    <div>
                        <span className="font-medium text-slate-600">Validée: </span> 
                        {pnc.repriseValidee ? <span className="text-green-600 font-semibold">Oui</span> : <span className="text-red-600 font-semibold">Non</span>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-center py-4">Aucune non-conformité en attente de reprise pour ce chantier. Bravo !</p>
          )}
        </CardContent>
      </Card>

      {editingReprise && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4" onClick={() => setEditingReprise(null)}>
            <Card className="w-full max-w-md z-50" onClick={(e) => e.stopPropagation()}>
                <CardHeader>
                    <CardTitle>Mettre à jour la reprise</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label htmlFor="edit-dateReprisePrevisionnelle">Date de reprise prévisionnelle</Label>
                        <Input 
                            id="edit-dateReprisePrevisionnelle"
                            type="date" 
                            value={editingReprise.data.dateReprisePrevisionnelle}
                            onChange={(e) => setEditingReprise(prev => ({...prev, data: {...prev.data, dateReprisePrevisionnelle: e.target.value}}))}
                        />
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="edit-repriseValidee"
                            checked={editingReprise.data.repriseValidee}
                            onCheckedChange={(checked) => setEditingReprise(prev => ({...prev, data: {...prev.data, repriseValidee: checked}}))}
                        />
                        <Label htmlFor="edit-repriseValidee">Reprise validée</Label>
                    </div>
                    <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setEditingReprise(null)}>Annuler</Button>
                        <Button onClick={handleSaveReprise}><CalendarCheck className="mr-2 h-4 w-4" /> Enregistrer Reprise</Button>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
      )}


      <Card className={isEmbedded ? 'shadow-none border-0 mt-4' : 'mt-6'}>
        <CardHeader>
          <CardTitle className="text-xl flex items-center"><MessageSquare className="mr-2 h-5 w-5 text-primary" /> Journal des Commentaires</CardTitle>
          <CardDescription>Suivez les discussions et notes importantes relatives à ce chantier.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="commentaire-titre">Titre du commentaire</Label>
              <Input 
                id="commentaire-titre"
                value={nouveauCommentaireTitre}
                onChange={(e) => setNouveauCommentaireTitre(e.target.value)}
                placeholder="Sujet du commentaire..."
              />
              <Label htmlFor="commentaire-texte">Commentaire</Label>
              <Textarea
                id="commentaire-texte"
                value={nouveauCommentaireTexte}
                onChange={(e) => setNouveauCommentaireTexte(e.target.value)}
                placeholder="Ajouter un commentaire détaillé..."
                rows={3}
              />
              <Button onClick={handleAddCommentaire} disabled={!nouveauCommentaireTitre.trim() || !nouveauCommentaireTexte.trim()}>
                <Send className="mr-2 h-4 w-4" /> Ajouter le commentaire
              </Button>
            </div>
            {commentaires.length > 0 ? (
              <ul className="space-y-3">
                {commentaires.map(commentaire => (
                  <li key={commentaire.id} className={`p-3 border rounded-md ${commentaire.prisEnCompte ? 'bg-green-50 border-green-200' : 'bg-slate-50'}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-sm text-slate-800">{commentaire.titre}</h4>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap mt-1">{commentaire.texte}</p>
                        <p className="text-xs text-muted-foreground mt-1.5">
                          Par {commentaire.auteur} - {formatDate(commentaire.date)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEditCommentaire(commentaire)} className="h-7 w-7 text-slate-500 hover:text-slate-700">
                          <Edit2 size={14} />
                        </Button><Button variant="ghost" size="icon" onClick={() => handleDeleteCommentaire(commentaire.id)} className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10">
                          <Trash2 size={14} />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleTogglePrisEnCompte(commentaire.id)} className={`h-7 w-7 ${commentaire.prisEnCompte ? 'text-green-600 hover:text-green-700' : 'text-slate-500 hover:text-slate-700'}`}>
                          <CheckSquare size={16} />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-center py-4">Aucun commentaire pour ce chantier pour le moment.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ✅ Modale édition commentaire */}
      {editingCommentaire && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4"
          onClick={() => setEditingCommentaire(null)}>
          <Card className="w-full max-w-md z-50" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>Modifier le commentaire</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="edit-commentaire-titre">Titre</Label>
                <Input
                  id="edit-commentaire-titre"
                  value={editingCommentaire.titre}
                  onChange={(e) => setEditingCommentaire(prev => ({ ...prev, titre: e.target.value }))}
                  placeholder="Sujet du commentaire..."
                />
              </div>
              <div>
                <Label htmlFor="edit-commentaire-texte">Commentaire</Label>
                <Textarea
                  id="edit-commentaire-texte"
                  rows={4}
                  value={editingCommentaire.texte}
                  onChange={(e) => setEditingCommentaire(prev => ({ ...prev, texte: e.target.value }))}
                  placeholder="Modifier le contenu du commentaire…"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setEditingCommentaire(null)}>Annuler</Button>
                <Button onClick={handleSaveCommentaire}>
                  <Send className="mr-2 h-4 w-4" /> Enregistrer
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}