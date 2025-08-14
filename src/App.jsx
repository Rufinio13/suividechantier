import React from 'react';
import { Routes, Route } from 'react-router-dom';
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

function App() {
  return (
    <ChantierProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/chantiers" element={<ChantiersList />} />
          <Route path="/chantiers/:id" element={<ChantierDetails />} />
          <Route path="/chantiers/:id/planning" element={<Planning />} />
          <Route path="/chantiers/:id/controle-qualite" element={<ControlQualite />} />
          <Route path="/chantiers/:id/compte-rendu" element={<CompteRendu />} />
          <Route path="/chantiers/:id/documents" element={<Documents />} />
          
          {/* La route /lots reste, car LotsList est affichée dans Parametres mais est toujours une "page" */}
          <Route path="/lots" element={<LotsList />} /> 
          
          <Route path="/sous-traitants-list" element={<SousTraitantsList />} />
          <Route path="/sous-traitant-details/:sousTraitantId" element={<SousTraitantDetails />} />

          <Route path="/fournisseurs" element={<FournisseursList />} /> 

          <Route path="/sav" element={<SAVList />} />
          <Route path="/parametres" element={<Parametres />} />
        </Routes>
      </Layout>
    </ChantierProvider>
  );
}

export default App;