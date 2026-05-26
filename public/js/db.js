const BASE = '/api';

class QueryBuilder {
  constructor(table) {
    this.table = table;
    this.action = 'select';
    this.selectColumns = '*';
    this.filters = [];
    this.orders = [];
    this.limitValue = null;
    this.singleValue = false;
    this.bodyValue = null;
    this.inList = [];
  }

  select(columns = '*') {
    this.action = 'select';
    this.selectColumns = columns;
    return this;
  }

  insert(body) {
    this.action = 'insert';
    this.bodyValue = body;
    return this;
  }

  update(body) {
    this.action = 'update';
    this.bodyValue = body;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  upsert(body) {
    this.action = 'upsert';
    this.bodyValue = body;
    return this;
  }

  eq(column, value) {
    this.filters.push({ type: 'eq', column, value });
    return this;
  }

  gte(column, value) {
    this.filters.push({ type: 'gte', column, value });
    return this;
  }

  lte(column, value) {
    this.filters.push({ type: 'lte', column, value });
    return this;
  }

  gt(column, value) {
    this.filters.push({ type: 'gt', column, value });
    return this;
  }

  lt(column, value) {
    this.filters.push({ type: 'lt', column, value });
    return this;
  }

  neq(column, value) {
    this.filters.push({ type: 'neq', column, value });
    return this;
  }

  ilike(column, value) {
    this.filters.push({ type: 'ilike', column, value });
    return this;
  }

  order(column, options = {}) {
    this.orders.push({
      column,
      ascending: options.ascending !== false,
    });
    return this;
  }

  limit(count) {
    this.limitValue = count;
    return this;
  }

  in(column, values) {
    this.inList.push({ column, values });
    return this;
  }

  single() {
    this.singleValue = true;
    return this;
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }

  catch(reject) {
    return this.execute().catch(reject);
  }

  finally(callback) {
    return this.execute().finally(callback);
  }

  async execute() {
    const payload = {
      table: this.table,
      action: this.action,
      select: this.selectColumns,
      filters: this.filters,
      orders: this.orders,
      limit: this.limitValue,
      single: this.singleValue,
      body: this.bodyValue,
      inList: this.inList,
    };

    return postJson(`${BASE}/query`, payload);
  }
}

async function authRequest(action, body = {}) {
  return postJson(`${BASE}/auth`, { action, ...body });
}

async function postJson(url, payload) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        data: null,
        error: result.error || { message: 'İstek başarısız oldu.' },
      };
    }

    return {
      data: result.data ?? null,
      error: result.error ?? null,
    };
  } catch (error) {
    return {
      data: null,
      error: {
        message: error.message || 'Bağlantı hatası.',
      },
    };
  }
}

const db = {
  from(table) {
    return new QueryBuilder(table);
  },

  auth: {
    async signInWithPassword({ email, password }) {
      return authRequest('signInWithPassword', { email, password });
    },

    async signOut() {
      return authRequest('signOut');
    },

    async getSession() {
      return authRequest('getSession');
    },

    onAuthStateChange(callback) {
      db.auth.getSession().then((result) => {
        const session = result && result.data ? result.data.session : null;
        callback(session ? 'SIGNED_IN' : 'SIGNED_OUT', session);
      });

      return {
        data: {
          subscription: {
            unsubscribe() {},
          },
        },
      };
    },
  },
};
