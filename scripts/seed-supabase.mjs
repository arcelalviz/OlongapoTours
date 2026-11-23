// Optional one-time recovery if you prefer seeding from your local computer.
// node --env-file=.env.local scripts/seed-supabase.mjs
import {createClient} from '@supabase/supabase-js';
import {readFileSync} from 'node:fs';
const data=JSON.parse(readFileSync(new URL('../data/bundled-catalog.json',import.meta.url)));
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key)throw Error('Configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
for(const [table,records] of Object.entries({destinations:data.destinations,tourism_events:data.events})){
 const {error}=await db.from(table).upsert(records,{onConflict:'slug',ignoreDuplicates:true});
 if(error)throw new Error(`${table}: ${error.message}`);
 console.log(`Missing ${table} entries restored (max ${records.length}; existing rows untouched).`);
}
