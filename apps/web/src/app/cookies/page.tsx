import { LegalPage } from '@/components/legal/legal-page';
export const metadata = { title: 'Cookies | RIGOR' };
export default function CookiesPage() {
  return <LegalPage title="Política de Cookies" description="Tecnologias usadas para manter a plataforma segura e funcional.">
    <section><h2>1. Uso atual</h2><p>A RIGOR utiliza cookies e armazenamento local estritamente necessários para autenticação, segurança, preferência de sessão e funcionamento da interface. Eles não são usados para publicidade comportamental.</p></section>
    <section><h2>2. Tecnologias opcionais</h2><p>Se ferramentas de análise ou marketing não essenciais forem adicionadas, elas permanecerão desativadas até uma escolha válida do visitante, quando o consentimento for exigido. Esta política e o painel de preferências serão atualizados.</p></section>
    <section><h2>3. Controle</h2><p>O navegador permite excluir ou bloquear cookies. Bloquear os necessários pode impedir login, proteção contra fraude e recursos essenciais da plataforma.</p></section>
  </LegalPage>;
}
