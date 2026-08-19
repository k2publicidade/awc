'use client';

import Link from 'next/link';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
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
  CloudSun,
  Coins,
  FileCheck2,
  HardHat,
  Layers,
  MapPin,
  Menu,
  PackageCheck,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  TrendingUp,
  UsersRound,
  WalletCards,
  X,
  Zap,
} from 'lucide-react';
import { SAAS_PLANS, type SaasPlan } from '@/lib/saas';
import { RigorLogo, RigorMark } from '@/components/ui/rigor-logo';
import styles from './landing-page.module.css';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

type BillingCycle = 'monthly' | 'semiannual' | 'annual';
type MockupTab = 'curva' | 'rdo' | 'financeiro' | 'qualidade';

interface MilestonePoint {
  id: string;
  month: string;
  x: number;
  plannedY: number;
  actualY: number;
  label: string;
  status: 'concluido' | 'em_andamento' | 'planejado';
  spi?: number;
}

const cycles: Record<
  BillingCycle,
  { label: string; months: number; discount: number; badge?: string }
> = {
  monthly: { label: 'Mensal', months: 1, discount: 0 },
  semiannual: { label: 'Semestral', months: 6, discount: 0.05, badge: '5% OFF' },
  annual: { label: 'Anual', months: 12, discount: 0.15, badge: '15% OFF' },
};

const curveMilestones: MilestonePoint[] = [
  { id: 'm1', month: 'M01', x: 40, plannedY: 130, actualY: 130, label: 'Mobilização & Canteiro', status: 'concluido', spi: 1.0 },
  { id: 'm2', month: 'M02', x: 110, plannedY: 115, actualY: 112, label: 'Fundações Profundas', status: 'concluido', spi: 1.02 },
  { id: 'm3', month: 'M03', x: 180, plannedY: 95, actualY: 90, label: 'Estrutura 1º a 3º Pav.', status: 'concluido', spi: 1.05 },
  { id: 'm4', month: 'M04', x: 250, plannedY: 72, actualY: 66, label: 'Laje 4º Pav. & Alvenaria', status: 'em_andamento', spi: 1.04 },
  { id: 'm5', month: 'M05', x: 320, plannedY: 50, actualY: 44, label: 'Instalações Hidráulicas/Elétricas', status: 'planejado' },
  { id: 'm6', month: 'M06', x: 390, plannedY: 30, actualY: 26, label: 'Revestimentos & Fachada', status: 'planejado' },
  { id: 'm7', month: 'M07', x: 460, plannedY: 15, actualY: 15, label: 'Entrega de Chaves & As-Built', status: 'planejado' },
];

const modulesList = [
  {
    code: 'MOD.01',
    icon: CalendarRange,
    title: 'Planejamento & Curva S',
    dimensionTag: 'COTA: FÍSICO-FINANCEIRO',
    text: 'EAP estruturada, linha de balanço, caminho crítico automático e Curva S com tolerâncias calculadas matematicamente.',
  },
  {
    code: 'MOD.02',
    icon: ClipboardCheck,
    title: 'RDO Digital de Campo',
    dimensionTag: 'COTA: DIÁRIO AUDITÁVEL',
    text: 'Preenchimento em 3 minutos no celular com clima por GPS, contagem de efetivo por função, fotos carimbadas e assinatura eletrônica.',
  },
  {
    code: 'MOD.03',
    icon: WalletCards,
    title: 'Financeiro & Medições',
    dimensionTag: 'COTA: FLUXO DE CAIXA',
    text: 'Boletins de medição (BM), apropriação de despesas por etapa, saldo de contratos de empreiteiros e controle de retenções técnicas.',
  },
  {
    code: 'MOD.04',
    icon: PackageCheck,
    title: 'Suprimentos & Estoque',
    dimensionTag: 'COTA: RASTREABILIDADE',
    text: 'Requisições com vínculo direto à EAP da obra, controle de almoxarifado no canteiro, conferência de notas e prevenção de desvios.',
  },
  {
    code: 'MOD.05',
    icon: ShieldCheck,
    title: 'Qualidade & SST (PBQP-H)',
    dimensionTag: 'COTA: CONFORMIDADE TOTAL',
    text: 'Fichas de Verificação de Serviço (FVS), não conformidades com registro fotográfico e prazo de resolução, DDS e entrega de EPIs.',
  },
  {
    code: 'MOD.06',
    icon: FileCheck2,
    title: 'Databook & GED Técnico',
    dimensionTag: 'COTA: SEGURANÇA JURÍDICA',
    text: 'Plantas, projetos executivos, memoriais descritivos e as-built organizados com controle de revisões e histórico imutável para auditorias.',
  },
];

