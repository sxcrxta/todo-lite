(function () {
  'use strict';
  // TodoStore — 저장소 어댑터. 저장소 접근은 이 파일에서만. ARCHITECTURE.md §4.3
  // 어떤 메서드도 throw하지 않는다. 실패하면 안전한 기본값 + failed() = true (세션 동안 유지, D-12).
  // 저장소 API는 getItem/setItem만 쓴다 (D-26). 처리한 오류는 console.warn 1회만 (NF-03).

  var WARN_PREFIX = '[todo-lite] ';

  function defaultGetStorage() { return globalThis.localStorage; }

  function errorName(err) {
    return err && err.name ? err.name : String(err);
  }

  function create(getStorage) {
    var getStore = typeof getStorage === 'function' ? getStorage : defaultGetStorage;
    var core = globalThis.TodoCore;
    var hasFailed = false;

    function markFailed(op, err) {
      if (!hasFailed && typeof console !== 'undefined' && console && typeof console.warn === 'function') {
        console.warn(WARN_PREFIX + '저장소 ' + op + ' 실패, 이 세션은 메모리로만 동작: ' + errorName(err));
      }
      hasFailed = true;
    }

    // getStore()는 매 호출마다 try 안에서 부른다 — getter 자체가 SecurityError를 던질 수 있음
    function read(key) { return getStore().getItem(key); }
    function write(key, value) { getStore().setItem(key, value); }

    return {
      loadTodos: function () {
        try { return core.parseTodos(read(core.KEYS.todos)); } catch (err) { markFailed('읽기', err); return []; }
      },
      saveTodos: function (todos) {
        try { write(core.KEYS.todos, core.serializeTodos(todos)); return true; } catch (err) { markFailed('쓰기', err); return false; }
      },
      loadTheme: function () {
        try { return core.parseTheme(read(core.KEYS.theme)); } catch (err) { markFailed('읽기', err); return 'light'; }
      },
      saveTheme: function (theme) {
        try { write(core.KEYS.theme, core.parseTheme(theme)); return true; } catch (err) { markFailed('쓰기', err); return false; }
      },
      failed: function () { return hasFailed; }
    };
  }

  globalThis.TodoStore = Object.freeze({ create: create });
})();
