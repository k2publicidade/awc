# -*- coding: utf-8 -*-
# Valida os contratos da API consumidos pelo app mobile (apps/mobile/src/services/api.ts).
import json
import urllib.request
import urllib.parse
import http.cookiejar

base = 'http://localhost:3000'
jar = http.cookiejar.CookieJar()
op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
csrf = json.loads(op.open(base + '/api/auth/csrf').read().decode())['csrfToken']
body = urllib.parse.urlencode({'csrfToken': csrf, 'email': 'admin@awc.com.br', 'password': 'admin123', 'json': 'true'}).encode()
op.open(urllib.request.Request(base + '/api/auth/callback/credentials', data=body,
        headers={'Content-Type': 'application/x-www-form-urlencoded'}))

def get(url):
    return json.loads(op.open(base + url, timeout=120).read().decode())

def post(url, payload):
    req = urllib.request.Request(base + url, data=json.dumps(payload).encode(),
                                 headers={'Content-Type': 'application/json'})
    return json.loads(op.open(req, timeout=120).read().decode())

def delete(url):
    op.open(urllib.request.Request(base + url, method='DELETE'), timeout=120)

fails = 0
def check(name, ok, extra=''):
    global fails
    if not ok:
        fails += 1
    print(('OK  ' if ok else 'FAIL'), name, extra)

# Dashboard mobile: GET /api/obras -> array com avancoRealizado/semaforo
obras = get('/api/obras')
check('obras: array com avancoRealizado/semaforo', isinstance(obras, list) and (not obras or 'avancoRealizado' in obras[0] and 'semaforo' in obras[0]))
oid = obras[0]['id']

# RDOList: GET /api/rdo?obraId -> array
rdos = get(f'/api/rdo?obraId={oid}')
check('rdo: lista é array', isinstance(rdos, list))

# Galeria: GET /api/galeria?obraId -> array com url/data
fotos = get(f'/api/galeria?obraId={oid}')
check('galeria: array com url', isinstance(fotos, list) and (not fotos or 'url' in fotos[0]))

# Cronograma/Checklist: GET /api/cronograma/<id> -> { etapas }
crono = get(f'/api/cronograma/{oid}')
check('cronograma: dict com etapas[]', isinstance(crono.get('etapas'), list), f"etapas={len(crono.get('etapas', []))}")

# Ocorrências: GET array; POST com tipo do enum; DELETE para limpar
ocs = get(f'/api/ocorrencias?obraId={oid}')
check('ocorrencias: lista é array com dataAbertura', isinstance(ocs, list) and (not ocs or 'dataAbertura' in ocs[0]))
nova = post('/api/ocorrencias', {'obraId': oid, 'tipo': 'INTEMPERIE', 'descricao': 'Teste contrato mobile', 'data': '2026-06-10T12:00:00Z'})
check('ocorrencias: POST cria com tipo INTEMPERIE', bool(nova.get('id')), f"status={nova.get('status')}")
delete(f"/api/crud/ocorrencias/{nova['id']}")

# Requisições: GET /api/materiais -> array com estoqueAtual/alerta; POST /api/crud/requisicoes
mats = get('/api/materiais')
check('materiais: array com estoqueAtual/alerta', isinstance(mats, list) and (not mats or ('estoqueAtual' in mats[0] and 'alerta' in mats[0])))
req = post('/api/crud/requisicoes', {'obraId': oid, 'materialId': mats[0]['id'], 'quantidade': 2, 'justificativa': 'Teste contrato mobile'})
check('requisicoes: POST cria', bool(req.get('id')), f"status={req.get('status')}")
delete(f"/api/crud/requisicoes/{req['id']}")

# Checklist: POST /api/qualidade type=inspecao com itens (precisa de etapa)
etapas = crono.get('etapas', [])
if etapas:
    insp = post('/api/qualidade', {
        'type': 'inspecao', 'obraId': oid, 'etapaId': etapas[0]['id'],
        'tipo': 'MONTAGEM_PRE_MOLDADO', 'resultado': 'CONFORME',
        'itens': [
            {'descricao': 'Item teste 1', 'resultado': 'CONFORME'},
            {'descricao': 'Item teste 2', 'resultado': 'N_A'},
        ],
    })
    check('qualidade: POST inspecao com itens', bool(insp.get('id')) and len(insp.get('itens', [])) == 2)
    delete(f"/api/crud/inspecoes/{insp['id']}")
else:
    print('SKIP inspecao (obra sem etapas)')

# Notificações: { notificacoes, naoLidas }
nots = get('/api/notificacoes')
check('notificacoes: dict com notificacoes[] e naoLidas', isinstance(nots.get('notificacoes'), list) and 'naoLidas' in nots)
if nots['notificacoes']:
    check('notificacoes: itens têm createdAt', 'createdAt' in nots['notificacoes'][0])

print('RESULT:', 'PASS' if fails == 0 else f'{fails} FAIL')
