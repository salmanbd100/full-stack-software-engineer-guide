# Design Parking Lot System

## How to Open This Answer

"I'll design a parking lot system focusing on object-oriented modelling first — Vehicle, Spot, Ticket, ParkingLot — then extend it to handle multi-floor support, spot-type matching, and dynamic pricing. I'll treat this as both an OOP design question and a backend service question."

## Problem Statement

A parking lot must track available spots across multiple floors, assign the nearest appropriate spot to an incoming vehicle, issue a ticket on entry, calculate fees on exit, and support multiple vehicle sizes. The design must be clean enough to extend (e.g. add reservations or EV charging) without rewriting core logic.

## R — Requirements

### Functional (pick 4-5 that matter most)

- Accept vehicles at entry gates and assign the nearest available spot
- Issue a unique ticket recording entry time and assigned spot
- Match spot type to vehicle size (motorcycle → compact, car → regular, truck → large)
- Calculate parking fee on exit based on duration and spot type
- Display real-time available spot count per floor and per type

### Non-Functional (pick 3-4)

- Support up to 5000 spots across multiple floors in a single lot
- Spot assignment must complete in under 50ms
- System must stay consistent — two cars must never get the same spot
- Handle 1000 concurrent entry/exit events without race conditions

## A — Architecture

### High-Level Diagram

```
Entry Gate Kiosk          Exit Gate Kiosk
      │                         │
      ▼                         ▼
  Parking Service  ◀──────────────────
      │        │
      │        ▼
      │   Spot Manager
      │   (availability index, per floor)
      │        │
      ▼        ▼
  Ticket Store      Payment Service
  (PostgreSQL)      (fee calculation)
      │
      ▼
  Notification Service
  (display boards, mobile app)
```

The Parking Service is the single authority for spot assignment. It uses an in-memory availability index (backed by Redis sorted sets, ordered by spot proximity to entrance) to find the nearest open spot in O(log n). The assignment is then written to PostgreSQL under a row-level lock to prevent double assignment. The Ticket Store records every entry/exit event. Display boards subscribe to availability change events via WebSocket.

### Class Diagram (OOP Design)

```typescript
// SpotManager — single responsibility: track and assign spots
class SpotManager {
  private availableSpots: Map<SpotType, ParkingSpot[]> = new Map();

  findNearest(vehicleSize: VehicleSize): ParkingSpot | null {
    const eligible = this.getEligibleSpotTypes(vehicleSize);
    for (const type of eligible) {
      const spots = this.availableSpots.get(type) ?? [];
      if (spots.length > 0) return spots[0]; // sorted by distance
    }
    return null;
  }

  private getEligibleSpotTypes(size: VehicleSize): SpotType[] {
    const matrix: Record<VehicleSize, SpotType[]> = {
      motorcycle: ["motorcycle", "compact", "regular", "large"],
      compact:    ["compact", "regular", "large"],
      regular:    ["regular", "large"],
      large:      ["large"],
    };
    return matrix[size];
  }
}

// ParkingLot — orchestrator; delegates to managers
class ParkingLot {
  constructor(
    private spotManager: SpotManager,
    private ticketStore: TicketStore,
    private paymentService: PaymentService,
  ) {}

  async enter(vehicle: Vehicle): Promise<ParkingTicket> {
    const spot = this.spotManager.findNearest(vehicle.size);
    if (!spot) throw new Error("Lot is full");
    spot.status = "occupied";
    return this.ticketStore.issue(vehicle, spot);
  }

  async exit(ticketId: string): Promise<number> {
    const ticket = await this.ticketStore.get(ticketId);
    const fee = this.paymentService.calculate(ticket);
    await this.ticketStore.close(ticketId, fee);
    this.spotManager.release(ticket.spotId);
    return fee;
  }
}
```

This structure follows the Open/Closed principle — adding EV charging or reservations does not require modifying `ParkingLot`; it extends `SpotManager` with new filter logic.

### Fee Calculation Logic

```typescript
class PaymentService {
  calculate(ticket: ParkingTicket, rules: PricingRule[]): number {
    const rule = rules.find(r => r.spotType === this.getSpotType(ticket.spotId));
    if (!rule) throw new Error("No pricing rule found");

    const durationMs = Date.now() - ticket.entryTime.getTime();
    const durationMin = durationMs / (1000 * 60);

    // Grace period — free if within threshold
    if (durationMin <= rule.gracePeriodMinutes) return 0;

    // Round up to nearest 15-minute block
    const billableBlocks = Math.ceil(durationMin / 15);
    const billableHours = billableBlocks * 15 / 60;

    const fee = Math.round(billableHours * rule.baseRatePerHourCents);
    return Math.min(fee, rule.dailyCapCents);
  }
}
```

## D — Data Model

```typescript
type VehicleSize = "motorcycle" | "compact" | "regular" | "large";
type SpotType    = "motorcycle" | "compact" | "regular" | "large";
type SpotStatus  = "available" | "occupied" | "reserved" | "maintenance";

interface Vehicle {
  licensePlate: string;
  size: VehicleSize;
  type: "car" | "motorcycle" | "truck" | "electric";
}

interface ParkingSpot {
  spotId: string;          // e.g. "F2-R14-S07" (floor-row-slot)
  floor: number;
  row: number;
  slotNumber: number;
  type: SpotType;
  status: SpotStatus;
  distanceFromEntrance: number;  // manhattan distance, for sorting
  hasEVCharger: boolean;
}

interface ParkingTicket {
  ticketId: string;        // UUID
  vehiclePlate: string;
  spotId: string;
  entryTime: Date;
  exitTime?: Date;
  feeCharged?: number;     // in cents
  paymentStatus: "unpaid" | "paid" | "waived";
}

interface PricingRule {
  spotType: SpotType;
  baseRatePerHourCents: number;
  dailyCapCents: number;    // max charged per day
  gracePeriodMinutes: number; // free for first N minutes
}
```

