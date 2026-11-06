import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoEvabois from '@/assets/logo-evabois.png';

const VERT = [159, 199, 96]; // #9FC760 (charte EVAbois)

const chargerImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

/**
 * PDF « Liste des entreprises » remis à la réception d'une maison.
 *
 * @param {object}   params
 * @param {object[]} params.lignes           { corpsEtat, intervenant, codePostal, ville, telephone, mail, assureur, police }
 * @param {string}   params.nomFichier
 */
export async function genererListeEntreprisesPdf({ lignes, nomFichier }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marge = 12;

  // Logo
  try {
    const logo = await chargerImage(logoEvabois);
    const hauteur = 20;
    const largeur = (logo.width / logo.height) * hauteur;
    doc.addImage(logo, 'PNG', pageWidth - marge - largeur, 8, largeur, hauteur);
  } catch (err) {
    console.error('⚠️ Logo non chargé :', err);
  }

  // Titre
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...VERT);
  doc.text('LISTE DES ENTREPRISES', pageWidth / 2, 16, { align: 'center' });

  // Contrat, maître d'ouvrage (et signataire plus bas) : complétés à la main à la réception
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Contrat : …………………………………………', marge, 28);
  doc.text("Maître d'Ouvrage : …………………………………………", marge, 34);

  autoTable(doc, {
    startY: 40,
    margin: { left: marge, right: marge },
    head: [[
      "Corps d'état", 'INTERVENANTS', 'C.P', 'Ville', 'Téléphone', 'Mail', 'Compagnie assurance', 'N° police assurance',
    ]],
    body: lignes.map((l) => [
      l.corpsEtat, l.intervenant, l.codePostal, l.ville, l.telephone, l.mail, l.assureur, l.police,
    ]),
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0], overflow: 'linebreak' },
    headStyles: { fillColor: VERT, textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 42 },
      1: { fontStyle: 'italic', cellWidth: 36 },
      2: { fontStyle: 'italic', cellWidth: 14 },
      3: { fontStyle: 'italic', cellWidth: 38 },
      4: { fontStyle: 'italic', cellWidth: 26 },
      5: { fontStyle: 'italic', cellWidth: 50 },
      6: { fontStyle: 'italic', cellWidth: 30 },
      7: { fontStyle: 'italic', halign: 'right' },
    },
  });

  // Certification + signatures
  let y = doc.lastAutoTable.finalY + 10;
  if (y > doc.internal.pageSize.getHeight() - 40) {
    doc.addPage();
    y = 20;
  }
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(
    "Je soussigné, …………………………………, représentant du maître d'œuvre SARL EVAbois, certifie les informations reportées ci-dessus exactes.",
    marge, y, { maxWidth: pageWidth - 2 * marge }
  );
  doc.text('Fait à ………………………… le …………………………', marge, y + 10);

  doc.setFont('helvetica', 'italic');
  doc.text("Signature du Maître d'Ouvrage", marge, y + 22);
  doc.text('Signature du conducteur de travaux', pageWidth / 2 + 40, y + 22);

  doc.save(nomFichier);
}
