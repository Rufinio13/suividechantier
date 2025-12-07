// src/components/FournisseurCard.jsx
import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Phone, Mail, MapPin, Box, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FournisseurCard({ fournisseur, onEdit, onDelete }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -5, boxShadow: "0px 10px 20px rgba(0,0,0,0.1)" }}
      className="card-hover h-full"
    >
      <Card className="h-full w-full overflow-hidden border-2 hover:border-primary/50 transition-all flex flex-col">
        <CardHeader className="pb-3 flex justify-between items-start">
          <CardTitle className="text-lg font-bold text-primary truncate" title={fournisseur.nomsocieteF}>
            {fournisseur.nomsocieteF}
          </CardTitle>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" onClick={() => onEdit?.(fournisseur)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => onDelete?.(fournisseur.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-grow space-y-2.5 text-sm">
          {fournisseur.nomcontact && (
            <div className="flex items-center text-gray-600">
              <User className="mr-2 h-4 w-4 flex-shrink-0" />
              <span className="truncate" title={fournisseur.nomcontact}>{fournisseur.nomcontact}</span>
            </div>
          )}

          {fournisseur.adresse && (
            <div className="flex items-start text-gray-600">
              <MapPin className="mr-2 h-4 w-4 mt-0.5 flex-shrink-0" />
              <span className="truncate" title={fournisseur.adresse}>{fournisseur.adresse}</span>
            </div>
          )}

          {fournisseur.telephone && (
            <div className="flex items-center text-gray-600">
              <Phone className="mr-2 h-4 w-4 flex-shrink-0" />
              <span className="truncate" title={fournisseur.telephone}>{fournisseur.telephone}</span>
            </div>
          )}

          {fournisseur.email && (
            <div className="flex items-center text-gray-600">
              <Mail className="mr-2 h-4 w-4 flex-shrink-0" />
              <span className="truncate" title={fournisseur.email}>{fournisseur.email}</span>
            </div>
          )}

          {fournisseur.assignedlots?.length > 0 && (
            <div className="flex items-center text-gray-600">
              <Box className="mr-2 h-4 w-4 flex-shrink-0" />
              <span title={fournisseur.assignedlots.join(", ")}>
                Lots assignés: {fournisseur.assignedlots.join(", ")}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
