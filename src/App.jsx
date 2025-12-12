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
import { ReferentielCommande } from '@/pages/ReferentielCommande.jsx'; // ✅ AJOUTÉ
import { Commandes } from '@/pages/Commandes.jsx'; // ✅ AJOUTÉ
import { ChantierProvider } from '@/context/ChantierContext.jsx';
import { FournisseurProvider } from '@/context/FournisseurContext.jsx';
import { SousTraitantProvider } from '@/context/SousTraitantContext.jsx';
import { LotsProvider } from '@/context/LotsContext.jsx';
import { SAVProvider } from '@/context/SAVContext.jsx';
import { ReferentielCQProvider } from '@/context/ReferentielCQContext.jsx';
import { ReferentielCommandeProvider } from '@/context/ReferentielCommandeContext.jsx'; // ✅ AJOUTÉ
import { CommandesProvider } from '@/context/CommandesContext.jsx'; // ✅ AJOUTÉ
import { CommentairesProvider } from '@/context/CommentairesContext.jsx';
import { CompteRenduProvider } from '@/context/CompteRenduContext.jsx';
import { Login } from '@/pages/Login.jsx';
import { AuthProvider } from '@/context/AuthProvider.jsx';
import { useAuth } from '@/hooks/useAuth.jsx';

export function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  
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
  return children;
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ChantierProvider>
          <FournisseurProvider>
            <SousTraitantProvider>
              <LotsProvider>
                <SAVProvider>
                  <ReferentielCQProvider>
                    <ReferentielCommandeProvider> {/* ✅ AJOUTÉ */}
                      <CommandesProvider> {/* ✅ AJOUTÉ */}
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
                                <Route path="chantiers/:id/commandes" element={<Commandes />} /> {/* ✅ AJOUTÉ */}

                                {/* Référentiel CQ */}
                                <Route path="referentiel-cq" element={<ReferentielControleQualite />} />

                                {/* Référentiel Commandes */}
                                <Route path="referentiel-commande" element={<ReferentielCommande />} /> {/* ✅ AJOUTÉ */}

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
                      </CommandesProvider> {/* ✅ AJOUTÉ */}
                    </ReferentielCommandeProvider> {/* ✅ AJOUTÉ */}
                  </ReferentielCQProvider>
                </SAVProvider>
              </LotsProvider>
            </SousTraitantProvider>
          </FournisseurProvider>
        </ChantierProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;