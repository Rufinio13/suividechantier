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
import { LotsList } from '@/pages/LotsList';
import { SAVList } from '@/pages/SAVList';
import { Parametres } from '@/pages/Parametres';
import { ChantierProvider } from '@/context/ChantierContext';
import { FournisseurProvider } from '@/context/FournisseurContext';
import { SousTraitantProvider } from '@/context/SousTraitantContext';
import { LotsProvider } from '@/context/LotsContext';
import { SAVProvider } from '@/context/SAVContext';
import { ReferentielCQProvider } from '@/context/ReferentielCQContext'; // ✅ AJOUTÉ
import { CommentairesProvider } from '@/context/CommentairesContext';
import { CompteRenduProvider } from '@/context/Compterenducontext';
import { Login } from '@/pages/Login';
import { AuthProvider } from '@/context/AuthProvider';
import { useAuth } from '@/hooks/useAuth';

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