-- Reset the migrations record for our problematic migrations
DELETE FROM supabase_migrations.schema_migrations 
WHERE name IN (
  '20250328_fix_google_tokens_table',
  '20250328_add_token_type_to_google_tokens',
  '20250328_fix_missing_google_token_columns'
);