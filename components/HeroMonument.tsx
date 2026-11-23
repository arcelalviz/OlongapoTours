'use client';
import {useState} from 'react';
const sources=[
 'https://upload.wikimedia.org/wikipedia/commons/3/31/Head_of_Apo_Monument%2C_Olongapo_City%2C_Aug_2025.jpg',
 'https://commons.wikimedia.org/wiki/Special:FilePath/Head%20of%20Apo%20Monument%2C%20Olongapo%20City%2C%20Aug%202025.jpg?width=1280'
];
const sourcePage='https://commons.wikimedia.org/wiki/File:Head_of_Apo_Monument,_Olongapo_City,_Aug_2025.jpg';
export function HeroMonument(){
 const [index,setIndex]=useState(0);
 return <div className="hero-monument">
  {index<sources.length ? <img src={sources[index]} alt="Ulo ng Apo Monument at the Olongapo City rotunda, photographed in August 2025" className="hero-monument-image" fetchPriority="high" referrerPolicy="no-referrer" onError={()=>setIndex(i=>i+1)}/> : <div className="hero-monument-unavailable"><strong>ULO NG APO</strong><span>Authentic photograph temporarily unavailable</span></div>}
  <div className="hero-monument-label"><span>THE CITY'S ICONIC LANDMARK</span><strong>ULO NG APO MONUMENT</strong></div>
  <a className="hero-monument-credit" target="_blank" rel="noopener noreferrer" href={sourcePage}>PHOTO: RALFF NESTOR NACOR · CC BY-SA 4.0 ↗</a>
 </div>;
}
