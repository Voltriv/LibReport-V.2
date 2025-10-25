#!/usr/bin/env node
// Bulk-import Books from a CSV or JSON file into MongoDB.
// Usage:
//   node scripts/import_books.js ./books.csv
//   node scripts/import_books.js ./books.csv --dry-run
//   node scripts/import_books.js ./books.json
//
// CSV headers (case-insensitive):
//   title, author, isbn, bookCode, genre, tags, totalCopies, availableCopies
// - tags may be pipe- or comma-separated (e.g., "fiction|classic")
// - availableCopies defaults to totalCopies if omitted
//
// Upsert rule:
// - If bookCode present: upsert by { bookCode }
// - Else if isbn present: upsert by { isbn }
// - Else: upsert by { title, author }

const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const { resolveMongoConfig } = require('../db/uri');

function parseArgs(argv) {
  const args = { file: null, dryRun: false };
  for (const a of argv.slice(2)) {
    if (a === '--dry-run') args.dryRun = true;
    else if (!args.file) args.file = a;
  }
  return args;
}

function detectFormat(file) {
  const ext = path.extname(file).toLowerCase();
  return ext === '.json' ? 'json' : 'csv';
}

function splitCSV(line) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (q && line[i + 1] === '"') { cur += '"'; i++; }
      else q = !q;
    } else if (ch === ',' && !q) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map(s => s.trim());
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length);
  if (!lines.length) return [];
  const headers = splitCSV(lines[0]).map(h => h.toLowerCase());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = splitCSV(lines[i]);
    const rec = {};
    headers.forEach((h, idx) => rec[h] = vals[idx]);
    rows.push(rec);
  }
  return rows;
}

function toArrayTags(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return String(v).split(/[|,]/).map(s => s.trim()).filter(Boolean);
}

function normalize(rec) {
  const get = (k) => rec[k] ?? rec[k?.toLowerCase?.()] ?? rec[k?.toUpperCase?.()];
  const title = (get('title') || '').trim();
  const author = (get('author') || '').trim();
  const isbn = (get('isbn') || '').trim();
  const bookCode = (get('bookCode') || get('bookcode') || '').trim();
  const genre = (get('genre') || '').trim();
  const tags = toArrayTags(get('tags'));
  const total = Number(get('totalCopies') ?? get('totalcopies'));
  const avail = Number(get('availableCopies') ?? get('availablecopies'));
  const totalCopies = Number.isFinite(total) && total >= 0 ? Math.trunc(total) : 1;
  let availableCopies = Number.isFinite(avail) && avail >= 0 ? Math.trunc(avail) : totalCopies;
  if (availableCopies > totalCopies) availableCopies = totalCopies;

  return { title, author, isbn, bookCode, genre, tags, totalCopies, availableCopies };
}

async function run() {
  const { file, dryRun } = parseArgs(process.argv);
  if (!file) {
    console.error('Usage: node scripts/import_books.js <file.csv|file.json> [--dry-run]');
    process.exit(1);
  }

  const abs = path.resolve(process.cwd(), file);
  if (!fs.existsSync(abs)) {
    console.error('File not found:', abs);
    process.exit(1);
  }

  const fmt = detectFormat(abs);
  const text = fs.readFileSync(abs, 'utf8');
  const raw = fmt === 'json' ? JSON.parse(text) : parseCSV(text);
  const items = raw.map(normalize).filter(r => r.title && r.author);
  if (!items.length) {
    console.error('No valid rows found. Need at least title and author per row.');
    process.exit(1);
  }

  const { uri, dbName } = resolveMongoConfig();
  await mongoose.connect(uri, { dbName, family: 4, serverSelectionTimeoutMS: 10000 });

  const Book = mongoose.models.Book || mongoose.model('Book', new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    author: { type: String, required: true, trim: true },
    isbn: { type: String, trim: true },
    bookCode: { type: String, trim: true },
    genre: { type: String, trim: true },
    tags: [{ type: String, trim: true }],
    totalCopies: { type: Number, default: 1, min: 0 },
    availableCopies: { type: Number, default: 1, min: 0 },
  }, { timestamps: true }));

  const ops = [];
  for (const r of items) {
    let filter;
    if (r.bookCode) filter = { bookCode: r.bookCode };
    else if (r.isbn) filter = { isbn: r.isbn };
    else filter = { title: r.title, author: r.author };
    ops.push({
      updateOne: {
        filter,
        update: {
          $setOnInsert: { title: r.title, author: r.author },
          $set: {
            isbn: r.isbn || undefined,
            bookCode: r.bookCode || undefined,
            genre: r.genre || undefined,
            tags: Array.isArray(r.tags) ? r.tags : [],
            totalCopies: r.totalCopies,
            availableCopies: r.availableCopies,
          }
        },
        upsert: true,
      }
    });
  }

  console.log(`Prepared ${ops.length} upsert operations from ${items.length} rows.`);
  if (dryRun) {
    console.log('Dry run only. Exiting without writing.');
    await mongoose.disconnect();
    return;
  }

  const chunk = 500; // safe batch size
  let totalUpserted = 0, totalModified = 0, totalMatched = 0;
  for (let i = 0; i < ops.length; i += chunk) {
    const res = await Book.bulkWrite(ops.slice(i, i + chunk), { ordered: false });
    totalUpserted += res.upsertedCount || 0;
    totalModified += res.modifiedCount || 0;
    totalMatched += res.matchedCount || 0;
    console.log(`Batch ${Math.floor(i / chunk) + 1}: upserted=${res.upsertedCount||0} modified=${res.modifiedCount||0} matched=${res.matchedCount||0}`);
  }

  console.log(`Done. Inserted ${totalUpserted}, updated ${totalModified}, matched ${totalMatched}.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Import failed:', err?.message || err);
  process.exit(1);
});

