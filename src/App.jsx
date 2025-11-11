import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Dashboard } from '@/pages/Dashboard';
import { ChantiersList } from '@/pages/ChantiersList';
import { ChantierDetails } from '@/pages/ChantierDetails';
import { Planning } from '@/pages/Planning';
import { SousTraitantsList } from '@/pages/SousTraitantsList';
import { SousTraitantDetails } from '@/pages/SousTraitantDetails';
import { FournisseursList } from '@/pages/FournisseursList';
import { ControlQualite } from '@/pages/ControlQualite';
import { CompteRendu } from '@/pages/CompteRendu';
import { Documents } from '@/pages/Documents';
import { LotsList } from '@/pages/LotsList';
import { SAVList } from '@/pages/SAVList';
import { Parametres } from '@/pages/Parametres';
import { ChantierProvider } from '@/context/ChantierContext';
import { Login } from '@/pages/Login';
import { AuthProvider } from '@/context/AuthProvider';
import { useAuth } from '@/hooks/useAuth';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex justify-center items-center h-64">Chargement...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return children;
}

function App() {
  return (
    <AuthProvider> {/* ✅ Fournit le contexte Auth */}
      <ChantierProvider>
        <Routes>
          {/* Page publique */}
          <Route path="/login" element={<Login />} />

          {/* Pages privées */}
          <Route
            path="/*"
            element={
              <PrivateRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/chantiers" element={<ChantiersList />} />
                    <Route path="/chantiers/:id" element={<ChantierDetails />} />
                    <Route path="/chantiers/:id/planning" element={<Planning />} />
                    <Route path="/chantiers/:id/controle-qualite" element={<ControlQualite />} />
                    <Route path="/chantiers/:id/compte-rendu" element={<CompteRendu />} />
                    <Route path="/chantiers/:id/documents" element={<Documents />} />
                    <Route path="/lots" element={<LotsList />} />
                    <Route path="/sous-traitants-list" element={<SousTraitantsList />} />
                    <Route path="/sous-traitant-details/:sousTraitantId" element={<SousTraitantDetails />} />
                    <Route path="/fournisseurs" element={<FournisseursList />} />
                    <Route path="/sav" element={<SAVList />} />
                    <Route path="/parametres" element={<Parametres />} />
                  </Routes>
                </Layout>
              </PrivateRoute>
            }
          />
        </Routes>
      </ChantierProvider>
    </AuthProvider>
  );
}

export default App;
