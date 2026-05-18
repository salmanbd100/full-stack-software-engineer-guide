# Design Uber

## How to Open This Answer

"I'll design a ride-hailing system focused on real-time driver-to-rider matching, location tracking via WebSockets, and dynamic surge pricing. The hardest part is finding the nearest available driver in under 200ms at global scale."

## Problem Statement

Uber connects riders with nearby drivers in real-time. The system must track millions of moving driver locations, match a rider to the best driver within seconds, and stream live location updates during a trip. Location data is extremely write-heavy — 5M drivers updating every 4 seconds.

## R — Requirements

### Functional (pick 4-5 that matter most)

- Rider requests a ride with pickup and dropoff locations
- System finds and matches the nearest available driver
- Real-time location updates — rider sees driver moving on a map
- Driver accepts or rejects a ride request
- Fare calculation with surge pricing based on local supply/demand

### Non-Functional (pick 3-4)

- Matching latency < 200ms — riders must see a driver instantly
- Location update throughput: ~333K driver updates/second at peak
- 99.99% availability — a failed ride request is a bad user experience
- Geospatial queries accurate to within 50 meters

## A — Architecture

### High-Level Diagram

```
Driver App              Rider App
    │  WebSocket              │  WebSocket / HTTP
    │                         │
    └─────────┬───────────────┘
              │
        API Gateway
              │
  ┌───────────┼───────────────┐
  │           │               │
Location   Matching        Trip
Service    Engine          Service
  │           │               │
  ▼           │               ▼
Redis Geo     │          PostgreSQL
(active       │          (trips, users,
 drivers)     │           payments)
              │
              ▼
        Kafka (events)
              │
     ┌────────┴────────┐
     │                 │
  Cassandra         Surge Pricing
  (location          Service
   history)         (Redis cache)
```

Location Service receives driver GPS updates via WebSocket and writes to Redis Geo for real-time spatial queries. The Matching Engine queries Redis Geo for nearby drivers, scores them, and sends ride requests via push notification. Trip Service owns the trip state machine and persists to PostgreSQL. All trip events flow through Kafka for analytics and billing.

> WebSockets are essential. HTTP polling at 333K updates/second would require 3× the connections and cannot push driver location to the rider in real time.

## D — Data Model

```typescript
interface Driver {
  driverId: string;
  userId: string;
  vehicleType: 'sedan' | 'suv' | 'luxury';
  licensePlate: string;
  rating: number;          // 1.0 – 5.0
  acceptanceRate: number;  // 0.0 – 1.0
  status: 'available' | 'on_trip' | 'offline';
}

interface Trip {
  tripId: string;
  riderId: string;
  driverId?: string;
  status: 'REQUESTED' | 'DRIVER_ASSIGNED' | 'DRIVER_ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  pickupLocation: { lat: number; lng: number; address: string };
  dropoffLocation?: { lat: number; lng: number; address: string };
  fareBreakdown?: {
    baseFare: number;
    distanceFare: number;
    timeFare: number;
    surgeMultiplier: number;
    total: number;
  };
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

interface DriverLocation {
  driverId: string;
  lat: number;
  lng: number;
  heading: number;
  speed: number;           // m/s
  timestamp: number;       // Unix ms
}

interface RideRequest {
  requestId: string;
  riderId: string;
  driverId: string;
  pickupLocation: { lat: number; lng: number };
  expiresAt: number;       // 30-second TTL
}
```

Storage notes (plain text):
- Active driver locations: Redis Geo key `drivers:{cityCell}` — O(log N) radius query
- Location history: Cassandra partitioned by `driver_id`, clustered by `timestamp DESC` — time-series optimized
- Trips: PostgreSQL with indexes on `(rider_id, created_at)` and `status` for operations queries
- Active trips and ride requests: Redis with TTL — low-latency access during active state

## I — Interface (APIs)

```typescript
// POST /api/v1/rides — rider requests a ride
interface RequestRideRequest {
  pickupLocation: { lat: number; lng: number; address: string };
  dropoffLocation: { lat: number; lng: number; address: string };
  rideType: 'uberX' | 'uberXL' | 'uberBlack';
}
interface RequestRideResponse {
  tripId: string;
  estimatedFare: { min: number; max: number; surgeMultiplier: number };
  estimatedPickupMinutes: number;
  status: 'searching_driver';
}

// GET /api/v1/trips/:tripId — poll trip status (or push via WebSocket)
interface TripStatusResponse {
  tripId: string;
  status: Trip['status'];
  driver?: { name: string; rating: number; vehicle: string; eta: number };
  driverLocation?: { lat: number; lng: number };
}

// POST /api/v1/driver/status — driver goes online/offline
interface DriverStatusRequest {
  status: 'available' | 'offline';
  location: { lat: number; lng: number };
}

// POST /api/v1/driver/requests/:requestId/accept
interface AcceptRideResponse {
  tripId: string;
  rider: { name: string; rating: number };
  pickupLocation: { lat: number; lng: number; address: string };
  estimatedFare: number;
}

// WebSocket: wss://api.uber.com/ws/driver/:driverId
// Driver sends location updates every 4 seconds
interface LocationUpdateMessage {
  type: 'location_update';
  lat: number;
  lng: number;
  heading: number;
  speed: number;
}
```

