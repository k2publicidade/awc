# Guia de importação de obras — RIGOR

## Objetivo

A Central de Importação reduz a digitação inicial de uma obra. Engenheiros e administradores podem enviar uma planilha Excel, um CSV ou um documento Word, revisar os dados identificados e criar a obra com seu cronograma inicial.

O arquivo original é processado em memória e não fica armazenado. Nenhum registro é criado antes da confirmação do usuário.

## Como usar

1. Acesse **Obras** e selecione **Importar arquivo**.
2. Baixe o modelo Excel ou envie um arquivo existente de até 4 MB.
3. Selecione **Analisar arquivo**.
4. Revise todos os campos marcados e corrija os avisos.
5. Confira, adicione ou remova etapas do cronograma.
6. Selecione **Importar obra e etapas**.

## Formatos suportados

- `.xlsx`: dados gerais em qualquer aba e cronograma em uma aba chamada `Etapas`, `Cronograma`, `Planejamento` ou `Atividades`;
- `.csv`: cadastro da obra em formato de colunas ou linhas `Campo;Valor`;
- `.docx`: campos escritos como `Nome da obra: ...`, `Código: ...`, `Cidade: ...` e demais rótulos reconhecidos.

Arquivos legados `.xls` e `.doc` devem ser salvos como `.xlsx` e `.docx` antes do envio.

## Campos reconhecidos

Dados gerais: nome, código, tipo, endereço, cidade, estado, valor contratado, data de início, previsão de término e descrição.

Cronograma: etapa/atividade, descrição, data de início, data de fim, percentual previsto, percentual realizado, valor financeiro e ordem.

No Word, uma etapa estruturada pode ser escrita assim:

```text
Etapa 1: Fundações | 01/09/2026 | 30/11/2026 | R$ 680.000,00
```

## Regras de segurança

- somente perfis com permissão para criar obras podem importar;
- cada importação respeita o limite de obras do plano;
- códigos duplicados são bloqueados;
- até 300 etapas e 1.000 linhas são processadas por arquivo;
- a gravação da obra, das etapas e da auditoria ocorre em uma única transação;
- toda importação confirmada gera o evento `OBRA_IMPORTED` na trilha de auditoria.
