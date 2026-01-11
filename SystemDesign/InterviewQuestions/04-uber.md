# Design Uber (Ride-Hailing System)

## Problem Statement

Design a scalable ride-hailing platform that connects riders with drivers in real-time, handles location tracking, fare calculation, payment processing, and provides ETA estimates. The system should handle millions of concurrent rides globally with sub-second matching latency.

**Examples**: Uber, Lyft, Grab, Ola, Didi

## Requirements

### Functional Requirements

**Core Features:**
1. ✅ **Rider Flow**: Request ride, see nearby drivers, get ETA, track driver location
2. ✅ **Driver Flow**: Go online, receive ride requests, accept/reject, navigate to pickup/destination
3. ✅ **Matching Algorithm**: Match riders with nearby available drivers
4. ✅ **Real-time Tracking**: Track driver location, update rider in real-time
5. ✅ **Fare Calculation**: Dynamic pricing (surge), distance-based, time-based
6. ✅ **Payment Processing**: Multiple payment methods, split fare
7. ✅ **Ratings & Reviews**: Rate driver/rider after trip
8. ✅ **Trip History**: View past rides, receipts

**Out of Scope** (Nice to Have):
- ❌ Ride scheduling (future bookings)
- ❌ Carpooling (UberPool)
- ❌ Food delivery (Uber Eats)
- ❌ In-app chat/calling

### Non-Functional Requirements

| Requirement | Target | Rationale |
|------------|--------|-----------|
| **Availability** | 99.99% | Critical for users |
| **Latency** | < 200ms matching | Real-time experience |
| **Scalability** | 10M concurrent rides | Global scale |
| **Accuracy** | < 50m location accuracy | Precise pickup |
| **Throughput** | 100K requests/sec | Peak traffic handling |

## Capacity Estimation

### 💡 **Traffic Estimates**

**Assumptions:**
```
Total users: 100 million (riders + drivers)
Daily Active Users (DAU): 20 million riders
Active drivers: 5 million daily
Rides per day: 15 million
Concurrent rides: 500,000 at peak
Average ride duration: 20 minutes
```

**Request Rates:**
```
Ride requests: 15M/day = 174 req/sec
Location updates (drivers): 5M drivers × 4 updates/min = 333K updates/sec
Location polling (riders during trip): 500K × 1 update/sec = 500K req/sec
Total QPS: ~1M requests/sec
```

### 💡 **Storage Estimates**

**Trip Data:**
```
Average trip record: 2 KB (pickup, dropoff, route, fare, duration)
Daily trips: 15M × 2 KB = 30 GB/day
Yearly: 30 GB × 365 = ~11 TB/year
Keep 3 years: ~33 TB
```

**Location Data (Hot Storage):**
```
Active driver locations: 5M × 100 bytes = 500 MB
Recent location history (1 hour): 5M × 240 updates × 100 bytes = 120 GB
```

**User Data:**
```
Users: 100M × 1 KB = 100 GB (profiles, payment info)
```

### 💡 **Bandwidth Estimates**

**Incoming:**
```
Location updates: 333K updates/sec × 100 bytes = 33 MB/sec = 264 Mbps
```

**Outgoing:**
```
Location broadcasts to riders: 500K riders × 1 update/sec × 200 bytes = 100 MB/sec = 800 Mbps
```

## High-Level Design

### Architecture Overview

```
┌─────────────┐         ┌─────────────┐
│ Rider App   │         │ Driver App  │
└──────┬──────┘         └──────┬──────┘
       │                       │
       │ WebSocket/HTTP        │ WebSocket
       │                       │
       └──────────┬────────────┘
                  │
       ┌──────────▼──────────┐
       │   API Gateway       │
       │ (Load Balancer)     │
       └──────────┬──────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
    ▼             ▼             ▼
┌────────┐  ┌────────┐  ┌───────────┐
│ Rider  │  │ Driver │  │ Location  │
│Service │  │Service │  │  Service  │
└────┬───┘  └───┬────┘  └─────┬─────┘
     │          │              │
     └──────────┼──────────────┘
                │
       ┌────────▼────────┐
       │ Matching Engine │
       │   (Core Logic)  │
       └────────┬────────┘
                │
    ┌───────────┼───────────┐
    │           │           │
    ▼           ▼           ▼
┌────────┐  ┌────────┐  ┌──────────┐
│Payment │  │ Routing│  │   ETA    │
│Service │  │Service │  │ Service  │
└────────┘  └────────┘  └──────────┘
                │
    ┌───────────┼───────────────┐
    │           │               │
    ▼           ▼               ▼
┌─────────┐ ┌─────────┐  ┌──────────┐
│PostgreSQL│ │ Redis   │  │Cassandra │
│(Users,   │ │(Active  │  │(Trips,   │
│Trips)    │ │drivers) │  │Locations)│
└─────────┘ └─────────┘  └──────────┘
     │           │               │
     └───────────┼───────────────┘
                 │
          ┌──────▼──────┐
          │   Kafka     │
          │(Events, Logs)│
          └─────────────┘
                 │
          ┌──────▼──────┐
          │ElasticSearch│
          │  (Indexing) │
          └─────────────┘
```

### 💡 **Key Components**

