---
title: Ingestion and Chunking
part: 7
chapter: 13
slug: ingestion-and-chunking
level: advanced
reading_time: 12
updated: 2026-09-07
tags: [ai, rag, chunking, ingestion, metadata, pipeline, typescript]
in_book: true
---

# Ingestion and Chunking {#ch-ingestion-and-chunking}

> Split documents so the right passage can be found whole, and keep enough metadata to filter, cite and re-index without starting over.

**In this chapter:** the pipeline's five stages · why fixed-size splitting fails · structure-aware chunking · overlap and context headers · metadata as a first-class field · keeping the index fresh

## 💡 The Core Idea

A chunk is one piece of a split document, and it is the smallest unit your system can retrieve. So
**you can only ever find a whole chunk, and a chunk that splits an idea in half makes that idea
unfindable.** No reranker recovers it, no better model repairs it, and no prompt change works around it.

This is why chunking comes before everything else in a retrieval system. A cheap embedding model (it
turns text into a vector of numbers) with good chunks beats a frontier one with chunks cut every 512
characters. The second team usually spends weeks tuning the retriever before it looks at the splitter.

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
its navigation menu, gives you noisy chunks before any splitting happens. Extract the structure, such as
headings, lists, tables and code blocks, because the next stage needs it.

### Why fixed-size splitting fails

Splitting every 500 characters is the tutorial default. It breaks documents in exactly the places that matter.

```text
Chunk 41: "...To rotate the signing key, first disable"
Chunk 42: "the old key, then run the rotation job. If you skip..."
```

A query for "how do I rotate the signing key" now matches chunk 41, which does not contain the answer,
and chunk 42, which does not contain the question's vocabulary. Both score only moderately. Neither is retrieved
with confidence.

| Approach | Splits on | Fits |
| --- | --- | --- |
| **Fixed size** | Character or token count | Nothing well; a baseline only |
| **Recursive** | Paragraph, then sentence, then word | Prose with no reliable structure |
| **Structure-aware** | Headings, sections, list and code boundaries | Markdown, HTML, docs — most corpora |
| **Semantic** | Detected topic shifts, by embedding distance | Long unstructured transcripts |
| **Whole document** | Nothing | Short pages, FAQ entries, tickets |

Structure-aware splitting is the right default. Documentation, wikis and knowledge bases already carry
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
better chunk than its two 100-token halves. A splitter that always splits throws away structure it got
for free.

### Size, overlap and the header trick

| Chunk size | Retrieval precision | Context in the answer | Suits |
| --- | --- | --- | --- |
| Small (100–250 tokens) | High — matches are focused | Thin; the model may lack surrounding detail | FAQ, reference, API entries |
| Medium (400–800) | Balanced | Usually sufficient | Documentation, articles |
| Large (1,000+) | Low — one match drags in noise | Rich | Narrative, legal, contracts |

There is no correct number. Any chapter that gives you one is guessing about your corpus. What is correct
is the method. Pick a starting size from the document type, then measure recall on a golden set (a fixed
list of real questions with known answers) and adjust. Recall is how often the right chunk comes back.
[Chapter ?? — Evals, Retrieval Metrics and Error Analysis](#ch-evals) shows how.

**Overlap** repeats the last sentence or two of the previous chunk. It is cheap insurance against losing
text at a boundary, and ten to fifteen per cent is typical. It costs storage and some duplicate
retrieval. In return it saves the sentence that would otherwise have been cut off.

**Context headers** are the better trick and cost less. Prefix each chunk with its document title and
heading path before embedding:

```text
[Platform Handbook › Security › Key rotation]
To rotate the signing key, first disable the old key...
```

Now a chunk deep inside a document still carries what it is about. This measurably improves retrieval for
short chunks, because a fragment with no context embeds near everything and near nothing.

### Metadata earns its place

Metadata is not documentation. It is a filter, a citation and a freshness signal. Adding it after the
fact means re-ingesting the whole corpus.

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

- **Re-embed on change, not on schedule.** Hash the chunk text. If the hash has not changed, skip the
  embedding call. On a large corpus this is the difference between minutes and hours.
- **Deletes must propagate.** If a deleted document's chunks stay in the index, the system cites them
  confidently. It is one of the harder bugs to notice.
- **Changing the embedding model means re-embedding everything.** Vectors from two models are not
  comparable, so plan for a full rebuild and a switchover, not a gradual migration.

> ⚠️ Mixing vectors from two embedding models in one index produces silent nonsense. Nothing throws an
> error. Similarity scores simply stop meaning anything.

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

> The right size is a property of your documents and your questions. Once a golden set exists, finding it
> is a one-hour experiment.

**✅ Store metadata at ingestion, even fields you do not use yet**

> Adding `tenantId` later means re-ingesting the whole corpus. Adding it now costs a column.

## 🔑 Key Takeaways

- A chunk is the smallest retrievable unit, so a chunk that splits an idea makes that idea unfindable.
- Split on the document's own structure and only split sections that genuinely do not fit.
- Prefix chunks with their document and heading path. A fragment with no context embeds near nothing.
- Metadata is a filter, a citation and a permission boundary. Adding it later means re-ingesting everything.
- Vectors from two embedding models are not comparable, so a model change is a full rebuild.

## Interview Questions

**Q: How big should a chunk be?**

It depends on the document, so I would answer with a method, not a number. Reference entries want small
chunks, because precision matters and each entry stands alone. Narrative or legal text wants larger ones,
because meaning spans paragraphs. I would start from the document type, build a golden set of real
questions, and measure recall at a few sizes. Anyone who gives a fixed number has not measured it on the
corpus in front of them.

**Q: Why does chunking matter more than the embedding model?**

Because retrieval can only ever return whole chunks. If the answer crosses a boundary, no chunk contains
it. A better embedding model just ranks the incomplete chunks more accurately. Chunking sets the ceiling
on what is findable, and the embedding model decides how close you get to it. Teams usually tune the
second and never look at the first.

**Q: What metadata would you store, and why at ingestion time?**

Source path and location for citations, heading path for context and filtering, an updated timestamp for
freshness, and visibility or tenant fields for permissions. I store them at ingestion because metadata
lives on the indexed record. Adding a field later means walking the whole corpus again. If the field
changes the embedded text, you also pay for every embedding a second time. The permission fields hurt
most to add later.

**Q: You change the embedding model. What happens to the existing index?**

It has to be rebuilt. Vectors from different models live in different spaces, so similarity between them
means nothing. The failure is silent, because the maths still produces numbers. I would build the new
index next to the old one, evaluate both on the same golden set, and switch once the new one wins. I
would not migrate in place.

**Q: How do you keep the index in step with the source documents?**

Hash each chunk's content and only re-embed when the hash changes. That makes an incremental run cheap
enough to do on every publish. Deletions matter more than they look. If a document is removed but its
chunks stay indexed, the system retrieves and cites them with total confidence. Nobody notices until a
user does. So the pipeline must handle removal explicitly, not just upserts (insert-or-update writes).

## What to Read Next

- [Chapter ?? — Embeddings, Vector Stores and Retrieval](#ch-retrieval) — where these chunks live and what happens to them at query time
- [Chapter ?? — Evals, Retrieval Metrics and Error Analysis](#ch-evals) — how to settle the size question with a number
