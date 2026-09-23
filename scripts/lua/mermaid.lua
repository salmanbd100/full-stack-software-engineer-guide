--[[
  mermaid.lua — improvement #82

  Renders every ```mermaid fence to a figure instead of printing its source.

  Until this filter existed, pandoc treated a Mermaid fence the way it treats any other
  code block: the PDF set the *source* of 96 diagrams in monospace, and the EPUB did the
  same. #74 called that "the conversion is largely done; what is missing is that nothing
  renders them". This is the renderer.

  Two outputs, because the two formats want different things:

    latex → a vector PDF, placed by \bookdiagram (scripts/tex/blocks.tex)
    epub  → an SVG, which is what an e-reader can reflow and zoom
    other → the fence is left exactly as it was, so the VitePress site keeps rendering
            Mermaid client-side, which it already does better than a static image

  🔑 **Why a diagram is rendered more than once.**

  A Mermaid diagram has a natural size, and it is nothing like the measure of a book
  page. Across this manuscript the 96 figures come out between 500 and 1,220 points wide
  against a 156mm text block, so fitting them means shrinking them — by 1.00 in the best
  case and by 0.36 in the worst. Shrinking a figure shrinks its labels with it, so one
  font size for all 96 produces type anywhere from 10pt down to 3.5pt: illegible at
  exactly the diagrams that needed the most help, which is not a tuning problem but the
  wrong variable held constant.

  So the font size is solved per diagram instead. The property that makes it possible is
  that Mermaid wraps node text at a fixed width, so a diagram's *width* moves much less
  than its type size does — a diagram set 50% larger does not come out 50% wider. Each
  figure is therefore rendered, measured against the text block, and re-rendered at a
  size corrected by what the last render actually achieved, until the labels land on
  \tokDiagramLabelSize. Two or three passes is typical. A figure so wide that even
  MAX_PX cannot lift it to the target stops there, and the build reports the size it
  reached rather than pretending.

  **Caching is not an optimisation here, it is what makes the build usable.** mmdc starts
  a headless Chromium per invocation and takes about two seconds a diagram. Each diagram
  is keyed by the SHA-1 of its own source *and* the theme *and* the geometry it was
  fitted to, so editing one diagram re-renders one diagram, and moving a margin or a
  token re-renders all of them. The cache lives in build/diagrams/, gitignored with the
  rest of build/.

  Requires mermaid-cli on the PATH:

      pnpm add -g @mermaid-js/mermaid-cli     # or npm install -g

  build-book.sh checks for it in preflight, so a missing mmdc fails with one line rather
  than 96 pandoc errors.
]]

local CACHE_DIR = "build/diagrams"
local THEME = "scripts/mermaid-theme.json"
local TOKENS = "scripts/tex/tokens.tex"

--- The generated stylesheet that points Chromium at the book's own sans.
---
--- It has to be generated rather than checked in: mmdc injects the CSS into a page with
--- no base URL, so a relative `url(assets/fonts/…)` resolves against nothing and the
--- diagram silently falls back to Helvetica — silently, because a missing web font is
--- not an error anywhere in the stack. The absolute path is only knowable at build time.
local FONT_CSS = CACHE_DIR .. "/fonts.css"

local FONT_FACES = {
  { family = "Source Sans 3", file = "SourceSans3-Regular.otf", weight = "400", style = "normal" },
  { family = "Source Sans 3", file = "SourceSans3-Semibold.otf", weight = "600", style = "normal" },
  { family = "Source Sans 3", file = "SourceSans3-It.otf", weight = "400", style = "italic" },
  { family = "Source Code Pro", file = "SourceCodePro-Regular.otf", weight = "400", style = "normal" },
}

--- Chromium writes CSS pixels into a PDF at 0.75pt each — the CSS specification's own
--- 96dpi reference pixel. It is the only constant here that is not read from the design.
local PX_TO_PT = 0.75

--- The correction never leaves this range. Below the floor a diagram lays out
--- differently rather than merely smaller, so the measurement stops being about the
--- figure the reader will see; above the ceiling the labels start wrapping onto three
--- lines and the fit chases itself. A diagram that hits the ceiling is simply too wide
--- to be set at the target size, and the build reports the size it did reach.
local MIN_PX, MAX_PX = 8.0, 40.0

--- Close enough to stop. Half a point is under the width of a hairline at this size, and
--- one more render per diagram to chase it costs two seconds each across 96 figures.
local TOLERANCE_PT = 0.5
local MAX_PASSES = 4

--- 🔴 The SVG is rendered from a different Mermaid configuration to the PDF, and it has
--- to be. Improvement #83, found by running epubcheck over the EPUB for the first time.
---
--- Mermaid's default `htmlLabels: true` sets every node label as an XHTML fragment inside
--- a `<foreignObject>`, and for a multi-line label that fragment is a `<p>` inside a
--- `<span>`. That is invalid XHTML, and 88 of the 96 figures carried it: **epubcheck
--- rejects the book outright**, with one RSC-005 per label. Nothing renders it wrong, so
--- it had shipped unnoticed since #82.
---
--- Turning html labels off gives real `<text>` and `<tspan>` elements, which is what an
--- SVG should have had in the first place. Print keeps `true` — a foreignObject is
--- rasterised into the PDF by Chromium long before tectonic sees it, so the PDF is
--- unaffected and its cache is not invalidated by this.
local SVG_HTML_LABELS = false

--- Bumped whenever anything above changes how an SVG is produced. It is part of the
--- cache key for SVG only, so a change here re-renders 96 SVGs — one pass each, seconds —
--- without touching the 96 cached PDFs, which cost two to four passes apiece.
local SVG_VARIANT = "2"

-- ---------------------------------------------------------------------------
-- Small filesystem helpers
-- ---------------------------------------------------------------------------

local function read_file(path)
  local fh = io.open(path, "rb")
  if not fh then return nil end
  local body = fh:read("a")
  fh:close()
  return body
end

local function write_file(path, body)
  local fh = assert(io.open(path, "wb"), "mermaid.lua: cannot write " .. path)
  fh:write(body)
  fh:close()
end

local function exists(path)
  local fh = io.open(path, "rb")
  if not fh then return false end
  fh:close()
  return true
end

-- ---------------------------------------------------------------------------
-- The page, read from the design rather than restated here
-- ---------------------------------------------------------------------------

--- Every length the fit depends on comes out of scripts/tex/tokens.tex, which is the
--- file #77 calibrates. Copying 26mm into this filter would mean a margin change that
--- silently stopped being what the diagrams were fitted to — the class of bug #29 found
--- when the plan's budget table and the tree disagreed with nobody comparing them.
local function parse_geometry()
  local tokens = read_file(TOKENS)
  if not tokens then
    error("mermaid.lua: " .. TOKENS .. " not found. Relative paths in this filter resolve "
      .. "against the working directory — pandoc has to be run from the repository root.")
  end

  local function token(name, pattern)
    local value = tokens:match("\\newcommand{\\" .. name .. "}{" .. pattern .. "}")
    if not value then
      error("mermaid.lua: " .. TOKENS .. " no longer defines \\" .. name
        .. " in the shape this filter reads. Both have to move together.")
    end
    return value
  end

  local mm = function(name) return tonumber(token(name, "([%d%.]+)mm")) end

  -- a4paper is the only paper this design has ever been set on; anything else has to be
  -- named here deliberately rather than guessed at, because guessing produces a book
  -- whose diagrams are all fitted to the wrong measure and nothing reports it.
  -- `%w`, not `%a`: Lua's letter class does not include the 4 in a4paper.
  local paper = token("tokPaper", "(%w+)")
  if paper ~= "a4paper" then
    error("mermaid.lua: \\tokPaper is '" .. paper .. "'. Add its dimensions here; the "
      .. "diagram fit is measured against the text block, not against the page.")
  end
  local paper_w, paper_h = 210.0, 297.0

  local text_w = paper_w - mm("tokMarginInner") - mm("tokMarginOuter")
  local text_h = paper_h - mm("tokMarginTop") - mm("tokMarginBottom")
  local height_frac = tonumber(token("tokDiagramMaxHeight", "([%d%.]+)\\textheight"))

  local MM_TO_PT = 72.0 / 25.4
  return {
    width_pt = text_w * MM_TO_PT,
    height_pt = text_h * height_frac * MM_TO_PT,
    label_pt = tonumber(token("tokDiagramLabelSize", "([%d%.]+)")),
  }
end

-- ---------------------------------------------------------------------------
-- One-time setup, done lazily so a book with no diagrams pays nothing
-- ---------------------------------------------------------------------------

local theme_source, theme, page, probe_px
local prepared = false

local function prepare()
  if prepared then return end
  prepared = true

  pandoc.system.make_directory(CACHE_DIR, true)
  page = parse_geometry()

  theme_source = read_file(THEME)
  if not theme_source then
    error("mermaid.lua: " .. THEME .. " not found (working directory must be the repo root).")
  end
  theme = pandoc.json.decode(theme_source, false)
  probe_px = tonumber((theme.themeVariables.fontSize:gsub("px", ""))) or 13.0

  local root = pandoc.system.get_working_directory()
  local css = { "/* Generated by scripts/lua/mermaid.lua — do not edit. */" }
  for _, face in ipairs(FONT_FACES) do
    css[#css + 1] = string.format(
      '@font-face { font-family: "%s"; src: url("file://%s/assets/fonts/%s"); '
      .. "font-weight: %s; font-style: %s; }",
      face.family, root, face.file, face.weight, face.style)
  end
  -- Mermaid writes `font-family` inline on its own elements from themeVariables, and an
  -- inline style beats a stylesheet rule, so this needs `!important` to win. The theme
  -- names the same family, so the two are asking for the same thing either way.
  css[#css + 1] = 'svg, svg * { font-family: "Source Sans 3", sans-serif !important; }'
  css[#css + 1] = 'svg .label code, svg tspan.code { font-family: "Source Code Pro", monospace !important; }'
  write_file(FONT_CSS, table.concat(css, "\n") .. "\n")
end

-- ---------------------------------------------------------------------------
-- Rendering
-- ---------------------------------------------------------------------------

local rendered, cached, passes = 0, 0, 0
local achieved = {}

--- The page box of a one-page PDF, in points. mmdc is asked for --pdfFit, so the page
--- *is* the diagram: no bounding-box search is needed and none is done.
local function page_box(path)
  local body = read_file(path)
  if not body then return nil end
  local x0, y0, x1, y1 = body:match("/MediaBox%s*%[%s*([%d%.%-]+)%s+([%d%.%-]+)%s+([%d%.%-]+)%s+([%d%.%-]+)")
  if not x0 then return nil end
  return tonumber(x1) - tonumber(x0), tonumber(y1) - tonumber(y0)
end

--- How far \bookdiagram's adjustbox will shrink a figure of this size. `max width` and
--- `max height` only ever shrink, so a figure that already fits is left at 1.
local function fit_scale(w, h)
  return math.min(1.0, page.width_pt / w, page.height_pt / h)
end

local function run_mmdc(input, output, config)
  local args = { "-i", input, "-o", output, "-c", config, "-C", FONT_CSS, "-b", "white", "-q" }
  -- --pdfFit sizes the page to the diagram instead of dropping it on a letter sheet,
  -- which is what makes page_box above a measurement of the figure.
  if output:sub(-4) == ".pdf" then table.insert(args, "--pdfFit") end

  local ok, err = pcall(pandoc.pipe, "mmdc", args, "")
  if not ok then
    error("mermaid.lua: mmdc failed on " .. input .. "\n"
      .. "  Install it with `pnpm add -g @mermaid-js/mermaid-cli` (or npm install -g).\n"
      .. "  " .. tostring(err))
  end
  passes = passes + 1
end

--- Write a copy of the theme with `fontSize` overridden, and return its path.
--- @param html_labels boolean  false for SVG — see SVG_HTML_LABELS.
local function config_at(stem, px, html_labels)
  theme.themeVariables.fontSize = string.format("%.2fpx", px)
  theme.htmlLabels = html_labels
  theme.flowchart.htmlLabels = html_labels
  local path = stem .. ".json"
  write_file(path, pandoc.json.encode(theme))
  return path
end

--- Take the generated `@font-face` rules back out of a finished SVG.
---
--- mmdc injects FONT_CSS into the page it renders, which is how Chromium lays the labels
--- out in the book's own sans rather than in Helvetica — and it then copies that CSS into
--- the SVG's own `<style>` element, absolute `file://` paths and all. epubcheck rejects
--- those (RSC-030, "File URLs are not allowed in EPUB") and flags the figure as needing
--- the `remote-resources` property on top (OPF-014).
---
--- Stripping them loses nothing a reader would see. An SVG referenced by `<img>` is
--- sandboxed by every engine that renders one: it may not fetch an external font at all,
--- so those four rules were already dead on arrival in an e-reader. The `font-family`
--- declarations stay, so the labels are set in the reading system's own sans — and
--- because html labels are off, each one is positioned by an explicit coordinate rather
--- than by a measured box, so a different sans moves the glyphs and not the layout.
local function strip_font_faces(path)
  local body = read_file(path)
  if not body then return end
  write_file(path, (body:gsub("@font%-face%s*%b{}%s*", "")))
end

--- Render `source` to `<hash>.<ext>` under the cache, and return the path.
--- A cache hit does no work; a miss renders, measures, and renders again at the size
--- that puts the labels where the design asked for them.
local function render(source, ext)
  prepare()

  -- The geometry is in the key because it is what the font size was solved against. Move
  -- a margin and every cached figure is fitted to a measure the book no longer has.
  local key_parts = {
    source, theme_source,
    string.format("%.3f|%.3f|%.3f", page.width_pt, page.height_pt, page.label_pt),
  }
  -- Appended for SVG only, so that the two formats' caches move independently: the PDFs
  -- are the expensive half and nothing about them has changed since #82.
  if ext ~= "pdf" then
    key_parts[#key_parts + 1] = "svg/" .. SVG_VARIANT
  end
  local stem = CACHE_DIR .. "/" .. pandoc.utils.sha1(table.concat(key_parts, "\0"))
  local out = stem .. "." .. ext

  if exists(out) then
    cached = cached + 1
    return out
  end

  -- The .mmd is written next to its output and kept. It costs nothing, and it is the
  -- only way to answer "which fence produced this figure" from the cache alone.
  write_file(stem .. ".mmd", source .. "\n")

  -- Only print is fitted. An EPUB reader scales a diagram to its own screen and lets the
  -- reader pinch it, so there is no fixed measure to solve against; and an SVG has no
  -- page box to measure in the first place. One render at the probe size is the answer.
  if ext ~= "pdf" then
    run_mmdc(stem .. ".mmd", out, config_at(stem, probe_px, SVG_HTML_LABELS))
    strip_font_faces(out)
    rendered = rendered + 1
    return out
  end

  -- Fit by measurement rather than by formula. Growing the type does widen a diagram
  -- a little — a longer label wraps onto a second line, a node gets wider before it
  -- wraps — so `target ÷ shrink` computed from the probe overshoots the shrink and lands
  -- short. Each pass measures what it actually got and corrects from there, which
  -- converges in two or three because the error is small and in a consistent direction.
  local px, got = probe_px, nil
  for _ = 1, MAX_PASSES do
    run_mmdc(stem .. ".mmd", out, config_at(stem, px, true))
    local w, h = page_box(out)
    if not w then break end

    got = px * PX_TO_PT * fit_scale(w, h)
    if math.abs(got - page.label_pt) <= TOLERANCE_PT then break end

    local next_px = math.max(MIN_PX, math.min(MAX_PX, px * page.label_pt / got))
    -- No movement left: either the correction has converged, or it has run into a clamp,
    -- which is the honest answer for a diagram too wide to be set at the target size.
    if math.abs(next_px - px) < 0.25 then break end
    px = next_px
  end

  if got then achieved[#achieved + 1] = got end
  rendered = rendered + 1
  return out
end

-- ---------------------------------------------------------------------------
-- The filter
-- ---------------------------------------------------------------------------

local function is_mermaid(block)
  for _, class in ipairs(block.classes) do
    if class == "mermaid" then return true end
  end
  return false
end

function CodeBlock(block)
  if not is_mermaid(block) then return nil end

  if FORMAT:match("latex") then
    return pandoc.RawBlock("latex", "\\bookdiagram{" .. render(block.text, "pdf") .. "}")
  end

  if FORMAT:match("epub") then
    -- Wrapped in a Para rather than returned bare: an Image is an inline, and an EPUB
    -- reader needs it in a block to give it a line of its own.
    return pandoc.Para({
      pandoc.Image({}, render(block.text, "svg"), "", pandoc.Attr("", { "diagram" })),
    })
  end

  -- Every other writer keeps the fence. The companion site renders Mermaid in the
  -- browser, where it stays selectable and scales with the reader's zoom; replacing it
  -- with an image there would be a downgrade.
  return nil
end

--- The report is the calibration evidence #77 needs, and the only place the achieved
--- label size is visible without measuring a printed page.
function Pandoc(doc)
  if rendered + cached == 0 then return doc end

  local line = string.format("  ▸ %d diagram(s): %d rendered in %d pass(es), %d from cache",
    rendered + cached, rendered, passes, cached)
  if #achieved > 0 then
    local lo, hi, sum = math.huge, 0, 0
    for _, pt in ipairs(achieved) do
      lo, hi, sum = math.min(lo, pt), math.max(hi, pt), sum + pt
    end
    line = line .. string.format(" · labels %.1f–%.1fpt, mean %.1fpt (target %.1fpt)",
      lo, hi, sum / #achieved, page.label_pt)
  end
  io.stderr:write(line .. "\n")
  return doc
end
