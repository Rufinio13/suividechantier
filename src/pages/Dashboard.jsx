import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useChantier } from '@/context/ChantierContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChantierCard } from '@/components/ChantierCard';
import { HardHat, Plus, Clock, CheckCircle, Calendar, GanttChartSquare, Wrench } from 'lucide-react';
import { GlobalGanttChart } from '@/components/dashboard/GlobalGanttChart';
import { subWeeks, startOfDay } from 'date-fns';

export function Dashboard() {
  const { chantiers, taches, sousTraitants, demandesSAV, loading } = useChantier();
  const navigate = useNavigate();

  const chantiersEnCoursCount = chantiers.filter(c => c.statut === 'En cours').length;
  const chantiersReceptionnesCount = chantiers.filter(c => c.statut === 'Réceptionné').length;
  const savOuvertes = demandesSAV ? demandesSAV.filter(sav => !sav.repriseValidee).length : 0;

  const chantiersRecents = [...chantiers]
    .sort((a, b) => {
      const dateA = a.dateDebut ? new Date(a.dateDebut) : new Date(0);
      const dateB = b.dateDebut ? new Date(b.dateDebut) : new Date(0);
      return dateB - dateA;
    })
    .slice(0, 3);

  const handleStatutCardClick = (statut) => {
    navigate(`/chantiers?statut=${encodeURIComponent(statut)}`);
  };
  
  const chantiersEnCoursPourGantt = useMemo(() => {
    return chantiers.filter(c => c.statut === 'En cours');
  }, [chantiers]);

  const defaultStartDateForGantt = useMemo(() => {
    return subWeeks(startOfDay(new Date()), 1);
  }, []);


  if (loading) {
    return <div className="flex justify-center items-center h-64">Chargement...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
          <p className="text-muted-foreground">Bienvenue sur votre application de suivi de chantiers</p>
        </div>
        {/* Bouton "Voir tous les chantiers" supprimé */}
      </div>

      <motion.div 
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card 
            className="bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:shadow-xl cursor-pointer transition-all"
            onClick={() => handleStatutCardClick('En cours')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Chantiers en cours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">{chantiersEnCoursCount}</span>
              <Clock className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
        

        
        <Card 
            className="bg-gradient-to-br from-green-500 to-green-600 text-white hover:shadow-xl cursor-pointer transition-all"
            onClick={() => handleStatutCardClick('Réceptionné')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Chantiers réceptionnés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">{chantiersReceptionnesCount}</span>
              <CheckCircle className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
        
        <Link to="/sav">
          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white h-full hover:shadow-xl transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">SAV Ouverts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">{savOuvertes}</span>
                <Wrench className="h-8 w-8 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center"><GanttChartSquare className="mr-3 h-6 w-6 text-primary"/>Planning des chantiers en cours</CardTitle>
          </CardHeader>
          <CardContent>
             {chantiersEnCoursPourGantt.length > 0 ? (
                <GlobalGanttChart 
                  chantiers={chantiersEnCoursPourGantt} 
                  taches={taches} 
                  sousTraitants={sousTraitants}
                  initialStartDate={defaultStartDateForGantt}
                />
             ) : (
                <div className="text-center py-8 text-muted-foreground">
                    <GanttChartSquare className="mx-auto h-12 w-12 mb-2" />
                    Aucun chantier en cours pour afficher le planning.
                </div>
             )}
          </CardContent>
        </Card>
      </motion.div>


      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Chantiers récents</h2>
          <Link to="/chantiers">
            <Button variant="outline" size="sm">
              Voir tous
            </Button>
          </Link>
        </div>
        
        {chantiersRecents.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {chantiersRecents.map(chantier => (
              <ChantierCard key={chantier.id} chantier={chantier} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <HardHat className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">Aucun chantier récent</p>
              <Link to="/chantiers?action=new" className="mt-4">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Créer un chantier
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </motion.div>
      {/* Section "Chantiers à démarrer" supprimée */}
    </div>
  );
}