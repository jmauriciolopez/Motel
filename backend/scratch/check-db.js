const { Client } = require('pg');
require('dotenv').config();

async function checkTables() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  try {
    await client.connect();
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    console.log('Tablas encontradas:');
    res.rows.forEach(row => console.log(`- ${row.table_name}`));
    if (res.rows.length === 0) console.log('No se encontraron tablas.');
  } catch (err) {
    console.error('Error conectando a la base de datos:', err.message);
  } finally {
    await client.end();
  }
}

checkTables();
