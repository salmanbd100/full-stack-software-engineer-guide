/**
 * The web edition's theme: VitePress's default, with a reading layout on top.
 *
 * Web only. The PDF and EPUB designs are scripts/tex/ and scripts/epub.css, and nothing
 * here reaches them.
 */
import { h } from "vue";
import DefaultTheme from "vitepress/theme";
import LanguageSwitch from "./LanguageSwitch.vue";
import ReadingProgress from "./ReadingProgress.vue";
import SignInDialog from "./SignInDialog.vue";
import "./reading.css";

export default {
  extends: DefaultTheme,
  Layout: () =>
    h(DefaultTheme.Layout, null, {
      "nav-bar-content-after": () => [
        h(ReadingProgress, { class: "reading-progress-bar" }),
        h(LanguageSwitch, { class: "language-switch-bar" }),
      ],
      "nav-screen-content-after": () => [
        h(ReadingProgress, { class: "reading-progress-screen" }),
        h(LanguageSwitch, { class: "language-switch-screen" }),
      ],
      "layout-bottom": () => h(SignInDialog),
    }),
};
