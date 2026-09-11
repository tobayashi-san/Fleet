const cron = require('node-cron');
const { nextMatches } = require('./cron-next-matches');
function previewSchedule(expression, timezone, from = new Date()) {
  if (typeof expression !== 'string' || expression.length > 100 || expression.trim().split(/\s+/).length !== 5 || !cron.validate(expression)) throw new Error('Enter a valid five-field cron expression.');
  // Use the installed scheduler's matcher; createTask remains stopped and is destroyed.
  const task = cron.createTask(expression, () => {}, { timezone });
  try {
    const dates = nextMatches(task.timeMatcher, from, 3);
    if (dates.length < 3) throw new Error('Fewer than three executions found within the next 13 years.');
    const runs = dates.map(date => date.toISOString());
    return { timezone, runs, computedAt: from.toISOString() };
  } finally { task.destroy(); }
}
function validateExecutableSchedule(expression, timezone, from = new Date()) {
  if (typeof expression !== 'string' || expression.length > 100 || ![5, 6].includes(expression.trim().split(/\s+/).length) || !cron.validate(expression)) {
    throw new Error('Enter a valid cron expression with five or six fields.');
  }
  const task = cron.createTask(expression, () => {}, { timezone });
  try {
    if (!nextMatches(task.timeMatcher, from, 1).length) {
      throw new Error('This calendar combination has no execution within the next 13 years. Check the day, month and weekday.');
    }
  } finally { task.destroy(); }
}
module.exports = { previewSchedule, validateExecutableSchedule };
