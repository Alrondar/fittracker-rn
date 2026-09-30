// src/lib/webFixes.ts
// WEB-ZOOM-1: авто-зум iOS Safari при фокусе полей ввода.
//
// Симптом (прогон на iPhone, 30.09): тап в любое поле ввода в браузере
// приближает страницу; после blur зум НЕ возвращается — весь экран выглядит
// «разъехавшимся» (обрезанные шапки, наезжающие друг на друга элементы).
// Причина: Safari на iOS автоматически зумит страницу, если computed
// `font-size` сфокусированного <input>/<textarea>/<select> меньше 16px.
// `user-scalable=no` / `maximum-scale` iOS игнорирует с 10-й версии,
// поэтому единственный надёжный фикс — пол 16px на самих полях.
//
// Почему глобальный CSS, а не правки по стилям: полей ~20 (SetsGrid 12px,
// поиск 14px, EquipmentSheet 15px, дефолтные RNW TextInput без fontSize),
// а `!important` перебивает inline-стили RNW. Медиазапрос `(hover: none)`
// ограничивает фикс тач-устройствами — на десктопе типографика не меняется.
//
// Инъекция в head, а не шаблон web/index.html: не дублируем генерируемый
// Expo шаблон и его meta-теги.
//
// WEB-OVF-1 (тот же прогон): в CSS у flex-элементов значение по умолчанию
// `min-width: auto`, а в Yoga (нативный layout) — 0. Из-за этого на вебе
// текст с numberOfLines в узком ряду не сжимается, а растягивает ряд за
// карточку (в конструкторе пилюля «3 × 8-12» залезала под иконку удаления).
// `div { min-width: 0 }` возвращает вебу нативную семантику: явные inline
// minWidth из стилей компонентов перебивают это правило (они важнее
// табличного стиля без !important), так что сознательные исключения
// сохраняются. Правило только для тач-режима — десктопная раскладка не
// меняется; конструктор дополнительно починен точечно (виден и на десктопе).
import { Platform } from 'react-native';

const STYLE_ID = 'fittracker-web-fixes';

export function applyWebFixes(): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
@media (hover: none) {
  input, textarea, select {
    font-size: 16px !important;
  }
  div {
    min-width: 0;
  }
}
/* WEB-3b (drag): на время перетаскивания вешается на <body> из WebReorderList —
   гасит выделение текста и iOS callout-меню («Копировать») по долгому тапу. */
.ft-dragging, .ft-dragging * {
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}
`;
  document.head.appendChild(style);
}
