---
title: Ingestion and Chunking
part: 7
chapter: 0
slug: ingestion-and-chunking
level: advanced
reading_time: 12
updated: 2026-09-07
tags: [ai, rag, chunking, ingestion, metadata, pipeline, typescript]
in_book: true
---

# Ingestion and Chunking {#ch-ingestion-and-chunking}

> Split documents so the right passage can be found whole — and keep enough metadata to filter, cite and re-index without starting over.

**In this chapter:** the pipeline's five stages · why fixed-size splitting fails · structure-aware chunking · overlap and context headers · metadata as a first-class field · keeping the index fresh

## 💡 The Core Idea

A chunk is the smallest unit your system can retrieve. That one sentence carries the whole chapter:
**you can only ever find a whole chunk, so a chunk that splits an idea in half makes that idea
unfindable.** No reranker recovers it, no better model repairs it, and no prompt change works around it.

This is why chunking is upstream of everything else in a retrieval system. A cheap embedding model with
good chunks beats a frontier embedding model with chunks cut every 512 characters, and the second team
usually spends weeks tuning the retriever before looking at the splitter.

> Chunk the document the way its author structured it. They already decided where the ideas end.

## How It Works

### The pipeline

```mermaid
flowchart LR
  A[Source] --> B[Parse to text + structure]
  B --> C[Split into chunks]
  C --> D[Enrich with metadata]
  D --> E[Embed]
  E --> F[Index]
```

**Five stages. Everything downstream inherits the decisions made in the first three.**

Parsing is the stage people underrate. A PDF that loses its table structure, or an HTML page that keeps
its navigation menu, produces chunks that are noise before any splitting happens. Extract structure —
headings, lists, tables, code blocks — because the next stage needs it.

### Why fixed-size splitting fails

Splitting every 500 characters is the tutorial default and it breaks documents in the specific places
that matter.

```text
Chunk 41: "...To rotate the signing key, first disable"
Chunk 42: "the old key, then run the rotation job. If you skip..."
```

A query for "how do I rotate the signing key" now matches chunk 41, which does not contain the answer,
and chunk 42, which does not contain the question's vocabulary. Both score mediocre. Neither is retrieved
with confidence.

| Approach | Splits on | Fits |
| --- | --- | --- |
| **Fixed size** | Character or token count | Nothing well; a baseline only |
| **Recursive** | Paragraph, then sentence, then word | Prose with no reliable structure |
| **Structure-aware** | Headings, sections, list and code boundaries | Markdown, HTML, docs — most corpora |
| **Semantic** | Detected topic shifts, by embedding distance | Long unstructured transcripts |
| **Whole document** | Nothing | Short pages, FAQ entries, tickets |

Structure-aware is the default worth reaching for. Documentation, wikis and knowledge bases already carry
their own boundaries, and honouring them costs almost nothing.

```typescript
interface Chunk {
  readonly text: string;
  readonly sourcePath: string;      // for the citation
  readonly headingPath: string[];   // ['Security', 'Key rotation'] — context and filter
  readonly updatedAt: string;       // for freshness ranking and staleness checks
  readonly tokens: number;
}

function chunkMarkdown(doc: ParsedDoc, maxTokens = 500): Chunk[] {
  return doc.sections.flatMap((section) =>
    section.tokens <= maxTokens
      ? [toChunk(section)]                    // a whole section is the ideal chunk
      : splitByParagraph(section, maxTokens), // only split what genuinely does not fit
  );
}
```

The shape of that function is the point: **split only what does not fit.** A 200-token section is a
better chunk than two 100-token halves of it, and a splitter that always splits is throwing away
structure it was handed for free.

### Size, overlap and the header trick

| Chunk size | Retrieval precision | Context in the answer | Suits |
| --- | --- | --- | --- |
| Small (100–250 tokens) | High — matches are focused | Thin; the model may lack surrounding detail | FAQ, reference, API entries |
| Medium (400–800) | Balanced | Usually sufficient | Documentation, articles |
| Large (1,000+) | Low — one match drags in noise | Rich | Narrative, legal, contracts |

