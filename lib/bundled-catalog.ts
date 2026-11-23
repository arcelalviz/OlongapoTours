import 'server-only';
import catalog from '@/data/bundled-catalog.json';
import type {Destination, Event} from '@/lib/types';

// This ships with the deployment; no legacy Byethost database is required.
// Unverified photos have deliberately been set to null.
export const bundledDestinations = catalog.destinations as unknown as Destination[];
export const bundledEvents = catalog.events as unknown as Event[];

export function trustedPlaceImage(row: Destination): Destination {
  const source = bundledDestinations.find(p => p.slug === row.slug);
  if (!source?.image_source_url || row.image_source_url !== source.image_source_url) {
    return {...row, image_url:null, image_source_url:null, image_credit:null};
  }
  return {...row, image_url: source.image_url, image_credit: source.image_credit};
}
export function trustedEventImage(row: Event): Event {
  const source = bundledEvents.find(e => e.slug === row.slug);
  if (!source?.image_source_url || row.image_source_url !== source.image_source_url) {
    return {...row, image_url:null, image_source_url:null, image_credit:null};
  }
  return {...row, image_url: source.image_url, image_credit: source.image_credit};
}
