# -*- coding: utf-8 -*-
# Verifica a importação do cronograma real (Hangar Obra CHC) e a remoção dos dados demo.
import json
import urllib.request
import urllib.parse
import http.cookiejar

base = 'http://localhost:3000'
fails = 0

def check(name, ok, extra=''):
    global fails
    if not ok:
        fails += 1
    print(('OK  ' if ok else 'FAIL'), name, extra)

jar = http.cookiejar.CookieJar()
op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
csrf = json.loads(op.open(base + '/api/auth/csrf').read().decode())['csrfToken']
body = urllib.parse.urlencode({'csrfToken': csrf, 'email': 'admin@awcpremoldados.com.br', 'password': 'awc@2026', 'json': 'true'}).encode()
op.open(urllib.request.Request(base + '/api/auth/callback/credentials', data=body,
        headers={'Content-Type': 'application/x-www-form-urlencoded'}))

# 1. Obras: apenas a CHC, sem demos
obras = json.loads(op.open(base + '/api/obras').read().decode())
lista = obras if isinstance(obras, list) else obras.get('obras', obras.get('rows', []))
nomes = [o['nome'] for o in lista]
check('apenas 1 obra cadastrada', len(lista) == 1, f"-> {nomes}")
check('obra real Hangar Obra CHC', any('Hangar' in n for n in nomes))
check('sem obras demo', not any('XYZ' in n or 'Center' in n or 'Passarela' in n for n in nomes))

chc = next(o for o in lista if 'Hangar' in o['nome'])
check('código CHC-001', chc.get('codigo') == 'CHC-001')
check('status EM_ANDAMENTO', chc.get('status') == 'EM_ANDAMENTO')

# 2. Cronograma da obra
cron = json.loads(op.open(base + f"/api/cronograma/{chc['id']}").read().decode())
etapas = cron.get('etapas', cron if isinstance(cron, list) else [])
check('85 etapas importadas', len(etapas) == 85, f"({len(etapas)})")
concluidas = [e for e in etapas if e.get('percentualRealizado') == 100]
check('etapas concluídas presentes', len(concluidas) > 50, f"({len(concluidas)} a 100%)")
ceramica = next((e for e in etapas if 'Cerâmica' in e['nome']), None)
check('Cerâmica a 45%', bool(ceramica) and ceramica['percentualRealizado'] == 45)
portas = next((e for e in etapas if 'portas do hangar' in e['nome']), None)
check('Portas do hangar a 31%', bool(portas) and portas['percentualRealizado'] == 31)
entrega = next((e for e in etapas if 'Entrega oficial' in e['nome']), None)
check('Entrega oficial presente (0%)', bool(entrega) and entrega['percentualRealizado'] == 0)

# 3. Materiais e notificações demo removidos
mats = json.loads(op.open(base + '/api/materiais').read().decode())
mlist = mats if isinstance(mats, list) else mats.get('materiais', mats.get('rows', []))
check('materiais demo removidos', len(mlist) == 0, f"({len(mlist)})")
nots = json.loads(op.open(base + '/api/notificacoes').read().decode())
check('notificações demo removidas', len(nots.get('notificacoes', [])) == 0)

print('RESULT:', 'PASS' if fails == 0 else f'{fails} FAIL')
