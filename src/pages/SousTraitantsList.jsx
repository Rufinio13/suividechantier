import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Edit, Trash2, Building2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useSousTraitant } from "@/context/SousTraitantContext.jsx";
import { SousTraitantForm } from "@/components/SoustraitantForm.jsx";
import { useAuth } from "@/hooks/useAuth.jsx";
import { useToast } from "@/components/ui/use-toast";
import { isGerant } from "@/lib/postes";
import { PastilleConformite } from "@/components/attestations/PastilleConformite.jsx";

export function SousTraitantsList() {
  const { sousTraitants = [], loading, deleteSousTraitant, getConformite } = useSousTraitant();
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const peutSupprimer = isGerant(profile);

  const handleDelete = async (st) => {
    if (!window.confirm(`Supprimer ${st.nomsocieteST || "cet artisan"} ?\n\nSes marchés, documents, notifications et indisponibilités seront définitivement supprimés. Ses tâches et SAV resteront dans le planning, sans artisan assigné.`)) return;
    try {
      await deleteSousTraitant(st.id);
      toast({ title: "Artisan supprimé ✅" });
    } catch (error) {
      toast({ title: "Suppression impossible", description: error.message, variant: "destructive" });
    }
  };
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const ouvrirFiche = (st) => navigate(`/sous-traitants/${st.id}`);

  // Après création : ouvrir la fiche et proposer la création du compte
  const handleArtisanCreated = (artisan) => {
    navigate(`/sous-traitants/${artisan.id}`, { state: { proposerCompte: true } });
  };

  // ✅ Filtre + tri alphabétique
  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return (sousTraitants ?? [])
      .filter(
        st =>
          st.nomsocieteST?.toLowerCase().includes(term) ||
          st.nomST?.toLowerCase().includes(term) ||
          st.PrenomST?.toLowerCase().includes(term) ||
          st.email?.toLowerCase().includes(term) ||
          st.telephone?.toLowerCase().includes(term)
      )
      .sort((a, b) => (a.nomsocieteST || "").localeCompare(b.nomsocieteST || "")); // ✅ Tri A-Z
  }, [sousTraitants, search]);

  if (loading) {
    return <div className="flex justify-center items-center h-64">Chargement des sous-traitants...</div>;
  }

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Sous-Traitants</h1>
          <p className="text-muted-foreground">Gérez les sous-traitants de votre société</p>
        </div>

        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau sous-traitant
        </Button>
      </div>

      {/* RECHERCHE */}
      <div className="relative max-w-md">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un sous-traitant..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* LISTE */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          Aucun sous-traitant trouvé.
        </div>
      ) : (
        <motion.div
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.05 }}
        >
          {filtered.map(st => {
            const nomComplet = `${st.PrenomST || ""} ${st.nomST || ""}`.trim();
            return (
              <Card key={st.id} onClick={() => ouvrirFiche(st)} className="h-full w-full flex flex-col cursor-pointer hover:shadow-md transition border rounded-2xl overflow-hidden">
                <CardHeader className="pb-3 flex justify-between items-start gap-2">
                  <CardTitle className="text-lg font-bold min-w-0 flex items-center gap-2">
                    <span className="truncate" title={st.nomsocieteST}>{st.nomsocieteST}</span>
                    <PastilleConformite conformite={getConformite(st.id)} />
                  </CardTitle>
                  <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Voir son espace"
                      onClick={() => window.open(`/apercu-artisan/${st.id}`, '_blank')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" title="Modifier" onClick={() => ouvrirFiche(st)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    {peutSupprimer && (
                      <Button size="icon" variant="ghost" title="Supprimer (gérant)" onClick={() => handleDelete(st)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="flex-grow space-y-2.5 text-sm">
                  {nomComplet && (
                    <p className="text-muted-foreground truncate" title={nomComplet}>{nomComplet}</p>
                  )}
                  {st.email && <p className="truncate" title={st.email}>Email : {st.email}</p>}
                  {st.telephone && <p className="truncate" title={st.telephone}>Tél : {st.telephone}</p>}
                  {(st.adresseST || st.ville) && (() => {
                    const adresse = [st.adresseST, `${st.code_postal || ""} ${st.ville || ""}`.trim()].filter(Boolean).join(", ");
                    return <p className="truncate" title={adresse}>Adresse : {adresse}</p>;
                  })()}
                  {st.assigned_lots?.length > 0 && (
                    <p className="break-words">
                      <strong>Lots :</strong> {st.assigned_lots.join(", ")}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </motion.div>
      )}

      {/* MODAL CRÉATION */}
      {isModalOpen && (
        <SousTraitantForm
          onClose={() => setIsModalOpen(false)}
          onCreated={handleArtisanCreated}
        />
      )}
    </div>
  );
}