--[[
  callouts.lua — improvement #81

  The **print** back-end for the Book Chapter Standard's block vocabulary. What counts as
  a callout lives in scripts/lua/callout-shapes.lua, shared with the EPUB since #83; this
  file is only what print does with the answer.

  It exists so that **no chapter had to change to get a design**: the standard already
  fixes the vocabulary — `## 💡 The Core Idea`, `## 🔑 Key Takeaways`, `> ⚠️ …`,
  `**In this chapter:**`, a bold label above a fence — and those shapes are what the
  shared module reads.

  It runs for the PDF only. The web renders the emoji and the blockquote correctly on its
  own; the EPUB gets the same structure from epub-blocks.lua and scripts/epub.css.

  What it does:

    kind core-idea      → bookcoreidea
    kind key-takeaways  → bookkeytakeaways, which prints its own label
    kind deck           → bookdeck
    kind gotcha         → bookgotcha, labelled MOVING TARGET where the chapter said so
    kind pull-quote     → bookpullquote
    kind note           → booknote
    Para **In this chapter:** … → bookpill
    Para **Label:** before a fence → \bookcodelabel
    Table               → longtblr, or tblr where a page-breaking table cannot go

  Two passes, returned as a list. The first is the shared module's `group`, which has to
  see whole block lists in document order because a heading callout owns the blocks that
  follow it. The second rewrites everything else, and it descends by hand: a callout is
  emitted together with its own contents and the traversal is stopped there, so that the
  filter always knows whether the table it is looking at is inside a box. That matters —
  a `longtblr` breaks across pages and a tcolorbox cannot hold one, so a table inside a
  callout has to be a `tblr`. Tracking that with a flag and pandoc's own traversal order
  is the version that works until somebody nests a blockquote, which the manuscript does.
]]

local shapes = require("scripts.lua.callout-shapes")

local WS = shapes.WS

-- The environment each format-neutral kind is set in. The two heading callouts print a
-- label; the deck, the pull quote and the note are told apart by their own type.
local ENV = {
  ["core-idea"] = { env = "bookcoreidea", label = true },
  ["key-takeaways"] = { env = "bookkeytakeaways", label = false },
  ["deck"] = { env = "bookdeck", label = false },
  ["gotcha"] = { env = "bookgotcha", label = true },
  ["pull-quote"] = { env = "bookpullquote", label = false },
  ["note"] = { env = "booknote", label = false },
}

-- The gotcha takes its label as a tcolorbox argument; the core idea prints it as the
-- first thing inside the box. `bookkeytakeaways` sets its own from blocks.tex, because
-- two rules on their own do not say what they are for.
local LABEL_AS_ARGUMENT = { gotcha = true }

local function raw(s)
  return pandoc.RawBlock("latex", s)
end

-- ---------------------------------------------------------------------------
-- Inline code — where a code span is allowed to break
-- ---------------------------------------------------------------------------
--
-- Improvement #77, and the whole of it: every overfull box in the book wider than 20pt
-- was one long `\texttt{}`. Pandoc writes a code span as a single rigid run — the spaces
-- in it come out as `\ `, which does not break — and a rigid 88pt run does not fit the
-- 53pt first column of a three-column table however the type is tuned.
--
-- The alternative fixes were all worse. Shrinking the code face makes 1,161 fences less
-- legible to rescue 918 tables. Widening the narrow columns means overriding the weights
-- the author aligned the source to. Breaking anywhere, the way the fences do, is right
-- for a fence and wrong here: a fence is already a block on its own ground, and a break
-- mid-identifier in running prose reads as a typo.
--
-- So the breaks are offered where a reader already parses a symbol — and offered, not
-- taken: \bookcodebrk is a bare penalty, so a span that fits still sets in one piece.
--
-- 🔴 Applied to the **escaped** LaTeX rather than to the code text, on purpose. Writing
-- a second escaper for `\texttt` means owning pandoc's table of some twenty sequences and
-- being wrong about one of them in one of 7,301 spans. Every pattern below is checked
-- against the escapes pandoc actually emits: none of `\textless{}`, `\textgreater{}`,
-- `\textbackslash{}`, `\textquotesingle{}`, `\textasciitilde{}` or `\_` contains a
-- character this matches, and none contains a lowercase letter followed by an uppercase
-- one, so no rule below can land inside one.
local BRK = "\\bookcodebrk{}"

