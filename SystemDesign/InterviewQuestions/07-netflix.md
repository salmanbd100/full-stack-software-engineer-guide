# Design Netflix

## How to Open This Answer

"I'll design Netflix's streaming platform — focusing on CDN delivery, the recommendation engine, and multi-region resilience at 200+ million subscriber scale. Let me confirm scope before I proceed."

## Problem Statement

Netflix streams to 200 million subscribers across 190 countries. Peak traffic reaches 15% of total internet bandwidth in North America. The system must deliver sub-second start times, personalised recommendations, and survive regional cloud outages without service interruption.

## R — Requirements

### Functional (pick 4-5 that matter most)

- Users can browse a catalogue of movies and TV shows
- Playback starts within 2 seconds on any supported device
- The recommendation engine personalises the home screen per user
- A/B tests can be run on UI variants and ranking algorithms simultaneously
- Content is available in multiple audio tracks and subtitle languages

### Non-Functional (pick 3-4)

- Availability: 99.99% — a streaming outage costs millions per minute
- Latency: video start time under 2 seconds globally
- Scale: 100 million concurrent streams at peak
- Durability: viewing history and preferences must not be lost

## A — Architecture

### High-Level Diagram

```
┌──────────┐         ┌───────────────────┐
│  Client  │         │   API Gateway     │
│ (Smart   │────────▶│   (AWS us-east-1) │
│  TV/Web) │         └────────┬──────────┘
└──────────┘                  │  routes to microservices
                   ┌──────────┼─────────────┐
                   ▼          ▼             ▼
          ┌──────────┐ ┌──────────┐ ┌──────────────┐
          │ Catalogue │ │  User    │ │ Recommendation│
          │ Service   │ │ Profile  │ │ Service       │
          └──────────┘ └──────────┘ └──────────────┘
                   │          │
                   └──────────┤
                              ▼
                   ┌──────────────────┐
                   │  Playback API    │  ← issues CDN tokens
                   └────────┬─────────┘
                            │  steering decision
                   ┌────────▼─────────┐
                   │  Open Connect    │  ← Netflix's own CDN
                   │  Appliance (OCA) │    deployed in ISP PoPs
                   └────────┬─────────┘
                            │  delivers DASH/HLS segments
                   ┌────────▼─────────┐
                   │     Client       │
                   │   ABR Player     │
                   └──────────────────┘

  ┌──────────────────────────────────────────┐
  │   Offline ML Pipeline (Spark + Flink)    │
  │   → trains recommendation models daily   │
  │   → pre-computes home rows per user      │
  └──────────────────────────────────────────┘
```

