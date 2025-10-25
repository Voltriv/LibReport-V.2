Books CSV Template
==================

Use `books.template.csv` as a starting point. Keep the header row intact.

Columns
- title (required)
- author (required)
- isbn (optional)
- bookCode (optional, unique if used)
- genre (optional)
- tags (optional, use | or , separators)
- totalCopies (optional, default 1)
- availableCopies (optional, defaults to totalCopies)

Import commands (run from repo root)
- Dry run: `npm --prefix Backend run import:books -- data/books.template.csv --dry-run`
- Import:  `npm --prefix Backend run import:books -- data/books.template.csv`

Tips
- Upsert order: bookCode > isbn > title+author.
- You can replace this file with your full list (e.g., 500+ rows).

