'use client';
import {useState} from 'react';
import {ImageOff,ExternalLink} from 'lucide-react';
export function Photo({src,source,alt,credit,className=''}:{src?:string|null;source?:string|null;alt:string;credit?:string|null;className?:string}){
 const [broken,setBroken]=useState(false);
 if(!src||!source||broken)return <div className={`photo-empty ${className}`} role="img" aria-label={`No verified photo for ${alt}`}><ImageOff size={28} strokeWidth={1.3}/><span>NO VERIFIED PHOTO</span><strong>{alt}</strong></div>;
 return <div className={`photo-wrap ${className}`}><img src={src} alt={alt} loading="lazy" onError={()=>setBroken(true)}/><a href={source} target="_blank" rel="noopener noreferrer" className="photo-credit" title={credit||'Photo source'}>PHOTO SOURCE <ExternalLink size={12}/></a></div>
}
