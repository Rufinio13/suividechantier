import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/Layout.jsx';
import { ErrorBoundary } from '@/components/ErrorBoundary.jsx';
import { Dashboard } from '@/pages/Dashboard.jsx';
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
import { ChantierProvider } from '@/context/ChantierContext.jsx';
import { FournisseurProvider } from '@/context/FournisseurContext.jsx';
import { SousTraitantProvider } from '@/context/SousTraitantContext.jsx';
import { LotsProvider } from '@/context/LotsContext.jsx';
import { SAVProvider } from '@/context/SAVContext.jsx';
import { ReferentielCQProvider } from '@/context/ReferentielCQContext.jsx';
import { CommentairesProvider } from '@/context/CommentairesContext.jsx';
import { CompteRenduProvider } from '@/context/CompteRenduContext.jsx';
import { Login } from '@/pages/Login.jsx';
import { AuthProvider } from '@/context/AuthProvider.jsx';
import { useAuth } from '@/hooks/useAuth.jsx';

export function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex justify-center items-center h-screen">Chargement...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// ✅ AJOUTÉ : Wrapper qui attend le profile
function AppWithProfile() {
  const { user, profile, loading } = useAuth();

  // ✅ Attendre que le profile soit chargé
  if (loading) {
    return <div className="flex justify-center items-center h-screen">Chargement...</div>;
  }

  // ✅ Si connecté mais pas de profile, afficher erreur
  if (user && !profile) {
    return (
      <div className="flex flex-col justify-center items-center h-screen p-4 text-center">
        <h2 className="text-xl font-bold mb-2">Profil non trouvé</h2>
        <p className="text-muted-foreground mb-4">
          Votre profil utilisateur n'a pas pu être chargé.
        </p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-primary text-white rounded"
        >
          Recharger
        </button>
      </div>
    );
  }

  // ✅ Charger les providers UNIQUEMENT si profile est OK
  return (
    <ChantierProvider>
      <FournisseurProvider>
        <SousTraitantProvider>
          <LotsProvider>
            <SAVProvider>
              <ReferentielCQProvider>
                <CommentairesProvider>
                  <CompteRenduProvider>

                    <Routes>
                      {/* PUBLIC */}
                      <Route path="/login" element={<Login />} />

                      {/* PRIVATE + Layout */}
                      <Route
                        path="/"
                        element={
                          <PrivateRoute>
                            <Layout />
                          </PrivateRoute>
                        }
                      >
                        <Route index element={<Dashboard />} />

                        {/* Chantiers */}
                        <Route path="chantiers" element={<ChantiersList />} />
                        <Route path="chantiers/:id" element={<ChantierDetails />} />
                        <Route path="chantiers/:id/planning" element={<Planning />} />
                        <Route path="chantiers/:id/controle-qualite" element={<ControlQualite />} />
                        <Route path="chantiers/:id/compte-rendu" element={<CompteRendu />} />

                        {/* Référentiel CQ */}
                        <Route path="referentiel-cq" element={<ReferentielControleQualite />} />

                        {/* Lots */}
                        <Route path="lots" element={<LotsList />} />

                        {/* Sous-traitants */}
                        <Route path="sous-traitants" element={<SousTraitantsList />} />
                        <Route path="sous-traitants/:id" element={<SousTraitantDetails />} />

                        {/* Fournisseurs */}
                        <Route path="fournisseurs" element={<FournisseursList />} />

                        {/* SAV */}
                        <Route path="sav" element={<SAVList />} />
                      </Route>

                      {/* fallback */}
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>

                  </CompteRenduProvider>
                </CommentairesProvider>
              </ReferentielCQProvider>
            </SAVProvider>
          </LotsProvider>
        </SousTraitantProvider>
      </FournisseurProvider>
    </ChantierProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppWithProfile />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;