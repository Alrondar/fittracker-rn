-- SEC-16: pg_trgm был установлен в схеме public (lint extension_in_public).
-- Перенос в служебную схему extensions убирает объекты расширения из
-- PostgREST-экспозиции: similarity()/word_similarity() больше не вызываются
-- как /rest/v1/rpc/similarity.
--
-- Существующие GIN-индексы не пересоздаются: в pg_index хранятся OID оператора
-- и opclass, а не имена, привязанные к схеме, поэтому перенос им не мешает.
--
-- Что нужно помнить после переноса: новые `CREATE INDEX ... (col gin_trgm_ops)`
-- и явные вызовы `similarity(...)` квалифицировать как extensions.gin_trgm_ops /
-- extensions.similarity, либо добавлять extensions в search_path сессии.
-- Приложение этого не требует: поиск идёт через PostgREST .ilike(), оператор ~~*
-- живёт в pg_catalog.

alter extension pg_trgm set schema extensions;
