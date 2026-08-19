'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  PenTool,
  RotateCcw,
  Check,
  ShieldCheck,
  Eraser,
  Sparkles,
  Info,
} from 'lucide-react';

interface SignatureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (dataUrl: string) => void;
  initialSignature?: string | null;
  signeeName?: string;
  signeeCrea?: string;
  documentTitle?: string;
}

export function SignatureModal({
  open,
  onOpenChange,
  onSave,
  initialSignature,
  signeeName,
  signeeCrea,
  documentTitle,
}: SignatureModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [strokeColor, setStrokeColor] = useState<'#0f172a' | '#0047AB' | '#1e293b'>('#0f172a');
  const pointsRef = useRef<{ x: number; y: number }[]>([]);

  // Setup High-DPI Canvas
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 2 : 2;

    const width = rect.width;
    const height = Math.max(220, rect.height);

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = strokeColor;

    // If there is an initial signature, draw it
    if (initialSignature) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        setHasDrawn(true);
      };
      img.src = initialSignature;
    } else {
      ctx.clearRect(0, 0, width, height);
      setHasDrawn(false);
    }
  }, [initialSignature, strokeColor]);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        setupCanvas();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open, setupCanvas]);

  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleStart = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
    setIsDrawing(true);
    setHasDrawn(true);

    const pos = getCoordinates(e);
    pointsRef.current = [pos];

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = strokeColor;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 1.3, 0, Math.PI * 2);
    ctx.fillStyle = strokeColor;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const handleMove = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getCoordinates(e);
    const points = pointsRef.current;
    points.push(pos);

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.6;

    if (points.length >= 3) {
      const p1 = points[points.length - 2];
      const p2 = points[points.length - 1];
      const midPoint = {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2,
      };
      ctx.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
      ctx.stroke();
    } else {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  };

  const handleEnd = (e?: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (e && 'preventDefault' in e) e.preventDefault();
    setIsDrawing(false);
    pointsRef.current = [];
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 2 : 2;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    setHasDrawn(false);
    pointsRef.current = [];
  };

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[94vw] sm:w-[620px] rounded-2xl p-0 overflow-hidden border-slate-200 shadow-2xl">
        {/* Header Profissional */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ff5a00] text-white shadow-md shadow-[#ff5a00]/30">
              <PenTool className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Assinatura Digital
                <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 ring-1 ring-emerald-400/30 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> Autenticado
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-300 mt-0.5">
                {documentTitle || 'Relatório Diário de Obra (RDO)'} • Preencha com mouse ou touch
              </DialogDescription>
            </div>
          </div>

          {/* Dados do Signatário */}
          {(signeeName || signeeCrea) && (
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-slate-200">
              <span className="font-semibold text-white">Responsável: {signeeName || 'Não informado'}</span>
              {signeeCrea && (
                <>
                  <span className="text-slate-400">•</span>
                  <span className="text-orange-200 font-mono">CREA: {signeeCrea}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Corpo com o Canvas de Assinatura */}
        <div className="p-6 bg-slate-50/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[#ff5a00]" />
              Quadro de Assinatura
            </span>
            <div className="flex items-center gap-2">
              {/* Seletor de cor da caneta */}
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
                {(['#0f172a', '#0047AB'] as const).map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      setStrokeColor(color);
                      const ctx = canvasRef.current?.getContext('2d');
                      if (ctx) ctx.strokeStyle = color;
                    }}
                    className={cn(
                      'h-5 w-5 rounded-md flex items-center justify-center transition-all',
                      strokeColor === color ? 'ring-2 ring-[#ff5a00] scale-105' : 'opacity-70 hover:opacity-100'
                    )}
                    style={{ backgroundColor: color }}
                    title={color === '#0f172a' ? 'Preto Grafite' : 'Azul Caneta'}
                  />
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClear}
                className="h-7 px-2 text-xs text-slate-600 hover:text-red-600 hover:bg-red-50 border-slate-200"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Limpar
              </Button>
            </div>
          </div>

          {/* Container do Canvas */}
          <div
            ref={containerRef}
            className="relative h-64 w-full rounded-xl border-2 border-dashed border-slate-300 bg-white shadow-inner overflow-hidden cursor-crosshair touch-none select-none transition-colors hover:border-[#ff5a00]/50"
          >
            <canvas
              ref={canvasRef}
              onMouseDown={handleStart}
              onMouseMove={handleMove}
              onMouseUp={handleEnd}
              onMouseLeave={handleEnd}
              onTouchStart={handleStart}
              onTouchMove={handleMove}
              onTouchEnd={handleEnd}
              className="w-full h-full block"
            />

            {/* Linha guia e marca d'água */}
            {!hasDrawn && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-slate-300 select-none">
                <PenTool className="h-8 w-8 mb-2 text-slate-300 opacity-60" />
                <p className="text-sm font-semibold text-slate-400">Assine com o mouse ou o dedo aqui</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Espaço amplo otimizado para celulares e tablets</p>
              </div>
            )}

            {/* Linha de base da assinatura */}
            <div className="pointer-events-none absolute bottom-8 left-8 right-8 flex items-center gap-2 select-none">
              <span className="text-xs font-serif font-bold text-slate-300 select-none">X</span>
              <div className="h-[1px] flex-1 bg-slate-200" />
              <span className="text-[10px] text-slate-300 uppercase tracking-widest font-mono">Linha de Base</span>
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <Info className="h-3.5 w-3.5 text-slate-400" />
              A assinatura será incorporada ao relatório diário e exportações PDF.
            </span>
            <span className={cn('font-semibold', hasDrawn ? 'text-emerald-600' : 'text-slate-400')}>
              {hasDrawn ? '✓ Traço capturado' : 'Aguardando traço...'}
            </span>
          </div>
        </div>

        {/* Rodapé com botões de ação */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-white px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10 border-slate-200 text-slate-600 text-sm font-medium"
          >
            Cancelar
          </Button>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClear}
              disabled={!hasDrawn}
              className="h-10 border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50"
            >
              <Eraser className="h-4 w-4 mr-1.5" />
              Limpar tela
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={!hasDrawn}
              className="h-10 bg-[#ff5a00] text-white hover:bg-[#ef5200] text-sm font-bold shadow-md shadow-[#ff5a00]/25 disabled:opacity-50"
            >
              <Check className="h-4 w-4 mr-1.5" />
              Salvar Assinatura
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
