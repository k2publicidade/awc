# Relatório executivo de lançamento — RIGOR

**Data da revisão:** 11/08/2026
**Escopo:** SaaS web multiempresa, painel das construtoras e painel RIGOR CONTROL (MASTER ADMIN)
**Situação:** produção publicada e operacional para iniciar o onboarding do piloto assistido

## Resumo executivo

O núcleo web do RIGOR, o painel das empresas e o RIGOR CONTROL (MASTER ADMIN) estão publicados em produção na Vercel. O MASTER ADMIN possui ambiente visual e autorização próprios, sem acesso cruzado com o painel operacional das empresas. A plataforma permite provisionar clientes, controlar assinatura e acesso, administrar usuários, redefinir senhas e consultar/exportar relatórios consolidados.

O Supabase foi reativado, configurado com Supavisor e recebeu as duas migrações pendentes. A aplicação usa o Transaction Pooler na porta 6543 e as operações Prisma usam o Session Pooler na porta 5432. O endereço público atual é `https://awc-web-ruby.vercel.app`; o health check público confirma o banco conectado.

## Entregas concluídas

### Governança da plataforma

- Papel exclusivo `MASTER_ADMIN`, separado dos papéis das empresas.
- Workspace interno `RIGOR Platform`, invisível nas métricas e listas de clientes.
- Redirecionamento automático: MASTER ADMIN entra em `/master`; usuários das empresas entram em `/dashboard`.
- Bloqueio de chamadas às APIs operacionais por identidades de plataforma.
- Bloqueio de acesso ao painel MASTER por qualquer papel de empresa.

### Gestão de clientes

- Cadastro de empresa, plano, status comercial, cobrança e administrador principal.
- Geração automática de workspace e slug exclusivos.
- Ativação e suspensão da empresa sem exclusão de histórico.
- Alteração de plano e status da assinatura apenas pelo MASTER ADMIN.
- Limites de obras e usuários preservados conforme o plano contratado.

### Gestão de usuários e segurança

- Ativação e desativação de usuários de qualquer empresa cliente.
- Redefinição de senha sem exposição da senha anterior.
- Senha temporária com hash bcrypt e custo 12.
- Troca obrigatória no próximo acesso; enquanto pendente, as APIs da empresa ficam bloqueadas.
- Revalidação do usuário e da empresa no banco a cada operação protegida, fazendo bloqueios terem efeito imediato mesmo com JWT vigente.
- Registro de último login.
- Trilha de auditoria com ator, empresa, ação, alvo, IP, user-agent e horário.
- Cabeçalhos HTTP de proteção contra framing, MIME sniffing e downgrade HTTPS.
- Cadastro público de empresas fechado durante o piloto; novos clientes entram somente pelo MASTER ADMIN.

### Importação assistida de obras

- Central própria em `/obras/importar`, acessível pelo módulo de Obras.
- Importação de planilhas Excel (`.xlsx`), arquivos CSV e documentos Word (`.docx`) de até 4 MB.
- Modelo Excel oficial com abas separadas para dados da obra e etapas do cronograma.
- Detecção e normalização de datas, valores em reais, percentuais e nomes de campos em português.
- Pré-visualização editável antes da gravação, com avisos e nível de confiança dos dados identificados.
- Criação atômica da obra e das etapas em uma única transação, respeitando permissões, tenant e limite do plano.
- Arquivo-fonte processado em memória e não armazenado pela plataforma.
- Registro da importação na trilha de auditoria.

### Relatórios MASTER

- Empresas totais, ativas, em trial e inadimplentes.
- Receita recorrente mensal estimada por plano.
- Usuários totais e ativos.
- Obras totais e em andamento.
- RDOs emitidos nos últimos 30 dias.
- Crescimento mensal de empresas, usuários e obras.
- Distribuição de planos e assinaturas.
- Ranking de maiores operações.
- Atividade administrativa recente.
- Exportação CSV da carteira de clientes.
- Endpoint público de saúde em `/api/health`, sem exposição de credenciais.

## Validações executadas

| Verificação | Resultado |
|---|---|
| TypeScript estrito do web app | Aprovado, zero erros |
| ESLint do monorepo | Aprovado, zero erros |
| Build de produção Next.js 16.3 | Aprovado, 61 páginas/rotas geradas |
| Geração do Prisma Client | Aprovada |
| Validação do schema Prisma | Aprovada |
| Sintaxe do provisionador MASTER | Aprovada |
| Playwright desktop/mobile do login | Aprovado, sem erro de console ou overflow |
| Proteção HTTP de `/master` e API MASTER | Aprovada: redirect 307 e API 401 sem sessão |
| Cabeçalhos de segurança | Aprovados |
| Migrações no Supabase | Aprovadas: `202608110001_master_admin` e `202608110002_saas_tenant_fields` |
| Compatibilidade schema × banco | Aprovada: nenhuma diferença detectada pelo Prisma |
| Deploy de produção Vercel | Aprovado, 61 páginas/rotas e alias público promovido |
| Health check público | Aprovado: HTTP 200, `database: connected` |
| Login MASTER em produção | Aprovado em sessão isolada: papel `MASTER_ADMIN` e `/master` HTTP 200 |
| Importação de obra em produção | Aprovada: autenticação, tela, modelo XLSX e pré-visualização com duas etapas |
| Testes do parser de importação | Aprovados para CSV, XLSX, Word, datas e valores brasileiros |
| Auditoria de dependências do build web | Aprovada: zero vulnerabilidades na Vercel |
| Cadastro público durante o piloto | Bloqueado: página por convite e API HTTP 403 |

