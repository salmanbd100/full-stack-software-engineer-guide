--[[
  xref.lua — improvement #82

  Resolves the book's own cross-reference syntax so that it works on paper.

  BOOK-SPEC non-negotiable #8 fixes the shape: `[Chapter ?? — Title](#ch-slug)`. #71
  converted all 219 remaining relative links into it, and a `relative-link` lint rule
  holds the manuscript there. What nothing did until this filter is *resolve* it — pandoc
  turns the link into a hyperlink and prints the literal text, so 974 sentences in the
  PDF read "see Chapter ?? — Closures" and a reader holding the book has no way to find
  the chapter.

  The `??` is not laziness. The number lives in front matter, not in the prose, precisely
  so that moving a chapter does not mean editing a thousand sentences. Supplying it is
  this filter's job.

  What each of the 1,662 references becomes:

    974  [Chapter ?? — Closures](#ch-closures)          → Chapter 47 — Closures (p. 312)
    613  [Closures](#ch-closures)                        → Closures (p. 312)
          — the chapter tables in every section index, where the table already has its
            own "#" column and a second number in the cell would be noise
     61  [Part II — Accessibility](#ch-…-index)          → Part II — Accessibility (p. 118)
     14  [Chapter ?? — Glossary](#ch-glossary)           → Glossary (p. 1203)
          — the glossary, the preface and the rest of the matter are **not chapters**, so
            the prefix is dropped rather than numbered. That those 14 were written with a
            `Chapter ?? —` prefix at all is a small authoring slip; it is corrected here
            rather than in fourteen files, because the filter is the thing that knows
            what sits outside the nine parts.

  🔑 **Where the number comes from, and why not from front matter.**

  #82's own note in the plan says the filter "reads them from front matter". It cannot,
  and it should not. `number-chapters.ts` restarts numbering at 0 in every part, so
  `chapter: 2` is Data Types and Variables in Part I *and* Semantic HTML in Part II —
  those numbers are a reading order, not an address. LaTeX's own chapter counter runs
  continuously across parts and is the number actually printed at the head of the
  chapter, so print takes `\ref`, which is that counter, and gets a figure that agrees
  with the page it points at by construction. It also survives #77: if calibration makes
  the preface an unnumbered chapter, every reference follows without a line changing here.

  EPUB has no counter to borrow and no pages to cite, so the number is computed instead —
  by counting level-2 headings in document order, which is the same thing LaTeX is doing.

  🔴 An undefined reference prints "??" where the number should be, and **tectonic does
  not surface it**: the LaTeX warning stays inside a log it summarises as "warnings were
  issued by the TeX engine". Checked here instead, against the anchors this filter has
  already collected — the count goes to stderr and build-book.sh prints it. Verified it is
  not a false negative by pointing a link at an anchor no heading carries.
]]

local PREFIX = "#ch-"

-- The authored prefix, in the exact shape non-negotiable #8 gives it: "Chapter", a
-- space, two question marks, a space, an em dash, a space. Matched literally rather than
-- with a character class, because Lua patterns are bytes and an em dash is three of them.
local CHAPTER_PREFIX = "Chapter ?? — "

-- ---------------------------------------------------------------------------
-- Pass 1 — what each anchor is, and what number it carries
-- ---------------------------------------------------------------------------
--
-- Classified from the assembled document rather than from front matter, because the
-- filter is handed build/book.md and nothing else. The two facts it needs are both
-- visible there: a chapter is a level-2 heading, and `collect-chapters.ts` puts front
-- matter before the first level-1 divider and back matter under one titled "Back Matter".

local number_of = {}   -- slug → the chapter number LaTeX will print
local is_matter = {}   -- slug → true when it is front or back matter, not a chapter

local function scan(blocks)
  local chapters = 0
  local seen_part = false
  local in_back_matter = false

  for _, block in ipairs(blocks) do
    if block.t == "Header" and block.level == 1 then
      seen_part = true
      in_back_matter = pandoc.utils.stringify(block.content):match("Back Matter") ~= nil
    elseif block.t == "Header" and block.level == 2 then
      chapters = chapters + 1
      local id = block.identifier
      if id and id ~= "" then
        number_of[id] = chapters
        is_matter[id] = (not seen_part) or in_back_matter
      end
    end
  end
end

-- ---------------------------------------------------------------------------
-- Pass 2 — rewriting the links
-- ---------------------------------------------------------------------------

--- Drop the literal "Chapter ?? — " from the front of a link's inlines.
---
--- Done on the inline list rather than on a stringified copy, so that a title carrying
--- `code`, emphasis or an en dash comes through unharmed. The prefix always arrives as
--- Str "Chapter", Space, Str "??", Space, Str "—", Space — pandoc splits on whitespace —
--- so six elements come off the front and the rest is the title.
local function strip_prefix(inlines)
  if pandoc.utils.stringify(inlines):sub(1, #CHAPTER_PREFIX) ~= CHAPTER_PREFIX then
    return nil
  end

  local out = {}
  local dropped = 0
  for _, il in ipairs(inlines) do
    if dropped < 6 then
      dropped = dropped + 1
    else
      out[#out + 1] = il
    end
  end
  return pandoc.Inlines(out)
end

--- `(p. 312)` — the page citation, in the caption grey at the small size.
--- `\pageref*` rather than `\pageref`: the whole reference is already inside a
--- \hyperref, and a link nested in a link is a warning in hyperref and a misdraw in
--- several readers.
local function page_ref(id)
  return pandoc.RawInline("latex",
    "\\,{\\color{inkmid}\\sffamily\\fontsize{\\tokSmallSize}{\\tokSmallSize}\\selectfont"
    .. "(p.\\,\\pageref*{" .. id .. "})}")
end

--- The whole reference as one LaTeX link: `\hyperref[id]{…}` around the title, with the
--- page citation *outside* it, so the grey parenthetical is not itself clickable blue.
local function latex_link(id, inlines)
  local out = pandoc.Inlines({ pandoc.RawInline("latex", "\\hyperref[" .. id .. "]{") })
  out:extend(inlines)
  out:insert(pandoc.RawInline("latex", "}"))
  out:insert(page_ref(id))
  return pandoc.Span(out)
end

--- Targets no heading in the assembled book carries. `lint:docs` holds the markdown at
--- zero with its `unresolved-xref` rule, so a hit here means an anchor was lost between
--- the manuscript and the AST — a heading that stopped being a heading, or a chapter
--- dropped from the collection — which is the one failure mode the lint cannot see.
local unresolved = {}

function Link(link)
  local target = link.target
  if target:sub(1, #PREFIX) ~= PREFIX then return nil end

  local id = target:sub(2) -- drop the leading "#"
  if number_of[id] == nil then unresolved[id] = (unresolved[id] or 0) + 1 end
  local title = strip_prefix(link.content)
  local numbered = title ~= nil and not is_matter[id]
  if title == nil then title = link.content end

  if FORMAT:match("latex") then
    local content = pandoc.Inlines({})
    if numbered then
      -- `\ref*` for the same reason as `\pageref*` — see page_ref above.
      content:insert(pandoc.RawInline("latex", "Chapter~\\ref*{" .. id .. "} — "))
    end
    content:extend(title)
    return latex_link(id, content)
  end

  -- EPUB and anything else: keep the anchor, which is what a reader taps. Only the
  -- placeholder is filled in, and only when there is a number to fill it with.
  local content = pandoc.Inlines({})
  if numbered and number_of[id] then
    content:insert(pandoc.Str("Chapter " .. number_of[id] .. " —"))
    content:insert(pandoc.Space())
  end
  content:extend(title)
  link.content = content
  return link
end

-- ---------------------------------------------------------------------------

--- Counted rather than thrown. A build that stops on the first bad anchor tells you
--- about one of them; the book has 1,662 cross-references and the useful answer is the
--- whole list.
local function report()
  local total, names = 0, {}
  for id, n in pairs(unresolved) do
    total = total + n
    names[#names + 1] = "#" .. id
  end
  if total == 0 then return end
  table.sort(names)
  io.stderr:write(string.format(
    "  ⚠️  %d cross-reference(s) target %d anchor(s) no chapter carries — these print as "
    .. "\"??\" with no page:\n     %s\n",
    total, #names, table.concat(names, ", ")))
end

return {
  { Pandoc = function(doc) scan(doc.blocks) return nil end },
  { Link = Link },
  { Pandoc = function(doc) report() return nil end },
}
