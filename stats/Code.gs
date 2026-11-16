/**
 * Статистика квізу «Black Friday: підбір курсів» (robot_dreams).
 * Скрипт приймає події з квізу й записує їх у цю таблицю.
 *
 * Як встановити — README.md, розділ «Статистика».
 * 1) Розширення → Apps Script → вставити цей код → зберегти.
 * 2) Обрати функцію setup → Виконати (один раз; створить аркуші й зведення).
 * 3) Розгорнути → Нове розгортання → Вебзастосунок: виконувати від мене, доступ «Усі».
 */

var SHEETS = {
  events: 'Події',
  results: 'Проходження',
  summary: 'Зведення',
};

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ev = sheet_(ss, SHEETS.events, ['Час', 'Подія', 'Сесія', 'Деталі']);
  var rs = sheet_(ss, SHEETS.results, ['Час', 'Сесія', 'Тривалість, с', 'Напрями', 'Чим займається', 'Навички', 'Добірка', 'Також радимо']);
  var sm = sheet_(ss, SHEETS.summary, ['Показник', 'Значення']);
  ev.setFrozenRows(1); rs.setFrozenRows(1); sm.setFrozenRows(1);

  var E = "'" + SHEETS.events + "'!";
  var rows = [
    ['Почали квіз (унікальні сесії)', '=IFERROR(COUNTUNIQUE(FILTER(' + E + 'C2:C, ' + E + 'B2:B="quiz_started")), 0)'],
    ['Почали з кнопки напряму', '=COUNTIFS(' + E + 'B2:B, "quiz_started", ' + E + 'D2:D, "*from_direction*")'],
    ['Дійшли до питання 2', '=IFERROR(COUNTUNIQUE(FILTER(' + E + 'C2:C, ' + E + 'B2:B="step_viewed", ' + E + 'D2:D="{""step"":2}")), 0)'],
    ['Дійшли до питання 3', '=IFERROR(COUNTUNIQUE(FILTER(' + E + 'C2:C, ' + E + 'B2:B="step_viewed", ' + E + 'D2:D="{""step"":3}")), 0)'],
    ['Завершили квіз (унікальні сесії)', '=IFERROR(COUNTUNIQUE(FILTER(' + E + 'C2:C, ' + E + 'B2:B="quiz_completed")), 0)'],
    ['Конверсія старт → завершення', '=IFERROR(B6/B2, 0)'],
    ['Переходи на акцію (усі кліки)', '=COUNTIF(' + E + 'B2:B, "promo_clicked")'],
    ['  з першого екрана', '=COUNTIFS(' + E + 'B2:B, "promo_clicked", ' + E + 'D2:D, "*intro*")'],
    ['  із шапки', '=COUNTIFS(' + E + 'B2:B, "promo_clicked", ' + E + 'D2:D, "*header*")'],
    ['  з результату, верх', '=COUNTIFS(' + E + 'B2:B, "promo_clicked", ' + E + 'D2:D, "*top*")'],
    ['  з результату, низ', '=COUNTIFS(' + E + 'B2:B, "promo_clicked", ' + E + 'D2:D, "*bottom*")'],
    ['Сесії з переходом на акцію', '=IFERROR(COUNTUNIQUE(FILTER(' + E + 'C2:C, ' + E + 'B2:B="promo_clicked")), 0)'],
    ['Переходи на лендинги курсів', '=COUNTIF(' + E + 'B2:B, "course_clicked")'],
    ['Пройшли ще раз', '=COUNTIF(' + E + 'B2:B, "quiz_restarted")'],
  ];
  sm.getRange(2, 1, sm.getMaxRows() - 1, 2).clearContent();
  sm.getRange(2, 1, rows.length, 2).setValues(rows);
  sm.getRange('B7').setNumberFormat('0%');
  sm.autoResizeColumn(1);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    var data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var at = data.at ? new Date(data.at) : new Date();
    var details = {};
    Object.keys(data).forEach(function (k) {
      if (['event', 'session_id', 'at', 'source'].indexOf(k) === -1) details[k] = data[k];
    });
    ss.getSheetByName(SHEETS.events).appendRow([at, cut_(data.event), cut_(data.session_id), cut_(JSON.stringify(details))]);
    if (data.event === 'quiz_completed') {
      ss.getSheetByName(SHEETS.results).appendRow([
        at, cut_(data.session_id), Number(data.duration_sec) || '',
        cut_(data.interests), cut_(data.occupation), cut_(data.skills),
        cut_((data.courses || []).join('; ')), cut_((data.more || []).join('; ')),
      ]);
    }
    return ContentService.createTextOutput('ok');
  } catch (err) {
    return ContentService.createTextOutput('error');
  } finally {
    lock.releaseLock();
  }
}

// Перевірка в браузері: адреса /exec має показати «Статистика квізу працює».
function doGet() {
  return ContentService.createTextOutput('Статистика квізу працює');
}

function sheet_(ss, name, header) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() === 0) sh.appendRow(header);
  return sh;
}

// Обрізаємо довгі значення й не даємо таблиці сприйняти текст як формулу
function cut_(v) {
  var s = String(v == null ? '' : v).slice(0, 1000);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}
