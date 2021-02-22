import xss from 'xss';
import { query } from './db.js';

/**
 * Higher-order fall sem umlykur async middleware með villumeðhöndlun.
 *
 * @param {function} fn Middleware sem grípa á villur fyrir
 * @returns {function} Middleware með villumeðhöndlun
 */
export function catchErrors(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

/**
 * Fall sem les úr gagnagrunni öll signatures og passar að það sé ekkert xss
 * @returns {object} hlutur sem inniheldur öll signature sem eru í gagnagrunni
 */
export async function getSignatures() {
  const result = await query('SELECT * FROM signatures ORDER BY signed DESC;');
  const { rows } = result;
  const safeRows = [];
  rows.forEach((row) => {
    // pössum að id sé örugg
    const id = xss(row.id);
    // pössum að nafnið sé öruggt
    let name = xss(row.name);
    // pössum að kennitalan sé örugg
    const nationalId = xss(row.nationalId);
    // pössum að athugasemdin sé örugg
    const comment = xss(row.comment);
    // pössum að nafleyndin sé örugg
    const anonymous = xss(row.anonymous);
    if (anonymous) {
      name = 'Nafnlaust';
    }
    // pössum að dagsetningis sé örugg
    const date = xss(row.signed);
    const safeDate = new Date(date);
    const day = (`0${safeDate.getDate()}`).slice(-2);
    const month = (`0${safeDate.getMonth() + 1}`).slice(-2);
    const year = safeDate.getFullYear();
    const signed = `${day}.${month}.${year}`;

    // Bætum hlut við nýja örugga listan
    safeRows.push({
      id,
      name,
      nationalId,
      comment,
      anonymous,
      signed,
    });
  });
  return safeRows;
}
