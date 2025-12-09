import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { useLots } from "@/context/LotsContext.jsx";
import { LotForm } from "@/components/LotForm.jsx";
import { LotCard } from "@/components/LotCard.jsx";

export function LotsList() {
  const { lots = [], loading, deleteLot } = useLots();
  const [search, setSearch] = useState("");
  const [editingLot, setEditingLot] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = (lot = null) => {
    setEditingLot(lot);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingLot(null);
    setIsModalOpen(false);
  };

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return (lots ?? []).filter(
      l =>
        l.lot?.toLowerCase().includes(term) ||
        l.description?.toLowerCase().includes(term) ||
        l.nomsociete?.toLowerCase().includes(term)
    );
  }, [lots, search]);

  if (loading) {
    return <div className="h-64 flex items-center justify-center">Chargement des lots…</div>;
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <h1 className="text-3xl font-bold">Lots</h1>
        <Button onClick={() => openModal()}>
          <Plus className="mr-2 h-4 w-4" /> Nouveau lot
        </Button>
      </div>

      {/* Recherche */}
      <div className="relative max-w-md">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un lot..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">Aucun lot trouvé</div>
      ) : (
        <motion.div
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.05 }}
        >
          {filtered.map(lot => (
            <LotCard
              key={lot.id}
              lot={lot}
              onEdit={() => openModal(lot)}
              onDelete={() => deleteLot(lot.id)}
            />
          ))}
        </motion.div>
      )}

      {/* Modal Création / Edition */}
      {isModalOpen && (
        <LotForm
          initialData={editingLot}
          onClose={closeModal}
          onSuccess={() => {
            closeModal();
          }}
        />
      )}
    </div>
  );
}
