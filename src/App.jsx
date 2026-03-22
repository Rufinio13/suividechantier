import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/Layout.jsx';
import { LayoutArtisan } from '@/components/LayoutArtisan.jsx';
import { ErrorBoundary } from '@/components/ErrorBoundary.jsx';
import { Dashboard } from '@/pages/Dashboard.jsx';
import { DashboardArtisan } from '@/pages/DashboardArtisan.jsx';
import { MesChantiersArtisan } from '@/pages/artisan/MesChantiersArtisan.jsx';
import { ChantierDetailsArtisan } from '@/pages/artisan/ChantierDetailsArtisan.jsx';
import { SAVArtisanList } from '@/pages/artisan/SAVArtisanList.jsx';
import { SAVArtisanDetails } from '@/pages/artisan/SAVArtisanDetails.jsx';
import { ChantiersList } from '@/pages/ChantiersList.jsx';
import { ChantierDetails } from '@/pages/ChantierDetails.jsx';
import { Planning } from '@/pages/Planning.jsx';
import { SousTraitantsList } from '@/pages/SousTraitantsList.jsx';
import { SousTraitantDetails } from '@/pages/SousTraitantDetails.jsx';
import { FournisseursList } from '@/pages/FournisseursList.jsx';
import { ControlQualite } from '@/pages/ControlQualite.jsx';
import { CompteRendu } from '@/pages/CompteRendu.jsx';
import { LotsList } from '@/pages/LotsList.jsx';
import { SAVList } from '@/pages/SAVList.jsx';
import { ReferentielControleQualite } from '@/pages/ReferentielControleQualite.jsx';
import { ReferentielCommande } from '@/pages/ReferentielCommande.jsx';
import { Commandes } from '@/pages/Commandes.jsx';
import { AppProvider } from '@/context/AppProvider.jsx'; // ✅ NOUVEAU
import { Login } from '@/pages/Login.jsx';
import { ResetPassword } from '@/pages/ResetPassword.jsx';
import { useAuth } from '@/hooks/useAuth.jsx';

export function PrivateRoute({ children }) {
  const { user, profile, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }
  
  if (!user) return <Navigate to="/login" replace />;
  
  const currentPath = window.location.pathname;
  
  if (profile?.user_type === 'artisan') {
    if (!currentPath.startsWith('/artisan')) {
      return <Navigate to="/artisan" replace />;
    }
  } else if (profile?.user_type === 'constructeur') {
    if (currentPath.startsWith('/artisan')) {
      return <Navigate to="/" replace />;
    }
  }
  
  return children;
}

function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="chantiers" element={<ChantiersList />} />
            <Route path="chantiers/:id" element={<ChantierDetails />} />
            <Route path="chantiers/:id/planning" element={<Planning />} />
            <Route path="chantiers/:id/controle-qualite" element={<ControlQualite />} />
            <Route path="chantiers/:id/compte-rendu" element={<CompteRendu />} />
            <Route path="chantiers/:id/commandes" element={<Commandes />} />
            <Route path="referentiel-cq" element={<ReferentielControleQualite />} />
            <Route path="referentiel-commande" element={<ReferentielCommande />} />
            <Route path="lots" element={<LotsList />} />
            <Route path="sous-traitants" element={<SousTraitantsList />} />
            <Route path="sous-traitants/:id" element={<SousTraitantDetails />} />
            <Route path="fournisseurs" element={<FournisseursList />} />
            <Route path="sav" element={<SAVList />} />
          </Route>

          <Route
            path="/artisan"
            element={
              <PrivateRoute>
                <LayoutArtisan />
              </PrivateRoute>
            }
          >
            <Route index element={<DashboardArtisan />} />
            <Route path="chantiers" element={<MesChantiersArtisan />} />
            <Route path="chantiers/:id" element={<ChantierDetailsArtisan />} />
            <Route path="sav" element={<SAVArtisanList />} />
            <Route path="sav/:id" element={<SAVArtisanDetails />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;