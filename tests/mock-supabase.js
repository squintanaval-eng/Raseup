/* Browser-test double. No real accounts, passwords or emails are used. */
(() => {
  const copy = value => JSON.parse(JSON.stringify(value));
  const db = JSON.parse(localStorage.getItem('test-db') || '{}');
  let session = JSON.parse(localStorage.getItem('test-session') || 'null');
  const listeners = [];
  const mock = window.mock = {
    db, delay: 20, offline: false, mailError: null, loginError: null,
    calls: {signup: 0, login: 0, mail: 0, password: 0}, lastRedirect: '',
    user(id) { return {id, email: id + '@example.test', user_metadata: {display_name: id === 'account-a' ? 'Reciclador A' : 'Reciclador B'}}; },
    emit(event, next) { session = next; localStorage.setItem('test-session', JSON.stringify(next)); listeners.forEach(fn => fn(event, next)); },
    persist() { localStorage.setItem('test-db', JSON.stringify(db)); }
  };
  const delay = () => new Promise(resolve => setTimeout(resolve, mock.delay));
  class Query {
    constructor() { this.operation = 'read'; this.filters = {}; }
    select() { return this; }
    eq(key, value) { this.filters[key] = value; return this; }
    upsert(value) { this.operation = 'insert'; this.value = value; return this; }
    update(value) { this.operation = 'update'; this.value = value; return this; }
    maybeSingle() { return this.run(); }
    single() { return this.run(); }
    then(resolve, reject) { return this.run().then(resolve, reject); }
    async run() {
      await delay();
      const id = this.filters.user_id || this.value?.user_id;
      if (mock.offline) return {data: null, error: {message: 'network failure'}};
      if (!session || session.user.id !== id) return {data: null, error: {code: '42501'}};
      if (this.operation === 'insert') { if (!db[id]) db[id] = {...copy(this.value), revision: 0}; mock.persist(); return {data: null, error: null}; }
      if (this.operation === 'update') {
        if (!db[id] || db[id].revision !== this.filters.revision) return {data: null, error: null};
        db[id] = {...db[id], ...copy(this.value)}; mock.persist();
        return {data: {revision: db[id].revision}, error: null};
      }
      return {data: db[id] ? copy(db[id]) : null, error: null};
    }
  }
  const auth = {
    onAuthStateChange(fn) { listeners.push(fn); return {data: {subscription: {unsubscribe() {}}}}; },
    async getSession() { return {data: {session: copy(session)}, error: null}; },
    async signInWithPassword({email}) {
      mock.calls.login++; await delay();
      if (mock.loginError) return {data: {}, error: mock.loginError};
      const user = mock.user(email.startsWith('b@') ? 'account-b' : 'account-a');
      mock.emit('SIGNED_IN', {user}); return {data: {user, session}, error: null};
    },
    async signUp(options) { mock.calls.signup++; mock.lastRedirect = options.options.emailRedirectTo; await delay(); return {data: {user: mock.user('account-a'), session: null}, error: null}; },
    async resend(options) { mock.calls.mail++; mock.lastRedirect = options.options.emailRedirectTo; return {error: mock.mailError}; },
    async resetPasswordForEmail(email, options) { mock.calls.mail++; mock.lastRedirect = options.redirectTo; return {error: mock.mailError}; },
    async updateUser() { mock.calls.password++; return {data: {user: session?.user}, error: null}; },
    async signOut() { await delay(); mock.emit('SIGNED_OUT', null); return {error: null}; }
  };
  window.supabase = {createClient() { return {auth, from() { return new Query(); }}; }};
})();