There is no correct number and any chapter that gives you one is guessing about your corpus. What is
correct is the method: pick a starting size from the document type, then measure recall on a golden set
and adjust — [Chapter ?? — Evaluating Retrieval](#ch-evaluating-retrieval) is how.

**Overlap** — repeating the last sentence or two of the previous chunk — is a cheap insurance against
boundary loss. Ten to fifteen per cent is typical. It costs storage and some duplicate retrieval; it buys
back the sentence that would otherwise have been orphaned.

**Context headers** are the better trick and cost less. Prefix each chunk with its document title and
heading path before embedding:

```text
[Platform Handbook › Security › Key rotation]
To rotate the signing key, first disable the old key...
```

Now a chunk deep inside a document still carries what it is about. This measurably improves retrieval for
short chunks, because a fragment with no context embeds near everything and near nothing.

### Metadata earns its place

Metadata is not documentation. It is a filter, a citation and a freshness signal, and adding it after the
fact means re-embedding the whole corpus.

| Field | Used for |
| --- | --- |
| `sourcePath`, `url`, line or page | Citations the user can click |
| `headingPath` | Filtering and the context header |
| `updatedAt`, `version` | Preferring current docs over archived ones |
| `visibility`, `tenantId` | Permission filtering at query time |
| `docType` | Routing — a changelog and a tutorial answer different questions |

Permission fields especially. A retrieval system without them either leaks documents across tenants or
gets rebuilt when the second customer arrives.

### Keeping it fresh

An index is a cache of your documents and it goes stale the same way.

- **Re-embed on change, not on schedule.** Hash the chunk text; if the hash is unchanged, skip the
  embedding call. On a large corpus this is the difference between minutes and hours.
- **Deletes must propagate.** A deleted document whose chunks stay indexed will be cited confidently and
  is one of the harder bugs to notice.
- **Changing the embedding model means re-embedding everything.** Vectors from two models are not
  comparable, so plan for a full rebuild and a switchover, not a gradual migration.

> ⚠️ Mixing vectors from two embedding models in one index produces silent nonsense. Nothing errors;
> similarity scores simply stop meaning anything.

## When to Use It

| Corpus | Chunk by | Size |
| --- | --- | --- |
| Markdown documentation | Heading section | 400–800 tokens |
| API reference | One entry per chunk | Whole entry |
| Support tickets | Whole ticket | Whole document |
| Long PDFs, contracts | Section, then paragraph | 800–1,200 with overlap |
| Meeting transcripts | Semantic or time window | 500 with heavy overlap |
| Source code | Function or class | Whole unit |

## Common Mistakes

**❌ Splitting on character count and moving on**

> It cuts through sentences, tables and code blocks, and the resulting retrieval failures look like model
> failures for weeks.

**❌ Embedding a bare fragment with no context**

> "Then run the rotation job." embeds near nothing useful. Prefix the heading path.

**❌ Deciding chunk size by reading a blog post**

> The right size is a property of your documents and your questions, and it is a one-hour experiment once
> a golden set exists.

**✅ Store metadata at ingestion, even fields you do not use yet**

> Adding `tenantId` later means re-embedding the whole corpus. Adding it now costs a column.

## 🔑 Key Takeaways

- A chunk is the smallest retrievable unit, so a chunk that splits an idea makes that idea unfindable.
- Split on the document's own structure and only split sections that genuinely do not fit.
- Prefix chunks with their document and heading path — a fragment with no context embeds near nothing.
- Metadata is a filter, a citation and a permission boundary; adding it later means re-embedding everything.
- Vectors from two embedding models are not comparable, so a model change is a full rebuild.

## Interview Questions

**Q: How big should a chunk be?**

It depends on the document, and the answer I would give is a method rather than a number. Reference
entries want small chunks because precision matters and each entry is self-contained; narrative or legal
text wants larger ones because meaning spans paragraphs. I would start from the document type, build a
golden set of real questions, and measure recall at a few sizes. Anyone who answers with a fixed number
has not measured it on the corpus in front of them.

**Q: Why does chunking matter more than the embedding model?**

Because retrieval can only ever return whole chunks. If the answer straddles a boundary, no chunk
contains it, and a better embedding model just ranks the incomplete chunks more accurately. Chunking sets
the ceiling on what is findable; the embedding model determines how close you get to that ceiling. Teams
usually tune the second and never look at the first.

**Q: What metadata would you store, and why at ingestion time?**

Source path and location for citations, heading path for context and filtering, an updated timestamp for
freshness, and visibility or tenant fields for permissions. At ingestion, because metadata lives on the
indexed record — adding a field later means walking the corpus again, and if it changes the embedded text
it means paying for every embedding a second time. The permission fields are the ones that hurt most to
retrofit.

**Q: You change the embedding model. What happens to the existing index?**

It has to be rebuilt. Vectors from different models occupy different spaces, so similarity between them
is meaningless — and the failure is silent, since the arithmetic still produces numbers. I would build the
new index alongside the old one, evaluate both on the same golden set, and cut over once the new one wins,
rather than migrating in place.

**Q: How do you keep the index in step with the source documents?**

Content-hash each chunk and only re-embed when the hash changes, which makes an incremental run cheap
enough to do on every publish. Deletions matter more than they look — a removed document whose chunks
remain indexed will be retrieved and cited with total confidence, and nobody notices until a user does.
So the pipeline needs to handle removal explicitly, not just upserts.

## What to Read Next

- [Chapter ?? — Retrieval](#ch-retrieval) — what happens to these chunks at query time
- [Chapter ?? — Vector Stores](#ch-vector-stores) — where they live and what that costs
- [Chapter ?? — Evaluating Retrieval](#ch-evaluating-retrieval) — how to settle the size question with a number
