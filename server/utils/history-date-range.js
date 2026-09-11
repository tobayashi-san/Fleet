'use strict';
const { timestamp } = require('./operation-display');
const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zurich', year: 'numeric', month: '2-digit', day: '2-digit' });

function validDay(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function validHistoryRange(from, to) {
  return (!from || validDay(from)) && (!to || validDay(to)) && !(from && to && from > to);
}
function historyDay(value) {
  const time = timestamp(value);
  if (!Number.isFinite(time)) return null;
  const parts = formatter.formatToParts(new Date(time));
  const part = type => parts.find(item => item.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
function matchesHistoryRange(value, from, to) {
  if (!from && !to) return true;
  const day = historyDay(value);
  if (!day) return false;
  return !(from && day < from) && !(to && day > to);
}
module.exports = { validHistoryRange, matchesHistoryRange, historyDay };
