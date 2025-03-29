### Google Calendar Integration Migrations

Due to issues with the Supabase migration system, we're using a manual approach to apply these database changes.

To fix the `google_tokens` table:

1. Log into the Supabase dashboard
2. Navigate to the SQL Editor
3. Run the script from `/supabase/manual_fixes/fix_google_tokens_table.sql`

This approach avoids the "duplicate key" constraint errors in the schema_migrations table.

Original migrations:
- 20250328_add_token_type_to_google_tokens.sql
- 20250328_fix_google_tokens_table.sql
- 20250328_fix_missing_google_token_columns.sql