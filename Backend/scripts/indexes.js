// backend/scripts/indexes.js
const path = require('node:path');
const env = require('../utils/dotenv');
env.config({ path: path.resolve(process.cwd(), '.env') });
const { MongoClient } = require('mongodb');
const { resolveMongoConfig } = require('../db/uri');

// Create indexes for collections used by the app. Supports real MongoDB
// or an in-memory MongoDB when USE_MEMORY_DB=true.
(async () => {
  let { uri, dbName } = resolveMongoConfig();
  const USE_MEMORY_DB = String(process.env.USE_MEMORY_DB || '').toLowerCase() === 'true';
  let mem;
  if (USE_MEMORY_DB) {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mem = await MongoMemoryServer.create();
    uri = mem.getUri();
  }
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);

    await db.collection('users').createIndexes([
      { key: { name: 1 }, name: 'user_name' },
      { key: { role: 1 }, name: 'user_role' },
      { key: { email: 1 }, name: 'user_email_unique', unique: true, partialFilterExpression: { email: { $exists: true } } },
      {
        key: { studentId: 1 },
        name: 'user_studentId_unique',
        unique: true,
        partialFilterExpression: { studentId: { $exists: true, $ne: '' } }
      }
    ]);

    await db.collection('books').createIndexes([
      { key: { title: 'text', author: 'text' }, name: 'books_text' },
      { key: { bookCode: 1 }, name: 'books_bookCode_unique', unique: true, partialFilterExpression: { bookCode: { $exists: true, $ne: '' } } }
    ]);

    await db.collection('loans').createIndexes([
      { key: { userId: 1, borrowedAt: -1 }, name: 'loans_user_time' },
      { key: { bookId: 1, returnedAt: 1 }, name: 'loans_book_return' },
      { key: { dueAt: 1 }, name: 'loans_due' }
    ]);

    await db.collection('visits').createIndexes([
      { key: { userId: 1, enteredAt: -1 }, name: 'visits_user_time' },
      { key: { barcode: 1, enteredAt: -1 }, name: 'visits_barcode_time' }
    ]);

    await db.collection('hours').createIndexes([
      { key: { branch: 1, dayOfWeek: 1 }, name: 'hours_branch_dow', unique: true }
    ]);

    // Admins: unique adminId and email (email sparse/partial unique)
    await db.collection('admins').createIndexes([
      { key: { adminId: 1 }, name: 'admin_adminId_unique', unique: true },
      { key: { email: 1 }, name: 'admin_email_unique', unique: true, partialFilterExpression: { email: { $exists: true } } }
    ]);

    console.log('Indexes created');
  } catch (e) {
    console.error('Index error:', e.message);
  } finally {
    await client.close();
    if (typeof mem !== 'undefined' && mem) { await mem.stop(); }
  }
})();