## Configuração de produção concluída

### 1. Banco de dados e conexões

O projeto Supabase `fkjkwxgvsjmrmnfuxjyy` está ativo. As credenciais foram mantidas somente nos ambientes locais ignorados pelo Git e nas variáveis criptografadas da Vercel:

- `DATABASE_URL`: connection string do pooler para uso da aplicação;
- `DIRECT_URL`: conexão direta ou session pooler para migrações;
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` para arquivos e integrações existentes.

As URLs foram testadas no Prisma, no servidor local e no endpoint público `/api/health`.

### 2. Migrações

As migrações foram aplicadas. Para os próximos deploys, o comando idempotente permanece:

```bash
npm run db:migrate:deploy
```

As migrações são aditivas e não apagaram os dados existentes da AWC.

### 3. Conta proprietária

Foi criada a conta interna `k2publicidade2@gmail.com`, separada do workspace AWC, com senha temporária e troca obrigatória no primeiro acesso. Para recriar ou alterar essa identidade no futuro, defina:

```text
MASTER_ADMIN_NAME
MASTER_ADMIN_EMAIL
MASTER_ADMIN_PASSWORD
```

A senha precisa ter no mínimo 12 caracteres, maiúscula, minúscula e número. Depois execute:

```bash
npm run master:create
```

Não publique essas três variáveis em arquivos versionados. Após o provisionamento, elas podem ser removidas do ambiente de hospedagem.

### 4. Hospedagem

Variáveis obrigatórias no ambiente de produção:

- `DATABASE_URL` e `DIRECT_URL`;
- `NEXTAUTH_URL` com o domínio HTTPS definitivo;
- `NEXTAUTH_SECRET` novo, aleatório e exclusivo de produção;
- credenciais Supabase;
- `CRON_SECRET` forte;
- Google OAuth somente se o login Google for utilizado, com callback do domínio de produção.

O projeto `awc-web` está vinculado à Vercel e publicado em `https://awc-web-ruby.vercel.app`. As oito variáveis obrigatórias de produção estão criptografadas. O build de publicação é:

```bash
npm ci
npm run build
```

### 5. Onboarding dos clientes

1. Entrar em `/login` com o MASTER ADMIN.
2. Abrir **Nova empresa** no RIGOR CONTROL.
3. Informar plano, status, e-mail de cobrança e responsável.
4. Entregar a senha temporária por canal seguro.
5. Acompanhar a troca obrigatória da senha e o primeiro acesso.
6. Validar uma obra, um RDO, uma movimentação financeira e um relatório com cada cliente.

## Pendências antes de venda pública em escala

Estas pendências não impedem um piloto assistido com dois clientes, mas devem ser concluídas antes de abrir aquisição automática:

- cobrança automática e webhooks de assinatura (os campos Stripe existem, mas checkout/webhook ainda não);
- termos de uso, política de privacidade, contrato de tratamento de dados e fluxo LGPD;
- serviço externo de observabilidade e alertas para erros/indisponibilidade;
- backups com teste documentado de restauração;
- upgrade controlado do app móvel Expo 51/React Native 0.74, origem dos avisos críticos/altos do `npm audit` do monorepo;
- rate limiting distribuído para login e cadastro público;
- domínio, e-mails transacionais e canal formal de suporte;
- homologação de pagamento, cancelamento, inadimplência e retenção de dados.

## Critério objetivo de go-live do piloto

O piloto pode começar quando todos os itens abaixo estiverem verdadeiros:

- [x] PostgreSQL de produção acessível;
- [x] migrações aplicadas sem erro;
- [x] `/api/health` respondendo HTTP 200;
- [x] MASTER ADMIN provisionado e login validado;
- [ ] duas empresas criadas pelo RIGOR CONTROL;
- [ ] isolamento confirmado: usuário da empresa A não visualiza dados da empresa B;
- [x] fluxo de troca obrigatória de senha temporária validado;
- [ ] suspensão de usuário e empresa validada;
- [ ] backup automático habilitado;
- [x] URL HTTPS da Vercel e `NEXTAUTH_URL` configurados;
- [ ] domínio comercial próprio conectado (opcional para o piloto, obrigatório para venda pública);
- [ ] responsável por suporte e janela de resposta acordados com os dois clientes.

## Recomendação de lançamento

Iniciar como **piloto assistido de 30 dias**, com cobrança e ativação controladas pelo MASTER ADMIN. A infraestrutura e o produto web já permitem cadastrar os dois primeiros clientes; antes de inserir dados reais, troque a senha temporária do MASTER, defina a estratégia de backup do Supabase e formalize suporte/LGPD. Cobrança automática, domínio próprio e observabilidade devem ser fechados antes da aquisição pública em escala.
