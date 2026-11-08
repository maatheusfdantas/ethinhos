# Ethos Landing Page & Waitlist (Acesso Antecipado VIP)

Página de apresentação e divulgação oficial do ecossistema **Ethos**, com formulário de captação de leads e banco de dados serverless dedicado no **Cloudflare D1**.

## 🚀 Totalmente Independente
- **Zero conexão com o sistema principal**: possui seu próprio projeto no Cloudflare Pages, seu próprio banco D1 (`ethos-waitlist-db`), sem sessão, auth ou banco compartilhado.
- **Link no ar**: [https://ethos-landing-7j3.pages.dev](https://ethos-landing-7j3.pages.dev)
- **Deployment alias**: `https://ethos-landing.pages.dev`

## 🗄️ Banco de Dados (Cloudflare D1)
- **Database**: `ethos-waitlist-db` (`a8c3309c-9588-4251-acd8-49b36ea94781`)
- **Tabela**: `waitlist` (id, name, email, phone, interest, source, created_at, status)

### Comandos Úteis
```bash
# Ver todos os inscritos no banco
npm run db:list

# Ver total de inscritos
npm run db:count

# Exportar leads em arquivo CSV
npm run export:csv
```

Ou acesse diretamente via browser com a chave de visualização:
- **Visualização JSON**: `https://ethos-landing-7j3.pages.dev/api/waitlist?key=ethos_vip_leads`
- **Download CSV**: `https://ethos-landing-7j3.pages.dev/api/waitlist?key=ethos_vip_leads&format=csv`
