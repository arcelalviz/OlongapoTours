'use client';
import {useEffect,useState} from 'react';
import {ExternalLink} from 'lucide-react';
type Props={src?:string|null;source?:string|null;alt:string;credit?:string|null;className?:string;kind?:'place'|'event';slug?:string;onUnavailable?:()=>void};
export function Photo({src,source,alt,credit,className='',kind,slug,onUnavailable}:Props){
 const [attempt,setAttempt]=useState<'proxy'|'direct'|'missing'>('proxy');
 useEffect(()=>setAttempt('proxy'),[src,source,kind,slug]);
 const trustedSource=source?.startsWith('https://')?source:null;
 if(!src||!trustedSource||attempt==='missing')return null;
 const proxy=kind&&slug&&/^[a-z0-9-]+$/.test(slug)?`/api/verified-photo/${kind}/${slug}`:null;
 const useProxy=Boolean(proxy&&attempt==='proxy');
 const url=useProxy?proxy!:src;
 return <div className={`photo-wrap ${className}`}><img key={url} src={url} alt={alt} loading="lazy" referrerPolicy="no-referrer" onError={()=>{if(useProxy){setAttempt('direct');}else{setAttempt('missing');onUnavailable?.();}}}/><a href={trustedSource} target="_blank" rel="noopener noreferrer" className="photo-credit" title={credit||'Original image source'}>PHOTO SOURCE <ExternalLink size={12}/></a></div>;
}
