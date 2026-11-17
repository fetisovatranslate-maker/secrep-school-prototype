"use strict";
(() => {
  // src/stores/renderer.ts
  var renderFn = null;
  var scheduled = false;
  function setRenderFn(fn) {
    renderFn = fn;
  }
  function requestRender() {
    if (scheduled) {
      return;
    }
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      if (renderFn) {
        renderFn();
      }
    });
  }

  // src/util/text.ts
  var NBSP = " ";
  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => {
      const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
      return map[ch] ?? ch;
    });
  }
  function plural(n, one, few, many) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) {
      return one;
    }
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
      return few;
    }
    return many;
  }
  function initials(name) {
    return name.split(" ").filter(Boolean).slice(0, 2).map((word) => word[0] ?? "").join("");
  }

  // src/util/dateutil.ts
  var WEEK_DAYS = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];
  var MONTHS_SHORT = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  var DEMO_WEEK_START = new Date(2026, 8, 29);
  var DEMO_TODAY = addDays(DEMO_WEEK_START, 4);
  var DEMO_NOW = addMinutes(DEMO_TODAY, 9 * 60 + 30);
  function addDays(date, days) {
    const result = new Date(date.getTime());
    result.setDate(result.getDate() + days);
    return result;
  }
  function addMinutes(date, minutes) {
    return new Date(date.getTime() + minutes * 6e4);
  }
  function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }
  function pad(value) {
    return String(value).padStart(2, "0");
  }
  function dateShort(date) {
    return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${String(date.getFullYear()).slice(2)}`;
  }
  function dateFull(date) {
    return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
  }
  function timeHm(date) {
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
  function dateTimeShort(date) {
    return `${dateShort(date)}, ${timeHm(date)}`;
  }
  function hoursOfDay(date) {
    return date.getHours() + date.getMinutes() / 60;
  }
  function minutesBetween(start2, end) {
    return Math.round((end.getTime() - start2.getTime()) / 6e4);
  }
  function weekLabel(weekStart2) {
    const weekEnd = addDays(weekStart2, 6);
    const from = `${weekStart2.getDate()}${NBSP}${MONTHS_SHORT[weekStart2.getMonth()] ?? ""}`;
    const to = `${weekEnd.getDate()}${NBSP}${MONTHS_SHORT[weekEnd.getMonth()] ?? ""} ${weekEnd.getFullYear()}`;
    return `${from} — ${to}`;
  }
  function parseDateTime(dateText, timeText) {
    const dateMatch = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(dateText.trim());
    const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(timeText.trim());
    if (!dateMatch || !timeMatch) {
      return null;
    }
    const [, day, month, year] = dateMatch;
    const [, hours, minutes] = timeMatch;
    return new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes));
  }

  // src/api_stores/mockSchoolData.ts
  function at(day, hours) {
    const date = addDays(DEMO_WEEK_START, day);
    date.setHours(Math.floor(hours), Math.round(hours % 1 * 60), 0, 0);
    return date;
  }
  function iso(date) {
    return date.toISOString();
  }
  function teacher(id, name, role, connected, colorId, subject, rate, commissionType, commissionValue, extra = {}) {
    return {
      id,
      name,
      role,
      connected,
      invited: connected,
      email: connected ? `teacher${id}@example.com` : null,
      hasTgBot: false,
      phone: null,
      telegram: null,
      source: null,
      comment: null,
      subject,
      colorId,
      rate,
      rateMinutes: 60,
      currencyCode: "RUB",
      commissionType,
      commissionValue,
      canAddStudents: true,
      canAddLessons: false,
      paidOut: 0,
      archived: false,
      ...extra
    };
  }
  function student(id, name, teacherIds2, balance, pkg, connected) {
    return {
      id,
      name,
      connected,
      email: connected ? `student${id}@example.com` : null,
      phone: null,
      telegram: null,
      source: null,
      comment: null,
      balance,
      price: 2e3,
      priceMinutes: 60,
      currencyCode: "RUB",
      teacherLinks: teacherIds2.map((teacherId2) => ({ teacherId: teacherId2, price: 2e3 })),
      packages: pkg ? [{ name: ["Разговорный", "Голден", "Интенсив"][id % 3] ?? "Абонемент", used: pkg[0], total: pkg[1], validFrom: iso(at(-14, 0)), validTo: iso(at(77, 0)) }] : [],
      archived: false
    };
  }
  var db = {
    school: { name: "Демо школа", tariffName: "Начальная школа", teachersLimit: 5 },
    teachers: [
      teacher(1, "Преподаватель 01", "teacher", true, "lavender", "Английский", 1e3, "percent", 10, { email: "teacher1@example.com" }),
      teacher(2, "Преподаватель 02", "teacher", true, "pink", "Английский", 1200, "percent", 15, { hasTgBot: true, canAddLessons: true }),
      teacher(3, "Преподаватель 03", "teacher", false, "yellow", "Испанский", 900, "fixed", 200, { canAddStudents: false }),
      teacher(4, "Администратор 01", "admin", false, "magenta", "Итальянский", 1500, "percent", 10, { canAddLessons: true })
    ],
    students: [
      student(101, "Ученик 01", [1, 2], 2500, [6, 12], true),
      student(102, "Ученик 02", [1, 4], -500, [5, 10], true),
      student(103, "Ученик 03", [2], -1500, [4, 10], true),
      student(104, "Ученик 04", [2], 0, [3, 10], false),
      student(105, "Ученик 05", [], 0, null, true),
      student(106, "Ученик 06", [2], 3000, [9, 10], true),
      student(107, "Ученик 07", [1], 500, [6, 10], true),
      student(108, "Ученик 08", [1, 3], 1000, null, false),
      student(109, "Ученик 09", [3], 0, [2, 8], true),
      student(110, "Ученик 10", [], 0, null, false),
      student(111, "Ученик 11", [], 0, null, false),
      student(112, "Ученик 12", [], 0, null, false),
      student(113, "Ученик 13", [4], 750, [1, 4], false)
    ],
    groups: [
      { id: 201, name: "Английский 101", teacherId: 1, members: [{ studentId: 103, lessonsBalance: 10 }, { studentId: 110, lessonsBalance: 5 }, { studentId: 112, lessonsBalance: 0 }, { studentId: 105, lessonsBalance: -1 }, { studentId: 111, lessonsBalance: 3 }] },
      { id: 202, name: "Испанский 101", teacherId: 1, members: [{ studentId: 108, lessonsBalance: 4 }, { studentId: 109, lessonsBalance: 2 }, { studentId: 110, lessonsBalance: 6 }] },
      { id: 203, name: "Итальянский 101", teacherId: 1, members: [{ studentId: 113, lessonsBalance: 3 }, { studentId: 102, lessonsBalance: 1 }] }
    ],
    lessons: [],
    deals: [
      { id: 401, title: "Заплатить всем зарплаты", startMoment: iso(at(2, 8)), endMoment: iso(at(2, 9)), colorId: "peach", done: false },
      { id: 402, title: "Заплатить за аренду", startMoment: iso(at(2, 10)), endMoment: iso(at(2, 11)), colorId: "yellow", done: false },
      { id: 403, title: "Передать материалы преподавателю", startMoment: iso(at(4, 9)), endMoment: iso(at(4, 10)), colorId: "pink", done: true },
      { id: 404, title: "Оплатить услуги преподавателя", startMoment: iso(at(4, 9)), endMoment: iso(at(4, 10)), colorId: "magenta", done: false },
      { id: 405, title: "Оплатить налоги", startMoment: iso(at(4, 11)), endMoment: iso(at(4, 12)), colorId: "lavender", done: false },
      { id: 406, title: "Семинар по технике преподавания", startMoment: iso(at(1, 12)), endMoment: iso(at(1, 13)), colorId: "sky", done: false }
    ],
    windows: [],
    history: /* @__PURE__ */ new Map(),
    nextId: 1e3
  };
  var LESSONS = [
    [0, 8, 1, 2, 101, true],
    [0, 8, 1, 1, 107, true],
    [0, 10, 1, 1, 102, true],
    [0, 10, 0.6, 2, 103, true],
    [0, 13, 0.5, 2, 104, true],
    [0, 13, 0.5, 4, 113, true],
    [0, 13.5, 0.5, 3, 109, true],
    [0, 15, 1, 1, 202, true],
    [1, 9.5, 0.5, 1, 108, true],
    [1, 9, 1, 2, 106, true],
    [1, 9, 0.5, 4, 102, true],
    [1, 12, 1, 3, 109, true],
    [2, 8, 0.7, 2, 101, true],
    [2, 8, 1, 1, 107, true],
    [2, 10, 0.5, 2, 103, true],
    [2, 10.5, 0.5, 3, 108, true],
    [2, 13, 1, 2, 104, true],
    [2, 13, 1, 4, 113, true],
    [2, 14, 1, 3, 109, true],
    [3, 10, 0.85, 2, 106, true],
    [3, 10, 0.5, 1, 101, true],
    [3, 11, 1, 1, 202, true],
    [3, 12, 1, 1, 102, true],
    [3, 12, 1, 4, 113, true],
    [4, 9, 1, 1, 108, false],
    [4, 9, 1, 2, 103, false],
    [4, 9, 1, 4, 102, false],
    [4, 14, 1, 3, 109, false],
    [4, 15, 1, 1, 201, false],
    [5, 10, 1, 1, 202, false],
    [5, 12, 1, 2, 101, false],
    [5, 12, 1, 1, 203, false],
    [5, 14, 1, 1, 107, false],
    [6, 8, 0.6, 2, 106, false],
    [6, 9, 0.5, 1, 101, false],
    [6, 10, 1, 2, 103, false],
    [6, 10, 1, 4, 113, false],
    [6, 11, 1, 3, 108, false],
    [6, 14, 0.5, 2, 104, false],
    [6, 14.5, 0.5, 4, 102, false]
  ];
  LESSONS.forEach(([day, hours, duration, teacherId2, whoId, completed], index) => {
    const isGroup = whoId > 200;
    db.lessons.push({
      id: 500 + index,
      teacherId: teacherId2,
      studentId: isGroup ? null : whoId,
      groupId: isGroup ? whoId : null,
      startMoment: iso(at(day, hours)),
      endMoment: iso(at(day, hours + duration)),
      completed,
      note: index === 1 ? "Разобрали неправильные глаголы, дома упражнения 4-6" : null
    });
  });
  var WINDOWS = [
    [1, 0, 9],
    [1, 0, 11],
    [1, 1, 8],
    [1, 1, 12],
    [1, 2, 13],
    [1, 3, 9],
    [1, 4, 10],
    [1, 5, 12],
    [1, 6, 9],
    [1, 6, 11],
    [2, 0, 9],
    [2, 0, 11],
    [2, 1, 8],
    [2, 1, 12],
    [2, 2, 10],
    [2, 2, 13],
    [2, 3, 9],
    [2, 4, 10],
    [2, 5, 10],
    [2, 5, 12],
    [2, 6, 9],
    [2, 6, 11],
    [3, 0, 15],
    [3, 1, 13],
    [3, 2, 10.5],
    [3, 4, 8],
    [3, 6, 9.5],
    [4, 2, 13],
    [4, 4, 8],
    [4, 6, 10.5]
  ];
  WINDOWS.forEach(([teacherId2, day, hours]) => {
    db.windows.push({ teacherId: teacherId2, startMoment: iso(at(day, hours)), endMoment: iso(at(day, hours + 1)) });
  });
  db.history.set(1, [
    { moment: iso(at(0, 14.5)), type: "lessonCompleted", studentId: 107, amount: 900, schoolIncome: 1100 },
    { moment: iso(at(-3, 14.5)), type: "payout", studentId: null, amount: 24500, schoolIncome: 0 },
    { moment: iso(at(-4, 14.5)), type: "lessonCompleted", studentId: 107, amount: 900, schoolIncome: 1100 },
    { moment: iso(at(-4, 12.2)), type: "lessonCancelled", studentId: 108, amount: 0, schoolIncome: 0 },
    { moment: iso(at(-5, 14.5)), type: "lessonCompleted", studentId: 101, amount: 900, schoolIncome: 1100 }
  ]);

  // src/api_stores/mockSchoolBackend.ts
  var ClientError = class extends Error {
  };
  function newId() {
    db.nextId += 1;
    return db.nextId;
  }
  function findTeacher(id) {
    const row2 = db.teachers.find((t) => t.id === id);
    if (!row2) {
      throw new ClientError("Учитель не найден");
    }
    return row2;
  }
  function findStudent(id) {
    const row2 = db.students.find((s) => s.id === id);
    if (!row2) {
      throw new ClientError("Ученик не найден");
    }
    return row2;
  }
  function commissionPerLesson(row2) {
    return row2.commissionType === "percent" ? Math.round(row2.rate * row2.commissionValue / 100) : row2.commissionValue;
  }
  function teacherStats(row2) {
    const periodStart = DEMO_WEEK_START;
    const lessonsCompleted = db.lessons.filter((l) => l.teacherId === row2.id && l.completed && new Date(l.startMoment) >= periodStart).length;
    const accrued = row2.rate * lessonsCompleted;
    const schoolCommission = commissionPerLesson(row2) * lessonsCompleted;
    return {
      lessonsCompleted,
      accrued,
      schoolCommission,
      toPay: Math.max(0, accrued - schoolCommission - row2.paidOut),
      periodStart: iso(periodStart),
      periodEnd: iso(addDays(periodStart, 6))
    };
  }
  function activeTeachersCount() {
    return db.teachers.filter((t) => !t.archived).length;
  }
  function requireText(value, field, maxLength) {
    const text = typeof value === "string" ? value.trim() : "";
    if (!text) {
      throw new ClientError(`Заполните поле «${field}»`);
    }
    if (text.length > maxLength) {
      throw new ClientError(`Поле «${field}» длиннее ${maxLength} символов`);
    }
    return text;
  }
  function optionalText(value) {
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }
  function fullNameOf(payload, field) {
    const firstName = requireText(payload.firstName, field, 100);
    const lastName = optionalText(payload.lastName) ?? "";
    if (lastName.length > 100) {
      throw new ClientError("Фамилия длиннее 100 символов");
    }
    return `${firstName} ${lastName}`.trim();
  }
  function num(payload, key) {
    const value = Number(payload[key]);
    if (!Number.isFinite(value)) {
      throw new ClientError("Введено некорректное значение");
    }
    return value;
  }
  function lessonsOverlap(teacherId2, start2, end, exceptId = 0) {
    return db.lessons.find((l) => l.id !== exceptId && l.teacherId === teacherId2 && new Date(l.startMoment) < end && new Date(l.endMoment) > start2);
  }
  var handlers = {
    "school/school_get": () => db.school,
    "school/school_create": (payload) => {
      db.school = {
        name: requireText(payload.name, "Название школы", 100),
        tariffName: String(payload.tariffName ?? "Начальная школа"),
        teachersLimit: num(payload, "teachersLimit")
      };
      return { success: true };
    },
    "school/teachers_get": () => db.teachers.map((row2) => ({ ...row2, stats: teacherStats(row2) })),
    "school/teacher_add": (payload) => {
      if (activeTeachersCount() >= db.school.teachersLimit) {
        throw new ClientError("На тарифе не осталось свободных мест");
      }
      const id = newId();
      db.teachers.push({
        ...teacher(id, fullNameOf(payload, "Имя учителя"), payload.role === "admin" ? "admin" : "teacher", false, payload.colorId || "blue", optionalText(payload.subject) ?? "", num(payload, "rate"), payload.commissionType === "fixed" ? "fixed" : "percent", num(payload, "commissionValue")),
        rateMinutes: num(payload, "rateMinutes"),
        currencyCode: requireText(payload.currencyCode, "Валюта", 3),
        canAddStudents: Boolean(payload.canAddStudents),
        canAddLessons: Boolean(payload.canAddLessons),
        phone: optionalText(payload.phone),
        telegram: optionalText(payload.telegram),
        source: optionalText(payload.source),
        comment: optionalText(payload.comment)
      });
      db.windows = db.windows.filter((w) => w.teacherId !== id);
      return { id };
    },
    "school/teacher_edit": (payload) => {
      const row2 = findTeacher(num(payload, "id"));
      row2.name = requireText(payload.name, "Имя учителя", 100);
      row2.role = payload.role === "admin" ? "admin" : "teacher";
      row2.canAddStudents = Boolean(payload.canAddStudents);
      row2.canAddLessons = Boolean(payload.canAddLessons);
      row2.phone = optionalText(payload.phone);
      row2.telegram = optionalText(payload.telegram);
      row2.source = optionalText(payload.source);
      row2.comment = optionalText(payload.comment);
      return { success: true };
    },
    "school/teacher_rate_edit": (payload) => {
      const row2 = findTeacher(num(payload, "id"));
      row2.rate = num(payload, "rate");
      row2.rateMinutes = num(payload, "rateMinutes");
      row2.currencyCode = requireText(payload.currencyCode, "Валюта", 3);
      row2.commissionType = payload.commissionType === "fixed" ? "fixed" : "percent";
      row2.commissionValue = num(payload, "commissionValue");
      return { success: true };
    },
    "school/teacher_invite_link_get": (payload) => {
      const row2 = findTeacher(num(payload, "id"));
      row2.invited = true;
      return { link: `https://secrep.ru/invite/${row2.id}${Date.now().toString(36)}` };
    },
    "school/teacher_payout_add": (payload) => {
      const row2 = findTeacher(num(payload, "teacherId"));
      const amount = num(payload, "amount");
      if (amount <= 0) {
        throw new ClientError("Сумма выплаты должна быть больше нуля");
      }
      row2.paidOut += amount;
      const list = db.history.get(row2.id) ?? [];
      list.unshift({ moment: iso(/* @__PURE__ */ new Date()), type: "payout", studentId: null, amount, schoolIncome: 0 });
      db.history.set(row2.id, list);
      return { success: true };
    },
    "school/teacher_history_get": (payload) => db.history.get(num(payload, "id")) ?? [],
    "school/teacher_archive": (payload) => {
      findTeacher(num(payload, "id")).archived = true;
      return { success: true };
    },
    "school/teacher_restore": (payload) => {
      if (activeTeachersCount() >= db.school.teachersLimit) {
        throw new ClientError("На тарифе не осталось свободных мест");
      }
      findTeacher(num(payload, "id")).archived = false;
      return { success: true };
    },
    "school/teacher_students_set": (payload) => {
      const teacherId2 = num(payload, "teacherId");
      const ids = Array.isArray(payload.studentIds) ? payload.studentIds.map(Number) : [];
      db.students.forEach((row2) => {
        const linked = row2.teacherLinks.some((l) => l.teacherId === teacherId2);
        if (ids.includes(row2.id) && !linked) {
          row2.teacherLinks.push({ teacherId: teacherId2, price: row2.price });
        }
        if (!ids.includes(row2.id) && linked) {
          row2.teacherLinks = row2.teacherLinks.filter((l) => l.teacherId !== teacherId2);
        }
      });
      return { success: true };
    },
    "school/teacher_windows_set": (payload) => {
      const teacherId2 = num(payload, "teacherId");
      const list = Array.isArray(payload.windows) ? payload.windows : [];
      db.windows = db.windows.filter((w) => w.teacherId !== teacherId2).concat(list.map((w) => ({ teacherId: teacherId2, startMoment: w.startMoment, endMoment: w.endMoment })));
      return { success: true };
    },
    "school/students_get": () => db.students,
    "school/student_add": (payload) => {
      const name = fullNameOf(payload, "Имя ученика");
      const price = num(payload, "price");
      const id = newId();
      const teacherIds2 = Array.isArray(payload.teacherIds) ? payload.teacherIds.map(Number) : [];
      db.students.push({ ...student(id, name, teacherIds2, 0, null, false), price, priceMinutes: num(payload, "priceMinutes"), phone: optionalText(payload.phone), telegram: optionalText(payload.telegram), source: optionalText(payload.source), comment: optionalText(payload.comment), teacherLinks: teacherIds2.map((teacherId2) => ({ teacherId: teacherId2, price })) });
      return { id };
    },
    "school/student_edit": (payload) => {
      const row2 = findStudent(num(payload, "id"));
      row2.name = requireText(payload.name, "Имя ученика", 100);
      row2.phone = optionalText(payload.phone);
      row2.telegram = optionalText(payload.telegram);
      row2.source = optionalText(payload.source);
      row2.comment = optionalText(payload.comment);
      return { success: true };
    },
    "school/student_archive": (payload) => {
      findStudent(num(payload, "id")).archived = true;
      return { success: true };
    },
    "school/student_restore": (payload) => {
      findStudent(num(payload, "id")).archived = false;
      return { success: true };
    },
    "school/student_teachers_set": (payload) => {
      const row2 = findStudent(num(payload, "studentId"));
      const ids = Array.isArray(payload.teacherIds) ? payload.teacherIds.map(Number) : [];
      row2.teacherLinks = ids.map((teacherId2) => row2.teacherLinks.find((l) => l.teacherId === teacherId2) ?? { teacherId: teacherId2, price: row2.price });
      return { success: true };
    },
    "school/student_teacher_link_edit": (payload) => {
      const row2 = findStudent(num(payload, "studentId"));
      const link = row2.teacherLinks.find((l) => l.teacherId === num(payload, "teacherId"));
      if (!link) {
        throw new ClientError("Связь с учителем не найдена");
      }
      link.price = num(payload, "price");
      return { success: true };
    },
    "school/student_teacher_link_remove": (payload) => {
      const row2 = findStudent(num(payload, "studentId"));
      row2.teacherLinks = row2.teacherLinks.filter((l) => l.teacherId !== num(payload, "teacherId"));
      return { success: true };
    },
    "school/student_payment_reminder_send": (payload) => {
      const row2 = findStudent(num(payload, "studentId"));
      if (!row2.connected) {
        throw new ClientError(`${row2.name} пока не подключен к SecRep, напоминание не отправить`);
      }
      return { success: true };
    },
    "school/groups_get": () => db.groups.map((g) => ({ ...g, nextLessonMoment: db.lessons.filter((l) => l.groupId === g.id && !l.completed).map((l) => l.startMoment).sort()[0] ?? null })),
    "school/lessons_get": () => db.lessons,
    "school/lesson_add": (payload) => {
      const start2 = new Date(String(payload.startMoment));
      const end = new Date(String(payload.endMoment));
      const teacherId2 = num(payload, "teacherId");
      if (!(end > start2)) {
        throw new ClientError("Конец занятия должен быть позже начала");
      }
      const clash = lessonsOverlap(teacherId2, start2, end);
      if (clash) {
        throw new ClientError("У учителя уже есть занятие в это время");
      }
      const studentId = payload.studentId ? num(payload, "studentId") : null;
      const groupId = payload.groupId ? num(payload, "groupId") : null;
      if (!studentId && !groupId) {
        throw new ClientError("Выберите ученика или группу");
      }
      const payType = payload.payType;
      const weeks = payload.repeatWeekly ? 9 : 1;
      const ids = [];
      for (let week = 0; week < weeks; week += 1) {
        const id = newId();
        ids.push(id);
        db.lessons.push({ id, teacherId: teacherId2, studentId, groupId, startMoment: iso(addDays(start2, week * 7)), endMoment: iso(addDays(end, week * 7)), completed: false, note: null });
      }
      if (studentId && payType === "subscription") {
        const row2 = findStudent(studentId);
        if (!row2.teacherLinks.some((l) => l.teacherId === teacherId2)) {
          row2.teacherLinks.push({ teacherId: teacherId2, price: row2.price });
        }
      }
      return { id: ids[0] ?? 0 };
    },
    "school/lesson_edit": (payload) => {
      const row2 = db.lessons.find((l) => l.id === num(payload, "id"));
      if (!row2) {
        throw new ClientError("Занятие не найдено");
      }
      const start2 = new Date(String(payload.startMoment));
      const end = new Date(String(payload.endMoment));
      const teacherId2 = num(payload, "teacherId");
      if (!(end > start2)) {
        throw new ClientError("Конец занятия должен быть позже начала");
      }
      if (lessonsOverlap(teacherId2, start2, end, row2.id)) {
        throw new ClientError("У учителя уже есть занятие в это время");
      }
      const studentId = payload.studentId ? num(payload, "studentId") : null;
      const groupId = payload.groupId ? num(payload, "groupId") : null;
      if (!studentId && !groupId) {
        throw new ClientError("Выберите ученика или группу");
      }
      Object.assign(row2, { teacherId: teacherId2, studentId, groupId, startMoment: iso(start2), endMoment: iso(end) });
      return { id: row2.id };
    },
    "school/lesson_delete": (payload) => {
      const id = num(payload, "id");
      if (!db.lessons.some((l) => l.id === id)) {
        throw new ClientError("Занятие не найдено");
      }
      db.lessons = db.lessons.filter((l) => l.id !== id);
      return { success: true };
    },
    "school/lesson_note_set": (payload) => {
      const row2 = db.lessons.find((l) => l.id === num(payload, "lessonId"));
      if (!row2) {
        throw new ClientError("Занятие не найдено");
      }
      row2.note = optionalText(payload.text);
      return { success: true };
    },
    "school/deals_get": () => db.deals,
    "school/deal_add": (payload) => {
      const id = newId();
      db.deals.push({ id, title: requireText(payload.title, "Название", 100), startMoment: String(payload.startMoment), endMoment: String(payload.endMoment), colorId: payload.colorId || "lavender", done: false });
      return { id };
    },
    "school/deal_done_set": (payload) => {
      const row2 = db.deals.find((d) => d.id === num(payload, "id"));
      if (!row2) {
        throw new ClientError("Дело не найдено");
      }
      row2.done = Boolean(payload.done);
      return { success: true };
    },
    "school/windows_get": () => db.windows
  };
  async function mockHandle(action, payload) {
    const handler = handlers[action];
    if (!handler) {
      throw new Error(`Нет ручки ${action}`);
    }
    return JSON.parse(JSON.stringify(handler(payload)));
  }

  // src/stores/toasts.ts
  var hideTimer;
  function show(text, kind) {
    let el = document.getElementById("toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      document.body.appendChild(el);
    }
    el.className = `toast ${kind}`;
    el.innerHTML = esc(text);
    el.hidden = false;
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => {
      if (el) {
        el.hidden = true;
      }
    }, 2800);
  }
  function showSuccess(text) {
    show(text, "success");
  }
  function showError(text) {
    show(text, "error");
  }
  function showInfo(text) {
    show(text, "info");
  }
  var NOT_IN_MOCKUPS = "Этого экрана пока нет в макетах";

  // src/util/req.ts
  async function api(action, payload = {}) {
    try {
      const resp = await mockHandle(action, payload);
      return { success: true, resp };
    } catch (er) {
      if (er instanceof ClientError) {
        showError(er.message);
      } else {
        showError("Что-то пошло не так, попробуйте еще раз");
        console.error(er);
      }
      return { success: false, resp: null };
    }
  }

  // src/api_stores/newLoader.ts
  function newLoader(options) {
    let value = { state: "initialized", loadWasInvoked: false };
    let requestCounter = 0;
    async function load(request) {
      requestCounter += 1;
      const myRequest = requestCounter;
      value = { ...value, state: "loading", loadWasInvoked: true };
      const { success, resp } = await api(options.action, request);
      if (myRequest !== requestCounter) {
        return;
      }
      if (!success || resp === null) {
        value = { ...value, state: "error" };
        requestRender();
        return;
      }
      const data = options.responseConversion ? options.responseConversion(resp) : resp;
      value = { state: "loaded", data, request, loadWasInvoked: true };
      requestRender();
    }
    function updateData(updater) {
      if (value.data === void 0) {
        return;
      }
      value = { ...value, data: updater(value.data) };
      requestRender();
    }
    return { get: () => value, load, updateData };
  }
  function loadedData(store) {
    if (store.state !== "loaded" || store.data === void 0) {
      return null;
    }
    return store.data;
  }

  // src/api_stores/deals.ts
  var dealsInternal = newLoader({
    action: "school/deals_get",
    responseConversion(resp) {
      return resp.map((d) => ({ ...d, startMoment: new Date(d.startMoment), endMoment: new Date(d.endMoment) }));
    }
  });
  var deals = { get: dealsInternal.get };
  function loadDeals() {
    return dealsInternal.load({});
  }
  function dealsData() {
    return loadedData(dealsInternal.get()) ?? [];
  }

  // src/api_stores/groups.ts
  var groupsInternal = newLoader({
    action: "school/groups_get",
    responseConversion(resp) {
      return resp.map((g) => ({ ...g, nextLessonMoment: g.nextLessonMoment ? new Date(g.nextLessonMoment) : null }));
    }
  });
  var groups = { get: groupsInternal.get };
  function loadGroups() {
    return groupsInternal.load({});
  }
  function groupsData() {
    return loadedData(groupsInternal.get()) ?? [];
  }
  function groupById(id) {
    return groupsData().find((g) => g.id === id) ?? null;
  }

  // src/api_stores/lessons.ts
  var lessonsInternal = newLoader({
    action: "school/lessons_get",
    responseConversion(resp) {
      return resp.map((l) => ({ ...l, startMoment: new Date(l.startMoment), endMoment: new Date(l.endMoment) }));
    }
  });
  var lessons = { get: lessonsInternal.get, updateData: lessonsInternal.updateData };
  function loadLessons() {
    return lessonsInternal.load({});
  }
  function lessonsData() {
    return loadedData(lessonsInternal.get()) ?? [];
  }
  function nextLessonsOfTeacher(teacherId2, count) {
    return lessonsData().filter((l) => l.teacherId === teacherId2 && !l.completed).sort((a, b) => a.startMoment.getTime() - b.startMoment.getTime()).slice(0, count);
  }

  // src/api_stores/school.ts
  var schoolInternal = newLoader({ action: "school/school_get" });
  var school = { get: schoolInternal.get };
  function loadSchool() {
    return schoolInternal.load({});
  }
  function schoolData() {
    return loadedData(schoolInternal.get());
  }

  // src/api_stores/students.ts
  var studentsInternal = newLoader({
    action: "school/students_get",
    responseConversion(resp) {
      return resp.map((s) => ({ ...s, packages: s.packages.map((p) => ({ ...p, validFrom: new Date(p.validFrom), validTo: new Date(p.validTo) })) }));
    }
  });
  var students = { get: studentsInternal.get, updateData: studentsInternal.updateData };
  function loadStudents() {
    return studentsInternal.load({});
  }
  function studentsData() {
    return loadedData(studentsInternal.get()) ?? [];
  }
  function studentById(id) {
    return studentsData().find((s) => s.id === id) ?? null;
  }
  function teacherStudents(teacherId2) {
    return studentsData().filter((s) => !s.archived && s.teacherLinks.some((l) => l.teacherId === teacherId2));
  }

  // src/api_stores/teacherWindows.ts
  var windowsInternal = newLoader({
    action: "school/windows_get",
    responseConversion(resp) {
      return resp.map((w) => ({ ...w, startMoment: new Date(w.startMoment), endMoment: new Date(w.endMoment) }));
    }
  });
  var teacherWindows = { get: windowsInternal.get };
  function loadTeacherWindows() {
    return windowsInternal.load({});
  }
  function teacherWindowsData() {
    return loadedData(windowsInternal.get()) ?? [];
  }

  // src/api_stores/teachers.ts
  var teachersInternal = newLoader({
    action: "school/teachers_get",
    responseConversion(resp) {
      return resp.map((t) => ({ ...t, stats: { ...t.stats, periodStart: new Date(t.stats.periodStart), periodEnd: new Date(t.stats.periodEnd) } }));
    }
  });
  var teachers = { get: teachersInternal.get, updateData: teachersInternal.updateData };
  function loadTeachers() {
    return teachersInternal.load({});
  }
  function teachersData() {
    return loadedData(teachersInternal.get()) ?? [];
  }
  function teacherById(id) {
    return teachersData().find((t) => t.id === id) ?? null;
  }
  function activeTeachers() {
    return teachersData().filter((t) => !t.archived);
  }

  // src/api_stores/overlayManager.ts
  var OVERLAY_BASE_Z = 1e4;
  var OVERLAY_STEP_Z = 10;
  var stack = [];
  function openedPanels() {
    return stack;
  }
  function openPanel(key, render4) {
    stack = [...stack, { key, render: render4, zIndex: OVERLAY_BASE_Z + OVERLAY_STEP_Z * (stack.length + 1) }];
    requestRender();
  }
  function replacePanel(key, render4) {
    const top = stack[stack.length - 1];
    if (!top) {
      openPanel(key, render4);
      return;
    }
    stack = [...stack.slice(0, -1), { key, render: render4, zIndex: top.zIndex }];
    requestRender();
  }
  function closeTopPanel() {
    stack = stack.slice(0, -1);
    requestRender();
  }
  function closeAllPanels() {
    stack = [];
    requestRender();
  }

  // src/util/fireAndForget.ts
  function fireAndForget(promise) {
    promise.catch((er) => {
      console.error(er);
    });
  }

  // src/util/actions.ts
  var clickHandlers = /* @__PURE__ */ new Map();
  var inputHandlers = /* @__PURE__ */ new Map();
  var afterInputHooks = [];
  function afterAnyInput(hook) {
    afterInputHooks.push(hook);
  }
  function onClick(name, handler) {
    clickHandlers.set(name, handler);
  }
  function onInput(name, handler) {
    inputHandlers.set(name, handler);
  }
  function dataOf(el, key) {
    return el.dataset[key] ?? "";
  }
  async function runSecure(el, handler, event) {
    if (el.dataset.secure !== "1") {
      await handler(el, event);
      return;
    }
    if (el.getAttribute("aria-busy") === "true") {
      return;
    }
    el.setAttribute("aria-busy", "true");
    try {
      await handler(el, event);
    } finally {
      el.removeAttribute("aria-busy");
    }
  }
  function initActions(root) {
    root.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const el = target.closest("[data-click]");
      if (!el || el.hasAttribute("disabled")) {
        return;
      }
      const handler = clickHandlers.get(dataOf(el, "click"));
      if (!handler) {
        return;
      }
      if (el.tagName === "A" || el.dataset.prevent === "1") {
        event.preventDefault();
      }
      event.stopPropagation();
      fireAndForget(runSecure(el, handler, event));
    });
    root.addEventListener("input", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const name = target.dataset.input;
      if (!name) {
        return;
      }
      const handler = inputHandlers.get(name);
      if (handler) {
        fireAndForget(Promise.resolve(handler(target, event)));
      }
      afterInputHooks.forEach((hook) => hook());
    });
  }

  // src/components/svgIcons.ts
  function svg(viewBox, inner, options = {}) {
    const size = options.size ?? viewBox;
    return `<svg class="svg-icon ${options.className ?? ""}" width="${size}" height="${size}" viewBox="0 0 ${viewBox} ${viewBox}" fill="none" aria-hidden="true">${inner}</svg>`;
  }
  function plusSvg(options) {
    return svg(40, `<path d="M27 19H21V13C21 12.7348 20.8946 12.4804 20.7071 12.2929C20.5196 12.1054 20.2652 12 20 12C19.7348 12 19.4804 12.1054 19.2929 12.2929C19.1054 12.4804 19 12.7348 19 13V19H13C12.7348 19 12.4804 19.1054 12.2929 19.2929C12.1054 19.4804 12 19.7348 12 20C12 20.2652 12.1054 20.5196 12.2929 20.7071C12.4804 20.8946 12.7348 21 13 21H19V27C19 27.2652 19.1054 27.5196 19.2929 27.7071C19.4804 27.8946 19.7348 28 20 28C20.2652 28 20.5196 27.8946 20.7071 27.7071C20.8946 27.5196 21 27.2652 21 27V21H27C27.2652 21 27.5196 20.8946 27.7071 20.7071C27.8946 20.5196 28 20.2652 28 20C28 19.7348 27.8946 19.4804 27.7071 19.2929C27.5196 19.1054 27.2652 19 27 19Z" fill="currentColor"/>`, options);
  }
  function plusSmallSvg(options) {
    return svg(18, `<path d="M16 8H10V2C10 1.73478 9.89464 1.48043 9.70711 1.29289C9.51957 1.10536 9.26522 1 9 1C8.73478 1 8.48043 1.10536 8.29289 1.29289C8.10536 1.48043 8 1.73478 8 2V8H2C1.73478 8 1.48043 8.10536 1.29289 8.29289C1.10536 8.48043 1 8.73478 1 9C1 9.26522 1.10536 9.51957 1.29289 9.70711C1.48043 9.89464 1.73478 10 2 10H8V16C8 16.2652 8.10536 16.5196 8.29289 16.7071C8.48043 16.8946 8.73478 17 9 17C9.26522 17 9.51957 16.8946 9.70711 16.7071C9.89464 16.5196 10 16.2652 10 16V10H16C16.2652 10 16.5196 9.89464 16.7071 9.70711C16.8946 9.51957 17 9.26522 17 9C17 8.73478 16.8946 8.48043 16.7071 8.29289C16.5196 8.10536 16.2652 8 16 8Z" fill="currentColor"/>`, options);
  }
  function crossSvg(options) {
    return svg(40, `<path d="M16 16L24 24M16 24L24 16" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>`, options);
  }
  function bellSvg(options) {
    return svg(40, `<path d="M17.0001 29H23.0001M26.0001 16.6C26.0001 15.1148 25.3679 13.6904 24.2427 12.6402C23.1175 11.59 21.5914 11 20.0001 11C18.4088 11 16.8826 11.59 15.7574 12.6402C14.6322 13.6904 14.0001 15.1148 14.0001 16.6C14.0001 19.2862 13.3239 21.1835 12.5275 22.4866C11.7562 23.7486 11.3706 24.3797 11.3849 24.5436C11.401 24.7277 11.4374 24.7925 11.5861 24.9023C11.7185 25 12.3477 25 13.6061 25H26.394C27.6524 25 28.2817 25 28.414 24.9023C28.5628 24.7925 28.5991 24.7277 28.6152 24.5436C28.6296 24.3797 28.2439 23.7486 27.4726 22.4866C26.6763 21.1835 26.0001 19.2862 26.0001 16.6Z" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>`, options);
  }
  function bellSmallSvg(options) {
    return svg(18, `<path d="M6.75 15.75H11.25M13.5 6.45C13.5 5.33609 13.0259 4.2678 12.182 3.48015C11.3381 2.6925 10.1935 2.25 9 2.25C7.80653 2.25 6.66193 2.6925 5.81802 3.48015C4.97411 4.2678 4.5 5.33609 4.5 6.45C4.5 8.46466 3.99285 9.88765 3.39559 10.8649C2.81712 11.8115 2.52788 12.2847 2.53863 12.4077C2.55071 12.5458 2.57797 12.5944 2.68952 12.6767C2.78881 12.75 3.26072 12.75 4.20454 12.75H13.7955C14.7393 12.75 15.2112 12.75 15.3105 12.6767C15.422 12.5944 15.4493 12.5458 15.4614 12.4077C15.4721 12.2847 15.1829 11.8115 14.6044 10.8649C14.0071 9.88766 13.5 8.46466 13.5 6.45Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`, options);
  }
  function chevronDownSvg(options) {
    return svg(40, `<path d="M14 18L21 24L28 18" stroke="var(--icons-secondary)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`, options);
  }
  function chevronLeftSvg(options) {
    return svg(40, `<path d="M23 14L17 20L23 26" stroke="var(--icons-secondary)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`, options);
  }
  function chevronRightSvg(options) {
    return svg(40, `<path d="M17 14L23 20L17 26" stroke="var(--icons-secondary)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`, options);
  }
  function gearSvg(options) {
    return svg(40, `<path d="M19.5904 11C18.5502 11 17.6837 11.7973 17.5973 12.8339L17.5221 13.7357C16.9067 13.9834 16.3361 14.3192 15.8261 14.7275L14.9956 14.336C14.0547 13.8925 12.9309 14.2443 12.4108 15.1451L12.0011 15.8548C11.481 16.7556 11.7382 17.9047 12.5927 18.4978L13.3601 19.0305C13.3146 19.3471 13.291 19.6708 13.291 20C13.291 20.3292 13.3146 20.6529 13.3601 20.9695L12.5927 21.5021C11.7382 22.0952 11.481 23.2443 12.0011 24.1451L12.4108 24.8548C12.9309 25.7556 14.0547 26.1074 14.9956 25.6639L15.826 25.2725C16.336 25.6808 16.9066 26.0166 17.5221 26.2643L17.5973 27.1661C17.6837 28.2027 18.5502 29 19.5904 29H20.4098C21.45 29 22.3165 28.2027 22.4029 27.1661L22.4753 26.2977C23.1109 26.0519 23.7 25.7126 24.2257 25.2967L25.0048 25.6639C25.9457 26.1074 27.0694 25.7556 27.5895 24.8548L27.9993 24.1451C28.5193 23.2443 28.2621 22.0952 27.4076 21.5021L26.7143 21.0209C26.7648 20.688 26.791 20.347 26.791 20C26.791 19.6529 26.7648 19.312 26.7143 18.979L27.4076 18.4978C28.2621 17.9047 28.5193 16.7556 27.9993 15.8548L27.5895 15.1451C27.0694 14.2443 25.9457 13.8925 25.0048 14.336L24.2256 14.7032C23.6999 14.2874 23.1109 13.9481 22.4753 13.7023L22.4029 12.8339C22.3165 11.7973 21.45 11 20.4098 11H19.5904Z" stroke="currentColor" stroke-width="1.5"/><path d="M23.0001 20C23.0001 21.6569 21.657 23 20.0001 23C18.3433 23 17.0001 21.6569 17.0001 20C17.0001 18.3431 18.3433 17 20.0001 17C21.657 17 23.0001 18.3431 23.0001 20Z" stroke="currentColor" stroke-width="1.5"/>`, options);
  }
  function goToSvg(options) {
    return svg(40, `<path d="M14.4648 23.4054C14.1364 23.7009 14.1098 24.2068 14.4054 24.5352C14.7009 24.8636 15.2068 24.8902 15.5352 24.5946L14.4648 23.4054ZM25.7989 15.042C25.8221 14.6008 25.4833 14.2243 25.042 14.2011L17.852 13.8227C17.4108 13.7995 17.0343 14.1383 17.0111 14.5795C16.9878 15.0207 17.3267 15.3972 17.7679 15.4205L24.1591 15.7568L23.8227 22.148C23.7995 22.5892 24.1383 22.9657 24.5795 22.9889C25.0207 23.0122 25.3972 22.6733 25.4205 22.2321L25.7989 15.042ZM15.5352 24.5946L25.5352 15.5946L24.4648 14.4054L14.4648 23.4054L15.5352 24.5946Z" fill="currentColor"/>`, options);
  }
  function checkSvg(options) {
    return svg(40, `<path d="M12 20.1111L16.9231 25L28 14" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>`, options);
  }
  function trashSvg(options) {
    return svg(40, `<path fill-rule="evenodd" clip-rule="evenodd" d="M13.3098 15.5037C13.5033 15.4905 13.694 15.5567 13.84 15.6875C13.986 15.8184 14.0753 16.0034 14.0883 16.2017L14.5371 23.1017C14.6249 24.4487 14.6873 25.3867 14.8239 26.0917C14.9576 26.7767 15.1429 27.1387 15.4093 27.3947C15.6766 27.6507 16.0415 27.8167 16.7166 27.9067C17.4132 27.9997 18.3302 28.0017 19.6473 28.0017H20.4024C21.7195 28.0017 22.6366 27.9997 23.3332 27.9067C24.0083 27.8167 24.3732 27.6507 24.6405 27.3947C24.9068 27.1387 25.0922 26.7767 25.2259 26.0927C25.3624 25.3867 25.4249 24.4487 25.5127 23.1007L25.9615 16.2017C25.9679 16.1034 25.9931 16.0074 26.0357 15.9191C26.0783 15.8308 26.1375 15.7519 26.2098 15.6871C26.2822 15.6222 26.3663 15.5726 26.4573 15.5411C26.5484 15.5095 26.6446 15.4966 26.7405 15.5032C26.8364 15.5098 26.9301 15.5356 27.0162 15.5793C27.1024 15.623 27.1793 15.6836 27.2426 15.7578C27.3058 15.8319 27.3543 15.9181 27.385 16.0115C27.4158 16.1048 27.4284 16.2034 27.422 16.3017L26.9693 23.2537C26.8863 24.5357 26.819 25.5727 26.661 26.3857C26.4961 27.2307 26.2171 27.9367 25.6395 28.4897C25.0629 29.0437 24.3566 29.2827 23.5224 29.3937C22.7205 29.5017 21.7078 29.5017 20.4541 29.5017H19.5956C18.342 29.5017 17.3293 29.5017 16.5273 29.3937C15.6932 29.2827 14.9868 29.0437 14.4102 28.4897C13.8327 27.9367 13.5537 27.2297 13.3888 26.3857C13.2307 25.5717 13.1644 24.5357 13.0805 23.2537L12.6278 16.3017C12.6214 16.2034 12.634 16.1048 12.6649 16.0115C12.6957 15.9182 12.7442 15.832 12.8075 15.7579C12.8708 15.6838 12.9478 15.6232 13.034 15.5796C13.1201 15.536 13.2139 15.5102 13.3098 15.5037ZM18.42 10.0017H18.3751C18.1644 10.0017 17.98 10.0017 17.8063 10.0297C17.4681 10.0853 17.1472 10.2212 16.8694 10.4266C16.5915 10.632 16.3645 10.9012 16.2063 11.2127C16.1244 11.3727 16.0668 11.5517 16.0005 11.7567L15.9859 11.8007L15.8912 12.0907C15.8165 12.3629 15.654 12.601 15.4302 12.7663C15.2064 12.9316 14.9345 13.0142 14.659 13.0007H11.7322C11.538 13.0007 11.3518 13.0798 11.2145 13.2205C11.0771 13.3613 11 13.5522 11 13.7512C11 13.9503 11.0771 14.1411 11.2145 14.2819C11.3518 14.4226 11.538 14.5017 11.7322 14.5017H28.3185C28.5126 14.5017 28.6987 14.4227 28.8359 14.282C28.9732 14.1414 29.0502 13.9506 29.0502 13.7517C29.0502 13.5528 28.9732 13.362 28.8359 13.2214C28.6987 13.0807 28.5126 13.0017 28.3185 13.0017H25.3029C25.0423 12.9953 24.7906 12.9035 24.5847 12.7397C24.3787 12.5759 24.2294 12.3488 24.1585 12.0917L24.0639 11.8007L24.0502 11.7567C23.9829 11.5517 23.9254 11.3727 23.8444 11.2127C23.6862 10.9011 23.4589 10.6318 23.1809 10.4264C22.9029 10.221 22.5818 10.0851 22.2434 10.0297C22.0548 10.0052 21.8646 9.99581 21.6746 10.0017H21.6298H18.42ZM17.2395 12.6867C17.2005 12.7957 17.1566 12.9007 17.1059 13.0017H22.9439C22.8934 12.9 22.8491 12.7951 22.8112 12.6877L22.7722 12.5737L22.6756 12.2737C22.6399 12.1484 22.5966 12.0255 22.5459 11.9057C22.4932 11.8017 22.4175 11.7118 22.3248 11.6432C22.2321 11.5746 22.1251 11.5292 22.0122 11.5107C21.885 11.4995 21.7573 11.4965 21.6298 11.5017H18.42C18.139 11.5017 18.0805 11.5037 18.0376 11.5117C17.9248 11.5301 17.8178 11.5754 17.7251 11.6438C17.6324 11.7122 17.5567 11.8019 17.5039 11.9057C17.4844 11.9457 17.4629 12.0007 17.3741 12.2747L17.2766 12.5747L17.2395 12.6867Z" fill="currentColor"/>`, options);
  }
  function magnifierSvg(options) {
    return svg(40, `<path d="M23.6629 22.6759L28 27M25.5 18.25C25.5 21.7018 22.7018 24.5 19.25 24.5C15.7982 24.5 13 21.7018 13 18.25C13 14.7982 15.7982 12 19.25 12C22.7018 12 25.5 14.7982 25.5 18.25Z" stroke="var(--icons-secondary)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`, options);
  }
  function copySvg(options) {
    return svg(40, `<path d="M26.6978 14.2749H17.609C16.3202 14.2749 15.2754 15.3197 15.2754 16.6085V25.6973C15.2754 26.9861 16.3202 28.0309 17.609 28.0309H26.6978C27.9866 28.0309 29.0314 26.9861 29.0314 25.6973V16.6085C29.0314 15.3197 27.9866 14.2749 26.6978 14.2749Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M25.7355 14.2752L25.756 13.2927C25.7542 12.6851 25.5121 12.103 25.0826 11.6734C24.653 11.2438 24.0708 11.0017 23.4633 11H14.6202C13.9259 11.0021 13.2606 11.2788 12.7697 11.7697C12.2788 12.2606 12.0021 12.9259 12 13.6202V22.4633C12.0017 23.0708 12.2438 23.653 12.6734 24.0826C13.103 24.5121 13.6851 24.7542 14.2927 24.756H15.2752" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>`, options);
  }
  function funnelSvg(options) {
    return svg(40, `<path d="M11 12.6C11 12.0399 11 11.7599 11.109 11.546C11.2049 11.3578 11.3578 11.2049 11.546 11.109C11.7599 11 12.0399 11 12.6 11H27.4C27.9601 11 28.2401 11 28.454 11.109C28.6422 11.2049 28.7951 11.3578 28.891 11.546C29 11.7599 29 12.0399 29 12.6V14.3373C29 14.5818 29 14.7041 28.9724 14.8192C28.9479 14.9213 28.9075 15.0188 28.8526 15.1083C28.7908 15.2092 28.7043 15.2957 28.5314 15.4686L22.4686 21.5314C22.2957 21.7043 22.2092 21.7908 22.1474 21.8917C22.0925 21.9812 22.0521 22.0787 22.0276 22.1808C22 22.2959 22 22.4182 22 22.6627V25L18 29V22.6627C18 22.4182 18 22.2959 17.9724 22.1808C17.9479 22.0787 17.9075 21.9812 17.8526 21.8917C17.7908 21.7908 17.7043 21.7043 17.5314 21.5314L11.4686 15.4686C11.2957 15.2957 11.2092 15.2092 11.1474 15.1083C11.0925 15.0188 11.0521 14.9213 11.0276 14.8192C11 14.7041 11 14.5818 11 14.3373V12.6Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`, options);
  }
  function paperclipSvg(options) {
    return svg(40, `<path d="M27.6559 19.7623L20.5355 26.8827C18.5829 28.8354 15.4171 28.8354 13.4645 26.8827C11.5118 24.9301 11.5118 21.7643 13.4645 19.8117L20.2998 12.9763C21.6016 11.6746 23.7121 11.6746 25.0139 12.9763C26.3156 14.2781 26.3156 16.3886 25.0139 17.6904L18.1895 24.5148C17.5386 25.1656 16.4833 25.1656 15.8325 24.5148C15.1816 23.8639 15.1816 22.8086 15.8325 22.1577L22.0539 15.9363" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`, options);
  }
  function pencilSvg(options) {
    return svg(40, `<path d="M12.0151 27.5734L12.5736 23.5239C12.6076 23.2593 12.7217 23.0131 12.9002 22.8234L23.7208 11.3648C23.8612 11.2149 24.0355 11.1057 24.2273 11.0476C24.419 10.9895 24.6216 10.9845 24.8157 11.033C25.8089 11.3239 26.7092 11.8934 27.4213 12.6812C28.1642 13.4394 28.699 14.3964 28.9688 15.4503C29.0147 15.6555 29.0099 15.8698 28.955 16.0726C28.9 16.2753 28.7968 16.4597 28.655 16.6081L17.8224 28.0521C17.6426 28.2401 17.4097 28.361 17.1591 28.3965L13.3308 28.9871C13.15 29.015 12.9654 28.9974 12.7922 28.9358C12.619 28.8742 12.4619 28.7703 12.3338 28.6325C12.2057 28.4947 12.11 28.3269 12.0547 28.1428C11.9993 27.9586 11.9857 27.7632 12.0151 27.5724M21.6737 13.5442L26.6079 18.7623" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>`, options);
  }
  function fileSvg(options) {
    return svg(40, `<path d="M21 11L27 17V25.8C27 26.9201 27 27.4802 26.782 27.908C26.5903 28.2843 26.2843 28.5903 25.908 28.782C25.4802 29 24.9201 29 23.8 29H16.2C15.0799 29 14.5198 29 14.092 28.782C13.7157 28.5903 13.4097 28.2843 13.218 27.908C13 27.4802 13 26.9201 13 25.8V14.2C13 13.0799 13 12.5198 13.218 12.092C13.4097 11.7157 13.7157 11.4097 14.092 11.218C14.5198 11 15.0799 11 16.2 11H21ZM27 17H22C21.4477 17 21 16.5523 21 16V11" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>`, options);
  }
  function dotsVerticalSvg(options) {
    return svg(40, `<path d="M19 12.5833C19 13.0033 19.158 13.406 19.4393 13.7029C19.7206 13.9999 20.1022 14.1667 20.5 14.1667C20.8978 14.1667 21.2794 13.9999 21.5607 13.7029C21.842 13.406 22 13.0033 22 12.5833C22 12.1634 21.842 11.7607 21.5607 11.4637C21.2794 11.1668 20.8978 11 20.5 11C20.1022 11 19.7206 11.1668 19.4393 11.4637C19.158 11.7607 19 12.1634 19 12.5833ZM19 20.5C19 20.9199 19.158 21.3227 19.4393 21.6196C19.7206 21.9165 20.1022 22.0833 20.5 22.0833C20.8978 22.0833 21.2794 21.9165 21.5607 21.6196C21.842 21.3227 22 20.9199 22 20.5C22 20.0801 21.842 19.6773 21.5607 19.3804C21.2794 19.0835 20.8978 18.9167 20.5 18.9167C20.1022 18.9167 19.7206 19.0835 19.4393 19.3804C19.158 19.6773 19 20.0801 19 20.5ZM19 28.4167C19 28.8366 19.158 29.2393 19.4393 29.5363C19.7206 29.8332 20.1022 30 20.5 30C20.8978 30 21.2794 29.8332 21.5607 29.5363C21.842 29.2393 22 28.8366 22 28.4167C22 27.9967 21.842 27.594 21.5607 27.2971C21.2794 27.0001 20.8978 26.8333 20.5 26.8333C20.1022 26.8333 19.7206 27.0001 19.4393 27.2971C19.158 27.594 19 27.9967 19 28.4167Z" fill="currentColor"/>`, options);
  }
  function checklistSvg(options) {
    return svg(40, `<path d="M16 15H20M23 23H24M16 19H24M16 24L17 25L19 23M15.2 29H24.8C25.9201 29 26.4802 29 26.908 28.782C27.2843 28.5903 27.5903 28.2843 27.782 27.908C28 27.4802 28 26.9201 28 25.8V14.2C28 13.0799 28 12.5198 27.782 12.092C27.5903 11.7157 27.2843 11.4097 26.908 11.218C26.4802 11 25.9201 11 24.8 11H15.2C14.0799 11 13.5198 11 13.092 11.218C12.7157 11.4097 12.4097 11.7157 12.218 12.092C12 12.5198 12 13.0799 12 14.2V25.8C12 26.9201 12 27.4802 12.218 27.908C12.4097 28.2843 12.7157 28.5903 13.092 28.782C13.5198 29 14.0799 29 15.2 29Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`, options);
  }
  function chatBubbleSvg(options) {
    return svg(40, `<path d="M15.9961 20H16.0061M19.9961 20H20.0061M23.9961 20H24.0061M29 20C29 24.9706 24.9706 29 20 29C17.9636 29 11.0007 29 11.0007 29C11.0007 29 12.5599 25.2561 11.9359 24.0008C11.3369 22.7956 11 21.4372 11 20C11 15.0294 15.0294 11 20 11C24.9706 11 29 15.0294 29 20Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`, options);
  }
  function questionCircleSvg(options) {
    return svg(24, `<path d="M10.9397 8.84174C10.7253 8.99202 10.5535 9.19714 10.4414 9.43652C10.3462 9.61459 10.1871 9.74806 9.99739 9.80882C9.8077 9.86958 9.60229 9.85289 9.42442 9.76227C9.24656 9.67164 9.11013 9.51416 9.04387 9.32298C8.97761 9.13181 8.98669 8.92187 9.06921 8.73739C9.27385 8.31791 9.59412 7.87548 10.0894 7.53948C10.5887 7.19826 11.22 7 11.9936 7C12.6669 7 13.3944 7.20348 13.9725 7.64591C14.2948 7.88619 14.5562 8.20149 14.7349 8.56558C14.9136 8.92966 15.0044 9.33201 14.9998 9.73913C14.9998 10.817 14.4749 11.5339 13.949 12.0504C13.7546 12.2414 13.5407 12.424 13.3565 12.5805L13.2061 12.7089C13.0475 12.8396 12.8987 12.9823 12.761 13.1357V14.5652C12.761 14.7728 12.6802 14.9718 12.5362 15.1186C12.3923 15.2654 12.1971 15.3478 11.9936 15.3478C11.7901 15.3478 11.5949 15.2654 11.4509 15.1186C11.307 14.9718 11.2262 14.7728 11.2262 14.5652V13.0282C11.2262 12.7809 11.2947 12.5023 11.4789 12.2602C11.704 11.968 11.9762 11.7207 12.2136 11.5151L12.4008 11.3555L12.4019 11.3544C12.5779 11.2052 12.7334 11.0727 12.8828 10.9245C13.2593 10.5541 13.465 10.2191 13.465 9.73913C13.4698 9.57499 13.4345 9.41221 13.3624 9.26541C13.2902 9.11861 13.1834 8.99239 13.0516 8.89809C12.7774 8.68835 12.3865 8.56522 11.9936 8.56522C11.4881 8.56522 11.1607 8.69148 10.9397 8.84174ZM13.0168 17.9565C13.0168 18.2333 12.909 18.4987 12.7171 18.6944C12.5252 18.8901 12.265 19 11.9936 19C11.7222 19 11.462 18.8901 11.2701 18.6944C11.0782 18.4987 10.9704 18.2333 10.9704 17.9565C10.9704 17.6798 11.0782 17.4144 11.2701 17.2187C11.462 17.023 11.7222 16.913 11.9936 16.913C12.265 16.913 12.5252 17.023 12.7171 17.2187C12.909 17.4144 13.0168 17.6798 13.0168 17.9565Z" fill="currentColor"/><path d="M12 1C18.075 1 23 5.925 23 12C23 18.075 18.075 23 12 23C5.925 23 1 18.075 1 12C1 5.925 5.925 1 12 1ZM2.5 12C2.5 14.5196 3.50089 16.9359 5.28249 18.7175C7.06408 20.4991 9.48044 21.5 12 21.5C14.5196 21.5 16.9359 20.4991 18.7175 18.7175C20.4991 16.9359 21.5 14.5196 21.5 12C21.5 9.48044 20.4991 7.06408 18.7175 5.28249C16.9359 3.50089 14.5196 2.5 12 2.5C9.48044 2.5 7.06408 3.50089 5.28249 5.28249C3.50089 7.06408 2.5 9.48044 2.5 12Z" fill="currentColor"/>`, options);
  }
  function houseSvg(options) {
    return svg(16, `<path d="M3.33333 6.51851V10.8002C3.33333 11.9203 3.33333 12.4804 3.55132 12.9082C3.74307 13.2845 4.04903 13.5905 4.42535 13.7822C4.85318 14.0002 5.41323 14.0002 6.53333 14.0002H9.46667C10.5868 14.0002 11.1468 14.0002 11.5746 13.7822C11.951 13.5905 12.2569 13.2845 12.4487 12.9082C12.6667 12.4804 12.6667 11.9203 12.6667 10.8002V3.33355M14 8.00021L10.3778 3.9762C9.55407 3.06102 9.14217 2.60343 8.65709 2.4345C8.23103 2.28612 7.76733 2.28616 7.34129 2.4346C6.85623 2.6036 6.44441 3.06125 5.62076 3.97655L2 8.00021" stroke="currentColor" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>`, options);
  }
  function userSvg(options) {
    return svg(24, `<path d="M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 14C8.13401 14 5 17.134 5 21H19C19 17.134 15.866 14 12 14Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`, options);
  }
  function calendarSmallSvg(options) {
    return svg(18, `<path d="M2.25 7.5H15.75M5.25 2.25V3.75M12.75 2.25V3.75M4.65 15.75H13.35C14.1901 15.75 14.6101 15.75 14.931 15.5865C15.2132 15.4427 15.4427 15.2132 15.5865 14.931C15.75 14.6101 15.75 14.1901 15.75 13.35V6.15C15.75 5.30992 15.75 4.88988 15.5865 4.56901C15.4427 4.28677 15.2132 4.0573 14.931 3.91349C14.6101 3.75 14.1901 3.75 13.35 3.75H4.65C3.80992 3.75 3.38988 3.75 3.06901 3.91349C2.78677 4.0573 2.5573 4.28677 2.41349 4.56901C2.25 4.88988 2.25 5.30992 2.25 6.15V13.35C2.25 14.1901 2.25 14.6101 2.41349 14.931C2.5573 15.2132 2.78677 15.4427 3.06901 15.5865C3.38988 15.75 3.80992 15.75 4.65 15.75Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`, options);
  }
  function creditCardSvg(options) {
    return svg(24, `<path d="M3 9H21M7 15H9M6.2 19H17.8C18.9201 19 19.4802 19 19.908 18.782C20.2843 18.5903 20.5903 18.2843 20.782 17.908C21 17.4802 21 16.9201 21 15.8V8.2C21 7.0799 21 6.51984 20.782 6.09202C20.5903 5.71569 20.2843 5.40973 19.908 5.21799C19.4802 5 18.9201 5 17.8 5H6.2C5.0799 5 4.51984 5 4.09202 5.21799C3.71569 5.40973 3.40973 5.71569 3.21799 6.09202C3 6.51984 3 7.0799 3 8.2V15.8C3 16.9201 3 17.4802 3.21799 17.908C3.40973 18.2843 3.71569 18.5903 4.09202 18.782C4.51984 19 5.0799 19 6.2 19Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`, options);
  }
  function graduationHatSvg(options) {
    return svg(40, `<path d="M31 17.3125L20.5 12L10 17.3125L20.5 22.625L31 17.3125ZM31 17.3125V23.6875M27.85 18.9062V25.2812L20.5 29L13.15 25.2812V18.9062" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`, options);
  }
  function clockSvg(options) {
    return svg(24, `<path d="M12 7V12L14.5 13.5M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`, options);
  }
  function chevronDoubleLeftSvg(options) {
    return svg(24, `<path d="M18 17L13 12L18 7M11 17L6 12L11 7" stroke="var(--grey-800)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`, options);
  }
  function openBookSvg(options) {
    return svg(16, `<path d="M7.5 7.9V14.5M7.5 14.5L8.79333 13.6792C9.11794 13.4732 9.28025 13.3702 9.45585 13.2973C9.61171 13.2325 9.77503 13.1854 9.94246 13.157C10.1311 13.125 10.3262 13.125 10.7163 13.125H12.8444C13.2489 13.125 13.4512 13.125 13.6057 13.0501C13.7416 12.9842 13.852 12.879 13.9213 12.7496C14 12.6026 14 12.41 14 12.025V4.6C14 4.21496 14 4.02245 13.9213 3.87538C13.852 3.74602 13.7416 3.64085 13.6057 3.57493C13.4512 3.5 13.2489 3.5 12.8444 3.5H12.1222C10.5043 3.5 9.69533 3.5 9.07736 3.79973C8.53378 4.06338 8.09184 4.48408 7.81487 5.00153C7.5 5.58978 7.5 6.35986 7.5 7.9C7.5 6.35986 7.5 5.58978 7.18513 5.00153C6.90816 4.48408 6.46622 4.06338 5.92264 3.79973C5.30467 3.5 4.49571 3.5 2.87778 3.5H2.15556C1.75107 3.5 1.54883 3.5 1.39434 3.57493C1.25845 3.64085 1.14796 3.74602 1.07872 3.87538C1 4.02245 1 4.21496 1 4.6V12.025C1 12.41 1 12.6026 1.07872 12.7496C1.14796 12.879 1.25845 12.9842 1.39434 13.0501C1.54883 13.125 1.75107 13.125 2.15556 13.125H4.28371C4.67385 13.125 4.86892 13.125 5.05754 13.157C5.22497 13.1854 5.38829 13.2325 5.54415 13.2973C5.71975 13.3702 5.88206 13.4732 6.20667 13.6792L7.5 14.5Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>`, options);
  }
  function calendarGridSvg(options) {
    return svg(24, `<path d="M3 9H21M7 3V5M17 3V5M6 13H8M6 17H8M11 13H13M11 17H13M16 13H18M16 17H18M6.2 21H17.8C18.9201 21 19.4802 21 19.908 20.782C20.2843 20.5903 20.5903 20.2843 20.782 19.908C21 19.4802 21 18.9201 21 17.8V8.2C21 7.07989 21 6.51984 20.782 6.09202C20.5903 5.71569 20.2843 5.40973 19.908 5.21799C19.4802 5 18.9201 5 17.8 5H6.2C5.0799 5 4.51984 5 4.09202 5.21799C3.71569 5.40973 3.40973 5.71569 3.21799 6.09202C3 6.51984 3 7.07989 3 8.2V17.8C3 18.9201 3 19.4802 3.21799 19.908C3.40973 20.2843 3.71569 20.5903 4.09202 20.782C4.51984 21 5.07989 21 6.2 21Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`, options);
  }
  function calendarDaySvg(options) {
    return svg(24, `<path d="M3 9H21M7 3V5M17 3V5M6 12H10V16H6V12ZM6.2 21H17.8C18.9201 21 19.4802 21 19.908 20.782C20.2843 20.5903 20.5903 20.2843 20.782 19.908C21 19.4802 21 18.9201 21 17.8V8.2C21 7.07989 21 6.51984 20.782 6.09202C20.5903 5.71569 20.2843 5.40973 19.908 5.21799C19.4802 5 18.9201 5 17.8 5H6.2C5.0799 5 4.51984 5 4.09202 5.21799C3.71569 5.40973 3.40973 5.71569 3.21799 6.09202C3 6.51984 3 7.07989 3 8.2V17.8C3 18.9201 3 19.4802 3.21799 19.908C3.40973 20.2843 3.71569 20.5903 4.09202 20.782C4.51984 21 5.07989 21 6.2 21Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`, options);
  }
  function calendarSvg(options) {
    return svg(24, `<path d="M3 10H21M7 3V5M17 3V5M6.2 21H17.8C18.9201 21 19.4802 21 19.908 20.782C20.2843 20.5903 20.5903 20.2843 20.782 19.908C21 19.4802 21 18.9201 21 17.8V8.2C21 7.07989 21 6.51984 20.782 6.09202C20.5903 5.71569 20.2843 5.40973 19.908 5.21799C19.4802 5 18.9201 5 17.8 5H6.2C5.0799 5 4.51984 5 4.09202 5.21799C3.71569 5.40973 3.40973 5.71569 3.21799 6.09202C3 6.51984 3 7.07989 3 8.2V17.8C3 18.9201 3 19.4802 3.21799 19.908C3.40973 20.2843 3.71569 20.5903 4.09202 20.782C4.51984 21 5.07989 21 6.2 21Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`, options);
  }
  function clockArrowSvg(options) {
    return svg(24, `<path d="M4 12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C9.61061 4 7.46589 5.04751 6 6.70835C5.91595 6.80358 5.83413 6.90082 5.75463 7M12 8V12L14.5 14.5M5.75391 4.00391V7.00391H8.75391" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`, options);
  }
  function calendarMagnifierSvg(options) {
    return svg(40, `<path d="M11 18H29M15 11V13M25 11V13M14.2 29H25.8C26.9201 29 27.4802 29 27.908 28.782C28.2843 28.5903 28.5903 28.2843 28.782 27.908C29 27.4802 29 26.9201 29 25.8V16.2C29 15.0799 29 14.5198 28.782 14.092C28.5903 13.7157 28.2843 13.4097 27.908 13.218C27.4802 13 26.9201 13 25.8 13H14.2C13.0799 13 12.5198 13 12.092 13.218C11.7157 13.4097 11.4097 13.7157 11.218 14.092C11 14.5198 11 15.0799 11 16.2V25.8C11 26.9201 11 27.4802 11.218 27.908C11.4097 28.2843 11.7157 28.5903 12.092 28.782C12.5198 29 13.0799 29 14.2 29Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M21.2652 25.2704L23 27M22 23.5C22 24.8807 20.8807 26 19.5 26C18.1193 26 17 24.8807 17 23.5C17 22.1193 18.1193 21 19.5 21C20.8807 21 22 22.1193 22 23.5Z" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>`, options);
  }
  function journalPencilSvg(options) {
    return svg(24, `<path d="M16.4918 4.93359H6.73359C6.55457 4.93359 6.38288 5.00471 6.2563 5.1313C6.12971 5.25788 6.05859 5.42957 6.05859 5.60859C6.05859 5.78761 6.12971 5.9593 6.2563 6.08589C6.38288 6.21248 6.55457 6.28359 6.73359 6.28359H16.4926C16.6716 6.28349 16.8433 6.21228 16.9698 6.08563C17.0963 5.95897 17.1673 5.78724 17.1672 5.60822C17.1671 5.4292 17.0959 5.25755 16.9692 5.13103C16.8426 5.00451 16.6709 4.93349 16.4918 4.93359ZM17.1668 9.41409C17.1668 9.23507 17.0957 9.06338 16.9691 8.9368C16.8426 8.81021 16.6709 8.73909 16.4918 8.73909H6.73359C6.55457 8.73909 6.38288 8.81021 6.2563 8.9368C6.12971 9.06338 6.05859 9.23507 6.05859 9.41409C6.05859 9.59311 6.12971 9.7648 6.2563 9.89139C6.38288 10.018 6.55457 10.0891 6.73359 10.0891H16.4926C16.6715 10.0889 16.843 10.0177 16.9694 9.89113C17.0958 9.76456 17.1668 9.59298 17.1668 9.41409ZM6.73359 12.5453C6.55457 12.5453 6.38288 12.6165 6.2563 12.743C6.12971 12.8696 6.05859 13.0413 6.05859 13.2203C6.05859 13.3994 6.12971 13.5711 6.2563 13.6976C6.38288 13.8242 6.55457 13.8953 6.73359 13.8953H11.6491C11.8281 13.8953 11.9998 13.8242 12.1264 13.6976C12.253 13.5711 12.3241 13.3994 12.3241 13.2203C12.3241 13.0413 12.253 12.8696 12.1264 12.743C11.9998 12.6165 11.8281 12.5453 11.6491 12.5453H6.73359Z" fill="currentColor"/><path d="M8.48481 21.8242H4.30806C4.0313 21.8238 3.76598 21.7137 3.57028 21.518C3.37458 21.3223 3.26446 21.057 3.26406 20.7802V3.21822C3.26406 2.64222 3.73281 2.17422 4.30806 2.17422H18.9151C19.4903 2.17422 19.9591 2.64297 19.9591 3.21822V9.62697C19.9591 9.80599 20.0302 9.97768 20.1568 10.1043C20.2834 10.2309 20.455 10.302 20.6341 10.302C20.8131 10.302 20.9848 10.2309 21.1114 10.1043C21.2379 9.97768 21.3091 9.80599 21.3091 9.62697V3.21822C21.3085 2.5836 21.0562 1.97514 20.6075 1.52633C20.1588 1.07752 19.5504 0.825013 18.9158 0.824219H4.30806C3.67338 0.825013 3.06492 1.07749 2.61613 1.52628C2.16734 1.97507 1.91486 2.58353 1.91406 3.21822V20.7802C1.91486 21.4149 2.16734 22.0234 2.61613 22.4722C3.06492 22.9209 3.67338 23.1734 4.30806 23.1742H8.48481C8.66383 23.1742 8.83552 23.1031 8.96211 22.9765C9.0887 22.8499 9.15981 22.6782 9.15981 22.4992C9.15981 22.3202 9.0887 22.1485 8.96211 22.0219C8.83552 21.8953 8.66383 21.8242 8.48481 21.8242Z" fill="currentColor"/><path d="M21.3486 12.6843C20.8771 12.2136 20.2381 11.9492 19.5718 11.9492C18.9056 11.9492 18.2666 12.2136 17.7951 12.6843L11.5888 18.8906C11.393 19.0857 11.2629 19.3372 11.2168 19.6098L10.8778 21.6221C10.8426 21.8312 10.8579 22.0458 10.9225 22.2478C10.987 22.4498 11.0989 22.6335 11.2488 22.7835C11.3988 22.9335 11.5824 23.0455 11.7844 23.1101C11.9864 23.1748 12.2009 23.1902 12.4101 23.1551L14.4208 22.8153C14.6953 22.7696 14.9451 22.6413 15.1416 22.4441L21.3478 16.2378C21.8185 15.7663 22.0829 15.1274 22.083 14.4612C22.0831 13.795 21.819 13.156 21.3486 12.6843ZM14.1981 21.4841L12.2091 21.8463L12.5428 19.8446L17.0091 15.3783L18.6546 17.0238L14.1981 21.4841ZM20.3938 15.2831L19.6086 16.0691L17.9631 14.4236L18.7491 13.6376C18.9756 13.4111 19.2741 13.2978 19.5718 13.2978C19.8019 13.2977 20.0268 13.3658 20.2182 13.4936C20.4095 13.6214 20.5586 13.803 20.6466 14.0156C20.7346 14.2282 20.7576 14.4621 20.7126 14.6877C20.6676 14.9133 20.5567 15.1205 20.3938 15.2831Z" fill="currentColor"/>`, options);
  }
  function vkLogoSvg() {
    return `<svg viewBox="0 0 28 28" width="40" height="40"><path d="M3 13.56C3 8.58197 3 6.09295 4.54648 4.54648C6.09295 3 8.58197 3 13.56 3H14.44C19.418 3 21.907 3 23.4535 4.54648C25 6.09295 25 8.58197 25 13.56V14.44C25 19.418 25 21.907 23.4535 23.4535C21.907 25 19.418 25 14.44 25H13.56C8.58197 25 6.09295 25 4.54648 23.4535C3 21.907 3 19.418 3 14.44V13.56Z" fill="var(--brand-vk)"/><path d="M14.7065 18.9C9.68405 18.9 6.81937 15.4466 6.70001 9.70001H9.2158C9.29844 13.9178 11.1531 15.7044 12.6222 16.0728V9.70001H14.9912V13.3376C16.4419 13.1811 17.9659 11.5234 18.4801 9.70001H20.849C20.4542 11.9471 18.8015 13.6047 17.6262 14.2862C18.8015 14.8387 20.6838 16.2846 21.4 18.9H18.7923C18.2322 17.1503 16.8367 15.7965 14.9912 15.6123V18.9H14.7065Z" fill="var(--white)"/></svg>`;
  }
  function telegramPlaneSvg() {
    return `<svg viewBox="0 0 20 20" width="20" height="20"><path d="M5.07812 11.0663L6.73911 15.8552C6.73911 15.8552 6.94678 16.3033 7.16914 16.3033C7.39151 16.3033 10.6989 12.7192 10.6989 12.7192L14.3768 5.31934L5.13739 9.83008L5.07812 11.0663Z" fill="var(--tg-shade-1)"/><path d="M7.27756 12.2939L6.95871 15.8238C6.95871 15.8238 6.82524 16.9054 7.86334 15.8238C8.90144 14.7422 9.89509 13.9082 9.89509 13.9082" fill="var(--tg-shade-2)"/><path d="M5.10635 11.2375L1.68965 10.0779C1.68965 10.0779 1.28132 9.90532 1.4128 9.514C1.43987 9.43331 1.49447 9.36464 1.6578 9.24664C2.41485 8.69697 15.6702 3.73414 15.6702 3.73414C15.6702 3.73414 16.0444 3.60277 16.2652 3.69015C16.3198 3.70775 16.3689 3.74015 16.4076 3.78403C16.4462 3.82791 16.4729 3.8817 16.4851 3.93988C16.5089 4.04266 16.5189 4.14839 16.5147 4.25403C16.5137 4.34542 16.5031 4.43013 16.495 4.56296C16.4143 5.91982 13.9983 16.0465 13.9983 16.0465C13.9983 16.0465 13.8538 16.6391 13.3359 16.6593C13.2086 16.6636 13.0818 16.6412 12.9631 16.5933C12.8443 16.5455 12.736 16.4732 12.6447 16.3808C11.6284 15.4702 8.11577 13.0112 7.33959 12.4704C7.32208 12.458 7.30733 12.4418 7.29635 12.4229C7.28536 12.404 7.27838 12.3829 7.27589 12.361C7.26504 12.304 7.32454 12.2334 7.32454 12.2334C7.32454 12.2334 13.4409 6.57023 13.6037 5.97572C13.6163 5.92966 13.5687 5.90693 13.5047 5.92711C13.0985 6.08278 6.05625 10.7153 5.27902 11.2266C5.22307 11.2442 5.16394 11.2479 5.10635 11.2375Z" fill="var(--white)"/></svg>`;
  }
  function telegramBadgeSvg() {
    return `<svg viewBox="0 0 24 24" width="9" height="9" aria-hidden="true"><path d="M21 4 3 11.2l6 2.1 2.2 6.2 3.1-4 5 3.7z" fill="var(--white)"/></svg>`;
  }
  function checkboxMarkSvg() {
    return `<svg class="svg-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 12.3922L10.6667 18L20 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  // src/components/kitButtons.ts
  function dataAttrs(data = {}) {
    return Object.entries(data).map(([key, value]) => `data-${key.replace(/[A-Z]/g, (ch) => `-${ch.toLowerCase()}`)}="${esc(value)}"`).join(" ");
  }
  function buttonBase(kind, props) {
    const classes = ["kit-button", kind, props.full ? "full" : ""].filter(Boolean).join(" ");
    const click = props.click ? `data-click="${props.click}"` : "";
    const secure = props.secure ? 'data-secure="1"' : "";
    const id = props.id ? `id="${props.id}"` : "";
    const icon = props.iconAfter ? `<span class="kit-button-icon">${props.iconAfter}</span>` : "";
    return `<button type="button" class="${classes}" ${id} ${click} ${secure} ${dataAttrs(props.data)} ${props.disabled ? "disabled" : ""}><span>${esc(props.text)}</span>${icon}</button>`;
  }
  function kitButtonBlack(props) {
    return buttonBase("black", props);
  }
  function kitButtonWhite(props) {
    return buttonBase("white", props);
  }
  function kitButtonDarkViolet(props) {
    return buttonBase("dark-violet", props);
  }
  function kitButtonPrimaryAlert(props) {
    return buttonBase("primary-alert", props);
  }
  function kitButtonSecondaryAlert(props) {
    return buttonBase("secondary-alert", props);
  }
  function kitButtonLink(props) {
    return buttonBase("link", props);
  }
  function kitIconButton(props) {
    const classes = ["kit-icon-button", props.dark ? "dark" : "", props.naked ? "naked" : "", props.small ? "small" : ""].filter(Boolean).join(" ");
    const click = props.click ? `data-click="${props.click}"` : "";
    const title = props.title ? `title="${esc(props.title)}" aria-label="${esc(props.title)}"` : "";
    return `<button type="button" class="${classes}" ${click} ${title} ${dataAttrs(props.data)} ${props.disabled ? "disabled" : ""}>${props.icon}</button>`;
  }

  // src/components/Panel.ts
  var renderedKey = "";
  var renderedDepth = 0;
  onClick("panelClose", () => {
    closeAllPanels();
  });
  onClick("panelBack", () => {
    closeTopPanel();
  });
  function headHtml(title, headExtra, withBack) {
    const back = withBack ? kitIconButton({ icon: chevronLeftSvg(), click: "panelBack", naked: true, small: true, title: "Назад" }) : "";
    return `${back}<span class="panel-title">${esc(title)}</span>${headExtra}${kitIconButton({ icon: crossSvg(), click: "panelClose", naked: true, small: true, title: "Закрыть" })}`;
  }
  function renderPanels(host) {
    const stack2 = openedPanels();
    const top = stack2[stack2.length - 1];
    if (!top) {
      host.innerHTML = "";
      renderedKey = "";
      renderedDepth = 0;
      return;
    }
    const def = top.render();
    const key = `${stack2.length}:${top.key}`;
    const head = headHtml(def.title, def.headExtra ?? "", stack2.length > 1);
    const existing = host.querySelector(".panel");
    if (existing && key === renderedKey) {
      const body = existing.querySelector(".panel-body");
      const headEl = existing.querySelector(".panel-head");
      if (body && headEl) {
        const scrollTop = body.scrollTop;
        const active = document.activeElement;
        const activeField = active instanceof HTMLElement && existing.contains(active) ? active.dataset.field : void 0;
        existing.classList.toggle("narrow", Boolean(def.narrow));
        existing.classList.remove("appear", "slide");
        existing.classList.add("still");
        headEl.innerHTML = head;
        body.innerHTML = def.body;
        let foot = existing.querySelector(".panel-foot");
        if (def.foot) {
          if (!foot) {
            foot = document.createElement("div");
            foot.className = "panel-foot";
            existing.appendChild(foot);
          }
          foot.innerHTML = def.foot;
        } else if (foot) {
          foot.remove();
        }
        body.scrollTop = scrollTop;
        if (activeField) {
          const field = body.querySelector(`[data-field="${activeField}"]`);
          if (field) {
            field.focus();
            field.setSelectionRange(field.value.length, field.value.length);
          }
        }
        return;
      }
    }
    const pushed = stack2.length > renderedDepth;
    const html = `<section class="panel ${def.narrow ? "narrow" : ""} ${existing ? pushed ? "slide" : "still" : "appear"}" style="z-index:${top.zIndex}">
    <header class="panel-head">${head}</header>
    <div class="panel-body">${def.body}</div>
    ${def.foot ? `<footer class="panel-foot">${def.foot}</footer>` : ""}
  </section>`;
    const dim = host.querySelector(".panel-dim");
    if (existing && dim) {
      existing.outerHTML = html;
    } else {
      host.innerHTML = `<div class="panel-dim" data-click="panelClose" style="z-index:${top.zIndex - 1}"></div>${html}`;
    }
    renderedKey = key;
    renderedDepth = stack2.length;
  }

  // src/stores/route.ts
  var current = { page: "signup", step: "role" };
  var previous = null;
  function route() {
    return current;
  }
  function previousRoute() {
    return previous;
  }
  var HASHES = {
    signup: { page: "signup", step: "role" },
    home: { page: "home" },
    staff: { page: "staff", view: "list" },
    students: { page: "students", view: "list" },
    schedule: { page: "schedule" },
    notifications: { page: "notifications" },
    subscription: { page: "subscription" }
  };
  function goTo(next) {
    previous = current;
    current = next;
    try {
      history.replaceState(null, "", `#${next.page}`);
    } catch {
    }
    window.scrollTo(0, 0);
    requestRender();
  }
  function initRouteFromHash() {
    let hash = "";
    try {
      hash = location.hash.slice(1);
    } catch {
      hash = "";
    }
    const found = HASHES[hash];
    if (found) {
      current = found;
    }
  }

  // src/components/inputs.ts
  var NAME_MAX_LENGTH = 100;
  var EMAIL_MAX_LENGTH = 50;
  var LINK_MAX_LENGTH = 255;
  var PRICE_MAX_LENGTH = 6;
  var MONEY_MAX_LENGTH = 12;
  var TEXTAREA_MAX_LENGTH = 1e3;
  var PHONE_MAX_LENGTH = 20;
  var MINUTES_MAX_LENGTH = 3;
  var CURRENCY_MAX_LENGTH = 3;
  var DATE_MAX_LENGTH = 10;
  var TIME_MAX_LENGTH = 5;
  function input(props) {
    const value = props.value === null ? "" : String(props.value);
    const filled = value !== "";
    const classes = ["kit-input", filled ? "filled" : "", props.center ? "center" : "", props.grow ? "grow" : ""].filter(Boolean).join(" ");
    const id = props.id ? `id="${props.id}"` : "";
    return `<label class="${classes}">
    <span class="kit-input-label">${esc(props.filledLabel ?? props.label)}</span>
    <input ${id} type="${props.type ?? "text"}" inputmode="${props.inputmode ?? "text"}" placeholder="${esc(props.label)}" value="${esc(value)}" maxlength="${props.maxlength}" data-input="${props.input}" data-field="${props.field}">
    <span class="kit-input-clear" data-click="inputClear" aria-label="Очистить">${crossSvg({ size: 24 })}</span>
  </label>`;
  }
  function numberInput(props) {
    return input({ ...props, inputmode: props.inputmode ?? "numeric" });
  }
  function textArea(props) {
    const value = props.value ?? "";
    return `<label class="kit-input kit-textarea ${value ? "filled" : ""}">
    <span class="kit-input-label">${esc(props.filledLabel)}</span>
    <textarea placeholder="${esc(props.label)}" maxlength="${props.charsLimit}" data-input="${props.input}" data-field="${props.field}">${esc(value)}</textarea>
  </label>`;
  }
  function inputSearch(props) {
    return `<label class="kit-search">
    <input id="${props.id}" placeholder="Поиск" value="${esc(props.value)}" maxlength="${NAME_MAX_LENGTH}" data-input="${props.input}" data-field="search">
    ${magnifierSvg()}
  </label>`;
  }

  // src/components/switchers.ts
  function checkbox(checked) {
    return `<span class="kit-checkbox ${checked ? "checked" : ""}"><span class="kit-checkbox-box">${checked ? checkboxMarkSvg() : ""}</span></span>`;
  }
  function radio(checked) {
    return `<span class="kit-radio ${checked ? "checked" : ""}"><span class="kit-radio-circle"></span></span>`;
  }
  function modernSwitcher(checked) {
    return `<span class="kit-switcher ${checked ? "checked" : ""}"></span>`;
  }
  function switcherRow(props) {
    const parts = props.controlFirst ? `${props.control}<span class="kit-row-text">${props.content}</span>` : `<span class="kit-row-text">${props.content}</span>${props.control}`;
    return `<div class="kit-row" role="button" tabindex="0" data-click="${props.click}" ${dataAttrs(props.data)}>${parts}</div>`;
  }

  // src/stores/viewportWidth.ts
  var TABLET_WIDTH = 744;
  var DESKTOP_WIDTH = 1080;
  var WIDE_WIDTH = 1440;
  var width = typeof window === "undefined" ? 1440 : window.innerWidth;
  function isTablet() {
    return width >= TABLET_WIDTH;
  }
  function isDesktop() {
    return width >= DESKTOP_WIDTH;
  }
  function isWide() {
    return width >= WIDE_WIDTH;
  }
  function viewportClasses() {
    return [isTablet() ? "tablet" : "", isDesktop() ? "desktop" : "", isWide() ? "wide" : ""].filter(Boolean).join(" ");
  }
  function initViewportWidth() {
    window.addEventListener("resize", () => {
      const prev = viewportClasses();
      width = window.innerWidth;
      if (prev !== viewportClasses()) {
        requestRender();
      }
    });
  }

  // src/util/moneyToString.ts
  var MINUS = "−";
  function groupDigits(value) {
    return Math.abs(Math.round(value)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  }
  function moneyToString(value) {
    const sign = value < 0 ? MINUS : "";
    return `${sign}${groupDigits(value)}${NBSP}₽`;
  }
  function moneyDeltaToString(value) {
    if (value > 0) {
      return `+${groupDigits(value)}${NBSP}₽`;
    }
    return moneyToString(value);
  }
  var MINUS_SIGN = MINUS;

  // src/pages/signup/SignUp.ts
  var ROLES = [
    { key: "tutor", text: "Я репетитор", image: "role_tutor.png" },
    { key: "student", text: "Я ученик", image: "role_student.png" },
    { key: "school", text: "У меня школа", image: "role_school.png" }
  ];
  var TARIFFS = [
    { key: "start", badge: "Для начинающих", name: "Начальная школа", price: 1990, limit: 5, popular: false, features: ["до 5 учителей", "1 администратор", "разделение на роли: владелец, админ, ученик, учитель"] },
    { key: "middle", badge: "Популярно среди школ", name: "Средняя школа", price: 4490, limit: 15, popular: true, features: ["до 15 учителей", "2 администратора", "уведомления для учеников"] },
    { key: "high", badge: "Для профи", name: "Высшая школа", price: 6990, limit: 40, popular: false, features: ["до 40 учителей", "3 администратора", "индивидуальная поддержка"] }
  ];
  var CODE_LENGTH = 6;
  var RESEND_SECONDS = 60;
  var form = {
    role: null,
    tariffKey: "start",
    email: "",
    agreeTerms: false,
    code: "",
    schoolName: "",
    founderFirstName: "",
    founderLastName: "",
    founderMiddleName: "",
    logoDataUrl: null,
    agreePersonalData: false
  };
  var resendLeft = RESEND_SECONDS;
  var resendTimer;
  var welcomeTimer;
  function resetSignUp() {
    Object.assign(form, { role: null, tariffKey: "start", email: "", agreeTerms: false, code: "", schoolName: "", founderFirstName: "", founderLastName: "", founderMiddleName: "", logoDataUrl: null, agreePersonalData: false });
    window.clearInterval(resendTimer);
    resendLeft = RESEND_SECONDS;
  }
  function step() {
    const r = route();
    return r.page === "signup" ? r.step : "role";
  }
  function isEmailValid(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }
  function setDisabled(id, disabled) {
    const el = document.getElementById(id);
    if (el instanceof HTMLButtonElement) {
      el.disabled = disabled;
    }
  }
  onClick("signupRole", (el) => {
    form.role = dataOf(el, "key");
    requestRender();
  });
  onClick("signupRoleNext", () => {
    if (form.role !== "school") {
      showInfo(`Сценарии репетитора и${NBSP}ученика как в${NBSP}базовом SecRep. Выберите «У${NBSP}меня школа»`);
      return;
    }
    goTo({ page: "signup", step: "tariffs" });
  });
  onClick("signupBack", (el) => {
    goTo({ page: "signup", step: dataOf(el, "step") });
  });
  onClick("signupTariff", (el) => {
    form.tariffKey = dataOf(el, "key");
    goTo({ page: "signup", step: "reg1" });
  });
  onClick("signupStub", (el) => {
    showInfo(dataOf(el, "text") || NOT_IN_MOCKUPS);
  });
  onInput("signupField", (el) => {
    if (!(el instanceof HTMLInputElement)) {
      return;
    }
    const field = dataOf(el, "field");
    if (field === "email") {
      form.email = el.value;
      setDisabled("signup-reg1-submit", !(isEmailValid(form.email) && form.agreeTerms));
    }
    if (field === "schoolName") {
      form.schoolName = el.value;
      setDisabled("signup-reg3-submit", !(form.schoolName.trim() && form.agreePersonalData));
    }
    if (field === "founderFirstName" || field === "founderLastName" || field === "founderMiddleName") {
      form[field] = el.value;
    }
    el.closest(".kit-input")?.classList.toggle("filled", el.value !== "");
  });
  onClick("signupAgreeTerms", () => {
    form.agreeTerms = !form.agreeTerms;
    requestRender();
  });
  onClick("signupAgreePersonal", () => {
    form.agreePersonalData = !form.agreePersonalData;
    requestRender();
  });
  onClick("signupCreateAccount", () => {
    if (form.email.trim().toLowerCase() === "teacher1@example.com") {
      showError(`Аккаунт с${NBSP}такой почтой уже есть. Войдите, чтобы открыть школу`);
      return;
    }
    form.code = "";
    resendLeft = RESEND_SECONDS;
    goTo({ page: "signup", step: "reg2" });
  });
  onInput("signupCode", (el) => {
    if (!(el instanceof HTMLInputElement)) {
      return;
    }
    el.value = el.value.replace(/\D/g, "").slice(-1);
    const cells = Array.from(document.querySelectorAll(".signup-code input"));
    form.code = cells.map((cell) => cell.value).join("");
    const index = cells.indexOf(el);
    const next = cells[index + 1];
    if (el.value && next) {
      next.focus();
    }
    setDisabled("signup-reg2-submit", form.code.length !== CODE_LENGTH);
  });
  onClick("signupResend", () => {
    if (resendLeft > 0) {
      return;
    }
    resendLeft = RESEND_SECONDS;
    showInfo("Отправили письмо еще раз");
    startResendTimer();
  });
  onClick("signupLogoClear", () => {
    form.logoDataUrl = null;
    requestRender();
  });
  onClick("signupToPayment", async () => {
    const tariff = TARIFFS.find((t) => t.key === form.tariffKey) ?? TARIFFS[0];
    if (!tariff) {
      return;
    }
    showInfo(`Оплата тарифа «${tariff.name}» в${NBSP}платежной форме базового SecRep. В${NBSP}прототипе считаем, что оплата прошла`);
    const { success } = await api("school/school_create", { name: form.schoolName, tariffName: tariff.name, teachersLimit: tariff.limit, founderFirstName: form.founderFirstName, founderLastName: form.founderLastName, founderMiddleName: form.founderMiddleName });
    if (!success) {
      return;
    }
    await loadSchool();
    goTo({ page: "signup", step: "welcome" });
  });
  onClick("signupFinish", () => {
    goTo({ page: "home" });
  });
  function startResendTimer() {
    window.clearInterval(resendTimer);
    resendTimer = window.setInterval(() => {
      resendLeft = Math.max(0, resendLeft - 1);
      const link = document.getElementById("signup-resend");
      if (!link) {
        window.clearInterval(resendTimer);
        return;
      }
      link.textContent = resendLeft ? `Отправить еще раз (${resendLeft}с)` : "Отправить еще раз";
    }, 1e3);
  }
  function bindLogoInput() {
    const fileInput = document.getElementById("signup-logo");
    if (!(fileInput instanceof HTMLInputElement)) {
      return;
    }
    fileInput.onchange = () => {
      const file = fileInput.files?.[0];
      if (!file) {
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        form.logoDataUrl = typeof reader.result === "string" ? reader.result : null;
        requestRender();
      };
      reader.readAsDataURL(file);
    };
  }
  function steps(current3) {
    return `<div class="signup-steps">${[1, 2, 3].map((i) => `<span class="signup-step ${i === current3 ? "current" : ""} ${i < current3 ? "done" : ""}">${i < current3 ? checkSvg({ size: 20 }) : i}</span>${i < 3 ? '<span class="signup-step-line"></span>' : ""}`).join("")}</div>`;
  }
  function split(formHtml) {
    const promo = isDesktop() ? '<div class="signup-promo"><img src="assets/promo.png" alt=""></div>' : "";
    return `<div class="signup"><div class="signup-split"><div class="signup-form">${formHtml}</div>${promo}</div></div>`;
  }
  function roleStep() {
    return `<div class="signup"><div class="signup-roles">
    <img class="signup-logo" src="assets/logo.png" alt="SecRep" width="120" height="26">
    <div class="signup-question">Как вы планируете использовать SecRep?</div>
    <div class="signup-role-list">${ROLES.map((r) => `<button type="button" class="signup-role ${form.role === r.key ? "active" : ""}" data-click="signupRole" data-key="${r.key}">
      <span class="signup-role-title">${r.text}</span>${radio(form.role === r.key)}<img src="assets/${r.image}" alt="">
    </button>`).join("")}</div>
    <div class="signup-role-next">${kitButtonBlack({ text: "Продолжить", click: "signupRoleNext", disabled: !form.role, full: true })}</div>
  </div></div>`;
  }
  function tariffsStep() {
    return `<div class="signup"><div class="signup-card">
    <button type="button" class="signup-back" data-click="signupBack" data-step="role">${chevronLeftSvg({ size: 24 })}<span>Назад</span></button>
    <div class="signup-tariffs">${TARIFFS.map((t) => `<div class="signup-tariff ${t.popular ? "popular" : ""}">
      <div class="signup-tariff-badge">${t.badge}</div>
      <div class="signup-tariff-body">
        <div class="signup-tariff-name">${t.name.toUpperCase()}</div>
        <div class="signup-tariff-price">${moneyToString(t.price)}</div><div class="signup-tariff-period">в${NBSP}месяц</div>
        <ul>${t.features.map((f) => `<li>${plusSvg({ size: 24 })}<span>${f}</span></li>`).join("")}</ul>
        ${t.popular ? kitButtonDarkViolet({ text: "Открыть школу", click: "signupTariff", data: { key: t.key }, full: true }) : kitButtonBlack({ text: "Открыть школу", click: "signupTariff", data: { key: t.key }, full: true })}
      </div>
    </div>`).join("")}</div>
    <div class="signup-compare">${kitButtonWhite({ text: "Сравнить тарифы", click: "signupStub" })}</div>
  </div></div>`;
  }
  function reg1Step() {
    const valid = isEmailValid(form.email) && form.agreeTerms;
    return split(`${steps(1)}
    <div class="signup-form-center">
      <img class="signup-logo" src="assets/logo.png" alt="SecRep" width="120" height="26">
      ${input({ label: "Почта", value: form.email, input: "signupField", field: "email", maxlength: EMAIL_MAX_LENGTH, inputmode: "email", type: "email" })}
      ${switcherRow({ click: "signupAgreeTerms", control: checkbox(form.agreeTerms), controlFirst: true, content: `Принимаю условия Пользовательского соглашения и${NBSP}Политики обработки данных` })}
      ${kitButtonBlack({ text: "Создать аккаунт", click: "signupCreateAccount", disabled: !valid, full: true, id: "signup-reg1-submit" })}
      <div class="signup-hint">Уже есть аккаунт? <button type="button" class="signup-inline-link" data-click="signupStub" data-text="Вход как в базовом SecRep. После входа предложим создать школу">Войти</button></div>
      <div class="signup-socials"><span>или создать аккаунт с${NBSP}помощью</span>
        <div class="signup-socials-row"><button type="button" class="signup-social telegram" data-click="signupStub" data-text="Вход через Telegram как в базовом SecRep">${telegramPlaneSvg()}</button><button type="button" class="signup-social vk" data-click="signupStub" data-text="Вход через VK как в базовом SecRep">${vkLogoSvg()}</button></div>
      </div>
    </div>`);
  }
  function reg2Step() {
    const cells = Array.from({ length: CODE_LENGTH }, (_, i) => `<input inputmode="numeric" maxlength="1" value="${esc(form.code[i] ?? "")}" data-input="signupCode" aria-label="Цифра ${i + 1}">`).join("");
    return split(`${steps(2)}
    <div class="signup-email-block">
      <img class="signup-logo" src="assets/logo.png" alt="SecRep" width="120" height="26">
      <button type="button" class="signup-email-chip" data-click="signupBack" data-step="reg1">${esc(form.email)}${pencilSvg({ size: 24 })}</button>
      <div class="signup-hint">Отправили письмо с${NBSP}подтверждением</div>
    </div>
    <div class="signup-code-block">
      <div class="signup-code-title">Введите шестизначный код</div>
      <div class="signup-code">${cells}</div>
      <div class="signup-hint">Для прототипа подойдет любой код</div>
    </div>
    <div class="signup-form-bottom">
      ${kitButtonBlack({ text: "Продолжить", click: "signupBack", data: { step: "reg3" }, disabled: form.code.length !== CODE_LENGTH, full: true, id: "signup-reg2-submit" })}
      <div class="signup-hint">Письмо не пришло? <button type="button" class="signup-inline-link" id="signup-resend" data-click="signupResend">Отправить еще раз (${resendLeft}с)</button></div>
    </div>`);
  }
  function reg3Step() {
    const ready = Boolean(form.schoolName.trim()) && form.agreePersonalData;
    const logo = form.logoDataUrl ? `<img src="${form.logoDataUrl}" alt="">` : plusSvg({ size: 30 });
    return split(`${steps(3)}
    <div class="signup-fields">
      <div>Познакомимся? Эти данные будут отображаться у${NBSP}ваших учеников и${NBSP}сотрудников</div>
      ${input({ label: "Название школы*", value: form.schoolName, input: "signupField", field: "schoolName", maxlength: NAME_MAX_LENGTH })}
      ${input({ label: "Имя основателя", value: form.founderFirstName, input: "signupField", field: "founderFirstName", maxlength: NAME_MAX_LENGTH })}
      ${input({ label: "Фамилия основателя", value: form.founderLastName, input: "signupField", field: "founderLastName", maxlength: NAME_MAX_LENGTH })}
      ${input({ label: "Отчество основателя", value: form.founderMiddleName, input: "signupField", field: "founderMiddleName", maxlength: NAME_MAX_LENGTH })}
      <div class="signup-logo-row"><span>Логотип школы</span><label class="signup-logo-upload">${logo}<input id="signup-logo" type="file" accept="image/png,image/jpeg" hidden></label>${form.logoDataUrl ? `<button type="button" class="signup-inline-link" data-click="signupLogoClear">Убрать</button>` : ""}</div>
      ${switcherRow({ click: "signupAgreePersonal", control: checkbox(form.agreePersonalData), controlFirst: true, content: `Даю согласие на${NBSP}обработку персональных данных` })}
    </div>
    <div class="signup-form-bottom row">
      ${kitButtonWhite({ text: "Назад", click: "signupBack", data: { step: "reg2" }, full: true })}
      ${kitButtonBlack({ text: "Перейти к оплате", click: "signupToPayment", disabled: !ready, full: true, secure: true, id: "signup-reg3-submit" })}
    </div>`);
  }
  function welcomeStep() {
    return `<div class="signup"><button type="button" class="signup-welcome" data-click="signupFinish">
    <span class="signup-welcome-title">Добро пожаловать!</span>
    <img src="assets/welcome.png" alt="SecRep школа">
  </button></div>`;
  }
  function signUpPage() {
    const current3 = step();
    if (current3 === "tariffs") {
      return tariffsStep();
    }
    if (current3 === "reg1") {
      return reg1Step();
    }
    if (current3 === "reg2") {
      return reg2Step();
    }
    if (current3 === "reg3") {
      return reg3Step();
    }
    if (current3 === "welcome") {
      return welcomeStep();
    }
    return roleStep();
  }
  function afterSignUpRender() {
    const current3 = step();
    if (current3 === "reg2" && resendLeft === RESEND_SECONDS) {
      startResendTimer();
    }
    if (current3 === "reg3") {
      bindLogoInput();
    }
    window.clearTimeout(welcomeTimer);
    if (current3 === "welcome") {
      welcomeTimer = window.setTimeout(() => {
        if (step() === "welcome") {
          goTo({ page: "home" });
        }
      }, 2600);
    }
  }

  // src/components/ProtoNav.ts
  var open = false;
  onClick("protoNavToggle", () => {
    open = !open;
    requestRender();
  });
  onClick("protoSkipSignup", () => {
    open = false;
    goTo({ page: "home" });
  });
  onClick("protoNavGo", (el) => {
    open = false;
    closeAllPanels();
    const key = el.dataset.key;
    if (key === "signup") {
      resetSignUp();
      goTo({ page: "signup", step: "role" });
      return;
    }
    if (key === "home") {
      goTo({ page: "home" });
      return;
    }
    if (key === "tutor") {
      goTo({ page: "staff", view: "tutor", teacherId: 1 });
      return;
    }
    if (key === "student") {
      goTo({ page: "students", view: "student", studentId: 101 });
      return;
    }
    if (key === "students") {
      goTo({ page: "students", view: "list" });
      return;
    }
    if (key === "schedule") {
      goTo({ page: "schedule" });
      return;
    }
    goTo({ page: "staff", view: "list" });
  });
  var ITEMS = [
    ["signup", `Регистрация школы с${NBSP}начала`],
    ["home", "Главная"],
    ["staff", "Сотрудники"],
    ["tutor", "Развернутая карточка учителя"],
    ["students", "Ученики"],
    ["student", "Страница ученика"],
    ["schedule", "Расписание"]
  ];
  function protoNav() {
    const menu = open ? `<div class="proto-nav-menu">${ITEMS.map(([key, text]) => `<button type="button" data-click="protoNavGo" data-key="${key}">${text}</button>`).join("")}</div>` : "";
    const skip = route().page === "signup" ? `<button type="button" class="proto-skip" data-click="protoSkipSignup">Пропустить регистрацию →</button>` : "";
    return `${skip}<div class="proto-nav">${menu}<button type="button" class="proto-nav-toggle" data-click="protoNavToggle">Прототип · экраны</button></div>`;
  }

  // src/components/avatars.ts
  function avatarCircle(name, options = {}) {
    const size = options.size ?? "l";
    const badge = options.telegram === void 0 || options.telegram === null ? "" : `<span class="avatar-badge ${options.telegram ? "on" : ""}">${telegramBadgeSvg()}</span>`;
    return `<span class="avatar avatar-${size}">${esc(initials(name))}${badge}</span>`;
  }
  function studentAvatarCircle(name, connected, size = "l") {
    return avatarCircle(name, { size, telegram: connected });
  }
  function tutorAvatarCircle(name, connected, size = "l") {
    return avatarCircle(name, { size, telegram: connected });
  }
  function groupAvatarCircles(names) {
    const shown = names.slice(0, 2).map((name) => avatarCircle(name, { size: "m" })).join("");
    const rest = names.length > 2 ? `<span class="avatar avatar-m avatar-more">+${names.length - 2}</span>` : "";
    return `<span class="group-avatars">${shown}${rest}</span>`;
  }
  function groupAvatarPlaceholder() {
    return `<span class="avatar avatar-l avatar-group">${userSvg()}</span>`;
  }

  // src/components/Page.ts
  var menuCollapsed = false;
  var MENU = [
    { key: "home", text: "Главная", icon: () => houseSvg() },
    { key: "staff", text: "Сотрудники", icon: () => userSvg({ size: 18 }) },
    { key: "students", text: "Ученики", icon: () => userSvg({ size: 18 }) },
    { key: "schedule", text: "Расписание", icon: () => calendarSmallSvg() },
    { key: "notifications", text: "Уведомления", icon: () => bellSmallSvg() }
  ];
  var BOTTOM_MENU = [
    { key: "home", icon: () => houseSvg({ size: 24 }) },
    { key: "staff", icon: () => userSvg() },
    { key: "schedule", icon: () => calendarSvg() },
    { key: "students", icon: () => graduationHatSvg({ size: 40 }) }
  ];
  var SECTION_NAMES = { home: "Главная", notifications: "Уведомления", pay: "Пэй" };
  var notificationTab = "admin";
  var notificationSettings = {
    adminTeacherJoined: true,
    adminTeacherBot: true,
    adminScheduleChanged: true,
    teacherUpcoming: true,
    teacherRescheduled: true,
    teacherCancelled: true,
    studentUpcoming: true,
    studentRescheduled: true,
    studentCancelled: true
  };
  onClick("menuGo", (el) => {
    const key = dataOf(el, "key");
    if (key === "home") {
      goTo({ page: "home" });
      return;
    }
    if (key === "staff") {
      goTo({ page: "staff", view: "list" });
      return;
    }
    if (key === "students") {
      goTo({ page: "students", view: "list" });
      return;
    }
    if (key === "schedule") {
      goTo({ page: "schedule" });
      return;
    }
    if (key === "notifications") {
      goTo({ page: "notifications" });
      return;
    }
    showInfo(`Раздел «${SECTION_NAMES[key] ?? key}» в${NBSP}эту секцию макетов не${NBSP}входит`);
  });
  onClick("notificationToggle", (el) => {
    const key = dataOf(el, "key");
    if (!(key in notificationSettings)) return;
    notificationSettings[key] = !notificationSettings[key];
    requestRender();
  });
  onClick("notificationTab", (el) => {
    notificationTab = dataOf(el, "key");
    requestRender();
  });
  onClick("notificationPaymentPreview", (el) => {
    const student2 = studentById(Number(dataOf(el, "id")));
    if (!student2 || !student2.connected) return;
    openPanel("notification-payment-preview", () => ({
      title: "Напомнить об оплате",
      narrow: true,
      body: `<div class="notification-settings-stack"><p>Получатель: <strong>${esc(student2.name)}</strong></p><p>Школа: ${esc(schoolData()?.name ?? "")}</p><p class="form-hint">Демонстрация отправки. Прототип не отправляет реальные сообщения.</p><div class="notification-settings">${esc(notificationPaymentText(student2))}</div></div>`,
      foot: `${kitButtonBlack({ text: "Отправить напоминание", click: "notificationPaymentSend", data: { id: student2.id }, full: true })}${kitButtonWhite({ text: "Отменить", click: "panelClose", full: true })}`
    }));
  });
  onClick("notificationPaymentSend", async (el) => {
    const studentId = Number(dataOf(el, "id"));
    const student2 = studentById(studentId);
    if (!student2 || !student2.connected) {
      showInfo("Отправка недоступна: ученик не подключён к SecRep");
      return;
    }
    const { success } = await api("school/student_payment_reminder_send", { studentId });
    if (success) {
      closeAllPanels();
      showSuccess("Демонстрация: напоминание об оплате отправлено");
    } else {
      showInfo("Не удалось отправить напоминание. Попробуйте ещё раз");
    }
  });
  onClick("notificationAction", (el) => {
    if (dataOf(el, "key") === "payment") {
      openNotificationPaymentPanel();
      return;
    }
    showInfo("Уведомления относятся к занятиям выбранной школы. Преподаватели получают сообщения по своим занятиям, ученики — по занятиям, в которых участвуют. Для получения сообщений нужен подключённый канал SecRep. В прототипе настройки демонстрационные.");
  });
  onClick("menuCollapse", () => {
    menuCollapsed = !menuCollapsed;
    requestRender();
  });
  onClick("pageStub", (el) => {
    showInfo(dataOf(el, "text"));
  });
  function sideMenu(active) {
    const schoolName = schoolData()?.name ?? "";
    return `<aside class="side-menu ${menuCollapsed ? "collapsed" : ""}">
    <div class="side-menu-logo"><img src="assets/logo_school.png" alt="SecRep школы">${kitIconButton({ icon: chevronDoubleLeftSvg(), click: "menuCollapse", naked: true, small: true, title: "Свернуть меню" })}</div>
    ${MENU.map((item) => `<button type="button" class="side-menu-item ${item.key === active ? "active" : ""}" data-click="menuGo" data-key="${item.key}">${item.icon()}<span>${item.text}</span></button>`).join("")}
    <div class="side-menu-label">Активировать бота</div>
    <div class="side-menu-bots"><span class="side-menu-bot telegram">${telegramPlaneSvg()}</span><span class="side-menu-bot vk">${vkLogoSvg()}</span></div>
    <button type="button" class="side-menu-row" data-click="pageStub" data-text="Раздел «Другое» как в базовом SecRep"><span>Другое</span>${chevronRightSvg()}</button>
    <div class="side-menu-label">Режим</div>
    <div class="side-menu-row" role="button" tabindex="0" data-click="pageStub" data-text="Режим учителя собираем отдельно"><span>Учитель</span>${modernSwitcher(false)}</div>
    <div class="side-menu-label">Рабочее пространство</div>
    <button type="button" class="side-menu-workspace" data-click="pageStub" data-text="Переключатель пространств пока не нарисован"><span>${esc(schoolName)}</span>${chevronRightSvg()}</button>
  </aside>`;
  }
  function bottomMenu(active) {
    return `<nav class="bottom-menu">${BOTTOM_MENU.map((item) => `<button type="button" class="${item.key === active ? "active" : ""}" data-click="menuGo" data-key="${item.key}">${item.icon()}</button>`).join("")}</nav>`;
  }
  function page(props) {
    const me = avatarCircle("Администратор", { size: "l" });
    const desktop = isDesktop();
    return `<div class="page">
    ${desktop ? `<div class="page-top">${props.hideTopTitle ? "" : props.headerHeading ? `<h1 class="page-top-title notification-top-title">${esc(props.title)}</h1>` : `<span class="page-top-title">${esc(props.title)}</span>`}<button type="button" class="page-top-me" data-click="accountOpen" aria-label="Открыть меню аккаунта" aria-haspopup="dialog">${me}${chevronDownSvg({ size: 24 })}</button></div>` : `<div class="page-top"><button type="button" class="page-top-me" data-click="accountOpen" aria-label="Открыть меню аккаунта" aria-haspopup="dialog">${me}</button>${kitIconButton({ icon: bellSvg(), click: "menuGo", data: { key: "notifications" }, title: "Уведомления" })}</div>`}
    <div class="page-body">
      ${desktop ? sideMenu(props.activeMenu) : ""}
      <main class="page-content" ${props.mainLabel ? `aria-label="${esc(props.mainLabel)}"` : ""}>${props.content}</main>
    </div>
    ${desktop || props.hideBottomMenu ? "" : bottomMenu(props.activeMenu)}
  </div>`;
  }

  // Account menu and school subscription. Demo state stays separate from signup.
  var accountMenuOpen = false;
  var accountReturnFocus = null;
  var demoSubscriptionPayments = [];
  var selectedSchoolPlan = null;
  var subscriptionPaymentState = "review";
  onClick("accountOpen", () => {
    accountReturnFocus = document.activeElement;
    accountMenuOpen = true;
    requestRender();
  });
  function closeAccountMenu() {
    accountMenuOpen = false;
    const dialog = document.getElementById("account-dialog");
    if (dialog?.open) dialog.close();
    document.querySelector('[data-click="accountOpen"]')?.focus();
  }
  onClick("accountClose", closeAccountMenu);
  onClick("accountBackdrop", (el, event) => {
    if (event.target === el) closeAccountMenu();
  });
  onClick("accountSubscription", () => {
    closeAccountMenu();
    closeAllPanels();
    goTo({ page: "subscription" });
  });
  onClick("accountProfile", () => {
    closeAccountMenu();
    openPanel("account-profile", () => ({ title: "Данные профиля", narrow: true,
      body: `<div class="account-detail-list"><h2>Администратор</h2><p>admin@example.com</p><p>Рабочее пространство: ${esc(schoolData()?.name ?? "")}</p><p class="form-hint">Демонстрационный профиль. Контакты заменены на тестовые.</p></div>` }));
  });
  onClick("accountPayments", () => {
    closeAccountMenu();
    openPanel("account-payments", () => ({ title: "Платежи", narrow: true,
      body: `<div class="account-detail-list"><p>Подписка школы «${esc(schoolData()?.name ?? "") }»</p>${demoSubscriptionPayments.length ? demoSubscriptionPayments.map(payment => `<div class="subscription-payment-row"><strong>${esc(payment.plan)}</strong><span>${moneyToString(payment.amount)}</span><small>Демонстрационная оплата · ${esc(payment.date)}</small></div>`).join("") : `<p>Пока нет платежей</p><p class="form-hint">Здесь появятся демонстрационные оплаты, выполненные в прототипе.</p>`}</div>` }));
  });
  onClick("accountSessions", () => {
    closeAccountMenu();
    openPanel("account-sessions", () => ({ title: "Управление сессиями", narrow: true,
      body: `<div class="account-detail-list"><h2>Текущая сессия</h2><p>Демонстрационный прототип</p><p class="form-hint">Реальные сессии аккаунта к прототипу не подключены.</p></div>` }));
  });
  onClick("accountLogout", () => {
    closeAccountMenu(); closeAllPanels(); goTo({ page: "signup", step: "role" });
  });
  function accountMenuHtml() {
    if (!accountMenuOpen) return "";
    return `<dialog id="account-dialog" class="account-dialog" aria-label="Настройки аккаунта" data-click="accountBackdrop"><section class="account-menu"><div class="account-menu-heading"><div><strong>Настройки аккаунта:<br>admin@example.com</strong><p>Подписка школы: ${esc(schoolData()?.tariffName ?? "")}</p></div>${kitIconButton({ icon: crossSvg({ size: 24 }), click: "accountClose", title: "Закрыть меню", naked: true, small: true })}</div><div class="account-menu-items"><button type="button" data-click="accountProfile">Данные профиля</button><button type="button" data-click="accountSubscription">Управление подпиской</button><button type="button" data-click="accountPayments">Платежи</button><button type="button" data-click="accountSessions">Управление сессиями</button><button type="button" class="account-theme-row" disabled title="Тёмная тема пока недоступна"><span>Тёмная тема<small>Пока недоступна</small></span>${modernSwitcher(false)}</button></div><button type="button" class="account-logout" data-click="accountLogout">${chevronLeftSvg({ size: 24 })}<span>Выйти из аккаунта</span></button></section></dialog>`;
  }
  function schoolPlanFeatures() {
    return ["Общий календарь школы", "Сотрудники, ученики и группы", "Индивидуальные и групповые занятия", "Уведомления о занятиях", "Ручные напоминания об оплате"];
  }
  onClick("subscriptionChoose", el => {
    const plan = TARIFFS.find(item => item.key === dataOf(el, "key"));
    if (!plan || plan.limit < activeTeachers().length) {
      showInfo("На этом тарифе недостаточно мест для преподавателей школы"); return;
    }
    selectedSchoolPlan = plan;
    subscriptionPaymentState = "review";
    openPanel("school-subscription-payment", schoolSubscriptionPaymentPanel);
  });
  function schoolSubscriptionPaymentPanel() {
    const plan = selectedSchoolPlan;
    const failed = subscriptionPaymentState === "failed";
    const pending = subscriptionPaymentState === "pending";
    return { title: "Оплата подписки школы", narrow: true,
      body: `<div class="account-detail-list"><p class="subscription-demo-note">Демонстрационная оплата — деньги не списываются</p><h2>${esc(plan.name)}</h2><p>Школа: ${esc(schoolData()?.name ?? "")}</p><div class="subscription-summary-line"><span>Период</span><strong>1 месяц</strong></div><div class="subscription-summary-line"><span>К оплате</span><strong>${moneyToString(plan.price)}</strong></div><p>До ${plan.limit} преподавателей</p><p class="form-hint">Цены и лимиты демонстрационные. Автопродление не подключено.</p>${pending ? `<p role="status">Ожидаем подтверждения оплаты. Текущий тариф продолжает действовать.</p>` : failed ? `<p role="alert" class="subscription-error">Оплата не прошла. Текущий тариф сохранён. Можно повторить попытку.</p>` : `<p>Новый тариф будет применён только после подтверждения оплаты.</p>`}</div>`,
      foot: pending ? `${kitButtonDarkViolet({ text: "Подтвердить демооплату", click: "subscriptionPaid", full: true })}${kitButtonWhite({ text: "Показать ошибку оплаты", click: "subscriptionFail", full: true })}${kitButtonWhite({ text: "Отменить", click: "panelClose", full: true })}` : `${kitButtonDarkViolet({ text: failed ? "Повторить демооплату" : "Перейти к демооплате", click: "subscriptionPay", full: true })}${kitButtonWhite({ text: "Отменить", click: "panelClose", full: true })}` };
  }
  onClick("subscriptionPay", () => { subscriptionPaymentState = "pending"; requestRender(); });
  onClick("subscriptionFail", () => { subscriptionPaymentState = "failed"; requestRender(); });
  onClick("subscriptionPaid", async () => {
    if (subscriptionPaymentState !== "pending" || !selectedSchoolPlan) return;
    const plan = selectedSchoolPlan;
    if (activeTeachers().length > plan.limit) { showInfo("Недостаточно мест на выбранном тарифе"); return; }
    subscriptionPaymentState = "paid";
    db.school.tariffName = plan.name;
    db.school.teachersLimit = plan.limit;
    demoSubscriptionPayments.unshift({ plan: plan.name, amount: plan.price, date: new Date().toLocaleDateString("ru-RU") });
    await loadSchool();
    closeAllPanels();
    showSuccess("Демонстрация: подписка школы обновлена");
  });
  function subscriptionPage() {
    const currentPlan = TARIFFS.find(plan => plan.name === schoolData()?.tariffName) ?? TARIFFS[0];
    const occupied = activeTeachers().length;
    return page({ title: "Управление подпиской", headerHeading: false, mainLabel: "Управление подпиской", hideBottomMenu: true,
      content: `<div class="subscription-page"><header class="subscription-heading"><h1>Подписка школы</h1><p>${esc(schoolData()?.name ?? "")}</p></header><section class="subscription-current" aria-label="Текущая подписка"><div><span class="subscription-current-label">Текущий тариф</span><h2>${esc(currentPlan.name)}</h2><p>${occupied} из ${schoolData()?.teachersLimit ?? currentPlan.limit} мест для преподавателей занято</p></div><div><strong>${moneyToString(currentPlan.price)} / месяц</strong><p>Демонстрационная подписка</p></div></section><p class="subscription-demo-note">Цены, лимиты и условия на этой странице демонстрационные и требуют согласования. Личная подписка SecRep учитывается отдельно.</p><section class="subscription-plans" aria-label="Школьные тарифы">${TARIFFS.map(plan => {
        const current = plan.key === currentPlan.key;
        const tooSmall = plan.limit < occupied;
        return `<article class="subscription-plan ${current ? "current" : ""}"><div class="subscription-plan-label">${current ? "Ваш текущий тариф" : "Для школы"}</div><div class="subscription-plan-head"><h2>${esc(plan.name)}</h2><p class="subscription-price">${moneyToString(plan.price)}</p><p>за 1 месяц</p><p>До ${plan.limit} преподавателей</p><p class="form-hint">Демонстрационный лимит</p>${current ? kitButtonWhite({ text: "Текущий тариф", disabled: true, full: true }) : kitButtonDarkViolet({ text: tooSmall ? "Недостаточно мест" : "Выбрать тариф", click: "subscriptionChoose", data: { key: plan.key }, disabled: tooSmall, full: true })}${tooSmall ? `<p class="form-hint">В школе ${occupied} преподавателей — нужен тариф с большим лимитом.</p>` : ""}</div><div class="subscription-plan-features"><h3>Для работы школы</h3><ul>${schoolPlanFeatures().map(text => `<li>${chevronRightSvg({ size: 20 })}<span>${text}</span></li>`).join("")}</ul></div></article>`;
      }).join("")}</section><section class="subscription-comparison"><h2>В чём разница тарифов?</h2><p>В этом прототипе тарифы различаются демонстрационным лимитом преподавателей. Функциональные ограничения школьных тарифов ещё не утверждены.</p><div class="subscription-compare-grid">${TARIFFS.map(plan => `<div><strong>${esc(plan.name)}</strong><span>До ${plan.limit} преподавателей</span></div>`).join("")}</div></section></div>` });
  }

  // src/pages/staff/common/teacherForm.ts
  var activeRate = null;
  var activeAccess = null;
  function bindTeacherDraft(rate, access) {
    activeRate = rate;
    activeAccess = access;
  }
  onInput("teacherRateField", (el) => {
    if (!activeRate || !(el instanceof HTMLInputElement)) {
      return;
    }
    const field = dataOf(el, "field");
    if (field === "rate" || field === "rateMinutes" || field === "currencyCode" || field === "commissionValue") {
      activeRate[field] = el.value;
    }
    el.closest(".kit-input")?.classList.toggle("filled", el.value !== "");
  });
  onClick("teacherCommissionType", (el) => {
    if (!activeRate) {
      return;
    }
    activeRate.commissionType = dataOf(el, "key") === "fixed" ? "fixed" : "percent";
    requestRender();
  });
  onClick("teacherRoleToggle", () => {
    if (!activeAccess) {
      return;
    }
    activeAccess.role = activeAccess.role === "admin" ? "teacher" : "admin";
    requestRender();
  });
  onClick("teacherAccessToggle", (el) => {
    if (!activeAccess) {
      return;
    }
    const key = dataOf(el, "key");
    if (key === "canAddStudents" || key === "canAddLessons") {
      activeAccess[key] = !activeAccess[key];
    }
    requestRender();
  });
  function rateDraftOf(teacher2) {
    return { rate: String(teacher2.rate), rateMinutes: String(teacher2.rateMinutes), currencyCode: teacher2.currencyCode, commissionType: teacher2.commissionType, commissionValue: String(teacher2.commissionValue) };
  }
  function rateBlock(draft7, hint = "") {
    const commissionInput = (type) => numberInput({ label: type === "percent" ? "%" : "₽", value: draft7.commissionValue, input: "teacherRateField", field: "commissionValue", maxlength: type === "percent" ? 3 : PRICE_MAX_LENGTH, center: true });
    return `<div class="form-section">
      <h4>Ставка учителя</h4>${hint ? `<div class="form-hint">${hint}</div>` : ""}
      <div class="form-row-fields">
        ${numberInput({ label: "Стоимость*", filledLabel: "Стоимость", value: draft7.rate, input: "teacherRateField", field: "rate", maxlength: PRICE_MAX_LENGTH, grow: true })}
        <span class="form-word">за</span>
        ${numberInput({ label: "минут", value: draft7.rateMinutes, input: "teacherRateField", field: "rateMinutes", maxlength: MINUTES_MAX_LENGTH, grow: true })}
        ${input({ label: "Валюта*", filledLabel: "Валюта", value: draft7.currencyCode, input: "teacherRateField", field: "currencyCode", maxlength: CURRENCY_MAX_LENGTH, grow: true })}
      </div>
    </div>
    <div class="form-section">
      <h4>Комиссия школы</h4>
      ${switcherRow({ click: "teacherCommissionType", data: { key: "percent" }, controlFirst: true, control: radio(draft7.commissionType === "percent"), content: draft7.commissionType === "percent" ? `<span class="form-inline">${commissionInput("percent")}<span>от${NBSP}стоимости занятия</span></span>` : `Процент от${NBSP}ставки` })}
      ${switcherRow({ click: "teacherCommissionType", data: { key: "fixed" }, controlFirst: true, control: radio(draft7.commissionType === "fixed"), content: draft7.commissionType === "fixed" ? `<span class="form-inline">${commissionInput("fixed")}<span>за${NBSP}занятие</span></span>` : "Фиксированная сумма" })}
    </div>`;
  }
  function accessBlock(draft7) {
    const roleText = draft7.role === "admin" ? "Админ" : "Учитель";
    const hint = draft7.role === "admin" ? `Админ видит всю школу и${NBSP}может преподавать` : `Учитель видит только свое расписание и${NBSP}своих учеников`;
    return `<div class="form-section">
    <div class="form-access-row"><div><div class="form-label-strong">Уровень доступа</div><div class="form-hint">${hint}</div></div>
      <button type="button" class="select-button" data-click="teacherRoleToggle"><span>${esc(roleText)}</span>${chevronRightSvg({ size: 24 })}</button></div>
    ${switcherRow({ click: "teacherAccessToggle", data: { key: "canAddStudents" }, content: '<span class="form-label-strong">Разрешить учителю добавлять учеников</span>', control: modernSwitcher(draft7.canAddStudents) })}
    ${switcherRow({ click: "teacherAccessToggle", data: { key: "canAddLessons" }, content: '<span class="form-label-strong">Разрешить учителю добавлять уроки</span>', control: modernSwitcher(draft7.canAddLessons) })}
  </div>`;
  }
  function rateRequest(draft7) {
    return { rate: Number(draft7.rate), rateMinutes: Number(draft7.rateMinutes || 60), currencyCode: draft7.currencyCode.trim(), commissionType: draft7.commissionType, commissionValue: Number(draft7.commissionValue || 0) };
  }
  function isRateDraftValid(draft7) {
    return Number(draft7.rate) > 0 && Number(draft7.rateMinutes || 60) > 0 && draft7.currencyCode.trim().length > 0 && Number(draft7.commissionValue || 0) >= 0;
  }
  onClick("teacherInvite", async (el) => {
    const { success, resp } = await api("school/teacher_invite_link_get", { id: Number(dataOf(el, "id")) });
    if (!success) {
      return;
    }
    try {
      await navigator.clipboard.writeText(resp.link);
    } catch {
    }
    showSuccess(`Ссылка-приглашение скопирована: ${resp.link}`);
    await loadTeachers();
  });
  function teacherStatusLine(teacher2) {
    if (teacher2.connected) {
      return `<div class="status-connected">Подключен к${NBSP}SecRep</div>`;
    }
    if (teacher2.invited) {
      return `<div class="status-connected">Приглашен <button type="button" class="status-invite" data-click="teacherInvite" data-id="${teacher2.id}">скопировать ссылку</button></div>`;
    }
    return `<button type="button" class="status-invite" data-click="teacherInvite" data-id="${teacher2.id}">Пригласить в${NBSP}SecRep</button>`;
  }
  function roleTag(role) {
    return `<span class="role-tag ${role}">${role === "admin" ? "Админ" : "Учитель"}</span>`;
  }

  // src/pages/staff/AddTeacherPanel.ts
  var LESSON_COLORS = ["magenta", "lavender", "sky", "yellow", "peach", "pink", "blue", "lime"];
  var draft = null;
  function fullName(value) {
    return `${value.firstName.trim()} ${value.lastName.trim()}`.trim();
  }
  function emptyDraft() {
    return {
      firstName: "",
      lastName: "",
      subject: "",
      phone: "",
      telegram: "",
      source: "",
      comment: "",
      colorId: "magenta",
      rate: { rate: "", rateMinutes: "60", currencyCode: "RUB", commissionType: "percent", commissionValue: "" },
      access: { role: "teacher", canAddStudents: true, canAddLessons: false }
    };
  }
  onInput("addTeacherField", (el) => {
    if (!draft || !(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
      return;
    }
    const field = dataOf(el, "field");
    if (field === "firstName" || field === "lastName" || field === "subject" || field === "phone" || field === "telegram" || field === "source" || field === "comment") {
      draft[field] = el.value;
    }
    el.closest(".kit-input")?.classList.toggle("filled", el.value !== "");
  });
  onClick("addTeacherColor", (el) => {
    if (!draft) {
      return;
    }
    draft.colorId = dataOf(el, "key");
    requestRender();
  });
  onClick("addTeacherSave", async () => {
    if (!draft) {
      return;
    }
    const { success, resp } = await api("school/teacher_add", {
      firstName: draft.firstName,
      lastName: draft.lastName,
      subject: draft.subject,
      phone: draft.phone,
      telegram: draft.telegram,
      source: draft.source,
      comment: draft.comment,
      colorId: draft.colorId,
      role: draft.access.role,
      canAddStudents: draft.access.canAddStudents,
      canAddLessons: draft.access.canAddLessons,
      ...rateRequest(draft.rate)
    });
    if (!success || !resp.id) {
      return;
    }
    const name = fullName(draft);
    closeAllPanels();
    await loadTeachers();
    showSuccess(`${name} добавлен. Отправьте приглашение по${NBSP}ссылке «Пригласить в${NBSP}SecRep»`);
  });
  function colorPicker(active, click) {
    return `<div class="color-picker">${LESSON_COLORS.map((color) => `<button type="button" class="color-swatch ${color === active ? "active" : ""}" style="--swatch:var(--lesson-${color}-dot)" data-click="${click}" data-key="${color}" aria-label="Цвет"></button>`).join("")}</div>`;
  }
  function render() {
    const current3 = draft ?? emptyDraft();
    draft = current3;
    bindTeacherDraft(current3.rate, current3.access);
    const valid = current3.firstName.trim().length > 0 && isRateDraftValid(current3.rate);
    return {
      title: "Добавить учителя",
      body: `<div class="form-section"><h4>Имя учителя</h4><div class="form-name-row">${input({ label: "Имя*", filledLabel: "Имя", value: current3.firstName, input: "addTeacherField", field: "firstName", maxlength: NAME_MAX_LENGTH })}${input({ label: "Фамилия", value: current3.lastName, input: "addTeacherField", field: "lastName", maxlength: NAME_MAX_LENGTH })}</div></div>
      ${rateBlock(current3.rate)}
      ${accessBlock(current3.access)}
      <div class="form-section">
        <div class="form-title-icon">${questionCircleSvg()}<span>Дополнительная информация</span></div>
        <div class="form-hint-main">Цвет занятий в${NBSP}расписании</div>
        ${colorPicker(current3.colorId, "addTeacherColor")}
        ${input({ label: "Предмет", value: current3.subject, input: "addTeacherField", field: "subject", maxlength: NAME_MAX_LENGTH })}
        ${input({ label: "Телефон", value: current3.phone, input: "addTeacherField", field: "phone", maxlength: PHONE_MAX_LENGTH, inputmode: "tel", type: "tel" })}
        ${input({ label: "Telegram (или иное)", filledLabel: "Telegram", value: current3.telegram, input: "addTeacherField", field: "telegram", maxlength: LINK_MAX_LENGTH })}
        ${input({ label: "Откуда появился", value: current3.source, input: "addTeacherField", field: "source", maxlength: LINK_MAX_LENGTH })}
        ${textArea({ label: "Доп. информация", filledLabel: "Доп. информация", value: current3.comment, input: "addTeacherField", field: "comment", charsLimit: TEXTAREA_MAX_LENGTH })}
      </div>`,
      foot: `${kitButtonBlack({ text: "Добавить учителя", click: "addTeacherSave", secure: true, disabled: !valid, full: true })}${kitButtonWhite({ text: "Отменить", click: "panelClose", full: true })}`
    };
  }
  function openAddTeacherPanel() {
    draft = emptyDraft();
    openPanel("addTeacher", render);
  }
  afterAnyInput(() => {
    const button = document.querySelector('[data-click="addTeacherSave"]');
    if (button && draft) {
      button.disabled = !(draft.firstName.trim().length > 0 && isRateDraftValid(draft.rate));
    }
  });

  // src/pages/schedule/common/dateTimeFields.ts
  function dateTimeFields(draft7, inputName) {
    return `<div class="form-row"><span>Начало</span><span class="form-row-fields">
      ${input({ label: "Дата", value: draft7.date, input: inputName, field: "date", maxlength: DATE_MAX_LENGTH, center: true, grow: true })}
      ${input({ label: "Время", value: draft7.start, input: inputName, field: "start", maxlength: TIME_MAX_LENGTH, center: true })}
    </span></div>
    <div class="form-row"><span>Конец</span><span class="form-row-fields">
      ${input({ label: "Дата", value: draft7.date, input: inputName, field: "date", maxlength: DATE_MAX_LENGTH, center: true, grow: true })}
      ${input({ label: "Время", value: draft7.end, input: inputName, field: "end", maxlength: TIME_MAX_LENGTH, center: true })}
    </span></div>`;
  }
  function applyDateTimeInput(draft7, el) {
    if (!(el instanceof HTMLInputElement)) {
      return false;
    }
    const field = el.dataset.field;
    if (field === "date" || field === "start" || field === "end") {
      draft7[field] = el.value;
      el.closest(".kit-input")?.classList.toggle("filled", el.value !== "");
      return true;
    }
    return false;
  }

  // src/pages/schedule/common/scheduleState.ts
  var MODE_NAMES = { lessons: "Занятия", deals: "Дела", windows: "Окна" };
  var state = { weekOffset: 0, mode: "lessons", modeOpen: false, editTeacherId: null, editWindows: [], windowMinutes: 60 };
  function scheduleState() {
    return state;
  }
  function weekStart() {
    return addDays(DEMO_WEEK_START, state.weekOffset * 7);
  }
  function shiftWeek(delta) {
    state.weekOffset += delta;
    requestRender();
  }
  function showWeekOf(date) {
    state.weekOffset = Math.floor((date.getTime() - DEMO_WEEK_START.getTime()) / (7 * 24 * 3600 * 1e3));
  }
  function setMode(mode) {
    state.mode = mode;
    state.modeOpen = false;
    state.editTeacherId = null;
    requestRender();
  }
  function toggleModeMenu(open2 = !state.modeOpen) {
    state.modeOpen = open2;
    requestRender();
  }
  function windowsOf(teacherId2) {
    return teacherWindowsData().filter((w) => w.teacherId === teacherId2).map((w) => ({ startMoment: w.startMoment, endMoment: w.endMoment }));
  }
  function startEditWindows(teacherId2, minutes) {
    const id = teacherId2 ?? state.editTeacherId ?? activeTeachers()[0]?.id ?? null;
    if (id === null) {
      return;
    }
    state.mode = "windows";
    state.editTeacherId = id;
    state.editWindows = windowsOf(id);
    state.windowMinutes = minutes;
    requestRender();
  }
  function switchEditTeacher(teacherId2) {
    state.editTeacherId = teacherId2;
    state.editWindows = windowsOf(teacherId2);
    requestRender();
  }
  function cancelEditWindows() {
    state.editTeacherId = null;
    state.editWindows = [];
    requestRender();
  }
  function toggleWindowAt(day, hour) {
    const slotStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour);
    const existing = state.editWindows.findIndex((w) => sameDay(w.startMoment, slotStart) && w.startMoment <= slotStart && w.endMoment > slotStart);
    if (existing >= 0) {
      state.editWindows = state.editWindows.filter((_, index) => index !== existing);
    } else {
      state.editWindows = [...state.editWindows, { startMoment: slotStart, endMoment: addMinutes(slotStart, state.windowMinutes) }];
    }
    requestRender();
  }
  function removeWindow(index) {
    state.editWindows = state.editWindows.filter((_, i) => i !== index);
    requestRender();
  }
  async function saveEditWindows() {
    if (state.editTeacherId === null) {
      return;
    }
    const { success } = await api("school/teacher_windows_set", {
      teacherId: state.editTeacherId,
      windows: state.editWindows.map((w) => ({ startMoment: w.startMoment.toISOString(), endMoment: w.endMoment.toISOString() }))
    });
    if (!success) {
      return;
    }
    await loadTeacherWindows();
    state.editTeacherId = null;
    state.editWindows = [];
    requestRender();
    showSuccess(`Окна сохранены. Ученики увидят их при${NBSP}записи`);
  }

  // src/pages/schedule/AddDealPanel/AddDealPanel.ts
  var draft2 = emptyDraft2();
  function emptyDraft2() {
    return { title: "", date: "03.10.2026", start: "12:00", end: "13:00", repeatWeekly: false, showAll: true, teacherIds: /* @__PURE__ */ new Set(), colorId: "peach" };
  }
  onInput("dealField", (el) => {
    if (applyDateTimeInput(draft2, el)) {
      return;
    }
    if (el instanceof HTMLInputElement && dataOf(el, "field") === "title") {
      draft2.title = el.value;
      el.closest(".kit-input")?.classList.toggle("filled", el.value !== "");
    }
  });
  afterAnyInput(() => {
    const button = document.querySelector('[data-click="dealSave"]');
    if (button) {
      button.disabled = !draft2.title.trim();
    }
  });
  onClick("dealRepeat", () => {
    draft2.repeatWeekly = !draft2.repeatWeekly;
    requestRender();
  });
  onClick("dealShowAll", () => {
    draft2.showAll = !draft2.showAll;
    draft2.teacherIds = /* @__PURE__ */ new Set();
    requestRender();
  });
  onClick("dealShowTeacher", (el) => {
    const id = Number(dataOf(el, "id"));
    const next = new Set(draft2.showAll ? activeTeachers().map((t) => t.id) : draft2.teacherIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    draft2.showAll = false;
    draft2.teacherIds = next;
    requestRender();
  });
  onClick("dealColor", (el) => {
    draft2.colorId = dataOf(el, "key");
    requestRender();
  });
  onClick("dealSave", async () => {
    const start2 = parseDateTime(draft2.date, draft2.start);
    const end = parseDateTime(draft2.date, draft2.end);
    if (!start2 || !end || end <= start2) {
      showError(`Проверьте дату и${NBSP}время`);
      return;
    }
    const { success } = await api("school/deal_add", {
      title: draft2.title,
      startMoment: start2.toISOString(),
      endMoment: end.toISOString(),
      repeatWeekly: draft2.repeatWeekly,
      teacherIds: draft2.showAll ? [] : Array.from(draft2.teacherIds),
      colorId: draft2.colorId
    });
    if (!success) {
      return;
    }
    await loadDeals();
    closeAllPanels();
    showWeekOf(start2);
    setMode("deals");
    showSuccess("Дело добавлено");
  });
  function openAddDealPanel() {
    draft2 = emptyDraft2();
    openPanel("addDeal", () => {
      const remind = (who) => `<button type="button" class="form-row form-row-button" data-click="pageStub" data-text="Настройка напоминаний как в базовом SecRep"><span>Напомнить ${who}</span><span class="form-hint">По${NBSP}умолчанию</span></button>`;
      return {
        title: "Добавить дело",
        narrow: true,
        body: `<div class="form-stack">
        ${input({ label: "Название*", filledLabel: "Название", value: draft2.title, input: "dealField", field: "title", maxlength: NAME_MAX_LENGTH })}
        ${dateTimeFields(draft2, "dealField")}
        ${switcherRow({ click: "dealRepeat", content: "Повторять", control: modernSwitcher(draft2.repeatWeekly) })}
        <h4>Кому показывать</h4>
        <div class="pick-list">
          ${switcherRow({ click: "dealShowAll", content: '<span class="pick-name">Всем</span>', control: checkbox(draft2.showAll) })}
          ${activeTeachers().map((t) => switcherRow({ click: "dealShowTeacher", data: { id: t.id }, content: `<span class="pick-person">${avatarCircle(t.name, { size: "xs" })}<span class="pick-name">${esc(t.name)}</span></span>`, control: checkbox(draft2.showAll || draft2.teacherIds.has(t.id)) })).join("")}
        </div>
        ${remind("админу")}${remind("учителям")}
        <div>Цвет</div>${colorPicker(draft2.colorId, "dealColor")}
      </div>`,
        foot: `${kitButtonBlack({ text: "Сохранить", click: "dealSave", secure: true, disabled: !draft2.title.trim(), full: true })}${kitButtonWhite({ text: "Отменить", click: "panelClose", full: true })}`
      };
    });
  }

  // src/components/tabs.ts
  function tabs(items, active, click, options = {}) {
    const classes = ["kit-tabs", options.dark ? "dark" : "", options.stretch ? "stretch" : ""].filter(Boolean).join(" ");
    return `<div class="${classes}">${items.map((item) => `<button type="button" class="${item.key === active ? "active" : ""}" data-click="${click}" data-key="${esc(item.key)}" ${dataAttrs(options.data)}>${esc(item.text)}</button>`).join("")}</div>`;
  }

  // src/stores/scheduleFilter.ts
  var teacherIds = [];
  var debtorsOnly = false;
  function scheduleTeacherIds() {
    return teacherIds;
  }
  function scheduleDebtorsOnly() {
    return debtorsOnly;
  }
  function setScheduleFilter(ids, onlyDebtors = debtorsOnly) {
    teacherIds = ids;
    debtorsOnly = onlyDebtors;
    requestRender();
  }
  function toggleScheduleTeacher(id) {
    teacherIds = teacherIds.includes(id) ? teacherIds.filter((t) => t !== id) : [...teacherIds, id];
    requestRender();
  }

  // src/pages/schedule/common/pickTeacherPanel.ts
  var onPicked = () => void 0;
  var currentId = null;
  onClick("pickTeacher", (el) => {
    const id = Number(dataOf(el, "id"));
    closeTopPanel();
    onPicked(id);
  });
  function openPickTeacherPanel(current3, picked) {
    currentId = current3;
    onPicked = picked;
    openPanel("pickTeacher", () => ({
      title: "Выбрать учителя",
      narrow: true,
      body: `<div class="pick-list">${activeTeachers().map((t) => switcherRow({ click: "pickTeacher", data: { id: t.id }, content: `<span class="pick-person">${tutorAvatarCircle(t.name, t.connected)}<span class="pick-name">${esc(t.name)}</span><span class="pick-extra">${esc(t.subject ?? "")}</span></span>`, control: radio(currentId === t.id) })).join("")}</div>`
    }));
  }

  // src/pages/schedule/AddLessonPanel/pickStudentPanel.ts
  var teacherId = 0;
  var current2 = null;
  var query = "";
  var onPicked2 = () => void 0;
  onInput("pickStudentSearch", (el) => {
    if (el instanceof HTMLInputElement) {
      query = el.value;
      requestRender();
    }
  });
  onClick("pickWho", (el) => {
    const who = { kind: dataOf(el, "kind") === "group" ? "group" : "student", id: Number(dataOf(el, "id")) };
    closeTopPanel();
    onPicked2(who);
  });
  function row(who, name, extra, avatar) {
    const checked = current2 !== null && current2.kind === who.kind && current2.id === who.id;
    return switcherRow({ click: "pickWho", data: { kind: who.kind, id: who.id }, content: `<span class="pick-person">${avatar}<span class="pick-name">${esc(name)}</span><span class="pick-extra">${extra}</span></span>`, control: radio(checked) });
  }
  function listBlock(title, rows, empty = "") {
    if (rows.length === 0 && !empty) {
      return "";
    }
    return `<div class="pick-caption">${title}</div><div class="pick-list">${rows.join("") || `<div class="form-hint">${empty}</div>`}</div>`;
  }
  function openPickStudentPanel(forTeacherId, selected2, picked) {
    teacherId = forTeacherId;
    current2 = selected2;
    query = "";
    onPicked2 = picked;
    openPanel("pickStudent", () => {
      const q = query.trim().toLowerCase();
      const match = (name) => name.toLowerCase().includes(q);
      const active = studentsData().filter((s) => !s.archived && match(s.name));
      const mine = active.filter((s) => s.teacherLinks.some((l) => l.teacherId === teacherId));
      const others = active.filter((s) => !s.teacherLinks.some((l) => l.teacherId === teacherId));
      const groups2 = groupsData().filter((g) => g.teacherId === teacherId && match(g.name));
      return {
        title: "Выбрать ученика",
        narrow: true,
        body: `${inputSearch({ value: query, input: "pickStudentSearch", id: "pick-student-search" })}
        ${listBlock("Группы", groups2.map((g) => row({ kind: "group", id: g.id }, g.name, `${g.members.length}${NBSP}${plural(g.members.length, "ученик", "ученика", "учеников")}`, groupAvatarPlaceholder())))}
        ${listBlock("Ученики учителя", mine.map((s) => row({ kind: "student", id: s.id }, s.name, `${moneyToString(s.teacherLinks.find((l) => l.teacherId === teacherId)?.price ?? s.price)}/${s.priceMinutes}${NBSP}мин`, avatarCircle(s.name, { size: "xs" }))), "Нет учеников")}
        ${listBlock("Другие ученики школы", others.map((s) => row({ kind: "student", id: s.id }, s.name, "", avatarCircle(s.name, { size: "xs" }))))}`
      };
    });
  }

  // src/pages/schedule/AddLessonPanel/AddLessonPanel.ts
  var draft3 = emptyDraft3();
  function emptyDraft3() {
    const filter = scheduleTeacherIds();
    const teacherId2 = filter.length === 1 ? filter[0] ?? null : null;
    return { lessonId: null, teacherId: teacherId2, who: null, payType: "tariff", date: "03.10.2026", start: "12:00", end: "13:00", repeatWeekly: false, extraOpen: false, colorId: teacherId2 !== null ? teacherById(teacherId2)?.colorId ?? null : null };
  }
  function canSave() {
    return draft3.teacherId !== null && draft3.who !== null;
  }
  onClick("lessonPickTeacher", () => {
    openPickTeacherPanel(draft3.teacherId, (id) => {
      if (draft3.teacherId !== id) {
        draft3.who = null;
      }
      draft3.teacherId = id;
      draft3.colorId = teacherById(id)?.colorId ?? null;
      requestRender();
    });
  });
  onClick("lessonPickWho", () => {
    if (draft3.teacherId === null) {
      return;
    }
    openPickStudentPanel(draft3.teacherId, draft3.who, (who) => {
      draft3.who = who;
      const student2 = who.kind === "student" ? studentById(who.id) : null;
      draft3.payType = student2 && student2.packages.length > 0 ? "subscription" : "tariff";
      requestRender();
    });
  });
  onClick("lessonPayType", (el) => {
    draft3.payType = dataOf(el, "key") === "subscription" ? "subscription" : "tariff";
    requestRender();
  });
  onClick("lessonRepeat", () => {
    draft3.repeatWeekly = !draft3.repeatWeekly;
    requestRender();
  });
  onClick("lessonExtra", () => {
    draft3.extraOpen = !draft3.extraOpen;
    requestRender();
  });
  onClick("lessonColor", (el) => {
    draft3.colorId = dataOf(el, "key");
    requestRender();
  });
  onInput("lessonDateTime", (el) => {
    applyDateTimeInput(draft3, el);
  });
  afterAnyInput(() => {
    const hint = document.getElementById("lesson-student-time");
    if (hint) {
      hint.textContent = `По${NBSP}часовому поясу ученика: ${draft3.date} ${draft3.start}–${draft3.end}`;
    }
  });
  onClick("lessonSave", async () => {
    const { teacherId: teacherId2, who } = draft3;
    if (teacherId2 === null || who === null) {
      return;
    }
    const start2 = parseDateTime(draft3.date, draft3.start);
    const end = parseDateTime(draft3.date, draft3.end);
    if (!start2 || !end || end <= start2) {
      showError(`Проверьте дату и${NBSP}время`);
      return;
    }
    const editing = draft3.lessonId !== null;
    const { success } = await api(editing ? "school/lesson_edit" : "school/lesson_add", {
      id: draft3.lessonId,
      teacherId: teacherId2,
      studentId: who.kind === "student" ? who.id : null,
      groupId: who.kind === "group" ? who.id : null,
      payType: draft3.payType,
      startMoment: start2.toISOString(),
      endMoment: end.toISOString(),
      repeatWeekly: draft3.repeatWeekly,
      colorId: draft3.colorId
    });
    if (!success) {
      return;
    }
    await Promise.all([loadLessons(), loadStudents()]);
    closeAllPanels();
    showWeekOf(start2);
    setMode("lessons");
    const whoName2 = who.kind === "group" ? groupById(who.id)?.name : studentById(who.id)?.name;
    showSuccess(`${editing ? "Занятие изменено" : "Занятие добавлено"}: ${teacherById(teacherId2)?.name ?? ""} · ${whoName2 ?? ""}, ${dateFull(start2)} ${timeHm(start2)}`);
  });
  function teacherRow() {
    const teacher2 = draft3.teacherId !== null ? teacherById(draft3.teacherId) : null;
    const value = teacher2 ? `<button type="button" class="form-value-button" data-click="lessonPickTeacher">${tutorAvatarCircle(teacher2.name, teacher2.connected)}<span>${esc(teacher2.name)}</span></button>` : `<button type="button" class="form-link" data-click="lessonPickTeacher">Выбрать</button>`;
    return `<div class="form-row"><span>Учитель</span>${value}</div>`;
  }
  function packageBlock(studentId) {
    const student2 = studentById(studentId);
    const pkg = student2?.packages[0];
    if (!student2 || !pkg) {
      return `<div class="lesson-no-package">У${NBSP}ученика нет абонемента. <button type="button" class="form-link" data-click="pageStub" data-text="Добавить абонемент как в базовом SecRep">Добавить</button></div>`;
    }
    return `<div class="lesson-package">
    <div class="form-label-strong">Абонемент «${esc(pkg.name)}»</div>
    <div>${pkg.total}${NBSP}${plural(pkg.total, "занятие", "занятия", "занятий")} / ${student2.priceMinutes}${NBSP}мин</div>
    <div class="lesson-package-bar"><i style="width:${pkg.used / pkg.total * 100}%"></i></div>
    <div class="form-label-strong">Осталось ${pkg.total - pkg.used}/${pkg.total}</div>
    <div>Срок действия: ${dateFull(pkg.validFrom)}–${dateFull(pkg.validTo)}</div>
  </div>`;
  }
  function whoBlock() {
    if (draft3.teacherId === null) {
      return `<div class="form-row"><span>Ученик/Группа</span><span class="form-placeholder">Выберите учителя</span></div>`;
    }
    const who = draft3.who;
    if (!who) {
      return `<div class="form-row"><span>Ученик/Группа</span><button type="button" class="form-link" data-click="lessonPickWho">Выбрать</button></div>`;
    }
    const head = `<div class="form-row"><span>Ученик/Группа</span><button type="button" class="form-link" data-click="lessonPickWho">Изменить</button></div>`;
    if (who.kind === "group") {
      const group = groupById(who.id);
      const count = group?.members.length ?? 0;
      return `${head}<div class="lesson-picked">${groupAvatarPlaceholder()}<div><div class="form-label-strong">${esc(group?.name ?? "")}</div><div class="form-hint">${count}${NBSP}${plural(count, "ученик", "ученика", "учеников")}</div></div></div>`;
    }
    const student2 = studentById(who.id);
    if (!student2) {
      return head;
    }
    const price = student2.teacherLinks.find((l) => l.teacherId === draft3.teacherId)?.price ?? student2.price;
    const pkg = student2.packages[0];
    const writeOff = draft3.payType === "subscription" && pkg ? `С${NBSP}абонемента «${esc(pkg.name)}»` : `С${NBSP}баланса по${NBSP}тарифу`;
    return `${head}
    <div class="lesson-picked">${avatarCircle(student2.name)}<div><div class="form-label-strong">${esc(student2.name)}</div><div class="form-hint">${moneyToString(price)}/${student2.priceMinutes}${NBSP}мин</div></div></div>
    <div class="form-row"><span>Списать</span><span class="form-hint">${writeOff}</span></div>
    <div class="form-row"><span>Способ оплаты</span>${tabs([{ key: "tariff", text: `По${NBSP}тарифу` }, { key: "subscription", text: `По${NBSP}абонементу` }], draft3.payType, "lessonPayType")}</div>
    ${draft3.payType === "subscription" ? packageBlock(student2.id) : ""}`;
  }
  function extraBlock() {
    const toggle = `<button type="button" class="form-row form-row-button" data-click="lessonExtra"><span>Доп. опции</span>${draft3.extraOpen ? chevronDownSvg({ size: 24 }) : chevronRightSvg({ size: 24 })}</button>`;
    if (!draft3.extraOpen) {
      return toggle;
    }
    const remind = (who) => `<button type="button" class="form-row form-row-button" data-click="pageStub" data-text="Настройка напоминаний как в базовом SecRep"><span>Напомнить ${who}</span><span class="form-hint">По${NBSP}умолчанию</span></button>`;
    return `${toggle}${remind("учителю")}${remind("ученику")}<div>Цвет</div>${colorPicker(draft3.colorId ?? "blue", "lessonColor")}`;
  }
  onClick("lessonDelete", async () => {
    if (draft3.lessonId === null) {
      return;
    }
    const { success } = await api("school/lesson_delete", { id: draft3.lessonId });
    if (!success) {
      return;
    }
    await loadLessons();
    closeAllPanels();
    showSuccess("Занятие удалено");
  });
  function pad2(value) {
    return String(value).padStart(2, "0");
  }
  function openAddLessonPanel() {
    draft3 = emptyDraft3();
    openLessonPanel();
  }
  function openEditLessonPanel(lessonId) {
    const lesson = lessonsData().find((l) => l.id === lessonId);
    if (!lesson) {
      return;
    }
    const student2 = lesson.studentId !== null ? studentById(lesson.studentId) : null;
    draft3 = {
      lessonId,
      teacherId: lesson.teacherId,
      who: lesson.groupId !== null ? { kind: "group", id: lesson.groupId } : { kind: "student", id: lesson.studentId ?? 0 },
      payType: student2 && student2.packages.length > 0 ? "subscription" : "tariff",
      date: `${pad2(lesson.startMoment.getDate())}.${pad2(lesson.startMoment.getMonth() + 1)}.${lesson.startMoment.getFullYear()}`,
      start: timeHm(lesson.startMoment),
      end: timeHm(lesson.endMoment),
      repeatWeekly: false,
      extraOpen: false,
      colorId: teacherById(lesson.teacherId)?.colorId ?? null
    };
    openLessonPanel();
  }
  function openLessonPanel() {
    openPanel("lesson", () => ({
      title: draft3.lessonId !== null ? "Редактировать занятие" : "Добавить занятие",
      headExtra: draft3.lessonId !== null ? kitIconButton({ icon: trashSvg(), click: "lessonDelete", naked: true, small: true, title: "Удалить занятие" }) : "",
      narrow: true,
      body: `<div class="form-stack">
      ${teacherRow()}
      ${whoBlock()}
      ${dateTimeFields(draft3, "lessonDateTime")}
      <div class="form-hint" id="lesson-student-time">По${NBSP}часовому поясу ученика: ${esc(draft3.date)} ${esc(draft3.start)}–${esc(draft3.end)}</div>
      ${switcherRow({ click: "lessonRepeat", content: "Повторять", control: modernSwitcher(draft3.repeatWeekly) })}
      ${draft3.repeatWeekly ? `<div class="form-hint">Каждую неделю в${NBSP}это время</div>` : ""}
      ${extraBlock()}
    </div>`,
      foot: `${kitButtonBlack({ text: "Сохранить", click: "lessonSave", secure: true, disabled: !canSave(), full: true })}${kitButtonWhite({ text: "Отменить", click: "panelClose", full: true })}`
    }));
  }

  // src/pages/home/homeData.ts
  function activeStudents() {
    return studentsData().filter((s) => !s.archived);
  }
  function moneyDebtors() {
    return activeStudents().filter((s) => s.balance < 0).map((s) => ({ student: s, amount: -s.balance })).sort((a, b) => b.amount - a.amount);
  }
  function groupDebtors() {
    const result = [];
    groupsData().forEach((group) => {
      group.members.forEach((member) => {
        const student2 = studentById(member.studentId);
        if (student2 && !student2.archived && member.lessonsBalance < 0) {
          result.push({ student: student2, groupName: group.name, lessons: -member.lessonsBalance });
        }
      });
    });
    return result;
  }
  function studentsWithEndingPackage() {
    return activeStudents().filter((s) => {
      const current3 = s.packages[0];
      return current3 ? current3.total - current3.used <= 1 : false;
    });
  }
  function studentsWithoutTeacher() {
    const inGroups = new Set(groupsData().flatMap((g) => g.members.map((m) => m.studentId)));
    return activeStudents().filter((s) => s.teacherLinks.length === 0 && !inGroups.has(s.id));
  }
  function teachersToPay() {
    return activeTeachers().filter((t) => t.stats.toPay > 0);
  }
  function commissionPerLesson2(teacher2) {
    return teacher2.commissionType === "percent" ? Math.round(teacher2.rate * teacher2.commissionValue / 100) : teacher2.commissionValue;
  }
  function whoOfLesson(lesson) {
    if (lesson.groupId !== null) {
      return groupById(lesson.groupId)?.name ?? "";
    }
    return lesson.studentId !== null ? studentById(lesson.studentId)?.name ?? "" : "";
  }
  function todayLessons() {
    const all = lessonsData().filter((l) => sameDay(l.startMoment, DEMO_TODAY)).sort((a, b) => a.startMoment.getTime() - b.startMoment.getTime());
    return {
      all,
      running: all.filter((l) => l.startMoment <= DEMO_NOW && l.endMoment > DEMO_NOW),
      ahead: all.filter((l) => l.startMoment > DEMO_NOW),
      finished: all.filter((l) => l.endMoment <= DEMO_NOW)
    };
  }
  function todayDeals() {
    return dealsData().filter((d) => sameDay(d.startMoment, DEMO_TODAY)).sort((a, b) => a.startMoment.getTime() - b.startMoment.getTime());
  }
  function weekStats() {
    const weekEnd = addDays(DEMO_WEEK_START, 7);
    const lessons2 = lessonsData().filter((l) => l.startMoment >= DEMO_WEEK_START && l.startMoment < weekEnd);
    const teachers2 = activeTeachers();
    const byTeacher = teachers2.map((teacher2) => {
      const own = lessons2.filter((l) => l.teacherId === teacher2.id);
      return { teacher: teacher2, held: own.filter((l) => l.completed).length, planned: own.length };
    });
    const held = lessons2.filter((l) => l.completed);
    const sumMinutes = (list) => list.reduce((sum, l) => sum + minutesBetween(l.startMoment, l.endMoment), 0);
    return {
      planned: lessons2.length,
      held: held.length,
      minutesPlanned: sumMinutes(lessons2),
      minutesHeld: sumMinutes(held),
      turnover: byTeacher.reduce((sum, row2) => sum + row2.teacher.rate * row2.held, 0),
      income: byTeacher.reduce((sum, row2) => sum + commissionPerLesson2(row2.teacher) * row2.held, 0),
      incomeExpected: byTeacher.reduce((sum, row2) => sum + commissionPerLesson2(row2.teacher) * row2.planned, 0),
      toPay: teachers2.reduce((sum, t) => sum + t.stats.toPay, 0),
      byTeacher: byTeacher.sort((a, b) => b.planned - a.planned)
    };
  }

  // src/pages/home/homeBlocks.ts
  var TODAY_ROWS_LIMIT = 5;
  var DEBTORS_LIMIT = 3;
  function scheduleToday() {
    const today = todayLessons();
    const shown = today.all.filter((l) => l.endMoment > DEMO_NOW).slice(0, TODAY_ROWS_LIMIT);
    const rest = today.all.length - today.finished.length - shown.length;
    const rows = shown.map((lesson) => {
      const teacher2 = teacherById(lesson.teacherId);
      const running = lesson.startMoment <= DEMO_NOW;
      return `<div class="today-row lesson-${teacher2?.colorId ?? "blue"}">
        <span class="today-row-icon">${calendarSmallSvg({ size: 16 })}</span>
        <span class="today-row-text"><span class="today-row-title">${esc(teacher2?.name ?? "")} · ${esc(whoOfLesson(lesson))}</span><span class="today-row-time">${timeHm(lesson.startMoment)}–${timeHm(lesson.endMoment)}${running ? " · идет сейчас" : ""}</span></span>
        ${kitIconButton({ icon: goToSvg(), click: "scheduleLesson", data: { id: lesson.id }, title: "Открыть занятие" })}
      </div>`;
    }).join("");
    const empty = `<div class="home-muted">На${NBSP}сегодня занятий больше нет</div>`;
    return `<section class="today-section">
    <div class="today-section-head"><h3 class="display">Расписание на${NBSP}сегодня, ${dateShort(DEMO_TODAY)}</h3>${kitIconButton({ icon: plusSvg(), click: "homeLessonAdd", title: "Добавить занятие" })}</div>
    <div class="today-list">${rows || empty}</div>
    ${rest > 0 ? `<div class="home-muted">И${NBSP}еще ${rest}${NBSP}${plural(rest, "занятие", "занятия", "занятий")} позже</div>` : ""}
    <div class="today-section-bottom">${kitButtonBlack({ text: "Открыть расписание", click: "homeGo", data: { key: "schedule" } })}</div>
  </section>`;
  }
  function dealsToday() {
    const deals2 = todayDeals();
    const rows = deals2.map((deal) => `<div class="today-row deal ${deal.done ? "done" : ""}" role="button" tabindex="0" data-click="homeDealToggle" data-secure="1" data-id="${deal.id}" data-done="${deal.done ? 1 : 0}">
      ${checkbox(deal.done)}
      <span class="today-row-text"><span class="today-row-title">${esc(deal.title)}</span><span class="today-row-time">${timeHm(deal.startMoment)}–${timeHm(deal.endMoment)}</span></span>
    </div>`).join("");
    const empty = `<div class="home-muted">Дел на${NBSP}сегодня нет. Добавьте, чтобы ничего не${NBSP}забыть</div>`;
    return `<section class="today-section">
    <div class="today-section-head"><h3 class="display">Дела на${NBSP}сегодня</h3>${kitIconButton({ icon: plusSvg(), click: "homeDealAdd", title: "Добавить дело" })}</div>
    <div class="today-list">${rows || empty}</div>
    <div class="today-section-bottom">${kitButtonWhite({ text: `Дела на${NBSP}неделю`, click: "homeDealsWeek" })}</div>
  </section>`;
  }
  function seatsPromo() {
    const school2 = schoolData();
    const left = (school2?.teachersLimit ?? 0) - activeTeachers().length;
    const tariff = esc(school2?.tariffName ?? "");
    const title = left > 0 ? `На${NBSP}тарифе «${tariff}» осталось ${left}${NBSP}${plural(left, "место", "места", "мест")}` : `На${NBSP}тарифе «${tariff}» места закончились`;
    return `<div class="home-promo">
    <div class="home-promo-text"><div class="home-promo-title">${title}</div><div>Чтобы добавить больше учителей, перейдите на${NBSP}следующий тариф. Ученики и${NBSP}расписание сохранятся</div>
    <button type="button" class="home-promo-link" data-click="staffChangeTariff">Сменить тариф</button></div>
    <img src="assets/glasses_clear.png" alt="">
  </div>`;
  }
  function debtorsBlock() {
    const debtors2 = moneyDebtors();
    const inGroups = groupDebtors();
    const total = debtors2.reduce((sum, d) => sum + d.amount, 0);
    const rows = debtors2.slice(0, DEBTORS_LIMIT).map((d) => `<button type="button" class="home-person-row" data-click="studentOpen" data-id="${d.student.id}">${studentAvatarCircle(d.student.name, d.student.connected)}<span class="home-person-name"><span>${esc(d.student.name)}</span></span><span class="home-person-extra strong">${moneyToString(d.amount)}</span></button>`).join("");
    const groupRows = inGroups.slice(0, Math.max(0, DEBTORS_LIMIT - debtors2.length)).map((d) => `<button type="button" class="home-person-row" data-click="studentOpen" data-id="${d.student.id}">${studentAvatarCircle(d.student.name, d.student.connected)}<span class="home-person-name"><span>${esc(d.student.name)}</span><small>${esc(d.groupName)}</small></span><span class="home-person-extra strong">${d.lessons}${NBSP}${plural(d.lessons, "занятие", "занятия", "занятий")}</span></button>`).join("");
    const rest = debtors2.length + inGroups.length - DEBTORS_LIMIT;
    const list = debtors2.length + inGroups.length > 0 ? `${rows}${groupRows}${rest > 0 ? `<div class="home-muted">+ еще ${rest}${NBSP}${plural(rest, "должник", "должника", "должников")}</div>` : ""}
       <div class="home-debtors-actions">${kitButtonWhite({ text: "Напомнить всем", click: "homeRemindAll", secure: true })}${kitButtonWhite({ text: `Показать в${NBSP}расписании`, click: "homeGo", data: { key: "schedule", debtors: 1 } })}</div>` : `<div class="home-muted">Должников нет</div>`;
    return `<div class="home-debtors-row">
    ${seatsPromo()}
    <section class="home-debtors"><div class="home-debtors-head"><h3 class="display">Должники школы</h3>${total > 0 ? `<span class="home-debtors-total">${moneyToString(total)}</span>` : ""}</div>${list}</section>
  </div>`;
  }
  function ring(value, total, big, caption) {
    const length = 2 * Math.PI * 62;
    const filled = total > 0 ? value / total * length : 0;
    return `<div class="week-ring"><svg viewBox="0 0 140 140" width="140" height="140" aria-hidden="true"><circle class="week-ring-track" cx="70" cy="70" r="62"/><circle class="week-ring-fill" cx="70" cy="70" r="62" stroke-dasharray="${filled} ${length}" transform="rotate(-90 70 70)"/></svg><div class="week-ring-center"><b>${big}</b><span>${caption}</span></div></div>`;
  }
  function hoursText(minutes) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${hours}${NBSP}ч ${rest}${NBSP}м` : `${hours}${NBSP}ч`;
  }
  function weekBlock() {
    const week = weekStats();
    const bars = week.byTeacher.map((row2) => `<div class="week-bar">
      <div class="week-bar-head"><span>${esc(row2.teacher.name)}</span><b>${row2.held}${NBSP}из${NBSP}${row2.planned}</b></div>
      <div class="week-bar-track"><span style="--fill:${row2.planned ? row2.held / row2.planned * 100 : 0}%"></span></div>
    </div>`).join("");
    return `<section class="home-week">
    <div class="home-week-money">
      <div><div class="home-muted">Доход школы за${NBSP}неделю</div><div class="home-week-value">${moneyToString(week.income)}</div></div>
      <div><div class="home-muted">Ожидаемый доход за${NBSP}неделю</div><div class="home-week-value">${moneyToString(week.incomeExpected)}</div></div>
    </div>
    <div class="home-week-rings">
      ${ring(week.held, week.planned, String(week.held), `${plural(week.held, "занятие", "занятия", "занятий")}<br>проведено из${NBSP}${week.planned}`)}
      ${ring(week.minutesHeld, week.minutesPlanned, hoursText(week.minutesHeld), `занятий<br>из${NBSP}${hoursText(week.minutesPlanned)}`)}
    </div>
    <div class="home-week-bars"><div class="home-card-subtitle">По${NBSP}учителям</div>${bars}</div>
  </section>`;
  }

  // src/pages/home/Home.ts
  onClick("homeGo", (el) => {
    const key = dataOf(el, "key");
    if (key === "students") {
      goTo({ page: "students", view: "list" });
      return;
    }
    if (key === "schedule") {
      setScheduleFilter([], dataOf(el, "debtors") === "1");
      goTo({ page: "schedule" });
      return;
    }
    goTo({ page: "staff", view: "list" });
  });
  onClick("homeRemindAll", async () => {
    const connected = moneyDebtors().filter((d) => d.student.connected);
    if (connected.length === 0) {
      showInfo(`Должники пока не${NBSP}подключены к${NBSP}SecRep, напоминание отправить некому`);
      return;
    }
    const results = await Promise.all(connected.map((d) => api("school/student_payment_reminder_send", { studentId: d.student.id })));
    const sent = results.filter((r) => r.success).length;
    if (sent > 0) {
      showSuccess(`Напоминание об${NBSP}оплате отправлено: ${sent}${NBSP}${plural(sent, "ученик", "ученика", "учеников")}`);
    }
  });
  onClick("homeDealToggle", async (el) => {
    const { success } = await api("school/deal_done_set", { id: Number(dataOf(el, "id")), done: dataOf(el, "done") !== "1" });
    if (success) {
      await loadDeals();
    }
  });
  onClick("homeDealAdd", () => {
    openAddDealPanel();
  });
  onClick("homeDealsWeek", () => {
    setMode("deals");
    goTo({ page: "schedule" });
  });
  onClick("homeLessonAdd", () => {
    openAddLessonPanel();
  });
  function attentionItems() {
    const items = [];
    const debtors2 = moneyDebtors();
    const inGroups = groupDebtors();
    if (debtors2.length > 0 || inGroups.length > 0) {
      const total = debtors2.reduce((sum, d) => sum + d.amount, 0);
      const parts = [
        debtors2.length ? `${debtors2.length}${NBSP}${plural(debtors2.length, "ученик", "ученика", "учеников")}` : "",
        inGroups.length ? `${inGroups.length}${NBSP}в${NBSP}группах` : ""
      ].filter(Boolean);
      items.push({ value: moneyToString(total), title: "Долги учеников", hint: parts.join(` и${NBSP}`), action: "Напомнить всем", click: "homeRemindAll", alert: true });
    }
    const toPay = teachersToPay();
    if (toPay.length > 0) {
      const sum = toPay.reduce((total, t) => total + t.stats.toPay, 0);
      items.push({ value: moneyToString(sum), title: `К${NBSP}выплате учителям`, hint: `${toPay.length}${NBSP}${plural(toPay.length, "учитель", "учителя", "учителей")}, с${NBSP}${dateShort(DEMO_WEEK_START)} по${NBSP}${dateShort(addDays(DEMO_WEEK_START, 6))}`, action: `Перейти к${NBSP}выплатам`, click: "homeGo", data: { key: "staff" } });
    }
    const ending = studentsWithEndingPackage();
    if (ending.length > 0) {
      const first = ending[0];
      const single = ending.length === 1 && first;
      items.push({
        value: String(ending.length),
        title: ending.length === 1 ? "Абонемент заканчивается" : "Абонементы заканчиваются",
        hint: ending.map((s) => s.name).slice(0, 2).join(", ") + (ending.length > 2 ? ` и${NBSP}еще ${ending.length - 2}` : ""),
        action: single ? "Открыть ученика" : "Показать учеников",
        click: single ? "studentOpen" : "homeGo",
        data: single ? { id: first.id } : { key: "students" }
      });
    }
    const noTeacher = studentsWithoutTeacher();
    if (noTeacher.length > 0) {
      items.push({ value: String(noTeacher.length), title: `Без${NBSP}учителя`, hint: noTeacher.map((s) => s.name).slice(0, 2).join(", "), action: "Назначить учителя", click: "homeGo", data: { key: "students" } });
    }
    const teachersOff = activeTeachers().filter((t) => !t.connected).length;
    const studentsOff = activeStudents().filter((s) => !s.connected).length;
    if (teachersOff + studentsOff > 0) {
      const parts = [
        teachersOff ? `${teachersOff}${NBSP}${plural(teachersOff, "учитель", "учителя", "учителей")}` : "",
        studentsOff ? `${studentsOff}${NBSP}${plural(studentsOff, "ученик", "ученика", "учеников")}` : ""
      ].filter(Boolean);
      items.push({ value: String(teachersOff + studentsOff), title: `Не${NBSP}подключены к${NBSP}SecRep`, hint: parts.join(` и${NBSP}`), action: "Пригласить", click: "homeGo", data: { key: teachersOff ? "staff" : "students" } });
    }
    return items;
  }
  function attentionBlock() {
    const items = attentionItems();
    if (items.length === 0) {
      return `<div class="home-calm"><span class="home-calm-dot"></span>Все под контролем: долгов, выплат и${NBSP}незакрытых приглашений нет</div>`;
    }
    return `<section class="home-attention">
    <h2 class="display">Требует внимания <span class="count-badge">${items.length}</span></h2>
    <div class="home-attention-list">${items.map((item) => `<div class="attention-card">
        <div class="attention-card-title">${item.title}</div>
        <div class="attention-card-value ${item.alert ? "tone-alert" : ""}">${item.value}</div>
        <div class="attention-card-hint">${esc(item.hint)}</div>
        ${kitButtonLink({ text: item.action, click: item.click, data: item.data, secure: item.click === "homeRemindAll" })}
      </div>`).join("")}</div>
  </section>`;
  }
  function cardHead(icon, title, tag, tone) {
    return `<div class="home-card-head"><span class="home-card-icon">${icon}</span><span class="home-card-title">${title}</span><span class="home-tag ${tone}">${tag}</span></div>`;
  }
  function todayCard() {
    const today = todayLessons();
    const count = today.all.length;
    const next = today.ahead.slice(0, 2);
    const stat = (value, label) => `<div class="today-stat"><b>${value}</b><span>${label}</span></div>`;
    const nextRows = next.length ? next.map((lesson) => {
      const teacher2 = teacherById(lesson.teacherId);
      return `<div class="home-person-row">${teacher2 ? tutorAvatarCircle(teacher2.name, teacher2.connected) : ""}<span class="home-person-name"><span>${esc(teacher2?.name ?? "")}</span><small>${esc(whoOfLesson(lesson))}</small></span><span class="home-person-extra">${timeHm(lesson.startMoment)}–${timeHm(lesson.endMoment)}</span></div>`;
    }).join("") : `<div class="home-muted">На${NBSP}сегодня занятий больше нет</div>`;
    return `<div class="home-card">
    ${cardHead(calendarSvg({ size: 18 }), `Сегодня, ${dateShort(DEMO_TODAY)}`, `${count}${NBSP}${plural(count, "занятие", "занятия", "занятий")}`, "blue")}
    <div class="today-stats">${stat(today.running.length, "идут сейчас")}${stat(today.ahead.length, "впереди")}${stat(today.finished.length, "проведено")}</div>
    <div class="home-card-subtitle">Ближайшие занятия</div>
    ${nextRows}
    <div class="home-card-bottom">${kitButtonWhite({ text: "Открыть расписание", click: "homeGo", data: { key: "schedule" }, full: true })}</div>
  </div>`;
  }
  function moneyCard() {
    const week = weekStats();
    return `<div class="home-card">
    ${cardHead(creditCardSvg({ size: 18 }), "Деньги школы", `За${NBSP}неделю`, "green")}
    <div><div class="home-card-subtitle">Доход школы</div><div class="home-muted">Комиссия с${NBSP}проведенных занятий</div></div>
    <div class="home-big-number">${moneyToString(week.income)}</div>
    <div class="widget-row"><span>Проведено занятий на</span><b>${moneyToString(week.turnover)}</b></div>
    <div class="widget-row"><span>К${NBSP}выплате учителям</span><b>${moneyToString(week.toPay)}</b></div>
    <div class="widget-row"><span>Ожидаемый доход за${NBSP}неделю</span><b>${moneyToString(week.incomeExpected)}</b></div>
    <div class="home-card-bottom">${kitButtonBlack({ text: "Выплаты учителям", click: "homeGo", data: { key: "staff" }, full: true })}</div>
  </div>`;
  }
  function teamCard() {
    const week = weekStats();
    const teachers2 = week.byTeacher.slice(0, 4);
    const total = activeTeachers().length;
    const limit = schoolData()?.teachersLimit ?? total;
    const rows = teachers2.map((row2) => `<button type="button" class="home-person-row" data-click="staffOpenTutor" data-id="${row2.teacher.id}">${tutorAvatarCircle(row2.teacher.name, row2.teacher.connected)}<span class="home-person-name"><span>${esc(row2.teacher.name)}</span><small>${esc(row2.teacher.subject ?? "")}</small></span><span class="home-person-extra">${row2.held}${NBSP}из${NBSP}${row2.planned}</span></button>`).join("");
    return `<div class="home-card">
    ${cardHead(userSvg({ size: 18 }), "Команда", `${total}${NBSP}из${NBSP}${limit} мест`, "blue")}
    <div><div class="home-card-subtitle">Занятия за${NBSP}неделю</div><div class="home-muted">Проведено из${NBSP}запланированных</div></div>
    ${rows}
    <div class="home-card-bottom">${kitButtonWhite({ text: "Все сотрудники", click: "homeGo", data: { key: "staff" }, full: true })}</div>
  </div>`;
  }
  function homePage() {
    return page({
      activeMenu: "home",
      title: "Главная",
      content: `<div class="home">
      ${attentionBlock()}
      <div class="home-cards">${todayCard()}${moneyCard()}${teamCard()}</div>
      <div class="home-today">${scheduleToday()}${dealsToday()}</div>
      ${debtorsBlock()}
      ${weekBlock()}
    </div>`
    });
  }

  // src/pages/notifications/NotificationsPage.ts
  function notificationRow(key, label) {
    const checked = Boolean(notificationSettings[key]);
    return `<button type="button" class="notification-toggle-row" aria-pressed="${checked}" data-click="notificationToggle" data-key="${key}"><span>${label}</span>${modernSwitcher(checked)}</button>`;
  }
  function notificationSection(title, rows) {
    return `<section class="notification-section"><h3>${title}</h3><div class="notification-rows">${rows}</div></section>`;
  }
  function notificationSettingsCard(rows, color = "teacher") {
    return `<div class="notification-settings notification-settings-${color}">${rows}</div>`;
  }
  function notificationColumnHeader(title, description) {
    return `<div class="notification-column-header"><div class="notification-column-title"><h2>${title}</h2></div><p>${description}</p></div>`;
  }
  function notificationPaymentText(student2) {
    return `Здравствуйте! ${schoolData()?.name ?? "Школа"} напоминает об оплате занятий для ${student2.name}. Пожалуйста, свяжитесь с администратором школы, чтобы уточнить сумму и способ оплаты.`;
  }
  function openNotificationPaymentPanel() {
    openPanel("notification-payment", () => {
      const rows = activeStudents().map((student2) => `<button type="button" class="notification-student" data-click="notificationPaymentPreview" data-id="${student2.id}" ${student2.connected ? "" : "disabled"}>${avatarCircle(student2.name, { size: "m" })}<span class="notification-student-meta"><strong>${esc(student2.name)}</strong><small>${student2.connected ? "Посмотреть текст напоминания" : "Отправка недоступна: не подключён к SecRep"}</small></span>${student2.connected ? chevronRightSvg({ size: 20 }) : ""}</button>`).join("");
      return {
        title: "Напомнить об оплате",
        narrow: true,
        body: `<p class="notification-payment-intro">Выберите ученика школы. Перед отправкой вы увидите текст напоминания.</p><div class="notification-payment-list">${rows || `<div class="form-hint">Нет активных учеников</div>`}</div>`
      };
    });
  }
  function notificationActions() {
    return `<div class="notification-actions notification-school-actions">
      <button type="button" class="notification-action notification-action-payment" data-click="notificationAction" data-key="payment"><span>Напомнить об оплате</span><span class="notification-payment-icon">${bellSvg({ size: 24 })}</span></button>
      <button type="button" class="notification-action notification-action-info" aria-label="Информация об уведомлениях" data-click="notificationAction" data-key="info">${questionCircleSvg({ size: 24 })}</button>
    </div>`;
  }
  function schoolAdminNotifications() {
    const rows = notificationSection("Подключение преподавателей",
      notificationRow("adminTeacherJoined", "Преподаватель принял приглашение в школу")
      + notificationRow("adminTeacherBot", "Преподаватель подключил Telegram-бота"))
      + notificationSection("Расписание школы",
      notificationRow("adminScheduleChanged", "Преподаватель назначил, перенёс или отменил занятие"));
    return `${notificationColumnHeader("Администраторам", "Сообщения администраторам и владельцам выбранной школы")}${notificationSettingsCard(`<div class="notification-settings-stack">${rows}<p class="form-hint">Только события этой школы. Для получения сообщений нужен подключённый канал SecRep.</p></div>`, "teacher")}`;
  }
  function schoolNotificationColumn(recipient) {
    const teacher2 = recipient === "teacher";
    const title = teacher2 ? "Преподавателям" : "Ученикам";
    const description = teacher2 ? "Сообщения преподавателям по их занятиям в школе" : "Сообщения ученикам по занятиям, в которых они участвуют";
    const rows = notificationSection("Занятия", notificationRow(`${recipient}Upcoming`, "Напоминать о предстоящих занятиях"))
      + notificationSection("Изменения расписания", notificationRow(`${recipient}Rescheduled`, "Сообщать о переносе занятия") + notificationRow(`${recipient}Cancelled`, "Сообщать об отмене занятия"));
    return `${notificationColumnHeader(title, description)}${notificationSettingsCard(`<div class="notification-settings-stack">${rows}<p class="form-hint">Для индивидуальных и групповых занятий. Сообщения доступны при подключённом канале SecRep.</p></div>`, teacher2 ? "teacher" : "student")}`;
  }
  function notificationsPage() {
    return page({
      activeMenu: "notifications",
      title: "Уведомления",
      headerHeading: true,
      hideBottomMenu: true,
      mainLabel: "Уведомления",
      content: `<div class="notification-page">
        ${notificationActions()}
        <div class="notification-mobile-view">
          ${tabs([{ key: "admin", text: "Администраторам" }, { key: "teacher", text: "Преподавателям" }, { key: "students", text: "Ученикам" }], notificationTab, "notificationTab")}
          <div class="notification-mobile-content">${notificationTab === "admin" ? schoolAdminNotifications() : schoolNotificationColumn(notificationTab === "students" ? "student" : "teacher")}</div>
        </div>
        <div class="notification-desktop-grid">
          <div class="notification-desktop-column notification-admin-column">${schoolAdminNotifications()}</div>
          <div class="notification-desktop-column">${schoolNotificationColumn("teacher")}</div>
          <div class="notification-desktop-column">${schoolNotificationColumn("student")}</div>
        </div>
      </div>`
    });
  }

  // src/pages/schedule/common/calendarLayout.ts
  var EPSILON = 1e-6;
  function layoutDay(items) {
    const sorted = items.slice().sort((a, b) => a.start - b.start || b.duration - a.duration);
    const result = [];
    let cluster = [];
    let clusterEnd = -1;
    const flush = () => {
      const laneEnds = [];
      cluster.forEach((placed) => {
        let lane = laneEnds.findIndex((end) => end <= placed.start + EPSILON);
        if (lane < 0) {
          lane = laneEnds.length;
          laneEnds.push(0);
        }
        laneEnds[lane] = placed.start + placed.duration;
        placed.lane = lane;
      });
      cluster.forEach((placed) => {
        placed.lanes = laneEnds.length;
        result.push(placed);
      });
      cluster = [];
      clusterEnd = -1;
    };
    sorted.forEach((entry) => {
      if (cluster.length > 0 && entry.start >= clusterEnd - EPSILON) {
        flush();
      }
      cluster.push({ ...entry, lane: 0, lanes: 1 });
      clusterEnd = Math.max(clusterEnd, entry.start + entry.duration);
    });
    if (cluster.length > 0) {
      flush();
    }
    return result;
  }

  // src/pages/schedule/FiltersPanel.ts
  var selected = /* @__PURE__ */ new Set();
  var debtors = false;
  onClick("filtersAll", () => {
    const all = activeTeachers();
    selected = all.every((t) => selected.has(t.id)) ? /* @__PURE__ */ new Set() : new Set(all.map((t) => t.id));
    requestRender();
  });
  onClick("filtersTeacher", (el) => {
    const id = Number(dataOf(el, "id"));
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    selected = next;
    requestRender();
  });
  onClick("filtersDebtors", () => {
    debtors = !debtors;
    requestRender();
  });
  onClick("filtersApply", () => {
    const all = activeTeachers();
    setScheduleFilter(selected.size === all.length ? [] : Array.from(selected), debtors);
    closeAllPanels();
  });
  onClick("filtersReset", () => {
    setScheduleFilter([], false);
    closeAllPanels();
  });
  function openFiltersPanel() {
    const ids = scheduleTeacherIds();
    selected = new Set(ids.length > 0 ? ids : activeTeachers().map((t) => t.id));
    debtors = scheduleDebtorsOnly();
    openPanel("scheduleFilters", () => {
      const all = activeTeachers();
      const allOn = all.every((t) => selected.has(t.id));
      return {
        title: "Фильтры",
        narrow: true,
        body: `<div class="form-section"><h4>Учителя</h4><div class="pick-list">
          ${switcherRow({ click: "filtersAll", content: '<span class="pick-name">Все</span>', control: checkbox(allOn) })}
          ${all.map((t) => switcherRow({ click: "filtersTeacher", data: { id: t.id }, content: `<span class="pick-person">${avatarCircle(t.name, { size: "xs" })}<span class="pick-name">${esc(t.name)}</span></span>`, control: checkbox(selected.has(t.id)) })).join("")}
        </div></div>
        ${switcherRow({ click: "filtersDebtors", content: '<span class="form-label-strong">Показать только должников</span>', control: checkbox(debtors) })}`,
        foot: `${kitButtonBlack({ text: "Применить", click: "filtersApply", full: true })}${kitButtonWhite({ text: "Сбросить", click: "filtersReset", full: true })}`
      };
    });
  }

  // src/pages/schedule/WindowSettingsPanel.ts
  var draft4 = { teacherId: null, duration: 60, durationCustom: "", pause: 15, pauseCustom: "" };
  onClick("windowsPickTeacher", () => {
    openPickTeacherPanel(draft4.teacherId, (id) => {
      draft4.teacherId = id;
      requestRender();
    });
  });
  onClick("windowsChoice", (el) => {
    const value = Number(dataOf(el, "value"));
    if (dataOf(el, "kind") === "pause") {
      draft4.pause = value;
      draft4.pauseCustom = "";
    } else {
      draft4.duration = value;
      draft4.durationCustom = "";
    }
    requestRender();
  });
  onInput("windowsCustom", (el) => {
    if (!(el instanceof HTMLInputElement)) {
      return;
    }
    const value = el.value.replace(/\D/g, "");
    if (dataOf(el, "field") === "pause") {
      draft4.pauseCustom = value;
      if (value) {
        draft4.pause = Number(value);
      }
    } else {
      draft4.durationCustom = value;
      if (value) {
        draft4.duration = Number(value);
      }
    }
    el.closest(".kit-input")?.classList.toggle("filled", value !== "");
  });
  onClick("windowsStart", () => {
    if (draft4.teacherId === null) {
      showError("Выберите учителя");
      return;
    }
    closeAllPanels();
    startEditWindows(draft4.teacherId, draft4.duration);
  });
  function choices(values, current3, kind) {
    return `<div class="choice-grid">${values.map((v) => `<button type="button" class="choice ${current3 === v ? "active" : ""}" data-click="windowsChoice" data-kind="${kind}" data-value="${v}">${v}${NBSP}мин</button>`).join("")}</div>`;
  }
  function openWindowSettingsPanel() {
    draft4.teacherId = scheduleState().editTeacherId ?? draft4.teacherId;
    openPanel("windowSettings", () => {
      const teacher2 = draft4.teacherId !== null ? teacherById(draft4.teacherId) : null;
      const teacherValue = teacher2 ? `<button type="button" class="form-value-button" data-click="windowsPickTeacher">${avatarCircle(teacher2.name, { size: "xs" })}<span>${esc(teacher2.name)}</span></button>` : `<button type="button" class="form-link" data-click="windowsPickTeacher">Выбрать</button>`;
      return {
        title: "Окна для записи",
        narrow: true,
        body: `<div class="form-row"><span>Учитель</span>${teacherValue}</div>
        <div class="form-section"><h4>Продолжительность одного урока</h4>${choices([30, 45, 60, 90], draft4.duration, "duration")}
          <div class="form-row-fields"><span class="form-word">Своя</span>${numberInput({ label: "мин", value: draft4.durationCustom, input: "windowsCustom", field: "duration", maxlength: MINUTES_MAX_LENGTH, grow: true })}<span class="form-word">мин</span></div></div>
        <div class="form-section"><h4>Перерыв между уроками</h4>${choices([0, 5, 10, 15], draft4.pause, "pause")}
          <div class="form-row-fields"><span class="form-word">Свой</span>${numberInput({ label: "мин", value: draft4.pauseCustom, input: "windowsCustom", field: "pause", maxlength: MINUTES_MAX_LENGTH, grow: true })}<span class="form-word">мин</span></div></div>
        <button type="button" class="form-row form-row-button" data-click="pageStub" data-text="Условия брони и отмены как в базовом SecRep"><span class="form-label-strong">Условия брони и${NBSP}отмены</span>${chevronRightSvg({ size: 24 })}</button>`,
        foot: kitButtonBlack({ text: `Перейти к${NBSP}выбору окон`, click: "windowsStart", full: true })
      };
    });
  }

  // src/pages/schedule/Schedule.ts
  var HOUR_FROM = 8;
  var HOUR_TO = 16;
  var ROW_HEIGHT = 112;
  onClick("scheduleWeek", (el) => {
    shiftWeek(Number(dataOf(el, "delta")));
  });
  onClick("scheduleModeMenu", () => {
    toggleModeMenu();
  });
  onClick("scheduleMode", (el) => {
    setMode(dataOf(el, "key"));
  });
  onClick("scheduleChip", (el) => {
    const id = Number(dataOf(el, "id"));
    if (scheduleState().editTeacherId !== null) {
      switchEditTeacher(id);
      return;
    }
    toggleScheduleTeacher(id);
  });
  onClick("scheduleResetFilter", () => {
    setScheduleFilter([], false);
  });
  onClick("scheduleAdd", () => {
    const mode = scheduleState().mode;
    if (mode === "deals") {
      openAddDealPanel();
      return;
    }
    if (mode === "windows") {
      openWindowSettingsPanel();
      return;
    }
    openAddLessonPanel();
  });
  onClick("scheduleWindowSettings", () => {
    openWindowSettingsPanel();
  });
  onClick("scheduleFilters", () => {
    openFiltersPanel();
  });
  onClick("scheduleLesson", (el) => {
    openEditLessonPanel(Number(dataOf(el, "id")));
  });
  onClick("scheduleDeal", () => {
    showInfo(`Карточка дела пока не${NBSP}нарисована`);
  });
  onClick("scheduleWindow", (el) => {
    const state2 = scheduleState();
    const teacherId2 = Number(dataOf(el, "teacher"));
    if (state2.editTeacherId === null) {
      showInfo(`Окно ${teacherById(teacherId2)?.name ?? ""}. Чтобы изменить окна, нажмите на${NBSP}шестеренку`);
      return;
    }
    if (teacherId2 !== state2.editTeacherId) {
      switchEditTeacher(teacherId2);
      return;
    }
    removeWindow(Number(dataOf(el, "index")));
  });
  onClick("scheduleSlot", (el) => {
    toggleWindowAt(new Date(Number(dataOf(el, "day"))), Number(dataOf(el, "hour")));
  });
  onClick("scheduleWindowsCancel", () => {
    cancelEditWindows();
  });
  onClick("scheduleWindowsSave", async () => {
    await saveEditWindows();
  });
  function afterScheduleRender() {
    if (!scheduleState().modeOpen) {
      return;
    }
    const close = (event) => {
      const target = event.target;
      if (target instanceof Element && target.closest(".mode-select")) {
        return;
      }
      document.removeEventListener("click", close, true);
      toggleModeMenu(false);
    };
    document.addEventListener("click", close, true);
  }
  function whoName(lesson) {
    if (lesson.groupId !== null) {
      return groupById(lesson.groupId)?.name ?? "";
    }
    return lesson.studentId !== null ? studentById(lesson.studentId)?.name ?? "" : "";
  }
  function isDebtorLesson(lesson) {
    if (lesson.groupId !== null) {
      return groupById(lesson.groupId)?.members.some((m) => m.lessonsBalance < 0) ?? false;
    }
    return (lesson.studentId !== null ? studentById(lesson.studentId)?.balance ?? 0 : 0) < 0;
  }
  function lessonActive(lesson) {
    const ids = scheduleTeacherIds();
    if (ids.length > 0 && !ids.includes(lesson.teacherId)) {
      return false;
    }
    return !scheduleDebtorsOnly() || isDebtorLesson(lesson);
  }
  function eventStyle(start2, duration, lane, lanes) {
    const top = (start2 - HOUR_FROM) * ROW_HEIGHT + 2;
    const height = Math.max(duration * ROW_HEIGHT - 4, 18);
    const width2 = 100 / lanes;
    return `top:${top}px;height:${height}px;left:calc(${lane * width2}% + 3px);width:calc(${width2}% - 6px)`;
  }
  function dayEvents(day) {
    const state2 = scheduleState();
    const editing = state2.editTeacherId !== null;
    if (state2.mode === "lessons") {
      return lessonsData().filter((l) => sameDay(l.startMoment, day)).map((lesson) => {
        const teacher2 = teacherById(lesson.teacherId);
        const color = teacher2?.colorId ?? "blue";
        const muted = !lessonActive(lesson);
        const name = teacher2?.name ?? "";
        const who = whoName(lesson);
        return {
          start: hoursOfDay(lesson.startMoment),
          duration: minutesBetween(lesson.startMoment, lesson.endMoment) / 60,
          item: {
            html: (style, narrow) => `<button type="button" class="cal-event lesson-${color} ${muted ? "muted" : ""} ${narrow ? "narrow" : ""}" style="${style}" data-click="scheduleLesson" data-id="${lesson.id}" title="${esc(name)} · ${esc(who)}">${narrow ? esc(initials(name)) : `<span>${esc(name)}</span><span class="cal-event-who">${esc(who)}</span>`}</button>`
          }
        };
      });
    }
    if (state2.mode === "deals") {
      return dealsData().filter((d) => sameDay(d.startMoment, day)).map((deal) => ({
        start: hoursOfDay(deal.startMoment),
        duration: minutesBetween(deal.startMoment, deal.endMoment) / 60,
        item: { html: (style) => `<button type="button" class="cal-event lesson-${deal.colorId}" style="${style}" data-click="scheduleDeal">${esc(deal.title)}</button>` }
      }));
    }
    const filterIds = scheduleTeacherIds();
    const windows = editing ? activeTeachers().filter((t) => t.id !== state2.editTeacherId).flatMap((t) => teacherWindowsData().filter((w) => w.teacherId === t.id).map((w, index) => ({ teacherId: t.id, window: w, index }))).concat(state2.editWindows.map((w, index) => ({ teacherId: state2.editTeacherId ?? 0, window: { teacherId: state2.editTeacherId ?? 0, ...w }, index }))) : teacherWindowsData().map((w, index) => ({ teacherId: w.teacherId, window: w, index }));
    return windows.filter((entry) => sameDay(entry.window.startMoment, day)).map((entry) => {
      const name = teacherById(entry.teacherId)?.name ?? "";
      const faded = editing ? entry.teacherId !== state2.editTeacherId : filterIds.length > 0 && !filterIds.includes(entry.teacherId);
      return {
        start: hoursOfDay(entry.window.startMoment),
        duration: minutesBetween(entry.window.startMoment, entry.window.endMoment) / 60,
        item: {
          html: (style, narrow) => `<button type="button" class="cal-event window ${faded ? "faded" : ""} ${narrow ? "narrow" : ""}" style="${style}" data-click="scheduleWindow" data-teacher="${entry.teacherId}" data-index="${entry.index}" title="${esc(name)}">${narrow ? esc(initials(name)) : esc(name)}</button>`
        }
      };
    });
  }
  function dayColumn(day) {
    const editing = scheduleState().editTeacherId !== null;
    const hours = HOUR_TO - HOUR_FROM;
    const events = layoutDay(dayEvents(day)).map((placed) => placed.item.html(eventStyle(placed.start, placed.duration, placed.lane, placed.lanes), placed.lanes >= 3 || !isTablet())).join("");
    const slots = editing ? Array.from({ length: hours }, (_, k) => `<button type="button" class="cal-slot" style="top:${k * ROW_HEIGHT + 2}px;height:${ROW_HEIGHT - 4}px" data-click="scheduleSlot" data-day="${day.getTime()}" data-hour="${HOUR_FROM + k}" aria-label="Добавить окно"></button>`).join("") : "";
    const lines = Array.from({ length: hours + 1 }, (_, k) => `<div class="cal-line" style="top:${k * ROW_HEIGHT}px"></div>`).join("");
    return `<div class="cal-column" style="height:${hours * ROW_HEIGHT}px">${lines}${slots}${events}</div>`;
  }
  function calendar() {
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart(), i));
    const hours = HOUR_TO - HOUR_FROM;
    const head = days.map((day, i) => `<div class="cal-day ${sameDay(day, DEMO_TODAY) ? "today" : ""}"><span class="cal-day-num">${day.getDate()}</span><span>${WEEK_DAYS[i] ?? ""}</span></div>`).join("");
    const times = Array.from({ length: hours }, (_, k) => `<span class="cal-time" style="top:${k * ROW_HEIGHT}px">${String(HOUR_FROM + k).padStart(2, "0")}:00</span>`).join("");
    const dots = Array.from({ length: hours }, (_, k) => `<i style="top:${k * ROW_HEIGHT - 3}px"></i>`).join("");
    return `<div class="cal">
    <div class="cal-head"><span></span>${head}</div>
    <div class="cal-body"><div class="cal-times">${times}<div class="cal-axis">${dots}</div></div>${days.map(dayColumn).join("")}</div>
  </div>`;
  }
  function chip(teacher2, on) {
    return `<button type="button" class="schedule-chip lesson-${teacher2.colorId} ${on ? "on" : ""}" data-click="scheduleChip" data-id="${teacher2.id}"><span class="schedule-chip-dot"></span>${esc(teacher2.name)}</button>`;
  }
  function chips() {
    const state2 = scheduleState();
    const editing = state2.editTeacherId !== null;
    const ids = scheduleTeacherIds();
    const list = activeTeachers().map((t) => chip(t, editing ? state2.editTeacherId === t.id : ids.includes(t.id))).join("");
    const reset = !editing && (ids.length > 0 || scheduleDebtorsOnly()) ? `<button type="button" class="schedule-chip" data-click="scheduleResetFilter">${crossSvg({ size: 16 })}Сбросить</button>` : "";
    return `<div class="schedule-chips">${list}${reset}</div>`;
  }
  function modeSelect() {
    const state2 = scheduleState();
    const items = Object.keys(MODE_NAMES).map((key) => `<button type="button" class="${key === state2.mode ? "active" : ""}" data-click="scheduleMode" data-key="${key}">${MODE_NAMES[key]}</button>`).join("");
    return `<div class="mode-select">
    <button type="button" class="mode-select-button" data-click="scheduleModeMenu"><span>${MODE_NAMES[state2.mode]}</span>${state2.modeOpen ? chevronDownSvg({ size: 16 }) : chevronRightSvg({ size: 16 })}</button>
    ${state2.modeOpen ? `<div class="mode-select-list">${items}</div>` : ""}
  </div>`;
  }
  function views() {
    return `<div class="schedule-views">
    ${kitIconButton({ icon: calendarGridSvg(), click: "pageStub", data: { text: `Вид «месяц» пока не${NBSP}нарисован` }, naked: true, title: "Месяц" })}
    <span class="schedule-views-active">${calendarSvg()}</span>
    ${kitIconButton({ icon: calendarDaySvg(), click: "pageStub", data: { text: `Вид «день» пока не${NBSP}нарисован` }, naked: true, title: "День" })}
  </div>`;
  }
  function weekNav() {
    return `<span class="week-nav">
    ${kitIconButton({ icon: chevronLeftSvg({ size: 16 }), click: "scheduleWeek", data: { delta: -1 }, naked: true, small: true, title: "Предыдущая неделя" })}
    <span class="week-nav-label">${weekLabel(weekStart())}</span>
    ${kitIconButton({ icon: chevronRightSvg({ size: 16 }), click: "scheduleWeek", data: { delta: 1 }, naked: true, small: true, title: "Следующая неделя" })}
  </span>`;
  }
  function toolbar() {
    const state2 = scheduleState();
    const editTeacher = state2.editTeacherId !== null ? teacherById(state2.editTeacherId) : null;
    const search3 = kitIconButton({ icon: calendarMagnifierSvg(), click: "pageStub", data: { text: `Поиск по${NBSP}дате как в${NBSP}базовом SecRep` }, title: "Поиск по дате" });
    const history2 = kitIconButton({ icon: clockArrowSvg(), click: "pageStub", data: { text: `История изменений как в${NBSP}базовом SecRep` }, title: "История изменений" });
    const homework = kitIconButton({ icon: journalPencilSvg(), click: "pageStub", data: { text: `Список занятий с${NBSP}ДЗ как в${NBSP}базовом SecRep` }, title: "Занятия с ДЗ" });
    const settings = kitIconButton({ icon: gearSvg(), click: "scheduleWindowSettings", title: "Настройка окон" });
    const add = kitIconButton({ icon: plusSvg(), click: "scheduleAdd", dark: true, title: "Добавить" });
    const editButtons = `<div class="schedule-edit-buttons">${kitButtonWhite({ text: "Отмена", click: "scheduleWindowsCancel" })}${kitButtonBlack({ text: "Сохранить окна", click: "scheduleWindowsSave", secure: true })}</div>`;
    const editHint = `<div class="schedule-hint">Окна: <b>${esc(editTeacher?.name ?? "")}</b>. Нажмите на${NBSP}пустой час, чтобы добавить окно, на${NBSP}окно, чтобы убрать. Чтобы редактировать окна другого учителя, выберите его ниже</div>`;
    if (editTeacher) {
      return `<div class="schedule-toolbar">
      <div class="schedule-toolbar-row">${weekNav()}${search3}</div>
      ${editHint}
      ${editButtons}
    </div>`;
    }
    return `<div class="schedule-toolbar schedule-tablet-only">
      <div class="schedule-toolbar-row">${views()}${history2}${weekNav()}${search3}${modeSelect()}<span class="schedule-grow"></span>${homework}${settings}${add}</div>
    </div>
    <div class="schedule-toolbar schedule-mobile-only">
      <div class="schedule-toolbar-row">${weekNav()}${search3}<span class="schedule-grow"></span>${add}</div>
      <div class="schedule-toolbar-row">${views()}<span class="schedule-grow"></span>${history2}${homework}${settings}</div>
      <div class="schedule-toolbar-row">${modeSelect()}${kitIconButton({ icon: funnelSvg(), click: "scheduleFilters", title: "Фильтры" })}</div>
    </div>`;
  }
  function schedulePage() {
    return page({
      activeMenu: "schedule",
      title: "Расписание",
      content: `<div class="schedule">${toolbar()}${chips()}${calendar()}</div>`
    });
  }

  // src/components/states.ts
  function loading() {
    return `<div class="state-loading" role="status"><span class="state-spinner"></span></div>`;
  }
  function loadError() {
    return `<div class="state-empty"><div class="state-title">Не${" "}удалось загрузить данные</div><div class="state-text">Обновите страницу или попробуйте позже</div></div>`;
  }
  function emptyState(title, text = "") {
    return `<div class="state-empty"><img src="assets/empty.png" alt="" width="140" height="140"><div class="state-title">${esc(title)}</div>${text ? `<div class="state-text">${esc(text)}</div>` : ""}</div>`;
  }

  // src/components/StudentCard.ts
  onClick("studentOpen", (el) => {
    goTo({ page: "students", view: "student", studentId: Number(dataOf(el, "id")) });
  });
  onClick("studentRemind", async (el) => {
    const { success } = await api("school/student_payment_reminder_send", { studentId: Number(dataOf(el, "id")) });
    if (success) {
      showSuccess(`Напоминание об${NBSP}оплате отправлено`);
    }
  });
  onClick("studentInvite", async (el) => {
    const link = `https://secrep.ru/invite/student/${dataOf(el, "id")}`;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
    }
    showSuccess(`Ссылка-приглашение скопирована: ${link}`);
  });
  function studentStatusLine(student2) {
    if (student2.connected) {
      return `<div class="status-connected">Подключен к${NBSP}SecRep</div>`;
    }
    return `<button type="button" class="status-invite" data-click="studentInvite" data-id="${student2.id}">Пригласить в${NBSP}SecRep</button>`;
  }
  function packagePill(student2) {
    const current3 = student2.packages[0];
    const plus = kitIconButton({ icon: plusSvg({ size: 30 }), click: "pageStub", data: { text: "Добавление абонемента как в базовом SecRep" }, naked: true, title: "Добавить абонемент" });
    if (!current3) {
      return `<div class="pill"><span class="pill-text none">Абонемента<br>нет</span>${plus}</div>`;
    }
    const filled = Math.min(100, current3.used / current3.total * 100);
    return `<div class="pill" title="Потрачено ${current3.used} из${NBSP}${current3.total}"><span class="pill-fill" style="--fill:${filled}%"></span><span class="pill-text">${current3.used}/${current3.total}<small>занятий</small></span>${plus}</div>`;
  }
  function studentCard(student2, options = {}) {
    const teacherNames = student2.teacherLinks.map((l) => teacherById(l.teacherId)?.name).filter((n) => Boolean(n));
    const teachersLine = options.showTeachers ? `<div class="student-card-teachers">${openBookSvg()}<span>${teacherNames.length ? esc(teacherNames.join(", ")) : `Учитель не${NBSP}назначен`}</span></div>` : "";
    return `<div class="student-card">
    <div class="student-card-head">${studentAvatarCircle(student2.name, student2.connected)}<div class="student-card-name"><div class="name">${esc(student2.name)}</div>${studentStatusLine(student2)}</div></div>
    ${teachersLine}
    <div class="student-card-pills">
      <div class="pill money"><span class="pill-amount">${moneyToString(student2.balance)}</span>${kitIconButton({ icon: plusSvg({ size: 30 }), click: "pageStub", data: { text: "Пополнение счета как в базовом SecRep" }, naked: true, title: "Пополнить" })}</div>
      ${packagePill(student2)}
    </div>
    <div class="student-card-actions">
      ${kitIconButton({ icon: bellSvg(), click: "studentRemind", data: { id: student2.id }, title: "Напомнить об оплате" })}
      ${kitButtonWhite({ text: "ДЗ", click: "pageStub", data: { text: "Домашние задания ученика как в базовом SecRep" }, full: true })}
      ${kitIconButton({ icon: goToSvg(), click: "studentOpen", data: { id: student2.id }, title: "Открыть карточку" })}
    </div>
  </div>`;
  }

  // src/components/GroupCard.ts
  var openedGroups = /* @__PURE__ */ new Set([201]);
  var archivedShown = /* @__PURE__ */ new Set();
  onClick("groupToggle", (el) => {
    const id = Number(dataOf(el, "id"));
    if (openedGroups.has(id)) {
      openedGroups.delete(id);
    } else {
      openedGroups.add(id);
    }
    requestRender();
  });
  onClick("groupArchivedToggle", (el) => {
    const id = Number(dataOf(el, "id"));
    if (archivedShown.has(id)) {
      archivedShown.delete(id);
    } else {
      archivedShown.add(id);
    }
    requestRender();
  });
  function memberCard(studentId, lessonsBalance) {
    const student2 = studentById(studentId);
    if (!student2) {
      return "";
    }
    const count = Math.abs(lessonsBalance);
    return `<div class="student-card">
    <div class="student-card-head">${studentAvatarCircle(student2.name, student2.connected)}<div class="student-card-name"><div class="name">${esc(student2.name)}</div>${studentStatusLine(student2)}</div></div>
    <div class="group-member-row">
      <div class="group-pill ${lessonsBalance < 0 ? "debt" : ""}"><span class="pill-text">${count}${NBSP}${plural(count, "занятие", "занятия", "занятий")}<small>${lessonsBalance < 0 ? "долг" : "оплачено"}</small></span>${kitIconButton({ icon: plusSvg({ size: 30 }), click: "pageStub", data: { text: "Пополнение как в базовом SecRep" }, naked: true, small: true, title: "Пополнить" })}</div>
      ${kitIconButton({ icon: bellSvg(), click: "studentRemind", data: { id: student2.id }, disabled: !student2.connected, title: "Напомнить об оплате" })}
      ${kitIconButton({ icon: goToSvg(), click: "studentOpen", data: { id: student2.id }, title: "Открыть карточку" })}
    </div>
  </div>`;
  }
  function groupCard(group, options = {}) {
    const opened = openedGroups.has(group.id);
    const names = group.members.map((m) => studentById(m.studentId)?.name).filter((n) => Boolean(n));
    const debtors2 = group.members.filter((m) => m.lessonsBalance < 0).length;
    const teacher2 = teacherById(group.teacherId);
    const next = group.nextLessonMoment ? dateTimeShort(group.nextLessonMoment) : "—";
    return `<div class="group-card ${opened ? "opened" : ""}">
    <div class="group-card-head" role="button" tabindex="0" data-click="groupToggle" data-id="${group.id}">
      ${groupAvatarCircles(names)}
      <span class="group-card-title"><span class="group-card-name">${esc(group.name)}</span>${options.showTeacher && teacher2 ? `<span class="group-card-teacher">Учитель: ${esc(teacher2.name)}</span>` : ""}</span>
      <span class="group-card-meta"><span>Ближайшее занятие: ${next}</span><span>${debtors2 ? `Должников: ${debtors2}` : "Должников нет"}</span></span>
      ${kitIconButton({ icon: checklistSvg(), click: "pageStub", data: { text: "Домашние задания группы как в базовом SecRep" }, title: "ДЗ группы" })}
      ${kitIconButton({ icon: pencilSvg(), click: "pageStub", data: { text: NOT_IN_MOCKUPS }, title: "Редактировать группу" })}
      <span class="group-card-chevron">${opened ? chevronDownSvg() : chevronRightSvg()}</span>
    </div>
    ${opened ? `<div class="group-card-body">
          <div class="group-card-grid">${group.members.map((m) => memberCard(m.studentId, m.lessonsBalance)).join("")}</div>
          <div class="group-card-archived">${switcherRow({ click: "groupArchivedToggle", data: { id: group.id }, content: "Показать архивных", control: modernSwitcher(archivedShown.has(group.id)) })}</div>
        </div>` : ""}
  </div>`;
  }

  // src/components/HistoryCard.ts
  function historyCard(props) {
    const who = props.who ? `<div class="history-card-who">${avatarCircle(props.who, { size: "xs" })}<span>${esc(props.who)}</span></div>` : "";
    const remove = props.removable ? kitIconButton({ icon: trashSvg(), click: "pageStub", naked: true, data: { text: "Удаление записи как в базовом SecRep" }, title: "Удалить" }) : "";
    return `<div class="history-card">
    <div class="history-card-content">
      <div class="history-card-date">${props.dateText}</div>
      <div class="history-card-event"><div>${esc(props.title)}</div>${who}</div>
      <div class="history-card-details"><div class="tone-${props.firstLineTone}">${props.firstLine}</div>${props.secondLine ? `<div>${props.secondLine}</div>` : ""}</div>
    </div>
    ${remove}
  </div>`;
  }

  // src/components/AddStudentPanel.ts
  var STATUSES = ["Активный", "Пробный", "На паузе"];
  var draft5 = null;
  var onAdded = null;
  function isValid(current3) {
    return current3.firstName.trim().length > 0 && Number(current3.price) > 0 && current3.currencyCode.trim().length > 0;
  }
  onInput("addStudentField", (el) => {
    if (!draft5 || !(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
      return;
    }
    const field = dataOf(el, "field");
    if (field === "firstName" || field === "lastName" || field === "price" || field === "priceMinutes" || field === "currencyCode" || field === "phone" || field === "telegram" || field === "source" || field === "comment") {
      draft5[field] = el.value;
    }
    el.closest(".kit-input")?.classList.toggle("filled", el.value !== "");
  });
  onInput("addStudentSearch", (el) => {
    if (draft5 && el instanceof HTMLInputElement) {
      draft5.search = el.value;
      requestRender();
    }
  });
  onClick("addStudentTeacher", (el) => {
    if (!draft5) {
      return;
    }
    const id = Number(dataOf(el, "id"));
    if (draft5.teacherIds.has(id)) {
      draft5.teacherIds.delete(id);
    } else {
      draft5.teacherIds.add(id);
    }
    requestRender();
  });
  onClick("addStudentStatus", () => {
    if (!draft5) {
      return;
    }
    const index = STATUSES.indexOf(draft5.status);
    draft5.status = STATUSES[(index + 1) % STATUSES.length] ?? "Активный";
    requestRender();
  });
  onClick("addStudentSave", async () => {
    if (!draft5) {
      return;
    }
    const name = `${draft5.firstName.trim()} ${draft5.lastName.trim()}`.trim();
    const duplicate = studentsData().find((s) => s.name.toLowerCase() === name.toLowerCase());
    const { success, resp } = await api("school/student_add", {
      firstName: draft5.firstName,
      lastName: draft5.lastName,
      price: Number(draft5.price),
      priceMinutes: Number(draft5.priceMinutes || 60),
      currencyCode: draft5.currencyCode,
      teacherIds: Array.from(draft5.teacherIds),
      status: draft5.status,
      phone: draft5.phone,
      telegram: draft5.telegram,
      source: draft5.source,
      comment: draft5.comment
    });
    if (!success) {
      return;
    }
    if (onAdded) {
      onAdded(resp.id);
    }
    closeTopPanel();
    await loadStudents();
    showSuccess(duplicate ? `Ученик добавлен. В${NBSP}школе уже есть «${duplicate.name}», проверьте, не${NBSP}дубль ли это` : `${name} добавлен. Пригласите его в${NBSP}SecRep из${NBSP}карточки`);
  });
  afterAnyInput(() => {
    const button = document.querySelector('[data-click="addStudentSave"]');
    if (button && draft5) {
      button.disabled = !isValid(draft5);
    }
  });
  function render2() {
    const current3 = draft5;
    if (!current3) {
      return { title: "", body: "" };
    }
    const query2 = current3.search.trim().toLowerCase();
    const teachers2 = activeTeachers().filter((t) => t.name.toLowerCase().includes(query2));
    return {
      title: "Добавить ученика",
      headExtra: `<button type="button" class="select-button compact" data-click="addStudentStatus"><span>${esc(current3.status)}</span>${chevronRightSvg({ size: 24 })}</button>`,
      body: `<div class="form-section"><h4>Имя ученика</h4><div class="form-name-row">${input({ label: "Имя*", filledLabel: "Имя", value: current3.firstName, input: "addStudentField", field: "firstName", maxlength: NAME_MAX_LENGTH })}${input({ label: "Фамилия", value: current3.lastName, input: "addStudentField", field: "lastName", maxlength: NAME_MAX_LENGTH })}</div></div>
      <div class="form-section"><h4>Способ оплаты</h4>
        <div class="form-row-fields">
          ${numberInput({ label: "Стоимость*", filledLabel: "Стоимость", value: current3.price, input: "addStudentField", field: "price", maxlength: PRICE_MAX_LENGTH, grow: true })}
          <span class="form-word">за</span>
          ${numberInput({ label: "минут", value: current3.priceMinutes, input: "addStudentField", field: "priceMinutes", maxlength: MINUTES_MAX_LENGTH, grow: true })}
          ${input({ label: "Валюта*", filledLabel: "Валюта", value: current3.currencyCode, input: "addStudentField", field: "currencyCode", maxlength: CURRENCY_MAX_LENGTH, grow: true })}
        </div>
      </div>
      <div class="form-section"><h4>С${NBSP}кем занимается?</h4>
        ${inputSearch({ value: current3.search, input: "addStudentSearch", id: "add-student-search" })}
        <div class="pick-list">${teachers2.map((t) => switcherRow({ click: "addStudentTeacher", data: { id: t.id }, controlFirst: true, control: checkbox(current3.teacherIds.has(t.id)), content: `<span class="pick-person">${avatarCircle(t.name, { size: "xs" })}<span class="pick-name">${esc(t.name)}</span></span>` })).join("")}</div>
      </div>
      <div class="form-section">
        <div class="form-title-icon">${questionCircleSvg()}<span>Дополнительная информация</span></div>
        ${input({ label: "Телефон", value: current3.phone, input: "addStudentField", field: "phone", maxlength: PHONE_MAX_LENGTH, inputmode: "tel", type: "tel" })}
        ${input({ label: "Telegram (или иное)", filledLabel: "Telegram", value: current3.telegram, input: "addStudentField", field: "telegram", maxlength: LINK_MAX_LENGTH })}
        ${input({ label: "Откуда появился", value: current3.source, input: "addStudentField", field: "source", maxlength: LINK_MAX_LENGTH })}
        ${textArea({ label: "Доп. информация", filledLabel: "Доп. информация", value: current3.comment, input: "addStudentField", field: "comment", charsLimit: TEXTAREA_MAX_LENGTH })}
      </div>`,
      foot: `${kitButtonBlack({ text: "Добавить ученика", click: "addStudentSave", secure: true, disabled: !isValid(current3), full: true })}${kitButtonWhite({ text: "Отменить", click: "panelBack", full: true })}`
    };
  }
  function openAddStudentPanel(teacherIds2 = [], added = null) {
    draft5 = { firstName: "", lastName: "", price: "", priceMinutes: "60", currencyCode: "RUB", phone: "", telegram: "", source: "", comment: "", status: "Активный", teacherIds: new Set(teacherIds2), search: "" };
    onAdded = added;
    openPanel("addStudent", render2);
  }

  // src/pages/staff/ExtendedTutorCard/tutorPanels.ts
  var financeRate = null;
  var payoutAmount = "";
  var infoDraft = null;
  var studentsSelection = /* @__PURE__ */ new Set();
  var studentsSearch = "";
  function cardTabs(teacherId2, active) {
    return tabs([{ key: "finance", text: "Финансы" }, { key: "info", text: "Инфо" }], active, "tutorPanelTab", { dark: true, data: { id: teacherId2 } });
  }
  onClick("tutorPanelTab", (el) => {
    const id = Number(dataOf(el, "id"));
    if (dataOf(el, "key") === "info") {
      openTutorInfoPanel(id, true);
      return;
    }
    openTutorFinancePanel(id, true);
  });
  onInput("tutorPayout", (el) => {
    if (el instanceof HTMLInputElement) {
      payoutAmount = el.value;
      el.closest(".kit-input")?.classList.toggle("filled", el.value !== "");
    }
  });
  onClick("tutorPayoutSave", async (el) => {
    const teacherId2 = Number(dataOf(el, "id"));
    const amount = Number(payoutAmount);
    const { success } = await api("school/teacher_payout_add", { teacherId: teacherId2, amount });
    if (!success) {
      return;
    }
    await Promise.all([loadTeachers(), reloadTeacherHistory(teacherId2)]);
    payoutAmount = String(teacherById(teacherId2)?.stats.toPay ?? 0);
    showSuccess(`Выплата ${moneyToString(amount)} отмечена`);
  });
  onClick("tutorRateSave", async (el) => {
    if (!financeRate) {
      return;
    }
    const { success } = await api("school/teacher_rate_edit", { id: Number(dataOf(el, "id")), ...rateRequest(financeRate) });
    if (!success) {
      return;
    }
    await loadTeachers();
    showSuccess(`Ставка сохранена и${NBSP}применится к${NBSP}новым занятиям`);
  });
  afterAnyInput(() => {
    const rateButton = document.querySelector('[data-click="tutorRateSave"]');
    if (rateButton && financeRate) {
      rateButton.disabled = !isRateDraftValid(financeRate);
    }
    const payoutButton = document.querySelector('[data-click="tutorPayoutSave"]');
    if (payoutButton) {
      payoutButton.disabled = !(Number(payoutAmount) > 0);
    }
    const infoButton = document.querySelector('[data-click="tutorInfoSave"]');
    if (infoButton && infoDraft) {
      infoButton.disabled = !infoDraft.name.trim();
    }
  });
  function openTutorFinancePanel(teacherId2, replace = false) {
    const teacher2 = teacherById(teacherId2);
    if (!teacher2) {
      return;
    }
    financeRate = rateDraftOf(teacher2);
    payoutAmount = String(teacher2.stats.toPay);
    (replace ? replacePanel : openPanel)(`tutorFinance:${teacherId2}`, () => {
      const current3 = teacherById(teacherId2);
      if (!current3 || !financeRate) {
        return { title: "", body: "" };
      }
      bindTeacherDraft(financeRate, null);
      const stats = current3.stats;
      return {
        title: current3.name,
        headExtra: cardTabs(teacherId2, "finance"),
        body: `<div class="panel-block">
          <div class="form-label-strong">С${NBSP}${dateShort(stats.periodStart)} по${NBSP}${dateShort(stats.periodEnd)}</div>
          <div class="widget-row"><span>Проведено занятий</span><b>${stats.lessonsCompleted}</b></div>
          <div class="widget-row"><span>По ставке</span><b>${moneyToString(current3.rate)}/${current3.rateMinutes}${NBSP}мин</b></div>
          <div class="widget-row"><span>Начислено</span><b>${moneyToString(stats.accrued)}</b></div>
          <div class="widget-row"><span class="form-label-strong">Комиссия школы</span><b>${moneyToString(-stats.schoolCommission)}</b></div>
          <div class="widget-row"><span>К${NBSP}выплате</span>${numberInput({ label: "Сумма", value: payoutAmount, input: "tutorPayout", field: "payout", maxlength: MONEY_MAX_LENGTH })}</div>
          <div>${kitButtonBlack({ text: "Отметить выплату", click: "tutorPayoutSave", data: { id: teacherId2 }, secure: true, disabled: !(Number(payoutAmount) > 0) })}</div>
        </div>
        <div class="panel-block">
          ${rateBlock(financeRate, `В${NBSP}случае изменения ставка применится к${NBSP}новым занятиям в${NBSP}расписании`)}
          <div>${kitButtonWhite({ text: "Сохранить", click: "tutorRateSave", data: { id: teacherId2 }, secure: true, disabled: !isRateDraftValid(financeRate) })}</div>
        </div>`
      };
    });
  }
  onInput("tutorInfoField", (el) => {
    if (!infoDraft || !(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
      return;
    }
    const field = dataOf(el, "field");
    if (field === "name" || field === "phone" || field === "telegram" || field === "source" || field === "comment") {
      infoDraft[field] = el.value;
    }
    el.closest(".kit-input")?.classList.toggle("filled", el.value !== "");
  });
  onClick("tutorInfoSave", async (el) => {
    if (!infoDraft) {
      return;
    }
    const { success } = await api("school/teacher_edit", { id: Number(dataOf(el, "id")), name: infoDraft.name, phone: infoDraft.phone, telegram: infoDraft.telegram, source: infoDraft.source, comment: infoDraft.comment, role: infoDraft.access.role, canAddStudents: infoDraft.access.canAddStudents, canAddLessons: infoDraft.access.canAddLessons });
    if (!success) {
      return;
    }
    await loadTeachers();
    showSuccess("Изменения сохранены");
  });
  onClick("tutorArchive", async (el) => {
    const teacher2 = teacherById(Number(dataOf(el, "id")));
    if (!teacher2) {
      return;
    }
    const { success } = await api("school/teacher_archive", { id: teacher2.id });
    if (!success) {
      return;
    }
    closeAllPanels();
    await loadTeachers();
    goTo({ page: "staff", view: "list" });
    showSuccess(`${teacher2.name} в${NBSP}архиве. Место на${NBSP}тарифе освободилось`);
  });
  function openTutorInfoPanel(teacherId2, replace = false) {
    const teacher2 = teacherById(teacherId2);
    if (!teacher2) {
      return;
    }
    infoDraft = { name: teacher2.name, phone: teacher2.phone ?? "", telegram: teacher2.telegram ?? "", source: teacher2.source ?? "", comment: teacher2.comment ?? "", access: { role: teacher2.role, canAddStudents: teacher2.canAddStudents, canAddLessons: teacher2.canAddLessons } };
    (replace ? replacePanel : openPanel)(`tutorInfo:${teacherId2}`, () => {
      const current3 = teacherById(teacherId2);
      if (!current3 || !infoDraft) {
        return { title: "", body: "" };
      }
      bindTeacherDraft(null, infoDraft.access);
      return {
        title: current3.name,
        headExtra: cardTabs(teacherId2, "info"),
        body: `<div class="panel-person">${tutorAvatarCircle(current3.name, current3.connected)}<span class="form-label-strong">${esc(current3.name)}</span></div>
        <div class="form-section">
          <div class="form-access-row"><h4>Подключенные к${NBSP}аккаунту адреса</h4>${kitIconButton({ icon: plusSvg(), click: "teacherInvite", data: { id: current3.id }, title: "Пригласить" })}</div>
          ${current3.email ? `<div><div>${esc(current3.email)}</div><div class="form-hint">${current3.hasTgBot ? `Подключен к${NBSP}Telegram-боту` : `Не${NBSP}подключен к${NBSP}Telegram-боту`}</div></div>` : `<div class="form-hint">Учитель еще не${NBSP}принял приглашение</div>`}
        </div>
        ${accessBlock(infoDraft.access)}
        <div class="form-section">
          <h4>Общая информация</h4>
          ${input({ label: "Имя учителя", value: infoDraft.name, input: "tutorInfoField", field: "name", maxlength: NAME_MAX_LENGTH })}
          <div class="form-row-fields">
            ${input({ label: "Телефон", value: infoDraft.phone, input: "tutorInfoField", field: "phone", maxlength: PHONE_MAX_LENGTH, inputmode: "tel", type: "tel", grow: true })}
            ${input({ label: "Telegram (или иное)", filledLabel: "Telegram", value: infoDraft.telegram, input: "tutorInfoField", field: "telegram", maxlength: LINK_MAX_LENGTH, grow: true })}
          </div>
          ${input({ label: "Откуда появился", value: infoDraft.source, input: "tutorInfoField", field: "source", maxlength: LINK_MAX_LENGTH })}
          ${textArea({ label: "Доп. информация", filledLabel: "Доп. информация", value: infoDraft.comment, input: "tutorInfoField", field: "comment", charsLimit: TEXTAREA_MAX_LENGTH })}
          <div>${kitButtonBlack({ text: "Сохранить", click: "tutorInfoSave", data: { id: current3.id }, secure: true, disabled: !infoDraft.name.trim() })}</div>
        </div>
        <div class="danger-block">
          <div class="form-label-strong">Удаление и${NBSP}архивирование</div>
          <div>Здесь можно удалить карточку учителя или отправить ее в${NBSP}архив</div>
          <div class="danger-block-actions">${kitButtonPrimaryAlert({ text: "Удалить", click: "pageStub", data: { text: `Удаление требует подтверждения, этого состояния пока нет в${NBSP}макетах` } })}${kitButtonSecondaryAlert({ text: "Архивировать", click: "tutorArchive", data: { id: current3.id }, secure: true })}</div>
        </div>`
      };
    });
  }
  onClick("tutorHistorySearch", () => {
    showInfo(`Фильтр по${NBSP}периоду применен`);
  });
  function openTutorHistoryPanel(teacherId2) {
    openPanel(`tutorHistory:${teacherId2}`, () => ({
      title: "История уроков",
      body: `<div class="period-picker">
        ${input({ label: "Начало периода", value: "29.09.2026", input: "noop", field: "from", maxlength: DATE_MAX_LENGTH, center: true, grow: true })}
        ${input({ label: "Конец периода", value: "05.10.2026", input: "noop", field: "to", maxlength: DATE_MAX_LENGTH, center: true, grow: true })}
        ${kitButtonWhite({ text: "Поиск", click: "tutorHistorySearch", full: true })}
      </div>
      <div class="history-list">${teacherHistory().map(historyItemCard).join("") || '<div class="form-hint">Пока нет событий</div>'}</div>`
    }));
  }
  onInput("tutorStudentsSearch", (el) => {
    if (el instanceof HTMLInputElement) {
      studentsSearch = el.value;
      requestRender();
    }
  });
  onClick("tutorStudentToggle", (el) => {
    const id = Number(dataOf(el, "id"));
    if (studentsSelection.has(id)) {
      studentsSelection.delete(id);
    } else {
      studentsSelection.add(id);
    }
    requestRender();
  });
  onClick("tutorStudentsSave", async (el) => {
    const teacherId2 = Number(dataOf(el, "id"));
    const { success } = await api("school/teacher_students_set", { teacherId: teacherId2, studentIds: Array.from(studentsSelection) });
    if (!success) {
      return;
    }
    closeAllPanels();
    await loadStudents();
    showSuccess("Список учеников обновлен");
  });
  onClick("tutorStudentNew", (el) => {
    const teacherId2 = Number(dataOf(el, "id"));
    openAddStudentPanel([teacherId2], (newId2) => {
      studentsSelection.add(newId2);
    });
  });
  function openTutorStudentsPanel(teacherId2) {
    studentsSelection = new Set(teacherStudents(teacherId2).map((s) => s.id));
    studentsSearch = "";
    openPanel(`tutorStudents:${teacherId2}`, () => {
      const teacher2 = teacherById(teacherId2);
      const query2 = studentsSearch.trim().toLowerCase();
      const list = studentsData().filter((s) => !s.archived && s.name.toLowerCase().includes(query2));
      return {
        title: `${teacher2?.name ?? ""} — ученики`,
        body: `<div class="panel-person">${teacher2 ? tutorAvatarCircle(teacher2.name, teacher2.connected) : ""}<span class="form-label-strong">${esc(teacher2?.name ?? "")}</span></div>
        <div class="form-access-row"><span class="form-label-strong">Ученики</span>${kitIconButton({ icon: plusSvg(), click: "tutorStudentNew", data: { id: teacherId2 }, dark: true, title: "Новый ученик" })}</div>
        ${inputSearch({ value: studentsSearch, input: "tutorStudentsSearch", id: "tutor-students-search" })}
        <div class="pick-list">${list.map((s) => {
          const others = s.teacherLinks.filter((l) => l.teacherId !== teacherId2).map((l) => teacherById(l.teacherId)?.name).filter(Boolean).join(", ");
          return switcherRow({ click: "tutorStudentToggle", data: { id: s.id }, controlFirst: true, control: checkbox(studentsSelection.has(s.id)), content: `<span class="pick-person">${avatarCircle(s.name, { size: "xs" })}<span class="pick-name">${esc(s.name)}</span><span class="pick-extra">${esc(others)}</span></span>` });
        }).join("")}</div>`,
        foot: `${kitButtonBlack({ text: "Сохранить", click: "tutorStudentsSave", data: { id: teacherId2 }, secure: true, full: true })}${kitButtonWhite({ text: "Отменить", click: "panelClose", full: true })}`
      };
    });
  }

  // src/pages/staff/ExtendedTutorCard/ExtendedTutorCard.ts
  function createTeacherHistoryLoader() {
    return newLoader({
      action: "school/teacher_history_get",
      responseConversion(resp) {
        return resp.map((item) => ({ ...item, moment: new Date(item.moment) }));
      }
    });
  }
  var historyLoader = createTeacherHistoryLoader();
  var loadedForTeacherId = 0;
  function reloadTeacherHistory(teacherId2) {
    loadedForTeacherId = teacherId2;
    return historyLoader.load({ id: teacherId2 });
  }
  function teacherHistory() {
    return loadedData(historyLoader.get()) ?? [];
  }
  onClick("tutorBack", () => {
    goTo({ page: "staff", view: "list" });
  });
  onClick("tutorFinance", (el) => {
    openTutorFinancePanel(Number(dataOf(el, "id")));
  });
  onClick("tutorInfo", (el) => {
    openTutorInfoPanel(Number(dataOf(el, "id")));
  });
  onClick("tutorHistory", (el) => {
    openTutorHistoryPanel(Number(dataOf(el, "id")));
  });
  onClick("tutorStudents", (el) => {
    openTutorStudentsPanel(Number(dataOf(el, "id")));
  });
  onClick("tutorSchedule", (el) => {
    setScheduleFilter([Number(dataOf(el, "id"))], false);
    goTo({ page: "schedule" });
  });
  function historyItemCard(item) {
    const dateText = `${dateFull(item.moment)}, ${timeHm(item.moment)}`;
    if (item.type === "payout") {
      return historyCard({ dateText, title: "Выплачена зарплата", firstLine: moneyToString(item.amount), firstLineTone: "violet" });
    }
    const student2 = item.studentId ? studentById(item.studentId) : null;
    const cancelled = item.type === "lessonCancelled";
    return historyCard({
      dateText,
      title: cancelled ? "Занятие отменено" : "Проведено занятие",
      who: student2?.name ?? null,
      firstLine: cancelled ? moneyToString(0) : moneyDeltaToString(item.amount),
      firstLineTone: cancelled ? "alert" : "income",
      secondLine: `Доход школы: ${moneyToString(item.schoolIncome)}`
    });
  }
  function whoOfLesson2(studentId, groupId) {
    if (groupId) {
      return groupById(groupId)?.name ?? "";
    }
    return studentId ? studentById(studentId)?.name ?? "" : "";
  }
  function widgetHead(title, click, teacherId2) {
    return `<div class="widget-head"><h3>${title}</h3>${kitIconButton({ icon: goToSvg({ size: 40 }), click, data: { id: teacherId2 }, title: "Открыть" })}</div>`;
  }
  function bento(teacher2) {
    const stats = teacher2.stats;
    const nextLessons = nextLessonsOfTeacher(teacher2.id, 3);
    const history2 = teacherHistory().slice(0, 3);
    const commission = teacher2.commissionType === "percent" ? `${teacher2.commissionValue}${NBSP}%` : moneyToString(teacher2.commissionValue);
    return `<div class="tutor-bento">
    <div class="widget">
      ${widgetHead(`К${NBSP}выплате`, "tutorFinance", teacher2.id)}
      <div><div class="widget-amount">${moneyToString(stats.toPay)}</div><div class="widget-caption">С${NBSP}${dateShort(stats.periodStart)} по${NBSP}${dateShort(stats.periodEnd)}</div></div>
      <div class="widget-row"><span>Проведено занятий</span><b>${stats.lessonsCompleted}</b></div>
      <div class="widget-row"><span>Комиссия школы</span><b>${moneyToString(stats.schoolCommission)}</b></div>
      <div class="widget-bottom">${kitButtonBlack({ text: "Отметить выплату", click: "tutorFinance", data: { id: teacher2.id }, full: true })}</div>
    </div>
    <div class="widget">
      ${widgetHead("Ставка учителя", "tutorFinance", teacher2.id)}
      <div><div class="widget-amount">${moneyToString(teacher2.rate)}</div><div class="widget-caption">за${NBSP}${teacher2.rateMinutes}${NBSP}мин</div></div>
      <div class="widget-row"><span>Комиссия школы</span><b>${commission}</b></div>
      <div class="widget-row"><span>Валюта</span><b>${esc(teacher2.currencyCode)}</b></div>
    </div>
    <div class="widget">
      ${widgetHead("Ближайшие уроки", "tutorSchedule", teacher2.id)}
      ${nextLessons.length ? nextLessons.map((l) => `<div class="widget-lesson">${clockSvg()}<div><div class="widget-lesson-time">${dateTimeShort(l.startMoment)}</div><div class="widget-caption">${esc(whoOfLesson2(l.studentId, l.groupId))} · ${minutesBetween(l.startMoment, l.endMoment)}${NBSP}мин</div></div></div>`).join("") : '<div class="widget-caption">Ближайших уроков нет</div>'}
    </div>
    <div class="widget wide">
      ${widgetHead("История уроков", "tutorHistory", teacher2.id)}
      ${historyLoader.get().state === "loading" && !history2.length ? loading() : `<div class="history-list">${history2.map(historyItemCard).join("") || '<div class="widget-caption">Пока нет событий</div>'}</div>`}
    </div>
    <div class="widget">
      ${widgetHead("Профиль", "tutorInfo", teacher2.id)}
      <div>${teacher2.email ? `<div>${esc(teacher2.email)}</div><div class="widget-caption">${teacher2.hasTgBot ? `Подключен к${NBSP}Telegram-боту` : `Не${NBSP}подключен к${NBSP}Telegram-боту`}</div>` : `<div class="widget-caption">Почта не${NBSP}привязана</div>`}</div>
      <div><div>${esc(teacher2.phone ?? "—")}</div><div class="widget-caption">Телефон</div></div>
      <div class="widget-row"><span>Уровень доступа</span>${roleTag(teacher2.role)}</div>
      <div class="widget-row"><span>Добавление учеников</span><b>${teacher2.canAddStudents ? "Да" : "Нет"}</b></div>
      <div class="widget-row"><span>Добавление уроков</span><b>${teacher2.canAddLessons ? "Да" : "Нет"}</b></div>
    </div>
  </div>`;
  }
  function extendedTutorCard(teacherId2) {
    const teacher2 = teacherById(teacherId2);
    if (!teacher2) {
      return loading();
    }
    if (loadedForTeacherId !== teacherId2) {
      fireAndForget(reloadTeacherHistory(teacherId2));
    }
    const studentsOfTeacher = teacherStudents(teacher2.id);
    const groupsOfTeacher = groupsData().filter((g) => g.teacherId === teacher2.id);
    return `<div class="tutor-card">
    <div class="card-back-head">${kitIconButton({ icon: chevronLeftSvg(), click: "tutorBack", naked: true, title: "Назад" })}${tutorAvatarCircle(teacher2.name, teacher2.connected)}<div class="teacher-row-name"><div class="name">${esc(teacher2.name)}</div>${teacherStatusLine(teacher2)}</div></div>
    ${bento(teacher2)}
    <div class="section-head"><h2>Ученики</h2>${kitButtonBlack({ text: "Добавить ученика", click: "tutorStudents", data: { id: teacher2.id } })}</div>
    ${studentsOfTeacher.length ? `<div class="cards-grid">${studentsOfTeacher.map((s) => studentCard(s)).join("")}</div>` : emptyState(`У${NBSP}этого учителя пока нет учеников`, "Но можно добавить их, нажав на кнопку «Добавить ученика»")}
    <div class="section-head"><h2>Группы <span class="count-badge">${groupsOfTeacher.length}</span></h2>${kitButtonBlack({ text: "Добавить группу", click: "pageStub", data: { text: NOT_IN_MOCKUPS } })}</div>
    ${groupsOfTeacher.map((g) => groupCard(g)).join("") || '<div class="widget-caption">Групп пока нет</div>'}
  </div>`;
  }

  // src/pages/staff/TeacherHw/TeacherHw.ts
  var TOPIC = `Дроби. Основное свойство дроби, действия с${NBSP}дробями`;
  var SECTIONS = [
    { status: "overdue", title: "Просрочено", items: [{ who: "Ученик 14", topic: TOPIC }] },
    { status: "review", title: "На проверку", items: [{ who: "Испанский А1", topic: "Los hechos y los derechos", progress: `Сдано 8 из${NBSP}8` }, { who: "Ученик 15", topic: TOPIC }, { who: "Администратор", topic: TOPIC }, { who: "Ученик 16", topic: TOPIC }] },
    { status: "inProgress", title: "Выполняются", items: [{ who: "Группа 01", topic: TOPIC, progress: `Сдано 4 из${NBSP}8` }, { who: "Ученик 14", topic: TOPIC }, { who: "Ученик 17", topic: `Числа и${NBSP}вычисления` }, { who: "Ученик 13", topic: TOPIC }] },
    { status: "sent", title: "Отправлено", items: [{ who: "Группа 01", topic: TOPIC }, { who: "Ученик 14", topic: TOPIC }] }
  ];
  onClick("teacherHwBack", () => {
    goTo({ page: "staff", view: "list" });
  });
  function teacherHw(teacherId2) {
    const teacher2 = teacherById(teacherId2);
    if (!teacher2) {
      return loading();
    }
    const stub = (text) => ({ text });
    return `<div class="card-back-head wrap">
      ${kitIconButton({ icon: chevronLeftSvg(), click: "teacherHwBack", naked: true, title: "Назад" })}${tutorAvatarCircle(teacher2.name, teacher2.connected)}
      <div class="teacher-row-name"><div class="name">${esc(teacher2.name)}</div><div class="status-connected">Домашние задания</div></div>
      <span class="list-toolbar-spacer"></span>
      ${isTablet() ? tabs([{ key: "current", text: "Текущие" }, { key: "checked", text: "Проверенные" }, { key: "templates", text: "Шаблоны" }], "current", "pageStub") : ""}
      ${kitButtonBlack({ text: "Добавить ДЗ", click: "pageStub", data: stub("Создание ДЗ как в базовом SecRep") })}
    </div>
    ${SECTIONS.map((section) => `<section class="hw-section">
      <h3>${section.status === "inProgress" ? questionCircleSvg() : ""}${section.title} <span class="count-badge">${section.items.length}</span></h3>
      <div class="hw-grid">${section.items.map((item) => `<div class="hw-card ${section.status}">
        <div class="hw-card-head">${avatarCircle(item.who)}<div class="hw-card-who"><div class="name">${esc(item.who)}</div>${item.progress ? `<div>${item.progress}</div>` : ""}</div>${dotsVerticalSvg()}</div>
        <div>${item.topic}</div>
        <div class="hw-card-bottom"><div><div class="form-label-strong">Дедлайн</div><div>02.05.24 08:00</div></div>${kitIconButton({ icon: goToSvg(), click: "pageStub", data: stub("Карточка ДЗ как в базовом SecRep"), title: "Открыть ДЗ" })}</div>
      </div>`).join("")}</div>
    </section>`).join("")}`;
  }

  // src/pages/staff/Staff.ts
  var tab = "active";
  var search = "";
  var refocusSearch = false;
  function seatsLeft() {
    const limit = schoolData()?.teachersLimit ?? 0;
    const active = (loadedData(teachers.get()) ?? []).filter((t) => !t.archived).length;
    return limit - active;
  }
  onClick("staffTab", (el) => {
    tab = dataOf(el, "key") === "archive" ? "archive" : "active";
    requestRender();
  });
  onInput("staffSearch", (el) => {
    if (!(el instanceof HTMLInputElement)) {
      return;
    }
    search = el.value;
    refocusSearch = true;
    requestRender();
  });
  onClick("staffAddTeacher", () => {
    if (seatsLeft() <= 0) {
      showError(`Свободных мест на${NBSP}тарифе нет. Смените тариф или отправьте учителя в${NBSP}архив`);
      return;
    }
    openAddTeacherPanel();
  });
  onClick("staffOpenTutor", (el) => {
    goTo({ page: "staff", view: "tutor", teacherId: Number(dataOf(el, "id")) });
  });
  onClick("staffOpenHw", (el) => {
    goTo({ page: "staff", view: "hw", teacherId: Number(dataOf(el, "id")) });
  });
  onClick("staffRestore", async (el) => {
    const { success } = await api("school/teacher_restore", { id: Number(dataOf(el, "id")) });
    if (!success) {
      return;
    }
    await loadTeachers();
    showSuccess("Учитель вернулся в активные");
  });
  onClick("staffChangeTariff", () => {
    goTo({ page: "subscription" });
  });
  function teacherRow2(teacher2) {
    const studentsCount = teacherStudents(teacher2.id).length;
    const next = nextLessonsOfTeacher(teacher2.id, 1)[0];
    const nextText = next ? dateTimeShort(next.startMoment) : "—";
    const actions = tab === "active" ? `${kitButtonWhite({ text: "ДЗ", click: "staffOpenHw", data: { id: teacher2.id } })}${kitIconButton({ icon: goToSvg(), click: "staffOpenTutor", data: { id: teacher2.id }, title: "Открыть карточку" })}` : kitButtonWhite({ text: "Вернуть", click: "staffRestore", data: { id: teacher2.id }, secure: true });
    const name = `<div class="teacher-row-person">${tutorAvatarCircle(teacher2.name, teacher2.connected)}<div class="teacher-row-name"><div class="name">${esc(teacher2.name)}</div>${teacherStatusLine(teacher2)}</div></div>`;
    if (!isDesktop()) {
      return `<div class="teacher-row">
      ${name}
      <div class="teacher-row-line">${roleTag(teacher2.role)}<span class="teacher-row-stat">${userSvg()}${studentsCount}${NBSP}${plural(studentsCount, "ученик", "ученика", "учеников")}</span></div>
      <div class="teacher-row-line"><span class="teacher-row-money">${moneyToString(teacher2.stats.toPay)}</span><span class="teacher-row-stat">${clockSvg()}Ближайший урок: ${nextText}</span></div>
      <div class="teacher-row-actions">${actions}</div>
    </div>`;
    }
    return `<div class="teacher-row grid">
    ${name}
    <div class="teacher-row-cell">${roleTag(teacher2.role)}</div>
    <div class="teacher-row-cell teacher-row-money">${moneyToString(teacher2.stats.toPay)}</div>
    ${isWide() ? `<div class="teacher-row-cell teacher-row-stat">${userSvg()}${studentsCount}</div>` : ""}
    <div class="teacher-row-cell teacher-row-stat">${clockSvg()}${nextText}</div>
    <div class="teacher-row-actions">${actions}</div>
  </div>`;
  }
  function gridColumnsClass() {
    return isWide() ? "columns-5" : "columns-4";
  }
  function addTeacherCard() {
    const school2 = schoolData();
    const left = seatsLeft();
    const tariff = esc(school2?.tariffName ?? "");
    const text = left > 0 ? `На тарифе «${tariff}» осталось ${left}${NBSP}${plural(left, "свободное место", "свободных места", "свободных мест")}` : `На тарифе «${tariff}» свободных мест не${NBSP}осталось. <button type="button" class="status-invite" data-click="staffChangeTariff">Сменить тариф</button>`;
    return `<div class="add-teacher-card ${left <= 0 ? "full" : ""}">
    <div class="add-teacher-card-title"><span>Добавить учителя</span>${kitIconButton({ icon: plusSvg(), click: "staffAddTeacher", title: "Добавить учителя" })}</div>
    <div class="add-teacher-card-text">${text}</div>
    <img class="add-teacher-card-image" src="assets/glasses.png" alt="">
  </div>`;
  }
  function staffList() {
    const store = teachers.get();
    if (store.state === "error") {
      return loadError();
    }
    const data = loadedData(store);
    if (!data) {
      return loading();
    }
    const query2 = search.trim().toLowerCase();
    const list = data.filter((t) => (tab === "active" ? !t.archived : t.archived) && t.name.toLowerCase().includes(query2));
    const desktop = isDesktop();
    const head = desktop ? `<div class="teacher-list-head grid ${gridColumnsClass()}"><span>Учитель</span><span>Роль</span><span>К${NBSP}выплате</span>${isWide() ? "<span>Учеников</span>" : ""}<span>Ближ. урок</span><span></span></div>` : "";
    const empty = list.length ? "" : emptyState(tab === "active" ? `Сотрудников не${NBSP}найдено` : `В${NBSP}архиве пока пусто`);
    return `<div class="list-toolbar">
      ${inputSearch({ value: search, input: "staffSearch", id: "staff-search" })}
      ${tabs([{ key: "active", text: "Активные" }, { key: "archive", text: "Архив" }], tab, "staffTab")}
      ${isTablet() ? `<span class="list-toolbar-spacer"></span>${kitButtonBlack({ text: "Добавить учителя", click: "staffAddTeacher" })}` : kitIconButton({ icon: plusSvg(), click: "staffAddTeacher", dark: true, title: "Добавить учителя" })}
    </div>
    ${head}
    <div class="teacher-list ${gridColumnsClass()}">${list.map(teacherRow2).join("")}</div>
    ${empty}
    ${tab === "active" ? addTeacherCard() : ""}`;
  }
  function staffPage() {
    const r = route();
    if (r.page === "staff" && r.view === "tutor") {
      return page({ activeMenu: "staff", title: "Учителя", content: extendedTutorCard(r.teacherId) });
    }
    if (r.page === "staff" && r.view === "hw") {
      return page({ activeMenu: "staff", title: "Домашние задания", content: teacherHw(r.teacherId) });
    }
    return page({ activeMenu: "staff", title: "Учителя", content: staffList() });
  }
  function afterStaffRender() {
    if (!refocusSearch) {
      return;
    }
    refocusSearch = false;
    const field = document.getElementById("staff-search");
    if (field instanceof HTMLInputElement && document.activeElement !== field) {
      field.focus();
      field.setSelectionRange(field.value.length, field.value.length);
    }
  }

  // src/pages/students/ExtendedStudentCard/studentInfo.ts
  var draft6 = null;
  function draftFor(student2) {
    if (!draft6 || draft6.studentId !== student2.id) {
      draft6 = { studentId: student2.id, name: student2.name, phone: student2.phone ?? "", telegram: student2.telegram ?? "", source: student2.source ?? "", comment: student2.comment ?? "" };
    }
    return draft6;
  }
  onInput("studentInfoField", (el) => {
    if (!draft6 || !(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
      return;
    }
    const field = dataOf(el, "field");
    if (field === "name" || field === "phone" || field === "telegram" || field === "source" || field === "comment") {
      draft6[field] = el.value;
    }
    el.closest(".kit-input")?.classList.toggle("filled", el.value !== "");
  });
  afterAnyInput(() => {
    const button = document.querySelector('[data-click="studentInfoSave"]');
    if (button && draft6) {
      button.disabled = !draft6.name.trim();
    }
  });
  onClick("studentInfoSave", async () => {
    if (!draft6) {
      return;
    }
    const { success } = await api("school/student_edit", { id: draft6.studentId, name: draft6.name, phone: draft6.phone, telegram: draft6.telegram, source: draft6.source, comment: draft6.comment });
    if (!success) {
      return;
    }
    await loadStudents();
    showSuccess("Изменения сохранены");
  });
  onClick("studentArchive", async (el) => {
    const id = Number(dataOf(el, "id"));
    const archived = dataOf(el, "archived") === "1";
    const { success } = await api(archived ? "school/student_restore" : "school/student_archive", { id });
    if (!success) {
      return;
    }
    await loadStudents();
    goTo({ page: "students", view: "list" });
    showSuccess(archived ? `Ученик снова в${NBSP}активных` : `Ученик в${NBSP}архиве. История занятий и${NBSP}оплат сохранена`);
  });
  onClick("studentHistorySearch", () => {
    showInfo(`Фильтр по${NBSP}периоду применен`);
  });
  function studentHistory(student2) {
    const firstLink = student2.teacherLinks[0];
    const secondLink = student2.teacherLinks[1] ?? firstLink;
    const firstTeacher = firstLink ? teacherById(firstLink.teacherId) : null;
    const secondTeacher = secondLink ? teacherById(secondLink.teacherId) : null;
    const toTeacher = firstTeacher ? firstTeacher.rate - (firstTeacher.commissionType === "percent" ? Math.round(firstTeacher.rate * firstTeacher.commissionValue / 100) : firstTeacher.commissionValue) : 0;
    const packageName = student2.packages[0]?.name ?? "Голден";
    const cards = [
      historyCard({ dateText: "25.09.2026, 15:23", title: "Занятие отменено (Прогул)", who: firstTeacher?.name, firstLine: `${MINUS_SIGN}1${NBSP}занятие`, firstLineTone: "alert", secondLine: `Абонемент «${esc(packageName)}»` }),
      historyCard({ dateText: "25.09.2026, 15:23", title: "Пополнен счет", firstLine: moneyDeltaToString(4500), firstLineTone: "income", secondLine: `На${NBSP}счету: ${moneyToString(4500)}`, removable: true }),
      historyCard({ dateText: "25.09.2026, 14:31", title: "Занятие перенесено (Болезнь)", who: secondTeacher?.name, firstLine: moneyToString(0), firstLineTone: "income", secondLine: `На${NBSP}счету: ${moneyToString(0)}` }),
      historyCard({ dateText: "24.09.2026, 14:31", title: "Проведено занятие", who: firstTeacher?.name, firstLine: moneyDeltaToString(firstLink?.price ?? student2.price), firstLineTone: "income", secondLine: `Доход школы: ${moneyToString((firstLink?.price ?? student2.price) - toTeacher)}` }),
      historyCard({ dateText: "01.06.2026<br>31.08.2026", title: "Занятия отменены (Каникулы)", firstLine: moneyToString(0), firstLineTone: "income", secondLine: `На${NBSP}счету: ${moneyToString(0)}` })
    ];
    return `<div class="section-head"><h2 class="display">История</h2></div>
    <div class="period-picker">
      ${input({ label: "Начало периода", value: "01.10.2026", input: "noop", field: "from", maxlength: DATE_MAX_LENGTH, center: true, grow: true })}
      ${input({ label: "Конец периода", value: "31.10.2026", input: "noop", field: "to", maxlength: DATE_MAX_LENGTH, center: true, grow: true })}
      ${kitButtonWhite({ text: "Поиск", click: "studentHistorySearch", full: true })}
    </div>
    <div class="history-list">${cards.join("")}</div>
    ${kitButtonLink({ text: "Показать еще", click: "pageStub", data: { text: "Подгрузим еще события" } })}`;
  }
  function studentInfo(student2) {
    const current3 = draftFor(student2);
    const address = student2.email ? `<div class="info-address">${avatarCircle(student2.name, { telegram: true })}<span><div>${esc(student2.name)}</div><div class="form-hint">${esc(student2.email)}</div></span>${kitIconButton({ icon: crossSvg(), click: "pageStub", data: { text: "Отвязка адреса как в базовом SecRep" }, naked: true, title: "Отвязать" })}</div>` : `<div class="form-hint">Ученик еще не${NBSP}подключился. Отправьте ему ссылку-приглашение</div>`;
    return `<div class="info-section" id="student-info">
    <div class="section-head"><h2 class="display">Общая информация</h2></div>
    <div class="form-access-row"><span class="form-label-strong">Подключенные к${NBSP}аккаунту адреса</span>${kitIconButton({ icon: plusSvg(), click: "studentInvite", data: { id: student2.id }, title: "Пригласить" })}</div>
    ${address}
    <div class="form-access-row"><div><div class="form-label-strong">Кому отправлять уведомления об${NBSP}оплате</div><div class="form-hint">Выбранный аккаунт будет получать счета в${NBSP}SecRep Пэй и${NBSP}напоминания об${NBSP}оплате</div></div>
      <button type="button" class="select-button" data-click="pageStub" data-text="Выбор получателя как в базовом SecRep"><span>${esc(student2.email ? student2.name : "Не выбран")}</span>${chevronRightSvg({ size: 24 })}</button></div>
    <div class="form-section">
      <div class="form-row-fields">${input({ label: "Имя ученика", value: current3.name, input: "studentInfoField", field: "name", maxlength: NAME_MAX_LENGTH, grow: true })}${input({ label: "Валюта", value: student2.currencyCode, input: "noop", field: "currency", maxlength: CURRENCY_MAX_LENGTH })}</div>
      <div class="form-row-fields">${input({ label: "Телефон", value: current3.phone, input: "studentInfoField", field: "phone", maxlength: PHONE_MAX_LENGTH, inputmode: "tel", type: "tel", grow: true })}${input({ label: "Telegram (или иное)", filledLabel: "Telegram", value: current3.telegram, input: "studentInfoField", field: "telegram", maxlength: LINK_MAX_LENGTH, grow: true })}</div>
      ${input({ label: "Откуда появился", value: current3.source, input: "studentInfoField", field: "source", maxlength: LINK_MAX_LENGTH })}
      ${textArea({ label: "Доп. информация", filledLabel: "Доп. информация", value: current3.comment, input: "studentInfoField", field: "comment", charsLimit: TEXTAREA_MAX_LENGTH })}
      <div>${kitButtonBlack({ text: "Сохранить", click: "studentInfoSave", secure: true, disabled: !current3.name.trim() })}</div>
    </div>
    <div class="danger-block line">
      <h2 class="display">Удаление и${NBSP}архивирование</h2>
      <div>Здесь можно удалить карточку ученика или отправить ее в${NBSP}архив</div>
      <div class="danger-block-actions">${kitButtonPrimaryAlert({ text: "Удалить", click: "pageStub", data: { text: `Удаление требует подтверждения, этого состояния пока нет в${NBSP}макетах` } })}${kitButtonSecondaryAlert({ text: student2.archived ? "Вернуть из архива" : "Архивировать", click: "studentArchive", data: { id: student2.id, archived: student2.archived ? 1 : 0 }, secure: true })}</div>
    </div>
  </div>`;
  }

  // src/pages/students/ExtendedStudentCard/studentPanels.ts
  var linkPrice = "";
  var assignSelection = /* @__PURE__ */ new Set();
  onInput("studentLinkPrice", (el) => {
    if (el instanceof HTMLInputElement) {
      linkPrice = el.value;
      el.closest(".kit-input")?.classList.toggle("filled", el.value !== "");
    }
  });
  afterAnyInput(() => {
    const button = document.querySelector('[data-click="studentLinkSave"]');
    if (button) {
      button.disabled = !(Number(linkPrice) > 0);
    }
  });
  onClick("studentLinkSave", async (el) => {
    const { success } = await api("school/student_teacher_link_edit", { studentId: Number(dataOf(el, "student")), teacherId: Number(dataOf(el, "teacher")), price: Number(linkPrice) });
    if (!success) {
      return;
    }
    closeAllPanels();
    await loadStudents();
    showSuccess(`Стоимость для${NBSP}этой связки сохранена`);
  });
  function openLinkEditPanel(studentId, teacherId2) {
    const student2 = studentById(studentId);
    linkPrice = String(student2?.teacherLinks.find((l) => l.teacherId === teacherId2)?.price ?? "");
    openPanel(`studentLink:${studentId}:${teacherId2}`, () => {
      const currentStudent = studentById(studentId);
      const teacher2 = teacherById(teacherId2);
      if (!currentStudent || !teacher2) {
        return { title: "", body: "" };
      }
      const commission = teacher2.commissionType === "percent" ? `${teacher2.commissionValue}%` : moneyToString(teacher2.commissionValue);
      return {
        title: `Связь ученика с${NBSP}учителем`,
        narrow: true,
        body: `<div class="panel-person">${avatarCircle(teacher2.name)}<span class="form-label-strong">${esc(teacher2.name)}</span></div>
        <div class="form-section"><h4>Стоимость занятия для${NBSP}ученика</h4>
          <div class="form-row-fields">
            ${numberInput({ label: "Стоимость*", filledLabel: "Стоимость", value: linkPrice, input: "studentLinkPrice", field: "price", maxlength: PRICE_MAX_LENGTH, grow: true })}
            <span class="form-word">за</span>
            ${numberInput({ label: "минут", value: 60, input: "noop", field: "minutes", maxlength: MINUTES_MAX_LENGTH, grow: true })}
            ${input({ label: "Валюта", value: currentStudent.currencyCode, input: "noop", field: "currency", maxlength: CURRENCY_MAX_LENGTH, grow: true })}
          </div>
          <div class="form-hint">Ставка учителя ${moneyToString(teacher2.rate)}/${teacher2.rateMinutes}${NBSP}мин, комиссия школы ${commission}. Меняется в${NBSP}карточке учителя</div>
        </div>`,
        foot: `${kitButtonBlack({ text: "Сохранить", click: "studentLinkSave", data: { student: studentId, teacher: teacherId2 }, secure: true, disabled: !(Number(linkPrice) > 0), full: true })}${kitButtonWhite({ text: "Отменить", click: "panelClose", full: true })}`
      };
    });
  }
  async function removeTeacherLink(studentId, teacherId2) {
    const teacher2 = teacherById(teacherId2);
    const { success } = await api("school/student_teacher_link_remove", { studentId, teacherId: teacherId2 });
    if (!success) {
      return;
    }
    await loadStudents();
    showSuccess(`Связь с${NBSP}учителем ${teacher2?.name ?? ""} удалена. Прошедшие занятия и${NBSP}история сохранены`);
  }
  onClick("studentAssignToggle", (el) => {
    const id = Number(dataOf(el, "id"));
    if (assignSelection.has(id)) {
      assignSelection.delete(id);
    } else {
      assignSelection.add(id);
    }
    requestRender();
  });
  onClick("studentAssignSave", async (el) => {
    const { success } = await api("school/student_teachers_set", { studentId: Number(dataOf(el, "id")), teacherIds: Array.from(assignSelection) });
    if (!success) {
      return;
    }
    closeAllPanels();
    await loadStudents();
    showSuccess("Учителя назначены");
  });
  function openAssignTeachersPanel(studentId) {
    assignSelection = new Set(studentById(studentId)?.teacherLinks.map((l) => l.teacherId) ?? []);
    openPanel(`studentAssign:${studentId}`, () => {
      const student2 = studentById(studentId);
      return {
        title: `${student2?.name ?? ""} — учителя`,
        narrow: true,
        body: `<div class="pick-list">${activeTeachers().map((t) => switcherRow({ click: "studentAssignToggle", data: { id: t.id }, controlFirst: true, control: checkbox(assignSelection.has(t.id)), content: `<span class="pick-person">${avatarCircle(t.name, { size: "xs" })}<span class="pick-name">${esc(t.name)}</span><span class="pick-extra">${esc(t.subject ?? "")}</span></span>` })).join("")}</div>`,
        foot: `${kitButtonBlack({ text: "Сохранить", click: "studentAssignSave", data: { id: studentId }, secure: true, full: true })}${kitButtonWhite({ text: "Отменить", click: "panelClose", full: true })}`
      };
    });
  }

  // src/pages/students/ExtendedStudentCard/studentStats.ts
  var PERIODS = [
    { key: "week", text: "Неделя" },
    { key: "month", text: "Месяц" },
    { key: "year", text: "Год" },
    { key: "all", text: "Все время" }
  ];
  var CANCELS = [
    { label: "Отменено учителем", count: 4, tone: "violet" },
    { label: "По болезни", count: 6, tone: "pink" },
    { label: "Прогулы", count: 2, tone: "blue" },
    { label: "Каникулы", count: 3, tone: "acid" },
    { label: "Другое", count: 2, tone: "light-pink" },
    { label: "Отменено учеником", count: 1, tone: "dark" }
  ];
  var TRANSFERS = [
    { label: "Перенос учителем", count: 3, tone: "violet" },
    { label: "По болезни", count: 2, tone: "pink" },
    { label: "Прогулы", count: 1, tone: "blue" },
    { label: "Каникулы", count: 2, tone: "acid" },
    { label: "Другое", count: 2, tone: "light-pink" },
    { label: "Перенос учеником", count: 0, tone: "dark" }
  ];
  var period = "month";
  onClick("studentStatsPeriod", (el) => {
    period = dataOf(el, "key");
    requestRender();
  });
  function donut(segments, caption) {
    const total = segments.reduce((sum, s) => sum + s.count, 0);
    const circle = 2 * Math.PI * 46;
    let offset = 0;
    const arcs = segments.filter((s) => s.count > 0).map((s) => {
      const length = s.count / total * circle;
      const arc = `<circle class="donut-arc ${s.tone}" cx="55" cy="55" r="46" stroke-dasharray="${Math.max(length - 3, 0)} ${circle}" stroke-dashoffset="${-offset}" transform="rotate(-90 55 55)"/>`;
      offset += length;
      return arc;
    }).join("");
    const legend = segments.map((s) => `<span class="legend-item"><i class="legend-dot ${s.tone}"></i>${s.label}${NBSP}(${s.count})</span>`).join("");
    return `<div class="donut-block"><div class="donut"><svg viewBox="0 0 110 110" width="110" height="110" aria-hidden="true">${arcs}</svg><div class="donut-center"><b>${total}</b><span>${caption}</span></div></div><div class="donut-legend">${legend}</div></div>`;
  }
  function studentStats() {
    return `<div class="stats-box">
    <h3 class="display">Статистика отмен и${NBSP}переносов</h3>
    ${tabs(PERIODS, period, "studentStatsPeriod", { dark: true, stretch: true })}
    <div class="stats-month">${chevronLeftSvg({ size: 24 })}<span>09.2026</span>${chevronRightSvg({ size: 24 })}</div>
    <div class="stats-donuts">${donut(CANCELS, "отмен")}${donut(TRANSFERS, "переносов")}</div>
  </div>`;
  }

  // src/pages/students/ExtendedStudentCard/ExtendedStudentCard.ts
  var TOPICS = ["Аудирование + разбор ДЗ", "Урок без темы", "Разговорная практика", "Грамматика: Present Perfect"];
  var PACKAGE_TONES = ["acid", "violet", "pink"];
  var openedNotes = /* @__PURE__ */ new Set();
  var noteDrafts = /* @__PURE__ */ new Map();
  var editingNotes = /* @__PURE__ */ new Set();
  onClick("studentBack", () => {
    const prev = previousRoute();
    if (prev && prev.page === "staff") {
      goTo(prev);
      return;
    }
    goTo({ page: "students", view: "list" });
  });
  onClick("studentNoteToggle", (el) => {
    const id = Number(dataOf(el, "id"));
    if (openedNotes.has(id)) {
      openedNotes.delete(id);
    } else {
      openedNotes.add(id);
    }
    requestRender();
  });
  onInput("studentNoteText", (el) => {
    if (el instanceof HTMLTextAreaElement) {
      noteDrafts.set(Number(dataOf(el, "field").replace("note", "")), el.value);
    }
  });
  onClick("studentNoteSave", async (el) => {
    const lessonId = Number(dataOf(el, "id"));
    const text = (noteDrafts.get(lessonId) ?? "").trim();
    if (!text) {
      showError("Заметка пустая");
      return;
    }
    const { success } = await api("school/lesson_note_set", { lessonId, text });
    if (!success) {
      return;
    }
    editingNotes.delete(lessonId);
    await loadLessons();
    showSuccess("Заметка сохранена, ученик ее увидит");
  });
  onClick("studentNoteEdit", (el) => {
    const lessonId = Number(dataOf(el, "id"));
    const lesson = lessonsData().find((l) => l.id === lessonId);
    noteDrafts.set(lessonId, lesson?.note ?? "");
    editingNotes.add(lessonId);
    requestRender();
  });
  onClick("studentNoteRemove", async (el) => {
    const { success } = await api("school/lesson_note_set", { lessonId: Number(dataOf(el, "id")), text: "" });
    if (success) {
      await loadLessons();
    }
  });
  onClick("studentTeacherEdit", (el) => {
    openLinkEditPanel(Number(dataOf(el, "student")), Number(dataOf(el, "teacher")));
  });
  onClick("studentTeacherRemove", async (el) => {
    await removeTeacherLink(Number(dataOf(el, "student")), Number(dataOf(el, "teacher")));
  });
  onClick("studentAssignTeachers", (el) => {
    openAssignTeachersPanel(Number(dataOf(el, "id")));
  });
  onClick("studentOpenTutor", (el) => {
    goTo({ page: "staff", view: "tutor", teacherId: Number(dataOf(el, "id")) });
  });
  onClick("studentScrollInfo", () => {
    document.getElementById("student-info")?.scrollIntoView({ behavior: "smooth" });
  });
  function studentLessons(student2) {
    const groupIds = groupsData().filter((g) => g.members.some((m) => m.studentId === student2.id)).map((g) => g.id);
    return lessonsData().filter((l) => l.completed && (l.studentId === student2.id || l.groupId !== null && groupIds.includes(l.groupId))).sort((a, b) => b.startMoment.getTime() - a.startMoment.getTime());
  }
  function header(student2) {
    const status = student2.connected ? `<div class="student-head-status"><span class="student-head-dot"></span>Подключен к${NBSP}SecRep</div>` : `<button type="button" class="student-head-invite" data-click="studentInvite" data-id="${student2.id}">Пригласить в${NBSP}SecRep</button>`;
    return `<div class="student-head">
    <div class="student-head-person">${avatarCircle(student2.name, { size: "xl" })}<div class="student-head-name-block"><div class="student-head-name">${esc(student2.name)}</div>${status}</div></div>
    <div class="student-head-stats">
      <div><div class="student-head-label">На счету</div><div class="student-head-value">${moneyToString(student2.balance)}</div></div>
      <div><div class="student-head-label">Тариф</div><div class="student-head-value">${moneyToString(student2.price)} <span class="student-head-unit">/ ${student2.priceMinutes}${NBSP}мин</span></div></div>
      <div class="student-head-actions">${kitButtonWhite({ text: "Пополнить", click: "pageStub", data: { text: "Пополнение счета: сайдпейдж базового SecRep" }, iconAfter: plusSmallSvg() })}${kitIconButton({ icon: pencilSvg(), click: "studentScrollInfo", title: "Редактировать" })}</div>
    </div>
  </div>`;
  }
  function teachersBlock(student2) {
    const groups2 = groupsData().filter((g) => g.members.some((m) => m.studentId === student2.id));
    const teacherCards = student2.teacherLinks.map((link) => {
      const teacher2 = teacherById(link.teacherId);
      if (!teacher2) {
        return "";
      }
      const toTeacher = teacher2.rate - (teacher2.commissionType === "percent" ? Math.round(teacher2.rate * teacher2.commissionValue / 100) : teacher2.commissionValue);
      const next = lessonsData().filter((l) => l.teacherId === teacher2.id && l.studentId === student2.id && !l.completed).sort((a, b) => a.startMoment.getTime() - b.startMoment.getTime())[0];
      return `<div class="link-card">
        <div class="link-card-head">${tutorAvatarCircle(teacher2.name, teacher2.connected)}<div class="link-card-name"><div class="name">${esc(teacher2.name)}</div><div class="status-connected">${esc(teacher2.subject ?? "")}</div></div>
          ${kitIconButton({ icon: pencilSvg(), click: "studentTeacherEdit", data: { student: student2.id, teacher: teacher2.id }, naked: true, title: "Изменить стоимость" })}${kitIconButton({ icon: trashSvg(), click: "studentTeacherRemove", data: { student: student2.id, teacher: teacher2.id }, naked: true, title: "Удалить связь" })}</div>
        <div class="link-card-row"><span>Ученик платит</span><b>${moneyToString(link.price)}/60${NBSP}мин</b></div>
        <div class="link-card-row"><span>Учителю за${NBSP}урок</span><b>${moneyToString(toTeacher)}</b></div>
        <div class="link-card-row"><span>Доход школы</span><b>${moneyToString(link.price - toTeacher)}</b></div>
        <div class="link-card-row"><span>Ближайший урок</span><b>${next ? dateTimeShort(next.startMoment) : "—"}</b></div>
        ${kitButtonLink({ text: "Карточка учителя", click: "studentOpenTutor", data: { id: teacher2.id }, iconAfter: goToSvg({ size: 24 }) })}
      </div>`;
    }).join("");
    const groupCards = groups2.map((group) => {
      const member = group.members.find((m) => m.studentId === student2.id);
      const teacher2 = teacherById(group.teacherId);
      const balance = member?.lessonsBalance ?? 0;
      return `<div class="link-card">
        <div class="link-card-head">${groupAvatarPlaceholder()}<div class="link-card-name"><div class="name">${esc(group.name)}</div><div class="status-connected">Группа · ${esc(teacher2?.name ?? "")}</div></div></div>
        <div class="link-card-row"><span>Занятий ${balance < 0 ? `в${NBSP}долг` : "оплачено"}</span><b class="${balance < 0 ? "tone-alert" : ""}">${Math.abs(balance)}</b></div>
        <div class="link-card-row"><span>Ближайшее занятие</span><b>${group.nextLessonMoment ? dateTimeShort(group.nextLessonMoment) : "—"}</b></div>
        ${kitButtonLink({ text: "Группа в карточке учителя", click: "studentOpenTutor", data: { id: group.teacherId }, iconAfter: goToSvg({ size: 24 }) })}
      </div>`;
    }).join("");
    const empty = !teacherCards && !groupCards ? `<div class="link-card empty"><div class="form-label-strong">Учитель не${NBSP}назначен</div><div>Назначьте одного или нескольких учителей. У${NBSP}каждого может быть своя стоимость</div>${kitButtonBlack({ text: "Назначить учителя", click: "studentAssignTeachers", data: { id: student2.id } })}</div>` : "";
    return `<div class="section-head"><h2 class="display">Учителя ученика</h2><span class="school-only-tag">Только в${NBSP}школе</span>${empty ? "" : `<span class="list-toolbar-spacer"></span>${kitButtonWhite({ text: "Назначить учителя", click: "studentAssignTeachers", data: { id: student2.id }, iconAfter: plusSmallSvg() })}`}</div>
    <div class="link-cards">${teacherCards}${groupCards}${empty}</div>`;
  }
  function lessonRow(lesson, index) {
    const teacher2 = teacherById(lesson.teacherId);
    const opened = openedNotes.has(lesson.id);
    const group = lesson.groupId ? groupById(lesson.groupId) : null;
    const topic = `${TOPICS[index % TOPICS.length] ?? ""}${group ? ` · ${group.name}` : ""}`;
    const noteBlock = !opened ? "" : lesson.note && !editingNotes.has(lesson.id) ? `<div class="lesson-note"><div class="lesson-note-text"><div class="form-hint">Заметка учителя (видно ученику)</div><div>${esc(lesson.note)}</div></div>${kitIconButton({ icon: pencilSvg(), click: "studentNoteEdit", data: { id: lesson.id }, title: "Изменить" })}${kitIconButton({ icon: trashSvg(), click: "studentNoteRemove", data: { id: lesson.id }, title: "Удалить" })}</div>` : `<div class="lesson-note column">${textArea({ label: "Заметка учителя (видно ученику)", filledLabel: "Заметка", value: noteDrafts.get(lesson.id) ?? "", input: "studentNoteText", field: `note${lesson.id}`, charsLimit: TEXTAREA_MAX_LENGTH })}<div>${kitButtonBlack({ text: "Сохранить", click: "studentNoteSave", data: { id: lesson.id }, secure: true })}</div></div>`;
    return `<div class="lesson-row">
    <div class="lesson-row-main" role="button" tabindex="0" data-click="studentNoteToggle" data-id="${lesson.id}">
      <span class="lesson-row-date">${dateFull(lesson.startMoment)} · ${timeHm(lesson.startMoment)}${NBSP}–${NBSP}${timeHm(lesson.endMoment)}</span>
      <span class="lesson-row-topic"><span class="name">${esc(topic)}</span>${teacher2 ? `<span class="lesson-row-teacher">${avatarCircle(teacher2.name, { size: "xs" })}${esc(teacher2.name)}</span>` : ""}</span>
      <span class="lesson-row-note">${chatBubbleSvg({ size: 24 })}${lesson.note ? "Есть заметка" : "Заметок нет"}</span>
      ${opened ? chevronDownSvg({ size: 24 }) : chevronRightSvg({ size: 24 })}
    </div>
    ${noteBlock}
  </div>`;
  }
  onClick("studentPlanLesson", (el) => {
    setScheduleFilter(studentById(Number(dataOf(el, "id")))?.teacherLinks.map((l) => l.teacherId) ?? [], false);
    goTo({ page: "schedule" });
  });
  function linkRow(name, icon, tone, actions) {
    return `<div class="resource-row"><span class="resource-icon ${tone}">${icon}</span><span class="resource-name">${name}</span>${actions}</div>`;
  }
  function packagesRow(student2) {
    const stub = (text) => ({ text });
    const packages = student2.packages.length ? student2.packages.map((p, i) => `<div class="package-card ${PACKAGE_TONES[i % PACKAGE_TONES.length] ?? "acid"}">
          <div class="package-card-top"><span class="display package-card-name">${esc(p.name)}</span><span class="package-card-left"><span>Осталось</span><b>${p.total - p.used} из${NBSP}${p.total}</b></span></div>
          <div class="package-card-bottom"><span>${dateFull(p.validFrom)} — ${dateFull(p.validTo)}</span><span class="package-card-bar"><span style="--fill:${p.used / p.total * 100}%"></span></span></div>
        </div>`).join("") : `<div class="package-card none"><div class="package-card-title">Абонементов пока нет</div><div class="package-card-hint">Добавьте абонемент, если ученик оплачивает уроки пакетом</div></div>`;
    const allPackages = student2.packages.length ? kitButtonLink({ text: "Все абонементы", click: "pageStub", data: stub("Все абонементы: сайдпейдж базового SecRep"), iconAfter: goToSvg({ size: 24 }) }) : "";
    return `<div class="student-packages-row">
    <div class="package-cards">${packages}</div>
    <div class="package-add">${kitButtonBlack({ text: "Добавить абонемент", click: "pageStub", data: stub("Добавление абонемента: сайдпейдж базового SecRep"), iconAfter: plusSmallSvg(), full: true })}${allPackages}</div>
  </div>`;
  }
  function lessonsBlock(student2) {
    const lessons2 = studentLessons(student2).slice(0, 6);
    const content = lessons2.length ? lessons2.map(lessonRow).join("") : `<div class="lessons-empty">${openBookSvg({ size: 32 })}<div class="lessons-empty-title">Уроков пока не${NBSP}было</div><div class="lessons-empty-text">После первого занятия здесь появятся его тема и${NBSP}ваши заметки</div>${kitButtonBlack({ text: "Запланировать урок", click: "studentPlanLesson", data: { id: student2.id }, iconAfter: plusSmallSvg() })}</div>`;
    return `<div class="student-lessons"><h3 class="display">Прошедшие уроки</h3>${content}</div>`;
  }
  function sideBlock() {
    const stub = (text) => ({ text });
    const linkActions = kitIconButton({ icon: copySvg(), click: "pageStub", data: stub("Ссылка скопирована"), naked: true, title: "Копировать" }) + kitIconButton({ icon: pencilSvg(), click: "pageStub", data: stub("Редактирование ссылки как в базовом SecRep"), naked: true, title: "Изменить" });
    const resourceActions = kitIconButton({ icon: dotsVerticalSvg(), click: "pageStub", data: stub("Действия с ресурсом как в базовом SecRep"), naked: true, title: "Действия" });
    return `<div class="student-side">
    <div class="student-side-section">
      <h3 class="display">Ссылки ученика</h3><span class="visible-tag">Видно ученику</span>
      ${linkRow("Видеозвонок", paperclipSvg(), "violet", linkActions)}
      ${linkRow("Доска", fileSvg(), "violet", linkActions)}
    </div>
    <div class="student-side-section">
      <h3 class="display">Библиотека ресурсов</h3>
      ${linkRow("Таблица неправильных глаголов", fileSvg(), "pink", resourceActions)}
      ${linkRow("Материалы", fileSvg(), "pink", resourceActions)}
      ${kitButtonBlack({ text: "Добавить", click: "pageStub", data: stub("Добавление ресурса как в базовом SecRep"), iconAfter: plusSmallSvg(), full: true })}
      ${kitButtonLink({ text: "Показать все (10)", click: "pageStub", data: stub("Библиотека ресурсов: сайдпейдж базового SecRep") })}
    </div>
  </div>`;
  }
  function mainBlock(student2) {
    return `<div class="student-main">${packagesRow(student2)}<div class="student-panels">${lessonsBlock(student2)}${sideBlock()}</div></div>`;
  }
  function extendedStudentCard(studentId) {
    const student2 = studentById(studentId);
    if (!student2) {
      return loading();
    }
    return `<div class="student-page">
    <div class="card-back-head">${kitButtonLink({ text: "Назад", click: "studentBack" })}</div>
    ${header(student2)}
    ${teachersBlock(student2)}
    ${mainBlock(student2)}
    <div class="student-lower">${studentStats()}${studentHistory(student2)}${studentInfo(student2)}</div>
  </div>`;
  }

  // src/pages/students/Students.ts
  var tab2 = "active";
  var search2 = "";
  var refocusSearch2 = false;
  onClick("studentsTab", (el) => {
    tab2 = dataOf(el, "key") === "archive" ? "archive" : "active";
    requestRender();
  });
  onInput("studentsSearch", (el) => {
    if (el instanceof HTMLInputElement) {
      search2 = el.value;
      refocusSearch2 = true;
      requestRender();
    }
  });
  onClick("studentsAdd", () => {
    openAddStudentPanel();
  });
  onClick("studentsToGroups", () => {
    document.getElementById("students-groups")?.scrollIntoView({ behavior: "smooth" });
  });
  onClick("studentsRestore", async (el) => {
    const { success } = await api("school/student_restore", { id: Number(dataOf(el, "id")) });
    if (!success) {
      return;
    }
    await loadStudents();
    showSuccess(`Ученик вернулся в${NBSP}активные`);
  });
  function archivedCard(student2) {
    return `<div class="student-card">
    <div class="student-card-head">${studentAvatarCircle(student2.name, false)}<div class="student-card-name"><div class="name">${esc(student2.name)}</div><div class="status-connected">В${NBSP}архиве · баланс ${moneyToString(student2.balance)}</div></div></div>
    <div class="student-card-actions">${kitButtonWhite({ text: "Вернуть из архива", click: "studentsRestore", data: { id: student2.id }, secure: true, full: true })}${kitIconButton({ icon: goToSvg(), click: "studentOpen", data: { id: student2.id }, title: "Открыть карточку" })}</div>
  </div>`;
  }
  function studentsList() {
    const store = students.get();
    if (store.state === "error") {
      return loadError();
    }
    const data = loadedData(store);
    if (!data) {
      return loading();
    }
    const query2 = search2.trim().toLowerCase();
    const list = data.filter((s) => (tab2 === "active" ? !s.archived : s.archived) && s.name.toLowerCase().includes(query2));
    const groups2 = groupsData().filter((g) => g.name.toLowerCase().includes(query2) || g.members.some((m) => (studentById(m.studentId)?.name ?? "").toLowerCase().includes(query2)));
    return `<div class="list-toolbar">
      ${inputSearch({ value: search2, input: "studentsSearch", id: "students-search" })}
      ${tabs([{ key: "active", text: "Активные" }, { key: "archive", text: "Архив" }], tab2, "studentsTab")}
      ${isTablet() ? `<span class="list-toolbar-spacer"></span>${kitButtonLink({ text: "Перейти к группам", click: "studentsToGroups" })}` : kitIconButton({ icon: plusSvg(), click: "studentsAdd", dark: true, title: "Добавить ученика" })}
    </div>
    <div class="section-head"><h2>Ученики</h2>${isTablet() ? kitButtonBlack({ text: "Добавить ученика", click: "studentsAdd" }) : ""}</div>
    ${list.length ? `<div class="cards-grid">${list.map((s) => tab2 === "active" ? studentCard(s, { showTeachers: true }) : archivedCard(s)).join("")}</div>` : emptyState(tab2 === "active" ? `Учеников не${NBSP}найдено` : `В${NBSP}архиве пока пусто`)}
    ${tab2 === "active" ? `<div class="section-head" id="students-groups"><h2>Группы <span class="count-badge">${groups2.length}</span></h2>${kitButtonBlack({ text: "Добавить группу", click: "pageStub", data: { text: NOT_IN_MOCKUPS } })}</div>${groups2.map((g) => groupCard(g, { showTeacher: true })).join("")}` : ""}`;
  }
  function studentsPage() {
    const r = route();
    if (r.page === "students" && r.view === "student") {
      return page({ activeMenu: "students", title: "Ученики", content: extendedStudentCard(r.studentId) });
    }
    return page({ activeMenu: "students", title: "Ученики", content: studentsList() });
  }
  function afterStudentsRender() {
    if (!refocusSearch2) {
      return;
    }
    refocusSearch2 = false;
    const field = document.getElementById("students-search");
    if (field instanceof HTMLInputElement) {
      field.focus();
      field.setSelectionRange(field.value.length, field.value.length);
    }
  }

  // src/util/typograph.ts
  var SHORT_WORDS = "в|во|к|ко|с|со|у|о|об|обо|от|до|на|по|за|из|изо|без|для|при|про|над|под|и|а|но|да|или|ни|не|что|как";
  var SHORT_RE = new RegExp(`(^|[\\s(«"\\u00a0])(${SHORT_WORDS}) `, "gi");
  var UNIT_RE = /(\d) (₽|мин|занят|урок|учител|ученик)/g;
  function fixText(text) {
    return text.replace(SHORT_RE, (_, before, word) => `${before}${word}${NBSP}`).replace(SHORT_RE, (_, before, word) => `${before}${word}${NBSP}`).replace(UNIT_RE, `$1${NBSP}$2`).replace(/\u0451/g, "е").replace(/\u0401/g, "Е");
  }
  function applyTypograph(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const parent = node.parentNode?.nodeName;
      const text = node.nodeValue ?? "";
      if (parent !== "SCRIPT" && parent !== "STYLE" && parent !== "TEXTAREA" && /\S/.test(text)) {
        const fixed = fixText(text);
        if (fixed !== text) {
          node.nodeValue = fixed;
        }
      }
      node = walker.nextNode();
    }
  }

  // src/main.ts
  onClick("inputClear", (el) => {
    const field = el.closest(".kit-input")?.querySelector("input");
    if (!field) {
      return;
    }
    field.value = "";
    field.focus();
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
  onInput("noop", (el) => {
    if (el instanceof HTMLInputElement) {
      el.closest(".kit-input")?.classList.toggle("filled", el.value !== "");
    }
  });
  afterAnyInput(() => {
    const active = document.activeElement;
    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
      active.closest(".kit-input")?.classList.toggle("filled", active.value !== "");
    }
  });
  function pageHtml() {
    const r = route();
    if (r.page === "signup") {
      return signUpPage();
    }
    if (r.page === "home") {
      return homePage();
    }
    if (r.page === "subscription") return subscriptionPage();
    if (r.page === "notifications") {
      return notificationsPage();
    }
    if (r.page === "staff") {
      return staffPage();
    }
    if (r.page === "students") {
      return studentsPage();
    }
    return schedulePage();
  }
  function afterRender() {
    const r = route();
    if (r.page === "signup") {
      afterSignUpRender();
    }
    if (r.page === "staff") {
      afterStaffRender();
    }
    if (r.page === "students") {
      afterStudentsRender();
    }
    if (r.page === "schedule") {
      afterScheduleRender();
    }
  }
  function render3() {
    const app = document.getElementById("app");
    const overlay = document.getElementById("ov");
    if (!app || !overlay) {
      return;
    }
    const classes = `root ${viewportClasses()}`;
    app.className = classes;
    overlay.className = classes;
    app.innerHTML = pageHtml() + protoNav() + accountMenuHtml();
    if (accountMenuOpen) {
      const dialog = document.getElementById("account-dialog");
      dialog.showModal();
      dialog.addEventListener("cancel", event => { event.preventDefault(); closeAccountMenu(); });
    }
    renderPanels(overlay);
    applyTypograph(app);
    applyTypograph(overlay);
    afterRender();
  }
  async function start() {
    initActions(document);
    initViewportWidth();
    initRouteFromHash();
    setRenderFn(render3);
    await Promise.all([loadSchool(), loadTeachers(), loadStudents(), loadGroups(), loadLessons(), loadDeals(), loadTeacherWindows()]);
    render3();
  }
  fireAndForget(start());
})();
