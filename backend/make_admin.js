const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'turnify_db',
  user: 'postgres',
  password: '1234',
});

async function main() {
  await client.connect();
  const emailsToMakeAdmin = [
    'turnify.contact@gmail.com',
    'josebuenahora05@gmail.com',
    'josesayabuena@gmail.com',
    'admin@admin.com',
  ];

  for (const email of emailsToMakeAdmin) {
    const res = await client.query(
      'UPDATE "USERS" SET roles = $1 WHERE LOWER(email) = LOWER($2) RETURNING email, roles',
      [['admin'], email]
    );
    if (res.rows.length > 0) {
      console.log(`✅ ¡ÉXITO! ${res.rows[0].email} ahora tiene el rol:`, res.rows[0].roles);
    } else {
      console.log(`⚠️ No se encontró la cuenta: ${email}`);
    }
  }

  await client.end();
}

main().catch((err) => {
  console.error("Error:", err);
  client.end();
});
