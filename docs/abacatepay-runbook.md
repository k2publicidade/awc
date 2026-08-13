# AbacatePay — operação do RIGOR

## Ambientes

- Inicie sempre em sandbox com `ABACATEPAY_DEV_MODE=true`.
- A chave de API existe apenas no servidor e deve ser armazenada nos secrets do ambiente.
- Produção usa outra chave, outro catálogo, outro webhook e `ABACATEPAY_DEV_MODE=false`.

## Catálogo recorrente

O RIGOR publica nove produtos: Essencial, Profissional e Empresarial nos ciclos mensal, semestral e anual. Os identificadores externos seguem `rigor-{plano}-{ciclo}-v1`. Os IDs retornados pela AbacatePay são gravados em `BillingProduct`.

## Webhook

Endpoint: `https://APP/api/webhooks/abacatepay?webhookSecret=SEGREDO`

Eventos: `subscription.trial_started`, `subscription.completed`, `subscription.renewed`, `subscription.payment_failed`, `subscription.cancelled` e `subscription.plan_changed`.

O endpoint valida o segredo da URL, a assinatura HMAC sobre o corpo bruto, a versão v2, o ambiente e o ID único do evento antes de alterar o tenant.

## Incidentes e conciliação

1. Verifique `BillingWebhookEvent` e logs do deploy.
2. Reenvie o evento no painel quando o processamento tiver falhado.
3. Eventos repetidos recebem HTTP 200 sem aplicar a alteração duas vezes.
4. Não altere status de assinatura manualmente, exceto em procedimento documentado de contingência.

## Entrada em produção

Antes da virada, validar CNPJ/dados comerciais, domínio HTTPS, e-mails `comercial@` e `privacidade@`, documentos jurídicos revisados, compra real de baixo valor, renovação, falha, cancelamento, backup e rollback.
