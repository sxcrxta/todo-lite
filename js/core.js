(function () {
  'use strict';
  // TodoCore — 순수 로직. DOM·저장소·전역 상태에 접근하지 않는다. ARCHITECTURE.md §4.2
  // 모든 함수는 인자를 바꾸지 않고, 배열은 새로 만들어 돌려준다.

  var KEYS = Object.freeze({ todos: 'todo-lite:todos', theme: 'todo-lite:theme' });
  var FILTERS = Object.freeze(['all', 'active', 'completed']);
  var THEMES = Object.freeze(['light', 'dark']);
  var DARK = 'dark';
  var LIGHT = 'light';
  var IME_KEYCODE = 229; // 조합 중 keydown의 keyCode (D-20)
  var ID_RANDOM_RANGE = 0x100000000; // 대체 id의 난수 부분 범위(32비트)
  var idCounter = 0; // 대체 id 생성 카운터(페이지 세션 동안 증가)

  // 입력 텍스트 앞뒤 공백 제거(탭·U+3000 포함). '' 이면 호출자가 추가를 거부한다 (F-01, AC-03/04)
  function normalizeText(raw) {
    return String(raw === null || raw === undefined ? '' : raw).trim();
  }

  // Enter이고 IME 조합 중이 아닐 때만 true (D-20, AC-32)
  function isSubmitKey(e) {
    return !!e && e.key === 'Enter' && !e.isComposing && e.keyCode !== IME_KEYCODE;
  }

  function isValidTodo(x) {
    return x !== null && typeof x === 'object' &&
      typeof x.id === 'string' && x.id !== '' &&
      typeof x.text === 'string' && x.text.trim() !== '' &&
      typeof x.done === 'boolean';
  }

  // 저장 문자열 → Todo[]. 형식에 맞는 원소만 순서대로, 중복 id는 처음 것만, 키는 id/text/done만. 절대 throw 안 함 (D-11, AC-17)
  function parseTodos(raw) {
    if (typeof raw !== 'string') return [];
    var data;
    try { data = JSON.parse(raw); } catch (err) { return []; }
    if (!Array.isArray(data)) return [];
    var seen = new Set();
    var out = [];
    for (var i = 0; i < data.length; i += 1) {
      var x = data[i];
      if (!isValidTodo(x) || seen.has(x.id)) continue;
      seen.add(x.id);
      out.push({ id: x.id, text: x.text, done: x.done });
    }
    return out;
  }

  // Todo[] → 저장 문자열. 원소 키는 정확히 id·text·done (AC-16)
  function serializeTodos(todos) {
    if (!Array.isArray(todos)) return '[]';
    return JSON.stringify(todos.map(function (t) { return { id: t.id, text: t.text, done: t.done }; }));
  }

  // 'dark'(원시 문자열)만 다크, 그 외 전부 라이트 (D-09, AC-19)
  function parseTheme(raw) {
    return raw === DARK ? DARK : LIGHT;
  }

  function callNumber(fn, fallback) {
    try {
      var n = typeof fn === 'function' ? Number(fn()) : NaN;
      return isFinite(n) ? n : fallback;
    } catch (err) { return fallback; }
  }

  // randomUUID가 있으면 쓰고(secure context), 없으면 시각 + 난수 + 모듈 카운터.
  // todos의 id와 겹치면 다시 만든다 — 카운터가 매번 달라지므로 반드시 끝난다 (D-21, AC-05/15)
  function createId(todos, env) {
    var e = env || {};
    var crypto = 'crypto' in e ? e.crypto : globalThis.crypto;
    var now = typeof e.now === 'function' ? e.now : Date.now;
    var random = typeof e.random === 'function' ? e.random : Math.random;
    var used = new Set();
    var list = Array.isArray(todos) ? todos : [];
    for (var i = 0; i < list.length; i += 1) if (list[i]) used.add(list[i].id);

    if (crypto && typeof crypto.randomUUID === 'function') {
      try {
        var uuid = crypto.randomUUID();
        if (typeof uuid === 'string' && uuid !== '' && !used.has(uuid)) return uuid;
      } catch (err) { /* 아래 대체 방식으로 */ }
    }
    var time = Math.abs(Math.floor(callNumber(now, 0))).toString(36);
    var id;
    do {
      idCounter += 1;
      var rand = Math.floor(Math.abs(callNumber(random, 0)) * ID_RANDOM_RANGE) % ID_RANDOM_RANGE;
      id = time + '-' + rand.toString(36) + '-' + idCounter.toString(36);
    } while (used.has(id));
    return id;
  }

  // 끝에 새 항목 추가. text는 이미 normalize된 값 (D-02)
  function addTodo(todos, text, id) {
    return todos.concat([{ id: id, text: text, done: false }]);
  }

  // 해당 id의 done 반전, 없는 id면 내용 그대로 (F-02)
  function toggleTodo(todos, id) {
    return todos.map(function (t) {
      return t.id === id ? { id: t.id, text: t.text, done: !t.done } : t;
    });
  }

  // 해당 id 제거 (F-03)
  function removeTodo(todos, id) {
    return todos.filter(function (t) { return t.id !== id; });
  }

  // active = 미완료, completed = 완료, 그 외 = 전체 (F-04)
  function filterTodos(todos, filter) {
    if (filter === 'active') return todos.filter(function (t) { return !t.done; });
    if (filter === 'completed') return todos.filter(function (t) { return t.done; });
    return todos.slice();
  }

  // 다시 그린 뒤 포커스를 둘 항목 id. 그대로 있으면 그 id → 뒤쪽 → 앞쪽 → null(#new-todo) (D-19, AC-33)
  function nextFocus(prevIds, nextIds, focusedId) {
    var next = new Set(nextIds);
    if (next.has(focusedId)) return focusedId;
    var at = prevIds.indexOf(focusedId);
    if (at < 0) return null;
    for (var i = at + 1; i < prevIds.length; i += 1) if (next.has(prevIds[i])) return prevIds[i];
    for (var j = at - 1; j >= 0; j -= 1) if (next.has(prevIds[j])) return prevIds[j];
    return null;
  }

  globalThis.TodoCore = Object.freeze({
    KEYS: KEYS,
    FILTERS: FILTERS,
    THEMES: THEMES,
    normalizeText: normalizeText,
    isSubmitKey: isSubmitKey,
    parseTodos: parseTodos,
    serializeTodos: serializeTodos,
    parseTheme: parseTheme,
    createId: createId,
    addTodo: addTodo,
    toggleTodo: toggleTodo,
    removeTodo: removeTodo,
    filterTodos: filterTodos,
    nextFocus: nextFocus
  });
})();
