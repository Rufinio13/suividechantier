import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Plus, ShieldCheck, FileCheck, Eye, Trash2, X, ExternalLink, Copy, Loader2, AlertTriangle,
  ChevronDown, ChevronRight, FolderOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useSousTraitant } from '@/context/SousTraitantContext.jsx';
import { openStorageFile } from '@/lib/storage';
import { isDecennaleValide, isUrssafValide, URSSAF_VALIDITE_MOIS } from '@/lib/attestations';
import { lireAttestationUrssaf, lireAttestationDecennale, normaliserSiret, siretCorrespond } from '@/lib/attestationsPdf';

const BUCKET = 'documents-chantiers';

// Contrôle de l'authenticité d'une attestation de vigilance (code de sécurité)
const URL_VERIFICATION_URSSAF = 'https://www.urssaf.fr/portail/home/utile-et-pratique/verification-attestation.html';

const FORM_VIDE = {
  assureur: '',
  numero_police: '',
  date_debut: '',
  date_fin: '',
  date_attestation: '',
  code_securite: '',
  siret: '',
  file: null,
};

const formatDate = (d) => (d ? format(parseISO(d), 'dd/MM/yyyy', { locale: fr }) : '—');

function BadgeValidite({ valide }) {
  return valide ? (
    <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">Valide</Badge>
  ) : (
    <Badge variant="destructive">Expirée</Badge>
  );
}

function BadgeSiret({ siretDocument, siretArtisan }) {
  if (!siretDocument || !siretArtisan) return null;
  return siretCorrespond(siretDocument, siretArtisan) ? (
    <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">SIRET conforme</Badge>
  ) : (
    <Badge variant="destructive">SIRET différent</Badge>
  );
}

