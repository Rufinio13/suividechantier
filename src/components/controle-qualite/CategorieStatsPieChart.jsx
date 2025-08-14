import React from 'react';
import { motion } from 'framer-motion';

const PieChart = ({ data, size = 100 }) => {
  if (!data || data.length === 0) {
    return <div className="text-xs text-muted-foreground">Données indisponibles</div>;
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) {
    return <div className="text-xs text-muted-foreground">Aucun point de contrôle renseigné.</div>;
  }

  let accumulatedPercentage = 0;

  return (
    <div className="relative flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        {data.map((item, index) => {
          if (item.value === 0) return null;
          const percentage = (item.value / total) * 100;
          const dashArray = (percentage / 100) * (Math.PI * (size * 0.8)); // Circumference of circle with radius 40 (80% of size/2)
          const dashOffset = accumulatedPercentage / 100 * (Math.PI * (size * 0.8));
          accumulatedPercentage += percentage;

          return (
            <motion.circle
              key={index}
              cx={size / 2}
              cy={size / 2}
              r={(size * 0.8) / 2}
              fill="transparent"
              stroke={item.color}
              strokeWidth={size * 0.2} // Thickness of the pie slice (20% of size)
              strokeDasharray={`${dashArray} ${Math.PI * (size * 0.8)}`}
              strokeDashoffset={-dashOffset}
              initial={{ strokeDashoffset: Math.PI * (size * 0.8) }}
              animate={{ strokeDashoffset: -dashOffset }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            />
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1">
        {data.map((item, index) => (
          item.value > 0 && (
            <div key={index} className="flex items-center text-xs">
              <span style={{ backgroundColor: item.color }} className="w-2.5 h-2.5 rounded-full mr-1.5"></span>
              {item.label}: {((item.value / total) * 100).toFixed(0)}%
            </div>
          )
        ))}
      </div>
    </div>
  );
};


export function CategorieStatsPieChart({ resultatsPoints, pointsControle }) {
  if (!pointsControle || pointsControle.length === 0) {
    return <p className="text-xs text-muted-foreground italic">Aucun point de contrôle défini pour cette catégorie.</p>;
  }

  const stats = { C: 0, NC: 0, SO: 0, Undefined: 0 };
  let totalPoints = pointsControle.length;
  let definedPoints = 0;

  pointsControle.forEach(pc => {
    const resultatPoint = resultatsPoints[pc.id];
    if (resultatPoint && resultatPoint.resultat) {
      definedPoints++;
      if (resultatPoint.resultat === 'C') stats.C++;
      else if (resultatPoint.resultat === 'NC') stats.NC++;
      else if (resultatPoint.resultat === 'SO') stats.SO++;
      else stats.Undefined++; // Should not happen with current logic but good for safety
    } else {
      stats.Undefined++;
    }
  });
  
  if (definedPoints === 0 && totalPoints > 0) {
     return <p className="text-xs text-muted-foreground italic">Aucun résultat saisi pour les {totalPoints} point(s) de contrôle.</p>;
  }
  if (totalPoints === 0) {
     return <p className="text-xs text-muted-foreground italic">Aucun point de contrôle défini.</p>;
  }


  const chartData = [
    { label: 'Conforme', value: stats.C, color: '#22c55e' }, // green-500
    { label: 'Non Conforme', value: stats.NC, color: '#ef4444' }, // red-500
    { label: 'Sans Objet', value: stats.SO, color: '#6b7280' }, // gray-500
  ];
  
  // Only include 'Non Renseigné' if there are genuinely undefined points among those that should have results
  if (stats.Undefined > 0 && definedPoints < totalPoints) {
     chartData.push({ label: 'Non Renseigné', value: stats.Undefined, color: '#d1d5db' }); // gray-300
  }


  return <PieChart data={chartData.filter(d => d.value > 0)} size={120} />;
}