'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarRange,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  HardHat,
  Menu,
  PackageCheck,
  ShieldCheck,
  TrendingUp,
  UsersRound,
  WalletCards,
  X,
} from 'lucide-react';
import { SAAS_PLANS, type SaasPlan } from '@/lib/saas';
import styles from './landing-page.module.css';

type BillingCycle = 'monthly' | 'semiannual' | 'annual';

const cycles: Record<
  BillingCycle,
  { label: string; months: number; discount: number; badge?: string }
> = {
  monthly: { label: 'Mensal', months: 1, discount: 0 },
  semiannual: { label: 'Semestral', months: 6, discount: 0.05, badge: '5% off' },
  annual: { label: 'Anual', months: 12, discount: 0.15, badge: '15% off' },
};

const modules = [
  { icon: CalendarRange, title: 'Planejamento', text: 'Cronogramas, etapas, avanço previsto e realizado.' },
  { icon: ClipboardCheck, title: 'RDO digital', text: 'Diário completo com equipe, clima, atividades e assinatura.' },
  { icon: WalletCards, title: 'Financeiro', text: 'Custos, medições, contratos e fluxo financeiro por obra.' },
  { icon: PackageCheck, title: 'Suprimentos', text: 'Estoque, movimentações, requisições e fornecedores.' },
  { icon: ShieldCheck, title: 'Qualidade e SST', text: 'Inspeções, não conformidades, DDS e ocorrências.' },
  { icon: FileCheck2, title: 'Documentos', text: 'Arquivos técnicos e evidências organizados por obra.' },
];