| Component | Technology | Purpose | Scale |
|-----------|-----------|---------|-------|
| **API Gateway** | AWS ALB, Kong | Entry point, rate limiting, auth | 100 servers |
| **Rider Service** | Java, Go | Rider operations (request ride, track) | 200 servers |
| **Driver Service** | Java, Go | Driver operations (accept, navigate) | 200 servers |
| **Location Service** | Go (high performance) | Track driver locations, geospatial queries | 300 servers |
| **Matching Engine** | C++, Go | Match riders with drivers (latency critical) | 100 servers |
| **Payment Service** | Java | Process payments, refunds | 50 servers |
| **Routing Service** | Custom + Google Maps API | Calculate routes, ETAs | 50 servers |
| **Notification Service** | Node.js | Send push notifications | 50 servers |
| **Database** | PostgreSQL | Users, trips, payments | Sharded |
| **Geospatial DB** | Redis Geo | Active driver locations | 50 nodes |
| **Time-series DB** | Cassandra | Location history, trip logs | 100 nodes |
| **Message Queue** | Kafka | Events, async processing | 20 brokers |
| **Search** | Elasticsearch | Trip search, analytics | 30 nodes |

## Detailed Design

### 💡 **Geospatial Indexing (Finding Nearby Drivers)**

**Problem**: Need to find all drivers within 5km of rider's location in < 100ms

**Solution: QuadTree + Redis Geo**

**QuadTree Approach:**

```javascript
class QuadTree {
  constructor(boundary, capacity = 50) {
    this.boundary = boundary; // { lat, lng, width, height }
    this.capacity = capacity; // Max drivers per cell
    this.drivers = [];
    this.divided = false;
    this.northeast = null;
    this.northwest = null;
    this.southeast = null;
    this.southwest = null;
  }

  // Insert driver into quadtree
  insert(driver) {
    // Check if driver is within boundary
    if (!this.boundary.contains(driver.location)) {
      return false;
    }

    // If capacity not reached, add to this cell
    if (this.drivers.length < this.capacity) {
      this.drivers.push(driver);
      return true;
    }

    // If not divided yet, subdivide
    if (!this.divided) {
      this.subdivide();
    }

    // Try to insert in subdivisions
    return (
      this.northeast.insert(driver) ||
      this.northwest.insert(driver) ||
      this.southeast.insert(driver) ||
      this.southwest.insert(driver)
    );
  }

  subdivide() {
    const { lat, lng, width, height } = this.boundary;
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    this.northeast = new QuadTree({
      lat: lat + halfHeight / 2,
      lng: lng + halfWidth / 2,
      width: halfWidth,
      height: halfHeight,
    });
    // Create NW, SE, SW similarly...

    this.divided = true;
  }

  // Find all drivers within radius of point
  query(point, radius) {
    const found = [];

    if (!this.boundary.intersects(point, radius)) {
      return found; // Outside boundary
    }

    // Check drivers in this cell
    for (const driver of this.drivers) {
      const distance = this.calculateDistance(point, driver.location);
      if (distance <= radius) {
        found.push({ driver, distance });
      }
    }

    // Recursively search subdivisions
    if (this.divided) {
      found.push(...this.northeast.query(point, radius));
      found.push(...this.northwest.query(point, radius));
      found.push(...this.southeast.query(point, radius));
      found.push(...this.southwest.query(point, radius));
    }

    return found;
  }

  calculateDistance(point1, point2) {
    // Haversine formula for distance between two lat/lng points
    const R = 6371; // Earth radius in km
    const dLat = this.toRad(point2.lat - point1.lat);
    const dLng = this.toRad(point2.lng - point1.lng);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(point1.lat)) *
        Math.cos(this.toRad(point2.lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRad(degrees) {
    return degrees * (Math.PI / 180);
  }
}
```

**Redis Geo Approach (Simpler, Production-Ready):**

```javascript
class LocationService {
  constructor() {
    this.redis = new Redis();
  }

  // Driver updates location
  async updateDriverLocation(driverId, lat, lng) {
    // GEOADD adds/updates driver location
    // key: "drivers:{city}" for sharding by city
    const city = this.getCityFromCoordinates(lat, lng);

    await this.redis.geoadd(
      `drivers:${city}`,
      lng, lat, driverId
    );

    // Set expiry (remove if driver doesn't update in 5 minutes)
    await this.redis.expire(`drivers:${city}`, 300);

    // Also store detailed driver info in hash
    await this.redis.hset(
      `driver:${driverId}`,
      'lat', lat,
      'lng', lng,
      'status', 'available',
      'last_update', Date.now()
    );
  }

  // Find nearby available drivers
  async findNearbyDrivers(riderLat, riderLng, radiusKm = 5, limit = 10) {
    const city = this.getCityFromCoordinates(riderLat, riderLng);

    // GEORADIUS finds all drivers within radius
    const nearbyDrivers = await this.redis.georadius(
      `drivers:${city}`,
      riderLng, riderLat,
      radiusKm, 'km',
      'WITHDIST', // Include distance
      'ASC', // Sort by distance (nearest first)
      'COUNT', limit
    );

    // nearbyDrivers = [[driverId, distance], [driverId, distance], ...]

    // Fetch full driver details
    const driversWithDetails = [];
    for (const [driverId, distance] of nearbyDrivers) {
      const driverInfo = await this.redis.hgetall(`driver:${driverId}`);

      // Only include available drivers
      if (driverInfo.status === 'available') {
        driversWithDetails.push({
          driver_id: driverId,
          distance: parseFloat(distance),
          lat: parseFloat(driverInfo.lat),
          lng: parseFloat(driverInfo.lng),
          rating: parseFloat(driverInfo.rating || 5.0),
        });
      }
    }

    return driversWithDetails;
  }

  getCityFromCoordinates(lat, lng) {
    // Simple geohashing or reverse geocoding
    // For now, divide world into grid cells
    const latBucket = Math.floor(lat / 0.5); // ~50km cells
    const lngBucket = Math.floor(lng / 0.5);
    return `${latBucket}_${lngBucket}`;
  }
}
```