-- The same thing, but costlier — see \bookcodebrkany in blocks.tex. Offered between
-- every pair of characters, and only inside a table cell, where a column can be 30pt wide
-- and there is no structural break in `secrets:\ inherit` narrow enough to fit it. The
-- higher penalty is what keeps it a fallback: TeX takes a break after a dot or a
-- camelCase boundary in preference, and comes here only when none of them is enough.
local BRK_ANY = "\\bookcodebrkany{}"

--- The characters a break may follow. Path separators and dots for module paths, colons
--- and commas for type arguments, `@` for a version pin, brackets for a generic's tail,
--- and the pipe that separates the branches of a regular expression.
local AFTER = "[/%.:,=@%)%]>+]"

local function breakable(latex)
  return (latex
    -- after an interword space, which is the nicest break in a span that has one
    :gsub("\\ ", "\\ " .. BRK)
    -- after a hyphen, which pandoc writes as `{-}` to keep it out of a ligature
    :gsub("{%-}", "{-}" .. BRK)
    -- after an escaped underscore, the other word separator in an identifier
    :gsub("\\_", "\\_" .. BRK)
    -- after `<` and `>`, which close a generic and open the next, and after the `|` a
    -- regular expression separates its branches with
    :gsub("(\\textless{})", "%1" .. BRK)
    :gsub("(\\textgreater{})", "%1" .. BRK)
    :gsub("(\\textbar{})", "%1" .. BRK)
    -- after the plain punctuation a symbol is already read in pieces at. The second
    -- capture is what keeps the break out of pandoc's `{[}` and `{]}` groups: a bracket
    -- there is followed by the closing brace, and a penalty inside the group would be a
    -- break offered in the one place it cannot be taken.
    :gsub("(" .. AFTER .. ")([^}])", "%1" .. BRK .. "%2")
    -- and after a bare hyphen, which is how pandoc writes one that cannot form a dash —
    -- `Feature-Policy`, `X-XSS-Protection`. Matched only after a word character, so it
    -- cannot fire a second time inside the `{-}` the rule above has already handled.
    :gsub("(%w%-)", "%1" .. BRK)
    -- and at each camelCase boundary, which is the only break a long bare identifier has
    :gsub("(%l)(%u)", "%1" .. BRK .. "%2")
    -- A break offered immediately before a space would put that space at the head of the
    -- next line. The one after it does the same job and looks like a line break should.
    :gsub(BRK .. "(\\ )", "%1")
    -- And a break at the very end of the span is a break at a space that already exists.
    :gsub(BRK .. "}$", "}"))
end

