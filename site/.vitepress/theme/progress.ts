/**
 * The reader's progress: who they are, which chapters they have ticked, and the share of the
 * book that is. One module-level store, shared by the sidebar checkboxes
 * (ProgressSidebarItem.vue), the bar in the nav (ReadingProgress.vue) and the sign-in dialog.
 *
 * The record lives server-side (api/progress.ts), keyed by email. Only the profile is kept in
 * localStorage, so the ticks follow the reader to another device once they sign in there.
 */
import { computed, reactive } from "vue";
import { withBase } from "vitepress";
import sidebar from "../sidebar.json" with { type: "json" };

interface Profile {
  name: string;
  email: string;
}

interface SidebarEntry {
  link?: string;
  items?: SidebarEntry[];
}

const PROFILE_KEY = "handbook-reader";
const API = () => withBase("/api/progress");

/** A sidebar link as a locale-free slug, so a tick in Bangla counts in English too. */
export function slugOf(link: string): string {
  return link.replace(/^\/bn(?=\/)/, "");
}

function linksOf(entries: SidebarEntry[]): string[] {
  return entries.flatMap((entry) => [
    ...(entry.link ? [slugOf(entry.link)] : []),
    ...linksOf(entry.items ?? []),
  ]);
}

const chapters = new Set(linksOf(sidebar.en as SidebarEntry[]));

export const progress = reactive({
  profile: null as Profile | null,
  done: new Set<string>(),
  dialogOpen: false,
});

export const total = chapters.size;

// Intersected with the sidebar, so a chapter cut from the book never counts towards 100%.
export const completed = computed(
  () => [...progress.done].filter((slug) => chapters.has(slug)).length,
);

export const percent = computed(() => (total ? Math.round((completed.value / total) * 100) : 0));

function readProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

function writeProfile(profile: Profile | null): void {
  try {
    if (profile) localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    else localStorage.removeItem(PROFILE_KEY);
  } catch {
    // Private windows and blocked storage: the reader signs in again next visit.
  }
}

let loaded = false;

/** Restore the profile and fetch its ticks. Client-only; safe to call from every mount. */
export async function load(): Promise<void> {
  if (loaded) return;
  loaded = true;
  progress.profile = readProfile();
  if (!progress.profile) return;
  try {
    const response = await fetch(`${API()}?email=${encodeURIComponent(progress.profile.email)}`);
    if (!response.ok) return;
    const { done } = (await response.json()) as { done: string[] };
    progress.done = new Set(done);
  } catch {
    // Offline: the bar shows 0% until the next load rather than blocking the page.
  }
}

export async function signIn(name: string, email: string): Promise<boolean> {
  const response = await fetch(API(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email }),
  }).catch(() => null);
  if (!response?.ok) return false;

  const result = (await response.json()) as { name: string; done: string[] };
  progress.profile = { name: result.name, email: email.trim().toLowerCase() };
  progress.done = new Set(result.done);
  writeProfile(progress.profile);
  return true;
}

export function signOut(): void {
  progress.profile = null;
  progress.done = new Set();
  writeProfile(null);
}

/** Tick or untick at once, and put it back if the server does not take it. */
export async function toggle(link: string): Promise<void> {
  if (!progress.profile) return;
  const slug = slugOf(link);
  const done = !progress.done.has(slug);
  const apply = (on: boolean) => {
    const next = new Set(progress.done);
    if (on) next.add(slug);
    else next.delete(slug);
    progress.done = next;
  };

  apply(done);
  const response = await fetch(API(), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: progress.profile.email, slug, done }),
  }).catch(() => null);
  if (!response?.ok) apply(!done);
}
