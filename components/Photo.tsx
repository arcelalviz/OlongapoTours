'use client';
import {useEffect, useState} from 'react';
import {ImageOff,ExternalLink} from 'lucide-react';

type Props = {src?:string|null; source?:string|null; alt:string; credit?:string|null; className?:string; kind?:'place'|'event'; slug?:string};

export function Photo({src,source,alt,credit,className='',kind,slug}:Props){
 const [attempt,setAttempt]=useState<'proxy'|'direct'|'missing'>('proxy');
 useEffect(()=>setAttempt('proxy'),[src,source,kind,slug]);
 const trustedSource=source?.startsWith('https://') ? source : null;
 if(!src || !trustedSource || attempt==='missing')return <div className={`photo-empty ${className}`} role="img" aria-label={`No verified photo for ${alt}`}><ImageOff size={28} strokeWidth={1.3}/><span>NO VERIFIED PHOTO</span><strong>{alt}</strong></div>;
 const catalogProxy = kind && slug && /^[a-z0-9-]+$/.test(slug)
   ? `/api/verified-photo/${kind}/${slug}` : null;
 const useProxy=Boolean(catalogProxy && attempt==='proxy');
 const imageUrl=useProxy ? catalogProxy! : src;
 return <div className={`photo-wrap ${className}`}><img key={imageUrl} src={imageUrl} alt={alt} loading="lazy" referrerPolicy="no-referrer" onError={()=>setAttempt(useProxy?'direct':'missing')}/><a href={trustedSource} target="_blank" rel="noopener noreferrer" className="photo-credit" title={credit||'Original image source'}>PHOTO SOURCE <ExternalLink size={12}/></a></div>;
}
