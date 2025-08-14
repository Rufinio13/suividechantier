import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HardHat, User, Phone, Mail, MapPin } from 'lucide-react';

export function ChantierCard({ chantier }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'En cours':
        return 'bg-blue-100 text-blue-800';
      case 'Planifié':
        return 'bg-yellow-100 text-yellow-800';
      case 'Réceptionné':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -5, boxShadow: "0px 10px 20px rgba(0,0,0,0.1)" }}
      className="card-hover h-full"
    >
      <Link to={`/chantiers/${chantier.id}`} className="h-full flex">
        <Card className="h-full w-full overflow-hidden border-2 hover:border-primary/50 transition-all flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <CardTitle className="text-lg font-bold text-primary truncate" title={chantier.nom}>
                {chantier.nom}
              </CardTitle>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(chantier.statut)}`}>
                {chantier.statut || 'N/D'}
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex-grow space-y-2.5">
            <div className="flex items-center text-sm">
              <User className="mr-2 h-4 w-4 text-gray-600 flex-shrink-0" />
              <span className="font-semibold text-gray-800 truncate" title={`${chantier.prenomClient || ''} ${chantier.nomClient || ''}`}>
                {chantier.prenomClient} {chantier.nomClient}
              </span>
            </div>
            <div className="flex items-start text-sm text-gray-600">
              <MapPin className="mr-2 h-4 w-4 mt-0.5 flex-shrink-0" />
              <span className="truncate" title={chantier.adresse}>{chantier.adresse}</span>
            </div>
            {chantier.telClient && (
              <div className="flex items-center text-sm text-gray-600">
                <Phone className="mr-2 h-4 w-4 flex-shrink-0" />
                <span className="truncate" title={chantier.telClient}>{chantier.telClient}</span>
              </div>
            )}
            {chantier.mailClient && (
              <div className="flex items-center text-sm text-gray-600">
                <Mail className="mr-2 h-4 w-4 flex-shrink-0" />
                <span className="truncate" title={chantier.mailClient}>{chantier.mailClient}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}