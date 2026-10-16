// Creates the database named in DATABASE_URL if it does not exist yet
// (connects to the server's default "postgres" database to do so).
import pg from 'pg';

const url = new URL(process.env.DATABASE_URL);
const dbName = decodeURIComponent(url.pathname.slice(1));
if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(dbName)) {
  console.error(`Refusing to create database with unusual name "${dbName}"`);
  process.exit(1);
}
url.pathname = '/postgres';

const client = new pg.Client({ connectionString: url.toString() });
try {
  await client.connect();
  const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
  if (rowCount) {
    console.log(`Database "${dbName}" already exists`);
  } else {
    await client.query(`CREATE DATABASE "${dbName}" ENCODING 'UTF8'`);
    console.log(`Database "${dbName}" created`);
  }
} catch (err) {
  console.error(`Could not create database: ${err.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
