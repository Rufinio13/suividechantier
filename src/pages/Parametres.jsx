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
import { Building, UserCircle, ShieldCheck, ListChecks, Save } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';

export function Parametres() {
  const { user, profile } = useAuth(); 
  const { toast } = useToast();

  // ✅ État du profil société
  const [profil, setProfil] = useState({
    nomsociete: '',
    nom: '',
    prenom: '',
    tel: '',
    mail: '',
  });

  // -----------------------------
  // Chargement automatique du profil société
  // -----------------------------
  useEffect(() => {
    const fetchProfil = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('profil')
        .select('*')
        .eq('nomsociete', user.nomsociete)
        .single();

      if (error) {
        console.warn("Aucun profil de société trouvé : ", error.message);
      }

      if (data) {
        setProfil(data);
      } else {
        // Préremplissage si pas de profil existant
        setProfil({
          nomsociete: user.nomsociete,
          nom: user.nom,
          prenom: user.prenom,
          mail: user.mail,
          tel: '',
        });
      }
    };

    fetchProfil();
  }, [user]);

  // -----------------------------
  // Gestion des changements dans le formulaire
  // -----------------------------
  const handleProfilChange = (e) => {
    const { name, value } = e.target;
    setProfil(prev => ({ ...prev, [name]: value }));
  };

  // -----------------------------
  // Sauvegarde du profil
  // -----------------------------
  const handleSaveProfil = async (e) => {
    e.preventDefault();

    const { error } = await supabase.from('profil').upsert([profil]);

    if (error) {
      toast({ title: "Erreur", description: error.message });
    } else {
      toast({ title: "Profil sauvegardé", description: "Les informations ont été mises à jour." });
    }
  };

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.3 }}
    >
      <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>

      <Tabs defaultValue="profil" className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 mb-6">
          <TabsTrigger value="profil" className="py-3">
            <UserCircle className="mr-2 h-4 w-4" />
            Administrateur
          </TabsTrigger>

          <TabsTrigger value="referentiel-cq" className="py-3">
            <ShieldCheck className="mr-2 h-4 w-4" />
            Référentiel CQ
          </TabsTrigger>

          <TabsTrigger value="lots" className="py-3">
            <ListChecks className="mr-2 h-4 w-4" />
            Lots
          </TabsTrigger>
        </TabsList>

        {/* PROFIL SOCIÉTÉ */}
        <TabsContent value="profil">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="mr-2 h-5 w-5 text-primary" />
                Informations de la société
              </CardTitle>
              <CardDescription>
                Ces informations sont utilisées dans toute l'application.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSaveProfil} className="space-y-6">

                {/* Nom société */}
                <div>
                  <Label>Nom de la société</Label>
                  <Input
                    name="nomsociete"
                    value={profil.nomsociete}
                    onChange={handleProfilChange}
                    required
                  />
                </div>

                <h3 className="text-lg font-medium pt-4 border-t">
                  Informations administrateur
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    name="nom"
                    value={profil.nom}
                    onChange={handleProfilChange}
                    placeholder="Nom"
                  />

                  <Input
                    name="prenom"
                    value={profil.prenom}
                    onChange={handleProfilChange}
                    placeholder="Prénom"
                  />

                  <Input
                    name="tel"
                    value={profil.tel}
                    onChange={handleProfilChange}
                    placeholder="Téléphone"
                  />

                  <Input
                    name="mail"
                    type="email"
                    value={profil.mail}
                    onChange={handleProfilChange}
                    placeholder="Email"
                  />
                </div>

                <div className="flex justify-end">
                  <Button type="submit">
                    <Save className="mr-2 h-4 w-4" />
                    Sauvegarder
                  </Button>
                </div>

              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AUTRES TABS */}
        <TabsContent value="referentiel-cq">
          <ReferentielControleQualite />
        </TabsContent>

        <TabsContent value="lots">
          <LotsList />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