## O — Optimizations & Trade-offs

### 1. Geospatial Driver Lookup — Redis Geo vs PostGIS

| Approach | Latency | Notes |
|---|---|---|
| Redis Geo (`GEORADIUS`) | < 5ms | In-memory, O(N+log M) — production choice |
| PostgreSQL PostGIS | 50–200ms | Persistent but slower under load |
| QuadTree in memory | < 1ms | Fastest, but needs custom sharding |

✅ Use Redis Geo. Shard by city/region: key `drivers:{latBucket}_{lngBucket}` where each cell covers ~50 km.

```typescript
async function findNearbyDrivers(
  lat: number, lng: number, radiusKm: number, limit: number
): Promise<Array<{ driverId: string; distanceKm: number }>> {
  const cityCell = getCityCell(lat, lng);
  const results = await redis.georadius(
    `drivers:${cityCell}`, lng, lat, radiusKm, 'km',
    'WITHDIST', 'ASC', 'COUNT', limit
  );
  return results
    .filter(async ([id]) => await redis.hget(`driver:${id}`, 'status') === 'available')
    .map(([driverId, dist]) => ({ driverId, distanceKm: parseFloat(dist) }));
}
```

### 2. Matching Algorithm — Concurrent Offers

❌ Don't send requests sequentially — each 30s timeout makes total matching time 90s+ for 3 drivers.
✅ Send to top 3 scored drivers simultaneously. First to accept wins; cancel others.

Scoring weights: distance 50%, ETA 30%, rating 10%, acceptance rate 10%.

### 3. Surge Pricing — Cell-Based Cache

```typescript
async function getSurgeMultiplier(lat: number, lng: number): Promise<number> {
  const cell = getGeoCell(lat, lng); // ~1km cells
  const cached = await redis.get(`surge:${cell}`);
  if (cached) return parseFloat(cached);

  const supply = await countAvailableDrivers(cell);
  const demand = await countPendingRides(cell);
  const ratio = supply === 0 ? Infinity : demand / supply;

  const multiplier = ratio < 0.5 ? 1.0 : ratio < 1.0 ? 1.2 : ratio < 1.5 ? 1.5 : 2.5;
  await redis.setex(`surge:${cell}`, 300, String(multiplier)); // 5-min cache
  return multiplier;
}
```

❌ Don't recalculate surge per request — too expensive at 333K req/s.
✅ Cache per geo cell with 5-minute TTL. Small pricing inconsistency is acceptable.

### 4. Trip State Machine — Avoid Race Conditions

| Transition | Guard |
|---|---|
| REQUESTED → DRIVER_ASSIGNED | Only one driver can claim a trip (Redis SETNX on tripId lock) |
| IN_PROGRESS → COMPLETED | Requires driverId match in trip record |
| Any state → CANCELLED | Allowed from any non-COMPLETED state |

### 5. WebSocket Scaling

❌ A single WebSocket server can't handle 500K concurrent trips.
✅ Shard WebSocket servers by `(driverId % N)`. Store `session:{driverId} → serverNodeId` in Redis so the trip service can route location pushes to the correct node.

| Concern | Solution |
|---|---|
| ❌ Driver app crashes mid-trip | ✅ 60s grace period; fallback to last known location on map |
| ❌ Redis GEO runs out of memory | ✅ Shard by city; evict offline drivers after 5-min TTL |
| ❌ Google Maps API rate limits | ✅ Cache frequent routes; use internal routing for common city pairs |

## Common Follow-up Questions

**Q: How do you prevent two riders from being matched to the same driver?**

When a driver accepts a ride, use a Redis SETNX lock: `SET trip_claim:{driverId} {tripId} NX EX 30`. If the key already exists, the driver is already claimed. Only the first successful SET wins. All other pending requests for that driver are cancelled.

**Q: How does surge pricing work fairly across cities?**

Divide the city into 1 km × 1 km geo cells. Surge is computed per cell, cached for 5 minutes. Riders see the multiplier before confirming. A maximum cap (2.5×) prevents extreme prices. Drivers near surge zones are notified to incentivize supply.

**Q: What happens when the matching engine crashes?**

Route ride requests to a healthy region via the API Gateway. The matching engine is stateless — all state lives in Redis and PostgreSQL. A crashed instance is replaced in seconds. Use circuit breakers at the Gateway level to prevent cascading failures.

**Q: How would you handle UberPool (shared rides)?**

Store the route segment for each rider as a geospatial path. When a new request comes in, query for in-progress trips whose remaining route passes within 500m of the new pickup. Score by detour time added. This is a harder matching problem — process it in a separate Pool Matching Service.

---

[← Back to InterviewQuestions](../README.md)
