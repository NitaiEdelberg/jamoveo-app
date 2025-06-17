const postgres = require('postgres');
require('dotenv').config();

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' }); //https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler

module.exports = sql;
