<script setup lang="ts">
/**
 * The reader's share of the book, in the nav beside the language switch. Signed out, it is
 * the way in: a button that opens the sign-in dialog. Signed in, a meter and a percentage,
 * which open the same dialog to show who is signed in.
 */
import { computed, onMounted } from "vue";
import { useData } from "vitepress";
import { completed, load, percent, progress, total } from "./progress";

const { localeIndex } = useData();

const isBangla = computed(() => localeIndex.value === "bn");

const valueText = computed(() =>
  isBangla.value
    ? `${percent.value}% — ${total}টির মধ্যে ${completed.value}টি অধ্যায় পড়া হয়েছে`
    : `${percent.value}% — ${completed.value} of ${total} chapters read`,
);

onMounted(load);
</script>

<template>
  <button
    v-if="!progress.profile"
    type="button"
    class="ReadingProgress start"
    @click="progress.dialogOpen = true"
  >
    {{ isBangla ? "অগ্রগতি দেখুন" : "Track progress" }}
  </button>
  <button
    v-else
    type="button"
    class="ReadingProgress"
    :title="valueText"
    @click="progress.dialogOpen = true"
  >
    <span
      class="track"
      role="progressbar"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="percent"
      :aria-valuetext="valueText"
    >
      <span class="fill" :style="{ width: `${percent}%` }" />
    </span>
    <span class="value" aria-hidden="true">{{ percent }}%</span>
  </button>
</template>

<style scoped>
.ReadingProgress {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  height: 24px;
  padding: 0 2px;
  font-family: var(--vp-font-family-base);
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  transition: color 0.25s;
}

.ReadingProgress:hover {
  color: var(--vp-c-brand-1);
}

/* The language switch's border and track colours, so the two read as one set of controls. */
.start {
  padding: 0 10px;
  border: 1px solid var(--vp-input-border-color);
  border-radius: 11px;
  height: 22px;
  transition:
    border-color 0.25s,
    color 0.25s;
}

.start:hover {
  border-color: var(--vp-c-brand-1);
}

.track {
  position: relative;
  width: 72px;
  height: 6px;
  border-radius: 3px;
  overflow: hidden;
  background-color: var(--vp-input-switch-bg-color);
  box-shadow: inset 0 0 0 1px var(--vp-input-border-color);
}

.fill {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: 3px;
  background-color: var(--vp-c-brand-1);
  transition: width 0.4s ease;
}

.value {
  min-width: 3.5ch;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
</style>
