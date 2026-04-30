import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, FileSignature, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { SignatureCanvas } from '@/components/SignatureCanvas';
import { PDFDocument, rgb } from 'pdf-lib';

export function DocumentsArtisanTab({ chantierId, soustraitantId }) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [signatureData, setSignatureData] = useState(null);
  const [signing, setSigning] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      console.log('📥 Chargement documents pour chantier:', chantierId);
      
      const { data, error } = await supabase
        .from('documents_chantier')
        .select('*')
        .eq('chantier_id', chantierId)
        .or(`partage_type.eq.tous,artisan_id.eq.${soustraitantId}`)
        .order('created_at', { ascending: false});

      if (error) throw error;
      
      console.log('📄 Documents chargés:', data?.length, 'documents');
      
      setDocuments(data || []);
    } catch (error) {
      console.error('Erreur:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les documents',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [chantierId, soustraitantId]);

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(0)} Ko` : `${mb.toFixed(1)} Mo`;
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: fr });
    } catch {
      return dateString;
    }
  };

  const marquerDocumentVu = async (documentId) => {
    try {
      console.log('📝 Marquage document comme vu:', documentId);
      
      const { data: doc, error: fetchError } = await supabase
        .from('documents_chantier')
        .select('artisans_vus')
        .eq('id', documentId)
        .single();

      if (fetchError) throw fetchError;

      const artisansVus = doc.artisans_vus || [];
      if (artisansVus.includes(soustraitantId)) {
        console.log('✓ Document déjà marqué comme vu');
        return;
      }

      const nouveauxArtisansVus = [...artisansVus, soustraitantId];

      const { error: updateError } = await supabase
        .from('documents_chantier')
        .update({ artisans_vus: nouveauxArtisansVus })
        .eq('id', documentId);

      if (updateError) throw updateError;

      console.log('✅ Document marqué comme vu');
      
      setTimeout(() => {
        loadDocuments();
      }, 500);
    } catch (error) {
      console.error('Erreur marquage document vu:', error);
    }
  };

  const handleViewDocument = async (doc) => {
    if (doc.necessite_signature && 
        doc.artisan_assigne_signature === soustraitantId && 
        doc.signature_statut === 'en_attente') {
      setSelectedDoc(doc);
      setSignatureData(null);
      
      try {
        const { data, error } = await supabase.storage
          .from('documents-chantiers')
          .download(doc.storage_path);

        if (error) throw error;

        const url = URL.createObjectURL(data);
        setPdfUrl(url);

      } catch (error) {
        console.error('Erreur chargement PDF:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de charger le document',
          variant: 'destructive',
        });
      }
    } else {
      const pathToDownload = (doc.signature_statut === 'signe' && doc.document_signe_url) 
        ? doc.document_signe_url 
        : doc.storage_path;

      console.log('📥 Téléchargement document:', pathToDownload);

      try {
        const { data, error } = await supabase.storage
          .from('documents-chantiers')
          .download(pathToDownload);

        if (error) {
          console.error('❌ Erreur téléchargement:', error);
          throw error;
        }

        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.nom_fichier;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (!doc.necessite_signature) {
          await marquerDocumentVu(doc.id);
        }

      } catch (error) {
        console.error('Erreur téléchargement document:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de télécharger le document',
          variant: 'destructive',
        });
      }
    }
  };

  const handleSignDocument = async () => {
    if (!signatureData || !selectedDoc) {
      toast({
        title: 'Signature requise',
        description: 'Veuillez dessiner votre signature',
        variant: 'destructive',
      });
      return;
    }

    setSigning(true);

    try {
      const { data: pdfBlob, error: downloadError } = await supabase.storage
        .from('documents-chantiers')
        .download(selectedDoc.storage_path);

      if (downloadError) throw downloadError;

      const arrayBuffer = await pdfBlob.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);

      const signatureImage = await pdfDoc.embedPng(signatureData);

      const pages = pdfDoc.getPages();
      const signatureWidth = 150;
      const signatureHeight = 50;

      const nomComplet = `${profile.prenom} ${profile.nom}`;
      const dateSignature = format(new Date(), "dd/MM/yyyy 'à' HH:mm", { locale: fr });

      pages.forEach((page) => {
        const { width } = page.getSize();

        const x = width - signatureWidth - 50;
        const y = 50;

        page.drawImage(signatureImage, {
          x,
          y,
          width: signatureWidth,
          height: signatureHeight,
        });

        const textX = x - 100;
        
        page.drawText(`Signé par: ${nomComplet}`, {
          x: textX,
          y: y + 30,
          size: 8,
          color: rgb(0, 0, 0),
        });

        page.drawText(`Date: ${dateSignature}`, {
          x: textX,
          y: y + 15,
          size: 8,
          color: rgb(0, 0, 0),
        });
      });

      const pdfBytes = await pdfDoc.save();
      const pdfFile = new Blob([pdfBytes], { type: 'application/pdf' });

      const timestamp = Date.now();
      const signedFileName = `signed_${timestamp}_${selectedDoc.nom_fichier}`;
      const signedPath = `signed/${signedFileName}`;

      console.log('📤 Upload PDF signé vers:', signedPath);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents-chantiers')
        .upload(signedPath, pdfFile, {
          contentType: 'application/pdf',
          upsert: false
        });

      if (uploadError) {
        console.error('❌ Erreur upload storage:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      console.log('✅ Upload réussi:', uploadData);

      console.log('📝 Mise à jour BDD document ID:', selectedDoc.id);
      
      const { error: updateError } = await supabase
        .from('documents_chantier')
        .update({
          signature_statut: 'signe',
          signature_artisan_date: new Date().toISOString(),
          signature_artisan_nom: nomComplet,
          document_signe_url: signedPath,
        })
        .eq('id', selectedDoc.id);

      if (updateError) {
        console.error('❌ Erreur update BDD:', updateError);
        throw updateError;
      }

      // ✅ NOUVEAU : Si c'est un marché de travaux, mettre à jour la table marches_travaux
      if (selectedDoc.type_document === 'marche_travaux') {
        console.log('📋 Mise à jour marches_travaux pour document ID:', selectedDoc.id);
        
        const { error: marcheError } = await supabase
          .from('marches_travaux')
          .update({
            date_signature: new Date().toISOString(),
          })
          .eq('document_id', selectedDoc.id);

        if (marcheError) {
          console.error('❌ Erreur update marches_travaux:', marcheError);
          // Ne pas bloquer si cette mise à jour échoue
        } else {
          console.log('✅ Date signature mise à jour dans marches_travaux');
        }
      }

      toast({
        title: 'Document signé ✅',
        description: 'Votre signature a été enregistrée avec succès',
      });

      setSelectedDoc(null);
      setPdfUrl(null);
      setSignatureData(null);
      
      setTimeout(async () => {
        await loadDocuments();
      }, 1000);

    } catch (error) {
      console.error('❌ Erreur signature complète:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de signer le document',
        variant: 'destructive',
      });
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (selectedDoc) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-orange-600" />
            Signature électronique
          </CardTitle>
          <p className="text-sm text-muted-foreground">{selectedDoc.nom_fichier}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {pdfUrl && (
            <div className="border rounded-lg overflow-hidden">
              <iframe
                src={pdfUrl}
                className="w-full h-[500px]"
                title="Aperçu document"
              />
            </div>
          )}

          <SignatureCanvas
            onSignatureCapture={setSignatureData}
            onClear={() => setSignatureData(null)}
          />

          <div className="p-3 bg-slate-50 border rounded-md text-xs text-slate-600">
            <p className="font-medium mb-1">En signant ce document :</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Vous certifiez avoir lu et accepté le contenu du document</li>
              <li>Votre signature sera horodatée et incluse dans le PDF</li>
              <li>Le document signé sera accessible au constructeur</li>
            </ul>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedDoc(null);
                setPdfUrl(null);
                setSignatureData(null);
              }}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSignDocument}
              disabled={!signatureData || signing}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              {signing ? 'Signature...' : 'Signer le document'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {documents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Aucun document disponible</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {documents.map((doc) => {
            const needsSignature = doc.necessite_signature && 
                                  doc.artisan_assigne_signature === soustraitantId && 
                                  doc.signature_statut === 'en_attente';

            const isNouveau = !doc.necessite_signature && 
                             (!doc.artisans_vus || !doc.artisans_vus.includes(soustraitantId));

            return (
              <Card 
                key={doc.id}
                className={needsSignature ? 'border-orange-300 bg-orange-50' : ''}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium">{doc.nom_fichier}</h3>
                          
                          {needsSignature && (
                            <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                              <FileSignature className="h-3 w-3" />
                              À signer
                            </span>
                          )}
                          
                          {isNouveau && (
                            <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              Nouveau
                            </span>
                          )}
                          
                          {doc.signature_statut === 'signe' && doc.artisan_assigne_signature === soustraitantId && (
                            <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Signé
                            </span>
                          )}
                        </div>
                        
                        <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                          <span>{doc.type_fichier?.toUpperCase()}</span>
                          {doc.taille_fichier && <span>{formatFileSize(doc.taille_fichier)}</span>}
                          <span>{format(new Date(doc.created_at), 'dd/MM/yyyy', { locale: fr })}</span>
                        </div>

                        {doc.signature_statut === 'signe' && doc.signature_artisan_nom && (
                          <p className="text-xs text-green-600 mt-2">
                            ✓ Signé le {formatDateTime(doc.signature_artisan_date)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {needsSignature ? (
                        <Button
                          onClick={() => handleViewDocument(doc)}
                          className="bg-orange-600 hover:bg-orange-700"
                        >
                          <FileSignature className="mr-2 h-4 w-4" />
                          Signer
                        </Button>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => handleViewDocument(doc)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}