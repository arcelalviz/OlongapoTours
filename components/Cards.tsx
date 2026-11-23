'use client';
import {useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight,CalendarDays} from 'lucide-react';
import {Photo} from './Photo';
import type {Destination,Event} from '@/lib/types';
import {eventDate} from '@/lib/format';
import {hasVerifiedPlacePhoto,hasVerifiedEventPhoto} from '@/lib/verified-cards';

// Cards are never rendered without a catalog-approved image.
// If an approved remote image fails both the proxy and direct source,
// the entire card is removed rather than leaving a misleading blank tile.
export function PlaceCard({item,index=0}:{item:Destination;index?:number}){
 const [imageAvailable,setImageAvailable]=useState(true);
 if(!hasVerifiedPlacePhoto(item)||!imageAvailable)return null;
 return <Link href={`/places/${item.slug}`} className="place-card has-photo">
   <div className="card-media"><Photo kind="place" slug={item.slug} src={item.image_url} source={item.image_source_url} alt={item.name} credit={item.image_credit} onUnavailable={()=>setImageAvailable(false)}/><span className="card-counter">{String(index+1).padStart(2,'0')}</span></div>
   <div className="card-bottom"><div><span className="eyebrow muted">{item.category} · {item.area}</span><h3>{item.name}</h3><p>{item.excerpt}</p></div><ArrowUpRight size={23}/></div>
 </Link>;
}
export function EventCard({item}:{item:Event}){
 const [imageAvailable,setImageAvailable]=useState(true);
 if(!hasVerifiedEventPhoto(item)||!imageAvailable)return null;
 return <Link href={`/events/${item.slug}`} className="event-card has-photo">
   <div className="event-media"><Photo kind="event" slug={item.slug} src={item.image_url} source={item.image_source_url} alt={item.title} credit={item.image_credit} onUnavailable={()=>setImageAvailable(false)}/></div>
   <div className="event-content"><span className="eyebrow muted"><CalendarDays size={13}/> {item.month_label.toUpperCase()} · {item.category.toUpperCase()}</span><h3>{item.title}</h3><p>{item.excerpt}</p><span className="event-date">{eventDate(item)} <ArrowUpRight size={16}/></span></div>
 </Link>;
}
