import express from 'express';
import loginHandler from './login.js';
import signupHandler from './signup.js';
import meHandler from './me.js';
import eventsHandler from './events.js';
import attendeesHandler from './attendees.js';
import attendeesImportHandler from './attendees-import.js';
import checkinsHandler from './checkins.js';
import checkinsPrintHandler from './checkins-print.js';
import staffHandler from './staff.js';
import statsHandler from './stats.js';
import exportHandler from './export.js';
import publicAttendeesHandler from './public-attendees.js';
import publicEventHandler from './public-event.js';

const app = express();
app.use(express.json({ limit: '10mb' }));

const routes = {
  '/api/login': loginHandler,
  '/api/signup': signupHandler,
  '/api/me': meHandler,
  '/api/events': eventsHandler,
  '/api/attendees': attendeesHandler,
  '/api/attendees-import': attendeesImportHandler,
  '/api/checkins': checkinsHandler,
  '/api/checkins-print': checkinsPrintHandler,
  '/api/staff': staffHandler,
  '/api/stats': statsHandler,
  '/api/export': exportHandler,
  '/api/public-attendees': publicAttendeesHandler,
  '/api/public-event': publicEventHandler,
};

for (const [path, handler] of Object.entries(routes)) {
  app.all(path, (req, res) => handler(req, res));
}

const port = Number(process.env.API_PORT || 8787);
const host = process.env.HOST || '127.0.0.1';
app.listen(port, host, () => console.log(`API server listening on http://${host}:${port}`));
