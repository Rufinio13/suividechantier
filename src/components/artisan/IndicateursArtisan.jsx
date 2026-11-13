import React from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, ListChecks, Clock, FileText, FileSignature, AlertTriangle, Wrench, ChevronRight,
} from 'lucide-react';

const GRIS = 'text-slate-400 bg-white border-slate-200';

// Tuile carrée : un compteur + un libellé
function Tuile({ to, icon: Icon, valeur, label, couleur }) {
  const style = valeur > 0 ? couleur : GRIS;
  return (
    <Link
      to={to}
      className={`group flex flex-col justify-between rounded-xl border-2 p-4 min-h-[112px] shadow-sm transition active:scale-[0.98] hover:shadow-md ${style}`}
    >
      <div className="flex items-start justify-between gap-2">
        <Icon className="h-6 w-6 shrink-0" />
        <ChevronRight className="h-5 w-5 opacity-50 group-hover:opacity-100" />
      </div>
      <div>
        <div className="text-4xl font-bold leading-none tabular-nums">{valeur}</div>
        <div className="mt-1 text-sm font-medium leading-tight text-slate-700">{label}</div>
      </div>
    </Link>
  );
}

// Moitié du bloc "Chantiers / Tâches"
function DemiBloc({ to, icon: Icon, valeur, label, detail, className = '' }) {
  return (
    <Link
      to={to}
      className={`group flex-1 flex flex-col justify-between p-4 min-h-[112px] transition active:bg-orange-100 hover:bg-orange-100/60 ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <Icon className="h-6 w-6 shrink-0" />
        <ChevronRight className="h-5 w-5 opacity-50 group-hover:opacity-100" />
      </div>
      <div>
        <div className="text-4xl font-bold leading-none tabular-nums">{valeur}</div>
        <div className="mt-1 text-sm font-medium leading-tight text-slate-700">{label}</div>
        {detail && <div className="mt-0.5 text-xs font-medium leading-tight text-slate-600">{detail}</div>}
      </div>
    </Link>
  );
}

// "dont 2 nouvelles et 1 modifiée" (rien si aucune)
function detailNotifs(nouvelles = 0, modifiees = 0) {
  const parts = [
    nouvelles > 0 && `${nouvelles} nouvelle${nouvelles > 1 ? 's' : ''}`,
    modifiees > 0 && `${modifiees} modifiée${modifiees > 1 ? 's' : ''}`,
  ].filter(Boolean);
  return parts.length ? `dont ${parts.join(' et ')}` : null;
}

// Accueil artisan : compteurs cliquables vers la bonne liste
export function IndicateursArtisan({ totaux, basePath, tachesNouvelles = 0, tachesModifiees = 0 }) {
  const chantiersUrl = `${basePath}/chantiers`;
  const enRetard = totaux.tachesEnRetard > 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Chantiers en cours | Tâches à faire */}
      <div className="col-span-2 flex rounded-xl border-2 border-orange-200 bg-orange-50 text-orange-600 shadow-sm overflow-hidden">
        <DemiBloc
          to={chantiersUrl}
          icon={Building2}
          valeur={totaux.chantiersEnCours}
          label="Chantiers en cours"
          className="border-r-2 border-orange-200"
        />
        <DemiBloc
          to={`${chantiersUrl}?filtre=taches`}
          icon={ListChecks}
          valeur={totaux.tachesAFaire}
          label="Tâches à faire"
          detail={detailNotifs(tachesNouvelles, tachesModifiees)}
        />
      </div>

      {/* Tâches en retard : bandeau pleine largeur, rouge vif s'il y en a */}
      <Link
        to={`${chantiersUrl}?filtre=retard`}
        className={`group col-span-2 flex items-center gap-4 rounded-xl border-2 px-4 py-4 shadow-sm transition active:scale-[0.99] hover:shadow-md ${
          enRetard ? 'bg-red-600 border-red-700 text-white' : GRIS
        }`}
      >
        <Clock className="h-7 w-7 shrink-0" />
        <span className="text-4xl font-bold leading-none tabular-nums">{totaux.tachesEnRetard}</span>
        <span className={`flex-1 text-base font-semibold leading-tight ${enRetard ? '' : 'text-slate-700'}`}>
          {totaux.tachesEnRetard > 1 ? 'Tâches en retard' : 'Tâche en retard'}
        </span>
        <ChevronRight className="h-5 w-5 opacity-70 group-hover:opacity-100" />
      </Link>

      <Tuile
        to={`${chantiersUrl}?filtre=documents`}
        icon={FileText}
        valeur={totaux.documentsNonVus}
        label="Documents non vus"
        couleur="text-blue-600 bg-blue-50 border-blue-200"
      />
      <Tuile
        to={`${chantiersUrl}?filtre=marches`}
        icon={FileSignature}
        valeur={totaux.marchesASigner}
        label="Marchés à signer"
        couleur="text-amber-700 bg-amber-50 border-amber-300"
      />
      <Tuile
        to={`${chantiersUrl}?filtre=nc`}
        icon={AlertTriangle}
        valeur={totaux.nonConformites}
        label="Non-conformités"
        couleur="text-red-600 bg-red-50 border-red-200"
      />
      <Tuile
        to={`${basePath}/sav`}
        icon={Wrench}
        valeur={totaux.sav}
        label="SAV"
        couleur="text-purple-600 bg-purple-50 border-purple-200"
      />
    </div>
  );
}
