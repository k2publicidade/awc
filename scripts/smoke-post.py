# -*- coding: utf-8 -*-
"""Smoke test de escrita: POST em todas as APIs corrigidas + relatorios."""
import json
import sys
import urllib.parse
import urllib.request
import http.cookiejar
from datetime import date, timedelta

base = 'http://localhost:3000'
jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))

csrf = json.loads(opener.open(base + '/api/auth/csrf', timeout=60).read().decode())['csrfToken']
body = urllib.parse.urlencode({'csrfToken': csrf, 'email': 'admin@awc.com.br', 'password': 'admin123',
                               'callbackUrl': base + '/dashboard', 'json': 'true'}).encode()
opener.open(urllib.request.Request(base + '/api/auth/callback/credentials', data=body,
            headers={'Content-Type': 'application/x-www-form-urlencoded'}), timeout=60)
print('LOGIN OK')

obras = json.loads(opener.open(base + '/api/obras', timeout=60).read().decode())
obra_list = obras if isinstance(obras, list) else obras.get('obras', obras.get('rows', []))
obra_id = obra_list[0]['id']
print('OBRA:', obra_id)

fails = []
created = {}

def post(url, payload, label):
    try:
        req = urllib.request.Request(base + url, data=json.dumps(payload).encode(),
                                     headers={'Content-Type': 'application/json'})
        r = opener.open(req, timeout=120)
        raw = r.read().decode(errors='replace')
        data = json.loads(raw) if raw else {}
        print(f'OK   POST {label} -> {r.status}')
        return data
    except Exception as e:
        b = ''
        if hasattr(e, 'read'):
            try: b = e.read().decode(errors='replace')[:300]
            except Exception: pass
        fails.append((label, str(e), b))
        print(f'FAIL POST {label} -> {e} {b[:250]}')
        return None

def get(url, label):
    try:
        r = opener.open(base + url, timeout=180)
        raw = r.read().decode(errors='replace')
        if '"error"' in raw[:200]:
            fails.append((label, r.status, raw[:200]))
            print(f'FAIL GET {label} -> {raw[:200]}')
        else:
            print(f'OK   GET  {label} ({len(raw)}b)')
        return raw
    except Exception as e:
        b = ''
        if hasattr(e, 'read'):
            try: b = e.read().decode(errors='replace')[:300]
            except Exception: pass
        fails.append((label, str(e), b))
        print(f'FAIL GET  {label} -> {e} {b[:250]}')
        return None

today = date.today().isoformat()

# 1. RDO
rdo = post('/api/rdo', {
    'obraId': obra_id, 'data': today, 'observacoes': 'SMOKE TEST',
    'climas': [{'periodo': 'MANHA', 'condicao': 'ENSOLARADO', 'temperatura': 25}],
    'efetivos': [{'funcao': 'Pedreiro', 'quantidadePresente': 5, 'quantidadeAusente': 1}],
    'atividades': [{'descricao': 'Atividade smoke', 'percentualExecutado': 10}],
    'ocorrencias': [{'tipo': 'PROBLEMA', 'descricao': 'Ocorrencia smoke'}],
    'equipamentos': [{'equipamento': 'Grua', 'horasTrabalhadas': 4}],
}, 'rdo')
if rdo: created['rdo'] = rdo.get('id')

# 2. Financeiro
fin = post('/api/financeiro', {'tipo': 'DESPESA', 'descricao': 'SMOKE lancamento', 'valor': '150.50',
                               'vencimento': today, 'obraId': obra_id, 'categoria': 'Material'}, 'financeiro')

# 3. Ocorrencia
oc = post('/api/ocorrencias', {'tipo': 'PROBLEMA_TECNICO', 'descricao': 'SMOKE ocorrencia',
                               'obraId': obra_id, 'data': today, 'impactoPrazoDias': 2}, 'ocorrencias')

# 4. Material + movimento
mat = post('/api/materiais', {'codigo': 'SMOKE-001', 'descricao': 'Material smoke', 'unidade': 'un',
                              'estoqueMinimo': 5}, 'materiais')
if mat and mat.get('id'):
    post('/api/materiais/movimento', {'tipo': 'ENTRADA', 'materialId': mat['id'], 'obraId': obra_id,
                                      'quantidade': 10, 'data': today, 'notaFiscal': 'NF-123',
                                      'observacao': 'smoke', 'precoUnitario': '9.90'}, 'movimento')

