import photoIndex from '@/data/verified-photo-index.json';
import type {Destination, Event} from '@/lib/types';

// This module is safe to import from both Server and Client Components.
// Only entries present in the previously curated authentic-photo index
// are eligible for public destination and event cards.
type CuratedImage = {url:string;source:string;credit?:string};
const approved = photoIndex as Record<string, CuratedImage>;

function isApproved(kind:'place'|'event', slug:string, imageUrl:string|null, sourceUrl:string|null): boolean {
  if (!imageUrl || !sourceUrl) return false;
  const entry = approved[`${kind}/${slug}`];
  return !!entry && entry.url === imageUrl && entry.source === sourceUrl;
}

export function hasVerifiedPlacePhoto(place:Destination):boolean {
  return isApproved('place',place.slug,place.image_url,place.image_source_url);
}
export function hasVerifiedEventPhoto(event:Event):boolean {
  return isApproved('event',event.slug,event.image_url,event.image_source_url);
}
export function displayablePlaces(places:Destination[]):Destination[] {
  return places.filter(hasVerifiedPlacePhoto);
}
export function displayableEvents(events:Event[]):Event[] {
  return events.filter(hasVerifiedEventPhoto);
}