export function AttestationsTab({ soustraitantId, siretArtisan = '', decennaleNonRequise = false, urssafNonRequise = false }) {
  const { toast } = useToast();
  const { attestations: toutes = [], addAttestation, deleteAttestation } = useSousTraitant();
  const [ajout, setAjout] = useState(null); // 'decennale' | 'urssaf' | null
  const [form, setForm] = useState(FORM_VIDE);
  const [saving, setSaving] = useState(false);
  const [lecture, setLecture] = useState(false); // lecture du PDF en cours
  const [historiqueOuvert, setHistoriqueOuvert] = useState({ decennale: false, urssaf: false });

  const attestations = toutes.filter((a) => a.soustraitant_id === soustraitantId);
  const decennales = attestations
    .filter((a) => a.type === 'decennale')
    .sort((a, b) => b.date_fin.localeCompare(a.date_fin));
  const urssafs = attestations
    .filter((a) => a.type === 'urssaf')
    .sort((a, b) => b.date_attestation.localeCompare(a.date_attestation));

  // En cours : décennales valides ou à venir (sinon la plus récente) ; URSSAF : la plus récente.
  // Les autres sont rangées dans l'historique.
  const aujourdhui = format(new Date(), 'yyyy-MM-dd');
  const nonExpirees = decennales.filter((a) => a.date_fin >= aujourdhui);
  const decennalesCourantes = nonExpirees.length > 0 ? nonExpirees : decennales.slice(0, 1);
  const decennalesHistorique = decennales.filter((a) => !decennalesCourantes.includes(a));
  const [urssafCourante, ...urssafsHistorique] = urssafs;

  const ouvrirAjout = (type) => {
    setForm(FORM_VIDE);
    setAjout(type);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Pré-remplit le formulaire depuis le PDF (URSSAF : date, code, SIRET ;
  // décennale : assureur, période, n° de police, SIRET). Les champs restent modifiables.
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0] || null;
    setForm((prev) => ({ ...prev, file }));
    if (!file || file.type !== 'application/pdf') return;

    setLecture(true);
    try {
      let trouves;
      let siretLu;
      if (ajout === 'urssaf') {
        const infos = await lireAttestationUrssaf(file);
        setForm((prev) => ({
          ...prev,
          date_attestation: infos.dateAttestation || prev.date_attestation,
          code_securite: infos.codeSecurite || prev.code_securite,
          siret: infos.siret || prev.siret,
        }));
        trouves = [infos.dateAttestation, infos.codeSecurite, infos.siret];
        siretLu = infos.siret;
      } else {
        const infos = await lireAttestationDecennale(file);
        setForm((prev) => ({
          ...prev,
          assureur: infos.assureur || prev.assureur,
          numero_police: infos.numeroPolice || prev.numero_police,
          date_debut: infos.dateDebut || prev.date_debut,
          date_fin: infos.dateFin || prev.date_fin,
          siret: infos.siret || prev.siret,
        }));
        trouves = [infos.assureur, infos.numeroPolice, infos.dateDebut, infos.siret];
        siretLu = infos.siret;
      }

      const nbTrouves = trouves.filter(Boolean).length;
      if (nbTrouves === 0) {
        toast({ title: 'Lecture impossible', description: 'Aucune information trouvée dans le PDF (scan ?). Saisissez-les à la main.' });
      } else if (siretLu && siretArtisan && !siretCorrespond(siretLu, siretArtisan)) {
        toast({
          title: '⚠️ SIRET différent',
          description: `Attestation : ${siretLu} — Artisan : ${normaliserSiret(siretArtisan)}`,
          variant: 'destructive',
        });
      } else if (nbTrouves < trouves.length) {
        toast({ title: 'Lecture partielle', description: 'Complétez les champs vides et vérifiez les informations.' });
      }
    } catch (err) {
      console.error('❌ Lecture attestation :', err);
      toast({ title: 'Lecture impossible', description: 'Saisissez les informations à la main.' });
    } finally {
      setLecture(false);
    }
  };

  const copier = async (texte) => {
    try {
      await navigator.clipboard.writeText(texte);
      toast({ title: 'Code copié ✅', description: texte });
    } catch {
      toast({ title: 'Copie impossible', description: texte, variant: 'destructive' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (ajout === 'decennale' && form.date_fin < form.date_debut) {
      toast({ title: 'Erreur', description: 'La date de fin est antérieure à la date de début', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      await addAttestation(
        {
          soustraitant_id: soustraitantId,
          type: ajout,
          ...(ajout === 'decennale'
            ? {
                assureur: form.assureur.trim(),
                numero_police: form.numero_police.trim() || null,
                date_debut: form.date_debut,
                date_fin: form.date_fin,
              }
            : {
                date_attestation: form.date_attestation,
                code_securite: form.code_securite.trim().toUpperCase() || null,
              }),
          siret: normaliserSiret(form.siret) || null,
        },
        form.file
      );
      setAjout(null);
      toast({ title: ajout === 'decennale' ? 'Décennale ajoutée ✅' : 'Attestation URSSAF ajoutée ✅' });
    } catch (err) {
      toast({ title: 'Erreur', description: err.message || "Impossible d'enregistrer", variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (attestation) => {
    const libelle = attestation.type === 'decennale'
      ? `la décennale ${attestation.assureur} (${formatDate(attestation.date_debut)} → ${formatDate(attestation.date_fin)})`
      : `l'attestation URSSAF du ${formatDate(attestation.date_attestation)}`;
    if (!window.confirm(`Supprimer ${libelle} ?`)) return;

    try {
      await deleteAttestation(attestation);
      toast({ title: 'Supprimée ✅' });
    } catch (err) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  const BoutonsLigne = ({ attestation }) => (
    <div className="flex gap-1 flex-shrink-0">
      {attestation.storage_path && (
        <Button
          size="icon"
          variant="ghost"
          title={attestation.nom_fichier || 'Voir le fichier'}
          onClick={() => openStorageFile(attestation.storage_path, { bucket: BUCKET })}
        >
          <Eye className="h-4 w-4" />
        </Button>
      )}
      <Button size="icon" variant="ghost" title="Supprimer" onClick={() => handleDelete(attestation)}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );

  // ─── Lignes d'attestation (version discrète dans l'historique) ───
  const LigneDecennale = (a, discret = false) => (
    <div key={a.id} className={cn('flex items-center justify-between gap-3 p-3 border rounded-md', discret && 'bg-muted/30 opacity-80')}>
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">{a.assureur}</span>
          {!decennaleNonRequise && (a.date_debut > aujourdhui
            ? <Badge variant="secondary">À venir</Badge>
            : <BadgeValidite valide={isDecennaleValide(a)} />)}
          <BadgeSiret siretDocument={a.siret} siretArtisan={siretArtisan} />
        </div>
        {a.numero_police && <p className="text-sm text-muted-foreground truncate">Police n° {a.numero_police}</p>}
        <p className="text-sm text-muted-foreground">
          Du {formatDate(a.date_debut)} au {formatDate(a.date_fin)}
        </p>
        {a.siret && <p className="text-sm text-muted-foreground">SIRET : {a.siret}</p>}
      </div>
      <BoutonsLigne attestation={a} />
    </div>
  );

  const LigneUrssaf = (a, discret = false) => (
    <div key={a.id} className={cn('flex items-center justify-between gap-3 p-3 border rounded-md', discret && 'bg-muted/30 opacity-80')}>
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">Attestation du {formatDate(a.date_attestation)}</span>
          {!urssafNonRequise && <BadgeValidite valide={isUrssafValide(a)} />}
          <BadgeSiret siretDocument={a.siret} siretArtisan={siretArtisan} />
        </div>
        {a.code_securite && (
          <div className="flex items-center gap-1 text-sm">
            <span className="text-muted-foreground">Code de sécurité :</span>
            <span className="font-mono">{a.code_securite}</span>
            <Button size="icon" variant="ghost" className="h-7 w-7" title="Copier le code" onClick={() => copier(a.code_securite)}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
        {a.siret && <p className="text-sm text-muted-foreground">SIRET : {a.siret}</p>}
        <p className="text-sm text-muted-foreground">Valable {URSSAF_VALIDITE_MOIS} mois</p>
      </div>
      <BoutonsLigne attestation={a} />
    </div>
  );

  // Dossier « Historique » replié : anciennes attestations
  const Historique = (type, liste, ligne) => {
    if (liste.length === 0) return null;
    const ouvert = historiqueOuvert[type];
    return (
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setHistoriqueOuvert((prev) => ({ ...prev, [type]: !prev[type] }))}
          className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          {ouvert ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <FolderOpen className="h-4 w-4" />Historique ({liste.length})
        </button>
        {ouvert && <div className="mt-2 space-y-2">{liste.map((a) => ligne(a, true))}</div>}
      </div>
    );
  };

  const AlerteSiret = () =>
    form.siret && siretArtisan && !siretCorrespond(form.siret, siretArtisan) && (
      <div className="sm:col-span-2 p-2 rounded-md bg-red-50 border border-red-200 text-sm text-red-800 flex gap-2">
        <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
        Le SIRET de l'attestation ne correspond pas à celui de l'artisan ({normaliserSiret(siretArtisan)}).
      </div>
    );

  const FormulaireAjout = () => (
    <form onSubmit={handleSubmit} className="space-y-3 p-4 border rounded-md bg-muted/30">
      {ajout === 'decennale' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="assureur">Compagnie d'assurance <span className="text-red-500">*</span></Label>
            <Input id="assureur" name="assureur" value={form.assureur} onChange={handleChange} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="numero_police">N° de police</Label>
            <Input id="numero_police" name="numero_police" value={form.numero_police} onChange={handleChange} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="date_debut">Début de validité <span className="text-red-500">*</span></Label>
            <Input id="date_debut" name="date_debut" type="date" value={form.date_debut} onChange={handleChange} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="date_fin">Fin de validité <span className="text-red-500">*</span></Label>
            <Input id="date_fin" name="date_fin" type="date" value={form.date_fin} onChange={handleChange} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="siret">SIRET de l'attestation</Label>
            <Input id="siret" name="siret" value={form.siret} onChange={handleChange} />
          </div>
          {AlerteSiret()}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="date_attestation">Date de l'attestation <span className="text-red-500">*</span></Label>
            <Input id="date_attestation" name="date_attestation" type="date" value={form.date_attestation} onChange={handleChange} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="code_securite">Code de sécurité</Label>
            <Input id="code_securite" name="code_securite" value={form.code_securite} onChange={handleChange} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="siret">SIRET de l'attestation</Label>
            <Input id="siret" name="siret" value={form.siret} onChange={handleChange} />
          </div>
          {AlerteSiret()}
        </div>
      )}
      <div className="space-y-1">
        <Label htmlFor="file">Fichier (PDF : informations remplies automatiquement, à vérifier)</Label>
        <Input
          id="file"
          type="file"
          accept=".pdf,image/*"
          onChange={handleFileChange}
        />
        {lecture && (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />Lecture de l'attestation…
          </p>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => setAjout(null)}>
          <X className="mr-2 h-4 w-4" />Annuler
        </Button>
        <Button type="submit" disabled={saving || lecture}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Button>
      </div>
    </form>
  );


  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* DÉCENNALES */}
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />Décennales
          </CardTitle>
          {ajout !== 'decennale' && (
            <Button size="sm" onClick={() => ouvrirAjout('decennale')}>
              <Plus className="mr-2 h-4 w-4" />Ajouter
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {decennaleNonRequise && (
            <p className="text-sm p-3 rounded-md bg-slate-50 border text-muted-foreground">
              Décennale non requise pour cet artisan : elle n'est pas contrôlée.
            </p>
          )}
          {ajout === 'decennale' && FormulaireAjout()}
          {decennales.length === 0 && ajout !== 'decennale' && !decennaleNonRequise && (
            <p className="text-center py-6 text-muted-foreground">Aucune décennale enregistrée</p>
          )}
          {decennalesCourantes.map((a) => LigneDecennale(a))}
          {Historique('decennale', decennalesHistorique, LigneDecennale)}
        </CardContent>
      </Card>

      {/* URSSAF */}
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-primary" />Attestations URSSAF
          </CardTitle>
          {ajout !== 'urssaf' && (
            <Button size="sm" onClick={() => ouvrirAjout('urssaf')}>
              <Plus className="mr-2 h-4 w-4" />Ajouter
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <a
            href={URL_VERIFICATION_URSSAF}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" />Vérification URSSAF
          </a>
          {urssafNonRequise && (
            <p className="text-sm p-3 rounded-md bg-slate-50 border text-muted-foreground">
              URSSAF non requise pour cet artisan : elle n'est pas contrôlée.
            </p>
          )}
          {ajout === 'urssaf' && FormulaireAjout()}
          {urssafs.length === 0 && ajout !== 'urssaf' && !urssafNonRequise && (
            <p className="text-center py-6 text-muted-foreground">Aucune attestation URSSAF enregistrée</p>
          )}
          {urssafCourante && LigneUrssaf(urssafCourante)}
          {Historique('urssaf', urssafsHistorique, LigneUrssaf)}
        </CardContent>
      </Card>
    </div>
  );
}
