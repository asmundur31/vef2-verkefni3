import express from 'express';
import { body, validationResult } from 'express-validator';
import xss from 'xss';
import { query } from './db.js';
import { catchErrors, getSignatures, createPages } from './utils.js';

export const router = express.Router();

// Listi af validations
const validation = [
  body('name')
    .isLength({ min: 1 })
    .withMessage('Nafn má ekki vera tómt'),
  body('name')
    .isLength({ max: 128 })
    .withMessage('Nafn má að hámarki vera 128 stafir'),
  body('nationalId')
    .isLength({ min: 1 })
    .withMessage('Kennitala má ekki vera tóm'),
  body('nationalId')
    .matches(new RegExp('^[0-9]{6}-?[0-9]{4}$'))
    .withMessage('Kennitala verður að vera á formi 000000-0000 eða 0000000000'),
  body('comment')
    .isLength({ max: 400 })
    .withMessage('Athugasemd má að hámarki vera 400 stafir'),
];

// Viljum keyra sér og með validation, ver gegn „self XSS“
const xssSanitizationMiddleware = [
  body('name').customSanitizer((v) => xss(v)),
  body('nationalId').customSanitizer((v) => xss(v)),
  body('comment').customSanitizer((v) => xss(v)),
  body('anonymous').customSanitizer((v) => xss(v)),
];

// Listi af hreinsun á gögnum
const sanitize = [
  body('name').trim().escape(),
  body('nationalId').blacklist('-'),
  body('comment').trim().escape(),
];

/**
 * Fall sem að byrtir töflu af undirskriftum
 * @param {object} req Request hlutur
 * @param {object} res Response hlutur
 */
async function form(req, res) {
  const { page = 1 } = req.query;
  const { count } = (await query('SELECT COUNT(*) FROM signatures;')).rows[0];
  const totalPages = Math.ceil(count / 50);
  const pages = createPages(page, totalPages);
  const limit = 50;
  const offset = (page - 1) * limit;
  const errors = [];
  const formData = {
    name: '',
    nationalId: '',
    anonymous: 'off',
    comment: '',
  };
  const sig = await getSignatures(offset, limit);
  const signatures = { list: sig, count };
  return res.render('index', {
    title: 'Undir\u00ADskriftar\u00ADlisti',
    formData,
    signatures,
    errors,
    pages,
  });
}

/**
 * Fall sem athugar hvort input frá notanda passi við validation reglur sem við skilgreindum
 * Höldum keyrslu áfram með next() ef all er í góðu annars birtast villuskilaboð með forminu
 * @param {object} req Request hlutur
 * @param {object} res Response hlutur
 * @param {object} next Fallið sem á að keyra næst
 */
async function validate(req, res, next) {
  const {
    name, nationalId, comment, anonymous,
  } = req.body;
  const formData = {
    name, nationalId, comment, anonymous,
  };

  const valid = validationResult(req);
  if (!valid.isEmpty()) {
    const { errors } = valid;
    const sig = await getSignatures();
    const { count } = (await query('SELECT COUNT(*) FROM signatures;')).rows[0];
    const totalPages = Math.ceil(count / 50);
    const signatures = { list: sig, count };
    const { page = 1 } = req.query;
    const pages = createPages(page, totalPages);

    return res.render('index', {
      title: 'Undir\u00ADskriftar\u00ADlisti',
      formData,
      signatures,
      errors,
      pages,
    });
  }
  return next();
}

/**
 * Fall sem að vistar gögnin frá notanda í gagnagrunn
 * @param {object} req Request hultur
 * @param {object} res Response hlutur
 */
async function saveData(req, res) {
  const data = req.body;
  const { name } = data;
  const { nationalId } = data;
  const { comment } = data;
  let anonymous = false;
  const showName = data.showName !== 'on';
  if (!showName) {
    anonymous = true;
  }
  try {
    await query('INSERT INTO signatures (name,nationalId,comment,anonymous) VALUES ($1,$2,$3,$4)', [xss(name), xss(nationalId), xss(comment), anonymous]);
  } catch (e) {
    // Gekk ekki upp að setja inn í gagnagrunn
    // eslint-disable-next-line no-console
    console.log(e);
    return res.render('error', {
      title: 'Villa',
    });
  }
  return res.redirect('/');
}

router.get('/', catchErrors(form));
router.post(
  '/',
  // Validation rules
  validation,
  xssSanitizationMiddleware,
  // Athugum hvort gögnin uppfylli validation reglur
  catchErrors(validate),
  // Sanitize
  sanitize,
  // Vistum gögnin í gagnagrunn
  catchErrors(saveData),
);