Netflix runs all API services on AWS (multi-region active-active). Video bytes never touch AWS at runtime — they are served from Open Connect Appliances (OCAs) co-located inside ISP networks. Recommendations are pre-computed overnight and cached in a distributed KV store (EVCache — Netflix's Memcached wrapper). A/B test assignments live in a feature flag service consulted at request time.

## D — Data Model

```typescript
interface Title {
  titleId: string;
  type: "movie" | "series";
  defaultTitle: string;
  localizedTitles: Record<string, string>;  // locale → title
  genres: string[];
  maturityRating: string;
  releaseYear: number;
  availableRegions: string[];
  artworkUrls: Record<string, string>;       // aspect-ratio → URL
}

interface Episode {
  episodeId: string;
  titleId: string;
  seasonNumber: number;
  episodeNumber: number;
  durationSeconds: number;
  streamingManifestUrl: string;
  availableAudioTracks: string[];   // e.g. ["en", "fr", "es"]
  availableSubtitles: string[];
}

interface UserProfile {
  userId: string;
  accountId: string;
  profileName: string;
  language: string;
  maturityLevel: number;
  pinProtected: boolean;
  watchHistory: Array<{
    titleId: string;
    episodeId: string | null;
    progressSeconds: number;
    watchedAt: Date;
    completed: boolean;
  }>;
}

interface ABTestAssignment {
  userId: string;
  experimentId: string;
  variantId: string;
  assignedAt: Date;
  expiresAt: Date;
}
```

## I — Interface (APIs)

```typescript
// 1. Fetch personalised home screen rows
// GET /api/v1/home?profileId=&region=
interface HomeResponse {
  rows: Array<{
    rowId: string;
    rowTitle: string;
    algorithm: string;  // e.g. "trending_now", "because_you_watched"
    titles: Array<{ titleId: string; artworkUrl: string; matchScore: number }>;
  }>;
  abVariant: string;    // active experiment variant ID
}

// 2. Get streaming manifest — returns CDN-steered URL
// GET /api/v1/titles/:titleId/play?episodeId=&profileId=
interface PlaybackRequest {
  audioLanguage: string;
  subtitleLanguage: string | null;
  deviceCapabilities: {
    maxResolution: "1080p" | "4k";
    hdrSupport: boolean;
    codecSupport: ("h264" | "h265" | "av1")[];
  };
}
interface PlaybackResponse {
  manifestUrl: string;   // OCA-steered DASH/HLS URL
  licenseUrl: string;    // Widevine/FairPlay DRM endpoint
  resumePositionSeconds: number;
  expiresAt: Date;       // token expiry — re-request after this
}

// 3. Update watch progress (called every 30 s from player)
// PUT /api/v1/profiles/:profileId/progress
interface ProgressUpdate {
  titleId: string;
  episodeId: string | null;
  positionSeconds: number;
  durationSeconds: number;
}

// 4. Submit rating / reaction
// POST /api/v1/titles/:titleId/rating
interface RatingRequest {
  profileId: string;
  rating: "thumbs_up" | "thumbs_down" | "two_thumbs_up";
}

// 5. List A/B test assignments for analytics
// GET /api/v1/users/:userId/experiments
interface ExperimentsResponse {
  assignments: Array<{
    experimentId: string;
    variantId: string;
    startedAt: Date;
  }>;
}

// 6. Search catalogue
// GET /api/v1/search?q=&profileId=&page=
interface SearchResponse {
  results: Array<{
    titleId: string;
    title: string;
    type: "movie" | "series";
    matchScore: number;
    artworkUrl: string;
  }>;
  nextPageToken: string | null;
}
```

## O — Optimizations & Trade-offs

### Scaling Concerns

| Concern | Naive Approach | Netflix Approach |
|---|---|---|
| Video delivery bandwidth | AWS CloudFront | Open Connect OCAs inside ISPs |
| Recommendation freshness | Real-time compute | Overnight batch + EVCache |
| Multi-region failover | Manual DNS flip | Chaos Monkey + active-active regions |
| DRM key delivery | Per-request DB lookup | Short-lived tokens, key cached in player |
| Home screen latency | Sequential service calls | Parallel fan-out, 200 ms budget |

### Open Connect vs Generic CDN

> Netflix co-locates OCA hardware inside ISP data centers. On peak nights, 95% of traffic never leaves the ISP's network. This cuts transit costs and reduces latency from ~80 ms to ~5 ms.

- ❌ Routing all video through AWS egress — massive bill, higher latency
- ✅ OCA appliances — bytes delivered from the ISP itself

### Recommendation Pre-computation

> Real-time collaborative filtering at 200 million users is prohibitive. Netflix trains offline, stores per-user row embeddings in EVCache, and serves them in under 10 ms at request time.

- ❌ On-demand model inference per home screen load — 500 ms+
- ✅ Nightly batch ranking stored in EVCache — sub-10 ms reads

### A/B Testing at Scale

| Approach | Drawback |
|---|---|
| Client-side feature flags only | Can't test server-side ranking |
| Full traffic split with separate deployments | Ops overhead, slow iteration |
| Assignment service + server-side variant injection | ✅ Recommended — flexible, measurable |

### Multi-Region Resilience

- ❌ Active-passive with manual failover — 20+ minutes of downtime
- ✅ Active-active across 3 AWS regions with Chaos Engineering — failures are routine drills

See [../Scalability/](../Scalability/) for multi-region replication patterns and [../BuildingBlocks/](../BuildingBlocks/) for CDN design.

## Common Follow-up Questions

**Q: How does OCA decide which titles to pre-load onto an appliance?**
Netflix predicts regional popularity from historical watch data. Titles expected to trend in a region are pre-positioned to that region's OCAs before peak hours. Remaining titles fall back to the origin.

**Q: How do you keep recommendation models fresh?**
A nightly Spark job retrains collaborative filtering and two-tower models. An online feature store (Apache Flink) updates real-time signals — recent watches, ratings — that overlay the offline scores without full retraining.

**Q: How do you handle a full AWS region failure?**
Active-active setup: all three regions handle live traffic. Consistent hashing routes users to the nearest healthy region. Stateful data (watch progress, profiles) replicates asynchronously via Cassandra multi-region. In a split-brain scenario, last-write-wins with timestamp resolution.

**Q: What DRM system does Netflix use?**
Widevine (Android/Chrome), FairPlay (Apple), and PlayReady (Windows). The Playback API returns a license URL. The player negotiates a short-lived content key. Keys are never stored on disk — session-only.

**Q: How do you measure recommendation quality?**
Primary metric: long-term member retention (monthly). Short-term proxy: hours streamed per member per week. A/B test rows against baseline for two weeks before global rollout.

---
[← Back to InterviewQuestions](../README.md)