const steps = [
  ['01', 'Planeje', 'Estruture obras, etapas, responsáveis, prazos e orçamento.'],
  ['02', 'Execute', 'Registre o campo pelo celular sem perder o ritmo da operação.'],
  ['03', 'Decida', 'Converta registros em indicadores claros para agir antes do desvio.'],
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
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.logo} aria-label="RIGOR — Página inicial">
            <span className={styles.logoMark}><HardHat aria-hidden="true" /></span>
            <span>RIGOR</span>
          </Link>
          <nav className={styles.desktopNav} aria-label="Navegação principal">
            <a href="#plataforma">Plataforma</a>
            <a href="#como-funciona">Como funciona</a>
            <a href="#planos">Planos</a>
            <a href="#contato">Contato</a>
          </nav>
          <div className={styles.headerActions}>
            <Link href="/login" className={styles.loginLink}>Entrar</Link>
            <a href="#planos" className={styles.headerCta}>Conhecer planos <ArrowRight /></a>
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
              ['Como funciona', '#como-funciona'],
              ['Planos', '#planos'],
              ['Contato', '#contato'],
            ].map(([label, href]) => (
              <a key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</a>
            ))}
            <Link href="/login">Entrar na plataforma</Link>
          </nav>
        )}
      </header>

      <section className={styles.hero}>
        <div className={styles.heroGrid} aria-hidden="true" />
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <div className={styles.eyebrow}><span /> Gestão de obras sem improviso</div>
            <h1>Controle real<br />para <em>obras reais.</em></h1>
            <p>
              O RIGOR conecta escritório, engenharia e canteiro em uma única operação.
              Planeje, registre, acompanhe e decida com dados confiáveis.
            </p>
            <div className={styles.heroActions}>
              <a href="#planos" className={styles.primaryCta}>Ver planos e preços <ArrowRight /></a>
              <a href="#plataforma" className={styles.secondaryCta}>Explorar a plataforma <ChevronRight /></a>
            </div>
            <div className={styles.heroTrust}>
              <span><CheckCircle2 /> Implantação assistida</span>
              <span><CheckCircle2 /> Acesso por função</span>
              <span><CheckCircle2 /> Dados isolados por empresa</span>
            </div>
          </div>

          <div className={styles.heroVisual} aria-label="Visão ilustrativa do painel RIGOR">
            <div className={styles.visualRail}>
              <span className={styles.miniLogo}>R</span>
              {[BarChart3, Building2, ClipboardCheck, PackageCheck, Camera].map((Icon, index) => (
                <span key={index} className={index === 0 ? styles.railActive : ''}><Icon /></span>
              ))}
            </div>
            <div className={styles.visualMain}>
              <div className={styles.visualTop}>
                <div><small>VISÃO EXECUTIVA</small><strong>Obra em foco</strong></div>
                <span>ATUALIZADO AGORA</span>
              </div>
              <div className={styles.metricRow}>
                <article><small>Avanço físico</small><strong>68,4%</strong><i className={styles.up}>+4,2%</i></article>
                <article><small>Prazo consumido</small><strong>61%</strong><i>142 dias</i></article>
                <article><small>Efetivo hoje</small><strong>47</strong><i>6 equipes</i></article>
              </div>
              <div className={styles.chartCard}>
                <div className={styles.cardTitle}><span>Curva de avanço</span><small>Últimos 6 meses</small></div>
                <div className={styles.chart}>
                  <div className={styles.chartBars}>
                    {[32, 45, 51, 63, 74, 88].map((height, index) => (
                      <span key={index} style={{ height: `${height}%` }} />
                    ))}
                  </div>
                  <svg viewBox="0 0 500 120" preserveAspectRatio="none" aria-hidden="true">
                    <path d="M0 104 C70 92, 82 80, 140 76 S220 65, 270 50 S365 44, 500 12" />
                  </svg>
                </div>
              </div>
              <div className={styles.visualBottom}>
                <article><Clock3 /><div><small>Próxima entrega</small><strong>Montagem estrutural</strong></div><b>03 dias</b></article>
                <article><ShieldCheck /><div><small>Qualidade</small><strong>Inspeções conformes</strong></div><b>96%</b></article>
              </div>
            </div>
            <div className={styles.floatingStatus}>
              <span><TrendingUp /></span><div><small>PREVISÃO DE ENTREGA</small><strong>Dentro do prazo</strong></div>
            </div>
          </div>
        </div>
        <div className={styles.heroStrip}>
          <span>PLANEJAMENTO</span><i /> <span>CAMPO</span><i /> <span>CUSTOS</span><i />
          <span>QUALIDADE</span><i /> <span>DECISÃO</span>
        </div>
      </section>

      <section className={styles.problemSection}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionKicker}>O problema não é falta de esforço</div>
          <div className={styles.problemGrid}>
            <h2>É informação espalhada demais para uma operação que precisa agir rápido.</h2>
            <div className={styles.problemList}>
              {[
                ['Planilhas desconectadas', 'Versões diferentes e decisões baseadas em informação antiga.'],
                ['Campo sem rastreabilidade', 'Fotos, mensagens e evidências perdidas entre conversas.'],
                ['Desvio percebido tarde', 'Prazo e custo estouram antes de chegar à diretoria.'],
              ].map(([title, text], index) => (
                <article key={title}><span>0{index + 1}</span><div><strong>{title}</strong><p>{text}</p></div></article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="plataforma" className={styles.platformSection}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeading}>
            <div><span className={styles.orangeKicker}>Uma plataforma. Toda a obra.</span><h2>Do primeiro cronograma ao último relatório.</h2></div>
            <p>Todos os módulos compartilham a mesma base de dados. A informação entra uma vez e passa a trabalhar para toda a operação.</p>
          </div>
          <div className={styles.moduleGrid}>
            {modules.map(({ icon: Icon, title, text }, index) => (
              <article key={title} className={styles.moduleCard}>
                <div className={styles.moduleTop}><span><Icon /></span><small>0{index + 1}</small></div>
                <h3>{title}</h3><p>{text}</p><div className={styles.moduleLine} />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="como-funciona" className={styles.workflowSection}>
        <div className={styles.sectionInner}>
          <div className={styles.workflowHeader}>
            <span className={styles.orangeKicker}>Operação conectada</span>
            <h2>O dado nasce no campo.<br />A decisão chega à gestão.</h2>
          </div>
          <div className={styles.steps}>
            {steps.map(([number, title, text], index) => (
              <article key={number}>
                <div className={styles.stepNumber}>{number}</div>
                <div><h3>{title}</h3><p>{text}</p></div>
                {index < steps.length - 1 && <ArrowRight className={styles.stepArrow} />}
              </article>
            ))}
          </div>
          <div className={styles.audienceBar}>
            <strong>Feito para quem constrói</strong>
            <span><HardHat /> Engenharia</span><span><UsersRound /> Equipes de campo</span>
            <span><BarChart3 /> Gestores</span><span><Building2 /> Construtoras</span>
          </div>
        </div>
      </section>

      <section id="planos" className={styles.pricingSection}>
        <div className={styles.sectionInner}>
          <div className={styles.pricingHeader}>
            <div><span className={styles.orangeKicker}>Planos transparentes</span><h2>Escolha o ritmo da sua operação.</h2><p>Todos os planos incluem acesso seguro, suporte de implantação e atualizações da plataforma.</p></div>
            <div className={styles.billingToggle} role="group" aria-label="Período de cobrança">
              {(Object.keys(cycles) as BillingCycle[]).map((key) => (
                <button key={key} type="button" onClick={() => setBilling(key)} className={billing === key ? styles.billingActive : ''}>
                  {cycles[key].label}{cycles[key].badge && <small>{cycles[key].badge}</small>}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.pricingGrid}>
            {(Object.keys(SAAS_PLANS) as SaasPlan[]).map((key) => {
              const plan = SAAS_PLANS[key];
              const cycle = cycles[billing];
              const monthly = plan.price * (1 - cycle.discount);
              const total = monthly * cycle.months;
              const featured = key === 'PRO';
              return (
                <article key={key} className={`${styles.priceCard} ${featured ? styles.featuredPlan : ''}`}>
                  {featured && <div className={styles.recommended}>MAIS ESCOLHIDO</div>}
                  <div className={styles.planHead}><div><small>{key}</small><h3>{plan.name}</h3></div><span>{key === 'STARTER' ? '01' : key === 'PRO' ? '02' : '03'}</span></div>
                  <p className={styles.planDescription}>{plan.description}</p>
                  <div className={styles.price}><sup>R$</sup><strong>{formatMoney(monthly).replace('R$', '').trim()}</strong><span>/mês</span></div>
                  <p className={styles.billingNote}>
                    {billing === 'monthly' ? 'Cobrança mensal, cancele quando quiser.' : `${formatMoney(total)} por ${cycle.label.toLowerCase()}. Economia de ${Math.round(cycle.discount * 100)}%.`}
                  </p>
                  <div className={styles.planLimits}>
                    <span><Building2 /> {Number.isFinite(plan.limits.obras) ? `${plan.limits.obras} obras` : 'Obras ilimitadas'}</span>
                    <span><UsersRound /> {Number.isFinite(plan.limits.users) ? `${plan.limits.users} usuários` : 'Usuários ilimitados'}</span>
                  </div>
                  <ul>{plan.features.map((feature) => <li key={feature}><Check />{feature}</li>)}</ul>
                  <a href={`mailto:comercial@rigorobras.com.br?subject=Interesse no plano ${plan.name} - ${cycle.label}`} className={featured ? styles.planCtaPrimary : styles.planCta}>Solicitar demonstração <ArrowRight /></a>
                </article>
              );
            })}
          </div>
          <p className={styles.pricingFootnote}>Valores em reais. Cobrança recorrente segura via cartão pela AbacatePay. Descontos já aplicados nos ciclos semestral e anual.</p>
        </div>
      </section>

      <section id="contato" className={styles.finalCta}>
        <div className={styles.finalGrid} aria-hidden="true" />
        <div className={styles.sectionInner}>
          <div className={styles.finalCtaInner}>
            <div><span className={styles.eyebrow}><span /> Próximo passo</span><h2>Sua obra já é complexa.<br /><em>A gestão não precisa ser.</em></h2></div>
            <div className={styles.finalAction}><p>Converse com a equipe RIGOR e veja como organizar sua operação em uma única plataforma.</p><a href="mailto:comercial@rigorobras.com.br?subject=Quero conhecer o RIGOR" className={styles.primaryCta}>Agendar uma demonstração <ArrowRight /></a></div>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div><Link href="/" className={styles.logo}><span className={styles.logoMark}><HardHat /></span><span>RIGOR</span></Link><p>Gestão de obras com método, clareza e resultado.</p></div>
          <div><strong>Produto</strong><a href="#plataforma">Plataforma</a><a href="#planos">Planos</a><Link href="/login">Entrar</Link></div>
          <div><strong>Legal</strong><Link href="/termos">Termos de Uso</Link><Link href="/privacidade">Privacidade e LGPD</Link><Link href="/cookies">Cookies</Link></div>
          <div><strong>Contato</strong><a href="mailto:comercial@rigorobras.com.br">comercial@rigorobras.com.br</a><span>Brasil</span></div>
        </div>
        <div className={styles.footerBottom}><span>© {new Date().getFullYear()} RIGOR. Todos os direitos reservados.</span><span>Construído para quem constrói.</span></div>
      </footer>
    </main>
  );
}
