import type { Metadata } from 'next';
import { LandingPage } from '@/components/landing/landing-page';

export const metadata: Metadata = {
  title: 'RIGOR | Gestão de obras do canteiro à diretoria',
  description:
    'Centralize planejamento, RDO, custos, materiais, qualidade, segurança e documentos em uma plataforma criada para a construção civil.',
  keywords: [
    'gestão de obras',
    'software para construção civil',
    'RDO digital',
    'controle de obras',
    'cronograma de obras',
  ],
  openGraph: {
    title: 'RIGOR | Controle real para obras reais',
    description:
      'Uma operação conectada para planejar, executar e acompanhar cada obra com clareza.',
    type: 'website',
    locale: 'pt_BR',
    siteName: 'RIGOR',
  },
};

export default function HomePage() {
  return <LandingPage />;
}
