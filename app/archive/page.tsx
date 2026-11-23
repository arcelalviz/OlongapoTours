import Link from 'next/link';
import type {Metadata} from 'next';
export const metadata:Metadata={title:'Original Project Photo Archive'};
const images=[
 {name:'inflatable-island.jpg', caption:'Waterpark image from the earlier project — exact source and rights not independently established'},
 {name:'zoobic-safari.jpg', caption:'Safari attraction image from the earlier project — exact source and rights not independently established'},
 {name:'hero.jpg', caption:'Forest stream from the earlier project — location not confirmed'},
 {name:'subic-bay.jpg', caption:'Lighthouse image from the earlier project — venue identification not confirmed'},
 {name:'olongapo-festival.jpg', caption:'Lighthouse duplicate from the earlier project — NOT a festival photograph'}
];
export default function Archive(){return <><div className="page-head container"><span className="eyebrow">YOUR PREVIOUS FILES</span><h1>The photo <em>archive.</em></h1><p>These are the actual images found in your older HEHE.zip folder. They are preserved as an archive, NOT labeled as verified photographs of particular destinations or events. Confirm ownership and permissions before public reuse.</p></div><section className="section container"><div className="cards">{images.map(image=><article className="panel" key={image.name}><img src={`/original-project/${image.name}`} alt={`Archived file ${image.name}`} loading="lazy" style={{width:'100%',maxHeight:260,objectFit:'cover',borderRadius:16}}/><h3>{image.name}</h3><p>{image.caption}</p></article>)}</div><div className="spaced"><Link href="/places" className="pill dark">RETURN TO DESTINATIONS ↗</Link></div></section></>}
