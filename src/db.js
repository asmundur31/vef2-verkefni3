import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const {
  DATABASE_URL: connectionString,
  NODE_ENV: nodeEnv = 'development',
} = process.env;

// Notum SSL tengingu við gagnagrunn ef við erum *ekki* í development mode, þ.e.a.s. á local vél
const ssl = nodeEnv !== 'development' ? { rejectUnauthorized: false } : false;

const pool = new pg.Pool({ connectionString, ssl });

pool.on('error', (err) => {
  console.error('Villa í tengingu við gagnagrunn, forrit hættir', err);
  process.exit(-1);
});

/**
 * Fall sem framkvæmir viðeigandi SQL fyrirspurn á gagnagrunn
 * @param {string} q Srengur sem inniheldur SQL fyrirspurn
 * @param {list} values listi af parametrum sem eiga að fara inn í fyrirspurnarstrenginn
 * @returns Skilar því sem að SQL fyrirspurnin skilar eða null ef fyrirspurnin gekk ekki upp
 */
export async function query(_query, values = []) {
  const client = await pool.connect();

  try {
    const result = await client.query(_query, values);
    return result;
  } finally {
    client.release();
  }
}

// Helper to remove pg from the event loop
export async function end() {
  await pool.end();
}
