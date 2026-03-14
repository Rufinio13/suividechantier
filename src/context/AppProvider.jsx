import React, { createContext, useContext } from 'react';
import { AuthProvider } from './AuthProvider';
import { ChantierProvider } from './ChantierContext';
import { FournisseurProvider } from './FournisseurContext';
import { SousTraitantProvider } from './SousTraitantContext';
import { LotsProvider } from './LotsContext';
import { SAVProvider } from './SAVContext';
import { ReferentielCQProvider } from './ReferentielCQContext';
import { ReferentielCommandeProvider } from './ReferentielCommandeContext';
import { CommandesProvider } from './CommandesContext';
import { CommentairesProvider } from './CommentairesContext';
import { CompteRenduProvider } from './CompteRenduContext';

export function AppProvider({ children }) {
  return (
    <AuthProvider>
      <ChantierProvider>
        <FournisseurProvider>
          <SousTraitantProvider>
            <LotsProvider>
              <SAVProvider>
                <ReferentielCQProvider>
                  <ReferentielCommandeProvider>
                    <CommandesProvider>
                      <CommentairesProvider>
                        <CompteRenduProvider>
                          {children}
                        </CompteRenduProvider>
                      </CommentairesProvider>
                    </CommandesProvider>
                  </ReferentielCommandeProvider>
                </ReferentielCQProvider>
              </SAVProvider>
            </LotsProvider>
          </SousTraitantProvider>
        </FournisseurProvider>
      </ChantierProvider>
    </AuthProvider>
  );
}