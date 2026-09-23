--[[
  callout-shapes.lua — improvement #83

  What the Book Chapter Standard's block vocabulary *is*, with no opinion about what to
  do with it. `## 💡 …` is a core idea; `> ⚠️ …` is a gotcha; a blockquote directly under
  a chapter title is a deck; a lone bold line above a fence is a code label.

  Extracted from callouts.lua at #83, when the EPUB needed the same answers in order to
  carry the same block library in CSS. Two filters reading the manuscript for the same
  shapes is one filter too many: the print and screen designs may differ, but **what
  counts as a gotcha must not**, or a callout silently becomes a paragraph in one format
  and not the other. This is the same reason `scripts/lib/book.ts` is shared between the
  build and the lint.

  Everything here is format-neutral. It names a shape with a `kind` string and hands back
  its contents; `callouts.lua` turns those into tcolorbox environments and
  `epub-blocks.lua` turns them into divs with classes. Nothing in this file emits LaTeX,
  HTML, or so much as a class name.

  Loaded as `require("scripts.lua.callout-shapes")`, which pandoc resolves against the
  working directory. That is why `build-book.sh` must `cd` to the repository root — the
  same reason `scripts/book-pdf.yaml`'s relative paths need it.
]]

local M = {}

-- Lua patterns are bytes, and `%s` asks the C library whether a byte is whitespace.
-- In a UTF-8 string that is a trap with teeth: 0xA0 is the third byte of `†`, and in the
-- locale pandoc runs under `isspace(0xA0)` is true, so `%s+$` eats it and leaves two
-- orphaned bytes that come out of the writer as replacement characters. It printed as a
-- hole in the DSA complexity table and nowhere else, which is how it nearly shipped.
-- Every trim in this file names its bytes instead.
M.WS = "[ \t\r\n]"
local WS = M.WS

M.PILL_LABEL = "In this chapter"

-- A blockquote shorter than this, and only one paragraph long, is a line lifted out of
-- the prose and gets the pull quote. Anything longer is a note, and a centred three-line
-- note in italic reads as a typesetting fault rather than as emphasis.
M.PULLQUOTE_MAX = 140

M.CORE_IDEA = "\u{1F4A1}"
M.KEY_TAKEAWAYS = "\u{1F511}"
M.WARNING = "\u{26A0}"
M.VARIATION_SELECTOR = "\u{FE0F}"

--- The class the two passes hand between each other. Pass 1 has to see whole block lists
--- in document order, because a heading callout owns the blocks that follow it; the
--- format-specific filter then picks these up in its own traversal.
M.DIV_CLASS = "bookcallout"

function M.text_of(inlines)
  return pandoc.utils.stringify(inlines)
end

--- Drop a leading callout mark and the variation selector that trails it in the source.
--- Done by exact prefix rather than by a character class: Lua patterns are byte-based,
--- and a class holding the bytes of ⚠️ also holds the first byte of an em dash.
function M.strip_mark(inlines)
  local out = {}
  local dropping = true
  for _, il in ipairs(inlines) do
    if dropping and il.t == "Str" then
      local s = il.text
      for _, mark in ipairs({ M.WARNING, M.CORE_IDEA, M.KEY_TAKEAWAYS, M.VARIATION_SELECTOR }) do
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

--- Drop the leading bold run and the space after it. Used only where that run has been
--- lifted into the callout's label, so that "MOVING TARGET" is not immediately followed
--- by "Moving target:".
function M.strip_leading_strong(inlines)
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

-- ---------------------------------------------------------------------------
-- Gotchas
-- ---------------------------------------------------------------------------