# 5. Equipe (trabalhador)
trab = post('/api/equipe', {'nome': 'SMOKE Trabalhador', 'cpf': '00000000191', 'funcao': 'Pedreiro',
                            'vinculo': 'CLT', 'dataAdmissao': today, 'dataExameMedico': today}, 'equipe')

# 6. Documento
doc = post('/api/documentos', {'nome': 'SMOKE Doc', 'categoria': 'PROJETO', 'obraId': obra_id,
                               'numero': 'D-1', 'profissional': 'Eng. Smoke', 'dataEmissao': today,
                               'dataValidade': (date.today() + timedelta(days=90)).isoformat()}, 'documentos')

# 7. Galeria
foto = post('/api/galeria', {'url': 'https://example.com/smoke.jpg', 'legenda': 'SMOKE foto',
                             'obraId': obra_id, 'tipo': 'OBRA'}, 'galeria')

# 8. Orcamento
orc = post('/api/orcamentos', {'obraId': obra_id, 'nome': 'SMOKE Orcamento', 'valorTotal': 1000}, 'orcamentos')

# 9. Qualidade: inspecao precisa de etapa -> buscar etapas
cron = json.loads(opener.open(base + f'/api/cronograma/{obra_id}', timeout=60).read().decode())
etapas = cron.get('etapas', [])
etapa_id = etapas[0]['id'] if etapas else None
if etapa_id:
    post('/api/qualidade', {'type': 'inspecao', 'obraId': obra_id, 'etapaId': etapa_id,
                            'tipo': 'ESTRUTURA', 'data': today, 'resultado': 'CONFORME',
                            'itens': [{'descricao': 'Item smoke', 'resultado': 'CONFORME'}]}, 'qualidade-inspecao')
else:
    print('SKIP inspecao (sem etapas)')
post('/api/qualidade', {'type': 'nc', 'obraId': obra_id, 'descricao': 'SMOKE NC',
                        'severidade': 'BAIXO'}, 'qualidade-nc')

# 10. Seguranca
post('/api/seguranca', {'type': 'dds', 'obraId': obra_id, 'tema': 'SMOKE DDS', 'data': today,
                        'participantes': '5'}, 'seguranca-dds')
post('/api/seguranca', {'type': 'acidente', 'obraId': obra_id, 'tipo': 'QUASE_ACIDENTE',
                        'descricao': 'SMOKE acidente', 'data': today}, 'seguranca-acidente')

# 11. Medicao
post('/api/medicao', {'obraId': obra_id, 'numero': 999, 'periodoInicio': today, 'periodoFim': today,
                      'itens': []}, 'medicao')

# 12. Cronograma baseline
post(f'/api/cronograma/{obra_id}', {}, 'cronograma-baseline')

# 13. Contrato precisa fornecedor
forn = json.loads(opener.open(base + '/api/crud/fornecedores', timeout=60).read().decode())
forn_rows = forn.get('rows', forn if isinstance(forn, list) else [])
if forn_rows:
    post('/api/contratos', {'obraId': obra_id, 'fornecedorId': forn_rows[0]['id'], 'numero': 'SMOKE-CT-1',
                            'objeto': 'Contrato smoke', 'tipo': 'SERVICO', 'valor': 5000,
                            'dataInicio': today, 'dataFim': (date.today() + timedelta(days=30)).isoformat()}, 'contratos')

# 14. Notificacao engine (cron)
get('/api/notificacoes/cron', 'notificacoes-cron')

# 15. Relatorios (todos os tipos)
for t in ['executivo', 'curva-s', 'qualidade', 'seguranca', 'financeiro', 'databook', 'rdo']:
    get(f'/api/relatorios?type={t}&obraId={obra_id}', f'relatorio-{t}')

# 16. Excel exports
for t in ['financeiro', 'materiais']:
    get(f'/api/relatorios/excel?type={t}&obraId={obra_id}', f'excel-{t}')

# 17. RDO PDF
if created.get('rdo'):
    get(f"/api/rdo/{created['rdo']}/pdf", 'rdo-pdf')

print()
print(f'TOTAL FAILURES: {len(fails)}')
for f in fails:
    print(' -', f[0], str(f[1])[:80], str(f[2])[:160])
sys.exit(1 if fails else 0)
