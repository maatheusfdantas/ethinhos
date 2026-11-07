-- Atualizar senhas de todos os usuários no Cloudflare D1 com hashes PBKDF2 perfeitamente compatíveis
UPDATE users SET password = 'pbkdf2$d9dc5d7396c99ede8cebe3b15303958e$34976025a94973586b4b96e6e64941f305df0f2980a416099451bc41cd82492a' WHERE id IN ('usr_admin', 'usr_admin_local');

UPDATE users SET password = 'pbkdf2$2cf08b74db77856883760600ac72e0f2$1ab525790426218f718f1c4047597e5caa7901e71076baf91a7ada6913b38792' WHERE id IN ('usr_matheus_pro', 'usr_matheus_ethos', 'usr_lucas_dev', 'usr_lucas_ethos', 'usr_ana_paula', 'usr_beatriz_costa', 'usr_carlos_eduardo');

UPDATE users SET password = 'pbkdf2$ad022fb467860c4d6a8f676673b468ac$d3fb3e9eb1e23ce90c663045cba81be31c86cc247962c7c9fd5ace9aa1b08752' WHERE id IN ('usr_bruno_preguica', 'usr_clean');

-- Limpar bloqueios temporários de auditoria contra testes de força bruta
DELETE FROM auth_audit_logs WHERE event_type IN ('LOGIN_FAILED', 'BRUTE_FORCE_LOCKED');

