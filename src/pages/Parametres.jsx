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
import { UserPlus, Save, Trash2, Edit, Building, UserCircle, Phone, Mail, Users, ShieldCheck, ListChecks } from 'lucide-react'; 
import { v4 as uuidv4 } from 'uuid';

const PROFIL_STORAGE_KEY = 'monProfil';
const USERS_STORAGE_KEY = 'appUsers';

export function Parametres() {
  const { toast } = useToast();

  // Mon Profil State
  const [profil, setProfil] = useState({
    nomSociete: '',
    nomAdmin: '',
    prenomAdmin: '',
    telAdmin: '',
    mailAdmin: '',
    profil: 'Administrateur',
  });

  // Utilisateurs State
  const [users, setUsers] = useState([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [currentUserFormData, setCurrentUserFormData] = useState({
    nom: '',
    prenom: '',
    tel: '',
    mail: '',
    profil: 'Utilisateur' 
  });

  // Load data from localStorage
  useEffect(() => {
    const storedProfil = localStorage.getItem(PROFIL_STORAGE_KEY);
    if (storedProfil) {
      setProfil(JSON.parse(storedProfil));
    }
    const storedUsers = localStorage.getItem(USERS_STORAGE_KEY);
    if (storedUsers) {
      setUsers(JSON.parse(storedUsers));
    }
  }, []);

  // Mon Profil handlers
  const handleProfilChange = (e) => {
    const { name, value } = e.target;
    setProfil(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfil = (e) => {
    e.preventDefault();
    localStorage.setItem(PROFIL_STORAGE_KEY, JSON.stringify(profil));
    toast({ title: "Profil sauvegardé", description: "Vos informations de profil ont été mises à jour." });
  };

  // Utilisateurs handlers
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
      setCurrentUserFormData({ nom: '', prenom: '', tel: '', mail: '', profil: 'Utilisateur' });
    }
    setIsUserModalOpen(true);
  };

  const closeUserModal = () => {
    setIsUserModalOpen(false);
    setEditingUser(null);
  };

  const handleSaveUser = (e) => {
    e.preventDefault();
    let updatedUsers;
    if (editingUser) {
      updatedUsers = users.map(u => u.id === editingUser.id ? { ...currentUserFormData, id: editingUser.id } : u);
      toast({ title: "Utilisateur modifié", description: "Les informations de l'utilisateur ont été mises à jour." });
    } else {
      updatedUsers = [...users, { ...currentUserFormData, id: uuidv4() }];
      toast({ title: "Utilisateur ajouté", description: "Le nouvel utilisateur a été ajouté avec succès." });
    }
    setUsers(updatedUsers);
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));
    closeUserModal();
  };

  const handleDeleteUser = (userId) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?")) {
      const updatedUsers = users.filter(u => u.id !== userId);
      setUsers(updatedUsers);
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));
      toast({ title: "Utilisateur supprimé", description: "L'utilisateur a été supprimé." });
    }
  };
  
  const userProfilOptions = ["Administrateur", "Conducteur de travaux", "Chef de chantier", "Bureau d'études", "Utilisateur"];


  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>
      </div>

      <Tabs defaultValue="profil" className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-4 mb-6">
          <TabsTrigger value="profil" className="py-3"><UserCircle className="mr-2 h-4 w-4" />Administrateur</TabsTrigger>
          <TabsTrigger value="utilisateurs" className="py-3"><Users className="mr-2 h-4 w-4" />Utilisateurs</TabsTrigger>
          <TabsTrigger value="referentiel-cq" className="py-3"><ShieldCheck className="mr-2 h-4 w-4" />Référentiel CQ</TabsTrigger>
          <TabsTrigger value="lots" className="py-3"><ListChecks className="mr-2 h-4 w-4" />Lots</TabsTrigger>
        </TabsList>

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
                    <Input id="nomSociete" name="nomSociete" value={profil.nomSociete} onChange={handleProfilChange} placeholder="Nom de votre entreprise" />
                  </div>
                </div>
                <h3 className="text-lg font-medium pt-4 border-t">Informations Administrateur</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="nomAdmin">Nom</Label>
                    <Input id="nomAdmin" name="nomAdmin" value={profil.nomAdmin} onChange={handleProfilChange} placeholder="Nom de l'administrateur" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prenomAdmin">Prénom</Label>
                    <Input id="prenomAdmin" name="prenomAdmin" value={profil.prenomAdmin} onChange={handleProfilChange} placeholder="Prénom de l'administrateur" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telAdmin">Téléphone</Label>
                    <Input id="telAdmin" name="telAdmin" type="tel" value={profil.telAdmin} onChange={handleProfilChange} placeholder="Téléphone de l'administrateur" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mailAdmin">Email</Label>
                    <Input id="mailAdmin" name="mailAdmin" type="email" value={profil.mailAdmin} onChange={handleProfilChange} placeholder="Email de l'administrateur" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit"><Save className="mr-2 h-4 w-4" />Sauvegarder le profil</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="utilisateurs">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5 text-primary"/>Gestion des utilisateurs</CardTitle>
                  <CardDescription>Ajoutez, modifiez ou supprimez des utilisateurs.</CardDescription>
                </div>
                <Button onClick={() => openUserModal()}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Ajouter un utilisateur
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {users.length > 0 ? (
                <div className="space-y-4">
                  {users.map(user => (
                    <Card key={user.id} className="p-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                        <div className="mb-2 sm:mb-0">
                          <p className="font-semibold">{user.prenom} {user.nom} <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full ml-2">{user.profil}</span></p>
                          <p className="text-sm text-muted-foreground">{user.mail} - {user.tel}</p>
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={() => openUserModal(user)}>
                            <Edit className="mr-1 h-3 w-3" /> Modifier
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(user.id)}>
                            <Trash2 className="mr-1 h-3 w-3" /> Supprimer
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">Aucun utilisateur configuré.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referentiel-cq">
          <ReferentielControleQualite />
        </TabsContent>

        <TabsContent value="lots">
          <LotsList />
        </TabsContent>
      </Tabs>

      {/* User Form Modal (Dialog) */}
      {isUserModalOpen && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-card p-6 rounded-lg shadow-xl w-full max-w-lg"
            >
                <h2 className="text-xl font-semibold mb-4">{editingUser ? "Modifier l'utilisateur" : "Ajouter un utilisateur"}</h2>
                <form onSubmit={handleSaveUser} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label htmlFor="userNom">Nom</Label>
                            <Input id="userNom" name="nom" value={currentUserFormData.nom} onChange={handleUserFormChange} required />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="userPrenom">Prénom</Label>
                            <Input id="userPrenom" name="prenom" value={currentUserFormData.prenom} onChange={handleUserFormChange} required />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="userMail">Email</Label>
                        <Input id="userMail" name="mail" type="email" value={currentUserFormData.mail} onChange={handleUserFormChange} required />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="userTel">Téléphone</Label>
                        <Input id="userTel" name="tel" type="tel" value={currentUserFormData.tel} onChange={handleUserFormChange} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="userProfil">Profil</Label>
                        <select 
                            id="userProfil" 
                            name="profil" 
                            value={currentUserFormData.profil} 
                            onChange={handleUserFormChange}
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {userProfilOptions.map(option => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                    </div>
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