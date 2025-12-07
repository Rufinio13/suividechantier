import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin, Briefcase, Building2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function SousTraitantCard({ sousTraitant }) {
  const navigate = useNavigate();

  const getInitials = (name) => {
    if (!name) return "ST";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <motion.div
      onClick={() => navigate(`/sous-traitant-details/${sousTraitant.id}`)}
      whileHover={{ scale: 1.01 }}
      className="cursor-pointer"
    >
      <Card className="shadow-sm hover:shadow-md transition border rounded-2xl overflow-hidden">
        <CardHeader className="flex flex-row items-center space-x-4">
          <Avatar className="h-12 w-12 rounded-full bg-muted">
            <AvatarFallback>
              {getInitials(sousTraitant.nomsocieteST || sousTraitant.nomST)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              {sousTraitant.nomsocieteST}
            </CardTitle>
            {sousTraitant.nomST && (
              <p className="text-sm text-muted-foreground">
                {sousTraitant.PrenomST} {sousTraitant.nomST}
              </p>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-2 text-sm">
          {sousTraitant.assigned_lots?.length > 0 && (
            <div className="flex items-center">
              <Briefcase className="mr-3 h-4 w-4 text-muted-foreground" />
              <span className="truncate">{sousTraitant.assigned_lots.join(", ")}</span>
            </div>
          )}

          {sousTraitant.email && (
            <div className="flex items-center">
              <Mail className="mr-3 h-4 w-4 text-muted-foreground" />
              <span className="truncate">{sousTraitant.email}</span>
            </div>
          )}

          {sousTraitant.telephone && (
            <div className="flex items-center">
              <Phone className="mr-3 h-4 w-4 text-muted-foreground" />
              <span>{sousTraitant.telephone}</span>
            </div>
          )}

          {sousTraitant.adresseST && (
            <div className="flex items-start">
              <MapPin className="mr-3 h-4 w-4 text-muted-foreground mt-0.5" />
              <span className="line-clamp-2">{sousTraitant.adresseST}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
