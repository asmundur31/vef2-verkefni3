import express from 'express';
import session from 'express-session';
import dotenv from 'dotenv';

import passport from './login.js';
import { router as registrationRouter } from './registration.js';
import { router as adminRouter } from './admin.js';
import { isInvalid } from './utils.js';

dotenv.config();

const {
  PORT: port = 3000,
  SESSION_SECRET: sessionSecret,
  DATABASE_URL: connectionString,
} = process.env;

if (!connectionString || !sessionSecret) {
  console.error('Vantar gögn í env');
  process.exit(1);
}

const app = express();

app.set('view engine', 'ejs');
app.use('/public', express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use('/admin', adminRouter);
app.use('/', registrationRouter);

app.locals.isInvalid = isInvalid;

// eslint-disable-next-line no-unused-vars
function notFoundHandler(req, res, next) {
  res.status(404);
  return res.send('404 villa! - Síða fannst ekki');
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(err);
  return res.status(500).send('500 villa!');
}

app.use(notFoundHandler);
app.use(errorHandler);

// Verðum að setja bara *port* svo virki á heroku
app.listen(port, () => {
  console.info(`Server running at http://localhost:${port}/`);
});
