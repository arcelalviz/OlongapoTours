'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';

const MAX_PHOTOS = 4;
const MAX_SIZE = 2 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

export function StoryForm({ places }: { places: string[] }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [published, setPublished] = useState(false);
  const router = useRouter();

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage('');
    setPublished(false);
    try {
      const fd = new FormData(e.currentTarget);
      const photos = fd.getAll('photos').filter((file): file is File => file instanceof File && file.size > 0);
      if (photos.length > MAX_PHOTOS) throw new Error('Choose a maximum of four photos.');
      for (const file of photos) {
        if (file.size > MAX_SIZE || !ACCEPTED.includes(file.type)) {
          throw new Error('Photos must be JPEG, PNG or WebP and no larger than 2 MB each.');
        }
      }
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          place_name: String(fd.get('place_name') || ''),
          title: String(fd.get('title') || ''),
          body: String(fd.get('body') || ''),
          rating: Number(fd.get('rating')),
          visit_date: String(fd.get('visit_date') || '')
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.error || 'Unable to publish your story.');

      // The text is already public. Photo uploads are independent of the service-role key.
      setPublished(true);
      if (photos.length) {
        const supabase = createClient();
        let failures = 0;
        for (const file of photos) {
          const id = crypto.randomUUID();
          const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
          const path = `${result.userId}/${result.id}/${id}.${extension}`;
          const { error: uploadError } = await supabase.storage.from('review-private')
            .upload(path, file, { contentType: file.type, upsert: false });
          if (uploadError) {
            console.error('[stories] Photo upload failed', uploadError.message);
            failures++;
            continue;
          }
                    const { error: rowError } = await supabase.from('review_photos').insert({
            id,
            review_id: result.id,
            storage_path: path,
            public_url: `/api/review-photo/${id}`,
            alt_text: String(fd.get('title') || '').slice(0, 140)
          });
          if (rowError) {
            console.error('[stories] Photo record failed', rowError.message);
            await supabase.storage.from('review-private').remove([path]);
            failures++;
          }
        }
        if (failures) {
          setMessage(`Your story is already public, but ${failures} photo${failures === 1 ? '' : 's'} could not be added. Check that supabase/005_public_stories.sql was run. You can view the story now.`);
          router.refresh();
          return;
        }
      }
      router.push('/stories');
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not publish story.');
    } finally {
      setBusy(false);
    }
  }

  return <form onSubmit={submit} className="panel form">
    <label>Place you visited
      <select name="place_name" required>{places.map(p => <option key={p} value={p}>{p}</option>)}</select>
    </label>
    <label>Story title<input name="title" maxLength={120} minLength={3} required placeholder="A moment worth remembering" /></label>
    <label>Share what happened<textarea name="body" minLength={20} maxLength={3000} required placeholder="Write about your real experience..." /></label>
    <div className="form-grid">
      <label>Rating<select name="rating">{[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>)}</select></label>
      <label>Date you visited (optional)<input name="visit_date" type="date" /></label>
    </div>
    <label>Photos (optional; up to four JPEG, PNG or WebP images, 2 MB each)
      <input name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple />
    </label>
    <p className="small">Stories and photos become public as soon as you submit. Please use your own photos, respect others' privacy, and avoid sharing phone numbers or home addresses. Administrators can remove inappropriate content.</p>
    <button className="pill dark" disabled={busy} type="submit">{busy ? 'PUBLISHING…' : 'PUBLISH MY STORY ↗'}</button>
    {message && <p role={published ? 'status' : 'alert'}>{message} {published && <Link href="/stories">VIEW PUBLIC STORIES ↗</Link>}</p>}
  </form>;
}
