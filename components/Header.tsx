'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useState} from 'react';
import {Menu,X,Compass} from 'lucide-react';
const links=[['/places','Places'],['/events','Events'],['/stories','Stories'],['/map','Map'],['/planner','Trip planner'],['/gallery','My photos']];
export function Header({signedIn=false}:{signedIn?:boolean}){const path=usePathname(),[open,setOpen]=useState(false);return <header className="site-header"><Link href="/" className="brand" onClick={()=>setOpen(false)}><span className="brand-main">OLONGAPO</span><span className="brand-sub">TOURS / GALA MODE <Compass size={13}/></span></Link><nav className={open?'nav-links nav-open':'nav-links'} aria-label="Main navigation">{links.map(([url,title])=><Link key={url} className={path.startsWith(url)?'nav-current':''} href={url} onClick={()=>setOpen(false)}>{title}</Link>)}<Link href={signedIn?'/dashboard':'/auth/signin'} className="nav-profile" onClick={()=>setOpen(false)}>{signedIn?'MY SPACE ↗':'GOOGLE SIGN IN ↗'}</Link></nav><button className="nav-toggle" aria-label={open?'Close menu':'Open menu'} onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button></header>}
