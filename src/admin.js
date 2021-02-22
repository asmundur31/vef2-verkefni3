import express from 'express';
import { catchErrors, getSignatures } from './utils.js';

// TODO útfæra „bakvinnslu“
export const router = express.Router();

/**
 * Fall sem að byrtir töflu af undirskriftum
 * @param {object} req Request hlutur
 * @param {object} res Response hlutur
 */
async function form(req, res) {
  const signatures = await getSignatures();
  return res.render('admin', {
    title: 'Undirskriftir - umsjón',
    signatures,
  });
}

router.get('/', catchErrors(form));
