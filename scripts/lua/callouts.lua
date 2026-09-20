--[[
  callouts.lua — improvement #81

  Maps the Book Chapter Standard's own markdown shapes onto the print block library in
  scripts/tex/blocks.tex. It exists so that **no chapter had to change to get a design**:
  the standard already fixes the vocabulary — `## 💡 The Core Idea`, `## 🔑 Key
  Takeaways`, `> ⚠️ …`, `**In this chapter:**`, a bold label above a fence — and those
  shapes are what this filter reads.

  It runs for the PDF only. The web and the EPUB render the emoji and the blockquote
  correctly on their own; print is the format where a design carried in hue collapses.

  What it does:

    Header  💡 …        → the section and everything under it, in a bookcoreidea box
    Header  🔑 …        → the same, in bookkeytakeaways
    BlockQuote under a chapter title → bookdeck
    BlockQuote ⚠️ …     → bookgotcha, labelled MOVING TARGET where the chapter said so
    BlockQuote          → bookpullquote if it is a lifted line, else booknote
    Para **In this chapter:** … → bookpill
    Para **Label:** before a fence → \bookcodelabel
    Table               → longtblr, or tblr where a page-breaking table cannot go

  Two passes, returned as a list. The first has to see whole block lists in document
  order, because a heading callout owns the blocks that follow it. The second rewrites
  everything else, and it descends by hand: a callout is emitted together with its own
  contents and the traversal is stopped there, so that the filter always knows whether
  the table it is looking at is inside a box. That matters — a `longtblr` breaks across
  pages and a tcolorbox cannot hold one, so a table inside a callout has to be a `tblr`.
  Tracking that with a flag and pandoc's own traversal order is the version that works
  until somebody nests a blockquote, which the manuscript does.
]]

local PILL_LABEL = "In this chapter"

-- A blockquote shorter than this, and only one paragraph long, is a line lifted out of
-- the prose and gets the centred pull quote. Anything longer is a note, and a centred
-- three-line note in italic reads as a typesetting fault rather than as emphasis.
local PULLQUOTE_MAX = 140

local CORE_IDEA = "\u{1F4A1}"
local KEY_TAKEAWAYS = "\u{1F511}"
local WARNING = "\u{26A0}"
local VARIATION_SELECTOR = "\u{FE0F}"

-- Lua patterns are bytes, and `%s` asks the C library whether a byte is whitespace.
-- In a UTF-8 string that is a trap with teeth: 0xA0 is the third byte of `†`, and in the
-- locale pandoc runs under `isspace(0xA0)` is true, so `%s+$` eats it and leaves two
-- orphaned bytes that come out of the writer as replacement characters. It printed as a
-- hole in the DSA complexity table and nowhere else, which is how it nearly shipped.
-- Every trim in this file names its bytes instead.
local WS = "[ \t\r\n]"

local function raw(s)
  return pandoc.RawBlock("latex", s)
end

local function text_of(inlines)
  return pandoc.utils.stringify(inlines)
end

--- Render inlines to LaTeX source on one line.
local function inline_latex(inlines)
  local s = pandoc.write(pandoc.Pandoc({ pandoc.Plain(inlines) }), "latex",
    { wrap_text = "none" })
  return (s:gsub("^" .. WS .. "+", ""):gsub(WS .. "+$", ""))
end

