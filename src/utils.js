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
export async function getSignatures(offset = 0, limit = 50) {
  const q = 'SELECT * FROM signatures ORDER BY signed DESC OFFSET $1 LIMIT $2;';
  const result = await query(q, [offset, limit]);
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

/**
 * Hjálparfall til að athuga hvort reitur sé gildur eða ekki.
 *
 * @param {string} field Middleware sem grípa á villur fyrir
 * @param {array} errors Fylki af villum frá express-validator pakkanum
 * @returns {boolean} `true` ef `field` er í `errors`, `false` annars
 */
export function isInvalid(field, errors = []) {
  // Boolean skilar `true` ef gildi er truthy (eitthvað fannst)
  // eða `false` ef gildi er falsy (ekkert fannst: null)
  return Boolean(errors.find((i) => i && i.param === field));
}

/**
 * Hjálparfall fyrir createPages sem tekur innputtið frá notanda og varpar í tölu
 * @param {String} page Er strengur frá request objectinu
 * @param {int} totalPages Er heildarfjöldi blaðsíðna
 */
function checkPage(page, totalPages) {
  let p = Number(page);
  // Pössum uppá að page sé rétt
  if (p < 1 || p > totalPages || Number.isNaN(p)) {
    p = 1;
  }
  return p;
}

/**
 * Fall sem býr til pages object fyrir ejs templatið
 * @param {String} page strengur sem inniheldur page úr request query
 * @param {int} totalPages heildarfjöldi blaðsíðna
 * @returns pages object sem inniheldur allar upplýsingar fyrir paging dótið
 */
export function createPages(page, totalPages) {
  const p = checkPage(page, totalPages);
  let previous = true;
  let next = true;
  if (p === 1) {
    previous = false;
  }
  if (p === totalPages) {
    next = false;
  }
  return {
    page: p, totalPages, previous, next,
  };
}
