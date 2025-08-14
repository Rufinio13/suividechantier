import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChantier } from '@/context/ChantierContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';

export function ChantierForm({ chantier, onSuccess }) {
  const { addChantier, updateChantier } = useChantier();
  const navigate = useNavigate();
  const isEditing = !!chantier;

  const [formData, setFormData] = useState({
    nom: chantier?.nom || '',
    adresse: chantier?.adresse || '',
    statut: chantier?.statut || 'Planifié',
    description: chantier?.description || '',
    nomClient: chantier?.nomClient || '',
    prenomClient: chantier?.prenomClient || '',
    telClient: chantier?.telClient || '',
    mailClient: chantier?.mailClient || '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.nom || !formData.adresse || !formData.nomClient || !formData.prenomClient) {
      // Basic validation, can be improved
      alert("Veuillez remplir tous les champs obligatoires (Nom du chantier, Adresse, Nom et Prénom du client).");
      return;
    }

    if (isEditing) {
      updateChantier(chantier.id, formData);
    } else {
      const newChantier = addChantier(formData);
      navigate(`/chantiers/${newChantier.id}`);
    }

    if (onSuccess) onSuccess();
  };

  return (
    <motion.form 
      onSubmit={handleSubmit}
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="nom">Nom du chantier <span className="text-red-500">*</span></Label>
          <Input
            id="nom"
            name="nom"
            value={formData.nom}
            onChange={handleChange}
            placeholder="Ex: Rénovation Maison Dupont"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="adresse">Adresse du chantier <span className="text-red-500">*</span></Label>
          <Input
            id="adresse"
            name="adresse"
            value={formData.adresse}
            onChange={handleChange}
            placeholder="123 Rue Principale, Ville"
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="nomClient">Nom du client <span className="text-red-500">*</span></Label>
          <Input
            id="nomClient"
            name="nomClient"
            value={formData.nomClient}
            onChange={handleChange}
            placeholder="Dupont"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="prenomClient">Prénom du client <span className="text-red-500">*</span></Label>
          <Input
            id="prenomClient"
            name="prenomClient"
            value={formData.prenomClient}
            onChange={handleChange}
            placeholder="Jean"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="telClient">Téléphone du client</Label>
          <Input
            id="telClient"
            name="telClient"
            type="tel"
            value={formData.telClient}
            onChange={handleChange}
            placeholder="0612345678"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="mailClient">Email du client</Label>
          <Input
            id="mailClient"
            name="mailClient"
            type="email"
            value={formData.mailClient}
            onChange={handleChange}
            placeholder="jean.dupont@example.com"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="statut">Statut</Label>
          <Select 
            value={formData.statut} 
            onValueChange={(value) => handleSelectChange('statut', value)}
          >
            <SelectTrigger id="statut">
              <SelectValue placeholder="Sélectionner un statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Planifié">Planifié</SelectItem>
              <SelectItem value="En cours">En cours</SelectItem>
              <SelectItem value="Réceptionné">Réceptionné</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description / Notes</Label>
        <Textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Informations complémentaires sur le chantier..."
          rows={4}
        />
      </div>

      <div className="flex justify-end space-x-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => onSuccess ? onSuccess() : navigate(-1)}
        >
          Annuler
        </Button>
        <Button type="submit">
          {isEditing ? 'Mettre à jour le chantier' : 'Créer le chantier'}
        </Button>
      </div>
    </motion.form>
  );
}