### 💡 **Ride Matching Algorithm**

**Goal**: Match rider with best available driver in < 200ms

**Matching Criteria (Weighted Score):**

| Factor | Weight | Description |
|--------|--------|-------------|
| **Distance** | 50% | Closest driver preferred |
| **ETA** | 30% | Fastest arrival time |
| **Driver Rating** | 10% | Higher rated drivers preferred |
| **Acceptance Rate** | 10% | Drivers who accept more rides |

**Implementation:**

```javascript
class MatchingEngine {
  constructor() {
    this.locationService = new LocationService();
    this.routingService = new RoutingService();
  }

  async matchRider(riderId, pickupLocation) {
    // 1. Find nearby available drivers (within 5km)
    const nearbyDrivers = await this.locationService.findNearbyDrivers(
      pickupLocation.lat,
      pickupLocation.lng,
      radiusKm = 5,
      limit = 20 // Get more drivers for better matching
    );

    if (nearbyDrivers.length === 0) {
      // No drivers available, expand search radius
      return await this.expandSearch(pickupLocation);
    }

    // 2. Calculate ETA for each driver
    const driversWithETA = await Promise.all(
      nearbyDrivers.map(async (driver) => {
        const eta = await this.routingService.calculateETA(
          driver.lat,
          driver.lng,
          pickupLocation.lat,
          pickupLocation.lng
        );

        return { ...driver, eta };
      })
    );

    // 3. Score each driver
    const scoredDrivers = driversWithETA.map((driver) => {
      const distanceScore = this.normalizeDistance(driver.distance);
      const etaScore = this.normalizeETA(driver.eta);
      const ratingScore = driver.rating / 5.0; // 0-1
      const acceptanceScore = driver.acceptance_rate || 0.8;

      const totalScore =
        distanceScore * 0.5 +
        etaScore * 0.3 +
        ratingScore * 0.1 +
        acceptanceScore * 0.1;

      return { ...driver, score: totalScore };
    });

    // 4. Sort by score (highest first)
    scoredDrivers.sort((a, b) => b.score - a.score);

    // 5. Send ride request to top 3 drivers (concurrent offers)
    const topDrivers = scoredDrivers.slice(0, 3);
    const matchedDriver = await this.sendRideRequests(riderId, pickupLocation, topDrivers);

    return matchedDriver;
  }

  normalizeDistance(distanceKm) {
    // Closer is better, normalize to 0-1
    // 0km = 1.0, 5km = 0.0
    return Math.max(0, 1 - distanceKm / 5);
  }

  normalizeETA(etaMinutes) {
    // Faster is better, normalize to 0-1
    // 0 min = 1.0, 15 min = 0.0
    return Math.max(0, 1 - etaMinutes / 15);
  }

  async sendRideRequests(riderId, pickupLocation, drivers) {
    // Send push notifications to drivers
    const requests = drivers.map((driver) =>
      this.sendRideRequestToDriver(riderId, pickupLocation, driver)
    );

    // Wait for first driver to accept (race condition)
    const accepted = await Promise.race(
      requests.map((req) =>
        req.then((response) => {
          if (response.status === 'accepted') {
            // Cancel other requests
            this.cancelOtherRequests(riderId, response.driver_id);
            return response;
          }
          return null;
        })
      )
    );

    // If no driver accepts within 30 seconds, retry with more drivers
    if (!accepted) {
      return await this.expandSearch(pickupLocation);
    }

    return accepted;
  }

  async sendRideRequestToDriver(riderId, pickupLocation, driver) {
    // Store ride request in Redis (30 second TTL)
    const requestId = generateUUID();
    await redis.setex(
      `ride_request:${requestId}`,
      30,
      JSON.stringify({
        rider_id: riderId,
        driver_id: driver.driver_id,
        pickup_location: pickupLocation,
        timestamp: Date.now(),
      })
    );

    // Send push notification to driver
    await notificationService.sendPush(driver.driver_id, {
      type: 'ride_request',
      request_id: requestId,
      pickup_location: pickupLocation,
      estimated_fare: await this.estimateFare(pickupLocation, driver),
    });

    // Return promise that resolves when driver accepts/rejects
    return this.waitForDriverResponse(requestId, timeoutMs = 30000);
  }

  async waitForDriverResponse(requestId, timeoutMs) {
    return new Promise((resolve, reject) => {
      // Subscribe to Redis pub/sub for driver response
      const subscriber = redis.duplicate();
      subscriber.subscribe(`response:${requestId}`);

      subscriber.on('message', (channel, message) => {
        const response = JSON.parse(message);
        subscriber.unsubscribe();
        resolve(response);
      });

      // Timeout if no response
      setTimeout(() => {
        subscriber.unsubscribe();
        reject(new Error('Driver did not respond'));
      }, timeoutMs);
    });
  }
}
```

### 💡 **Real-time Location Tracking**

**WebSocket Connection for Live Updates:**

