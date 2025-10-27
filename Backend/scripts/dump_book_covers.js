#!/usr/bin/env node
// Lists books with their coverImagePath and pdfPath to help verify media
const { resolveMongoConfig } = require('../db/uri');
const mongoose = require('mongoose');

(async () => {
  const { uri, dbName } = resolveMongoConfig();
  if (!uri) { console.error('Missing MONGO_URI'); process.exit(1); }
  await mongoose.connect(uri, { dbName, family: 4, serverSelectionTimeoutMS: 10000 });
  const Book = require('../models/Book');
  const docs = await Book.find({}, 'title author coverImagePath pdfPath createdAt').sort({ createdAt: -1, _id: -1 }).lean();
  const withCover = docs.filter(d => d.coverImagePath);
  const withPdf = docs.filter(d => d.pdfPath);
  console.log(`Books: ${docs.length} | withCover: ${withCover.length} | withPdf: ${withPdf.length}`);
  docs.forEach((d, i) => {
    console.log(`${String(i+1).padStart(2,'0')}. ${d.title} — cover=${d.coverImagePath || '-'} pdf=${d.pdfPath || '-'}`);
  });
  await mongoose.disconnect();
})().catch(async (err) => {
  console.error('Failed:', err?.message || err);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});

