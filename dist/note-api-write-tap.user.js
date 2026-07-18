// ==UserScript==
// @name         note-api-write-tap
// @namespace    https://github.com/ishii-masaki-646/monkey-scripts
// @version      0.1.0
// @author       ishii-masaki-646
// @description  note の書込系 API (POST/PUT/PATCH/DELETE) を url/method/headers/body 付きで localStorage に蓄積する観察 hook
// @downloadURL  https://raw.githubusercontent.com/ishii-masaki-646/monkey-scripts/main/dist/note-api-write-tap.user.js
// @updateURL    https://raw.githubusercontent.com/ishii-masaki-646/monkey-scripts/main/dist/note-api-write-tap.user.js
// @match        https://note.com/*
// @match        https://editor.note.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  const STORE = "__note_api_write_tap";
  const MAX_ENTRIES = 100;
  const MAX_BODY = 2e5;
  const URL_MATCH = /\/api\/v\d+\//;
  const WRITE_METHODS = /* @__PURE__ */ new Set(["POST", "PUT", "PATCH", "DELETE"]);
  function abs(u) {
    try {
      const s = typeof u === "string" ? u : String(u);
      return s.startsWith("http") ? s : new URL(s, location.origin).href;
    } catch {
      return String(u);
    }
  }
  function headersToObj(h) {
    if (!h) return {};
    if (h instanceof Headers) {
      const o = {};
      h.forEach((v, k) => {
        o[k] = v;
      });
      return o;
    }
    if (Array.isArray(h)) return Object.fromEntries(h);
    return { ...h };
  }
  function bodyToStr(body) {
    if (body == null) return "";
    if (typeof body === "string") return body;
    if (body instanceof FormData) {
      const parts = [];
      try {
        body.forEach((v, k) => {
          var _a;
          parts.push([k, typeof v === "string" ? v : `[${((_a = v == null ? void 0 : v.constructor) == null ? void 0 : _a.name) || "file"}]`]);
        });
      } catch {
      }
      return "[FormData] " + JSON.stringify(parts);
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
  function append(entry) {
    try {
      const list = JSON.parse(localStorage.getItem(STORE) || "[]");
      list.push(entry);
      while (list.length > MAX_ENTRIES) list.shift();
      localStorage.setItem(STORE, JSON.stringify(list));
    } catch {
    }
  }
  function record(method, url, headers, body, credentials) {
    const u = abs(url);
    if (!URL_MATCH.test(u)) return;
    const m = String(method || "GET").toUpperCase();
    if (!WRITE_METHODS.has(m)) return;
    const b = bodyToStr(body);
    append({
      ts: (/* @__PURE__ */ new Date()).toISOString(),
      method: m,
      url: u,
      headers: headersToObj(headers),
      body: b.length > MAX_BODY ? b.slice(0, MAX_BODY) : b,
      body_truncated: b.length > MAX_BODY,
      credentials: credentials || "(default)"
    });
  }
  (function() {
    const origFetch = window.fetch.bind(window);
    window.fetch = function(input, init) {
      const url = typeof input === "string" ? input : (input == null ? void 0 : input.url) ?? String(input);
      const method = (init == null ? void 0 : init.method) || (input == null ? void 0 : input.method) || "GET";
      const headers = {
        ...headersToObj(input == null ? void 0 : input.headers),
        ...headersToObj(init == null ? void 0 : init.headers)
      };
      record(method, url, headers, init == null ? void 0 : init.body, (init == null ? void 0 : init.credentials) || (input == null ? void 0 : input.credentials));
      return origFetch(input, init);
    };
    const oOpen = XMLHttpRequest.prototype.open;
    const oSetHeader = XMLHttpRequest.prototype.setRequestHeader;
    const oSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      this.__m = method;
      this.__u = String(url);
      this.__h = {};
      return oOpen.apply(this, [method, url, ...rest]);
    };
    XMLHttpRequest.prototype.setRequestHeader = function(k, v) {
      try {
        (this.__h = this.__h || {})[k] = v;
      } catch {
      }
      return oSetHeader.call(this, k, v);
    };
    XMLHttpRequest.prototype.send = function(body) {
      record(this.__m || "GET", this.__u, this.__h || {}, body, "(xhr)");
      return oSend.call(this, body);
    };
    console.log(
      "[note-api-write-tap] installed. inspect via:",
      "JSON.parse(localStorage.getItem('__note_api_write_tap') || '[]')"
    );
  })();

})();