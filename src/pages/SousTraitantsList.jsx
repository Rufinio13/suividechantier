import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Edit, Trash2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useSousTraitant } from "@/context/SousTraitantContext.jsx";
import { SousTraitantForm } from "@/components/SoustraitantForm.jsx";
import { CreateArtisanAccountDialog } from "@/components/CreateArtisanAccountDialog.jsx"; // ✅ AJOUTÉ

export function SousTraitantsList() {
  const { sousTraitants = [], loading, deleteSousTraitant } = useSousTraitant();
  const [search, setSearch] = useState("");
  const [editingST, setEditingST] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // ✅ NOUVEAU : État pour le dialogue de création de compte
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [newlyCreatedArtisan, setNewlyCreatedArtisan] = useState(null);

  const openModal = (st = null) => {
    setEditingST(st);
    setIsModalOpen(true);
  };

  // ✅ NOUVEAU : Callback après création d'un artisan
  const handleArtisanCreated = (artisan) => {
    console.log('🎉 Artisan créé, proposition de compte:', artisan);
    setNewlyCreatedArtisan(artisan);
    setShowAccountDialog(true);
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
    <div className="space-y-6 p-4">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Sous-Traitants</h1>
          <p className="text-muted-foreground">Gérez les sous-traitants de votre société</p>
        </div>

        <Button onClick={() => openModal()}>
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
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.05 }}
        >
          {filtered.map(st => (
            <Card key={st.id} className="flex flex-col cursor-pointer hover:shadow-md transition border rounded-2xl">
              <CardHeader className="flex justify-between items-center">
                <CardTitle className="flex-1 flex justify-between items-center">
                  {st.nomsocieteST}
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openModal(st)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteSousTraitant(st.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>

              <CardContent className="text-sm space-y-1">
                {st.PrenomST || st.nomST ? (
                  <p className="text-muted-foreground">{st.PrenomST} {st.nomST}</p>
                ) : null}
                {st.email && <p>Email : {st.email}</p>}
                {st.telephone && <p>Tél : {st.telephone}</p>}
                {st.adresseST && <p>Adresse : {st.adresseST}</p>}
                {st.assigned_lots?.length > 0 && (
                  <p>
                    <strong>Lots assignés :</strong> {st.assigned_lots.join(", ")}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}

      {/* MODAL FORMULAIRE */}
      {isModalOpen && (
        <SousTraitantForm
          initialData={editingST}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => setIsModalOpen(false)}
          onArtisanCreated={handleArtisanCreated} // ✅ NOUVEAU : Callback
        />
      )}

      {/* ✅ NOUVEAU : DIALOGUE CRÉATION COMPTE */}
      {showAccountDialog && newlyCreatedArtisan && (
        <CreateArtisanAccountDialog
          artisan={newlyCreatedArtisan}
          isOpen={showAccountDialog}
          onClose={() => {
            setShowAccountDialog(false);
            setNewlyCreatedArtisan(null);
          }}
          onSuccess={() => {
            console.log('✅ Compte créé avec succès');
          }}
        />
      )}
    </div>
  );
}