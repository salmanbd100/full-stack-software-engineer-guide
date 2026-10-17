/**
 * The web edition's theme: VitePress's default, with a reading layout on top.
 *
 * Web only. The PDF and EPUB designs are scripts/tex/ and scripts/epub.css, and nothing
 * here reaches them.
 */
import { h } from "vue";
import DefaultTheme from "vitepress/theme";
import LanguageSwitch from "./LanguageSwitch.vue";
import "./reading.css";

export default {
  extends: DefaultTheme,
  Layout: () =>
    h(DefaultTheme.Layout, null, {
      "nav-bar-content-after": () => h(LanguageSwitch, { class: "language-switch-bar" }),
      "nav-screen-content-after": () => h(LanguageSwitch, { class: "language-switch-screen" }),
    }),
};
