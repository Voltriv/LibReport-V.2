'use strict';

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const prevNoDb = process.env.NO_DB;
process.env.NO_DB = 'false';
process.env.USE_MEMORY_DB = 'true';

const assert = require('node:assert/strict');
const test = require('node:test');
const { once } = require('node:events');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const { app, buildStaffingRecommendations } = require('../server.js');
const { User, Book, Loan } = require('../models');

const DAY_MS = 24 * 60 * 60 * 1000;

let server;
let baseUrl;

test.before(async () => {
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  baseUrl = `http://${address.address}:${address.port}`;
  await ensureDbReady();
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await mongoose.disconnect();
  if (typeof prevNoDb === 'undefined') {
    delete process.env.NO_DB;
  } else {
    process.env.NO_DB = prevNoDb;
  }
});

test('buildStaffingRecommendations highlights peaks', () => {
  const hourlyBuckets = [
    { hour: 9, count: 210 },
    { hour: 13, count: 70 }
  ];
  const dayBuckets = [
    { dow: 2, count: 280 },
    { dow: 5, count: 120 }
  ];

  const result = buildStaffingRecommendations(hourlyBuckets, dayBuckets, {
    lookbackDays: 7,
    visitsPerStaff: 25
  });

  assert.equal(result.lookbackDays, 7);
  assert.equal(result.visitsPerStaff, 25);
  assert.ok(result.peakHours.length > 0);
  assert.equal(result.peakHours[0].hour, 9);
  assert.equal(result.peakHours[0].recommendedStaff, 2);
  assert.ok(result.busyDays.some((item) => item.label === 'Tuesday'));
  assert.ok(result.recommendations.length > 0);
});

test('analytics report endpoints return aggregated data', async () => {
  await resetAndSeed();
  const { admin } = await seedAnalyticsData();
  const headers = buildAuthHeader(admin);
  const requestOptions = { headers };

  const [
    topBorrowersRes,
    genreRes,
    underutilizedRes,
    finesRes
  ] = await Promise.all([
    fetchJson(`${baseUrl}/api/reports/top-borrowers?days=120&limit=5`, requestOptions),
    fetchJson(`${baseUrl}/api/reports/genre-trends?days=90&limit=5`, requestOptions),
    fetchJson(`${baseUrl}/api/reports/underutilized?days=60&limit=10`, requestOptions),
    fetchJson(`${baseUrl}/api/reports/fines?limit=10`, requestOptions)
  ]);

  assert.equal(topBorrowersRes.status, 200);
  assert.equal(topBorrowersRes.body.items.length, 2);
  const [firstBorrower, secondBorrower] = topBorrowersRes.body.items;
  assert.equal(firstBorrower.fullName, 'Alice Reader');
  assert.equal(firstBorrower.borrows, 3);
  assert.equal(firstBorrower.activeLoans, 2);
  assert.equal(firstBorrower.overdueLoans, 1);
  assert.ok(firstBorrower.share > secondBorrower.share);

  assert.equal(genreRes.status, 200);
  assert.ok(genreRes.body.items.length >= 2);
  const sciFi = genreRes.body.items.find((item) => item.topic === 'Science Fiction');
  const mystery = genreRes.body.items.find((item) => item.topic === 'Mystery');
  assert.ok(sciFi);
  assert.ok(mystery);
  assert.ok(sciFi.share > mystery.share);
  assert.ok(sciFi.growth > 0);

  assert.equal(underutilizedRes.status, 200);
  assert.ok(underutilizedRes.body.totalUnderutilized >= 2);
  const titles = underutilizedRes.body.items.map((row) => row.title);
  assert.ok(titles.includes('Forgotten Archives'));
  assert.ok(titles.includes('Untouched Philosophy'));
  const neverBorrowed = underutilizedRes.body.items.find((row) => row.title === 'Untouched Philosophy');
  assert.equal(neverBorrowed.status, 'Never borrowed');
  assert.equal(neverBorrowed.daysIdle, 'Never');

  assert.equal(finesRes.status, 200);
  assert.equal(finesRes.body.items.length, 1);
  const fineItem = finesRes.body.items[0];
  assert.equal(fineItem.borrower, 'Alice Reader');
  assert.equal(fineItem.daysOverdue, '3');
  assert.equal(fineItem.fine, '3.00');
  assert.equal(finesRes.body.totals.outstanding, 3);
  assert.equal(finesRes.body.totals.overdueLoans, 1);
  assert.equal(finesRes.body.totals.averageFine, 3);
  assert.equal(finesRes.body.totals.averageDaysOverdue, 3);
});

