import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChantier } from '@/context/ChantierContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';

export function ChantierForm({ chantier, onSuccess }) {
  const { addChantier, updateChantier } = useChantier();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const isEditing = !!chantier;

  const [formData, setFormData] = useState({
    nomchantier: chantier?.nomchantier || '',
    adresse: chantier?.adresse || '',
    ville: chantier?.ville || '',
    codepostal: chantier?.codepostal || '',
    statut: chantier?.statut || 'Planifié',
    description: chantier?.description || '',
    client_nom: chantier?.client_nom || '',
    client_prenom: chantier?.client_prenom || '',
    client_tel: chantier?.client_tel || '',
    client_mail: chantier?.client_mail || ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.nomchantier || !formData.adresse || !formData.client_nom || !formData.client_prenom) {
      alert('Veuillez remplir les champs obligatoires.');
      return;
    }

    console.log("📋 Profile actuel:", profile);

    try {
      if (isEditing) {
        // ✅ N'envoie QUE les champs qui existent dans la table
        const updatePayload = {
          nomchantier: formData.nomchantier,
          adresse: formData.adresse,
          ville: formData.ville,
          codepostal: formData.codepostal,
          statut: formData.statut,
          description: formData.description,
          client_nom: formData.client_nom,
          client_prenom: formData.client_prenom,
          client_tel: formData.client_tel,
          client_mail: formData.client_mail
        };
        
        console.log("🔄 Mise à jour chantier:", chantier.id, updatePayload);
        await updateChantier(chantier.id, updatePayload);
        if (onSuccess) onSuccess();
      } else {
        // ✅ Pour la création, ajoute nomsociete
        if (!profile?.nomsociete) {
          alert("Erreur : Impossible de récupérer le nom de société. Veuillez vous reconnecter.");
          console.error("❌ profile.nomsociete est manquant:", profile);
          return;
        }

        const createPayload = {
          nomchantier: formData.nomchantier,
          adresse: formData.adresse,
          ville: formData.ville,
          codepostal: formData.codepostal,
          statut: formData.statut,
          description: formData.description,
          client_nom: formData.client_nom,
          client_prenom: formData.client_prenom,
          client_tel: formData.client_tel,
          client_mail: formData.client_mail,
          nomsociete: profile.nomsociete
        };
        
        console.log("➕ Création chantier - Payload:", createPayload);
        const newChantier = await addChantier(createPayload);
        console.log("✅ Chantier créé:", newChantier);
        
        if (newChantier?.id) {
          navigate(`/chantiers/${newChantier.id}`);
        }
      }
    } catch (error) {
      console.error('❌ Erreur création/mise à jour chantier :', error);
      alert(`Une erreur est survenue: ${error.message || 'Erreur inconnue'}`);
    }
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
          <Label htmlFor="nomchantier">Nom du chantier *</Label>
          <Input
            id="nomchantier"
            name="nomchantier"
            value={formData.nomchantier}
            onChange={handleChange}
            placeholder="Ex: Maison Dupont"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="adresse">Adresse *</Label>
          <Input
            id="adresse"
            name="adresse"
            value={formData.adresse}
            onChange={handleChange}
            placeholder="123 Rue ... "
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ville">Ville *</Label>
          <Input
            id="ville"
            name="ville"
            value={formData.ville}
            onChange={handleChange}
            placeholder="Salon-de-Provence"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="codepostal">Code Postal *</Label>
          <Input
            id="codepostal"
            name="codepostal"
            value={formData.codepostal}
            onChange={handleChange}
            placeholder="13300"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="client_nom">Nom client *</Label>
          <Input
            id="client_nom"
            name="client_nom"
            value={formData.client_nom}
            onChange={handleChange}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="client_prenom">Prénom client *</Label>
          <Input
            id="client_prenom"
            name="client_prenom"
            value={formData.client_prenom}
            onChange={handleChange}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="client_tel">Téléphone</Label>
          <Input
            id="client_tel"
            name="client_tel"
            value={formData.client_tel}
            onChange={handleChange}
            placeholder="0612345678"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="client_mail">Email</Label>
          <Input
            id="client_mail"
            name="client_mail"
            value={formData.client_mail}
            onChange={handleChange}
            placeholder="exemple@mail.com"
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
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
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
          {isEditing ? 'Mettre à jour' : 'Créer'}
        </Button>
      </div>

    </motion.form>
  );
}