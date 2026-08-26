# Migrations

`schema.sql` is the base — run it once to create the full database from scratch.

This folder holds every change made to the schema **after** the base was created.
Each file is numbered sequentially and describes exactly one change.

## Convention

```
NNN_verb_subject.sql

001_add_priority_to_holds.sql
002_rename_console_url.sql
003_add_index_on_history_user.sql
```

## Rules

- Never edit `schema.sql` once the database is live — add a migration instead
- Never edit or delete an existing migration file — add a new one to reverse it
- Run migrations in order — each one assumes all previous ones have already run
- One logical change per file — don't bundle unrelated changes

## Running a migration

Open the file in MySQL Workbench and execute it, or run:

```bash
mysql -u root -p envboard < migrations/001_your_migration.sql
```
