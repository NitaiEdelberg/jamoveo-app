const postgres = require('postgres');
require('dotenv').config();
const rehearsals = []; // rehearsals will be stored in memory as there is only one rehearsal at a time

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' }); //https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler

module.exports = {
    rehearsals,
    sql
}