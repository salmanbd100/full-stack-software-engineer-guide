--[[
  epub-blocks.lua — improvement #83

  The **screen** back-end for the Book Chapter Standard's block vocabulary, and the
  counterpart to callouts.lua. What counts as a callout is decided in one place —
  scripts/lua/callout-shapes.lua — so that a gotcha cannot be a callout in the PDF and a
  plain blockquote in the EPUB.

  It emits nothing but divs with class names. Every treatment is in scripts/epub.css,
  which is what makes the EPUB design a stylesheet a reading system can override rather
  than markup a reader is stuck with.

  Two things differ from print, both on purpose:

  1. **The emoji come back.** Print strips 💡, 🔑 and ⚠️ because its callouts are told
     apart by rule weight and an uppercase label; a screen renders the mark itself, and on
     a monochrome e-ink panel it is a second, redundant cue rather than the only one. The
     structural distinctions from #81 still carry the meaning — full box, rules, left bar
     — so the design survives a reader who has turned images or colour off.
  2. **Nothing is consumed silently.** Print drops the `## 💡 …` heading because the box
     prints its own label. Here the label is re-emitted as a paragraph, so the words are
     still in the text a reader can search and a screen reader can announce.

  What it does:

    kind core-idea      → div.callout.callout--core-idea
    kind key-takeaways  → div.callout.callout--key-takeaways
    kind deck           → div.deck
    kind gotcha         → div.callout.callout--gotcha, plus .callout--moving-target
    kind pull-quote     → blockquote.pull-quote
    kind note           → div.note
    Para **In this chapter:** … → div.pill
    Para **Label:** before a fence → p.code-label

  Tables and code fences are left exactly as pandoc writes them: the EPUB has real
  `<table>` and `<pre>` elements and CSS can reach both, so there is nothing to rewrite.
]]

local shapes = require("scripts.lua.callout-shapes")

-- The mark each callout carries on screen, and the class its treatment hangs off.
local KIND = {
  ["core-idea"] = { class = "callout--core-idea", mark = shapes.CORE_IDEA },
  ["key-takeaways"] = { class = "callout--key-takeaways", mark = shapes.KEY_TAKEAWAYS },
  ["gotcha"] = { class = "callout--gotcha", mark = shapes.WARNING .. shapes.VARIATION_SELECTOR },
}

local function div(classes, blocks)
  return pandoc.Div(blocks, pandoc.Attr("", classes))
end

--- The label line inside a callout: the mark, then the words print sets in caps.
local function label_block(spec, text)
  return pandoc.Para({
    pandoc.Span({ pandoc.Str(spec.mark) }, pandoc.Attr("", { "callout-mark" })),
    pandoc.Space(),
    pandoc.Str(text),
  })
end

local function callout(kind, label, blocks)
  local spec = KIND[kind]
  local classes = { "callout", spec.class }
  -- The standard's *moving target* callout is a different promise to the reader — not
  -- "this will catch you out" but "this will be out of date" — and print says so in its
  -- label. Give the stylesheet the same distinction rather than only the words.
  if kind == "gotcha" and label == "Moving target" then
    classes[#classes + 1] = "callout--moving-target"
  end
  local body = blocks:clone()
  body:insert(1, div({ "callout-label" }, pandoc.Blocks({ label_block(spec, label) })))
  return div(classes, body)
end

--- A div rather than a paragraph with a span in it, so the stylesheet can take the air
--- out of the gap below the label without reaching for `:has()` — which is valid CSS and
--- still absent from every e-ink reading system worth shipping to.
local function code_label(inlines)
  return div({ "code-label" }, pandoc.Blocks({ pandoc.Plain(inlines) }))
end

local function pill(para)
  local rest = shapes.pill_rest(para)
  if not rest then return nil end
  local content = pandoc.Inlines({
    pandoc.Span({ pandoc.Str(shapes.PILL_LABEL) }, pandoc.Attr("", { "pill-label" })),
    pandoc.Space(),
  })
  content:extend(rest)
  return div({ "pill" }, pandoc.Blocks({ pandoc.Para(content) }))
end

local walk

walk = function()
  return {
    traverse = "topdown",
    Blocks = function(blocks) return shapes.promote_code_labels(blocks, code_label) end,
    Para = pill,

    --- Emitted by pass 1: the two heading-shaped callouts and the deck.
    Div = function(d)
      if not d.classes:includes(shapes.DIV_CLASS) then return nil end
      local kind = d.attributes.kind
      local inner = d.content:walk(walk())
      if kind == "deck" then
        return div({ "deck" }, inner), false
      end
      if not KIND[kind] then return nil end
      return callout(kind, d.attributes.label, inner), false
    end,

    BlockQuote = function(bq)
      local kind, content, label = shapes.blockquote_kind(bq)
      local inner = content:walk(walk())
      if kind == "gotcha" then
        return callout(kind, label, inner), false
      end
      if kind == "pull-quote" then
        -- Still a blockquote: it is a quotation, and the element carries that meaning to
        -- a screen reader whatever the stylesheet does with it.
        return pandoc.BlockQuote(inner), false
      end
      return div({ "note" }, inner), false
    end,
  }
end

-- The pull quote needs a class, and a BlockQuote has no attributes to put one on. Pandoc
-- has no `blockquote` div either, so the class goes on in the writer's own output — the
-- one place this filter cannot reach. Instead the stylesheet tells the two apart by what
-- they are: a `.note` div, or a bare `blockquote`. Every other blockquote in the
-- manuscript has already become something else by the time the writer sees it.

if not FORMAT:match("epub") and not FORMAT:match("html") then
  return {}
end

return {
  { Pandoc = function(doc)
      doc.blocks = shapes.group(doc.blocks)
      return doc
    end },
  walk(),
}
