import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/Layout.jsx';
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
import { Parametres } from '@/pages/Parametres.jsx';
import { ChantierProvider } from '@/context/ChantierContext.jsx';
import { FournisseurProvider } from '@/context/FournisseurContext.jsx';
import { SousTraitantProvider } from '@/context/SousTraitantContext.jsx';
import { LotsProvider } from '@/context/LotsContext.jsx';
import { SAVProvider } from '@/context/SAVContext.jsx';
import { ReferentielCQProvider } from '@/context/ReferentielCQContext.jsx';
import { CommentairesProvider } from '@/context/CommentairesContext.jsx';
import { CompteRenduProvider } from '@/context/CompteRenduContext.jsx'; // ✅ CORRIGÉ ICI
import { Login } from '@/pages/Login.jsx';
import { AuthProvider } from '@/context/AuthProvider.jsx';
import { useAuth } from '@/hooks/useAuth.jsx';

export function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  return (
    <AuthProvider>
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
                     
                      {/* Lots */}
                      <Route path="lots" element={<LotsList />} />

                      {/* Sous-traitants */}
                      <Route path="sous-traitants" element={<SousTraitantsList />} />
                      <Route path="sous-traitants/:id" element={<SousTraitantDetails />} />

                      {/* Fournisseurs */}
                      <Route path="fournisseurs" element={<FournisseursList />} />

                      {/* SAV */}
                      <Route path="sav" element={<SAVList />} />

                      {/* Paramètres */}
                      <Route path="parametres" element={<Parametres />} />
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
    </AuthProvider>
  );
}

export default App;