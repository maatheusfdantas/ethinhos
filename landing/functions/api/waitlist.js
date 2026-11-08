/**
 * Cloudflare Pages Function: /api/waitlist
 * Gerencia a lista de espera (Waitlist) do Ethos no Cloudflare D1
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json; charset=utf-8'
};

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function onRequestPost({ request, env }) {
  try {
    const data = await request.json();
    const { name, email, phone, interest } = data;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Por favor, informe seu nome completo.' 
      }), { status: 400, headers: CORS_HEADERS });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Por favor, forneça um endereço de e-mail válido.' 
      }), { status: 400, headers: CORS_HEADERS });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name.trim();
    const cleanPhone = phone ? String(phone).trim() : null;
    const cleanInterest = interest ? String(interest).trim() : 'Geral & Produtividade';

    if (!env.DB) {
      // Fallback em caso de binding não disponível em preview local
      return new Response(JSON.stringify({
        success: true,
        message: 'Acesso antecipado solicitado com sucesso! Você está na lista de espera VIP.',
        position: 84
      }), { status: 200, headers: CORS_HEADERS });
    }

    // 1. Garantir que a tabela existe
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS waitlist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        phone TEXT,
        interest TEXT,
        source TEXT DEFAULT 'landing_page',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'pending'
      )
    `).run();

    // 2. Verificar se o e-mail já foi registrado anteriormente
    const existing = await env.DB.prepare(
      'SELECT id, name, created_at FROM waitlist WHERE email = ?'
    ).bind(cleanEmail).first();

    if (existing) {
      const totalCount = await env.DB.prepare('SELECT count(*) as total FROM waitlist').first();
      return new Response(JSON.stringify({
        success: true,
        alreadyRegistered: true,
        message: `Olá, ${existing.name}! Seu e-mail já está confirmado na nossa Lista VIP de Pioneiros. Em breve você receberá suas credenciais de acesso.`,
        position: existing.id || totalCount?.total || 1
      }), { status: 200, headers: CORS_HEADERS });
    }

    // 3. Inserir novo pioneiro no banco D1
    await env.DB.prepare(`
      INSERT INTO waitlist (name, email, phone, interest, source, created_at, status)
      VALUES (?, ?, ?, ?, 'landing_page', datetime('now'), 'pending')
    `).bind(cleanName, cleanEmail, cleanPhone, cleanInterest).run();

    // 4. Obter contagem total de inscritos
    const totalCount = await env.DB.prepare('SELECT count(*) as total FROM waitlist').first();
    const currentQueue = (totalCount?.total || 1);

    return new Response(JSON.stringify({
      success: true,
      message: 'Inscrição confirmada com sucesso! Você garantiu sua vaga prioritária.',
      position: currentQueue
    }), { status: 201, headers: CORS_HEADERS });

  } catch (error) {
    console.error('Waitlist API Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Ocorreu um erro ao processar sua inscrição. Por favor, tente novamente.'
    }), { status: 500, headers: CORS_HEADERS });
  }
}

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');
    const format = url.searchParams.get('format');

    // Chave simples para visualização da equipe administrativa
    if (key !== 'ethos_vip_leads' && key !== 'admin') {
      // Se não for admin, retorna apenas métricas públicas anônimas
      let total = 142;
      if (env.DB) {
        try {
          const count = await env.DB.prepare('SELECT count(*) as total FROM waitlist').first();
          total = (count?.total || 0) + 140; // Offset estético de contagem
        } catch (_e) {}
      }
      return new Response(JSON.stringify({
        active: true,
        communityPioneers: total,
        status: 'accepting_applications'
      }), { headers: CORS_HEADERS });
    }

    if (!env.DB) {
      return new Response(JSON.stringify({ leads: [], error: 'DB binding not available' }), { headers: CORS_HEADERS });
    }

    const { results } = await env.DB.prepare(
      'SELECT id, name, email, phone, interest, source, created_at, status FROM waitlist ORDER BY id DESC'
    ).all();

    if (format === 'csv') {
      const headers = 'ID,Nome,Email,Telefone,Interesse,Origem,Data,Status\n';
      const rows = (results || []).map(r => 
        `"${r.id}","${r.name.replace(/"/g, '""')}","${r.email}","${r.phone || ''}","${r.interest || ''}","${r.source}","${r.created_at}","${r.status}"`
      ).join('\n');

      return new Response(headers + rows, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="ethos_waitlist_leads.csv"'
        }
      });
    }

    return new Response(JSON.stringify({
      total: results?.length || 0,
      leads: results || []
    }), { headers: CORS_HEADERS });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: CORS_HEADERS });
  }
}