```javascript
// Driver-side location updates
class DriverLocationUpdater {
  constructor(driverId, authToken) {
    this.driverId = driverId;
    this.ws = null;
    this.updateInterval = null;
  }

  connect() {
    this.ws = new WebSocket(`wss://api.uber.com/ws/driver/${this.driverId}`);

    this.ws.onopen = () => {
      console.log('Connected to location service');
      this.startLocationUpdates();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.reconnect();
    };
  }

  startLocationUpdates() {
    // Send location every 4 seconds (15 updates/min)
    this.updateInterval = setInterval(() => {
      navigator.geolocation.getCurrentPosition((position) => {
        const location = {
          type: 'location_update',
          driver_id: this.driverId,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          heading: position.coords.heading, // Direction of travel
          speed: position.coords.speed, // m/s
          timestamp: Date.now(),
        };

        this.ws.send(JSON.stringify(location));
      });
    }, 4000); // Every 4 seconds
  }

  stopLocationUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }

  reconnect() {
    setTimeout(() => {
      this.connect();
    }, 5000); // Retry after 5 seconds
  }
}

// Server-side location handling
class LocationWebSocketServer {
  constructor() {
    this.wss = new WebSocket.Server({ port: 8080 });
    this.locationService = new LocationService();
    this.connections = new Map(); // driverId -> WebSocket
  }

  start() {
    this.wss.on('connection', (ws, req) => {
      const driverId = this.extractDriverId(req);

      // Store connection
      this.connections.set(driverId, ws);

      ws.on('message', async (data) => {
        const message = JSON.parse(data);

        if (message.type === 'location_update') {
          await this.handleLocationUpdate(message);
        }
      });

      ws.on('close', () => {
        this.connections.delete(driverId);
        // Mark driver as offline
        this.locationService.markDriverOffline(driverId);
      });
    });
  }