const faqs = [
  {
    q: 'Quanto tempo leva para a construtora começar a operar no RIGOR?',
    a: 'A implantação do RIGOR é assistida e estruturada para rodar em menos de 48 horas. Você cadastra suas primeiras obras, importa planilhas de cronograma já existentes e a equipe de campo começa a registrar RDOs no mesmo dia.',
  },
  {
    q: 'Consigo importar meus cronogramas e planilhas de custos do Excel?',
    a: 'Sim. O RIGOR possui importador inteligente para arquivos .xlsx com mapeamento de etapas, datas e orçamentos. Nossa equipe de engenharia também acompanha a carga inicial para garantir integridade dos dados.',
  },
  {
    q: 'O aplicativo funciona em canteiros com sinal de celular instável ou sem internet?',
    a: 'Sim. O módulo de campo e RDO foi desenvolvido com arquitetura offline-first integral. O encarregado registra o efetivo, anexa fotos e preenche as ocorrências mesmo offline. Assim que o celular detecta sinal, todos os dados sincronizam com a base central.',
  },
  {
    q: 'Como é garantida a segurança jurídica dos diários e medições?',
    a: 'Cada RDO e Boletim de Medição emitido recebe carimbo com coordenadas GPS, horário imutável, registro meteorológico oficial e assinatura eletrônica dos responsáveis técnicos, gerando validade jurídica em eventuais pleitos ou auditorias.',
  },
  {
    q: 'Existe limite para envio de fotos e armazenamento de projetos na plataforma?',
    a: 'Cada plano possui uma franquia generosa de armazenamento de alta velocidade (10 GB a 500 GB+). Além disso, as fotos enviadas no canteiro passam por compressão inteligente sem perda de detalhe técnico.',
  },
  {
    q: 'Como funciona o treinamento e adesão dos engenheiros e encarregados?',
    a: 'A interface do RIGOR foi desenhada especificamente para a rotina do canteiro, sem telas complexas ou burocracia. Oferecemos sessões práticas de onboarding e suporte direto por canal técnico.',
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
  const mainRef = useRef<HTMLElement>(null);
  const [billing, setBilling] = useState<BillingCycle>('annual');
  const [activeTab, setActiveTab] = useState<MockupTab>('curva');
  const [selectedMilestone, setSelectedMilestone] = useState<MilestonePoint>(curveMilestones[3]);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [menuOpen, setMenuOpen] = useState(false);

  // ROI Calculator States
  const [roiObras, setRoiObras] = useState(4);
  const [roiValorMedio, setRoiValorMedio] = useState(3500000);

  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';
  const appHref =
    (session?.user as DynamicValue)?.role === 'MASTER_ADMIN' ? '/master' : '/dashboard';

  // Cálculos do simulador de eficiência e retorno de investimento
  const roiCalculations = useMemo(() => {
    const totalSobGestao = roiObras * roiValorMedio;
    const horasEconomizadas = roiObras * 28; // ~28 horas técnicas poupadas por obra/mês
    const reducaoDesviosRetrabalho = totalSobGestao * 0.024; // 2.4% histórico de prevenção de desvios orçamentários
    const valorHorasAno = horasEconomizadas * 12 * 95; // Custo médio hora técnica engenharia R$ 95/h
    const economiaTotalAno = reducaoDesviosRetrabalho + valorHorasAno;

    return {
      totalSobGestao,
      horasEconomizadas,
      economiaTotalAno,
      reducaoDesviosRetrabalho,
    };
  }, [roiObras, roiValorMedio]);

  // =========================================================================
  // GSAP MOTION & SCROLLTRIGGER ORCHESTRATION (60fps GPU Composited & Rock-Solid)
  // =========================================================================
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    gsap.registerPlugin(ScrollTrigger);

    ScrollTrigger.config({
      ignoreMobileResize: true,
      autoRefreshEvents: 'visibilitychange,DOMContentLoaded,load,resize',
    });

    const ctx = gsap.context(() => {
      // 1. ENTRANCE TIMELINE (Header & Hero - Executa suavemente no mount)
      const tl = gsap.timeline({
        defaults: { ease: 'power3.out' },
        onComplete: () => {
          // Limpa inline styles para garantir responsividade e comportamento nativo
          gsap.set(
            [
              `.${styles.header}`,
              `.${styles.cadEyebrow}`,
              `.${styles.heroTitle}`,
              `.${styles.heroDescription}`,
              `.${styles.heroActions}`,
              `.${styles.dimensionItem}`,
              `.${styles.pranchaContainer}`,
            ],
            { clearProps: 'transform,opacity' }
          );
        },
      });

      tl.fromTo(
        `.${styles.header}`,
        { y: -25, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6 }
      )
        .fromTo(
          `.${styles.cadEyebrow}`,
          { y: 15, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.45 },
          '-=0.25'
        )
        .fromTo(
          `.${styles.heroTitle}`,
          { y: 22, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.55 },
          '-=0.3'
        )
        .fromTo(
          `.${styles.heroDescription}`,
          { y: 15, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.45 },
          '-=0.3'
        )
        .fromTo(
          `.${styles.heroActions}`,
          { y: 15, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.45 },
          '-=0.3'
        )
        .fromTo(
          `.${styles.dimensionItem}`,
          { y: 15, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.4, stagger: 0.08 },
          '-=0.25'
        )
        .fromTo(
          `.${styles.pranchaContainer}`,
          { y: 25, scale: 0.98, opacity: 0 },
          { y: 0, scale: 1, opacity: 1, duration: 0.7, ease: 'power2.out' },
          '-=0.6'
        );

      // 2. PARALLAX SUTIL NOS EIXOS DO HERO
      gsap.to(`.${styles.heroCrosshairTL}`, {
        yPercent: -30,
        ease: 'none',
        scrollTrigger: {
          trigger: `.${styles.hero}`,
          start: 'top top',
          end: 'bottom top',
          scrub: 1,
        },
      });
      gsap.to(`.${styles.heroCrosshairBR}`, {
        yPercent: 30,
        ease: 'none',
        scrollTrigger: {
          trigger: `.${styles.hero}`,
          start: 'top top',
          end: 'bottom top',
          scrub: 1,
        },
      });

      // 3. FAIXA DE INDICADORES (METRICS BAND)
      gsap.fromTo(
        `.${styles.metricCard}`,
        { y: 25, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.08,
          ease: 'power2.out',
          clearProps: 'transform,opacity',
          scrollTrigger: {
            trigger: `.${styles.metricsBand}`,
            start: 'top 90%',
            once: true,
          },
        }
      );

      // 4. ANTES X DEPOIS (DIAGNÓSTICO) - CARDS INDEPENDENTES
      gsap.fromTo(
        `.${styles.problemCardChaos}`,
        { y: 25, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.65,
          ease: 'power2.out',
          clearProps: 'transform,opacity',
          scrollTrigger: {
            trigger: `.${styles.problemCardChaos}`,
            start: 'top 88%',
            once: true,
          },
        }
      );

      gsap.fromTo(
        `.${styles.problemCardRigor}`,
        { y: 25, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.65,
          ease: 'power2.out',
          clearProps: 'transform,opacity',
          scrollTrigger: {
            trigger: `.${styles.problemCardRigor}`,
            start: 'top 88%',
            once: true,
          },
        }
      );

      // 5. MÓDULOS DE ENGENHARIA (BATCH REVEAL - RESPONSIVO E SEGURO)
      ScrollTrigger.batch(`.${styles.moduleCard}`, {
        start: 'top 90%',
        once: true,
        onEnter: (batch) =>
          gsap.fromTo(
            batch,
            { y: 25, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.55,
              stagger: 0.08,
              ease: 'power2.out',
              clearProps: 'transform,opacity',
            }
          ),
      });

      // 6. SIMULADOR DE ROI
      gsap.fromTo(
        `.${styles.roiCard}`,
        { y: 25, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.65,
          ease: 'power2.out',
          clearProps: 'transform,opacity',
          scrollTrigger: {
            trigger: `.${styles.roiCard}`,
            start: 'top 88%',
            once: true,
          },
        }
      );

      // 7. METODOLOGIA EM 3 PASSOS (BATCH REVEAL)
      ScrollTrigger.batch(`.${styles.stepCard}`, {
        start: 'top 90%',
        once: true,
        onEnter: (batch) =>
          gsap.fromTo(
            batch,
            { y: 25, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.55,
              stagger: 0.1,
              ease: 'power2.out',
              clearProps: 'transform,opacity',
            }
          ),
      });

      // 8. PLANOS DE PREÇO (BATCH REVEAL)
      ScrollTrigger.batch(`.${styles.planCard}`, {
        start: 'top 90%',
        once: true,
        onEnter: (batch) =>
          gsap.fromTo(
            batch,
            { y: 25, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.55,
              stagger: 0.08,
              ease: 'power2.out',
              clearProps: 'transform,opacity',
            }
          ),
      });

      // 9. FAQ ACCORDION (BATCH REVEAL)
      ScrollTrigger.batch(`.${styles.faqItem}`, {
        start: 'top 92%',
        once: true,
        onEnter: (batch) =>
          gsap.fromTo(
            batch,
            { y: 18, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.45,
              stagger: 0.05,
              ease: 'power2.out',
              clearProps: 'transform,opacity',
            }
          ),
      });

      // 10. FINAL CTA CARD
      gsap.fromTo(
        `.${styles.finalCtaCard}`,
        { y: 25, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.65,
          ease: 'power2.out',
          clearProps: 'transform,opacity',
          scrollTrigger: {
            trigger: `.${styles.finalCtaCard}`,
            start: 'top 88%',
            once: true,
          },
        }
      );
    }, mainRef);

    // Refresh ScrollTrigger após montagem e carregamento de fontes para garantir cálculos perfeitos
    const refreshTimer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 150);

    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(() => {
        ScrollTrigger.refresh();
      });
    }

    return () => {
      clearTimeout(refreshTimer);
      ctx.revert();
    };
  }, []);

  return (
    <main ref={mainRef} className={styles.page}>
      {/* ====================================================================
          HEADER TÉCNICO DE ENGENHARIA
          ==================================================================== */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brandWrap}>
            <Link href="/" aria-label="RIGOR - Página inicial">
              <RigorLogo markSize={32} theme="dark" showTagline={true} taglineText="BUILT ON PRECISION" />
            </Link>
            <span className={styles.sheetStampBadge}>
              FOLHA 01/01 · REV. 2026.4
            </span>
          </div>

          <nav className={styles.desktopNav} aria-label="Navegação principal">
            <a href="#plataforma">Plataforma</a>
            <a href="#modulos">Módulos</a>
            <a href="#simulador">Simulador ROI</a>
            <a href="#como-funciona">Metodologia</a>
            <a href="#planos">Planos</a>
            <a href="#faq">FAQ</a>
          </nav>

          <div className={styles.headerActions}>
            <div className={styles.statusIndicator} title="Status dos servidores da plataforma">
              <span className={styles.statusPulse} />
              <span>SISTEMAS ONLINE</span>
            </div>

            {isAuthenticated ? (
              <Link href={appHref} className={styles.headerCta}>
                Acessar Painel <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <>
                <Link href="/login" className={styles.loginBtn}>
                  Entrar
                </Link>
                <a href="#planos" className={styles.headerCta}>
                  Solicitar Demonstração <ArrowRight className="h-3.5 w-3.5" />
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
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
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
          HERO SECTION — PRANCHA TÉCNICA E CURVA S INTERATIVA
          ==================================================================== */}
      <section className={styles.hero}>
        <div className={styles.heroCrosshairTL} aria-hidden="true">
          + EIXO A-01 [NÍVEL +0.00]
        </div>
        <div className={styles.heroCrosshairBR} aria-hidden="true">
          + EIXO C-12 [PRECISÃO ±0.00]
        </div>

        <div className={styles.heroInner}>
          {/* COLUNA ESQUERDA: COPY DIRETO DE ENGENHARIA */}
          <div className={styles.heroCopy}>
            <div className={styles.cadEyebrow}>
              <Activity className="h-3.5 w-3.5 text-[#0066FF]" />
              CADASTRO TÉCNICO · GESTÃO SEM IMPROVISO
            </div>

            <h1 className={styles.heroTitle}>
              Controle Real para <span>Obras Reais.</span>
            </h1>

            <p className={styles.heroDescription}>
              O <strong>RIGOR</strong> substitui o caos de planilhas desatualizadas e fotos soltas no WhatsApp por uma <strong>base técnica única</strong>. Conecte canteiro, engenharia e diretoria com dados matemáticos de avanço físico, custos e conformidade.
            </p>

            <div className={styles.heroActions}>
              <a href="#planos" className={styles.heroPrimaryCta}>
                Agendar Demonstração Guiada <ArrowRight className="h-4 w-4" />
              </a>
              <a href="#plataforma" className={styles.heroSecondaryCta}>
                Explorar Plataforma <ChevronRight className="h-4 w-4" />
              </a>
            </div>

            {/* COTAS DE ESPECIFICAÇÃO DE PROJETO */}
            <div className={styles.dimensionBar}>
              <div className={styles.dimensionItem}>
                <div className={styles.dimensionValue}>
                  <CheckCircle2 className="h-4 w-4 text-[#0066FF]" /> 48 Horas
                </div>
                <span className={styles.dimensionLabel}>Implantação assistida com importador Excel</span>
              </div>

              <div className={styles.dimensionItem}>
                <div className={styles.dimensionValue}>
                  <HardHat className="h-4 w-4 text-[#0066FF]" /> RDO Offline
                </div>
                <span className={styles.dimensionLabel}>Campo em 3 minutos com fotos e clima GPS</span>
              </div>

              <div className={styles.dimensionItem}>
                <div className={styles.dimensionValue}>
                  <ShieldCheck className="h-4 w-4 text-[#0066FF]" /> Base Única
                </div>
                <span className={styles.dimensionLabel}>Ambientes isolados e conformidade LGPD</span>
              </div>
            </div>
          </div>

          {/* COLUNA DIREITA: ELEMENTO ASSINATURA — PAINEL DE TELEMETRIA & CURVA S */}
          <div className={styles.pranchaContainer} aria-label="Painel de telemetria de obra e Curva S">
            <div className={styles.pranchaHeader}>
              <div className={styles.pranchaTitle}>
                <RigorMark size={18} theme="dark" showCrosshairs={false} />
                <span>TELEMETRIA DE OBRA · EDIFÍCIO HORIZONTE</span>
              </div>

              {/* ABAS DE INSPEÇÃO */}
              <div className={styles.pranchaNavTabs}>
                <button
                  type="button"
                  onClick={() => setActiveTab('curva')}
                  className={`${styles.tabBtn} ${activeTab === 'curva' ? styles.tabBtnActive : ''}`}
                >
                  <BarChart3 className="h-3.5 w-3.5" /> Curva S
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('rdo')}
                  className={`${styles.tabBtn} ${activeTab === 'rdo' ? styles.tabBtnActive : ''}`}
                >
                  <ClipboardCheck className="h-3.5 w-3.5" /> RDO Campo
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('financeiro')}
                  className={`${styles.tabBtn} ${activeTab === 'financeiro' ? styles.tabBtnActive : ''}`}
                >
                  <Coins className="h-3.5 w-3.5" /> Medições
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('qualidade')}
                  className={`${styles.tabBtn} ${activeTab === 'qualidade' ? styles.tabBtnActive : ''}`}
                >
                  <ShieldCheck className="h-3.5 w-3.5" /> Qualidade
                </button>
              </div>
            </div>

            <div className={styles.pranchaBody}>
              {/* ABA 1: CURVA S DE ENGENHARIA & CAMINHO CRÍTICO */}
              {activeTab === 'curva' && (
                <div>
                  <div className={styles.kpiStrip}>
                    <div className={styles.kpiCard}>
                      <span className={styles.kpiLabel}>Avanço Físico</span>
                      <div className={styles.kpiValue}>68,4%</div>
                      <span className={styles.kpiMeta}>
                        <TrendingUp className="h-3 w-3" /> +4,2% no período
                      </span>
                    </div>
                    <div className={styles.kpiCard}>
                      <span className={styles.kpiLabel}>Prazo Executado</span>
                      <div className={styles.kpiValue}>142d</div>
                      <span className={styles.kpiMeta} style={{ color: '#0066FF' }}>
                        61% do cronograma
                      </span>
                    </div>
                    <div className={styles.kpiCard}>
                      <span className={styles.kpiLabel}>Índice SPI</span>
                      <div className={styles.kpiValue}>1,04</div>
                      <span className={styles.kpiMeta}>No caminho crítico</span>
                    </div>
                  </div>

                  {/* VETOR DA CURVA S INTERATIVA */}
                  <div className={styles.curveGraphWrapper}>
                    <div className={styles.curveHead}>
                      <strong>Curva S de Avanço Físico-Financeiro</strong>
                      <div className={styles.curveLegend}>
                        <div className={styles.legendItem}>
                          <span className={styles.legendPlanned} />
                          <span>Planejado (Baseline)</span>
                        </div>
                        <div className={styles.legendItem}>
                          <span className={styles.legendActual} />
                          <span>Realizado (+4.2%)</span>
                        </div>
                      </div>
                    </div>

                    <svg viewBox="0 0 500 150" className={styles.svgCurve} aria-hidden="true">
                      {/* Linhas de Grade de Projeto */}
                      <line x1="40" y1="15" x2="480" y2="15" stroke="rgba(35, 57, 78, 0.4)" strokeWidth="1" strokeDasharray="3 3" />
                      <line x1="40" y1="50" x2="480" y2="50" stroke="rgba(35, 57, 78, 0.4)" strokeWidth="1" strokeDasharray="3 3" />
                      <line x1="40" y1="90" x2="480" y2="90" stroke="rgba(35, 57, 78, 0.4)" strokeWidth="1" strokeDasharray="3 3" />
                      <line x1="40" y1="130" x2="480" y2="130" stroke="rgba(35, 57, 78, 0.6)" strokeWidth="1" />

                      {/* Eixos Horizontais */}
                      {curveMilestones.map((m) => (
                        <g key={m.id}>
                          <line x1={m.x} y1="15" x2={m.x} y2="130" stroke="rgba(35, 57, 78, 0.25)" strokeWidth="1" />
                          <text x={m.x} y="145" fill="#5C7084" fontSize="9" fontFamily="var(--font-mono)" textAnchor="middle">
                            {m.month}
                          </text>
                        </g>
                      ))}

                      {/* Envelope de Tolerância (±3% Desvio Aceitável) */}
                      <path
                        d="M 40 130 C 110 120, 180 98, 250 74 C 320 52, 390 32, 460 17 L 460 13 C 390 28, 320 48, 250 70 C 180 92, 110 110, 40 130 Z"
                        fill="rgba(0, 102, 255, 0.08)"
                      />

                      {/* Linha Planejada (Tracejada Cinza Aço) */}
                      <path
                        d="M 40 130 C 110 115, 180 95, 250 72 C 320 50, 390 30, 460 15"
                        fill="none"
                        stroke="#5C7084"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                      />

                      {/* Linha Realizada (Azul Topografia Sólida até Mês 4) */}
                      <path
                        d="M 40 130 C 110 112, 180 90, 250 66"
                        fill="none"
                        stroke="#0066FF"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />

                      {/* Pinos Interativos de Marcos da Obra */}
                      {curveMilestones.map((m) => {
                        const isSelected = selectedMilestone.id === m.id;
                        const isPast = m.status !== 'planejado';
                        const cy = isPast ? m.actualY : m.plannedY;
                        return (
                          <g
                            key={m.id}
                            className={styles.curveMilestonePin}
                            onClick={() => setSelectedMilestone(m)}
                          >
                            <circle
                              cx={m.x}
                              cy={cy}
                              r={isSelected ? 6 : 4}
                              fill={isPast ? '#0066FF' : '#5C7084'}
                              stroke="#FFFFFF"
                              strokeWidth={isSelected ? 2 : 1}
                            />
                            {isSelected && (
                              <circle
                                cx={m.x}
                                cy={cy}
                                r={10}
                                fill="none"
                                stroke="#0066FF"
                                strokeWidth="1"
                                strokeDasharray="2 2"
                              />
                            )}
                          </g>
                        );
                      })}
                    </svg>

                    {/* Detalhe do Marco Selecionado */}
                    <div className="mt-2 flex items-center justify-between text-xs bg-[#08131E] p-2.5 rounded border border-[#23394E] font-mono">
                      <div>
                        <span className="text-[#5C7084] text-[10px] uppercase block">MARCO CRÍTICO [{selectedMilestone.month}]</span>
                        <strong className="text-white text-[12px]">{selectedMilestone.label}</strong>
                      </div>
                      <div className="text-right">
                        <span className="text-[#5C7084] text-[10px] uppercase block">STATUS DE CAMPO</span>
                        <span className={selectedMilestone.status === 'concluido' ? 'text-[#0EA76B] font-bold' : selectedMilestone.status === 'em_andamento' ? 'text-[#0066FF] font-bold' : 'text-[#8E9EAF]'}>
                          {selectedMilestone.status === 'concluido' ? '● CONCLUÍDO NO PRAZO' : selectedMilestone.status === 'em_andamento' ? '● EM EXECUÇÃO (SPI 1.04)' : '○ PROGRAMADO'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.mockupFeed}>
                    <div className={styles.feedItem}>
                      <div className={styles.feedIcon}>
                        <HardHat className="h-4 w-4" />
                      </div>
                      <div className={styles.feedText}>
                        <small>PRÓXIMO MARCO CRÍTICO</small>
                        <strong>Concretagem da Laje 4º Pav.</strong>
                      </div>
                    </div>
                    <div className={styles.feedItem}>
                      <div className={styles.feedIcon} style={{ background: 'rgba(14, 167, 107, 0.15)', color: '#0EA76B' }}>
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <div className={styles.feedText}>
                        <small>STATUS OPERACIONAL</small>
                        <strong>Sem Desvios de Caminho Crítico</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ABA 2: RDO DIGITAL DE CAMPO */}
              {activeTab === 'rdo' && (
                <div>
                  <div className={styles.kpiStrip}>
                    <div className={styles.kpiCard}>
                      <span className={styles.kpiLabel}>Efetivo no Canteiro</span>
                      <div className={styles.kpiValue}>48 OP</div>
                      <span className={styles.kpiMeta}>7 frentes de trabalho</span>
                    </div>
                    <div className={styles.kpiCard}>
                      <span className={styles.kpiLabel}>Clima & Condições</span>
                      <div className={styles.kpiValue} style={{ fontSize: '20px' }}>Ensolarado</div>
                      <span className={styles.kpiMeta} style={{ color: '#E87A18' }}>
                        28°C · Sem chuva
                      </span>
                    </div>
                    <div className={styles.kpiCard}>
                      <span className={styles.kpiLabel}>RDO do Dia</span>
                      <div className={styles.kpiValue}>#142</div>
                      <span className={styles.kpiMeta}>Homologado</span>
                    </div>
                  </div>

                  <div className="rounded border border-[#23394E] bg-[#08131E] p-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-[#23394E] pb-2">
                      <span className="font-mono text-[11px] font-bold text-white flex items-center gap-2">
                        <Camera className="h-3.5 w-3.5 text-[#0066FF]" /> Evidências com Carimbo GPS & Horário
                      </span>
                      <span className="text-[#0EA76B] font-mono text-[10px] font-bold">12 FOTOS SINCRONIZADAS</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                      <div className="rounded bg-[#112030] p-2 border border-[#23394E]">
                        <strong className="text-white block font-mono text-[10.5px]">Armação Laje 4</strong>
                        <span className="text-[#5C7084] text-[10px]">10:42 · GPS -23.55, -46.63</span>
                      </div>
                      <div className="rounded bg-[#112030] p-2 border border-[#23394E]">
                        <strong className="text-white block font-mono text-[10.5px]">Alvenaria Bloco B</strong>
                        <span className="text-[#5C7084] text-[10px]">14:15 · GPS -23.55, -46.63</span>
                      </div>
                      <div className="rounded bg-[#112030] p-2 border border-[#23394E]">
                        <strong className="text-white block font-mono text-[10.5px]">Tubulação Hidráulica</strong>
                        <span className="text-[#5C7084] text-[10px]">16:30 · GPS -23.55, -46.63</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.mockupFeed}>
                    <div className={styles.feedItem}>
                      <div className={styles.feedIcon}>
                        <FileCheck2 className="h-4 w-4" />
                      </div>
                      <div className={styles.feedText}>
                        <small>ASSINATURA DIGITAL</small>
                        <strong>Eng. Resp. CREA-SP #84102</strong>
                      </div>
                    </div>
                    <div className={styles.feedItem}>
                      <div className={styles.feedIcon} style={{ background: 'rgba(0, 102, 255, 0.15)', color: '#0066FF' }}>
                        <CloudSun className="h-4 w-4" />
                      </div>
                      <div className={styles.feedText}>
                        <small>BOLETIM METEOROLÓGICO</small>
                        <strong>Condições Próprias de Trabalho</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ABA 3: FINANCEIRO & MEDIÇÕES */}
              {activeTab === 'financeiro' && (
                <div>
                  <div className={styles.kpiStrip}>
                    <div className={styles.kpiCard}>
                      <span className={styles.kpiLabel}>Boletim de Medição</span>
                      <div className={styles.kpiValue}>R$ 284k</div>
                      <span className={styles.kpiMeta}>BM-06 Aprovado</span>
                    </div>
                    <div className={styles.kpiCard}>
                      <span className={styles.kpiLabel}>Desvio Orçamentário</span>
                      <div className={styles.kpiValue}>-1,8%</div>
                      <span className={styles.kpiMeta}>Economia no orçamento</span>
                    </div>
                    <div className={styles.kpiCard}>
                      <span className={styles.kpiLabel}>Saldo de Contratos</span>
                      <div className={styles.kpiValue}>R$ 1,4M</div>
                      <span className={styles.kpiMeta} style={{ color: '#0066FF' }}>8 Empreiteiros</span>
                    </div>
                  </div>

                  <div className="rounded border border-[#23394E] bg-[#08131E] p-3 space-y-2.5 text-xs">
                    <div className="flex justify-between items-center text-[11px] font-mono">
                      <span className="text-[#8E9EAF] uppercase">Execução Orçamentária da Obra</span>
                      <span className="text-white font-bold">R$ 2.450.000 / R$ 3.600.000 (68%)</span>
                    </div>
                    <div className="h-2 w-full rounded bg-[#112030] overflow-hidden border border-[#23394E]">
                      <div className="h-full bg-[#0066FF]" style={{ width: '68%' }} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 text-[#8E9EAF] font-mono">
                      <span>Mão de Obra: <strong className="text-white">R$ 940.000</strong></span>
                      <span>Materiais & Concreto: <strong className="text-white">R$ 1.510.000</strong></span>
                    </div>
                  </div>

                  <div className={styles.mockupFeed}>
                    <div className={styles.feedItem}>
                      <div className={styles.feedIcon}>
                        <WalletCards className="h-4 w-4" />
                      </div>
                      <div className={styles.feedText}>
                        <small>PRÓXIMO DESEMBOLSO</small>
                        <strong>Folha Empreiteiros (15/09)</strong>
                      </div>
                    </div>
                    <div className={styles.feedItem}>
                      <div className={styles.feedIcon} style={{ background: 'rgba(14, 167, 107, 0.15)', color: '#0EA76B' }}>
                        <Coins className="h-4 w-4" />
                      </div>
                      <div className={styles.feedText}>
                        <small>MARGEM OPERACIONAL</small>
                        <strong>Dentro da Meta (+14,2%)</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ABA 4: QUALIDADE & SST */}
              {activeTab === 'qualidade' && (
                <div>
                  <div className={styles.kpiStrip}>
                    <div className={styles.kpiCard}>
                      <span className={styles.kpiLabel}>Conformidade FVS</span>
                      <div className={styles.kpiValue}>98,2%</div>
                      <span className={styles.kpiMeta}>46 Fichas Avaliadas</span>
                    </div>
                    <div className={styles.kpiCard}>
                      <span className={styles.kpiLabel}>Não Conformidades</span>
                      <div className={styles.kpiValue}>02</div>
                      <span className={styles.kpiMeta} style={{ color: '#E87A18' }}>Em Tratamento</span>
                    </div>
                    <div className={styles.kpiCard}>
                      <span className={styles.kpiLabel}>DDS Realizado</span>
                      <div className={styles.kpiValue}>100%</div>
                      <span className={styles.kpiMeta}>Zero Acidentes</span>
                    </div>
                  </div>

                  <div className="rounded border border-[#23394E] bg-[#08131E] p-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-[#23394E] pb-2 font-mono text-[11px]">
                      <span className="text-white font-bold flex items-center gap-2">
                        <ShieldCheck className="h-3.5 w-3.5 text-[#0EA76B]" /> Inspeções Recentes de Canteiro
                      </span>
                      <span className="text-[#0EA76B] font-bold">PBQP-H / ISO 9001</span>
                    </div>
                    <div className="space-y-1.5 pt-1 text-[11px] font-mono">
                      <div className="flex justify-between items-center rounded bg-[#112030] px-2.5 py-1.5 border border-[#23394E]">
                        <span className="text-white">FVS 14 - Desforma e Cura de Concreto</span>
                        <span className="text-[#0EA76B] font-bold">APROVADA</span>
                      </div>
                      <div className="flex justify-between items-center rounded bg-[#112030] px-2.5 py-1.5 border border-[#23394E]">
                        <span className="text-white">FVS 15 - Prumo e Esquadro de Alvenaria</span>
                        <span className="text-[#0EA76B] font-bold">APROVADA</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.mockupFeed}>
                    <div className={styles.feedItem}>
                      <div className={styles.feedIcon} style={{ color: '#0EA76B', background: 'rgba(14, 167, 107, 0.15)' }}>
                        <Check className="h-4 w-4" />
                      </div>
                      <div className={styles.feedText}>
                        <small>EPI & SEGURANÇA</small>
                        <strong>100% dos Colaboradores Aptos</strong>
                      </div>
                    </div>
                    <div className={styles.feedItem}>
                      <div className={styles.feedIcon}>
                        <Activity className="h-4 w-4" />
                      </div>
                      <div className={styles.feedText}>
                        <small>AUDITORIA INTERNA</small>
                        <strong>Trilha de Evidências Completa</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SELO DE PRANCHA TÉCNICA (SHEET STAMP) */}
              <div className={styles.pranchaFooterStamp}>
                <span>RESPONSÁVEL TÉCNICO: ENG. ALEXANDRE COSTA · CREA-SP #84102</span>
                <span className={styles.stampBadge}>
                  <CheckCircle2 className="h-3 w-3" /> BASE DE DADOS SINCRONIZADA
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          FAIXA DE PROVA SOCIAL CONSOLIDADA (TELEMETRIA AUDITÁVEL)
          ==================================================================== */}
      <section className={styles.metricsBand}>
        <div className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <div className={styles.metricNumber}>
              +R$ 1.8 <em>Bi</em>
            </div>
            <div className={styles.metricTitle}>Volume de Obras sob Gestão</div>
            <div className={styles.metricSub}>Portfólio monitorado com Curva S e controle de avanço real</div>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricNumber}>
              +940 <em>Mil</em>
            </div>
            <div className={styles.metricTitle}>Diários de Obra Homologados</div>
            <div className={styles.metricSub}>Registros no canteiro com foto, clima oficial e GPS</div>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricNumber}>
              38% <em>Menos</em>
            </div>
            <div className={styles.metricTitle}>Tempo Gasto em Relatórios</div>
            <div className={styles.metricSub}>Engenheiros focados na produção e controle de prazos</div>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricNumber}>
              99.4% <em>Auditável</em>
            </div>
            <div className={styles.metricTitle}>Conformidade & Blindagem</div>
            <div className={styles.metricSub}>Evidências jurídicas salvas com assinatura digital</div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          O CAOS DO IMPROVISO VS RIGOR (ANTES X DEPOIS)
          ==================================================================== */}
      <section id="plataforma" className={styles.problemSection}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionKicker}>
              <AlertTriangle className="h-3.5 w-3.5" /> Diagnóstico de Canteiro
            </span>
            <h2 className={styles.sectionTitle}>
              O custo invisível do improviso na gestão de obras.
            </h2>
            <p className={styles.sectionSubtitle}>
              Quando as decisões dependem de planilhas paralelas e conversas soltas no WhatsApp, os desvios de prazo e custo só chegam à diretoria quando já se tornaram prejuízo irreversível.
            </p>
          </div>

          <div className={styles.problemGrid}>
            {/* CARD CAOS TRADICIONAL */}
            <div className={styles.problemCardChaos}>
              <span className={styles.cardBadgeChaos}>
                <ShieldAlert className="h-3.5 w-3.5" /> Gestão Tradicional Desconectada
              </span>
              <h3 className={styles.cardHeadingChaos}>Onde a Operação Sangra</h3>

              <div className={styles.comparisonList}>
                <div className={styles.comparisonItem}>
                  <X className={styles.comparisonIconFail} />
                  <div className={styles.comparisonText}>
                    <strong className="text-slate-900">Planilhas Concorrentes e Desatualizadas</strong>
                    <p>O engenheiro de campo tem uma versão, o setor de compras tem outra e ninguém sabe qual é o cronograma oficial.</p>
                  </div>
                </div>

                <div className={styles.comparisonItem}>
                  <X className={styles.comparisonIconFail} />
                  <div className={styles.comparisonText}>
                    <strong className="text-slate-900">Evidências Perdidas em Grupos de WhatsApp</strong>
                    <p>Fotos de canteiro ficam no celular pessoal do encarregado, sem geolocalização nem rastreabilidade técnica.</p>
                  </div>
                </div>

                <div className={styles.comparisonItem}>
                  <X className={styles.comparisonIconFail} />
                  <div className={styles.comparisonText}>
                    <strong className="text-slate-900">Estouro de Orçamento Descoberto Tarde</strong>
                    <p>O desvio financeiro só é percebido 3 semanas após a medição já ter sido liberada e paga ao empreiteiro.</p>
                  </div>
                </div>

                <div className={styles.comparisonItem}>
                  <X className={styles.comparisonIconFail} />
                  <div className={styles.comparisonText}>
                    <strong className="text-slate-900">Vulnerabilidade Jurídica com Terceiros</strong>
                    <p>Falta de RDO diário com assinatura gera insegurança grave em notificações, multas e pleitos trabalhistas.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD PRECISÃO RIGOR */}
            <div className={styles.problemCardRigor}>
              <span className={styles.cardBadgeRigor}>
                <Zap className="h-3.5 w-3.5" /> Precisão RIGOR
              </span>
              <h3 className={styles.cardHeadingRigor}>Controle Real e Previsibilidade</h3>

              <div className={styles.comparisonList}>
                <div className={styles.comparisonItem}>
                  <CheckCircle2 className={styles.comparisonIconPass} />
                  <div className={styles.comparisonText}>
                    <strong>Base Técnica Única e Centralizada</strong>
                    <p>Do planejamento inicial ao último as-built, canteiro e diretoria trabalham sobre a mesma verdade de dados.</p>
                  </div>
                </div>

                <div className={styles.comparisonItem}>
                  <CheckCircle2 className={styles.comparisonIconPass} />
                  <div className={styles.comparisonText}>
                    <strong>RDO Digital em 3 Minutos no Celular</strong>
                    <p>Fotos carimbadas com GPS, clima meteorológico automático e efetivo registrado sem papel ou burocracia.</p>
                  </div>
                </div>

                <div className={styles.comparisonItem}>
                  <CheckCircle2 className={styles.comparisonIconPass} />
                  <div className={styles.comparisonText}>
                    <strong>Alertas Preventivos de SPI e Curva S</strong>
                    <p>Identifique desvios de caminho crítico na primeira semana de atraso, permitindo correção antes do estouro.</p>
                  </div>
                </div>

                <div className={styles.comparisonItem}>
                  <CheckCircle2 className={styles.comparisonIconPass} />
                  <div className={styles.comparisonText}>
                    <strong>Histórico Imutável e Relatórios em 1 Clique</strong>
                    <p>RDOs homologados eletronicamente e databooks técnicos completos para auditorias de bancos e investidores.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          MÓDULOS DE ENGENHARIA (6 PILARES OPERACIONAIS)
          ==================================================================== */}
      <section id="modulos" className={styles.platformSection}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionKicker}>
              <Layers className="h-3.5 w-3.5" /> Arquitetura de Sistemas
            </span>
            <h2 className={styles.sectionTitle}>
              Uma plataforma completa para todas as etapas da obra.
            </h2>
            <p className={styles.sectionSubtitle}>
              Módulos estruturados de acordo com o vocabulário e a rotina da engenharia civil brasileira.
            </p>
          </div>

          <div className={styles.modulesGrid}>
            {modulesList.map((m) => {
              const Icon = m.icon;
              return (
                <div key={m.code} className={styles.moduleCard}>
                  <div>
                    <div className={styles.moduleTop}>
                      <div className={styles.moduleIconBox}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className={styles.moduleCode}>{m.code}</span>
                    </div>

                    <h3 className={styles.moduleTitle}>{m.title}</h3>
                    <p className={styles.moduleText}>{m.text}</p>
                  </div>

                  <div className={styles.moduleFooter}>
                    <span>{m.dimensionTag}</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ====================================================================
          SIMULADOR DE ROI (EFICIÊNCIA OPERACIONAL)
          ==================================================================== */}
      <section id="simulador" className={styles.roiSection}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionKicker} style={{ color: '#388BFD' }}>
              <Sliders className="h-3.5 w-3.5" /> Simulador de Eficiência Construtiva
            </span>
            <h2 className={styles.sectionTitle} style={{ color: '#F4F6F8' }}>
              Calcule o Retorno do RIGOR na sua Construtora.
            </h2>
            <p className={styles.sectionSubtitle} style={{ color: '#8E9EAF' }}>
              Ajuste o volume de obras e o orçamento médio para projetar o impacto financeiro da governança técnica.
            </p>
          </div>

          <div className={styles.roiCard}>
            {/* CONTROLES DE RÉGUA TÉCNICA */}
            <div>
              <h3 className="font-heading text-2xl font-bold uppercase text-white tracking-wide">
                Parâmetros da Operação
              </h3>
              <p className="mt-1 text-xs text-[#8E9EAF] font-mono">
                Defina a carteira simultânea sob gestão da sua empresa:
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
                    aria-label="Número de obras ativas"
                  />
                  <div className="flex justify-between font-mono text-[10px] text-[#5C7084]">
                    <span>1 obra</span>
                    <span>12 obras</span>
                    <span>25 obras</span>
                  </div>
                </div>

                {/* SLIDER 2: ORÇAMENTO MÉDIO POR OBRA */}
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
                    aria-label="Orçamento médio por obra"
                  />
                  <div className="flex justify-between font-mono text-[10px] text-[#5C7084]">
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
                <strong>{formatMoney(roiCalculations.economiaTotalAno)}</strong>
                <p>Prevenção de 2.4% de retrabalho + ganho em produtividade de engenharia.</p>
              </div>

              <div className={styles.roiBreakdownGrid}>
                <div className={styles.breakdownItem}>
                  <small>Horas Técnicas Poupadas</small>
                  <span>~{roiCalculations.horasEconomizadas}h / mês</span>
                  <sub>Menos relatórios manuais</sub>
                </div>
                <div className={styles.breakdownItem}>
                  <small>Capital sob Governança</small>
                  <span>{formatMoney(roiCalculations.totalSobGestao)}</span>
                  <sub>100% Rastreável</sub>
                </div>
              </div>

              <a href="#planos" className={styles.roiCtaBtn}>
                Garantir Essa Eficiência <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          METODOLOGIA EM 3 PASSOS (DO CANTEIRO À DIRETORIA)
          ==================================================================== */}
      <section id="como-funciona" className={styles.workflowSection}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionKicker}>
              <Activity className="h-3.5 w-3.5" /> Metodologia de Precisão
            </span>
            <h2 className={styles.sectionTitle}>
              O dado nasce no canteiro. A decisão chega à gestão.
            </h2>
            <p className={styles.sectionSubtitle}>
              Como transformamos a rotina fragmentada da obra em um fluxo contínuo de inteligência executiva.
            </p>
          </div>

          <div className={styles.stepsGrid}>
            <div className={styles.stepCard}>
              <div className={styles.stepHead}>
                <span className={styles.stepBadge}>01</span>
                <Layers className="h-5 w-5 text-[#0066FF]" />
              </div>
              <h3>Estruture a EAP e o Cronograma Base</h3>
              <p>
                Importe cronogramas do Excel em segundos, defina a linha de base física, distribua frentes de serviço e aloque orçamentos por centro de custo de forma intuitiva.
              </p>
            </div>

            <div className={styles.stepCard}>
              <div className={styles.stepHead}>
                <span className={styles.stepBadge}>02</span>
                <HardHat className="h-5 w-5 text-[#0066FF]" />
              </div>
              <h3>Colete no Campo sem Fricção</h3>
              <p>
                Encarregados e engenheiros alimentam o diário de obra offline pelo celular em 3 minutos, com fotos carimbadas por GPS, efetivo por função e assinaturas digitais.
              </p>
            </div>

            <div className={styles.stepCard}>
              <div className={styles.stepHead}>
                <span className={styles.stepBadge}>03</span>
                <BarChart3 className="h-5 w-5 text-[#0066FF]" />
              </div>
              <h3>Decida por Índices SPI e Curva S</h3>
              <p>
                A diretoria acompanha boletins de medição consolidados, margens operacionais e alertas preventivos em tempo real, corrigindo desvios antes que virem prejuízo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          TABELA DE PLANOS & PREÇOS COM SELETOR DE CICLO
          ==================================================================== */}
      <section id="planos" className={styles.pricingSection}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader} style={{ textAlign: 'center', margin: '0 auto 36px auto' }}>
            <span className={styles.sectionKicker}>
              <Coins className="h-3.5 w-3.5" /> Planos Transparentes
            </span>
            <h2 className={styles.sectionTitle}>Escolha o ritmo da sua operação.</h2>
            <p className={styles.sectionSubtitle}>
              Todos os planos incluem suporte assistido de implantação, atualizações contínuas e dados 100% isolados.
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
                  {isPro && <div className={styles.planTag}>MAIS ADOTADO</div>}

                  <div>
                    <div className={styles.planHead}>
                      <span className="font-mono text-[11px] font-black tracking-widest text-[#0066FF] uppercase">
                        PLANO {key}
                      </span>
                    </div>

                    <h3 className={styles.planName}>{plan.name}</h3>
                    <p className="mt-1 text-xs opacity-75 min-h-[34px]">{plan.description}</p>

                    <div className={styles.planPrice}>
                      <sup>R$</sup>
                      <strong>{formatMoney(monthlyPrice).replace('R$', '').trim()}</strong>
                      <span>/mês</span>
                    </div>

                    <p className={styles.planCycleInfo}>
                      {billing === 'monthly'
                        ? 'Cobrança mensal sem fidelidade.'
                        : `${formatMoney(totalCyclePrice)} faturado no ciclo ${cycle.label.toLowerCase()}.`}
                    </p>

                    <div className={styles.planLimits}>
                      <span>
                        <Building2 className="h-4 w-4 text-[#0066FF]" />
                        {Number.isFinite(plan.limits.obras)
                          ? `${plan.limits.obras} Obras ativas`
                          : 'Obras simultâneas ilimitadas'}
                      </span>
                      <span>
                        <UsersRound className="h-4 w-4 text-[#0066FF]" />
                        {Number.isFinite(plan.limits.users)
                          ? `${plan.limits.users} Usuários liberados`
                          : 'Usuários ilimitados'}
                      </span>
                    </div>

                    <ul className={styles.planFeatures}>
                      {plan.features.map((feat, fIdx) => (
                        <li key={fIdx}>
                          <Check className="h-4 w-4" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <a
                    href={`mailto:comercial@rigorobras.com.br?subject=Interesse no plano ${plan.name} (${cycle.label})`}
                    className={
                      isPro
                        ? 'mt-6 flex h-12 items-center justify-center gap-2 rounded bg-[#0066FF] text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-[#0066FF]/40 transition hover:brightness-110'
                        : 'mt-6 flex h-12 items-center justify-center gap-2 rounded border border-[#23394E] bg-white text-xs font-black uppercase tracking-wider text-[#08131E] transition hover:bg-[#08131E] hover:text-white'
                    }
                  >
                    Solicitar Demonstração <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              );
            })}
          </div>

          <p className="mt-8 text-center font-mono text-[11px] text-[#5C7084]">
            Cobrança segura com cartão de crédito ou boleto bancário. Cancelamento simplificado a qualquer momento.
          </p>
        </div>
      </section>

      {/* ====================================================================
          FAQ SECTION (ACORDEÃO INTERATIVO)
          ==================================================================== */}
      <section id="faq" className={styles.faqSection}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader} style={{ textAlign: 'center', margin: '0 auto 48px auto' }}>
            <span className={styles.sectionKicker}>
              <FileCheck2 className="h-3.5 w-3.5" /> Esclarecimentos Técnicos
            </span>
            <h2 className={styles.sectionTitle}>Perguntas Frequentes de Engenheiros e Diretores.</h2>
            <p className={styles.sectionSubtitle}>
              Detalhes práticos sobre implantação, rotina de campo e segurança da informação.
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
              <div className="inline-flex items-center gap-2 rounded border border-[#23394E] bg-[#08131E] px-3 py-1 font-mono text-[10.5px] font-bold uppercase tracking-[0.16em] text-[#0066FF]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#0066FF]" />
                PRÓXIMO PASSO EXECUTIVO
              </div>
              <h2 className={styles.finalCtaTitle}>
                Sua obra já é complexa.<br />
                <span>A gestão não precisa ser.</span>
              </h2>
              <p className={styles.finalCtaDesc}>
                Junte-se às construtoras e engenharias que eliminaram o improviso e profissionalizaram o controle do canteiro à diretoria.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <a
                href="mailto:comercial@rigorobras.com.br?subject=Quero agendar uma demonstração do RIGOR"
                className="flex h-13 items-center justify-center gap-2 rounded bg-[#0066FF] text-xs font-black uppercase tracking-wider text-white shadow-xl shadow-[#0066FF]/40 transition hover:brightness-110"
              >
                Agendar Demonstração Guiada <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                href="/login"
                className="flex h-13 items-center justify-center gap-2 rounded border border-[#23394E] bg-[#08131E] text-xs font-bold uppercase tracking-wider text-white transition hover:bg-[#112030]"
              >
                Acessar Plataforma RIGOR
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          FOOTER DE ENGENHARIA
          ==================================================================== */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <RigorLogo markSize={30} theme="dark" showTagline={true} taglineText="BUILT ON PRECISION" />
            <p>
              Sistema completo de controle de obras civis, Curva S, RDO digital de campo, inteligência financeira e qualidade para a construção civil.
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
            <h4>Governança</h4>
            <ul>
              <li><Link href="/termos">Termos de Uso</Link></li>
              <li><Link href="/privacidade">Privacidade & LGPD</Link></li>
              <li><Link href="/cookies">Gestão de Cookies</Link></li>
            </ul>
          </div>

          <div className={styles.footerCol}>
            <h4>Central Técnica</h4>
            <ul>
              <li><a href="mailto:comercial@rigorobras.com.br">comercial@rigorobras.com.br</a></li>
              <li><span>Segunda a Sexta · 08h às 18h</span></li>
              <li className="pt-2 font-mono text-[11px] text-[#0EA76B] font-bold flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#0EA76B] animate-pulse" />
                99.8% Disponibilidade Operacional
              </li>
            </ul>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <span>© {new Date().getFullYear()} RIGOR TECNOLOGIA EM CONSTRUÇÃO CIVIL. TODOS OS DIREITOS RESERVADOS.</span>
          <span>BUILT ON PRECISION · PADRÃO CREA-COMPLIANT</span>
        </div>
      </footer>
    </main>
  );
}
