-- Expand language constraints from 3 to all supported languages
-- and relax definition_snapshot to allow null

alter table public.word_saves
  alter column definition_snapshot drop not null,
  drop constraint if exists word_saves_source_lang_check,
  drop constraint if exists word_saves_target_lang_check;

alter table public.user_settings
  drop constraint if exists user_settings_language_pair_check,
  alter column language_pair set default 'nl-en';
