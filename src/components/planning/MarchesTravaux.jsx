import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Briefcase, CheckCircle, Clock, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useChantier } from '@/context/ChantierContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export function MarchesTravaux({ chantierId }) {
  const { toast } = useToast();
  const { lots = [], sousTraitants = [] } = useChantier();
  const [marches, setMarches] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ Charger les marchés de travaux avec les documents
  const fetchMarches = async () => {
    try {
      setLoading(true);
      
      // Récupérer tous les documents de type marche_travaux pour ce chantier
      const { data: documents, error: docError } = await supabase
        .from('documents_chantier')
        .select('*')
        .eq('chantier_id', chantierId)
        .eq('type_document', 'marche_travaux');

      if (docError) throw docError;

      // Récupérer les marchés de travaux
      const { data: marchesData, error: marcheError } = await supabase
        .from('marches_travaux')
        .select('*')
        .eq('chantier_id', chantierId);

      if (marcheError) throw marcheError;

      // Fusionner les données : ajouter les infos du document aux marchés
      const marchesAvecDocs = (marchesData || []).map(marche => {
        const doc = documents?.find(d => d.id === marche.document_id);
        return {
          ...marche,
          signature_date: doc?.signature_artisan_date || null,
          signature_statut: doc?.signature_statut || null,
        };
      });

      setMarches(marchesAvecDocs);
    } catch (error) {
      console.error('Erreur chargement marchés:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les marchés de travaux',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (chantierId) {
      fetchMarches();
    }
  }, [chantierId]);

  // ✅ Créer une ligne par lot avec les infos du marché (si existe)
  const tableData = useMemo(() => {
    return lots.map(lot => {
      // Trouver le marché correspondant à ce lot
      const marche = marches.find(m => m.lot_id === lot.id);
      
      // Trouver l'artisan si marché existe
      const artisan = marche 
        ? sousTraitants.find(st => st.id === marche.soustraitant_id)
        : null;

      return {
        lotId: lot.id,
        lotNom: lot.nom || lot.lot,
        artisanNom: artisan 
          ? (artisan.nomsocieteST || `${artisan.PrenomST} ${artisan.nomST}`)
          : null,
        dateEnvoi: marche?.date_envoi || null,
        dateSignature: marche?.signature_date || null, // ✅ Depuis documents_chantier
        hasMarche: !!marche,
        estSigne: marche?.signature_statut === 'signe',
      };
    });
  }, [lots, marches, sousTraitants]);

  // ✅ Statistiques
  const stats = useMemo(() => {
    const total = tableData.length;
    const envoyes = tableData.filter(t => t.hasMarche).length;
    const signes = tableData.filter(t => t.estSigne).length;
    const enAttente = envoyes - signes;

    return { total, envoyes, signes, enAttente };
  }, [tableData]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <p className="text-muted-foreground">Chargement des marchés...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec statistiques */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Marchés de Travaux</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Suivi des marchés de travaux par lot
        </p>

        {/* Statistiques sous forme de cartes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Marchés envoyés</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.envoyes}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">En attente</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.enAttente}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Signés</p>
                  <p className="text-2xl font-bold text-green-600">{stats.signes}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tableau des marchés */}
      <Card>
        <CardHeader>
          <CardTitle>Détail par lot</CardTitle>
        </CardHeader>
        <CardContent>
          {tableData.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Aucun lot défini sur ce chantier
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium text-sm">Lot</th>
                    <th className="text-left p-3 font-medium text-sm">Artisan</th>
                    <th className="text-left p-3 font-medium text-sm">Date envoi</th>
                    <th className="text-left p-3 font-medium text-sm">Date signature</th>
                    <th className="text-left p-3 font-medium text-sm">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.map(row => (
                    <tr key={row.lotId} className="border-b hover:bg-muted/30 transition">
                      {/* Lot */}
                      <td className="p-3 font-medium">{row.lotNom}</td>

                      {/* Artisan */}
                      <td className="p-3">
                        {row.artisanNom ? (
                          <span className="text-sm">{row.artisanNom}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground italic">-</span>
                        )}
                      </td>

                      {/* Date envoi */}
                      <td className="p-3">
                        {row.dateEnvoi ? (
                          <span className="text-sm">
                            {format(new Date(row.dateEnvoi), 'dd/MM/yyyy', { locale: fr })}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </td>

                      {/* Date signature */}
                      <td className="p-3">
                        {row.dateSignature ? (
                          <span className="text-sm font-medium text-green-700">
                            {format(new Date(row.dateSignature), 'dd/MM/yyyy', { locale: fr })}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </td>

                      {/* Statut */}
                      <td className="p-3">
                        {!row.hasMarche && (
                          <Badge variant="outline" className="bg-gray-50 text-gray-600">
                            Non envoyé
                          </Badge>
                        )}
                        {row.hasMarche && !row.estSigne && (
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                            En attente
                          </Badge>
                        )}
                        {row.estSigne && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            ✓ Signé
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">💡 Comment ça fonctionne ?</p>
              <ul className="space-y-1 text-blue-800">
                <li>• Ajoutez un document de type "Marché de travaux" dans l'onglet Documents</li>
                <li>• Sélectionnez le lot et l'artisan concerné</li>
                <li>• Le marché apparaîtra automatiquement dans ce tableau avec la date d'envoi</li>
                <li>• Quand l'artisan signera le document, la date de signature sera remplie</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}