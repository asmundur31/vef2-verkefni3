import { promises } from 'fs';
import faker from 'faker';

import { query } from './db.js';

async function main() {
  const createTable = await promises.readFile('./sql/schema.sql');
  await query(createTable.toString('utf-8'));

  // Búum til gervigögn og setjum þau í gagnagrunninn
  const n = 500;
  for (let i = 0; i < n; i++) {
    const name = faker.name.findName();
    const nationalId = Math.floor(Math.random() * 9000000000 + 1000000000);
    let comment = '';
    if (Math.random() < 0.5) {
      comment = faker.lorem.sentence();
    }
    let showName = false;
    if (Math.random() < 0.5) {
      showName = true;
    }
    const date = new Date();
    date.setDate(date.getDate() - 14 * Math.random());
    const values = [name, nationalId, comment, showName, date];
    try {
      // eslint-disable-next-line no-await-in-loop
      await query('INSERT INTO signatures (name, nationalId, comment, anonymous, signed) VALUES ($1, $2, $3, $4, $5);', values);
    } catch (e) {
      console.log(e);
    }
  }
}

main().catch((err) => {
  console.error(err);
});
