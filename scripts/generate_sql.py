import csv

base = r'C:\Users\viswa\OneDrive\Docs'

def esc(s):
    """Escape single quotes for SQL."""
    if s is None:
        return 'NULL'
    return "'" + str(s).replace("'", "''") + "'"

def esc_num(s):
    if s is None or s == '':
        return 'NULL'
    return str(s)

lines = []

# ── AUTHORS ──────────────────────────────────────────────────────────────────
lines.append("-- Authors")
lines.append("insert into authors (id, name, country) values")
with open(f'{base}\\authors.csv', encoding='utf-8') as f:
    rows = list(csv.DictReader(f))
author_vals = []
for r in rows:
    author_vals.append(f"  ({r['id']}, {esc(r['name'])}, {esc(r['country'])})")
lines.append(',\n'.join(author_vals) + ';')
lines.append('')

# ── BOOKS ────────────────────────────────────────────────────────────────────
lines.append("-- Books")
lines.append("insert into books (id, user_id, title, year_read_start, year_read_end, genre, format, fiction, series, series_number, pages, notes, user_added) values")
with open(f'{base}\\books_clean.csv', encoding='utf-8') as f:
    rows = list(csv.DictReader(f))
book_vals = []
for r in rows:
    genre = r['genre'] if r['genre'] else 'NULL'  # already in {..} format
    if genre != 'NULL':
        genre = f"'{genre}'"
    series_number = r['series_number'] if r['series_number'] else 'NULL'
    if series_number != 'NULL':
        series_number = f"'{series_number}'"
    fiction = 'true' if r['fiction'].lower() == 'true' else 'false'
    user_added = 'false' if r['user_added'].lower() == 'false' else 'true'
    book_vals.append(
        f"  ({r['id']}, '5c8d1748-16ec-45a3-b57e-a8bdb7a7db78', {esc(r['title'])}, "
        f"{esc_num(r['year_read_start'])}, {esc_num(r['year_read_end'])}, "
        f"{genre}::text[], {esc(r['format'])}, {fiction}, {esc(r['series'])}, "
        f"{series_number}::numeric[], {esc_num(r['pages']) if r['pages'] else 'NULL'}, "
        f"{esc(r['notes'])}, {user_added})"
    )
lines.append(',\n'.join(book_vals) + ';')
lines.append('')

# ── BOOK_AUTHORS ──────────────────────────────────────────────────────────────
lines.append("-- Book authors")
lines.append("insert into book_authors (book_id, author_id, author_order) values")
with open(f'{base}\\book_authors.csv', encoding='utf-8') as f:
    rows = list(csv.DictReader(f))
ba_vals = [f"  ({r['book_id']}, {r['author_id']}, {r['author_order']})" for r in rows]
lines.append(',\n'.join(ba_vals) + ';')
lines.append('')

# ── Reset sequences ───────────────────────────────────────────────────────────
lines.append("-- Reset sequences so next inserts don't collide")
lines.append("select setval('authors_id_seq', (select max(id) from authors));")
lines.append("select setval('books_id_seq', (select max(id) from books));")

output = '\n'.join(lines)
with open(f'{base}\\seed.sql', 'w', encoding='utf-8') as f:
    f.write(output)

print(f"Written to {base}\\seed.sql ({len(output)} chars, {output.count(chr(10))} lines)")
