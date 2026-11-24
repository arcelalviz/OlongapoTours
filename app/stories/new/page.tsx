import type { Metadata } from 'next';
import { destinations } from '@/lib/content';
import { requireUser } from '@/lib/auth';
import { StoryForm } from '@/components/StoryForm';

export const metadata: Metadata = { title: 'Share Your Story' };
export default async function NewStory() {
  await requireUser();
  const places = await destinations();
  return <>
    <div className="page-head container">
      <span className="eyebrow">GIVE YOUR ADVENTURE A VOICE</span>
      <h1>Tell us your <em>story.</em></h1>
      <p>Publish your real experience instantly. Everyone can read it, even without signing in.</p>
    </div>
    <section className="section container" style={{ maxWidth: 820 }}>
      <StoryForm places={places.map(x => x.name)} />
    </section>
  </>;
}
