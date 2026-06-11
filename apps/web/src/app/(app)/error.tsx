"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-lg flex-col items-center justify-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
        <AlertTriangle className="h-8 w-8 text-red-600" />
      </div>
      <h1 className="awc-title mt-5 text-3xl">Algo deu errado</h1>
      <p className="mt-2 text-sm text-slate-500">
        Não foi possível carregar esta página. Tente novamente — se o problema persistir, contate o administrador.
      </p>
      {error?.digest && <p className="mt-2 text-xs text-slate-400">Código do erro: {error.digest}</p>}
      <Button className="awc-btn-primary mt-6 font-bold" onClick={() => unstable_retry()}>
        <RotateCcw className="mr-2 h-4 w-4" />Tentar novamente
      </Button>
    </div>
  );
}
