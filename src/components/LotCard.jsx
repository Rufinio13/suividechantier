import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Briefcase } from "lucide-react";

export function LotCard({ lot, onEdit, onDelete }) {
  // Initiales à partir du nom du lot
  const getInitials = (name) => {
    if (!name) return "L";
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <Card className="shadow-sm hover:shadow-md transition border rounded-2xl overflow-hidden">
      <CardHeader className="flex justify-between items-center">
        <CardTitle className="flex-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-bold">
              {getInitials(lot.lot)}
            </span>
            <span>{lot.lot}</span>
          </div>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-1 text-sm">
        {lot.description && (
          <div className="flex items-start gap-2">
            <Briefcase className="h-4 w-4 text-muted-foreground mt-0.5" />
            <span className="line-clamp-3">{lot.description}</span>
          </div>
        )}

        {lot.nomsociete && (
          <div className="pt-2 mt-2 border-t text-xs text-muted-foreground">
            Société : {lot.nomsociete}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
