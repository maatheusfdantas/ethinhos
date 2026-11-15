import { Resend } from 'resend';

// Carrega .env
try {
  process.loadEnvFile();
} catch (e) {}

const apiKey = process.env.RESEND_API_KEY;
console.log('Chave Resend configurada:', apiKey ? `${apiKey.substring(0, 7)}...` : '(não encontrada)');

if (!apiKey) {
  console.error('ERRO: RESEND_API_KEY não foi encontrada no arquivo .env!');
  process.exit(1);
}

const resend = new Resend(apiKey);

export async function enviarEmailTeste(destinatario = 'eumatheusdantas1214@gmail.com') {
  console.log(`Disparando e-mail de teste via Resend para: ${destinatario}...`);
  try {
    const { data, error } = await resend.emails.send({
      from: 'Ethos <onboarding@resend.dev>',
      to: [destinatario],
      subject: '⚡ Ethos: Teste de Disparo Resend com Sucesso',
      html: `
        <div style="font-family: sans-serif; background-color: #0B0A14; color: #FFFFFF; padding: 30px; border-radius: 12px; max-width: 500px;">
          <h2 style="color: #38BDF8; margin-top: 0;">⚡ Ethos - Resend Configurado!</h2>
          <p style="color: #E2E8F0; font-size: 15px;">Parabéns! Sua integração com a API do <strong>Resend</strong> está funcionando com sucesso.</p>
          <div style="background: rgba(56, 189, 248, 0.15); border: 1px solid #38BDF8; border-radius: 8px; padding: 15px; margin: 20px 0; text-align: center;">
            <span style="font-size: 12px; color: #94A3B8; display: block; margin-bottom: 5px;">SEU TOKEN DE TESTE É:</span>
            <span style="font-size: 28px; font-weight: 800; letter-spacing: 4px; color: #38BDF8;">123456</span>
          </div>
          <p style="color: #94A3B8; font-size: 13px;">O backend do Ethos agora pode enviar confirmações de conta e códigos de recuperação de senha reais.</p>
        </div>
      `
    });

    if (error) {
      console.error('❌ Erro retornado pela API do Resend:', error);
      return { success: false, error };
    }

    console.log('✅ E-mail enviado com sucesso pelo Resend!', data);
    return { success: true, data };
  } catch (err) {
    console.error('❌ Erro interno / Exceção:', err);
    return { success: false, err };
  }
}

// Executa se chamado diretamente
const targetEmail = process.argv[2] || 'eumatheusdantas1214@gmail.com';
enviarEmailTeste(targetEmail);

