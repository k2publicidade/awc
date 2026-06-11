// Cria/atualiza o usuário administrador do sistema.
// Uso: node scripts/create-admin.js [email] [senha] [nome]
// Sem argumentos, usa o admin padrão da AWC.
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

// Carrega DATABASE_URL do .env do web app se não estiver no ambiente
if (!process.env.DATABASE_URL) {
  const envPath = path.join(__dirname, "..", "apps", "web", ".env");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*(DATABASE_URL|DIRECT_URL)\s*=\s*"?([^"#]+)"?\s*$/);
      if (m) process.env[m[1]] = m[2].trim();
    }
  }
}

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2] || "admin@awcpremoldados.com.br";
  const password = process.argv[3] || "awc@2026";
  const name = process.argv[4] || "Administrador AWC";

  let tenant = await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } });
  if (!tenant) {
    tenant = await prisma.tenant.create({ data: { name: "AWC Pré Moldados", slug: "awc", primaryColor: "#FF6B00" } });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: "SUPER_ADMIN", isActive: true },
    create: { email, name, passwordHash, role: "SUPER_ADMIN", isActive: true, tenantId: tenant.id },
  });

  console.log(`Admin pronto: ${user.email} (${user.role}, ativo=${user.isActive})`);
}

main()
  .catch((e) => { console.error("Erro:", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
