'use strict';
// CSV quoting alone does not stop spreadsheet applications evaluating formulas.
function csvCell(value) {
  const text = String(value ?? '');
  const safe = /^[\s\u0000-\u001f]*[=+@-]/u.test(text) || /^[\t\r\n]/u.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}
function changeColumns(detail) {
  try {
    const value = JSON.parse(detail);
    if (!['role-change','user-change','maintenance-change','ssh-key-change','host-change'].includes(value?.kind) || value.version !== 1 || typeof value.resource?.id !== 'string' || typeof value.resource?.name !== 'string' || !Array.isArray(value.changes) || !value.changes.every(c => c && typeof c.label === 'string' && typeof c.before === 'string' && typeof c.after === 'string')) return ['', '', ''];
    return [value.resource.id,value.resource.name,value.changes.map(c => `${c.label}: ${c.before} → ${c.after}`).join('\n')];
  } catch { return ['', '', '']; }
}
function auditCsv(rows) {
  return '\ufeff' + [
    ['Time','Action','User','IP address','Successful','Details','Object ID','Object name','Changes'],
    ...rows.map(row => [row.created_at,row.action,row.user,row.ip,row.success === true || row.success === 1 ? 'yes' : row.success === false || row.success === 0 ? 'no' : 'unknown',row.detail,...changeColumns(row.detail)]),
  ].map(row => row.map(csvCell).join(';')).join('\n');
}
module.exports = {auditCsv,csvCell};
