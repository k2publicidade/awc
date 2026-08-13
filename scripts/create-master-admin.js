// Provisiona a identidade interna que administra a plataforma RIGOR.
// Uso recomendado: defina MASTER_ADMIN_NAME, MASTER_ADMIN_EMAIL e
// MASTER_ADMIN_PASSWORD no ambiente e execute `npm run master:create`.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

loadEnvFile(path.join(__dirname, '..', 'apps', 'web', '.env'));
loadEnvFile(path.join(__dirname, '..', 'packages', 'database', '.env'));

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function assertConfiguration() {
  const required = ['DATABASE_URL', 'MASTER_ADMIN_NAME', 'MASTER_ADMIN_EMAIL'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Variáveis obrigatórias ausentes: ${missing.join(', ')}`);
  const password = process.env.MASTER_ADMIN_PASSWORD || `${crypto.randomBytes(18).toString('base64url')}Aa1!`;
  if (password.length < 12 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    throw new Error('MASTER_ADMIN_PASSWORD deve ter ao menos 12 caracteres, maiúscula, minúscula e número.');
  }
  return password;
}

async function main() {
  const temporaryPassword = assertConfiguration();
  const email = process.env.MASTER_ADMIN_EMAIL.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);

  const result = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.upsert({
      where: { slug: 'rigor-platform' },
      update: { name: 'RIGOR Platform', isInternal: true, isActive: true },
      create: {
        name: 'RIGOR Platform',
        slug: 'rigor-platform',
        plan: 'BUSINESS',
        subscriptionStatus: 'ATIVA',
        onboardingCompleted: true,
        isInternal: true,
        isActive: true,
      },
    });
    const user = await tx.user.upsert({
      where: { email },
      update: {
        tenantId: tenant.id,
        name: process.env.MASTER_ADMIN_NAME,
        passwordHash,
        role: 'MASTER_ADMIN',
        isActive: true,
        mustChangePassword: true,
      },
      create: {
        tenantId: tenant.id,
        name: process.env.MASTER_ADMIN_NAME,
        email,
        passwordHash,
        role: 'MASTER_ADMIN',
        isActive: true,
        mustChangePassword: true,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        tenantId: tenant.id,
        action: 'MASTER_ADMIN_PROVISIONED',
        targetType: 'User',
        targetId: user.id,
        metadata: { email },
      },
    });
    return user;
  });

  console.log(`MASTER ADMIN pronto: ${result.email}`);
  console.log(`Senha temporaria (exibida uma unica vez): ${temporaryPassword}`);
  console.log('Acesse /login; a conta será encaminhada exclusivamente para /master.');
}

main()
  .catch((error) => {
    console.error(`Falha ao provisionar MASTER ADMIN: ${error.message}`);
    console.error('Confirme que a migração 202608110001_master_admin foi aplicada.');
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
