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
    { _id: new ObjectId(), title: 'Clean Code', author: 'Robert C. Martin', categories: ['Software'], totalCopies: 3, availableCopies: 1 },
    { _id: new ObjectId(), title: 'The Design of Everyday Things', author: 'Don Norman', categories: ['Design'], totalCopies: 2, availableCopies: 2 },
    { _id: new ObjectId(), title: 'Introduction to Algorithms', author: 'Cormen et al.', categories: ['CS'], totalCopies: 5, availableCopies: 4 }
  ];
  await db.collection('books').insertMany(bookDocs, { ordered: false, bypassDocumentValidation: true });

  const now = new Date();
  // No demo loans in admin-only mode

  // visits heatmap for last 30 days
  // No demo visits in admin-only mode

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
