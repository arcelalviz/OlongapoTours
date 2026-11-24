import type { Metadata } from 'next';
import Link from 'next/link';
import { stories } from '@/lib/content';

export const metadata: Metadata = { title: 'Traveler Stories' };
export const dynamic = 'force-dynamic';

export default async function Stories() {
  const list = await stories(100);
  return <>
    <div className="page-head container">
      <span className="eyebrow">REAL PEOPLE, REAL EXPERIENCES</span>
      <h1>Stories worth<br /><em>sharing.</em></h1>
      <p>Real traveler stories are public as soon as they are posted. Sign in only when you want to share one.</p>
      <Link href="/stories/new" className="pill dark">WRITE YOUR STORY ↗</Link>
    </div>
    <section className="section container">
      {list.length ? <div className="cards">{list.map(r => <article key={r.id} className="panel">
        <span className="eyebrow">{'★'.repeat(r.rating)} · {r.place_name}</span>
        <h3>{r.title}</h3>
        <p style={{ whiteSpace: 'pre-wrap' }}>{r.body}</p>
        <span className="small">Traveler · {new Date(r.created_at).toLocaleDateString('en-PH')}</span>
        {r.review_photos?.length ? <div className="gallery-grid spaced">{r.review_photos.map(p =>
          <img key={p.id} src={p.public_url} alt={p.alt_text || r.title} loading="lazy" />
        )}</div> : null}
      </article>)}</div> : <div className="panel">
        <h3>Start the story collection.</h3>
        <p>No travel stories have been posted yet. Sign in to share an experience and it will appear here immediately.</p>
        <Link href="/stories/new" className="pill dark">BE THE FIRST TO POST ↗</Link>
      </div>}
    </section>
  </>;
}