## I — Interface (APIs)

```typescript
// POST /v1/entry  — vehicle arrives at gate
interface EntryRequest {
  licensePlate: string;
  vehicleSize: VehicleSize;
  vehicleType: Vehicle["type"];
  preferEVCharger?: boolean;
}
interface EntryResponse {
  ticketId: string;
  spotId: string;
  floor: number;
  instructions: string;    // "Floor 2, Row 14, Slot 7"
  entryTime: string;       // ISO 8601
}

// POST /v1/exit  — vehicle leaves; calculate and collect fee
interface ExitRequest {
  ticketId: string;
}
interface ExitResponse {
  ticketId: string;
  spotId: string;
  durationMinutes: number;
  feeCharged: number;      // cents
  paymentStatus: "paid";
}

// GET /v1/availability  — display board / mobile app
interface AvailabilityResponse {
  totalAvailable: number;
  byFloor: Array<{
    floor: number;
    available: number;
    total: number;
  }>;
  byType: Record<SpotType, number>;
}

// GET /v1/tickets/:ticketId  — check ticket status
interface TicketStatusResponse {
  ticket: ParkingTicket;
  currentFeeIfExitNow: number;  // cents
}

// PATCH /v1/spots/:spotId  — ops: mark spot under maintenance
interface UpdateSpotRequest {
  status: "available" | "maintenance";
  reason?: string;
}
interface UpdateSpotResponse {
  spotId: string;
  status: SpotStatus;
  updatedAt: string;
}
```

## O — Optimizations & Trade-offs

### Scaling concerns

| Concern | Problem | Solution |
|---|---|---|
| Double assignment | Two gates assign same spot concurrently | Use `SELECT ... FOR UPDATE SKIP LOCKED` on spot row in Postgres; only one transaction wins |
| Finding nearest spot | Linear scan of 5000 spots is slow | Per-floor sorted set in Redis keyed by `distanceFromEntrance`; O(log n) pop |
| Availability display lag | Display board shows wrong count | Publish `SpotStatusChanged` event on every assignment/release; subscribers update instantly |
| Pricing complexity | Different rates per spot type, time of day | Store `PricingRule` in DB; compute fee via rule engine at exit — easy to update |
| Lost ticket | Customer loses ticket | Look up by license plate + approximate entry time; require manager override for fee waiver |

### Pitfalls

| Pitfall | Verdict |
|---|---|
| No spot-type validation | ❌ Motorcycle occupying a large truck spot wastes space |
| Calculating fee at entry | ❌ Duration unknown at entry — calculate at exit only |
| Storing availability count as a single integer | ❌ Race condition under concurrent updates — derive from spot status sum |
| No grace period for pricing | ❌ Customers who exit in 2 minutes should not be charged |
| Hardcoding pricing in application code | ❌ Use a rules table so pricing can change without a deployment |

### Spot type assignment matrix

| Vehicle | Motorcycle Spot | Compact Spot | Regular Spot | Large Spot |
|---|---|---|---|---|
| Motorcycle | ✅ (preferred) | ✅ | ✅ | ✅ |
| Car (compact) | ❌ | ✅ (preferred) | ✅ | ✅ |
| Car (regular) | ❌ | ❌ | ✅ (preferred) | ✅ |
| Truck / SUV | ❌ | ❌ | ❌ | ✅ |

> The key insight for OOP design: `ParkingLot` does not assign spots. `SpotManager` does. `ParkingLot` orchestrates — it calls `SpotManager.findNearest()`, creates a `Ticket`, then calls `PaymentService.calculateFee()`. Each class has a single responsibility.

See [../OOP/solid-principles.md](../OOP/solid-principles.md) for Single Responsibility and Open/Closed patterns used here, and [../Database/sql-transactions.md](../Database/sql-transactions.md) for the `SELECT FOR UPDATE` locking pattern.

## Common Follow-up Questions

**Q: How do you handle advance reservations (book a spot online)?**
A: Add a `Reservation` entity linked to a spot and a time window. Reserve spot status becomes "reserved" during the window. If the customer does not arrive within 15 minutes of their reservation start, release the spot and cancel the reservation.

**Q: How do you support multi-lot (many parking lots in a city)?**
A: Add a `LotId` to every entity. Run a separate `CityParkingService` that aggregates availability across lots and routes drivers to the nearest available lot. Each lot retains its own `SpotManager`.

**Q: How do you calculate pricing for fractional hours?**
A: Round up to the nearest 15-minute block. Store `gracePeriodMinutes` in `PricingRule` — subtract from total duration before billing. Apply `dailyCapCents` if duration exceeds 24 hours.

**Q: How do you handle a crashed gate — entry recorded but spot never assigned?**
A: Use a saga pattern — entry event is written to an outbox table inside the same transaction as the spot assignment. A background worker retries any incomplete sagas. If no spot was assigned the ticket is voided.

**Q: How do you add EV charging spot support?**
A: Add `hasEVCharger: boolean` to `ParkingSpot` (already in the model). Add `preferEVCharger` to `EntryRequest`. The `SpotManager` filters by `hasEVCharger = true` first, then falls back to regular spots. Pricing rule includes an EV surcharge per kWh.

---
[← Back to InterviewQuestions](../README.md)
