'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  CalendarRange,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  CloudSun,
  Coins,
  FileCheck2,
  HardHat,
  Layers,
  Lock,
  Menu,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users2,
  UsersRound,
  WalletCards,
  X,
  Zap,
} from 'lucide-react';
import { SAAS_PLANS, type SaasPlan } from '@/lib/saas';
import { RigorLogo, RigorMark } from '@/components/ui/rigor-logo';
import styles from './landing-page.module.css';

type BillingCycle = 'monthly' | 'semiannual' | 'annual';
type MockupTab = 'curva' | 'rdo' | 'financeiro' | 'qualidade';

const cycles: Record<
  BillingCycle,
  { label: string; months: number; discount: number; badge?: string }
> = {
  monthly: { label: 'Mensal', months: 1, discount: 0 },
  semiannual: { label: 'Semestral', months: 6, discount: 0.05, badge: '5% OFF' },
  annual: { label: 'Anual', months: 12, discount: 0.15, badge: '15% OFF' },
};

const modulesList = [
  {
    icon: CalendarRange,
    title: 'Planejamento & Curva S',
    tag: 'GANTT EXECUTIVO',
    text: 'Estruture etapas, marcos críticos, avanço previsto vs realizado e caminho crítico com precisão matemática.',
  },
  {
    icon: ClipboardCheck,
    title: 'RDO Digital Inteligente',
    tag: 'CAMPO EM 3 MINUTOS',
    text: 'Diário de obra pelo celular com clima automático por GPS, efetivo por função, fotos carimbadas e assinatura digital.',
  },
  {
    icon: WalletCards,
    title: 'Financeiro & Medições',
    tag: 'CONTROLE DE CUSTOS',
    text: 'Boletins de medição, apropriação de despesas, fluxo de caixa por obra e saldo de contratos de empreiteiros.',
  },
  {
    icon: PackageCheck,
    title: 'Suprimentos & Estoque',
    tag: 'RASTREABILIDADE',
    text: 'Requisições de compra, controle de estoque no almoxarifado, conferência de entregas e prevenção de desvios.',
  },
  {
    icon: ShieldCheck,
    title: 'Qualidade & SST',
    tag: 'CONFORMIDADE TOTAL',
    text: 'Fichas de Verificação de Serviço (FVS), não conformidades com fotos e prazos, DDS e controle de EPIs.',
  },
  {
    icon: FileCheck2,
    title: 'Databook & GED Técnico',
    tag: 'SEGURANÇA JURÍDICA',
    text: 'Plantas, projetos executivos, memoriais descritivos e as-built organizados e versionados com histórico imutável.',
  },
];

