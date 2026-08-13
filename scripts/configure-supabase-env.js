// Configura os arquivos locais de ambiente para o Supavisor sem imprimir segredos.
// A senha e o project ref sao extraidos de uma DATABASE_URL Supabase ja existente.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const rootDir = path.resolve(__dirname, '..');
const webEnvPath = path.join(rootDir, 'apps', 'web', '.env');
const productionEnvPath = path.join(rootDir, 'apps', 'web', '.env.production');
const databaseEnvPath = path.join(rootDir, 'packages', 'database', '.env');

function readEnv(filePath) {
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf8');
}

function getEnvValue(content, key) {
  const match = content.match(new RegExp(`^\\s*${key}\\s*=\\s*(.*)\\s*$`, 'm'));
  if (!match) return undefined;
  const raw = match[1].trim();
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1);
  }
  return raw;
}

function setEnvValue(content, key, value) {
  const line = `${key}="${value}"`;
  const expression = new RegExp(`^\\s*${key}\\s*=.*$`, 'm');
  if (expression.test(content)) return content.replace(expression, line);
  const suffix = content.length && !content.endsWith('\n') ? '\n' : '';
  return `${content}${suffix}${line}\n`;
}

function getSourceUrl() {
  for (const filePath of [webEnvPath, productionEnvPath, databaseEnvPath]) {
    const value = getEnvValue(readEnv(filePath), 'DIRECT_URL') || getEnvValue(readEnv(filePath), 'DATABASE_URL');
    if (!value) continue;
    try {
      const url = new URL(value);
      if (url.protocol === 'postgresql:' || url.protocol === 'postgres:') return url;
    } catch {
      // Continue procurando uma URL valida em outro arquivo.
    }
  }
  throw new Error('Nenhuma DATABASE_URL PostgreSQL valida foi encontrada nos arquivos locais.');
}

function getProjectRef(sourceUrl) {
  const username = decodeURIComponent(sourceUrl.username);
  const userMatch = username.match(/^postgres\.([a-z0-9]+)$/i);
  if (userMatch) return userMatch[1];
  const hostMatch = sourceUrl.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/i);
  if (hostMatch) return hostMatch[1];
  throw new Error('Nao foi possivel identificar o project ref da URL existente.');
}

function buildUrl({ projectRef, password, port, transaction }) {
  const url = new URL('postgresql://localhost/postgres');
  url.username = `postgres.${projectRef}`;
  url.password = password;
  url.hostname = 'aws-1-us-east-1.pooler.supabase.com';
  url.port = String(port);
  url.searchParams.set('sslmode', 'require');
  url.searchParams.set('connect_timeout', '30');
  if (transaction) {
    url.searchParams.set('pgbouncer', 'true');
    url.searchParams.set('connection_limit', '5');
    url.searchParams.set('pool_timeout', '30');
  } else {
    url.searchParams.set('connection_limit', '1');
    url.searchParams.set('pool_timeout', '30');
  }
  return url.toString();
}

function updateFile(filePath, values) {
  let content = readEnv(filePath);
  for (const [key, value] of Object.entries(values)) content = setEnvValue(content, key, value);
  fs.writeFileSync(filePath, content, { encoding: 'utf8', mode: 0o600 });
}

function main() {
  const sourceUrl = getSourceUrl();
  const projectRef = getProjectRef(sourceUrl);
  const password = decodeURIComponent(sourceUrl.password);
  if (!password) throw new Error('A URL existente nao contem a senha do banco.');

  const runtimeUrl = buildUrl({ projectRef, password, port: 6543, transaction: true });
  const directUrl = buildUrl({ projectRef, password, port: 5432, transaction: false });
  const currentWebEnv = readEnv(webEnvPath);
  const currentCronSecret = getEnvValue(currentWebEnv, 'CRON_SECRET');
  const cronSecret = currentCronSecret && currentCronSecret.length >= 32
    ? currentCronSecret
    : crypto.randomBytes(32).toString('base64url');

  updateFile(webEnvPath, { DATABASE_URL: runtimeUrl, DIRECT_URL: directUrl, CRON_SECRET: cronSecret });
  if (fs.existsSync(productionEnvPath)) {
    updateFile(productionEnvPath, { DATABASE_URL: runtimeUrl, DIRECT_URL: directUrl, CRON_SECRET: cronSecret });
  }
  updateFile(databaseEnvPath, { DATABASE_URL: directUrl, DIRECT_URL: directUrl });

  console.log(`Supabase configurado para o projeto ${projectRef}.`);
  console.log('Runtime: Supavisor transaction pooler (porta 6543).');
  console.log('Migracoes: Supavisor session pooler (porta 5432).');
  console.log('CRON_SECRET forte: configurado.');
  console.log('Nenhum segredo foi exibido.');
}

try {
  main();
} catch (error) {
  console.error(`Falha ao configurar Supabase: ${error.message}`);
  process.exitCode = 1;
}
