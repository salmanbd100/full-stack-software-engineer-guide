<script setup lang="ts">
/**
 * EN/BN as a two-position switch beside the theme toggle, in place of VitePress's language
 * menu (hidden in reading.css). Two locales do not need a menu, and a menu hides which one
 * you are in until it is opened.
 *
 * Every page exists in both editions (#127), so the link is always the same page in the
 * other language — the same path useLangs({ correspondingLink: true }) builds for the menu.
 */
import { computed } from "vue";
import { useData, withBase } from "vitepress";

const { localeIndex, page, hash } = useData();

const isBangla = computed(() => localeIndex.value === "bn");

const href = computed(() => {
  const path = page.value.relativePath
    .replace(/^bn\//, "")
    .replace(/(^|\/)index\.md$/, "$1")
    .replace(/\.md$/, "");
  return withBase((isBangla.value ? "/" : "/bn/") + path) + hash.value;
});

const label = computed(() => (isBangla.value ? "Read in English" : "বাংলায় পড়ুন"));
</script>

<template>
  <a
    class="LanguageSwitch"
    :class="{ bn: isBangla }"
    :href="href"
    :title="label"
    :aria-label="label"
    :hreflang="isBangla ? 'en-GB' : 'bn-BD'"
  >
    <span class="thumb" aria-hidden="true" />
    <span class="code" :class="{ active: !isBangla }" aria-hidden="true">EN</span>
    <span class="code" :class="{ active: isBangla }" aria-hidden="true">BN</span>
  </a>
</template>

<style scoped>
/* VPSwitch's border, track and thumb, widened to carry a label in each half. */
.LanguageSwitch {
  position: relative;
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  width: 64px;
  height: 22px;
  border-radius: 11px;
  border: 1px solid var(--vp-input-border-color);
  background-color: var(--vp-input-switch-bg-color);
  transition: border-color 0.25s;
  text-decoration: none;
}

.LanguageSwitch:hover {
  border-color: var(--vp-c-brand-1);
}

.thumb {
  position: absolute;
  top: 1px;
  left: 1px;
  width: 30px;
  height: 18px;
  border-radius: 9px;
  background-color: var(--vp-c-neutral-inverse);
  box-shadow: var(--vp-shadow-1);
  transition: transform 0.25s;
}

.bn .thumb {
  transform: translateX(32px);
}

.code {
  position: relative;
  flex: 1;
  text-align: center;
  font-family: var(--vp-font-family-base);
  font-size: 11px;
  font-weight: 600;
  line-height: 20px;
  letter-spacing: 0.04em;
  color: var(--vp-c-text-3);
  transition: color 0.25s;
}

.code.active {
  color: var(--vp-c-brand-1);
}
</style>
