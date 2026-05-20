import {
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  parseISO,
  startOfMonth,
  subDays,
} from "date-fns";

export const safeDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatDate = (value, pattern = "MMM dd, yyyy") => {
  const date = safeDate(value);
  return date ? format(date, pattern) : "-";
};

export const formatTime = (value) => formatDate(value, "hh:mm a");

export const getRecordStart = (record) =>
  record?.morning_time_in || record?.time_in;

export const getRecordEnd = (record) =>
  record?.afternoon_time_out || record?.time_out;

export const getRecordHours = (record) => {
  if (record?.hours_worked != null) return Number(record.hours_worked) || 0;
  const start = safeDate(getRecordStart(record));
  const end = safeDate(getRecordEnd(record));
  if (!start || !end) return 0;
  return Math.max(0, (end.getTime() - start.getTime()) / 3600000);
};

export const getStatusLabel = (status) => {
  const value = status || "pending";
  return value.replaceAll("_", " ").replaceAll("-", " ");
};

export const getWorkingDaysInMonth = (month = new Date()) =>
  eachDayOfInterval({
    start: startOfMonth(month),
    end: endOfMonth(month),
  }).filter((date) => {
    const day = date.getDay();
    return day !== 0 && day !== 6;
  }).length;

export const buildDashboardStats = (records, month = new Date()) => {
  const workingDays = getWorkingDaysInMonth(month);
  const present = records.filter((record) =>
    ["present", "late", "overtime", "undertime", "half-day", "halfday"].includes(
      record.status
    )
  ).length;
  const late = records.filter((record) => record.status === "late").length;
  const absent = Math.max(
    records.filter((record) => record.status === "absent").length,
    Math.max(0, workingDays - present)
  );
  const totalLateMinutes = records.reduce(
    (sum, record) => sum + (Number(record.late_minutes) || 0),
    0
  );
  const totalEarlyMinutes = records.reduce(
    (sum, record) => sum + (Number(record.early_minutes) || 0),
    0
  );
  const totalWorkedHours = records.reduce(
    (sum, record) => sum + getRecordHours(record),
    0
  );

  return {
    workingDays,
    present,
    late,
    absent,
    totalLateMinutes,
    totalEarlyMinutes,
    totalWorkedHours: Number(totalWorkedHours.toFixed(1)),
    attendancePercentage: workingDays ? Math.round((present / workingDays) * 100) : 0,
  };
};

export const buildWeeklyChart = (records) =>
  Array.from({ length: 7 }, (_, index) => {
    const date = subDays(new Date(), 6 - index);
    const record = records.find((item) => {
      const recordDate = item.date ? parseISO(item.date) : safeDate(item.created_at);
      return recordDate && isSameDay(recordDate, date);
    });

    return {
      day: format(date, "EEE"),
      hours: record ? Number(getRecordHours(record).toFixed(1)) : 0,
      late: Number(record?.late_minutes || 0),
      status: record?.status || "absent",
    };
  });

export const buildMonthlyChart = (records) => {
  const grouped = new Map();
  records.forEach((record) => {
    const date = safeDate(record.date);
    if (!date) return;
    const week = `W${Math.ceil(date.getDate() / 7)}`;
    const current = grouped.get(week) || { week, present: 0, late: 0, absent: 0 };
    if (record.status === "late") current.late += 1;
    else if (record.status === "absent") current.absent += 1;
    else current.present += 1;
    grouped.set(week, current);
  });

  return ["W1", "W2", "W3", "W4", "W5"].map(
    (week) => grouped.get(week) || { week, present: 0, late: 0, absent: 0 }
  );
};

export const getTodayRecord = (records) => {
  const today = new Date();
  return records.find((record) => {
    const date = safeDate(record.date);
    return date && isSameDay(date, today);
  });
};