const faqs = [
  {
    q: 'Quanto tempo leva para implantar o RIGOR na minha construtora?',
    a: 'A implantação do RIGOR é ágil e assistida. Em menos de 48 horas sua empresa já tem as primeiras obras configuradas, equipes cadastradas e encarregados registrando diários de obra no canteiro.',
  },
  {
    q: 'Consigo importar cronogramas e planilhas que já utilizo?',
    a: 'Sim. O RIGOR possui importador inteligente de planilhas Excel (.xlsx) e arquivos de cronograma. Nossa equipe também oferece suporte na migração da sua base de dados inicial.',
  },
  {
    q: 'O aplicativo funciona em canteiros com sinal de internet instável?',
    a: 'Sim. O módulo de campo e RDO foi desenvolvido com tecnologia offline-first. O encarregado preenche o diário, tira fotos e registra o efetivo mesmo sem sinal, e tudo sincroniza automaticamente assim que houver conexão.',
  },
  {
    q: 'Como funciona a segurança e o isolamento dos dados da minha empresa?',
    a: 'Cada empresa possui um ambiente isolado com criptografia em repouso e em trânsito. Seus dados, relatórios e fotos pertencem exclusivamente à sua construtora e estão 100% adequados à LGPD.',
  },
  {
    q: 'Existe limite de armazenamento para fotos e documentos de obra?',
    a: 'Cada plano possui uma franquia generosa de armazenamento de alta performance. Além disso, as fotos enviadas no RDO são otimizadas automaticamente para manter máxima nitidez sem sobrecarregar a memória do celular.',
  },
  {
    q: 'Como é feito o treinamento da equipe de campo e escritório?',
    a: 'Disponibilizamos treinamentos rápidos em vídeo, manuais interativos e sessões ao vivo de onboarding com nossos especialistas em engenharia civil para garantir 100% de adesão da sua equipe.',
  },
];

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function LandingPage() {
  const [billing, setBilling] = useState<BillingCycle>('annual');
  const [activeTab, setActiveTab] = useState<MockupTab>('curva');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [menuOpen, setMenuOpen] = useState(false);

  // ROI Calculator States
  const [roiObras, setRoiObras] = useState(4);
  const [roiValorMedio, setRoiValorMedio] = useState(3000000);

  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';
  const appHref =
    (session?.user as DynamicValue)?.role === 'MASTER_ADMIN' ? '/master' : '/dashboard';

  // Cálculos do simulador de ROI
  const roiCalculations = useMemo(() => {
    const totalSobGestao = roiObras * roiValorMedio;
    const horasEconomizadas = roiObras * 28; // ~28 horas economizadas por obra/mês
    const reducaoRetrabalho = totalSobGestao * 0.024; // 2.4% de prevenção de desvios/ano
    const economiaHorasAno = horasEconomizadas * 12 * 95; // Custo hora técnica média R$ 95
    const economiaTotalAno = reducaoRetrabalho + economiaHorasAno;

    return {
      totalSobGestao,
      horasEconomizadas,
      economiaTotalAno,
    };
  }, [roiObras, roiValorMedio]);

  return (
    <main className={styles.page}>
      {/* ====================================================================
          HEADER
          ==================================================================== */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className="flex items-center" aria-label="RIGOR - Página inicial">
            <RigorLogo markSize={34} theme="dark" showTagline={true} taglineText="BUILT ON PRECISION" />
          </Link>

          <nav className={styles.desktopNav} aria-label="Navegação principal">
            <a href="#plataforma">Plataforma</a>
            <a href="#modulos">Módulos</a>
            <a href="#simulador">Simulador ROI</a>
            <a href="#como-funciona">Metodologia</a>
            <a href="#planos">Planos</a>
            <a href="#faq">FAQ</a>
          </nav>

          <div className={styles.headerActions}>
            <div className={styles.statusPill}>
              <span className={styles.statusDot} />
              <span>RIGOR v2.2</span>
            </div>

            {isAuthenticated ? (
              <Link href={appHref} className={styles.headerCta}>
                Acessar Painel <ArrowRight />
              </Link>
            ) : (
              <>
                <Link href="/login" className={styles.loginLink}>
                  Entrar
                </Link>
                <a href="#planos" className={styles.headerCta}>
                  Solicitar Demonstração <ArrowRight />
                </a>
              </>
            )}
          </div>

          <button
            type="button"
            className={styles.menuButton}
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {menuOpen && (
          <nav className={styles.mobileNav} aria-label="Navegação móvel">
            {[
              ['Plataforma', '#plataforma'],
              ['Módulos', '#modulos'],
              ['Simulador ROI', '#simulador'],
              ['Metodologia', '#como-funciona'],
              ['Planos', '#planos'],
              ['FAQ', '#faq'],
            ].map(([label, href]) => (
              <a key={href} href={href} onClick={() => setMenuOpen(false)}>
                {label}
              </a>
            ))}
            {isAuthenticated ? (
              <Link href={appHref} onClick={() => setMenuOpen(false)}>
                Acessar Painel
              </Link>
            ) : (
              <Link href="/login" onClick={() => setMenuOpen(false)}>
                Entrar na plataforma
              </Link>
            )}
          </nav>
        )}
      </header>

      {/* ====================================================================
          HERO SECTION
          ==================================================================== */}
      <section className={styles.hero}>
        <div className={styles.heroGlowTop} aria-hidden="true" />
        <div className={styles.heroGlowBottom} aria-hidden="true" />

        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <div className={styles.eyebrow}>
              <Sparkles className="h-3.5 w-3.5 text-[#1687FF]" />
              Gestão de Obras sem Improviso
            </div>

            <h1 className={styles.heroTitle}>
              Controle Real para <span>Obras Reais.</span>
            </h1>

            <p className={styles.heroDescription}>
              O RIGOR conecta escritório, engenharia e canteiro com precisão técnica.
              Planeje cronogramas, emita RDO digital pelo celular, controle medições
              e tome decisões executivas com dados confiáveis.
            </p>

            <div className={styles.heroActions}>
              <a href="#planos" className={styles.primaryCta}>
                Começar Demonstração Gratuita <ArrowRight />
              </a>
              <a href="#plataforma" className={styles.secondaryCta}>
                Explorar a Plataforma <ChevronRight />
              </a>
            </div>

            <div className={styles.heroTrust}>
              <div className={styles.heroTrustItem}>
                <CheckCircle2 /> Implantação em até 48h
              </div>
              <div className={styles.heroTrustItem}>
                <CheckCircle2 /> Dados isolados por empresa
              </div>
              <div className={styles.heroTrustItem}>
                <CheckCircle2 /> RDO offline no celular
              </div>
            </div>
          </div>

          {/* MOCKUP INTERATIVO DO PAINEL RIGOR */}
          <div className={styles.heroVisual} aria-label="Painel interativo do RIGOR">
            <div className={styles.mockupHeader}>
              <div className={styles.mockupDots}>
                <span className={styles.mockupDot} style={{ background: '#EF4444' }} />
                <span className={styles.mockupDot} style={{ background: '#F59E0B' }} />
                <span className={styles.mockupDot} style={{ background: '#10B981' }} />
              </div>

              {/* ABAS INTERATIVAS DO MOCKUP */}
              <div className={styles.mockupNavTabs}>
                <button
                  type="button"
                  onClick={() => setActiveTab('curva')}
                  className={`${styles.mockupTabBtn} ${activeTab === 'curva' ? styles.mockupTabBtnActive : ''}`}
                >
                  <BarChart3 className="h-3.5 w-3.5" /> Curva S
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('rdo')}
                  className={`${styles.mockupTabBtn} ${activeTab === 'rdo' ? styles.mockupTabBtnActive : ''}`}
                >
                  <ClipboardCheck className="h-3.5 w-3.5" /> RDO Digital
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('financeiro')}
                  className={`${styles.mockupTabBtn} ${activeTab === 'financeiro' ? styles.mockupTabBtnActive : ''}`}
                >
                  <Coins className="h-3.5 w-3.5" /> Medições
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('qualidade')}
                  className={`${styles.mockupTabBtn} ${activeTab === 'qualidade' ? styles.mockupTabBtnActive : ''}`}
                >
                  <ShieldCheck className="h-3.5 w-3.5" /> Qualidade
                </button>
              </div>
            </div>

            <div className={styles.mockupBody}>
              {/* CONTEÚDO DA ABA 1: CURVA S */}
              {activeTab === 'curva' && (
                <div>
                  <div className={styles.mockupKpiGrid}>
                    <div className={styles.kpiCard}>
                      <span className={styles.kpiLabel}>Avanço Físico</span>
                      <div className={styles.kpiValue}>68,4%</div>
                      <span className={styles.kpiMeta}>
                        <TrendingUp className="h-3.5 w-3.5" /> +4,2% esta semana
                      </span>
                    </div>
                    <div className={styles.kpiCard}>
                      <span className={styles.kpiLabel}>Prazo Executado</span>
                      <div className={styles.kpiValue}>142d</div>
                      <span className={styles.kpiMeta} style={{ color: '#1687FF' }}>
                        61% do cronograma
                      </span>
                    </div>
                    <div className={styles.kpiCard}>
                      <span className={styles.kpiLabel}>Índice SPI</span>
                      <div className={styles.kpiValue}>1,04</div>
                      <span className={styles.kpiMeta}>No prazo previsto</span>
                    </div>
                  </div>

                  <div className={styles.mockupChartSection}>
                    <div className={styles.chartHead}>
                      <strong>Curva S de Avanço Físico-Financeiro</strong>
                      <span>Planejado x Realizado</span>
                    </div>
                    <div className={styles.chartBarsContainer}>
                      {[
                        { mes: 'JAN', h: 32, real: 30 },
                        { mes: 'FEV', h: 46, real: 48 },
                        { mes: 'MAR', h: 58, real: 56 },
                        { mes: 'ABR', h: 70, real: 72 },
                        { mes: 'MAI', h: 84, real: 86 },
                        { mes: 'JUN', h: 96, real: 98 },
                      ].map((item, idx) => (
                        <div key={idx} className={styles.chartBarCol}>
                          <div className={styles.barTrack} style={{ height: `${item.h}%` }} />
                          <span className={styles.barMonth}>{item.mes}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={styles.mockupFeedGrid}>
                    <div className={styles.feedCard}>
                      <div className={styles.feedIcon}>
                        <HardHat />
                      </div>
                      <div className={styles.feedText}>
                        <small>PRÓXIMO MARCO CRÍTICO</small>
                        <strong>Concretagem da Laje 4º Pav.</strong>
                      </div>
                    </div>
                    <div className={styles.feedCard}>
                      <div className={styles.feedIcon} style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}>
                        <CheckCircle2 />
                      </div>
                      <div className={styles.feedText}>
                        <small>STATUS OPERACIONAL</small>
                        <strong>Sem Desvios de Caminho Crítico</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* CONTEÚDO DA ABA 2: RDO DIGITAL */}
              {activeTab === 'rdo' && (
                <div>
                  <div className={styles.mockupKpiGrid}>
                    <div className={styles.kpiCard}>
                      <span className={styles.kpiLabel}>Efetivo Hoje</span>
                      <div className={styles.kpiValue}>48</div>
                      <span className={styles.kpiMeta}>7 frentes ativas</span>
                    </div>
                    <div className={styles.kpiCard}>
                      <span className={styles.kpiLabel}>Clima & Tempo</span>
                      <div className={styles.kpiValue} style={{ fontSize: '22px' }}>Ensolarado</div>
                      <span className={styles.kpiMeta} style={{ color: '#F59E0B' }}>
                        28°C · Sem chuva
                      </span>
                    </div>
                    <div className={styles.kpiCard}>
                      <span className={styles.kpiLabel}>RDO do Dia</span>
                      <div className={styles.kpiValue}>#142</div>
                      <span className={styles.kpiMeta}>Homologado</span>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-white/10 bg-[#0B1F33]/60 p-4 space-y-2.5">
                    <div className="flex items-center justify-between text-xs text-[#AAB4BD] border-b border-white/10 pb-2">
                      <span className="font-bold uppercase text-white flex items-center gap-2">
                        <Camera className="h-4 w-4 text-[#1687FF]" /> Evidências Fotográficas Geolocalizadas
                      </span>
                      <span className="text-[#10B981] font-bold">● 12 Fotos Sincronizadas</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] text-[#AAB4BD]">
                      <div className="rounded-lg bg-white/5 p-2.5 border border-white/5">
                        <strong className="text-white block">Armação Laje 4</strong>
                        <span>10:42 · GPS Verificado</span>
                      </div>
                      <div className="rounded-lg bg-white/5 p-2.5 border border-white/5">
                        <strong className="text-white block">Alvenaria Bloco B</strong>
                        <span>14:15 · GPS Verificado</span>
                      </div>
                      <div className="rounded-lg bg-white/5 p-2.5 border border-white/5">
                        <strong className="text-white block">Instalação Hidráulica</strong>
                        <span>16:30 · GPS Verificado</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.mockupFeedGrid}>
                    <div className={styles.feedCard}>
                      <div className={styles.feedIcon}>
                        <FileCheck2 />
                      </div>
                      <div className={styles.feedText}>
                        <small>ASSINATURA DIGITAL</small>
                        <strong>Eng. Responsável Validou</strong>
                      </div>
                    </div>
                    <div className={styles.feedCard}>
                      <div className={styles.feedIcon} style={{ background: 'rgba(22, 135, 255, 0.15)', color: '#1687FF' }}>
                        <CloudSun />
                      </div>
                      <div className={styles.feedText}>
                        <small>REGISTRO METEOROLÓGICO</small>
                        <strong>Condições Próprias de Trabalho</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* CONTEÚDO DA ABA 3: FINANCEIRO & MEDIÇÕES */}
              {activeTab === 'financeiro' && (
                <div>
                  <div className={styles.mockupKpiGrid}>
                    <div className={styles.kpiCard}>
                      <span className={styles.kpiLabel}>Medição Atual</span>
                      <div className={styles.kpiValue}>R$ 284k</div>
                      <span className={styles.kpiMeta}>BM-06 Aprovado</span>
                    </div>
                    <div className={styles.kpiCard}>
                      <span className={styles.kpiLabel}>Custo vs Previsto</span>
                      <div className={styles.kpiValue}>-1,8%</div>
                      <span className={styles.kpiMeta}>Economia no orçamento</span>
                    </div>
                    <div className={styles.kpiCard}>
                      <span className={styles.kpiLabel}>Saldo Contratos</span>
                      <div className={styles.kpiValue}>R$ 1,4M</div>
                      <span className={styles.kpiMeta} style={{ color: '#1687FF' }}>8 Empreiteiros</span>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-white/10 bg-[#0B1F33]/60 p-4 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#AAB4BD] font-bold uppercase">Execução Orçamentária da Obra</span>
                      <span className="text-white font-bold">R$ 2.450.000 / R$ 3.600.000 (68%)</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#1687FF] to-[#10B981]" style={{ width: '68%' }} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 text-[#AAB4BD]">
                      <span>Mão de Obra Direta: <strong className="text-white">R$ 940k</strong></span>
                      <span>Materiais & Insumos: <strong className="text-white">R$ 1.510k</strong></span>
                    </div>
                  </div>

                  <div className={styles.mockupFeedGrid}>
                    <div className={styles.feedCard}>
                      <div className={styles.feedIcon}>
                        <WalletCards />
                      </div>
                      <div className={styles.feedText}>
                        <small>PRÓXIMO DESEMBOLSO</small>
                        <strong>Folha Empreiteiros (15/09)</strong>
                      </div>
                    </div>
                    <div className={styles.feedCard}>
                      <div className={styles.feedIcon} style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}>
                        <Coins />
                      </div>
                      <div className={styles.feedText}>
                        <small>MARGEM OPERACIONAL</small>
                        <strong>Dentro da Meta (+14,2%)</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* CONTEÚDO DA ABA 4: QUALIDADE & SST */}
              {activeTab === 'qualidade' && (
                <div>
                  <div className={styles.mockupKpiGrid}>
                    <div className={styles.kpiCard}>
                      <span className={styles.kpiLabel}>Conformidade FVS</span>
                      <div className={styles.kpiValue}>98,2%</div>
                      <span className={styles.kpiMeta}>46 Fichas Avaliadas</span>
                    </div>
                    <div className={styles.kpiCard}>
                      <span className={styles.kpiLabel}>Não Conformidades</span>
                      <div className={styles.kpiValue}>02</div>
                      <span className={styles.kpiMeta} style={{ color: '#F59E0B' }}>Em Tratamento</span>
                    </div>
                    <div className={styles.kpiCard}>
                      <span className={styles.kpiLabel}>DDS Realizado</span>
                      <div className={styles.kpiValue}>100%</div>
                      <span className={styles.kpiMeta}>Zero Acidentes</span>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-white/10 bg-[#0B1F33]/60 p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs text-[#AAB4BD] border-b border-white/10 pb-2">
                      <span className="font-bold uppercase text-white flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-[#10B981]" /> Inspeções Recentes de Canteiro
                      </span>
                      <span className="text-[#10B981] font-bold">PBQP-H / ISO 9001</span>
                    </div>
                    <div className="space-y-1.5 pt-1 text-xs">
                      <div className="flex justify-between items-center rounded-lg bg-white/5 px-3 py-2">
                        <span className="text-white">FVS 14 - Desforma e Cura de Concreto</span>
                        <span className="text-[#10B981] font-bold">APROVADA</span>
                      </div>
                      <div className="flex justify-between items-center rounded-lg bg-white/5 px-3 py-2">
                        <span className="text-white">FVS 15 - Prumo e Esquadro de Alvenaria</span>
                        <span className="text-[#10B981] font-bold">APROVADA</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.mockupFeedGrid}>
                    <div className={styles.feedCard}>
                      <div className={styles.feedIcon} style={{ color: '#10B981', background: 'rgba(16, 185, 129, 0.15)' }}>
                        <Check />
                      </div>
                      <div className={styles.feedText}>
                        <small>EPI & SEGURANÇA</small>
                        <strong>100% dos Colaboradores Aptos</strong>
                      </div>
                    </div>
                    <div className={styles.feedCard}>
                      <div className={styles.feedIcon}>
                        <Activity />
                      </div>
                      <div className={styles.feedText}>
                        <small>AUDITORIA INTERNA</small>
                        <strong>Trilha de Evidências Completa</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          METRICS STRIP (PROVA SOCIAL CONSOLIDADA)
          ==================================================================== */}
      <section className={styles.metricsBand}>
        <div className={styles.metricsGrid}>
          <div className={styles.metricItem}>
            <div className={styles.metricNumber}>
              +R$ 1.8 <em>Bi</em>
            </div>
            <div className={styles.metricTitle}>Valor de Obras Monitoradas</div>
            <div className={styles.metricSub}>Portfólio com controle em tempo real</div>
          </div>
          <div className={styles.metricItem}>
            <div className={styles.metricNumber}>
              +940 <em>Mil</em>
            </div>
            <div className={styles.metricTitle}>Diários de Obra Gerados</div>
            <div className={styles.metricSub}>Registros no canteiro com foto e clima</div>
          </div>
          <div className={styles.metricItem}>
            <div className={styles.metricNumber}>
              38% <em>Menos</em>
            </div>
            <div className={styles.metricTitle}>Tempo Gasto em Relatórios</div>
            <div className={styles.metricSub}>Engenharia focada na produção</div>
          </div>
          <div className={styles.metricItem}>
            <div className={styles.metricNumber}>
              99.4% <em>Auditável</em>
            </div>
            <div className={styles.metricTitle}>Conformidade e Histórico</div>
            <div className={styles.metricSub}>Evidências jurídicas e técnicas salvas</div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          PROBLEM VS SOLUTION (O CAOS DAS PLANILHAS VS RIGOR)
          ==================================================================== */}
      <section id="plataforma" className={styles.problemSection}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionKicker}>O Desafio da Construção Civil</span>
            <h2 className={styles.sectionTitle}>
              O custo invisível do improviso na gestão de obras.
            </h2>
            <p className={styles.sectionSubtitle}>
              Quando as informações estão espalhadas em dezenas de planilhas e grupos de WhatsApp,
              os desvios de prazo e custo só são descobertos quando já é tarde demais.
            </p>
          </div>

          <div className={styles.problemGrid}>
            {/* CARD 1: CAOS TRADICIONAL */}
            <div className={styles.problemCardChaos}>
              <span className={styles.cardBadgeChaos}>
                <AlertTriangle className="h-3.5 w-3.5" /> Gestão Tradicional Desconectada
              </span>
              <h3 className={styles.cardHeadingChaos}>Onde a Operação Sangra</h3>

              <div className={styles.comparisonList}>
                <div className={styles.comparisonItem}>
                  <X className="text-red-500" />
                  <div>
                    <strong className="text-slate-900">Planilhas Desconectadas e Desatualizadas</strong>
                    <p>Cada engenheiro usa uma versão. Ninguém sabe qual é a planilha oficial do cronograma.</p>
                  </div>
                </div>

                <div className={styles.comparisonItem}>
                  <X className="text-red-500" />
                  <div>
                    <strong className="text-slate-900">Canteiro Invisível e Fotos Soltas no WhatsApp</strong>
                    <p>Evidências se perdem nas conversas pessoais e não há rastreabilidade de decisões.</p>
                  </div>
                </div>

                <div className={styles.comparisonItem}>
                  <X className="text-red-500" />
                  <div>
                    <strong className="text-slate-900">Desvios Financeiros Descobertos Tarde</strong>
                    <p>O estouro de orçamento só chega à diretoria semanas após a medição já ter sido paga.</p>
                  </div>
                </div>

                <div className={styles.comparisonItem}>
                  <X className="text-red-500" />
                  <div>
                    <strong className="text-slate-900">Insegurança Jurídica com Empreiteiros</strong>
                    <p>Falta de diário de obra com assinatura gera riscos em pleitos trabalhistas e contratuais.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 2: COM O RIGOR */}
            <div className={styles.problemCardRigor}>
              <span className={styles.cardBadgeRigor}>
                <Zap className="h-3.5 w-3.5" /> Precisão RIGOR
              </span>
              <h3 className={styles.cardHeadingRigor}>Controle Real e Previsibilidade</h3>

              <div className={styles.comparisonList}>
                <div className={styles.comparisonItem}>
                  <CheckCircle2 className="text-[#1687FF]" />
                  <div>
                    <strong className="text-white">Base de Dados Única e Conectada</strong>
                    <p>Do primeiro planejamento ao último as-built, toda a equipe trabalha com a mesma verdade.</p>
                  </div>
                </div>

                <div className={styles.comparisonItem}>
                  <CheckCircle2 className="text-[#1687FF]" />
                  <div>
                    <strong className="text-white">RDO Digital em 3 Minutos no Celular</strong>
                    <p>Fotos carimbadas com GPS, clima automático e efetivo registrado sem burocracia.</p>
                  </div>
                </div>

                <div className={styles.comparisonItem}>
                  <CheckCircle2 className="text-[#1687FF]" />
                  <div>
                    <strong className="text-white">Alertas Preventivos de Custo e Curva S</strong>
                    <p>Índices SPI e CPI alertam desvios no início, permitindo ação corretiva imediata.</p>
                  </div>
                </div>

                <div className={styles.comparisonItem}>
                  <CheckCircle2 className="text-[#1687FF]" />
                  <div>
                    <strong className="text-white">Blindagem Jurídica e Histórico Imutável</strong>
                    <p>RDOs homologados com assinatura eletrônica e relatórios executivos em 1 clique.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          MÓDULOS DA PLATAFORMA (6 PILARES)
          ==================================================================== */}
      <section id="modulos" className={styles.platformSection}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionKicker}>Arquitetura de Precisão</span>
            <h2 className={styles.sectionTitle}>
              Uma plataforma completa para todas as etapas da obra.
            </h2>
            <p className={styles.sectionSubtitle}>
              Módulos projetados especificamente para a rotina da engenharia e da gestão construtiva.
            </p>
          </div>

          <div className={styles.modulesGrid}>
            {modulesList.map((m, idx) => {
              const Icon = m.icon;
              return (
                <div key={idx} className={styles.moduleCard}>
                  <div>
                    <div className={styles.moduleTop}>
                      <div className={styles.moduleIcon}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className={styles.moduleNumber}>0{idx + 1}</span>
                    </div>

                    <h3 className={styles.moduleTitle}>{m.title}</h3>
                    <p className={styles.moduleText}>{m.text}</p>
                  </div>

                  <div className={styles.moduleFooter}>
                    <span>{m.tag}</span>
                    <ArrowRight />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ====================================================================
          SIMULADOR DE ROI (CALCULADORA DE ECONOMIA)
          ==================================================================== */}
      <section id="simulador" className={styles.roiSection}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionKicker} style={{ color: '#1687FF' }}>
              Simulador de Eficiência
            </span>
            <h2 className={styles.sectionTitle} style={{ color: '#F5F7F6' }}>
              Calcule o Retorno do RIGOR na sua Construtora.
            </h2>
            <p className={styles.sectionSubtitle} style={{ color: '#AAB4BD' }}>
              Descubra quantas horas técnicas e quanto dinheiro sua operação economiza ao eliminar o improviso.
            </p>
          </div>

          <div className={styles.roiCard}>
            <div>
              <h3 className="font-heading text-3xl font-bold uppercase text-white">
                Parâmetros da sua Operação
              </h3>
              <p className="mt-2 text-sm text-[#AAB4BD]">
                Ajuste os controles abaixo de acordo com a carteira de obras atual da sua empresa:
              </p>

              <div className={styles.sliderGroup}>
                {/* SLIDER 1: OBRAS SIMULTÂNEAS */}
                <div className={styles.sliderBox}>
                  <div className={styles.sliderHead}>
                    <label>Número de Obras Ativas</label>
                    <strong>{roiObras} {roiObras === 1 ? 'Obra' : 'Obras'}</strong>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={25}
                    step={1}
                    value={roiObras}
                    onChange={(e) => setRoiObras(Number(e.target.value))}
                    className={styles.customRange}
                  />
                  <div className="flex justify-between text-[11px] text-[#AAB4BD]">
                    <span>1 obra</span>
                    <span>12 obras</span>
                    <span>25 obras</span>
                  </div>
                </div>

                {/* SLIDER 2: VALOR MÉDIO DA OBRA */}
                <div className={styles.sliderBox}>
                  <div className={styles.sliderHead}>
                    <label>Orçamento Médio por Obra</label>
                    <strong>{formatMoney(roiValorMedio)}</strong>
                  </div>
                  <input
                    type="range"
                    min={500000}
                    max={20000000}
                    step={500000}
                    value={roiValorMedio}
                    onChange={(e) => setRoiValorMedio(Number(e.target.value))}
                    className={styles.customRange}
                  />
                  <div className="flex justify-between text-[11px] text-[#AAB4BD]">
                    <span>R$ 500k</span>
                    <span>R$ 10M</span>
                    <span>R$ 20M</span>
                  </div>
                </div>
              </div>
            </div>

            {/* PAINEL DE RESULTADOS DO SIMULADOR */}
            <div className={styles.roiResultsBox}>
              <div className={styles.roiKpi}>
                <small>ECONOMIA TOTAL ESTIMADA / ANO</small>
                <strong>
                  <em>{formatMoney(roiCalculations.economiaTotalAno)}</em>
                </strong>
                <p>Prevenção de desvios + ganho de produtividade técnica.</p>
              </div>

              <div className="border-t border-white/10 pt-4 grid grid-cols-2 gap-4">
                <div>
                  <small className="text-[10px] font-bold text-[#AAB4BD] uppercase block">Horas Poupadas / Mês</small>
                  <span className="font-heading text-2xl font-bold text-white mt-1 block">
                    ~{roiCalculations.horasEconomizadas}h
                  </span>
                  <span className="text-[11px] text-[#1687FF]">Menos relatórios manuais</span>
                </div>
                <div>
                  <small className="text-[10px] font-bold text-[#AAB4BD] uppercase block">Valor sob Gestão</small>
                  <span className="font-heading text-2xl font-bold text-white mt-1 block">
                    {formatMoney(roiCalculations.totalSobGestao)}
                  </span>
                  <span className="text-[11px] text-[#10B981]">100% Monitorado</span>
                </div>
              </div>

              <a
                href="#planos"
                className="mt-4 flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1687FF] text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-[#1687FF]/30 transition hover:brightness-110"
              >
                Garantir Essa Eficiência <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          METODOLOGIA (DO CANTEIRO À DIRETORIA EM 3 ETAPAS)
          ==================================================================== */}
      <section id="como-funciona" className={styles.workflowSection}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionKicker}>Metodologia RIGOR</span>
            <h2 className={styles.sectionTitle}>
              O dado nasce no canteiro. A decisão chega à gestão.
            </h2>
            <p className={styles.sectionSubtitle}>
              Como transformamos a rotina caótica da obra em um fluxo contínuo de inteligência operacional.
            </p>
          </div>

          <div className={styles.stepsGrid}>
            <div className={styles.stepCard}>
              <div className={styles.stepHead}>
                <div className={styles.stepBadge}>01</div>
                <Layers className="h-6 w-6 text-[#1687FF]" />
              </div>
              <h3>Estruture com Precisão</h3>
              <p>
                Cadastre obras, importe cronogramas de planilhas em segundos, defina metas físicas,
                equipes responsáveis e aloque orçamentos por etapa construtiva.
              </p>
            </div>

            <div className={styles.stepCard}>
              <div className={styles.stepHead}>
                <div className={styles.stepBadge}>02</div>
                <HardHat className="h-6 w-6 text-[#1687FF]" />
              </div>
              <h3>Colete no Campo sem Fricção</h3>
              <p>
                Encarregados e engenheiros registram o RDO pelo celular em menos de 3 minutos,
                com fotos carimbadas, clima automatizado, registro de equipe e assinaturas.
              </p>
            </div>

            <div className={styles.stepCard}>
              <div className={styles.stepHead}>
                <div className={styles.stepBadge}>03</div>
                <BarChart3 className="h-6 w-6 text-[#1687FF]" />
              </div>
              <h3>Decida com Previsibilidade</h3>
              <p>
                O painel executivo consolida Curvas S, boletins de medição e alertas de desvio em
                tempo real, permitindo correções rápidas antes que prazos estourem.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          TABELA DE PLANOS & PREÇOS
          ==================================================================== */}
      <section id="planos" className={styles.pricingSection}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionKicker}>Planos Transparentes</span>
            <h2 className={styles.sectionTitle}>Escolha o ritmo da sua operação.</h2>
            <p className={styles.sectionSubtitle}>
              Todos os planos incluem suporte de implantação, atualizações contínuas e dados 100% isolados.
            </p>
          </div>

          {/* TOGGLE DE CICLOS DE COBRANÇA */}
          <div className={styles.cycleToggleContainer}>
            <div className={styles.cycleToggle} role="group" aria-label="Período de cobrança">
              {(Object.keys(cycles) as BillingCycle[]).map((key) => {
                const c = cycles[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setBilling(key)}
                    className={`${styles.cycleBtn} ${billing === key ? styles.cycleBtnActive : ''}`}
                  >
                    {c.label}
                    {c.badge && <span className={styles.cycleDiscount}>{c.badge}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* GRID DE PLANOS */}
          <div className={styles.pricingGrid}>
            {(Object.keys(SAAS_PLANS) as SaasPlan[]).map((key) => {
              const plan = SAAS_PLANS[key];
              const cycle = cycles[billing];
              const monthlyPrice = plan.price * (1 - cycle.discount);
              const totalCyclePrice = monthlyPrice * cycle.months;
              const isPro = key === 'PRO';

              return (
                <div
                  key={key}
                  className={`${styles.planCard} ${isPro ? styles.featuredPlan : ''}`}
                >
                  {isPro && <div className={styles.planTag}>MAIS ESCOLHIDO</div>}

                  <div>
                    <div className={styles.planHead}>
                      <span className="text-xs font-black tracking-widest text-[#1687FF] uppercase">
                        Plano {key}
                      </span>
                      <span className="text-xs font-bold opacity-60">
                        {key === 'STARTER' ? '01' : key === 'PRO' ? '02' : '03'}
                      </span>
                    </div>

                    <h3 className={styles.planName}>{plan.name}</h3>
                    <p className="mt-2 text-xs opacity-75 min-h-[34px]">{plan.description}</p>

                    <div className={styles.planPrice}>
                      <sup>R$</sup>
                      <strong>{formatMoney(monthlyPrice).replace('R$', '').trim()}</strong>
                      <span>/mês</span>
                    </div>

                    <p className={styles.planCycleInfo}>
                      {billing === 'monthly'
                        ? 'Cobrança mensal flexível.'
                        : `${formatMoney(totalCyclePrice)} faturado no ciclo ${cycle.label.toLowerCase()}.`}
                    </p>

                    <div className={styles.planLimits}>
                      <span>
                        <Building2 />
                        {Number.isFinite(plan.limits.obras)
                          ? `${plan.limits.obras} Obras ativas`
                          : 'Obras ilimitadas'}
                      </span>
                      <span>
                        <UsersRound />
                        {Number.isFinite(plan.limits.users)
                          ? `${plan.limits.users} Usuários`
                          : 'Usuários ilimitados'}
                      </span>
                    </div>

                    <ul className={styles.planFeatures}>
                      {plan.features.map((feat, fIdx) => (
                        <li key={fIdx}>
                          <Check />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <a
                    href={`mailto:comercial@rigorobras.com.br?subject=Interesse no plano ${plan.name} (${cycle.label})`}
                    className={
                      isPro
                        ? 'flex h-12 items-center justify-center gap-2 rounded-xl bg-[#1687FF] text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-[#1687FF]/40 transition hover:brightness-110'
                        : 'flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white text-xs font-black uppercase tracking-wider text-[#0B1F33] transition hover:bg-[#0B1F33] hover:text-white'
                    }
                  >
                    Solicitar Demonstração <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              );
            })}
          </div>

          <p className="mt-8 text-center text-xs text-[#354654]">
            Cobrança segura com cartão de crédito ou boleto bancário via AbacatePay. Cancele quando quiser.
          </p>
        </div>
      </section>

      {/* ====================================================================
          FAQ SECTION (ACORDEÃO INTERATIVO)
          ==================================================================== */}
      <section id="faq" className={styles.faqSection}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionKicker}>Dúvidas Frequentes</span>
            <h2 className={styles.sectionTitle}>Perguntas e Respostas.</h2>
            <p className={styles.sectionSubtitle}>
              Tudo o que você precisa saber sobre a plataforma RIGOR e o processo de adoção.
            </p>
          </div>

          <div className={styles.faqList}>
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className={`${styles.faqItem} ${isOpen ? styles.faqItemOpen : ''}`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className={styles.faqQuestion}
                    aria-expanded={isOpen}
                  >
                    <span>{faq.q}</span>
                    <div className={styles.faqIcon}>
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </button>
                  {isOpen && <div className={styles.faqAnswer}>{faq.a}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ====================================================================
          FINAL CTA SECTION
          ==================================================================== */}
      <section className={styles.finalCta}>
        <div className={styles.sectionInner}>
          <div className={styles.finalCtaCard}>
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-[#1687FF]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#1687FF]" />
                Próximo Passo
              </div>
              <h2 className={styles.finalCtaTitle}>
                Sua obra já é complexa.<br />
                <span>A gestão não precisa ser.</span>
              </h2>
              <p className={styles.finalCtaDesc}>
                Junte-se às construtoras e engenharias que profissionalizaram sua operação do canteiro à diretoria.
              </p>
            </div>

            <div className="flex flex-col gap-3.5">
              <a
                href="mailto:comercial@rigorobras.com.br?subject=Quero agendar uma demonstração do RIGOR"
                className="flex h-14 items-center justify-center gap-3 rounded-xl bg-[#1687FF] text-sm font-black uppercase tracking-wider text-white shadow-xl shadow-[#1687FF]/40 transition hover:brightness-110"
              >
                Agendar Demonstração Guiada <ArrowRight className="h-5 w-5" />
              </a>
              <Link
                href="/login"
                className="flex h-14 items-center justify-center gap-3 rounded-xl border border-white/20 bg-white/5 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-white/10"
              >
                Acessar Plataforma RIGOR
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          FOOTER
          ==================================================================== */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <RigorLogo markSize={32} theme="dark" showTagline={true} taglineText="BUILT ON PRECISION" />
            <p>
              Sistema completo de gestão de obras, cronogramas, RDO digital e inteligência financeira para a construção civil.
            </p>
          </div>

          <div className={styles.footerCol}>
            <h4>Navegação</h4>
            <ul>
              <li><a href="#plataforma">Plataforma</a></li>
              <li><a href="#modulos">Módulos</a></li>
              <li><a href="#simulador">Simulador ROI</a></li>
              <li><a href="#planos">Planos & Preços</a></li>
            </ul>
          </div>

          <div className={styles.footerCol}>
            <h4>Legal & Privacidade</h4>
            <ul>
              <li><Link href="/termos">Termos de Uso</Link></li>
              <li><Link href="/privacidade">Política de Privacidade & LGPD</Link></li>
              <li><Link href="/cookies">Gestão de Cookies</Link></li>
            </ul>
          </div>

          <div className={styles.footerCol}>
            <h4>Atendimento</h4>
            <ul>
              <li><a href="mailto:comercial@rigorobras.com.br">comercial@rigorobras.com.br</a></li>
              <li><span>Segunda a Sexta · 08h às 18h</span></li>
              <li className="pt-2 text-xs text-[#10B981] font-bold flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
                Sistemas 100% Operacionais
              </li>
            </ul>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <span>© {new Date().getFullYear()} RIGOR. Todos os direitos reservados.</span>
          <span>BUILT ON PRECISION · CONSISTENT / CLEAR / CONFIDENT</span>
        </div>
      </footer>
    </main>
  );
}
