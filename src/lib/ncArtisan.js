// Nombre de non-conformités non levées attribuées à un artisan sur un chantier.
// Ignore les catégories, sous-catégories et points supprimés du contrôle.
export function compterNCArtisan(controles, modelesCQ, chantierId, soustraitantId) {
  if (!soustraitantId || !controles || !modelesCQ) return 0;

  let count = 0;
  const estNCOuverte = (resultatPoint) =>
    resultatPoint?.resultat === 'NC' &&
    resultatPoint.soustraitant_id === soustraitantId &&
    !resultatPoint.repriseValidee;

  controles
    .filter(c => c.chantier_id === chantierId)
    .forEach(ctrl => {
      const modele = modelesCQ.find(m => m.id === ctrl.modele_cq_id);
      if (!modele) return;
      const supprimes = ctrl.controles_supprimes || {};
      const categoriesSupprimees = supprimes.categories || [];

      // 1. NC du modèle de base
      if (ctrl.resultats) {
        Object.entries(ctrl.resultats).forEach(([categorieId, resultatsCategorie]) => {
          const categorie = modele.categories?.find(c => c.id === categorieId);
          if (!categorie || categoriesSupprimees.includes(categorieId)) return;

          Object.entries(resultatsCategorie).forEach(([sousCategorieId, resultatsSousCategorie]) => {
            const sousCategorie = categorie.sousCategories?.find(sc => sc.id === sousCategorieId);
            if (!sousCategorie) return;
            if ((supprimes.sous_categories?.[categorieId] || []).includes(sousCategorieId)) return;

            Object.entries(resultatsSousCategorie).forEach(([pointControleId, resultatPoint]) => {
              if ((supprimes.points?.[categorieId]?.[sousCategorieId] || []).includes(pointControleId)) return;
              if (estNCOuverte(resultatPoint) && sousCategorie.pointsControle?.some(pc => pc.id === pointControleId)) {
                count++;
              }
            });
          });
        });
      }

      // 2. NC des points spécifiques au chantier
      if (ctrl.points_specifiques) {
        Object.entries(ctrl.points_specifiques).forEach(([categorieId, categoriePoints]) => {
          if (categoriesSupprimees.includes(categorieId)) return;
          const categorie = modele.categories?.find(c => c.id === categorieId);

          Object.entries(categoriePoints).forEach(([sousCategorieKey, pointsMap]) => {
            const existe = sousCategorieKey === '_global' ||
              categorie?.sousCategories?.some(sc => sc.id === sousCategorieKey);
            if (!existe) return;
            if ((supprimes.sous_categories?.[categorieId] || []).includes(sousCategorieKey)) return;

            Object.keys(pointsMap).forEach(pointControleId => {
              if ((supprimes.points?.[categorieId]?.[sousCategorieKey] || []).includes(pointControleId)) return;
              if (estNCOuverte(ctrl.resultats?.[categorieId]?.[sousCategorieKey]?.[pointControleId])) count++;
            });
          });
        });
      }
    });

  return count;
}