--- Drop a leading callout mark and the variation selector that trails it in the source.
--- Done by exact prefix rather than by a character class: Lua patterns are byte-based,
--- and a class holding the bytes of ⚠️ also holds the first byte of an em dash.
local function strip_mark(inlines)
  local out = {}
  local dropping = true
  for _, il in ipairs(inlines) do
    if dropping and il.t == "Str" then
      local s = il.text
      for _, mark in ipairs({ WARNING, CORE_IDEA, KEY_TAKEAWAYS, VARIATION_SELECTOR }) do
        while s:sub(1, #mark) == mark do s = s:sub(#mark + 1) end
      end
      s = s:gsub("^" .. WS .. "+", "")
      if s ~= "" then
        dropping = false
        table.insert(out, pandoc.Str(s))
      end
    elseif dropping and (il.t == "Space" or il.t == "SoftBreak") then
      -- swallow the space the mark left behind
    else
      dropping = false
      table.insert(out, il)
    end
  end
  return pandoc.Inlines(out)
end

local function wrap(env, blocks, arg)
  local out = pandoc.Blocks({ raw("\\begin{" .. env .. "}" .. (arg and ("[" .. arg .. "]") or "")) })
  out:extend(blocks)
  out:insert(raw("\\end{" .. env .. "}"))
  return out
end

-- ---------------------------------------------------------------------------
-- Pass 1 — the deck, and the two heading-shaped callouts
-- ---------------------------------------------------------------------------

--- The one-sentence promise under a chapter title is a blockquote like any other; the
--- only thing that tells it apart is that it sits directly under the level-2 heading
--- `collect-chapters.ts` leaves a chapter title at. Matched here, before the blockquote
--- handler in pass 2 can claim it as a pull quote.
local function callout_div(env, blocks, label)
  local attr = pandoc.Attr("", { "bookcallout" }, { env = env, label = label or "" })
  return pandoc.Div(blocks, attr)
end

local function mark_decks(blocks)
  local out = pandoc.Blocks({})
  local after_chapter = false
  for _, block in ipairs(blocks) do
    if after_chapter and block.t == "BlockQuote" then
      out:insert(callout_div("bookdeck", block.content))
      after_chapter = false
    else
      after_chapter = (block.t == "Header" and block.level == 2)
      out:insert(block)
    end
  end
  return out
end

local MARKS = {
  { mark = CORE_IDEA, env = "bookcoreidea", label = "The Core Idea" },
  -- The takeaways block prints its own label from blocks.tex: two rules on their own do
  -- not say what they are for.
  { mark = KEY_TAKEAWAYS, env = "bookkeytakeaways", label = nil },
}

local function callout_for(block)
  if block.t ~= "Header" then return nil end
  local text = text_of(block.content)
  for _, spec in ipairs(MARKS) do
    if text:sub(1, #spec.mark) == spec.mark then return spec end
  end
  return nil
end

--- A heading callout owns its section — everything down to the next heading at the same
--- level or above. The heading itself is consumed, because the block carries the label
--- and printing both would say it twice. Neither heading reaches the table of contents
--- (`--toc-depth=2` stops at the chapter), so nothing is lost by removing them.
local function group_callouts(blocks)
  local out = pandoc.Blocks({})
  local i = 1
  while i <= #blocks do
    local block = blocks[i]
    local spec = callout_for(block)
    if spec then
      local body = pandoc.Blocks({})
      local j = i + 1
      while j <= #blocks do
        local b = blocks[j]
        if b.t == "Header" and b.level <= block.level then break end
        body:insert(b)
        j = j + 1
      end
      if spec.label then
        body:insert(1, raw("\\bookcalloutlabel{" .. spec.label .. "}"))
      end
      out:insert(callout_div(spec.env, body))
      i = j
    else
      out:insert(block)
      i = i + 1
    end
  end
  return out
end

-- ---------------------------------------------------------------------------
-- Pass 2 — tables
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

local function cell_latex(cell)
  local s = pandoc.write(pandoc.Pandoc(cell.contents), "latex", { wrap_text = "none" })
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

--- @param long boolean  false inside a callout, where a page-breaking table cannot go.
local function render_table(tbl, long)
  local colspec = {}
  for _, col in ipairs(tbl.colspecs) do
    local width = col[2]
    local weight = 1
    if type(width) == "number" and width > 0 then
      weight = math.max(1, math.floor(width * 100 + 0.5))
    end
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
  local caption = text_of(tbl.caption.long)
  if caption ~= "" then
    out:insert(raw("\\bookcodelabel{" .. inline_latex(pandoc.Inlines({ pandoc.Str(caption) })) .. "}"))
  end
  out:insert(raw(table.concat(lines, "\n")))
  return out
end

-- ---------------------------------------------------------------------------
-- Pass 2 — blockquotes, the pill, and the code label
-- ---------------------------------------------------------------------------

--- Drop the leading bold run and the space after it. Used only where that run has been
--- lifted into the callout's label, so that "MOVING TARGET" is not immediately followed
--- by "Moving target:".
local function strip_leading_strong(inlines)
  local out = pandoc.Inlines({})
  local dropped = false
  for i, il in ipairs(inlines) do
    if i == 1 and il.t == "Strong" then
      dropped = true
    elseif dropped and #out == 0 and (il.t == "Space" or il.t == "SoftBreak") then
      -- swallow the space the run left behind
    else
      out:insert(il)
    end
  end
  return out
end

--- The bold run a gotcha opens with, when it is the standard's *moving target* callout.
--- Every other bold opener among the 277 gotchas is the callout's own first sentence —
--- "Never lazy-load the LCP image." — and uppercasing a sentence into a label reads it
--- as something it is not.
local function gotcha_label(inlines)
  for _, il in ipairs(inlines) do
    if il.t == "Strong" then
      local s = text_of(il.content):gsub("[%.: \t\r\n]+$", "")
      return (s:lower() == "moving target") and "Moving target" or "Gotcha"
    elseif il.t ~= "Space" and il.t ~= "SoftBreak" and il.t ~= "Str" then
      return "Gotcha"
    elseif il.t == "Str" then
      local rest = il.text
      for _, mark in ipairs({ WARNING, VARIATION_SELECTOR }) do
        while rest:sub(1, #mark) == mark do rest = rest:sub(#mark + 1) end
      end
      if rest ~= "" then return "Gotcha" end
    end
  end
  return "Gotcha"
end

local function is_gotcha(bq)
  local first = bq.content[1]
  if not first or (first.t ~= "Para" and first.t ~= "Plain") then return false end
  return text_of(first.content):sub(1, #WARNING) == WARNING
end

--- Is this paragraph nothing but one bold run — the shape the standard asks for above a
--- code fence? A trailing colon counts; a sentence with a bold word in it does not.
local function only_strong(para)
  local content = para.content
  local last = #content
  while last > 0 do
    local il = content[last]
    if il.t == "Space" or (il.t == "Str" and il.text:match("^:?$")) then
      last = last - 1
    else
      break
    end
  end
  if last ~= 1 or content[1].t ~= "Strong" then return nil end
  return content[1].content
end

-- ---------------------------------------------------------------------------
-- Pass 2 — the traversal
-- ---------------------------------------------------------------------------
--
-- Built per nesting level rather than written once, because `long` has to be false for
-- everything inside a callout and there is no reliable way to ask pandoc mid-traversal
-- whether it is inside one. A callout handler renders its own contents with a filter
-- built for the inside, then returns `false` so the traversal does not enter them twice.

local build

--- The pull quote, the note and the gotcha a blockquote becomes.
local function blockquote_spec(bq)
  if is_gotcha(bq) then
    local label = gotcha_label(bq.content[1].content)
    local content = bq.content:clone()
    content[1].content = strip_mark(content[1].content)
    if label == "Moving target" then
      content[1].content = strip_leading_strong(content[1].content)
    end
    return "bookgotcha", content, label
  end
  if #bq.content == 1 and #text_of(bq.content) <= PULLQUOTE_MAX then
    return "bookpullquote", bq.content, nil
  end
  return "booknote", bq.content, nil
end

--- The code label needs its sibling to decide, so it is matched on the block list rather
--- than on the paragraph: a lone bold line that is not followed by a fence is a
--- sub-heading in prose and stays one.
local function promote_code_labels(blocks)
  local out = pandoc.Blocks({})
  local changed = false
  for i, block in ipairs(blocks) do
    local label = block.t == "Para" and only_strong(block) or nil
    if label and blocks[i + 1] and blocks[i + 1].t == "CodeBlock" then
      out:insert(raw("\\bookcodelabel{" .. inline_latex(label) .. "}"))
      changed = true
    else
      out:insert(block)
    end
  end
  if changed then return out end
end

local function pill(para)
  local first = para.content[1]
  if not (first and first.t == "Strong"
      and text_of(first.content):gsub("[: \t\r\n]+$", "") == PILL_LABEL) then
    return nil
  end
  local rest = pandoc.Inlines({})
  for k = 2, #para.content do rest:insert(para.content[k]) end
  return raw("\\begin{bookpill}\\bookpilllabel{" .. PILL_LABEL .. "}"
    .. inline_latex(rest) .. "\\end{bookpill}")
end

--- @param long boolean  true at the top level, false inside any callout.
build = function(long)
  return {
    traverse = "topdown",
    Blocks = promote_code_labels,
    Para = pill,

    Table = function(tbl) return render_table(tbl, long) end,

    --- Emitted by pass 1: the two heading-shaped callouts and the deck.
    Div = function(div)
      if not div.classes:includes("bookcallout") then return nil end
      local inner = div.content:walk(build(false))
      local label = div.attributes.label
      return wrap(div.attributes.env, inner, label ~= "" and label or nil), false
    end,

    BlockQuote = function(bq)
      local env, content, label = blockquote_spec(bq)
      return wrap(env, content:walk(build(false)), label), false
    end,
  }
end

return {
  { Pandoc = function(doc)
      doc.blocks = group_callouts(mark_decks(doc.blocks))
      return doc
    end },
  build(true),
}
