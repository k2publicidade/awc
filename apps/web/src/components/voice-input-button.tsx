'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  className?: string;
  label?: string;
}

export function VoiceInputButton({
  onTranscript,
  className,
  label = 'Preencher usando a voz',
}: VoiceInputButtonProps) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<DynamicValue>(null);
  const onTranscriptRef = useRef(onTranscript);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    const SpeechRecognition =
      (window as DynamicValue).SpeechRecognition || (window as DynamicValue).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const supportTimer = window.setTimeout(() => setSupported(true), 0);

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event: DynamicValue) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      if (transcript) onTranscriptRef.current(transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    return () => {
      window.clearTimeout(supportTimer);
      recognition.abort();
    };
  }, []);

  if (!supported) return null;

  function toggle() {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    if (listening) {
      recognition.stop();
      setListening(false);
      return;
    }
    setListening(true);
    recognition.start();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={listening ? 'Parar transcrição' : label}
      title={listening ? 'Ouvindo… toque para parar' : label}
      className={cn(
        'inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100',
        listening
          ? 'animate-pulse border-red-200 bg-red-50 text-red-700'
          : 'border-orange-200 bg-orange-50 text-[#d94c09] hover:border-orange-300 hover:bg-orange-100',
        className
      )}
    >
      {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      <span>{listening ? 'Ouvindo…' : 'Ditar'}</span>
    </button>
  );
}
