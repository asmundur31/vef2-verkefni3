import express from 'express';
import {
  catchErrors,
  getSignatures,
  createPages,
  deleteSignature,
} from './utils.js';
import { query } from './db.js';
import passport from './login.js';

export const router = express.Router();

/**
 * Fall sem að byrtir töflu af undirskriftum
 * @param {object} req Request hlutur
 * @param {object} res Response hlutur
 */
async function indexAdmin(req, res) {
  const { page = 1 } = req.query;
  const { count } = (await query('SELECT COUNT(*) FROM signatures;')).rows[0];
  const totalPages = Math.ceil(count / 50);
  const pages = createPages(page, totalPages, req.baseUrl);
  const limit = 50;
  const offset = (pages.page - 1) * limit;
  const sig = await getSignatures(offset, limit);
  const signatures = { list: sig, count };

  const { user } = req;

  return res.render('admin', {
    title: 'Undir\u00ADskriftar\u00ADlisti',
    user,
    signatures,
    pages,
  });
}

/**
 * Fall sem athugar hvort eitthver sé loggaður inn og ef enginn er
 * loggaður inn þá fer hann á login síðuna.
 * @param {Object} req Request hluturinn
 * @param {Object} res Response hluturinn
 * @param {function} next fallið sem er kallað í næst
 */
function ensureLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.redirect('/admin/login');
}

/**
 * Fall sem athugar hvort innskráður notandi sé admin
 * @param {Object} req Request hluturinn
 * @param {Object} res Response hluturinn
 * @param {function} next fallið sem er kallað næst í
 */
function ensureAdmin(req, res, next) {
  if (req.user.admin) {
    return next();
  }
  return res.redirect('/admin/login');
}

/**
 * Fall sem birtir login með viðeigandi skilaboðum hvort notandanafn og lykilorð
 * voru rétt eða ekki.
 * @param {Object} req Request hluturinn
 * @param {Object} res Response hluturinn
 */
function login(req, res) {
  if (req.isAuthenticated()) {
    return res.redirect('/');
  }
  let message = '';

  // Athugum hvort einhver skilaboð séu til í session, ef svo er birtum þau
  // og hreinsum skilaboð
  if (req.session.messages && req.session.messages.length > 0) {
    message = req.session.messages.join(', ');
    req.session.messages = [];
  }

  return res.render('login', {
    title: 'Innskráning',
    message,
  });
}

/**
 * Fall sem kallað er á þegar á að eyða undirskrift
 * @param {Object} req Request hluturinn
 * @param {Object} res Response hluturinn
 */
async function deleteSig(req, res) {
  const { id } = req.params;
  const success = await deleteSignature(id);
  if (success) {
    return res.status(204).redirect('/admin');
  }
  return res.status(404).json({ error: 'Not found' });
}

router.get('/', ensureLoggedIn, catchErrors(indexAdmin));
router.get('/login', login);
router.post('/login',
  // Þetta notar strat að ofan til að skrá notanda inn
  passport.authenticate('local', {
    failureMessage: 'Notandanafn eða lykilorð vitlaust.',
    failureRedirect: '/admin/login',
  }),

  // Ef við komumst hingað var notandi skráður inn, senda á /admin
  (req, res) => {
    res.redirect('/admin');
  });
router.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});
// Pössum uppá að sá sem eyðir sé loggaður inn og er admin
router.post('/delete/:id', ensureLoggedIn, ensureAdmin, deleteSig);
