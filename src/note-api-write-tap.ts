// note の書込系 API (POST/PUT/PATCH/DELETE) を url + method + headers + body 付きで
// localStorage に蓄積する観察用スクリプト。note-api-client の daemon に新しい書込
// endpoint を追加する際、ブラウザが実際に送っているヘッダ (CSRF/Origin/Referer 等)
// を確認するためのリファレンスとして使う。
//
// Storage key: __note_api_write_tap (上限 100 件、古い方から押し出し)。
//
// 使い方: note.com にログインした状態で対象操作を行った後、devtools コンソールで:
//   JSON.parse(localStorage.getItem('__note_api_write_tap') || '[]')

const STORE = '__note_api_write_tap';
const MAX_ENTRIES = 100;
const MAX_BODY = 200_000;
// /api/v\d+/ 以下の note API 書込のみ拾う。
const URL_MATCH = /\/api\/v\d+\//;
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

type WriteTapEntry = {
  ts: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
  body_truncated: boolean;
  credentials: string;
};

function abs(u: unknown): string {
  try {
    const s = typeof u === 'string' ? u : String(u);
    return s.startsWith('http') ? s : new URL(s, location.origin).href;
  } catch {
    return String(u);
  }
}

function headersToObj(h: unknown): Record<string, string> {
  if (!h) return {};
  if (h instanceof Headers) {
    const o: Record<string, string> = {};
    h.forEach((v, k) => {
      o[k] = v;
    });
    return o;
  }
  if (Array.isArray(h)) return Object.fromEntries(h);
  return { ...(h as Record<string, string>) };
}

function bodyToStr(body: unknown): string {
  if (body == null) return '';
  if (typeof body === 'string') return body;
  if (body instanceof FormData) {
    const parts: [string, string][] = [];
    try {
      body.forEach((v, k) => {
        parts.push([k, typeof v === 'string' ? v : `[${(v as File)?.constructor?.name || 'file'}]`]);
      });
    } catch {
      /* ignore */
    }
    return '[FormData] ' + JSON.stringify(parts);
  }
  if (body instanceof Blob) return `[Blob ${body.size}]`;
  if (body instanceof URLSearchParams) return body.toString();
  if (body instanceof ArrayBuffer) return `[ArrayBuffer ${body.byteLength}]`;
  try {
    return JSON.stringify(body);
  } catch {
    return String(body);
  }
}

function append(entry: WriteTapEntry) {
  try {
    const list: WriteTapEntry[] = JSON.parse(localStorage.getItem(STORE) || '[]');
    list.push(entry);
    while (list.length > MAX_ENTRIES) list.shift();
    localStorage.setItem(STORE, JSON.stringify(list));
  } catch {
    /* QuotaExceeded 等は無視 */
  }
}

function record(method: string, url: unknown, headers: unknown, body: unknown, credentials?: string) {
  const u = abs(url);
  if (!URL_MATCH.test(u)) return;
  const m = String(method || 'GET').toUpperCase();
  if (!WRITE_METHODS.has(m)) return;
  const b = bodyToStr(body);
  append({
    ts: new Date().toISOString(),
    method: m,
    url: u,
    headers: headersToObj(headers),
    body: b.length > MAX_BODY ? b.slice(0, MAX_BODY) : b,
    body_truncated: b.length > MAX_BODY,
    credentials: credentials || '(default)',
  });
}

(function () {
  const origFetch = window.fetch.bind(window);
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    const url = typeof input === 'string' ? input : (input as Request)?.url ?? String(input);
    const method = init?.method || (input as Request)?.method || 'GET';
    const headers = {
      ...headersToObj((input as Request)?.headers),
      ...headersToObj(init?.headers),
    };
    record(method, url, headers, init?.body, init?.credentials || (input as Request)?.credentials);
    return origFetch(input, init);
  };

  const oOpen = XMLHttpRequest.prototype.open;
  const oSetHeader = XMLHttpRequest.prototype.setRequestHeader;
  const oSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (this: XMLHttpRequest & { __m?: string; __u?: string; __h?: Record<string, string> }, method: string, url: string | URL, ...rest: unknown[]) {
    this.__m = method;
    this.__u = String(url);
    this.__h = {};
    // @ts-expect-error open のオーバーロードが複雑なため any 経由で委譲
    return oOpen.apply(this, [method, url, ...rest]);
  };
  XMLHttpRequest.prototype.setRequestHeader = function (this: XMLHttpRequest & { __h?: Record<string, string> }, k: string, v: string) {
    try {
      (this.__h = this.__h || {})[k] = v;
    } catch {
      /* ignore */
    }
    return oSetHeader.call(this, k, v);
  };
  XMLHttpRequest.prototype.send = function (this: XMLHttpRequest & { __m?: string; __u?: string; __h?: Record<string, string> }, body?: Document | XMLHttpRequestBodyInit | null) {
    record(this.__m || 'GET', this.__u, this.__h || {}, body, '(xhr)');
    return oSend.call(this, body as never);
  };

  console.log(
    '[note-api-write-tap] installed. inspect via:',
    "JSON.parse(localStorage.getItem('__note_api_write_tap') || '[]')",
  );
})();
