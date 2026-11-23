import type {Metadata} from 'next';
import {events} from '@/lib/content';
import {EventCard} from '@/components/Cards';
import {displayableEvents} from '@/lib/verified-cards';
export const metadata:Metadata={title:'Photo-Verified Events and Festivals'};
const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
export default async function Events(){
 const all=displayableEvents(await events());
 const monthsWithPhotos=months.filter(m=>all.some(e=>e.month_label===m));
 return <><div className="page-head container"><span className="eyebrow">THE LOCAL CULTURAL CALENDAR / APPROVED PHOTOS</span><h1>Every celebration<br/><em>has a story.</em></h1><p>Only events with identifiable historical or event-specific photographs appear here. Events awaiting confirmed photographs are hidden from the public cards, not deleted from the database. Past dates are not current announcements.</p></div>
 <section className="section container">
 {monthsWithPhotos.map(m=>{const list=all.filter(e=>e.month_label===m);return <div key={m} className="spaced"><div className="section-title"><div><span className="eyebrow muted">THE YEAR / {String(months.indexOf(m)+1).padStart(2,'0')}</span><h2>{m}</h2></div><span className="small">{list.length} {list.length===1?'photo-verified entry':'photo-verified entries'}</span></div><div className="events-grid">{list.map(e=><EventCard key={e.slug} item={e}/>)}</div></div>})}
 {!all.length&&<div className="panel"><h3>No approved event photos yet</h3><p>Events will appear when actual event photographs have been reviewed and added.</p></div>}
 </section></>;
}