  async handleLocationUpdate(message) {
    const { driver_id, lat, lng, heading, speed } = message;

    // 1. Update driver location in Redis Geo
    await this.locationService.updateDriverLocation(driver_id, lat, lng);

    // 2. Store in Cassandra for trip history
    await cassandra.execute(
      `INSERT INTO location_history (driver_id, lat, lng, heading, speed, timestamp)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [driver_id, lat, lng, heading, speed, Date.now()]
    );

    // 3. Check if driver is on active trip
    const activeTrip = await redis.get(`active_trip:${driver_id}`);
    if (activeTrip) {
      const trip = JSON.parse(activeTrip);

      // Broadcast location to rider via WebSocket
      const riderWs = this.connections.get(trip.rider_id);
      if (riderWs) {
        riderWs.send(JSON.stringify({
          type: 'driver_location',
          driver_id: driver_id,
          lat: lat,
          lng: lng,
          heading: heading,
          eta: await this.calculateETA(driver_id, trip.destination),
        }));
      }
    }
  }
}
```

### 💡 **Fare Calculation & Surge Pricing**

**Base Fare Calculation:**

```javascript
class FareService {
  async calculateFare(trip) {
    const { distance_km, duration_minutes, pickup_location, dropoff_location, timestamp } = trip;

    // Base fare components
    const baseFare = 2.50; // Fixed pickup fee
    const perKm = 1.50; // Cost per kilometer
    const perMinute = 0.30; // Cost per minute
    const minimumFare = 5.00;

    // Calculate base price
    let totalFare = baseFare + (distance_km * perKm) + (duration_minutes * perMinute);

    // Apply surge multiplier
    const surgeMultiplier = await this.getSurgeMultiplier(
      pickup_location,
      timestamp
    );
    totalFare *= surgeMultiplier;

    // Apply minimum fare
    totalFare = Math.max(totalFare, minimumFare);

    // Round to 2 decimal places
    totalFare = Math.round(totalFare * 100) / 100;

    return {
      base_fare: baseFare,
      distance_fare: distance_km * perKm,
      time_fare: duration_minutes * perMinute,
      surge_multiplier: surgeMultiplier,
      total_fare: totalFare,
    };
  }

  async getSurgeMultiplier(location, timestamp) {
    // Check supply vs demand in area
    const cell = this.getGeoCell(location.lat, location.lng);

    // Get from cache (updated every 5 minutes)
    const cached = await redis.get(`surge:${cell}`);
    if (cached) {
      return parseFloat(cached);
    }

    // Calculate surge based on supply/demand ratio
    const availableDrivers = await this.countAvailableDrivers(cell);
    const activeRides = await this.countActiveRides(cell);
    const pendingRequests = await this.countPendingRequests(cell);

    const demand = activeRides + pendingRequests;
    const supply = availableDrivers;

    let surgeMultiplier = 1.0;

    if (supply === 0) {
      surgeMultiplier = 2.5; // Max surge
    } else {
      const ratio = demand / supply;

      if (ratio < 0.5) {
        surgeMultiplier = 1.0; // Normal pricing
      } else if (ratio < 1.0) {
        surgeMultiplier = 1.2;
      } else if (ratio < 1.5) {
        surgeMultiplier = 1.5;
      } else if (ratio < 2.0) {
        surgeMultiplier = 1.8;
      } else {
        surgeMultiplier = 2.5; // Max surge (2.5x)
      }
    }

    // Cache for 5 minutes
    await redis.setex(`surge:${cell}`, 300, surgeMultiplier.toString());

    // Notify riders in area about surge pricing
    await this.broadcastSurgePricing(cell, surgeMultiplier);

    return surgeMultiplier;
  }

  getGeoCell(lat, lng) {
    // Divide area into 1km x 1km cells
    const latCell = Math.floor(lat * 100); // ~1km precision
    const lngCell = Math.floor(lng * 100);
    return `${latCell}_${lngCell}`;
  }
}
```

### 💡 **Trip State Machine**

**Trip States:**

```
REQUESTED → DRIVER_ASSIGNED → DRIVER_ARRIVED → IN_PROGRESS → COMPLETED
     │             │                  │              │            │
     └─────────────┴──────────────────┴──────────────┴────────────┴→ CANCELLED
```

**Implementation:**

```javascript
class TripStateMachine {
  async createTrip(riderId, pickupLocation, dropoffLocation) {
    const tripId = generateUUID();

    const trip = {
      trip_id: tripId,
      rider_id: riderId,
      pickup_location: pickupLocation,
      dropoff_location: dropoffLocation,
      status: 'REQUESTED',
      created_at: Date.now(),
    };

    // Store in PostgreSQL
    await db.trips.insertOne(trip);

    // Store in Redis for fast access during active trip
    await redis.setex(`trip:${tripId}`, 3600, JSON.stringify(trip));

    return tripId;
  }

  async assignDriver(tripId, driverId) {
    const trip = await this.getTrip(tripId);

    if (trip.status !== 'REQUESTED') {
      throw new Error('Trip already assigned or in invalid state');
    }

    // Update trip status
    trip.status = 'DRIVER_ASSIGNED';
    trip.driver_id = driverId;
    trip.assigned_at = Date.now();

    // Update in database
    await db.trips.updateOne(
      { trip_id: tripId },
      { $set: { status: trip.status, driver_id: driverId, assigned_at: trip.assigned_at } }
    );

    // Update Redis cache
    await redis.setex(`trip:${tripId}`, 3600, JSON.stringify(trip));

    // Mark driver as busy
    await redis.hset(`driver:${driverId}`, 'status', 'on_trip');
    await redis.setex(`active_trip:${driverId}`, 3600, JSON.stringify(trip));

    // Notify rider
    await notificationService.sendPush(trip.rider_id, {
      type: 'driver_assigned',
      driver_id: driverId,
      driver_name: await this.getDriverName(driverId),
      driver_rating: await this.getDriverRating(driverId),
      eta: await this.calculateETA(driverId, trip.pickup_location),
    });

    return trip;
  }

  async startTrip(tripId, driverId) {
    const trip = await this.getTrip(tripId);

    if (trip.status !== 'DRIVER_ARRIVED') {
      throw new Error('Cannot start trip - driver not arrived');
    }

    if (trip.driver_id !== driverId) {
      throw new Error('Unauthorized driver');
    }

    // Update status
    trip.status = 'IN_PROGRESS';
    trip.started_at = Date.now();

    await db.trips.updateOne(
      { trip_id: tripId },
      { $set: { status: trip.status, started_at: trip.started_at } }
    );

    await redis.setex(`trip:${tripId}`, 3600, JSON.stringify(trip));

    // Notify rider
    await notificationService.sendPush(trip.rider_id, {
      type: 'trip_started',
      trip_id: tripId,
    });

    return trip;
  }

  async completeTrip(tripId, driverId, finalLocation) {
    const trip = await this.getTrip(tripId);

    if (trip.status !== 'IN_PROGRESS') {
      throw new Error('Trip not in progress');
    }

    // Calculate trip metrics
    const duration_minutes = (Date.now() - trip.started_at) / 60000;
    const distance_km = await this.calculateTripDistance(tripId);

    // Calculate fare
    const fare = await fareService.calculateFare({
      distance_km: distance_km,
      duration_minutes: duration_minutes,
      pickup_location: trip.pickup_location,
      dropoff_location: finalLocation,
      timestamp: trip.started_at,
    });

    // Update trip
    trip.status = 'COMPLETED';
    trip.completed_at = Date.now();
    trip.dropoff_location = finalLocation;
    trip.duration_minutes = duration_minutes;
    trip.distance_km = distance_km;
    trip.fare = fare;

    await db.trips.updateOne(
      { trip_id: tripId },
      { $set: {
        status: trip.status,
        completed_at: trip.completed_at,
        dropoff_location: finalLocation,
        duration_minutes: duration_minutes,
        distance_km: distance_km,
        fare: fare,
      } }
    );

    // Mark driver as available
    await redis.hset(`driver:${driverId}`, 'status', 'available');
    await redis.del(`active_trip:${driverId}`);

    // Process payment
    await paymentService.chargeRider(trip.rider_id, fare.total_fare);

    // Notify rider
    await notificationService.sendPush(trip.rider_id, {
      type: 'trip_completed',
      trip_id: tripId,
      fare: fare.total_fare,
    });

    return trip;
  }

  async calculateTripDistance(tripId) {
    // Fetch location history from Cassandra
    const locations = await cassandra.execute(
      `SELECT lat, lng, timestamp FROM location_history
       WHERE trip_id = ? ORDER BY timestamp ASC`,
      [tripId]
    );

    // Calculate total distance using Haversine formula
    let totalDistance = 0;
    for (let i = 1; i < locations.length; i++) {
      const dist = this.haversineDistance(
        locations[i - 1].lat, locations[i - 1].lng,
        locations[i].lat, locations[i].lng
      );
      totalDistance += dist;
    }

    return totalDistance;
  }
}
```

## Database Schema

### 💡 **PostgreSQL (Users, Trips, Payments)**

```sql
-- Users table
CREATE TABLE users (
  user_id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  user_type VARCHAR(10) NOT NULL, -- 'rider' or 'driver'
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_email (email),
  INDEX idx_phone (phone)
);

-- Drivers table (extends users)
CREATE TABLE drivers (
  driver_id UUID PRIMARY KEY REFERENCES users(user_id),
  vehicle_type VARCHAR(50) NOT NULL, -- 'sedan', 'suv', 'luxury'
  license_plate VARCHAR(20) NOT NULL,
  rating DECIMAL(3, 2) DEFAULT 5.0,
  total_trips INT DEFAULT 0,
  acceptance_rate DECIMAL(3, 2) DEFAULT 1.0,
  status VARCHAR(20) DEFAULT 'offline', -- 'available', 'on_trip', 'offline'
  INDEX idx_status (status),
  INDEX idx_rating (rating DESC)
);

-- Trips table
CREATE TABLE trips (
  trip_id UUID PRIMARY KEY,
  rider_id UUID NOT NULL REFERENCES users(user_id),
  driver_id UUID REFERENCES drivers(driver_id),
  status VARCHAR(20) NOT NULL, -- 'REQUESTED', 'DRIVER_ASSIGNED', etc.
  pickup_location JSONB NOT NULL, -- { lat, lng, address }
  dropoff_location JSONB,
  distance_km DECIMAL(10, 2),
  duration_minutes INT,
  fare JSONB, -- { base_fare, distance_fare, time_fare, surge_multiplier, total }
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  INDEX idx_rider (rider_id, created_at DESC),
  INDEX idx_driver (driver_id, created_at DESC),
  INDEX idx_status (status),
  INDEX idx_created (created_at DESC)
);

-- Payments table
CREATE TABLE payments (
  payment_id UUID PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES trips(trip_id),
  rider_id UUID NOT NULL REFERENCES users(user_id),
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL, -- 'card', 'paypal', 'cash'
  status VARCHAR(20) NOT NULL, -- 'pending', 'completed', 'failed', 'refunded'
  transaction_id VARCHAR(100), -- Stripe/payment gateway transaction ID
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_trip (trip_id),
  INDEX idx_rider (rider_id, created_at DESC),
  INDEX idx_status (status)
);

-- Ratings table
CREATE TABLE ratings (
  rating_id UUID PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES trips(trip_id),
  from_user_id UUID NOT NULL REFERENCES users(user_id),
  to_user_id UUID NOT NULL REFERENCES users(user_id),
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_trip (trip_id),
  INDEX idx_to_user (to_user_id)
);
```

### 💡 **Redis (Active State & Geospatial)**

```
# Active driver locations (Redis Geo)
drivers:{city} → GEOADD (lng, lat, driver_id)

# Driver details
driver:{driver_id} → HASH {
  lat, lng, status, rating, acceptance_rate, last_update
}

# Active trips
trip:{trip_id} → JSON (TTL: 1 hour)
active_trip:{driver_id} → trip JSON (TTL: 1 hour)

# Ride requests (pending driver acceptance)
ride_request:{request_id} → JSON (TTL: 30 seconds)

# Surge pricing by geo cell
surge:{cell_id} → float (TTL: 5 minutes)

# Driver session (WebSocket connection mapping)
session:{driver_id} → websocket_server_id
```

### 💡 **Cassandra (Location History, Trip Logs)**

```sql
-- Location history (time-series data)
CREATE TABLE location_history (
  driver_id UUID,
  timestamp BIGINT,
  trip_id UUID,
  lat DOUBLE,
  lng DOUBLE,
  heading DOUBLE,
  speed DOUBLE,
  PRIMARY KEY ((driver_id), timestamp)
) WITH CLUSTERING ORDER BY (timestamp DESC);

-- Trip timeline (for analytics)
CREATE TABLE trip_timeline (
  trip_id UUID,
  timestamp BIGINT,
  event_type TEXT, -- 'REQUESTED', 'ASSIGNED', 'STARTED', 'COMPLETED'
  data TEXT, -- JSON with event details
  PRIMARY KEY ((trip_id), timestamp)
) WITH CLUSTERING ORDER BY (timestamp ASC);
```

## API Design

### 💡 **REST API Endpoints**

**Rider APIs:**
```http
POST /api/riders/request-ride
Content-Type: application/json
Authorization: Bearer {token}

{
  "pickup_location": {
    "lat": 37.7749,
    "lng": -122.4194,
    "address": "123 Market St, SF"
  },
  "dropoff_location": {
    "lat": 37.8044,
    "lng": -122.2712,
    "address": "Oakland Airport"
  },
  "ride_type": "uberX"
}

Response:
{
  "trip_id": "uuid",
  "estimated_fare": {
    "min": 25.00,
    "max": 35.00,
    "surge_multiplier": 1.5
  },
  "estimated_duration": 25,
  "status": "searching_driver"
}
```

**Get Trip Status:**
```http
GET /api/trips/{trip_id}
Authorization: Bearer {token}

Response:
{
  "trip_id": "uuid",
  "status": "DRIVER_ASSIGNED",
  "driver": {
    "driver_id": "uuid",
    "name": "John Doe",
    "rating": 4.8,
    "vehicle": "Toyota Camry",
    "license_plate": "ABC123",
    "current_location": {
      "lat": 37.7749,
      "lng": -122.4194
    },
    "eta": 5
  },
  "pickup_location": {...},
  "dropoff_location": {...}
}
```

**Driver APIs:**
```http
POST /api/drivers/status
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "available", // or "offline"
  "location": {
    "lat": 37.7749,
    "lng": -122.4194
  }
}

Response:
{
  "status": "available",
  "nearby_demand": "high",
  "surge_zones": [
    {
      "area": "Downtown SF",
      "multiplier": 1.8
    }
  ]
}
```

**Accept Ride:**
```http
POST /api/drivers/accept-ride/{request_id}
Authorization: Bearer {token}

Response:
{
  "trip_id": "uuid",
  "rider": {
    "name": "Jane Smith",
    "rating": 4.9,
    "pickup_location": {...}
  },
  "estimated_fare": 28.50
}
```

## Deep Dives

### 💡 **ETA Calculation**

**Hybrid Approach: ML Model + Google Maps API**

```javascript
class ETAService {
  async calculateETA(fromLat, fromLng, toLat, toLng) {
    // 1. Quick estimation using Haversine distance + average speed
    const straightLineDistance = this.haversineDistance(fromLat, fromLng, toLat, toLng);
    const averageSpeed = 30; // km/h in city
    const quickEstimate = (straightLineDistance / averageSpeed) * 60; // minutes

    // If distance is very short, return quick estimate
    if (straightLineDistance < 1) {
      return Math.ceil(quickEstimate);
    }

    // 2. Use Google Maps Directions API for accurate routing
    try {
      const directions = await this.googleMapsAPI.getDirections({
        origin: `${fromLat},${fromLng}`,
        destination: `${toLat},${toLng}`,
        mode: 'driving',
        departure_time: 'now', // Considers current traffic
      });

      const duration = directions.routes[0].legs[0].duration_in_traffic.value / 60; // minutes

      // 3. Apply ML model to adjust based on historical data
      const adjustedETA = await this.mlModel.predict({
        raw_eta: duration,
        time_of_day: new Date().getHours(),
        day_of_week: new Date().getDay(),
        weather: await this.getWeatherConditions(),
        distance: straightLineDistance,
      });

      return Math.ceil(adjustedETA);
    } catch (error) {
      // Fallback to quick estimate if API fails
      console.error('Google Maps API error:', error);
      return Math.ceil(quickEstimate);
    }
  }
}
```

### 💡 **Handling Driver Rejections**

**Cascade matching with timeout:**

```javascript
async function matchWithRetry(riderId, pickupLocation, maxAttempts = 5) {
  let attempt = 0;
  let radiusKm = 5;

  while (attempt < maxAttempts) {
    const drivers = await locationService.findNearbyDrivers(
      pickupLocation.lat,
      pickupLocation.lng,
      radiusKm,
      limit = 10
    );

    if (drivers.length === 0) {
      // No drivers available, expand radius
      radiusKm += 5;
      attempt++;
      continue;
    }

    // Try to match with top 3 drivers
    for (const driver of drivers.slice(0, 3)) {
      const accepted = await sendRideRequest(riderId, pickupLocation, driver, timeoutSec = 15);

      if (accepted) {
        return accepted;
      }
    }

    // All drivers rejected, try next batch
    attempt++;
    radiusKm += 2; // Slightly expand search
  }

  // No driver accepted after all attempts
  throw new Error('No drivers available. Please try again later.');
}
```

### 💡 **Payment Processing**

**Asynchronous payment with retries:**

```javascript
class PaymentService {
  async processPayment(tripId, riderId, amount) {
    try {
      // 1. Create payment intent with Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        customer: await this.getStripeCustomerId(riderId),
        payment_method: await this.getDefaultPaymentMethod(riderId),
        off_session: true, // Charge without customer present
        confirm: true,
      });

      // 2. Store payment record
      await db.payments.insertOne({
        payment_id: generateUUID(),
        trip_id: tripId,
        rider_id: riderId,
        amount: amount,
        payment_method: 'card',
        status: 'completed',
        transaction_id: paymentIntent.id,
        created_at: Date.now(),
      });

      // 3. Transfer to driver (minus commission)
      const driverShare = amount * 0.75; // Uber takes 25% commission
      await this.transferToDriver(tripId, driverShare);

      return { status: 'success', transaction_id: paymentIntent.id };
    } catch (error) {
      console.error('Payment failed:', error);

      // Store failed payment for retry
      await db.payments.insertOne({
        payment_id: generateUUID(),
        trip_id: tripId,
        rider_id: riderId,
        amount: amount,
        payment_method: 'card',
        status: 'failed',
        error_message: error.message,
        created_at: Date.now(),
      });

      // Queue for retry
      await kafka.send({
        topic: 'payment-retries',
        value: JSON.stringify({ trip_id: tripId, rider_id: riderId, amount, retry_count: 0 }),
      });

      throw error;
    }
  }

  async retryFailedPayment(tripId, riderId, amount, retryCount) {
    const MAX_RETRIES = 5;

    if (retryCount >= MAX_RETRIES) {
      // Send notification to support team
      await this.notifyPaymentFailure(tripId, riderId, amount);
      return;
    }

    // Wait before retry (exponential backoff)
    await sleep(Math.min(1000 * Math.pow(2, retryCount), 60000));

    try {
      await this.processPayment(tripId, riderId, amount);
    } catch (error) {
      // Queue for another retry
      await kafka.send({
        topic: 'payment-retries',
        value: JSON.stringify({ trip_id: tripId, rider_id: riderId, amount, retry_count: retryCount + 1 }),
      });
    }
  }
}
```

## Trade-offs & Bottlenecks

### 💡 **Key Trade-offs**

| Decision | Chosen Approach | Alternative | Rationale |
|----------|----------------|-------------|-----------|
| **Location Storage** | Redis Geo | PostgreSQL PostGIS | Sub-second geospatial queries at scale |
| **Matching Algorithm** | Concurrent offers to top 3 drivers | Sequential (one-by-one) | Faster matching, better rider experience |
| **WebSocket vs Polling** | WebSocket for active trips | HTTP polling | Real-time updates, lower latency |
| **Payment Timing** | End of trip (async) | Upfront authorization | Better UX, rider doesn't wait |
| **Surge Pricing** | Cell-based (1km grid) | Real-time per request | Simpler, cacheable, fair pricing |

### 💡 **Potential Bottlenecks**

| Component | Bottleneck | Solution |
|-----------|-----------|----------|
| **Matching Engine** | Single region bottleneck | Shard by geographic region (US-West, US-East, EU, APAC) |
| **Redis Geo** | Memory limit for active drivers | Shard by city/region, use Redis Cluster |
| **WebSocket Servers** | Connection limit | Horizontal scaling, 100K connections per server |
| **Google Maps API** | Rate limits (100K req/day) | Cache routes, use own routing service for common routes |
| **Database Writes** | High write load for location updates | Use Cassandra (write-optimized), batch writes |

### 💡 **Failure Scenarios**

| Failure | Impact | Mitigation |
|---------|--------|------------|
| **Matching Engine Down** | No new rides | Multi-region deployment, automatic failover |
| **Redis Down** | Can't find nearby drivers | Use PostgreSQL PostGIS as fallback (slower) |
| **WebSocket Server Crash** | Riders lose live tracking | Auto-reconnect, fallback to HTTP polling |
| **Payment Gateway Down** | Can't charge riders | Queue for later processing, allow trip to complete |
| **Driver GPS Failure** | Inaccurate tracking | Use last known location + estimated route |

## Interview Discussion Points

**Q: How do you ensure riders get matched quickly (<30 seconds)?**

A:
1. **Geospatial Indexing**: Redis Geo for sub-100ms nearby driver queries
2. **Concurrent Offers**: Send to top 3 drivers simultaneously (race condition)
3. **Expanding Search**: Incrementally increase search radius if no accepts
4. **Pre-computation**: Cache surge pricing, driver ratings for fast scoring
5. **Regional Sharding**: Separate matching engines per geographic region

**Q: How do you handle surge pricing fairly?**

A:
1. **Grid-Based Cells**: Divide city into 1km cells for consistent pricing
2. **5-Minute Windows**: Update surge every 5 minutes (not per-request)
3. **Transparent Communication**: Show riders surge multiplier before confirming
4. **Supply Incentives**: Notify drivers about surge zones to increase supply
5. **Caps**: Maximum 2.5x surge to prevent extreme prices

**Q: What happens if a driver's app crashes during a trip?**

A:
1. **Grace Period**: Wait 60 seconds for reconnection
2. **Last Known Location**: Show rider last known position
3. **Estimated Route**: Display estimated route based on navigation
4. **Driver Callback**: Call driver to confirm trip status
5. **Rider Options**: Allow rider to cancel without penalty after 5 minutes

**Q: How do you prevent fake GPS spoofing by drivers?**

A:
1. **ML Anomaly Detection**: Detect impossible speeds/teleportation
2. **Historical Patterns**: Compare with driver's historical behavior
3. **Device Sensors**: Verify GPS with accelerometer/gyroscope data
4. **Cell Tower Triangulation**: Cross-check GPS with cell tower location
5. **Manual Review**: Flag suspicious trips for support team review

**Q: How would you scale to support 100 million concurrent users?**

A:
1. **Geographic Sharding**: Separate infrastructure per region/country
2. **Microservices**: Independent scaling of matching, location, payment services
3. **Redis Clustering**: 100+ node Redis cluster sharded by city
4. **Cassandra Cluster**: 500+ nodes for location history (write-heavy)
5. **Edge Locations**: Deploy WebSocket servers in multiple data centers

## Follow-up Enhancements

**Additional Features:**

1. **Scheduled Rides**: Book rides in advance (cron-based scheduler)
2. **Carpooling (UberPool)**: Match multiple riders going same direction
3. **In-App Navigation**: Turn-by-turn directions for drivers
4. **Safety Features**: SOS button, trip sharing with contacts
5. **Driver Earnings Dashboard**: Real-time earnings, weekly summaries
6. **Rider Loyalty Program**: Points, discounts for frequent riders
7. **Multi-Stop Trips**: Add stops along the way
8. **Accessibility**: Wheelchair-accessible vehicles, service animals

**Monitoring & Observability:**

- **Metrics**: Matching time, acceptance rate, trip completion rate, revenue
- **Alerts**: Surge spikes, driver availability drops, payment failures
- **Dashboards**: Real-time map of active trips, driver heatmap, revenue
- **Tracing**: Distributed tracing with Jaeger (rider request → trip completion)

## Summary

**Key Architectural Decisions:**

1. ✅ **Redis Geo for Driver Locations**: Sub-second geospatial queries
2. ✅ **WebSocket for Real-time Tracking**: Low-latency location updates
3. ✅ **Concurrent Matching**: Offer to multiple drivers simultaneously
4. ✅ **Cell-Based Surge Pricing**: Fair, predictable, cacheable
5. ✅ **Cassandra for Location History**: Write-optimized time-series data
6. ✅ **Regional Sharding**: Independent systems per geographic region
7. ✅ **Async Payments**: Don't block trip completion on payment

**Scale:**
- 20M DAU, 15M rides/day
- 500K concurrent active trips
- 333K location updates/sec
- Sub-200ms matching latency
- 99.99% availability

**Trade-offs:**
- Concurrent offers (faster matching) vs sequential (fairness)
- WebSocket (real-time) vs HTTP polling (simpler)
- Redis Geo (fast, in-memory) vs PostGIS (persistent, slower)
- Async payments (better UX) vs sync (guaranteed payment)

---
[← Back to SystemDesign](../README.md)
