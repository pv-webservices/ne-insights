// Where approved testimonials live: Netlify Blobs on the live site, a JSON file for local preview,
// memory in tests. Only publishable fields are stored; feedback is never stored before it is approved.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getStore } from '@netlify/blobs';
import type { Testimonial } from '../../../src/components/testimonials.mjs';

export interface StoredTestimonial extends Testimonial {
  /** When it was approved (ms since epoch); newest are shown first. Not published. */
  approvedAt: number;
}

export interface TestimonialStore {
  list(): Promise<StoredTestimonial[]>;
  get(id: string): Promise<StoredTestimonial | null>;
  save(entry: StoredTestimonial): Promise<void>;
  remove(id: string): Promise<void>;
}

const STORE_NAME = 'approved-testimonials';

/** Netlify Blobs (site-wide, survives deploys). Strong reads so an approval shows up straight away. */
export const blobTestimonialStore = (): TestimonialStore => {
  const store = getStore({ name: STORE_NAME, consistency: 'strong' });
  const get = async (id: string) => (await store.get(id, { type: 'json' })) as StoredTestimonial | null;
  return {
    async list() {
      const { blobs } = await store.list();
      return (await Promise.all(blobs.map((blob) => get(blob.key)))).filter((entry): entry is StoredTestimonial => !!entry);
    },
    get,
    save: async (entry) => { await store.setJSON(entry.id, entry); },
    remove: (id) => store.delete(id),
  };
};

export const memoryTestimonialStore = (initial: StoredTestimonial[] = []): TestimonialStore & { entries: Map<string, StoredTestimonial> } => {
  const entries = new Map(initial.map((entry) => [entry.id, entry]));
  return {
    entries,
    list: async () => [...entries.values()],
    get: async (id) => entries.get(id) ?? null,
    save: async (entry) => { entries.set(entry.id, entry); },
    remove: async (id) => { entries.delete(id); },
  };
};

/** Local preview (scripts/serve.mjs): a JSON file, so approvals survive a server restart. */
export const fileTestimonialStore = (file: string): TestimonialStore => {
  const read = async (): Promise<Record<string, StoredTestimonial>> => JSON.parse(await readFile(file, 'utf8').catch(() => '{}'));
  const write = async (data: Record<string, StoredTestimonial>) => {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(data, null, 2));
  };
  return {
    list: async () => Object.values(await read()),
    get: async (id) => (await read())[id] ?? null,
    save: async (entry) => write({ ...(await read()), [entry.id]: entry }),
    remove: async (id) => { const { [id]: _removed, ...rest } = await read(); await write(rest); },
  };
};