--- The bold run a gotcha opens with, when it is the standard's *moving target* callout.
--- Every other bold opener among the 277 gotchas is the callout's own first sentence —
--- "Never lazy-load the LCP image." — and uppercasing a sentence into a label reads it
--- as something it is not.
function M.gotcha_label(inlines)
  for _, il in ipairs(inlines) do
    if il.t == "Strong" then
      local s = M.text_of(il.content):gsub("[%.: \t\r\n]+$", "")
      return (s:lower() == "moving target") and "Moving target" or "Gotcha"
    elseif il.t ~= "Space" and il.t ~= "SoftBreak" and il.t ~= "Str" then
      return "Gotcha"
    elseif il.t == "Str" then
      local rest = il.text
      for _, mark in ipairs({ M.WARNING, M.VARIATION_SELECTOR }) do
        while rest:sub(1, #mark) == mark do rest = rest:sub(#mark + 1) end
      end
      if rest ~= "" then return "Gotcha" end
    end
  end
  return "Gotcha"
end

function M.is_gotcha(bq)
  local first = bq.content[1]
  if not first or (first.t ~= "Para" and first.t ~= "Plain") then return false end
  return M.text_of(first.content):sub(1, #M.WARNING) == M.WARNING
end

--- What a blockquote is, and the contents it should be built from.
--- @return string kind   "gotcha" | "pull-quote" | "note"
--- @return Blocks content
--- @return string|nil label
function M.blockquote_kind(bq)
  if M.is_gotcha(bq) then
    local label = M.gotcha_label(bq.content[1].content)
    local content = bq.content:clone()
    content[1].content = M.strip_mark(content[1].content)
    if label == "Moving target" then
      content[1].content = M.strip_leading_strong(content[1].content)
    end
    return "gotcha", content, label
  end
  if #bq.content == 1 and #M.text_of(bq.content) <= M.PULLQUOTE_MAX then
    return "pull-quote", bq.content, nil
  end
  return "note", bq.content, nil
end

-- ---------------------------------------------------------------------------
-- The pill and the code label
-- ---------------------------------------------------------------------------

--- Is this paragraph nothing but one bold run — the shape the standard asks for above a
--- code fence? A trailing colon counts; a sentence with a bold word in it does not.
function M.only_strong(para)
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

--- The items after `**In this chapter:**`, or nil if this is any other paragraph.
function M.pill_rest(para)
  local first = para.content[1]
  if not (first and first.t == "Strong"
      and M.text_of(first.content):gsub("[: \t\r\n]+$", "") == M.PILL_LABEL) then
    return nil
  end
  local rest = pandoc.Inlines({})
  for k = 2, #para.content do rest:insert(para.content[k]) end
  return rest
end

--- The code label needs its sibling to decide, so it is matched on the block list rather
--- than on the paragraph: a lone bold line that is not followed by a fence is a
--- sub-heading in prose and stays one.
--- @param emit fun(inlines): Block  builds the label block for this format.
function M.promote_code_labels(blocks, emit)
  local out = pandoc.Blocks({})
  local changed = false
  for i, block in ipairs(blocks) do
    local label = block.t == "Para" and M.only_strong(block) or nil
    if label and blocks[i + 1] and blocks[i + 1].t == "CodeBlock" then
      out:insert(emit(label))
      changed = true
    else
      out:insert(block)
    end
  end
  if changed then return out end
end

-- ---------------------------------------------------------------------------
-- Pass 1 — the deck, and the two heading-shaped callouts
-- ---------------------------------------------------------------------------

local MARKS = {
  { mark = M.CORE_IDEA, kind = "core-idea", label = "The Core Idea" },
  -- The takeaways block prints its own label in print, where two rules on their own do
  -- not say what they are for. The label travels with the kind either way; it is the
  -- back-end's choice whether to set it.
  { mark = M.KEY_TAKEAWAYS, kind = "key-takeaways", label = "Key Takeaways" },
}

local function callout_for(block)
  if block.t ~= "Header" then return nil end
  local text = M.text_of(block.content)
  for _, spec in ipairs(MARKS) do
    if text:sub(1, #spec.mark) == spec.mark then return spec end
  end
  return nil
end

local function callout_div(kind, blocks, label)
  return pandoc.Div(blocks,
    pandoc.Attr("", { M.DIV_CLASS }, { kind = kind, label = label or "" }))
end

M.callout_div = callout_div

--- The one-sentence promise under a chapter title is a blockquote like any other; the
--- only thing that tells it apart is that it sits directly under the level-2 heading
--- `collect-chapters.ts` leaves a chapter title at. Matched before the blockquote
--- handler can claim it as a pull quote.
local function mark_decks(blocks)
  local out = pandoc.Blocks({})
  local after_chapter = false
  for _, block in ipairs(blocks) do
    if after_chapter and block.t == "BlockQuote" then
      out:insert(callout_div("deck", block.content))
      after_chapter = false
    else
      after_chapter = (block.t == "Header" and block.level == 2)
      out:insert(block)
    end
  end
  return out
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
      out:insert(callout_div(spec.kind, body, spec.label))
      i = j
    else
      out:insert(block)
      i = i + 1
    end
  end
  return out
end

--- Pass 1, whole. Run it on `doc.blocks` before the format-specific traversal.
function M.group(blocks)
  return group_callouts(mark_decks(blocks))
end

return M
