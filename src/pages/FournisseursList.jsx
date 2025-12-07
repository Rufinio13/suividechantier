// src/components/FournisseursList.jsx
import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useFournisseur } from "@/context/FournisseurContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Box, Edit, Trash2 } from "lucide-react";
import { FournisseurForm } from "@/components/FournisseurForm";
import { FournisseurCard } from "@/components/FournisseurCard";

export function FournisseursList() {
  const { fournisseurs = [], loading, deleteFournisseur } = useFournisseur();

  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFournisseur, setEditingFournisseur] = useState(null);

  const handleOpenDialog = (fournisseur = null) => {
    setEditingFournisseur(fournisseur);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setEditingFournisseur(null);
    setIsDialogOpen(false);
  };

  const filteredFournisseurs = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return fournisseurs.filter((f) =>
      f.nomsocieteF?.toLowerCase().includes(searchLower) ||
      f.nomcontact?.toLowerCase().includes(searchLower) ||
      f.email?.toLowerCase().includes(searchLower) ||
      f.telephone?.toLowerCase().includes(searchLower) ||
      (f.assignedlots?.join(", ") || "").toLowerCase().includes(searchLower)
    );
  }, [fournisseurs, searchTerm]);

  if (loading) {
    return <div className="flex justify-center items-center h-64">Chargement...</div>;
  }

  return (
    <div className="space-y-6 p-4">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fournisseurs</h1>
          <p className="text-muted-foreground">Gérez vos fournisseurs</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" /> Nouveau fournisseur
        </Button>
      </div>

      {/* RECHERCHE */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher (nom, contact, email, lot...)"
          className="pl-8"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* LISTE */}
      {filteredFournisseurs.length > 0 ? (
        <motion.div
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.05 }}
        >
          {filteredFournisseurs.map((f) => (
            <FournisseurCard
              key={f.id}
              fournisseur={f}
              onEdit={() => handleOpenDialog(f)}
              onDelete={() => deleteFournisseur(f.id)}
            />
          ))}
        </motion.div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-3 mb-4">
            <Box className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">Aucun fournisseur trouvé</h3>
          <p className="text-muted-foreground mt-1 mb-4">
            {searchTerm
              ? "Aucun fournisseur ne correspond à vos critères de recherche."
              : "Commencez par créer votre premier fournisseur."}
          </p>
          {!searchTerm && (
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" /> Créer un fournisseur
            </Button>
          )}
        </div>
      )}

      {/* MODAL FORMULAIRE */}
      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="sm:max-w-[700px] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-xl">
              {editingFournisseur ? "Modifier fournisseur" : "Créer un nouveau fournisseur"}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 max-h-[80vh] overflow-y-auto">
            <FournisseurForm
              initialData={editingFournisseur}
              onSuccess={handleCloseDialog}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
