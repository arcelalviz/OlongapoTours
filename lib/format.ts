import type { Event } from './types';

// Shared browser/server utilities: do not import Supabase or next/headers here.
export function eventDate(e:Event){if(e.date_start){const s=new Date(`${e.date_start}T12:00:00`),end=e.date_end?new Date(`${e.date_end}T12:00:00`):null;return `${s.toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})}${end?' – '+end.toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'}):''}`}return e.date_note||e.month_label}
export function safePhoto(url:string|null|undefined,source:string|null|undefined){if(!url||!source)return null;try{const u=new URL(url),s=new URL(source);return u.protocol==='https:'&&s.protocol==='https:'?url:null}catch{return null}}
