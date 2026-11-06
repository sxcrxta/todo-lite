// TodoView — DOM 렌더·이벤트·포커스 복원 (ARCHITECTURE §4.5). DOM은 이 파일에서만 만진다.
// 로드 시점에는 DOM에 접근하지 않는다(create()를 부를 때 doc을 받음). 상태를 갖지 않는다:
// 포커스 복원용 직전 id 목록은 DOM에서 읽는다. 사용자 텍스트는 textContent·setAttribute로만 넣는다(AC-07, AC-34).
(function () {
  'use strict';

  var WARNING_TEXT = '저장할 수 없어 새로고침하면 변경 내용이 사라집니다'; // AC-18: '저장' 포함
  var DELETE_LABEL = '삭제';
  var ITEM_CONTROLS = ['todo-toggle', 'todo-delete']; // 포커스 복원 대상 kind (D-19)
  var DARK = 'dark';

  function create(doc) {
    var d = doc || globalThis.document;
    var Core = globalThis.TodoCore;
    var html = d.documentElement;
    var input = d.getElementById('new-todo');
    var addBtn = d.getElementById('add-btn');
    var list = d.getElementById('todo-list');
    var warning = d.getElementById('storage-warning');
    var themeToggle = d.getElementById('theme-toggle');
    var filterButtons = Array.prototype.slice.call(d.querySelectorAll('[data-filter]'));
    var bound = false;

    function itemOf(el) {
      var li = el && el.closest ? el.closest('li.todo-item') : null;
      return li && list.contains(li) ? li : null;
    }

    // 포커스가 항목 컨트롤에 있으면 {id, kind}, 아니면 null
    function focusedControl() {
      var el = d.activeElement;
      var li = itemOf(el);
      if (!li) return null;
      for (var i = 0; i < ITEM_CONTROLS.length; i += 1) {
        if (el.classList.contains(ITEM_CONTROLS[i])) return { id: li.getAttribute('data-id'), kind: ITEM_CONTROLS[i] };
      }
      return null;
    }

    function currentIds() {
      var ids = [];
      for (var li = list.firstElementChild; li; li = li.nextElementSibling) ids.push(li.getAttribute('data-id'));
      return ids;
    }

    function buildItem(todo) {
      var li = d.createElement('li');
      li.className = 'todo-item';
      li.setAttribute('data-id', todo.id);
      li.setAttribute('data-done', todo.done ? 'true' : 'false');

      var label = d.createElement('label');
      label.className = 'todo-label';
      var toggle = d.createElement('input');
      toggle.type = 'checkbox';
      toggle.className = 'todo-toggle';
      toggle.checked = todo.done;
      var text = d.createElement('span');
      text.className = 'todo-text';
      text.textContent = todo.text;
      label.appendChild(toggle);
      label.appendChild(text);

      var del = d.createElement('button');
      del.type = 'button';
      del.className = 'btn todo-delete';
      del.setAttribute('aria-label', todo.text + ' ' + DELETE_LABEL);
      del.textContent = DELETE_LABEL;

      li.appendChild(label);
      li.appendChild(del);
      return li;
    }

    // 목록 전체 교체 + 포커스 복원 (D-29, AC-33)
    function renderList(visible) {
      var focused = focusedControl();
      var prevIds = focused ? currentIds() : null;
      var frag = d.createDocumentFragment();
      var byId = {};
      var nextIds = [];
      for (var i = 0; i < visible.length; i += 1) {
        var li = buildItem(visible[i]);
        if (!Object.prototype.hasOwnProperty.call(byId, visible[i].id)) byId[visible[i].id] = li;
        nextIds.push(visible[i].id);
        frag.appendChild(li);
      }
      list.replaceChildren(frag);
      if (!focused) return; // 포커스가 목록 밖이었으면 건드리지 않음
      var target = Core.nextFocus(prevIds, nextIds, focused.id);
      var owner = target !== null && Object.prototype.hasOwnProperty.call(byId, target) ? byId[target] : null;
      var control = owner ? owner.querySelector('.' + focused.kind) : null;
      (control || input).focus();
    }

    // 버튼은 다시 만들지 않는다(포커스 유지, AC-33 (6))
    function setFilter(filter) {
      for (var i = 0; i < filterButtons.length; i += 1) {
        filterButtons[i].setAttribute('aria-pressed', filterButtons[i].getAttribute('data-filter') === filter ? 'true' : 'false');
      }
    }

    function setTheme(theme) {
      html.setAttribute('data-theme', theme);
      themeToggle.setAttribute('aria-pressed', theme === DARK ? 'true' : 'false');
    }

    function clearInput() {
      input.value = '';
      input.focus();
    }

    // 한 번 보이면 세션 동안 유지 (D-12). 다시 불러도 같음
    function showStorageWarning() {
      if (!warning.hidden) return;
      warning.textContent = WARNING_TEXT;
      warning.hidden = false;
    }

    function bind(h) {
      if (bound) { console.warn('[todo-lite] TodoView.bind는 한 번만 호출해야 함 — 무시'); return; }
      bound = true;

      input.addEventListener('keydown', function (e) {
        if (!Core.isSubmitKey(e)) return; // IME 조합 중 Enter 무시 (D-20, AC-32)
        e.preventDefault();
        h.onAdd(input.value);
      });
      addBtn.addEventListener('click', function () { h.onAdd(input.value); });

      // 항목 이벤트는 #todo-list 한 곳에 위임 (항목별 리스너 없음)
      list.addEventListener('change', function (e) {
        var t = e.target;
        if (!t.classList || !t.classList.contains('todo-toggle')) return;
        var li = itemOf(t);
        if (li) h.onToggle(li.getAttribute('data-id'));
      });
      list.addEventListener('click', function (e) {
        var btn = e.target.closest ? e.target.closest('.todo-delete') : null;
        var li = btn ? itemOf(btn) : null;
        if (li) h.onDelete(li.getAttribute('data-id'));
      });

      filterButtons.forEach(function (b) {
        b.addEventListener('click', function () { h.onFilter(b.getAttribute('data-filter')); });
      });
      themeToggle.addEventListener('click', function () { h.onThemeToggle(); });
    }

    return {
      renderList: renderList,
      setFilter: setFilter,
      setTheme: setTheme,
      clearInput: clearInput,
      showStorageWarning: showStorageWarning,
      bind: bind,
    };
  }

  globalThis.TodoView = { create: create };
})();
