/**
 * The web edition's theme: VitePress's default, with a reading layout on top.
 *
 * Web only. The PDF and EPUB designs are scripts/tex/ and scripts/epub.css, and nothing
 * here reaches them.
 */
import DefaultTheme from "vitepress/theme";
import "./reading.css";

export default DefaultTheme;
