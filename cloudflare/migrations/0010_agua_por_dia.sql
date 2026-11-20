-- Correção A (20/11/2026): a água não zerava na virada do dia porque `health` guardava um único número sem data.
-- Só acrescenta a coluna com o dia (YYYY-MM-DD, no fuso de quem registrou) do valor atual de água.
-- Linhas antigas ficam com NULL e são tratadas como "não é de hoje" (começam em 0 no próximo acesso).
ALTER TABLE health ADD COLUMN water_date TEXT;
