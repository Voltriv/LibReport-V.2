#!/usr/bin/env node
// Export a CSV of books missing coverImagePath and/or pdfPath
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const { resolveMongoConfig } = require('../db/uri');

(async () => {
  const { uri, dbName } = resolveMongoConfig();
  if (!uri) { console.error('Missing MONGO_URI'); process.exit(1); }
  await mongoose.connect(uri, { dbName, family: 4, serverSelectionTimeoutMS: 10000 });
  const Book = require('../models/Book');
  const docs = await Book.find({}, 'title author bookCode department genre coverImagePath pdfPath').sort({ title: 1 }).lean();
  const missing = docs.filter(d => !d.coverImagePath || !d.pdfPath);
  const header = ['title','author','bookCode','department','genre','coverImageFile','coverImageMime','pdfFile','pdfMime'];
  const lines = [header.join(',')];
  for (const d of missing) {
    const row = [
      (d.title||'').replace(/"/g,'""'),
      (d.author||'').replace(/"/g,'""'),
      (d.bookCode||'').replace(/"/g,'""'),
      (d.department||'').replace(/"/g,'""'),
      (d.genre||'').replace(/"/g,'""'),
      '',
      '',
      '',
      ''
    ];
    const csv = row.map(v => (v.includes(',') ? `"${v}"` : v)).join(',');
    lines.push(csv);
  }
  const outDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'books.missing_media.csv');
  fs.writeFileSync(outFile, lines.join('\n'));
  console.log(`Wrote ${missing.length} rows to ${outFile}`);
  console.log('Instructions:');
  console.log('1) Put your image/PDF files under Backend/data/assets');
  console.log('2) Fill coverImageFile/pdfFile with relative paths like ./assets/your-image.jpg');
  console.log("3) Optionally set coverImageMime (image/jpeg|image/png|image/webp) and pdfMime (application/pdf)");
  console.log('4) Import with:\n   npm --prefix Backend run import:books -- "data/books.missing_media.csv"');
  await mongoose.disconnect();
})().catch(async (err) => {
  console.error(err?.message || err);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});

