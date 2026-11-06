// <head>에서 저장된 테마를 html[data-theme]에 적용 (ARCHITECTURE §4.4, AC-21, D-30). 전역을 만들지 않는다.
// body 파싱 전에 동기로 돈다. 저장 키·검증은 TodoStore/TodoCore를 재사용하고, Store가 예외를 삼키므로
// 저장소 접근이 막혀도(SecurityError) 'light'로 끝난다. aria-pressed는 버튼이 아직 없으므로 app이 처리한다.
(function () {
  'use strict';
  document.documentElement.setAttribute('data-theme', globalThis.TodoStore.create().loadTheme());
})();