--- Escaped LaTeX, split into pieces that must not be broken apart: a control sequence
--- with its empty argument (`\\textless{}`), a one-character escape (`\\_`), pandoc's
--- braced hyphen (`{-}`), or a single UTF-8 character. Splitting on bytes instead would
--- put a line break inside a multi-byte character, which is a corrupted glyph rather than
--- an ugly one — and there are enough arrows and ticks in this book's tables to find it.
local function tex_tokens(latex)
  local out, i = {}, 1
  while i <= #latex do
    local s, e = latex:find("^\\%a+{}", i)
    -- Pandoc braces more than the hyphen: `[` and `]` come out as `{[}` and `{]}` so
    -- they cannot be read as an optional argument. Any bare brace group in this string is
    -- pandoc's own — a literal brace in the code is escaped as `\{` and caught above — so
    -- matching balanced braces keeps every one of them whole. Splitting `{[}` into three
    -- tokens put penalties *inside* the group, which is not wrong on the page and is the
    -- kind of nearly-wrong that becomes wrong the first time the group takes an argument.
    if not s then s, e = latex:find("^%b{}", i) end
    if not s then s, e = latex:find("^\\.", i) end
    if not s then s, e = latex:find("^" .. utf8.charpattern, i) end
    if not s then s, e = i, i end
    out[#out + 1] = latex:sub(s, e)
    i = e + 1
  end
  return out
end

--- Everything `breakable` offers, plus a costlier break between every other pair of
--- characters. Used in table cells only.
local function breakable_anywhere(latex)
  local inner = latex:match("^\\texttt{(.*)}$")
  -- Anything that is not the `\texttt{…}` pandoc has emitted for every code span in this
  -- manuscript is left exactly as it came, rather than guessed at.
  if not inner then return breakable(latex) end
  return breakable("\\texttt{" .. table.concat(tex_tokens(inner), BRK_ANY) .. "}")
end

--- A code span, with somewhere to break. Pandoc does the escaping; this only adds
--- penalties to the result, and returns it raw so nothing escapes it twice.
--- @param widen fun(string): string  which set of break points to offer.
local function code_inline(widen)
  return function(code)
    local latex = pandoc.write(pandoc.Pandoc({ pandoc.Plain({ code }) }), "latex",
      { wrap_text = "none" })
    latex = latex:gsub("^" .. WS .. "+", ""):gsub(WS .. "+$", "")
    return pandoc.RawInline("latex", widen(latex))
  end
end

--- Every inline in the book passes through one of these on its way to LaTeX, whether it
--- is written by the traversal below or by a table cell, which `pandoc.write`s directly
--- and so never sees a filter.
local CODE_FILTER = { Code = code_inline(breakable) }

--- Render inlines to LaTeX source on one line.
local function inline_latex(inlines)
  local s = pandoc.write(pandoc.Pandoc({ pandoc.Plain(inlines:walk(CODE_FILTER)) }),
    "latex", { wrap_text = "none" })
  return (s:gsub("^" .. WS .. "+", ""):gsub(WS .. "+$", ""))
end

local function wrap(env, blocks, arg)
  local out = pandoc.Blocks({ raw("\\begin{" .. env .. "}" .. (arg and ("[" .. arg .. "]") or "")) })
  out:extend(blocks)
  out:insert(raw("\\end{" .. env .. "}"))
  return out
end

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
--
-- Rewritten to tabularray rather than restyled in place, because the header band is the
-- one part of the design longtable cannot be talked into: pandoc wraps each header cell
-- in its own minipage, and there is no row left for a band to sit behind.
--
-- Every table in the manuscript is a pipe table — one header row, no spans — so this
-- handles that shape. Column weights come from pandoc's own widths where it computed
-- them, which for a pipe table means the proportions the author aligned the source to.

local ALIGN = {
  AlignLeft = "l",
  AlignRight = "r",
  AlignCenter = "c",
  AlignDefault = "l",
}

--- A break after a solidus in ordinary cell text — not code, prose.
---
--- "Component/integration" is one word to TeX: there is no glue in it, so it cannot break,
--- and hyphenation only ever starts at the beginning of a word, so "integration" cannot be
--- hyphenated either. At 9pt that is 105pt of unbreakable type in a 67pt column. Offering
--- a break after the solidus is enough, and it is where a reader already reads a pause.
---
--- Done on the syntax tree rather than on the rendered LaTeX so it can only ever touch
--- text: a `/` inside an `\href` target would otherwise be split and the link broken.
local function break_solidus(str)
  if not str.text:find("%a/%a") then return nil end
  local out = pandoc.Inlines({})
  local first = true
  for piece in (str.text .. "/"):gmatch("([^/]*)/") do
    -- The solidus belongs to the piece before it, and the break goes after both, so a
    -- wrapped cell reads "Component/" and then "integration" rather than losing the mark.
    if not first then
      out:insert(pandoc.Str("/"))
      out:insert(pandoc.RawInline("latex", "\\bookcodebrk{}"))
    end
    first = false
    if piece ~= "" then out:insert(pandoc.Str(piece)) end
  end
  return out
end

local CELL_FILTER = { Code = code_inline(breakable_anywhere), Str = break_solidus }

local function cell_latex(cell)
  local s = pandoc.write(pandoc.Pandoc(cell.contents:walk(CELL_FILTER)), "latex",
    { wrap_text = "none" })
  -- A cell is one paragraph. The writer still ends it with a newline, and a blank line
  -- inside a tblr cell would start a paragraph in a box that has no width for one.
  return (s:gsub(WS .. "+$", ""):gsub("\n\n+", "\\newline "):gsub("\n", " "))
end

local function row_latex(row)
  local cells = {}
  for _, cell in ipairs(row.cells) do
    table.insert(cells, cell_latex(cell))
  end
  return table.concat(cells, " & ") .. " \\\\"
end

--- The narrowest a column may be, as a fraction of an equal share of the table.
---
--- 🔴 Improvement #77, and it is a fix rather than a preference. Pandoc computes a pipe
--- table's column widths from **how wide the columns are written in the markdown**, so a
--- table whose header row opens on an empty cell — `| | Reusable workflow | Composite
--- action |`, a shape this book uses for a label column — hands back a width of 1%. At
--- the book's measure that is a **4pt column**, and 102 of the 918 tables had one: every
--- label in them, "Own runner", "Called at", was set in a column narrower than a single
--- character and spilled over its neighbour. It printed that way and nobody had read
--- 1,690 pages to notice.
---
--- Two thirds of an equal share is the floor, arrived at by measurement rather than by
--- taste: at a half, a six-column table still gave its narrowest column 31pt, and "Simulated"
--- does not fit 31pt at 9pt sans even hyphenated — English will not break a word closer
--- than three letters from its end, so the best TeX can offer is "Sim-ulated" and
--- "ulated" is 33pt. Two thirds buys that column 45pt and the last overfull box in the
--- book goes with it. Columns already above the floor keep their proportions to each
--- other, so the tables the author did align by hand are untouched.
local MIN_COLUMN_SHARE = 0.65

--- @param long boolean  false inside a callout, where a page-breaking table cannot go.
local function render_table(tbl, long)
  local weights = {}
  local total = 0
  for _, col in ipairs(tbl.colspecs) do
    local width = col[2]
    -- 0 means pandoc computed nothing — the table was written without aligned columns —
    -- and equal weights are the honest answer rather than a guess.
    local weight = (type(width) == "number" and width > 0) and width * 100 or 0
    weights[#weights + 1] = weight
    total = total + weight
  end

  local floor = total > 0 and (MIN_COLUMN_SHARE * total / #weights) or 0

  local colspec = {}
  for i, col in ipairs(tbl.colspecs) do
    local weight = math.max(1, math.floor(math.max(weights[i], floor) + 0.5))
    table.insert(colspec, "X[" .. weight .. "," .. (ALIGN[col[1]] or "l") .. "]")
  end

  local env = long and "longtblr" or "tblr"
  local lines = { "\\begin{" .. env .. "}{colspec={" .. table.concat(colspec) .. "},"
    .. (long and "rowhead=1," or "") .. "}" }

  for _, row in ipairs(tbl.head.rows) do table.insert(lines, row_latex(row)) end
  for _, body in ipairs(tbl.bodies) do
    for _, row in ipairs(body.head) do table.insert(lines, row_latex(row)) end
    for _, row in ipairs(body.body) do table.insert(lines, row_latex(row)) end
  end
  for _, row in ipairs(tbl.foot.rows) do table.insert(lines, row_latex(row)) end
  table.insert(lines, "\\end{" .. env .. "}")

  local out = pandoc.Blocks({})
  -- No table in the manuscript carries a pandoc caption today; dropping one silently if
  -- somebody adds it would be the kind of loss nobody notices until it is printed.
  local caption = shapes.text_of(tbl.caption.long)
  if caption ~= "" then
    out:insert(raw("\\bookcodelabel{" .. inline_latex(pandoc.Inlines({ pandoc.Str(caption) })) .. "}"))
  end
  out:insert(raw(table.concat(lines, "\n")))
  return out
end

-- ---------------------------------------------------------------------------
-- The traversal
-- ---------------------------------------------------------------------------
--
-- Built per nesting level rather than written once, because `long` has to be false for
-- everything inside a callout and there is no reliable way to ask pandoc mid-traversal
-- whether it is inside one. A callout handler renders its own contents with a filter
-- built for the inside, then returns `false` so the traversal does not enter them twice.

local build

local function code_label(inlines)
  return raw("\\bookcodelabel{" .. inline_latex(inlines) .. "}")
end

local function pill(para)
  local rest = shapes.pill_rest(para)
  if not rest then return nil end
  return raw("\\begin{bookpill}\\bookpilllabel{" .. shapes.PILL_LABEL .. "}"
    .. inline_latex(rest) .. "\\end{bookpill}")
end

--- @param long boolean  true at the top level, false inside any callout.
build = function(long)
  return {
    traverse = "topdown",
    Blocks = function(blocks) return shapes.promote_code_labels(blocks, code_label) end,
    Para = pill,
    Code = code_inline(breakable),

    Table = function(tbl) return render_table(tbl, long) end,

    --- Emitted by pass 1: the two heading-shaped callouts and the deck.
    Div = function(div)
      if not div.classes:includes(shapes.DIV_CLASS) then return nil end
      local spec = ENV[div.attributes.kind]
      if not spec then return nil end

      local inner = div.content:walk(build(false))
      local label = spec.label and div.attributes.label ~= "" and div.attributes.label or nil
      if label and not LABEL_AS_ARGUMENT[div.attributes.kind] then
        inner:insert(1, raw("\\bookcalloutlabel{" .. label .. "}"))
        label = nil
      end
      return wrap(spec.env, inner, label), false
    end,

    BlockQuote = function(bq)
      local kind, content, label = shapes.blockquote_kind(bq)
      local spec = ENV[kind]
      local arg = spec.label and label or nil
      return wrap(spec.env, content:walk(build(false)), arg), false
    end,
  }
end

return {
  { Pandoc = function(doc)
      doc.blocks = shapes.group(doc.blocks)
      return doc
    end },
  build(true),
}
