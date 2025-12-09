import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useChantier } from '@/context/ChantierContext.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChantierCard } from '@/components/ChantierCard.jsx';
import { ChantierForm } from '@/components/ChantierForm.jsx';
import { Plus, Search, Filter, LayoutGrid, List, HardHat } from 'lucide-react';

export function ChantiersList() {
  const { chantiers, loading } = useChantier();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('statut') || '');
  const [isDialogOpen, setIsDialogOpen] = useState(searchParams.get('action') === 'new');
  const [viewMode, setViewMode] = useState('grid');

  useEffect(() => {
    const statutParam = searchParams.get('statut');
    if (statutParam) setStatusFilter(statutParam);

    setIsDialogOpen(searchParams.get('action') === 'new');
  }, [searchParams]);

  const handleStatusFilterChange = (value) => {
    setStatusFilter(value);
    setSearchParams(value ? { statut: value } : {});
  };

  const handleOpenDialog = () => {
    setSearchParams({ action: 'new' });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);

    const currentParams = Object.fromEntries([...searchParams]);
    delete currentParams.action;
    setSearchParams(currentParams);
  };

  const filteredChantiers = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();

    return chantiers
      .filter((chantier) => {
        const matchesSearch =
          // ✅ CORRIGÉ : nomchantier au lieu de nom
          chantier.nomchantier?.toLowerCase().includes(searchLower) ||
          chantier.adresse?.toLowerCase().includes(searchLower) ||
          // ✅ CORRIGÉ : client_prenom, client_nom avec underscore
          `${chantier.client_prenom || ''} ${chantier.client_nom || ''}`
            .toLowerCase()
            .includes(searchLower) ||
          // ✅ CORRIGÉ : client_mail, client_tel avec underscore
          chantier.client_mail?.toLowerCase().includes(searchLower) ||
          chantier.client_tel?.toLowerCase().includes(searchLower);

        const matchesStatus = !statusFilter || chantier.statut === statusFilter;

        return matchesSearch && matchesStatus;
      })
      // ✅ CORRIGÉ : nomchantier au lieu de nom pour le tri
      .sort((a, b) => (a.nomchantier || '').localeCompare(b.nomchantier || ''));
  }, [chantiers, searchTerm, statusFilter]);

  if (loading) {
    return <div className="flex justify-center items-center h-64">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Chantiers</h1>
          <p className="text-muted-foreground">Gérez tous vos chantiers de construction</p>
        </div>
        <Button onClick={handleOpenDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau chantier
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher (nom, client, adresse...)"
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="w-full sm:w-[200px]">
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger>
              <div className="flex items-center">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Tous les statuts" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tous les statuts</SelectItem>
              <SelectItem value="Planifié">Planifié</SelectItem>
              <SelectItem value="En cours">En cours</SelectItem>
              <SelectItem value="Réceptionné">Réceptionné</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-1">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('grid')}
            title="Vue Grille"
          >
            <LayoutGrid className="h-5 w-5" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('list')}
            title="Vue Liste"
          >
            <List className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {filteredChantiers.length > 0 ? (
        <motion.div
          className={viewMode === 'grid' ? 'grid gap-6 md:grid-cols-2 lg:grid-cols-3' : 'space-y-4'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.05 }}
        >
          {filteredChantiers.map((chantier) => (
            <ChantierCard key={chantier.id} chantier={chantier} />
          ))}
        </motion.div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-3 mb-4">
            <HardHat className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">Aucun chantier trouvé</h3>
          <p className="text-muted-foreground mt-1 mb-4">
            {searchTerm || statusFilter
              ? 'Aucun chantier ne correspond à vos critères de recherche.'
              : 'Commencez par créer votre premier chantier.'}
          </p>

          {!searchTerm && !statusFilter && (
            <Button onClick={handleOpenDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Créer un chantier
            </Button>
          )}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="sm:max-w-[700px] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-xl">Créer un nouveau chantier</DialogTitle>
          </DialogHeader>
          <div className="p-6 max-h-[80vh] overflow-y-auto">
            <ChantierForm onSuccess={handleCloseDialog} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}