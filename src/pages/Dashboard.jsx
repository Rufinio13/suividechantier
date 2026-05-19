import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useChantier } from '@/context/ChantierContext.jsx';
import { useSAV } from '@/context/SAVContext.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChantierCard } from '@/components/ChantierCard.jsx';
import { HardHat, Plus, Clock, CheckCircle, GanttChartSquare, Wrench } from 'lucide-react';
import { GlobalGanttChart } from '@/components/dashboard/GlobalGanttChart.jsx';
import { subWeeks, startOfDay } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';

export function Dashboard() {
  const { chantiers, taches, sousTraitants, loading: chantierLoading } = useChantier();
  const { demandesSAV, loading: savLoading } = useSAV();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [authLoading, user, navigate]);

  const chantiersEnCoursPourGantt = useMemo(
    () => chantiers.filter(c => c.statut === 'En cours'),
    [chantiers]
  );

  const defaultStartDateForGantt = useMemo(
    () => subWeeks(startOfDay(new Date()), 1),
    []
  );

  if (authLoading || chantierLoading || savLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#9FC760] mx-auto mb-3"></div>
          <p style={{ color: '#A3806D' }}>Chargement...</p>
        </div>
      </div>
    );
  }

  const chantiersEnCoursCount = chantiers.filter(c => c.statut === 'En cours').length;
  const chantiersReceptionnesCount = chantiers.filter(c => c.statut === 'Réceptionné').length;
  const savOuvertes = demandesSAV ? demandesSAV.filter(s => !s.constructeur_valide).length : 0;

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

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#683B11' }}>
          Tableau de bord
        </h1>
      </div>

      {/* Statistiques */}
      <motion.div
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        {/* Chantiers en cours */}
        <Card
          className="text-white hover:shadow-xl cursor-pointer transition-all border-0"
          style={{ background: '#683B11' }}
          onClick={() => handleStatutCardClick('En cours')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium opacity-85">Chantiers en cours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-4xl font-bold">{chantiersEnCoursCount}</span>
              <Clock className="h-9 w-9 opacity-30" />
            </div>
          </CardContent>
        </Card>

        {/* Chantiers réceptionnés */}
        <Card
          className="hover:shadow-xl cursor-pointer transition-all border-0"
          style={{ background: '#9FC760' }}
          onClick={() => handleStatutCardClick('Réceptionné')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium" style={{ color: '#2d5a0e', opacity: 0.85 }}>
              Chantiers réceptionnés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-4xl font-bold" style={{ color: '#2d5a0e' }}>{chantiersReceptionnesCount}</span>
              <CheckCircle className="h-9 w-9" style={{ color: '#2d5a0e', opacity: 0.3 }} />
            </div>
          </CardContent>
        </Card>

        {/* SAV Ouverts */}
        <Link to="/sav">
          <Card
            className="h-full hover:shadow-xl transition-all border-0"
            style={{ background: '#F8B45B' }}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium" style={{ color: '#633806', opacity: 0.85 }}>
                SAV Ouverts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-4xl font-bold" style={{ color: '#633806' }}>{savOuvertes}</span>
                <Wrench className="h-9 w-9" style={{ color: '#633806', opacity: 0.3 }} />
              </div>
            </CardContent>
          </Card>
        </Link>
      </motion.div>

      {/* Planning Gantt */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <Card className="border border-[#e8e2d9] shadow-sm bg-white">
          <CardHeader>
            <CardTitle
              className="text-lg flex items-center font-bold uppercase tracking-wide"
              style={{ color: '#683B11', letterSpacing: '0.5px' }}
            >
              <GanttChartSquare className="mr-3 h-5 w-5" style={{ color: '#F8B45B' }} />
              Planning des chantiers en cours
            </CardTitle>
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
              <div className="text-center py-8" style={{ color: '#A3806D' }}>
                <GanttChartSquare className="mx-auto h-12 w-12 mb-2 opacity-40" />
                Aucun chantier en cours pour afficher le planning.
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Chantiers récents */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold uppercase tracking-wide" style={{ color: '#683B11', letterSpacing: '0.5px' }}>
            Chantiers récents
          </h2>
          <Link to="/chantiers">
            <Button
              variant="outline"
              size="sm"
              className="border-[#e8e2d9] hover:bg-[#f7f4ef]"
              style={{ color: '#9FC760', fontWeight: 600 }}
            >
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
          <Card className="border border-[#e8e2d9] shadow-sm bg-white">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <HardHat className="h-12 w-12 mb-4" style={{ color: '#A3806D' }} />
              <p className="text-center mb-4" style={{ color: '#A3806D' }}>Aucun chantier récent</p>
              <Link to="/chantiers?action=new">
                <Button
                  className="text-white border-0"
                  style={{ background: '#9FC760' }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Créer un chantier
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}