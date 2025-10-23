// backend/scripts/seed.js
const path = require('node:path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });
const { MongoClient, ObjectId } = require('mongodb');
const { resolveMongoConfig } = require('../db/uri');
let { uri, dbName } = resolveMongoConfig();
const USE_MEMORY_DB = String(process.env.USE_MEMORY_DB || '').toLowerCase() === 'true';
let mem;
let client;

async function ensureIndexes(db) {
  await db.collection('books').createIndexes([
    { key: { title: 'text', author: 'text' }, name: 'books_text' }
  ]);
  await db.collection('loans').createIndexes([
    { key: { userId: 1, returnedAt: 1 }, name: 'loans_user_returned' },
    { key: { dueAt: 1 }, name: 'loans_due' },
    { key: { bookId: 1 }, name: 'loans_book' }
  ]);
  await db.collection('users').createIndexes([
    { key: { role: 1, name: 1 }, name: 'users_role_name' }
  ]);
  await db.collection('hours').createIndexes([
    { key: { branch: 1, dayOfWeek: 1 }, name: 'hours_branch_dow', unique: true }
  ]);
}

function upsertsFromArray(arr, key = '_id') {
  return arr.map(doc => ({
    updateOne: { filter: { [key]: doc[key] }, update: { $set: doc }, upsert: true }
  }));
}

// New seed routine using ObjectId and adding visits
async function main() {
  if (USE_MEMORY_DB) {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mem = await MongoMemoryServer.create();
    uri = mem.getUri();
  }
  if (!uri) throw new Error('MONGO_URI not set');
  client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  // Clean collections for a predictable demo
  for (const name of ['users','books','loans','visits','hours']) {
    await db.collection(name).deleteMany({});
  }

  // bcrypt hash for "Password123" (cost 10)
  const demoHash = '$2b$10$vr7A1FNcgAQR/PmKzjVfMuCUWccdXVQqeA9M8I/VeEiFxLzAVtYoO';
  const adminUser = { _id: new ObjectId(), adminId: '99-0000-000001', fullName: 'Sam Librarian', role: 'librarian', email: 'admin@example.com', passwordHash: demoHash };
  await db.collection('admins').updateOne({ adminId: adminUser.adminId }, { $set: adminUser }, { upsert: true, bypassDocumentValidation: true });

  const bookDocs = [
    {
      _id: new ObjectId(),
      title: 'Clean Code',
      author: 'Robert C. Martin',
      isbn: '9780132350884',
      bookCode: 'BK-0001',
      genre: 'CITE',
      tags: ['CITE'],
      totalCopies: 3,
      availableCopies: 2
    },
    {
      _id: new ObjectId(),
      title: 'The Design of Everyday Things',
      author: 'Don Norman',
      isbn: '9780465050659',
      bookCode: 'BK-0002',
      genre: 'CAHS',
      tags: ['CAHS'],
      totalCopies: 2,
      availableCopies: 1
    },
    {
      _id: new ObjectId(),
      title: 'Introduction to Algorithms',
      author: 'Cormen et al.',
      isbn: '9780262046305',
      bookCode: 'BK-0003',
      genre: 'CEA',
      tags: ['CEA'],
      totalCopies: 5,
      availableCopies: 5
    }
  ];
  await db.collection('books').insertMany(bookDocs, { ordered: false, bypassDocumentValidation: true });

  const now = new Date();
  const userDocs = [
    {
      _id: new ObjectId(),
      studentId: '03-2324-000101',
      email: 'alice.villanueva@example.com',
      fullName: 'Alice Villanueva',
      barcode: 'LR-000101',
      passwordHash: demoHash,
      role: 'student',
      status: 'active'
    },
    {
      _id: new ObjectId(),
      studentId: '03-2324-000102',
      email: 'ben.santos@example.com',
      fullName: 'Ben Santos',
      barcode: 'LR-000102',
      passwordHash: demoHash,
      role: 'student',
      status: 'active'
    },
    {
      _id: new ObjectId(),
      studentId: '03-2324-000103',
      email: 'cara.delacruz@example.com',
      fullName: 'Cara Dela Cruz',
      barcode: 'LR-000103',
      passwordHash: demoHash,
      role: 'faculty',
      status: 'active'
    }
  ];
  await db.collection('users').insertMany(userDocs, { ordered: false, bypassDocumentValidation: true });

  const loanDocs = [
    {
      _id: new ObjectId(),
      userId: userDocs[0]._id,
      bookId: bookDocs[0]._id,
      borrowedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      dueAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      returnedAt: null
    },
    {
      _id: new ObjectId(),
      userId: userDocs[1]._id,
      bookId: bookDocs[1]._id,
      borrowedAt: new Date(now.getTime() - 16 * 24 * 60 * 60 * 1000),
      dueAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      returnedAt: null
    },
    {
      _id: new ObjectId(),
      userId: userDocs[2]._id,
      bookId: bookDocs[2]._id,
      borrowedAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      dueAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      returnedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
    }
  ];
  await db.collection('loans').insertMany(loanDocs, { ordered: false, bypassDocumentValidation: true });

  // Adjust available copies for active loans
  const activeByBook = loanDocs.reduce((acc, loan) => {
    if (!loan.returnedAt) acc.set(String(loan.bookId), (acc.get(String(loan.bookId)) || 0) + 1);
    return acc;
  }, new Map());
  for (const book of bookDocs) {
    const activeCount = activeByBook.get(String(book._id)) || 0;
    await db.collection('books').updateOne({ _id: book._id }, { $set: { availableCopies: Math.max(0, book.totalCopies - activeCount) } });
  }

  const visitDocs = [
    {
      _id: new ObjectId(),
      userId: userDocs[0]._id,
      studentId: userDocs[0].studentId,
      barcode: userDocs[0].barcode,
      branch: 'Main',
      enteredAt: new Date(now.getTime() - 90 * 60 * 1000),
      exitedAt: new Date(now.getTime() - 45 * 60 * 1000)
    },
    {
      _id: new ObjectId(),
      userId: userDocs[1]._id,
      studentId: userDocs[1].studentId,
      barcode: userDocs[1].barcode,
      branch: 'Main',
      enteredAt: new Date(now.getTime() - 30 * 60 * 1000),
      exitedAt: null
    },
    {
      _id: new ObjectId(),
      userId: userDocs[2]._id,
      studentId: userDocs[2].studentId,
      barcode: userDocs[2].barcode,
      branch: 'Downtown',
      enteredAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
      exitedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000)
    }
  ];
  await db.collection('visits').insertMany(visitDocs, { ordered: false, bypassDocumentValidation: true });

  const branch = 'Main';
  const hours = [
    { dayOfWeek: 0, open: '10:00', close: '14:00' },
    { dayOfWeek: 1, open: '09:00', close: '18:00' },
    { dayOfWeek: 2, open: '09:00', close: '18:00' },
    { dayOfWeek: 3, open: '09:00', close: '18:00' },
    { dayOfWeek: 4, open: '09:00', close: '18:00' },
    { dayOfWeek: 5, open: '09:00', close: '17:00' },
    { dayOfWeek: 6, open: '10:00', close: '14:00' }
  ].map(h => ({ _id: `${branch}-${h.dayOfWeek}`, branch, ...h }));
  await db.collection('hours').bulkWrite(upsertsFromArray(hours), { bypassDocumentValidation: true });

  await ensureIndexes(db);

  const counts = await Promise.all(
    ['users','books','hours','loans','visits'].map(async c => [c, await db.collection(c).countDocuments()])
  );
  console.log('Seed complete:', Object.fromEntries(counts));
}

main().catch(e => { console.error('Seed error:', e); })
  .finally(async () => { try { if (client) await client.close(); } finally { if (mem) await mem.stop(); } });
