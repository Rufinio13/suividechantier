import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from "@/components/ui/use-toast";
import { ReferentielControleQualite } from '@/pages/ReferentielControleQualite';
import { LotsList } from '@/pages/LotsList';
import { UserPlus, Save, Trash2, Edit, Building, UserCircle, Users, ShieldCheck, ListChecks } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabaseClient'; // Supabase client unique
import { AuthProvider } from '@/context/AuthProvider';
import { useAuth } from '@/hooks/useAuth';

export function Parametres() {
  const { user } = useAuth(); // Récupère l'utilisateur connecté
  const { toast } = useToast();

  // Profil administrateur
  const [profil, setProfil] = useState({
    nomSociete: '',
    nomAdmin: '',
    prenomAdmin: '',
    telAdmin: '',
    mailAdmin: '',
    profil: 'Administrateur',
  });

  // Utilisateurs
  const [users, setUsers] = useState([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [currentUserFormData, setCurrentUserFormData] = useState({
    id: null,
    nom: '',
    prenom: '',
    tel: '',
    mail: '',
    profil: 'Utilisateur',
  });

  const userProfilOptions = ["Administrateur", "Conducteur de travaux", "Chef de chantier", "Bureau d'études", "Utilisateur"];

  // Chargement des données depuis Supabase
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      // Profil de l'administrateur de la société de l'utilisateur
      const { data: profilData, error: profilError } = await supabase
        .from('profil')
        .select('*')
        .eq('nomSociete', user.nomSociete)
        .single();

      if (profilError) {
        toast({ title: "Erreur", description: profilError.message });
      } else if (profilData) {
        setProfil(profilData);
      }

      // Utilisateurs liés à la même société
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('nomSociete', user.nomSociete);

      if (usersError) toast({ title: "Erreur", description: usersError.message });
      else setUsers(usersData || []);
    };
    fetchData();
  }, [user]);

  // Handlers Profil
  const handleProfilChange = (e) => {
    const { name, value } = e.target;
    setProfil(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfil = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase.from('profil').upsert([profil]);
    if (error) toast({ title: "Erreur", description: error.message });
    else toast({ title: "Profil sauvegardé", description: "Vos informations ont été mises à jour." });
  };

  // Handlers Utilisateurs
  const handleUserFormChange = (e) => {
    const { name, value } = e.target;
    setCurrentUserFormData(prev => ({ ...prev, [name]: value }));
  };

  const openUserModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setCurrentUserFormData({ ...user });
    } else {
      setEditingUser(null);
      setCurrentUserFormData({ id: null, nom: '', prenom: '', tel: '', mail: '', profil: 'Utilisateur' });
    }
    setIsUserModalOpen(true);
  };

  const closeUserModal = () => {
    setIsUserModalOpen(false);
    setEditingUser(null);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    const userToSave = { ...currentUserFormData, nomSociete: user.nomSociete };
    if (!userToSave.id) userToSave.id = uuidv4();

    const { data, error } = await supabase.from('users').upsert([userToSave]);
    if (error) toast({ title: "Erreur", description: error.message });
    else {
      const { data: updatedUsers } = await supabase
        .from('users')
        .select('*')
        .eq('nomSociete', user.nomSociete);
      setUsers(updatedUsers || []);
      toast({ title: editingUser ? "Utilisateur modifié" : "Utilisateur ajouté" });
      closeUserModal();
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?")) return;
    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (error) toast({ title: "Erreur", description: error.message });
    else {
      setUsers(users.filter(u => u.id !== userId));
      toast({ title: "Utilisateur supprimé" });
    }
  };

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>

      <Tabs defaultValue="profil" className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-4 mb-6">
          <TabsTrigger value="profil" className="py-3"><UserCircle className="mr-2 h-4 w-4" />Administrateur</TabsTrigger>
          <TabsTrigger value="utilisateurs" className="py-3"><Users className="mr-2 h-4 w-4" />Utilisateurs</TabsTrigger>
          <TabsTrigger value="referentiel-cq" className="py-3"><ShieldCheck className="mr-2 h-4 w-4" />Référentiel CQ</TabsTrigger>
          <TabsTrigger value="lots" className="py-3"><ListChecks className="mr-2 h-4 w-4" />Lots</TabsTrigger>
        </TabsList>

        {/* Profil */}
        <TabsContent value="profil">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><Building className="mr-2 h-5 w-5 text-primary"/>Informations de la société</CardTitle>
              <CardDescription>Gérez les informations principales de votre compte.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfil} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="nomSociete">Nom de la société</Label>
                    <Input id="nomSociete" name="nomSociete" value={profil.nomSociete} onChange={handleProfilChange} />
                  </div>
                </div>
                <h3 className="text-lg font-medium pt-4 border-t">Informations Administrateur</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input id="nomAdmin" name="nomAdmin" value={profil.nomAdmin} onChange={handleProfilChange} placeholder="Nom" />
                  <Input id="prenomAdmin" name="prenomAdmin" value={profil.prenomAdmin} onChange={handleProfilChange} placeholder="Prénom" />
                  <Input id="telAdmin" name="telAdmin" type="tel" value={profil.telAdmin} onChange={handleProfilChange} placeholder="Téléphone" />
                  <Input id="mailAdmin" name="mailAdmin" type="email" value={profil.mailAdmin} onChange={handleProfilChange} placeholder="Email" />
                </div>
                <div className="flex justify-end">
                  <Button type="submit"><Save className="mr-2 h-4 w-4" />Sauvegarder le profil</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Utilisateurs */}
        <TabsContent value="utilisateurs">
          <Card>
            <CardHeader className="flex justify-between items-center">
              <CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5 text-primary"/>Gestion des utilisateurs</CardTitle>
              <Button onClick={() => openUserModal()}><UserPlus className="mr-2 h-4 w-4"/>Ajouter</Button>
            </CardHeader>
            <CardContent>
              {users.length > 0 ? users.map(u => (
                <Card key={u.id} className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold">{u.prenom} {u.nom} <span className="text-xs bg-primary/10 px-2 rounded-full ml-2">{u.profil}</span></p>
                      <p className="text-sm">{u.mail} - {u.tel}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => openUserModal(u)}><Edit className="mr-1 h-3 w-3"/>Modifier</Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(u.id)}><Trash2 className="mr-1 h-3 w-3"/>Supprimer</Button>
                    </div>
                  </div>
                </Card>
              )) : <p className="text-center py-4 text-muted-foreground">Aucun utilisateur configuré.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referentiel-cq"><ReferentielControleQualite /></TabsContent>
        <TabsContent value="lots"><LotsList /></TabsContent>
      </Tabs>

      {/* Modal ajout/modification utilisateur */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-card p-6 rounded-lg shadow-xl w-full max-w-lg">
            <h2 className="text-xl font-semibold mb-4">{editingUser ? "Modifier l'utilisateur" : "Ajouter un utilisateur"}</h2>
            <form onSubmit={handleSaveUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input name="nom" value={currentUserFormData.nom} onChange={handleUserFormChange} placeholder="Nom" required />
                <Input name="prenom" value={currentUserFormData.prenom} onChange={handleUserFormChange} placeholder="Prénom" required />
              </div>
              <Input name="mail" type="email" value={currentUserFormData.mail} onChange={handleUserFormChange} placeholder="Email" required />
              <Input name="tel" type="tel" value={currentUserFormData.tel} onChange={handleUserFormChange} placeholder="Téléphone" />
              <select name="profil" value={currentUserFormData.profil} onChange={handleUserFormChange}>
                {userProfilOptions.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={closeUserModal}>Annuler</Button>
                <Button type="submit">{editingUser ? "Sauvegarder" : "Ajouter"}</Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