async function ensureDbReady() {
  if (mongoose.connection.readyState === 1) {
    return;
  }
  await new Promise((resolve, reject) => {
    const onError = (err) => {
      mongoose.connection.off('open', onOpen);
      reject(err);
    };
    const onOpen = () => {
      mongoose.connection.off('error', onError);
      resolve();
    };
    mongoose.connection.once('error', onError);
    mongoose.connection.once('open', onOpen);
  });
}

async function resetAndSeed() {
  const connection = mongoose.connection;
  if (connection.readyState !== 1) {
    await ensureDbReady();
  }
  await connection.db.dropDatabase();
}

async function seedAnalyticsData() {
  const now = new Date();
  const daysAgo = (days) => new Date(now.getTime() - days * DAY_MS);
  const daysFromNow = (days) => new Date(now.getTime() + days * DAY_MS);

  const [admin, borrowerA, borrowerB] = await User.create([
    {
      studentId: '00-0000-000001',
      email: 'admin@example.com',
      fullName: 'Admin User',
      passwordHash: 'hashed-password',
      role: 'admin'
    },
    {
      studentId: '11-1111-111111',
      email: 'alice@example.com',
      fullName: 'Alice Reader',
      passwordHash: 'hashed-password',
      role: 'student'
    },
    {
      studentId: '22-2222-222222',
      email: 'bob@example.com',
      fullName: 'Bob Borrower',
      passwordHash: 'hashed-password',
      role: 'student'
    }
  ]);

  const [bookSciFi, bookMystery, bookDormant, bookNever] = await Book.create([
    {
      title: 'Galactic Frontiers',
      author: 'Ivy Stellar',
      genre: 'Science Fiction',
      department: 'Literature',
      totalCopies: 5,
      availableCopies: 3,
      bookCode: 'SF-001'
    },
    {
      title: 'Mystery on the Rails',
      author: 'Connie Case',
      genre: 'Mystery',
      department: 'Literature',
      totalCopies: 4,
      availableCopies: 2,
      bookCode: 'MY-002'
    },
    {
      title: 'Forgotten Archives',
      author: 'Henry Historian',
      genre: 'History',
      department: 'History',
      totalCopies: 3,
      availableCopies: 3,
      bookCode: 'HI-003'
    },
    {
      title: 'Untouched Philosophy',
      author: 'Sophia Thinker',
      genre: 'Philosophy',
      department: 'Humanities',
      totalCopies: 2,
      availableCopies: 2,
      bookCode: 'PH-004'
    }
  ]);

  await Loan.create([
    {
      userId: borrowerA._id,
      bookId: bookSciFi._id,
      borrowedAt: daysAgo(5),
      dueAt: daysFromNow(7)
    },
    {
      userId: borrowerA._id,
      bookId: bookSciFi._id,
      borrowedAt: daysAgo(12),
      dueAt: daysAgo(3) // overdue by 3 days
    },
    {
      userId: borrowerA._id,
      bookId: bookMystery._id,
      borrowedAt: daysAgo(18),
      dueAt: daysAgo(4),
      returnedAt: daysAgo(1)
    },
    {
      userId: borrowerB._id,
      bookId: bookMystery._id,
      borrowedAt: daysAgo(25),
      dueAt: daysAgo(8),
      returnedAt: daysAgo(5)
    },
    {
      userId: borrowerB._id,
      bookId: bookDormant._id,
      borrowedAt: daysAgo(140),
      dueAt: daysAgo(120),
      returnedAt: daysAgo(110)
    },
    {
      userId: borrowerA._id,
      bookId: bookSciFi._id,
      borrowedAt: daysAgo(140),
      dueAt: daysAgo(120),
      returnedAt: daysAgo(110)
    }
  ]);

  return { admin, borrowerA, borrowerB, now };
}

function buildAuthHeader(user) {
  const token = jwt.sign(
    { sub: String(user._id), email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  return { Authorization: `Bearer ${token}` };
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.json();
  return { status: response.status, body };
}
