(function () {
  'use strict';
  // app — 컨트롤러: 상태·저장·뷰 연결. 전역을 만들지 않고 DOM을 직접 만지지 않는다. ARCHITECTURE.md §4.6·§4.7
  // 의존: TodoCore(순수 로직) · TodoStore(저장소) · TodoView(DOM). 필터는 저장하지 않는다 (D-07).

  var Core = globalThis.TodoCore;
  var DEFAULT_FILTER = 'all';
  var DARK = 'dark';
  var LIGHT = 'light';

  var store = globalThis.TodoStore.create();
  var view = globalThis.TodoView.create(globalThis.document);
  var state = { todos: store.loadTodos(), filter: DEFAULT_FILTER, theme: store.loadTheme() };

  function render() { view.renderList(Core.filterTodos(state.todos, state.filter)); }
  function syncWarning() { if (store.failed()) view.showStorageWarning(); }
  // 저장은 즉시·동기 (AC-16). 실패해도 메모리 상태로 계속 동작하고 경고만 띄운다 (AC-18)
  function commit(next) { state.todos = next; store.saveTodos(next); render(); syncWarning(); }

  var handlers = {
    onAdd: function (raw) {
      var text = Core.normalizeText(raw);
      if (text === '') return; // 빈 입력: 저장·렌더·입력값 변경 없음 (AC-03)
      commit(Core.addTodo(state.todos, text, Core.createId(state.todos)));
      view.clearInput();
    },
    onToggle: function (id) { commit(Core.toggleTodo(state.todos, id)); },
    onDelete: function (id) { commit(Core.removeTodo(state.todos, id)); },
    onFilter: function (filter) {
      state.filter = Core.FILTERS.indexOf(filter) >= 0 ? filter : DEFAULT_FILTER;
      view.setFilter(state.filter);
      render();
    },
    onThemeToggle: function () {
      state.theme = state.theme === DARK ? LIGHT : DARK;
      store.saveTheme(state.theme);
      view.setTheme(state.theme);
      syncWarning();
    }
  };

  // 초기화 (§4.7 3단계). 첫 로드에서는 아무것도 저장하지 않는다.
  view.setTheme(state.theme);
  view.setFilter(state.filter);
  render();
  syncWarning();
  view.bind(handlers);
})();
