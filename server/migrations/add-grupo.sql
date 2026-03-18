-- Adiciona a coluna opcional "grupo" à tabela senhas.
-- Permite agrupar senhas por projeto/sistema (ex.: "Projeto Alpha", "ERP").
-- Executar no SQL Editor do Supabase ou: psql -U postgres -d sua_base -f server/migrations/add-grupo.sql

ALTER TABLE senhas ADD COLUMN IF NOT EXISTS grupo TEXT;

COMMENT ON COLUMN senhas.grupo IS 'Grupo opcional para agrupar senhas (ex.: projeto ou sistema).';
