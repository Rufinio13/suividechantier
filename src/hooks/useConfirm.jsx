import React, { useCallback, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

// Remplace window.confirm par une boîte de dialogue "Oui" / "Non".
// Usage : const { confirm, ConfirmDialog } = useConfirm();
//         const ok = await confirm("Voulez-vous continuer ?");
//         ... puis rendre {ConfirmDialog} dans le JSX du composant.
export function useConfirm() {
  const [state, setState] = useState({ open: false, title: "Confirmation", message: "" });
  const resolverRef = useRef(null);

  const confirm = useCallback((message, title = "Confirmation") => {
    setState({ open: true, title, message });
    return new Promise((resolve) => { resolverRef.current = resolve; });
  }, []);

  const handleResult = useCallback((result) => {
    setState((s) => ({ ...s, open: false }));
    if (resolverRef.current) { resolverRef.current(result); resolverRef.current = null; }
  }, []);

  const ConfirmDialog = (
    <AlertDialog open={state.open} onOpenChange={(open) => { if (!open) handleResult(false); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{state.title}</AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-line">{state.message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => handleResult(false)}>Non</AlertDialogCancel>
          <AlertDialogAction onClick={() => handleResult(true)}>Oui</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, ConfirmDialog };
}
