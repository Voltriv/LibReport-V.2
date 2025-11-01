const LOAN_ID_FALLBACK_PREFIX = "loan";

export function stringifyId(value, fallback = null) {
  if (value === null || value === undefined) {
    return fallback;
  }
  try {
    const str = typeof value === "string" ? value : String(value);
    const trimmed = str.trim();
    if (!trimmed || trimmed === "[object Object]") {
      return fallback;
    }
    return trimmed;
  } catch (err) {
    return fallback;
  }
}

export function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? null : new Date(time);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function normalizeStudentLoan(raw = {}, index = 0) {
  const book = raw.book || {};
  const idSource =
    raw.id ?? raw._id ?? raw.loanId ?? raw.bookId ?? `${LOAN_ID_FALLBACK_PREFIX}-${index}`;
  const id = stringifyId(idSource, `${LOAN_ID_FALLBACK_PREFIX}-${index}`);
  const bookId = stringifyId(raw.bookId ?? book.id ?? book._id, null);

  return {
    id,
    loanId: stringifyId(raw.loanId, null),
    bookId,
    title: raw.title || book.title || "",
    author: raw.author || book.author || "",
    bookCode: raw.bookCode || book.bookCode || book.code || "",
    borrowedAt: parseDate(raw.borrowedAt),
    dueAt: parseDate(raw.dueAt),
    returnedAt: parseDate(raw.returnedAt),
    daysOverdue: typeof raw.daysOverdue === "number" ? raw.daysOverdue : null,
    fine: typeof raw.fine === "number" ? Number(raw.fine) : null,
    status: typeof raw.status === "string" ? raw.status : raw.statusLabel || ""
  };
}

export function normalizeHistoryEntry(raw = {}, index = 0) {
  const base = normalizeStudentLoan(raw, index);
  const statusSource =
    typeof raw.status === "string" && raw.status.trim()
      ? raw.status.trim()
      : typeof base.status === "string"
      ? base.status.trim()
      : "";
  return {
    ...base,
    status: statusSource,
    // ensure returnedAt is preserved even if normalizeStudentLoan cleared it
    returnedAt: parseDate(raw.returnedAt)
  };
}
