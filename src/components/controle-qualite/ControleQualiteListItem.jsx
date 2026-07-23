import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, AlertCircle, HelpCircle, XCircle, CalendarPlus, Edit2 as EditIcon, Trash2, Save } from 'lucide-react';
import { PointControleFormModal } from '@/components/controle-qualite/PointControleFormModal';
import { ImageUploadCQ } from '@/components/controle-qualite/ImageUploadCQ';
import { useChantier } from '@/context/ChantierContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';
import { sendNotificationEmail, getArtisanEmailInfo } from '@/lib/sendNotificationEmail';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export function PointControleResultatItem({
  point, resultatData, chantierId, modeleId, domaineId, sousCategorieId,
  onResultatChange, onUpdatePointControle, onDeletePointControle, documents = []
}) {
  const [isExpanded, setIsExpanded] = useState(
    resultatData?.resultat === 'NC' || (resultatData?.resultat === 'C' && resultatData?.repriseValidee)
  );
  const [isPointFormModalOpen, setIsPointFormModalOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const { sousTraitants, taches, chantiers } = useChantier();
  const { user } = useAuth();

  const sousTraitantsDuChantier = useMemo(() => {
    const tachesChantier = taches.filter(t => t.chantierid === chantierId && t.assignetype === 'soustraitant');
    const artisanIds = [...new Set(tachesChantier.map(t => t.assigneid))];
    return sousTraitants.filter(st => artisanIds.includes(st.id));
  }, [taches, sousTraitants, chantierId]);

  const resultatOptions = [{ value: 'C', label: 'C' }, { value: 'NC', label: 'NC' }, { value: 'SO', label: 'SO' }];

  const currentData = resultatData || {
    resultat: '', explicationNC: '', photos: [], plans: [],
    dateReprisePrevisionnelle: '', repriseValidee: false, soustraitant_id: '',
  };

  const formatDateTime = (d) => { try { return format(parseISO(d), 'dd/MM/yyyy HH:mm', { locale: fr }); } catch { return 'N/A'; } };
  const formatDateOnly = (d) => { try { return format(parseISO(d), 'dd MMM yyyy', { locale: fr }); } catch { return 'N/A'; } };

  const handleResultatButtonClick = (value) => {
    const newValue = currentData.resultat === value ? '' : value;
    onResultatChange(point.id, newValue, currentData.explicationNC, currentData.photos, currentData.plans, currentData.dateReprisePrevisionnelle, currentData.repriseValidee, currentData.soustraitant_id);
    setIsExpanded(newValue === 'NC' || (newValue === 'C' && currentData.repriseValidee));
    if (newValue !== 'NC') setEmailSent(false);
  };

  const handleChange = (field, value) => {
    const updatedData = { ...currentData, [field]: value };
    onResultatChange(point.id, updatedData.resultat, updatedData.explicationNC, updatedData.photos, updatedData.plans, updatedData.dateReprisePrevisionnelle, updatedData.repriseValidee, updatedData.soustraitant_id);
  };

  const handleDeletePoint = (e) => {
    e.stopPropagation();
    if (window.confirm(`Supprimer "${point.libelle}" ?`)) onDeletePointControle(modeleId, domaineId, sousCategorieId, point.id);
  };

  const handleEnregistrerNC = async () => {
    setIsSending(true);
    try {
      const chantier = chantiers.find(c => c.id === chantierId);
      const chantierNom = chantier?.nomchantier || 'Chantier';
      const { data: expediteur } = await supabase.from('profiles')
        .select('nom, prenom, mail, tel, nomsociete, adresse, ville, code_postal').eq('id', user.id).single();

      if (currentData.soustraitant_id) {
        const artisan = sousTraitants.find(st => st.id === currentData.soustraitant_id);
        const destinataire = await getArtisanEmailInfo(artisan, supabase);

        if (destinataire?.email) {
          await sendNotificationEmail('non_conformite', destinataire.email, {
            artisanPrenom: destinataire.prenom, aCompte: destinataire.aCompte,
            pointControle: point.libelle, chantierNom,
            description: currentData.explicationNC || null,
            photos: currentData.photos || [], plans: currentData.plans || [],
            dateReprise: currentData.dateReprisePrevisionnelle
              ? format(parseISO(currentData.dateReprisePrevisionnelle), 'dd/MM/yyyy', { locale: fr }) : null,
            expediteur,
          });
        }
      }
      setEmailSent(true);
    } catch (error) {
      console.error('❌ Erreur enregistrement NC:', error);
      alert('Erreur lors de l\'enregistrement.');
    } finally { setIsSending(false); }
  };

  return (
    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="p-3 border rounded-md bg-slate-50 hover:shadow-sm transition-shadow">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div className="flex-grow mb-2 sm:mb-0 min-w-0">
          <div className="flex items-center flex-wrap gap-x-1">
            <p className="text-sm font-medium text-slate-800 break-words min-w-0">{point.libelle}</p>
            <div className="flex items-center flex-shrink-0">
              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setIsPointFormModalOpen(true); }} className="h-6 w-6 ml-1 text-slate-500 hover:text-slate-700"><EditIcon size={14} /></Button>
              <Button variant="ghost" size="icon" onClick={handleDeletePoint} className="h-6 w-6 ml-1 text-red-400 hover:text-red-600"><Trash2 size={14} /></Button>
            </div>
          </div>
          {point.description && <p className="text-xs text-slate-500 mt-0.5">{point.description}</p>}
        </div>
        <div className="flex-shrink-0 flex items-center space-x-1.5">
          {resultatOptions.map(opt => (
            <Button key={opt.value} variant={currentData.resultat === opt.value ? 'default' : 'outline'} size="sm"
              onClick={() => handleResultatButtonClick(opt.value)}
              className={`min-w-[50px] transition-all duration-150 ease-in-out ${currentData.resultat === opt.value
                ? (opt.value === 'C' ? 'bg-green-500 hover:bg-green-600' : opt.value === 'NC' ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-500 hover:bg-gray-600') + ' text-white'
                : 'text-slate-700 hover:bg-slate-100'}`}>
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (currentData.resultat === 'NC' || (currentData.resultat === 'C' && currentData.repriseValidee)) && (
          <motion.div initial={{ opacity: 0, height: 0, marginTop: 0 }} animate={{ opacity: 1, height: 'auto', marginTop: '0.75rem' }} exit={{ opacity: 0, height: 0, marginTop: 0 }} className="space-y-4 pt-3 border-t border-slate-200">
            {currentData.resultat === 'C' && currentData.repriseValidee && (
              <div className="p-3 bg-green-50 border border-green-300 rounded-md">
                <div className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-600" /><p className="text-sm font-semibold text-green-800">✅ Reprise validée - Point passé en Conforme</p></div>
                <p className="text-xs text-green-700 mt-1">L'historique de la non-conformité est conservé ci-dessous.</p>
              </div>
            )}
            {currentData.artisan_repris && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md space-y-2">
                <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-yellow-700" /><p className="text-xs font-semibold text-yellow-800">Reprise marquée par l'artisan le {formatDateTime(currentData.artisan_repris_date)}</p></div>
                {currentData.artisan_repris_commentaire && <div><p className="text-xs font-medium text-slate-700">Commentaire :</p><p className="text-sm text-slate-800">{currentData.artisan_repris_commentaire}</p></div>}
                {currentData.artisan_repris_photos?.length > 0 && (
                  <div><p className="text-xs font-medium text-slate-700 mb-1">Photos de reprise :</p>
                    <div className="flex gap-2 flex-wrap">{currentData.artisan_repris_photos.map((photo, i) => <img key={i} src={photo.url || photo} alt={`Reprise ${i + 1}`} className="h-20 w-20 object-cover rounded border cursor-pointer hover:opacity-80" onClick={() => window.open(photo.url || photo, '_blank')} />)}</div>
                  </div>
                )}
              </div>
            )}
            <div>
              <Label htmlFor={`explicationNC-${point.id}`} className="text-xs font-medium text-slate-700">Description de la non-conformité</Label>
              <Textarea id={`explicationNC-${point.id}`} value={currentData.explicationNC || ''} onChange={(e) => handleChange('explicationNC', e.target.value)} placeholder="Décrivez la non-conformité..." rows={2} className="mt-1 text-sm" disabled={currentData.resultat === 'C'} />
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-700">Photos NC</Label>
              <ImageUploadCQ images={currentData.photos || []} onImagesChange={(v) => handleChange('photos', v)} chantierId={chantierId} disabled={currentData.resultat === 'C'} />
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-700">Plans annotés</Label>
              <ImageUploadCQ images={currentData.plans || []} onImagesChange={(v) => handleChange('plans', v)} chantierId={chantierId} label="plan" disabled={currentData.resultat === 'C'} />
            </div>
            <div>
              <Label htmlFor={`dateReprisePrevisionnelle-${point.id}`} className="text-xs font-medium text-slate-700 flex items-center">
                <CalendarPlus size={12} className="mr-1.5 text-slate-500" /> Date de reprise au plus tard
              </Label>
              <Input id={`dateReprisePrevisionnelle-${point.id}`} type="date" value={currentData.dateReprisePrevisionnelle || ''} onChange={(e) => handleChange('dateReprisePrevisionnelle', e.target.value)} className="mt-1 text-sm" disabled={currentData.resultat === 'C'} />
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-700">Sous-traitant concerné</Label>
              <Select value={currentData.soustraitant_id || ''} onValueChange={(v) => handleChange('soustraitant_id', v)} disabled={currentData.resultat === 'C'}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner un artisan..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Aucun</SelectItem>
                  {sousTraitantsDuChantier.map(st => <SelectItem key={st.id} value={st.id}>{st.nomsocieteST || `${st.PrenomST} ${st.nomST}`}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {currentData.date_intervention_artisan && (
              <div className="p-2 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-xs text-blue-700">📅 <strong>Intervention prévue le :</strong> {formatDateOnly(currentData.date_intervention_artisan)}</p>
              </div>
            )}
            {currentData.resultat === 'NC' && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-200">
                <div className="flex items-center space-x-2 min-w-0">
                  <input type="checkbox" id={`repriseValidee-${point.id}`} checked={currentData.repriseValidee || false}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onResultatChange(point.id, 'C', currentData.explicationNC, currentData.photos, currentData.plans, currentData.dateReprisePrevisionnelle, true, currentData.soustraitant_id);
                      } else { handleChange('repriseValidee', false); }
                    }}
                    className="h-4 w-4 flex-shrink-0 text-primary border-gray-300 rounded focus:ring-primary" />
                  <Label htmlFor={`repriseValidee-${point.id}`} className="text-xs font-medium text-slate-700 cursor-pointer">Reprise validée (passe en Conforme)</Label>
                </div>
                {emailSent ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-md self-start sm:self-auto">
                    <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <span className="text-xs text-green-700 font-medium whitespace-nowrap">
                      {currentData.soustraitant_id ? 'Artisan notifié ✅' : 'NC enregistrée ✅'}
                    </span>
                  </div>
                ) : (
                  <Button onClick={handleEnregistrerNC} disabled={isSending} size="sm"
                    className="text-white border-0 whitespace-nowrap flex-shrink-0 self-start sm:self-auto" style={{ background: '#E05050' }}>
                    <Save className="mr-1.5 h-3.5 w-3.5" />
                    {isSending ? 'Envoi...' : currentData.soustraitant_id ? 'Enregistrer et notifier' : 'Enregistrer'}
                  </Button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {isPointFormModalOpen && (
        <PointControleFormModal isOpen={isPointFormModalOpen} onClose={() => setIsPointFormModalOpen(false)}
          point={point} modeleId={modeleId} domaineId={domaineId} sousCategorieId={sousCategorieId}
          onSave={(data) => { onUpdatePointControle(modeleId, domaineId, sousCategorieId, point.id, data); setIsPointFormModalOpen(false); }} />
      )}
    </motion.div>
  );
}