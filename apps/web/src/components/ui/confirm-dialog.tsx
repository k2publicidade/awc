"use client";

import { useCallback, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

type ConfirmOptions = {
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

export function useConfirm() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<(value: boolean) => void>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => { resolver.current = resolve; });
  }, []);

  const close = useCallback((value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  }, []);

  const dialog = (
    <Dialog open={options !== null} onOpenChange={(open) => { if (!open) close(false); }}>
      <DialogContent className="max-w-md rounded-[10px]">
        <DialogHeader>
          <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-red-50">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <DialogTitle className="font-heading text-xl font-bold uppercase tracking-tight text-[#17212b]">
            {options?.title || "Confirmar exclusão"}
          </DialogTitle>
          <DialogDescription className="text-[13px] text-[#66717d]">
            {options?.description || "Esta ação não pode ser desfeita."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" className="rounded-[5px] font-bold" onClick={() => close(false)}>
            {options?.cancelLabel || "Cancelar"}
          </Button>
          <Button type="button" className="rounded-[5px] bg-red-600 font-bold text-white hover:bg-red-700" onClick={() => close(true)}>
            {options?.confirmLabel || "Excluir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { confirm, dialog };
}
