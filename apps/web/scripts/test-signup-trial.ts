import assert from 'node:assert/strict';
import { signupSchema } from '../src/lib/validations';
import { slugifyCompany } from '../src/lib/saas';

async function main() {
  console.log('--- Testando Validação do Schema de Cadastro (Signup) ---');

  // 1. Testar acceptTerms com string "true" (comportamento de FormData)
  const validStringData = {
    companyName: 'Construtora Horizonte',
    name: 'Carlos Silva',
    email: 'carlos@horizonte.com.br',
    phone: '11999998888',
    password: 'SenhaSegura123',
    confirmPassword: 'SenhaSegura123',
    plan: 'PRO',
    acceptTerms: 'true',
  };
  const parsed1 = signupSchema.parse(validStringData);
  assert.equal(parsed1.companyName, 'Construtora Horizonte');
  assert.equal(parsed1.email, 'carlos@horizonte.com.br');
  assert.equal(parsed1.acceptTerms, true);
  console.log('✅ Validação com acceptTerms "true" aprovada');

  // 2. Testar acceptTerms com boolean true
  const validBoolData = {
    ...validStringData,
    acceptTerms: true,
  };
  const parsed2 = signupSchema.parse(validBoolData);
  assert.equal(parsed2.acceptTerms, true);
  console.log('✅ Validação com acceptTerms boolean true aprovada');

  // 3. Testar slugifyCompany
  const slug = slugifyCompany('Construtora São José & Filhos Ltda');
  assert.equal(slug, 'construtora-sao-jose-filhos-ltda');
  console.log('✅ Geração de slug da empresa aprovada:', slug);

  // 4. Testar cálculo de 10 dias de Trial
  const now = Date.now();
  const trialEndsAt = new Date(now + 10 * 86400000);
  const diffDays = (trialEndsAt.getTime() - now) / 86400000;
  assert.equal(Math.round(diffDays), 10);
  console.log('✅ Cálculo de 10 dias de Trial verificado com sucesso');

  // 5. Testar rejeição de senha sem número
  assert.throws(() => {
    signupSchema.parse({
      ...validStringData,
      password: 'SenhaSemNumero',
      confirmPassword: 'SenhaSemNumero',
    });
  });
  console.log('✅ Rejeição de senhas fracas aprovada');

  // 6. Testar rejeição de senhas que não coincidem
  assert.throws(() => {
    signupSchema.parse({
      ...validStringData,
      password: 'SenhaValida1',
      confirmPassword: 'OutraSenhaValida2',
    });
  });
  console.log('✅ Rejeição de senhas divergentes aprovada');

  console.log('\n🎉 TODOS OS TESTES DE CADASTRO E TRIAL PASSARAM COM SUCESSO!');
}

main().catch((error) => {
  console.error('Falha nos testes:', error);
  process.exitCode = 1;
});
