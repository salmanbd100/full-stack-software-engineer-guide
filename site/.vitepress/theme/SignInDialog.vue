<script setup lang="ts">
/**
 * One dialog for both states: a name-and-email form when signed out, and who is signed in
 * (with the count and a way out) when signed in. Mounted once, opened by ReadingProgress.vue
 * through progress.dialogOpen.
 */
import { computed, ref, watch } from "vue";
import { useData } from "vitepress";
import { completed, progress, signIn, signOut, total } from "./progress";

const { localeIndex } = useData();

const dialog = ref<HTMLDialogElement | null>(null);
const name = ref("");
const email = ref("");
const pending = ref(false);
const failed = ref<"invalid" | "unavailable" | null>(null);

const text = computed(() =>
  localeIndex.value === "bn"
    ? {
        title: "আপনার অগ্রগতি",
        intro: "পড়া শেষ হওয়া প্রতিটি অধ্যায় পাশের তালিকায় টিক দিন। নাম আর ইমেল দিলে অগ্রগতি যেকোনো ডিভাইসে মনে থাকবে।",
        name: "নাম",
        email: "ইমেল",
        submit: "শুরু করুন",
        notice: "অগ্রগতি সংরক্ষণের জন্য আপনার নাম আর ইমেল রাখা হয়। এগুলো দিয়ে আর কিছু করা হয় না।",
        invalid: "সাইন ইন করা যায়নি। নাম আর ইমেল দেখে আবার চেষ্টা করুন।",
        unavailable: "এই মুহূর্তে অগ্রগতি সংরক্ষণ করা যাচ্ছে না। একটু পরে আবার চেষ্টা করুন।",
        read: `${total}টির মধ্যে ${completed.value}টি অধ্যায় পড়া হয়েছে।`,
        signOut: "সাইন আউট",
        close: "বন্ধ করুন",
      }
    : {
        title: "Your progress",
        intro: "Tick each chapter in the sidebar once you have read and understood it. Your name and email keep the ticks on any device.",
        name: "Name",
        email: "Email",
        submit: "Start tracking",
        notice: "Your name and email are stored to save your progress. Nothing else is done with them.",
        invalid: "Could not sign in. Check your name and email and try again.",
        unavailable: "Progress cannot be saved right now. Please try again later.",
        read: `${completed.value} of ${total} chapters read.`,
        signOut: "Sign out",
        close: "Close",
      },
);

watch(
  () => progress.dialogOpen,
  (open) => {
    if (open) dialog.value?.showModal();
    else dialog.value?.close();
  },
);

async function submit() {
  pending.value = true;
  failed.value = null;
  const result = await signIn(name.value, email.value);
  pending.value = false;
  if (result === "ok") progress.dialogOpen = false;
  else failed.value = result;
}

function leave() {
  signOut();
  progress.dialogOpen = false;
}
</script>

<template>
  <dialog
    ref="dialog"
    class="SignInDialog"
    aria-labelledby="sign-in-title"
    @close="progress.dialogOpen = false"
    @click.self="progress.dialogOpen = false"
  >
    <div class="body">
      <h2 id="sign-in-title" class="title">{{ text.title }}</h2>

      <template v-if="progress.profile">
        <p class="who">
          <strong>{{ progress.profile.name }}</strong>
          <span>{{ progress.profile.email }}</span>
        </p>
        <p class="intro">{{ text.read }}</p>
        <div class="actions">
          <button type="button" class="secondary" @click="leave">{{ text.signOut }}</button>
          <button type="button" class="primary" @click="progress.dialogOpen = false">
            {{ text.close }}
          </button>
        </div>
      </template>

      <form v-else @submit.prevent="submit">
        <p class="intro">{{ text.intro }}</p>
        <label class="field">
          <span>{{ text.name }}</span>
          <input v-model="name" type="text" autocomplete="name" maxlength="80" required />
        </label>
        <label class="field">
          <span>{{ text.email }}</span>
          <input v-model="email" type="email" autocomplete="email" required />
        </label>
        <p v-if="failed" class="error" role="alert">{{ text[failed] }}</p>
        <div class="actions">
          <button type="button" class="secondary" @click="progress.dialogOpen = false">
            {{ text.close }}
          </button>
          <button type="submit" class="primary" :disabled="pending">{{ text.submit }}</button>
        </div>
        <p class="notice">{{ text.notice }}</p>
      </form>
    </div>
  </dialog>
</template>

<style scoped>
.SignInDialog {
  width: min(420px, calc(100vw - 32px));
  padding: 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background-color: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  box-shadow: var(--vp-shadow-4);
}

.SignInDialog::backdrop {
  background-color: rgba(0, 0, 0, 0.45);
}

.body {
  padding: 24px;
}

.title {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 600;
  line-height: 28px;
}

.intro,
.who {
  margin: 0 0 16px;
  font-size: 14px;
  line-height: 22px;
  color: var(--vp-c-text-2);
}

.who {
  display: flex;
  flex-direction: column;
}

.who strong {
  color: var(--vp-c-text-1);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-c-text-2);
}

.field input {
  height: 38px;
  padding: 0 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background-color: var(--vp-c-bg-alt);
  font-size: 15px;
  color: var(--vp-c-text-1);
  transition: border-color 0.25s;
}

.field input:focus {
  outline: none;
  border-color: var(--vp-c-brand-1);
}

.error {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--vp-c-danger-1);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.actions button {
  height: 36px;
  padding: 0 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  transition:
    background-color 0.25s,
    border-color 0.25s;
}

/* brand-3 stays the portfolio's #2e7d96 in dark mode too, where brand-1 lightens past what
   white text can sit on. */
.primary {
  background-color: var(--vp-c-brand-3);
  color: var(--vp-c-white);
}

.primary:hover {
  background-color: var(--vp-c-brand-2);
}

.primary:disabled {
  opacity: 0.6;
  cursor: wait;
}

.secondary {
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
}

.secondary:hover {
  border-color: var(--vp-c-brand-1);
}

.notice {
  margin: 16px 0 0;
  font-size: 12px;
  line-height: 18px;
  color: var(--vp-c-text-3);
}
</style>
