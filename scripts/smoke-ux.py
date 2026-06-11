# -*- coding: utf-8 -*-
# Smoke test das melhorias de UX: navegação completa, busca global, páginas-chave.
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

checks = [
    # (url, deve conter, NÃO deve conter)
    ('/dashboard', ['Obras ativas', 'Segurança', 'Orçamentos', 'Ocorrências', 'Galeria', 'Contratos', 'Andamento'], ['Eng. Ricardo Alves']),
    ('/rdo', ['Buscar RDOs', 'Novo RDO'], ['Assinaturas']),
    ('/obras?busca=teste', ['Buscar em'], []),
    ('/notificacoes', ['Marcar todas como lidas'], []),
    ('/relatorios', ['Gerar relat', 'Curva S'], []),
    ('/login', ['Esqueci minha senha', 'Entrar no ObrasAWC'], []),
    ('/configuracoes', ['Alterar minha senha'], []),
]

fails = 0
for url, want, ban in checks:
    r = op.open(base + url, timeout=120)
    raw = r.read().decode(errors='replace')
    miss = [m for m in want if m not in raw]
    bad = [m for m in ban if m in raw]
    ok = r.status == 200 and not miss and not bad
    if not ok:
        fails += 1
    print(('OK  ' if ok else 'FAIL'), url, r.status, ('missing: ' + str(miss) if miss else '') + ('  banned-found: ' + str(bad) if bad else ''))

print('RESULT:', 'PASS' if fails == 0 else f'{fails} FAIL')
