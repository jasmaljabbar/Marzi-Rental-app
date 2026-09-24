const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 500;
// Unpaginated list requests (older app screens) are still served, but capped.
const MAX_UNPAGED = 1000;

function resolvePagination(query = {}) {
  const page = parseInt(query.page, 10);
  const pageSize = parseInt(query.page_size, 10);
  if (!page && !pageSize) return null;
  const size = Math.min(Math.max(pageSize || DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  const current = Math.max(page || 1, 1);
  return { page: current, pageSize: size, skip: (current - 1) * size, limit: size };
}

function setPaginationHeaders(res, { page, pageSize, total }) {
  res.set("X-Total-Count", String(total));
  res.set("X-Page", String(page));
  res.set("X-Page-Size", String(pageSize));
  res.set("X-Total-Pages", String(Math.max(Math.ceil(total / pageSize), 1)));
}

// Runs count + page query for a Mongoose model and sets the pagination headers.
// `build` receives the base query so callers can add sort/select/populate.
async function paginate(res, query, { model, filter, build = (q) => q, session }) {
  const pagination = resolvePagination(query);
  const [total, docs] = await Promise.all([
    model.countDocuments(filter).session(session || null),
    (() => {
      let q = build(model.find(filter).session(session || null));
      q = pagination ? q.skip(pagination.skip).limit(pagination.limit) : q.limit(MAX_UNPAGED);
      return q;
    })(),
  ]);
  if (pagination) {
    setPaginationHeaders(res, { ...pagination, total });
  } else {
    res.set("X-Total-Count", String(total));
    if (total > MAX_UNPAGED) res.set("X-Truncated", "true");
  }
  return docs;
}

module.exports = { resolvePagination, setPaginationHeaders, paginate, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, MAX_UNPAGED };
