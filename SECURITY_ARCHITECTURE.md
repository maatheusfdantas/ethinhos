# Arquitetura de Segurança, Criptografia e Proteção de Dados — Projeto Ethos

Consulte a implementação ativa nos módulos:
- `server/security.js`: Motor de hashing `scrypt`, criptografia `AES-256-GCM`, JWT + Refresh Token com rotação e detecção de reuso, Rate Limiting, proteção contra Brute Force, headers HTTP, sanitização anti-XSS, trilha de auditoria encadeada por HMAC-SHA256 e backups criptografados.
- `server/index.js`: Integração dos middlewares de segurança, endpoints de sessão (`/api/auth/refresh`, `/api/auth/logout-all`), auditoria (`/api/security/audit-logs`), backup (`/api/security/backup`) e conformidade LGPD/GDPR (`/api/user/:id/privacy/export` e `/api/user/:id/privacy/erase`).
- `server/db.js`: Senhas de todos os usuários armazenadas com `scrypt` + salt individual de 16 bytes e notas pessoais criptografadas com `AES-256-GCM`.
- `server/googleCalendarAuth.js`: Tokens OAuth 2.0 (`access_token` e `refresh_token`) criptografados em repouso no disco com `AES-256-GCM`.
- `.env.example` e `.gitignore`: Proteção contra versionamento acidental de segredos, bancos locais e arquivos de backup.

