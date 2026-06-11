# -*- coding: utf-8 -*-
# Smoke test da paginação da API CRUD: page/pageSize, total, stats e compatibilidade legada.
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

fails = 0
def check(name, ok, extra=''):
    global fails
    if not ok:
        fails += 1
    print(('OK  ' if ok else 'FAIL'), name, extra)

# 1. Paginado: page=1&pageSize=2 limita as linhas e traz total/stats
d = get('/api/crud/financeiro?page=1&pageSize=2')
check('financeiro paginado: <=2 linhas', len(d.get('rows', [])) <= 2, f"rows={len(d.get('rows', []))}")
check('financeiro paginado: total presente', isinstance(d.get('total'), int), f"total={d.get('total')}")
check('financeiro paginado: stats presente', isinstance(d.get('stats'), dict), f"stats={d.get('stats')}")

total = d.get('total', 0)
if total > 2:
    d2 = get('/api/crud/financeiro?page=2&pageSize=2')
    ids1 = {r['id'] for r in d.get('rows', [])}
    ids2 = {r['id'] for r in d2.get('rows', [])}
    check('financeiro paginado: página 2 traz linhas diferentes', ids1.isdisjoint(ids2))
else:
    print('SKIP página 2 (poucos registros)')

# 2. Soma do stats bate com a soma de todas as páginas
d_all = get('/api/crud/financeiro')
soma_all = sum(float(r.get('valor') or 0) for r in d_all.get('rows', []))
soma_stats = float(d.get('stats', {}).get('sum') or 0)
check('financeiro: stats.sum == soma de todos', abs(soma_all - soma_stats) < 0.01, f"stats={soma_stats} all={soma_all}")

# 3. Legado sem page: rows como antes (consumidores existentes)
check('legado sem page: rows presentes', isinstance(d_all.get('rows'), list))
check('legado sem page: sem campo page', 'page' not in d_all)

# 4. Recursos com resultado/isActive
for res in ['obras', 'rdos', 'fornecedores', 'inspecoes', 'materiais']:
    dr = get(f'/api/crud/{res}?page=1&pageSize=5')
    check(f'{res} paginado ok', isinstance(dr.get('total'), int) and len(dr.get('rows', [])) <= 5,
          f"total={dr.get('total')} rows={len(dr.get('rows', []))} stats={dr.get('stats')}")

# 5. Busca + paginação juntas
db = get('/api/crud/obras?search=a&page=1&pageSize=3')
check('busca + paginação', isinstance(db.get('total'), int) and len(db.get('rows', [])) <= 3, f"total={db.get('total')}")

print('RESULT:', 'PASS' if fails == 0 else f'{fails} FAIL')
