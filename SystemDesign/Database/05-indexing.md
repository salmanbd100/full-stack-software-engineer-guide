# Database Indexing

## Overview

### 💡 **What is Database Indexing?**

Database indexing is a data structure technique that improves the speed of data retrieval operations on database tables at the cost of additional storage space and write performance.

**How It Works:**

An index creates a separate data structure (typically a B-Tree or Hash table) that stores a subset of table data in an organized way, allowing the database to find rows much faster than scanning the entire table.

**Analogy:**
> Think of a book index. Instead of reading every page to find "replication", you look at the index at the back, which tells you the exact pages. Database indexes work the same way.

**Key Characteristics:**

| Without Index | With Index |
|--------------|------------|
| Full table scan - O(n) | Index lookup - O(log n) or O(1) |
| Reads all rows sequentially | Reads only necessary rows |
| Fast writes, slow reads | Slower writes, fast reads |
| No extra storage | Extra storage for index |

**Performance Impact:**

```
Query: SELECT * FROM users WHERE email = 'john@example.com';

Without index:
- Scans 1,000,000 rows
- Time: ~500ms

With index on email:
- Index lookup: 3-4 levels in B-Tree
- Time: ~2ms
```

---

## Core Index Types

### 1️⃣ **B-Tree Indexes (Most Common)**

The default index type in most databases (PostgreSQL, MySQL, Oracle, SQL Server).

**How It Works:**

B-Tree (Balanced Tree) maintains sorted data in a tree structure with multiple keys per node.

**Structure:**

```
                    [50]
                   /    \
              [25,35]    [75,85]
              /  |  \    /  |  \
           [10] [30] [40] [60] [80] [90]
              |    |    |    |    |    |
           [data][data][data][data][data][data]
```

**Characteristics:**

1. **Self-Balancing:**
   - Automatically reorganizes as data is inserted/deleted
   - Maintains O(log n) performance
   - All leaf nodes at same depth

2. **Range Queries:**
   - Efficient for `>`, `<`, `BETWEEN`, `ORDER BY`
   - Leaf nodes are linked (like a linked list)
   - Can scan ranges without returning to root

3. **Sorted Storage:**
   - Keys stored in sorted order
   - Perfect for equality and range searches
   - Supports prefix matching (`LIKE 'abc%'`)

**When to Use:**

| ✅ Good For | ❌ Bad For |
|------------|-----------|
| Equality searches (`=`) | Low cardinality columns |
| Range queries (`>`, `<`, `BETWEEN`) | Columns with many NULLs |
| Sorting (`ORDER BY`) | Columns updated frequently |
| Prefix matching (`LIKE 'abc%'`) | Small tables (<1000 rows) |
| Foreign keys | Columns with long text |

**SQL Examples:**

```sql
-- Create B-Tree index (default)
CREATE INDEX idx_users_email ON users(email);

-- Range query benefits
SELECT * FROM orders
WHERE created_at BETWEEN '2024-01-01' AND '2024-12-31'
ORDER BY created_at;

-- Prefix matching benefits
SELECT * FROM products
WHERE name LIKE 'iPhone%';
```

**Performance:**

```
Time Complexity:
- Search: O(log n)
- Insert: O(log n)
- Delete: O(log n)
- Range Scan: O(log n + k) where k = result size

Space: O(n) - typically 20-30% of table size
```

---

### 2️⃣ **Hash Indexes**

Uses hash function to map keys to bucket locations. Provides O(1) lookup for equality searches.

**How It Works:**

```
Key: "john@example.com"
       ↓
Hash Function: MD5/SHA
       ↓
Hash: 7a3e2b1f... → Bucket 42
       ↓
Data: Row pointer
```

**Characteristics:**

1. **O(1) Equality Lookup:**
   - Faster than B-Tree for exact matches
   - Hash directly to data location
   - No tree traversal needed

2. **No Range Queries:**
   - Cannot perform `>`, `<`, `BETWEEN`
   - Cannot use for `ORDER BY`
   - Cannot do prefix matching

3. **Memory-Resident:**
   - Often used for in-memory databases
   - PostgreSQL hash indexes are on-disk
   - Redis uses hash indexes internally

**Comparison:**

| Feature | B-Tree | Hash |
|---------|--------|------|
| **Equality (=)** | O(log n) | O(1) ✨ |
| **Range (<, >)** | ✅ O(log n) | ❌ Not supported |
| **Sorting** | ✅ Efficient | ❌ Not supported |
| **Prefix match** | ✅ Supported | ❌ Not supported |
| **Storage** | Disk | Often memory |

**When to Use:**

✅ **Use Hash Index:**
- Only equality searches (`=`)
- High-cardinality columns (unique or near-unique)
- In-memory databases (Redis, Memcached)
- Session lookups, cache keys

❌ **Don't Use Hash Index:**
- Need range queries
- Need sorting
- Need prefix matching
- Low-cardinality columns

**SQL Examples:**

```sql
-- PostgreSQL hash index
CREATE INDEX idx_users_email_hash ON users USING HASH (email);

-- Good: Equality search
SELECT * FROM users WHERE email = 'john@example.com';

-- Bad: Range query (won't use hash index)
SELECT * FROM users WHERE email > 'john@example.com';
```

**Real-World Example - Redis:**

```javascript
// Redis uses hash indexes internally
const redis = require('redis');
const client = redis.createClient();

// O(1) lookup by session ID
await client.hset('session:abc123', {
  userId: '12345',
  username: 'john',
  loginTime: Date.now()
});

// O(1) retrieval
const session = await client.hgetall('session:abc123');
```

---

### 3️⃣ **Bitmap Indexes**

Stores presence/absence of values as bitmaps. Extremely efficient for low-cardinality columns.

**How It Works:**

**Table:**
```
user_id | gender | country
1       | M      | US
2       | F      | UK
3       | M      | US
4       | F      | CA
5       | M      | US
```

**Bitmap Index on `gender`:**
```
Value 'M': 10101  (users 1, 3, 5)
Value 'F': 01010  (users 2, 4)
```

**Bitmap Index on `country`:**
```
Value 'US': 10101  (users 1, 3, 5)
Value 'UK': 01000  (user 2)
Value 'CA': 00010  (user 4)
```

**Query with Bitmap:**
```sql
SELECT * FROM users WHERE gender = 'M' AND country = 'US';

Bitmap operation:
  gender='M':  10101
  country='US': 10101
  AND result:  10101  → users 1, 3, 5
```

**Characteristics:**

1. **Bitwise Operations:**
   - AND, OR, NOT operations on bits
   - Extremely fast using CPU instructions
   - Can combine multiple conditions efficiently

2. **Low Cardinality Optimization:**
   - Best for columns with few distinct values
   - Gender: 2-3 values
   - Boolean flags: 2 values
   - Status: 3-5 values
   - Country: 50-200 values

3. **Compression:**
   - Uses bitmap compression (RLE - Run Length Encoding)
   - Very space-efficient for sparse data
   - Can be smaller than B-Tree for low cardinality

**When to Use:**

| ✅ Good For | ❌ Bad For |
|------------|-----------|
| Boolean columns | High cardinality (millions of distinct values) |
| Status/category (3-10 values) | OLTP with frequent updates |
| Gender, country, region | Unique or near-unique columns |
| Data warehouse queries | Transactional databases |
| Multiple AND/OR conditions | Single column equality |

**Performance:**

```
Cardinality: 5 distinct values in 1M rows

B-Tree Index:
- Size: ~30MB
- Query: O(log n) = ~20 disk reads

Bitmap Index:
- Size: ~600KB (50x smaller)
- Query: Bitwise AND in memory (microseconds)
```

**SQL Examples:**

```sql
-- Oracle bitmap index
CREATE BITMAP INDEX idx_orders_status ON orders(status);

-- Excellent: Multiple low-cardinality conditions
SELECT * FROM orders
WHERE status = 'shipped'
  AND payment_method = 'credit_card'
  AND country = 'US';

-- Bitwise operation on 3 bitmaps
-- Extremely fast, single pass
```

**Real-World Example - Data Warehouse:**

```sql
-- E-commerce analytics
CREATE BITMAP INDEX idx_orders_payment ON orders(payment_method);
CREATE BITMAP INDEX idx_orders_country ON orders(country);
CREATE BITMAP INDEX idx_orders_status ON orders(status);

-- Complex analytical query
SELECT COUNT(*), AVG(amount)
FROM orders
WHERE payment_method IN ('credit_card', 'paypal')
  AND country IN ('US', 'UK', 'CA')
  AND status = 'completed'
  AND created_at >= '2024-01-01';

-- Bitmap indexes make this extremely fast
-- Bitwise operations on 3 bitmaps, then aggregate
```

---

### 4️⃣ **Full-Text Indexes (Inverted Index)**

Specialized for text search queries. Used by search engines and full-text search features.

**How It Works:**

**Inverted Index Structure:**

```
Document 1: "The quick brown fox"
Document 2: "The lazy brown dog"
Document 3: "Quick brown animals"

Inverted Index:
┌──────────┬─────────────────┐
│ Term     │ Document IDs    │
├──────────┼─────────────────┤
│ quick    │ [1, 3]         │
│ brown    │ [1, 2, 3]      │
│ fox      │ [1]            │
│ lazy     │ [2]            │
│ dog      │ [2]            │
│ animals  │ [3]            │
└──────────┴─────────────────┘
```

**Characteristics:**

1. **Text Processing:**
   - Tokenization (split text into words)
   - Stemming (running → run)
   - Stop word removal (the, a, an)
   - Case normalization

2. **Relevance Ranking:**
   - TF-IDF scoring (Term Frequency-Inverse Document Frequency)
   - BM25 algorithm
   - Phrase proximity
   - Boolean operators (AND, OR, NOT)

3. **Performance:**
   - Much faster than `LIKE '%keyword%'`
   - Scales to billions of documents
   - Supports complex search queries

**When to Use:**

| ✅ Good For | ❌ Bad For |
|------------|-----------|
| Search features (product search, article search) | Exact string matching |
| Blog/article content | Numerical data |
| Product descriptions | Short text (<10 words) |
| Document management | Binary data |
| Multi-word queries | Frequent updates |

**SQL Examples:**

**PostgreSQL (GIN Index):**

```sql
-- Create full-text index
CREATE INDEX idx_articles_content
ON articles USING GIN (to_tsvector('english', content));

-- Full-text search
SELECT * FROM articles
WHERE to_tsvector('english', content) @@ to_tsquery('english', 'database & indexing');

-- Phrase search
SELECT * FROM articles
WHERE to_tsvector('english', content) @@ phraseto_tsquery('english', 'database indexing');

-- Ranking results
SELECT *, ts_rank(to_tsvector('english', content), query) AS rank
FROM articles, to_tsquery('english', 'database & indexing') query
WHERE to_tsvector('english', content) @@ query
ORDER BY rank DESC;
```

**MySQL (FULLTEXT Index):**

```sql
-- Create full-text index
CREATE FULLTEXT INDEX idx_articles_content ON articles(title, content);

-- Natural language search
SELECT * FROM articles
WHERE MATCH(title, content) AGAINST('database indexing' IN NATURAL LANGUAGE MODE);

-- Boolean search
SELECT * FROM articles
WHERE MATCH(title, content) AGAINST('+database -mongodb' IN BOOLEAN MODE);

-- Relevance score
SELECT *, MATCH(title, content) AGAINST('database indexing') AS relevance
FROM articles
WHERE MATCH(title, content) AGAINST('database indexing')
ORDER BY relevance DESC;
```

**Implementation Example - Elasticsearch:**

```javascript
const { Client } = require('@elastic/elasticsearch');
const client = new Client({ node: 'http://localhost:9200' });

// Index documents
await client.index({
  index: 'articles',
  body: {
    title: 'Database Indexing Guide',
    content: 'Learn about B-Tree, Hash, and Full-Text indexes...',
    tags: ['database', 'indexing', 'performance'],
    created_at: new Date()
  }
});

// Full-text search with relevance
const result = await client.search({
  index: 'articles',
  body: {
    query: {
      multi_match: {
        query: 'database performance optimization',
        fields: ['title^2', 'content', 'tags'],  // title has 2x weight
        type: 'best_fields',
        fuzziness: 'AUTO'  // Handle typos
      }
    },
    highlight: {
      fields: {
        content: {}
      }
    },
    size: 10
  }
});
```

**Python Example - Building Inverted Index:**

```python
from collections import defaultdict
import re

class InvertedIndex:
    def __init__(self):
        self.index = defaultdict(set)
        self.documents = {}

    def tokenize(self, text):
        """Simple tokenization"""
        # Lowercase, remove punctuation, split
        tokens = re.findall(r'\w+', text.lower())
        # Remove stop words
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at'}
        return [t for t in tokens if t not in stop_words]

    def add_document(self, doc_id, text):
        """Add document to index"""
        self.documents[doc_id] = text
        tokens = self.tokenize(text)

        for token in set(tokens):  # Unique tokens
            self.index[token].add(doc_id)

    def search(self, query):
        """Search for documents containing all query terms"""
        tokens = self.tokenize(query)

        if not tokens:
            return []

        # Get documents containing first token
        result = self.index.get(tokens[0], set()).copy()

        # Intersect with documents containing other tokens
        for token in tokens[1:]:
            result &= self.index.get(token, set())

        return [(doc_id, self.documents[doc_id]) for doc_id in result]

    def search_or(self, query):
        """Search for documents containing any query term"""
        tokens = self.tokenize(query)
        result = set()

        for token in tokens:
            result |= self.index.get(token, set())

        return [(doc_id, self.documents[doc_id]) for doc_id in result]

# Usage
index = InvertedIndex()

index.add_document(1, "The quick brown fox jumps over the lazy dog")
index.add_document(2, "The lazy brown dog sleeps all day")
index.add_document(3, "Quick brown animals are fascinating")

# AND search
print(index.search("brown dog"))  # Returns docs 1, 2

# OR search
print(index.search_or("fox animals"))  # Returns docs 1, 3
```

---

### 5️⃣ **Spatial Indexes (R-Tree)**

Optimized for geometric data and location-based queries.

**How It Works:**

R-Tree groups nearby objects using Minimum Bounding Rectangles (MBR).

**Structure:**

```
            [Root MBR]
           /          \
    [MBR A]          [MBR B]
    /    \           /    \
[MBR A1] [MBR A2] [MBR B1] [MBR B2]
  |        |        |        |
[Points] [Points] [Points] [Points]
```

**Characteristics:**

1. **Geometric Queries:**
   - Point-in-polygon
   - Nearest neighbor
   - Distance calculations
   - Bounding box intersections

2. **Multi-Dimensional:**
   - 2D: lat/long coordinates
   - 3D: x, y, z coordinates
   - n-D: Multi-dimensional data

3. **Use Cases:**
   - Maps and GIS applications
   - Location-based services
   - Ride-sharing (find nearby drivers)
   - Real estate (properties in area)

**When to Use:**

| ✅ Good For | ❌ Bad For |
|------------|-----------|
| Location queries (lat/long) | One-dimensional data |
| GIS applications | Non-geometric data |
| Nearest neighbor searches | Exact coordinate matching only |
| Geofencing | Small datasets |
| Map rendering | Frequent updates |

**SQL Examples:**

**PostgreSQL (PostGIS):**

```sql
-- Create spatial index
CREATE INDEX idx_locations_geom ON locations USING GIST (geom);

-- Find points within radius
SELECT name, ST_Distance(geom, ST_MakePoint(-73.935242, 40.730610)) AS distance
FROM locations
WHERE ST_DWithin(
  geom,
  ST_MakePoint(-73.935242, 40.730610),  -- NYC coordinates
  1000  -- 1000 meters
)
ORDER BY distance
LIMIT 10;

-- Find points in bounding box
SELECT * FROM locations
WHERE geom && ST_MakeEnvelope(
  -74.0, 40.7,  -- Southwest corner
  -73.9, 40.8   -- Northeast corner
);

-- Nearest neighbor
SELECT name
FROM locations
ORDER BY geom <-> ST_MakePoint(-73.935242, 40.730610)
LIMIT 5;
```

**MySQL (Spatial Index):**

```sql
-- Create spatial index
CREATE SPATIAL INDEX idx_locations_point ON locations(point);

-- Find nearby locations
SELECT name,
       ST_Distance_Sphere(
         point,
         ST_GeomFromText('POINT(-73.935242 40.730610)')
       ) AS distance_meters
FROM locations
WHERE ST_Distance_Sphere(
  point,
  ST_GeomFromText('POINT(-73.935242 40.730610)')
) < 1000
ORDER BY distance_meters;
```

**Real-World Example - Uber Driver Matching:**

```javascript
const { Client } = require('pg');
const client = new Client();

// Find available drivers near rider
async function findNearbyDrivers(riderLat, riderLon, radiusMeters = 2000) {
  const query = `
    SELECT
      driver_id,
      name,
      rating,
      ST_Distance(
        location::geography,
        ST_MakePoint($1, $2)::geography
      ) AS distance_meters
    FROM drivers
    WHERE
      status = 'available'
      AND ST_DWithin(
        location::geography,
        ST_MakePoint($1, $2)::geography,
        $3
      )
    ORDER BY distance_meters
    LIMIT 10
  `;

  const result = await client.query(query, [riderLon, riderLat, radiusMeters]);
  return result.rows;
}

// Geofencing - Check if location is in service area
async function isInServiceArea(lat, lon) {
  const query = `
    SELECT COUNT(*) > 0 AS in_area
    FROM service_areas
    WHERE ST_Contains(
      boundary,
      ST_MakePoint($1, $2)
    )
  `;

  const result = await client.query(query, [lon, lat]);
  return result.rows[0].in_area;
}

// Real-time driver location updates
async function updateDriverLocation(driverId, lat, lon) {
  await client.query(`
    UPDATE drivers
    SET
      location = ST_MakePoint($2, $3),
      last_updated = NOW()
    WHERE driver_id = $1
  `, [driverId, lon, lat]);
}
```

**Python Example - Spatial Queries:**

```python
from shapely.geometry import Point, Polygon
from rtree import index

class SpatialIndex:
    def __init__(self):
        self.idx = index.Index()
        self.objects = {}

    def insert(self, obj_id, lat, lon, data):
        """Insert point into spatial index"""
        # R-tree expects (minx, miny, maxx, maxy)
        self.idx.insert(obj_id, (lon, lat, lon, lat))
        self.objects[obj_id] = {
            'lat': lat,
            'lon': lon,
            'data': data
        }

    def find_nearby(self, lat, lon, radius_km):
        """Find objects within radius (approximate)"""
        # Convert km to degrees (rough approximation)
        deg = radius_km / 111.0

        # Bounding box query
        bbox = (lon - deg, lat - deg, lon + deg, lat + deg)
        nearby_ids = list(self.idx.intersection(bbox))

        # Filter by actual distance
        results = []
        for obj_id in nearby_ids:
            obj = self.objects[obj_id]
            dist = self._haversine_distance(
                lat, lon,
                obj['lat'], obj['lon']
            )
            if dist <= radius_km:
                results.append((obj_id, obj['data'], dist))

        return sorted(results, key=lambda x: x[2])

    def _haversine_distance(self, lat1, lon1, lat2, lon2):
        """Calculate distance between two points in km"""
        from math import radians, sin, cos, sqrt, atan2

        R = 6371  # Earth radius in km

        dlat = radians(lat2 - lat1)
        dlon = radians(lon2 - lon1)

        a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))

        return R * c

# Usage
spatial_idx = SpatialIndex()

# Add drivers
spatial_idx.insert(1, 40.7589, -73.9851, {'name': 'Driver 1', 'rating': 4.8})
spatial_idx.insert(2, 40.7614, -73.9776, {'name': 'Driver 2', 'rating': 4.9})
spatial_idx.insert(3, 40.7489, -73.9680, {'name': 'Driver 3', 'rating': 4.7})

# Find drivers within 2km of Times Square
rider_location = (40.758896, -73.985130)
nearby = spatial_idx.find_nearby(*rider_location, radius_km=2)

for driver_id, data, distance in nearby:
    print(f"{data['name']}: {distance:.2f} km away (rating: {data['rating']})")
```

---

## Advanced Index Concepts

### 🔥 **Composite Indexes (Multi-Column)**

Index on multiple columns. Order matters significantly.

**How It Works:**

```sql
CREATE INDEX idx_users_country_city_age ON users(country, city, age);
```

**Index Structure:**
```
(Country, City, Age)
  ↓
('US', 'NYC', 25)
('US', 'NYC', 30)
('US', 'SF', 28)
('UK', 'London', 35)
```

**Left-to-Right Rule:**

The index can be used for queries that filter on:
1. `country` alone ✅
2. `country, city` ✅
3. `country, city, age` ✅

But NOT for:
- `city` alone ❌
- `age` alone ❌
- `city, age` ❌

**Query Analysis:**

```sql
-- ✅ Uses index (filters on country)
SELECT * FROM users WHERE country = 'US';

-- ✅ Uses index (filters on country, city)
SELECT * FROM users WHERE country = 'US' AND city = 'NYC';

-- ✅ Uses index fully (all three columns)
SELECT * FROM users WHERE country = 'US' AND city = 'NYC' AND age > 25;

-- ❌ Doesn't use index (skips country)
SELECT * FROM users WHERE city = 'NYC';

-- ⚠️ Partial use (only uses country part)
SELECT * FROM users WHERE country = 'US' AND age > 25;
```

**Column Order Guidelines:**

1. **Equality First, Range Last:**
   ```sql
   -- Good: Equality on country/city, range on age
   CREATE INDEX idx_search ON users(country, city, age);

   -- Bad: Range in middle stops index usage
   CREATE INDEX idx_bad ON users(country, age, city);
   ```

2. **High Selectivity First:**
   ```sql
   -- Good: email is unique, country is not
   CREATE INDEX idx_user_lookup ON users(email, country);

   -- Bad: country first has low selectivity
   CREATE INDEX idx_bad ON users(country, email);
   ```

3. **Most Frequent Queries:**
   ```sql
   -- If you often query by (country, status)
   CREATE INDEX idx_common_query ON users(country, status);
   ```

**Real-World Example:**

```sql
-- E-commerce product search
CREATE INDEX idx_products_search
ON products(category_id, brand, price, created_at);

-- All these queries use the index efficiently:

-- Filter by category
SELECT * FROM products WHERE category_id = 5;

-- Filter by category and brand
SELECT * FROM products
WHERE category_id = 5 AND brand = 'Apple';

-- Filter by category, brand, price range
SELECT * FROM products
WHERE category_id = 5
  AND brand = 'Apple'
  AND price BETWEEN 500 AND 1500;

-- Filter by category, brand, price, sorted by date
SELECT * FROM products
WHERE category_id = 5
  AND brand = 'Apple'
  AND price BETWEEN 500 AND 1500
ORDER BY created_at DESC;
```

---

### 🎯 **Covering Indexes (Index-Only Scans)**

An index that contains ALL columns needed by a query, eliminating the need to access the table.

**How It Works:**

**Without Covering Index:**
```
Query: SELECT name, email FROM users WHERE age > 25;

Index on age → Find matching row IDs → Access table for name, email
(2 operations: index lookup + table access)
```

**With Covering Index:**
```
Covering Index: (age, name, email)

Query: SELECT name, email FROM users WHERE age > 25;

Index on age → Read name, email directly from index
(1 operation: index-only scan)
```

**SQL Examples:**

```sql
-- Non-covering index
CREATE INDEX idx_users_age ON users(age);

-- Query needs table access
SELECT name, email FROM users WHERE age > 25;
-- Execution: Index scan + table lookup

-- Covering index
CREATE INDEX idx_users_age_covering ON users(age, name, email);

-- Query uses index only (faster!)
SELECT name, email FROM users WHERE age > 25;
-- Execution: Index-only scan

-- PostgreSQL INCLUDE clause (better approach)
CREATE INDEX idx_users_age_include ON users(age) INCLUDE (name, email);
```

**Benefits:**

| Without Covering | With Covering |
|-----------------|---------------|
| Index seek | Index seek |
| + Table lookup (random I/O) | ✅ Done |
| Slower | Faster |

**When to Use:**

✅ **Good For:**
- Frequently run queries with specific SELECT columns
- Queries selecting few columns
- High-traffic queries needing optimization
- Read-heavy workloads

❌ **Don't Use:**
- Selecting many columns (index becomes too large)
- Frequently updated columns (index maintenance cost)
- Covering every possible query (too many indexes)

**Real-World Example - User Dashboard:**

```sql
-- Dashboard query runs 1M times/day
-- Original query
SELECT user_id, username, email, last_login
FROM users
WHERE status = 'active'
ORDER BY last_login DESC
LIMIT 20;

-- Without covering: 2 operations
CREATE INDEX idx_users_status ON users(status);
-- Index scan + table lookup for username, email, last_login

-- With covering: 1 operation (3x faster)
CREATE INDEX idx_users_dashboard
ON users(status, last_login DESC, user_id, username, email);
-- Index-only scan, all data in index

-- Performance improvement
-- Before: 45ms avg
-- After: 15ms avg (3x faster)
```

**PostgreSQL INCLUDE Example:**

```sql
-- Better syntax for covering indexes
CREATE INDEX idx_orders_customer_covering
ON orders(customer_id, created_at DESC)
INCLUDE (order_total, status);

-- Query benefits from index-only scan
SELECT order_total, status
FROM orders
WHERE customer_id = 12345
  AND created_at >= '2024-01-01'
ORDER BY created_at DESC;
```

---

## Index Strategies

### 📊 **Index Selectivity**

Selectivity measures how unique the indexed values are. Higher selectivity = better index performance.

**Formula:**
```
Selectivity = (Distinct Values) / (Total Rows)

High Selectivity (Good):
- Email: 1,000,000 unique / 1,000,000 rows = 1.0 (100%)
- User ID: 1,000,000 unique / 1,000,000 rows = 1.0 (100%)

Low Selectivity (Bad):
- Gender: 2 unique / 1,000,000 rows = 0.000002 (0.0002%)
- Boolean: 2 unique / 1,000,000 rows = 0.000002 (0.0002%)
```

**Selectivity Guidelines:**

| Selectivity | Index Effectiveness | Example |
|------------|---------------------|---------|
| **>50%** | Excellent | Email, user_id, order_id |
| **10-50%** | Good | Category, city, product_id |
| **1-10%** | Moderate | Country, status (5-10 values) |
| **<1%** | Poor | Gender, boolean, active/inactive |

**Real-World Analysis:**

```sql
-- Check selectivity
SELECT
  COUNT(DISTINCT email) AS distinct_emails,
  COUNT(*) AS total_rows,
  COUNT(DISTINCT email)::FLOAT / COUNT(*) AS selectivity
FROM users;

-- Result:
-- distinct_emails: 950,000
-- total_rows: 1,000,000
-- selectivity: 0.95 (95%) ← Excellent for indexing

-- Compare with low selectivity column
SELECT
  COUNT(DISTINCT gender) AS distinct_genders,
  COUNT(*) AS total_rows,
  COUNT(DISTINCT gender)::FLOAT / COUNT(*) AS selectivity
FROM users;

-- Result:
-- distinct_genders: 3
-- total_rows: 1,000,000
-- selectivity: 0.000003 (0.0003%) ← Poor for indexing
```

**When Low Selectivity Works:**

Bitmap indexes are designed for low selectivity:

```sql
-- Low selectivity, but combined conditions make it useful
CREATE BITMAP INDEX idx_orders_status ON orders(status);
CREATE BITMAP INDEX idx_orders_payment ON orders(payment_method);
CREATE BITMAP INDEX idx_orders_country ON orders(country);

-- Query combines multiple low-selectivity conditions
SELECT * FROM orders
WHERE status = 'shipped'
  AND payment_method = 'credit_card'
  AND country = 'US';

-- Bitmap AND operation narrows down result set efficiently
```

---

### ⚖️ **Index vs Full Table Scan**

Database query optimizer chooses between index and full table scan based on cost estimation.

**Cost Factors:**

| Factor | Index Scan | Full Table Scan |
|--------|-----------|----------------|
| **Row selectivity** | Good for <5-15% of rows | Good for >15% of rows |
| **I/O pattern** | Random I/O (slow) | Sequential I/O (fast) |
| **Index size** | Smaller, fits in memory | Entire table |
| **Overhead** | Index lookup + table access | Direct table read |

**Decision Tree:**

```
Selecting <5% of rows?
    ├─ YES → Use index scan
    └─ NO → Is selecting 5-15% of rows?
           ├─ YES → Compare costs (depends on data distribution)
           └─ NO → Use full table scan
```

**Examples:**

```sql
-- Example table: 1,000,000 users

-- Scenario 1: High selectivity (use index)
SELECT * FROM users WHERE user_id = 12345;
-- Returns: 1 row (0.0001%)
-- Decision: Use index ✅
-- Time: 2ms

-- Scenario 2: Low selectivity (use full scan)
SELECT * FROM users WHERE age > 18;
-- Returns: 950,000 rows (95%)
-- Decision: Full table scan ✅
-- Time: 500ms with index, 300ms with full scan

-- Scenario 3: Borderline (optimizer decides)
SELECT * FROM users WHERE country = 'US';
-- Returns: 100,000 rows (10%)
-- Decision: Depends on data distribution and index stats
```

**Force Index Usage (When Optimizer is Wrong):**

```sql
-- PostgreSQL
SELECT * FROM users WHERE age > 25;
-- Execution: Full table scan

-- Force index (if you know better)
SET enable_seqscan = off;
SELECT * FROM users WHERE age > 25;
SET enable_seqscan = on;

-- MySQL
SELECT * FROM users FORCE INDEX (idx_users_age) WHERE age > 25;
```

**Check Execution Plan:**

```sql
-- PostgreSQL
EXPLAIN ANALYZE
SELECT * FROM users WHERE age > 25;

-- Result:
-- Seq Scan on users  (cost=0.00..18334.00 rows=950000 width=100)
--   Filter: (age > 25)
-- Planning Time: 0.123 ms
-- Execution Time: 234.567 ms

-- MySQL
EXPLAIN
SELECT * FROM users WHERE age > 25;

-- Result:
-- type: ALL (full table scan)
-- rows: 1000000
-- Extra: Using where
```

---

### 🛠️ **Index Maintenance**

Indexes require maintenance to remain efficient.

**Index Fragmentation:**

As data is inserted/updated/deleted, indexes become fragmented:

```
Ideal B-Tree (90% full):
[90% full][90% full][90% full]

Fragmented B-Tree (30% full):
[30% full][30% full][30% full][30% full][30% full][30% full]

Result:
- More pages to scan
- Slower queries
- Wasted space
```

**Maintenance Operations:**

**PostgreSQL:**

```sql
-- Check index bloat
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
  idx_scan AS index_scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC;

-- Rebuild index (locks table)
REINDEX INDEX idx_users_email;

-- Rebuild all indexes on table
REINDEX TABLE users;

-- Concurrent rebuild (no lock, PostgreSQL 12+)
REINDEX INDEX CONCURRENTLY idx_users_email;

-- Vacuum to reclaim space
VACUUM ANALYZE users;
```

**MySQL:**

```sql
-- Check index statistics
SHOW INDEX FROM users;

-- Optimize table (rebuilds indexes)
OPTIMIZE TABLE users;

-- Analyze table (updates index statistics)
ANALYZE TABLE users;

-- Rebuild specific index
ALTER TABLE users DROP INDEX idx_users_email;
CREATE INDEX idx_users_email ON users(email);
```

**Monitoring Index Usage:**

```sql
-- PostgreSQL: Find unused indexes
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelname NOT LIKE 'pg_toast_%';

-- Remove unused indexes
DROP INDEX idx_users_unused;

-- MySQL: Check index cardinality
SELECT
  TABLE_NAME,
  INDEX_NAME,
  SEQ_IN_INDEX,
  COLUMN_NAME,
  CARDINALITY
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'mydb'
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;
```

---

## Implementation Examples

### JavaScript (Node.js + PostgreSQL)

```javascript
const { Pool } = require('pg');

class DatabaseIndexManager {
  constructor(config) {
    this.pool = new Pool(config);
  }

  /**
   * Analyze query performance
   */
  async explainQuery(query, params = []) {
    const result = await this.pool.query(`EXPLAIN ANALYZE ${query}`, params);
    return result.rows;
  }

  /**
   * Find missing indexes based on slow queries
   */
  async findMissingIndexes(tableName) {
    const query = `
      SELECT
        schemaname,
        tablename,
        attname AS column_name,
        n_distinct,
        correlation
      FROM pg_stats
      WHERE tablename = $1
        AND n_distinct > 100  -- High cardinality
        AND attname NOT IN (
          -- Exclude columns already indexed
          SELECT a.attname
          FROM pg_index i
          JOIN pg_attribute a ON a.attrelid = i.indrelid
            AND a.attnum = ANY(i.indkey)
          WHERE i.indrelid = $1::regclass
        )
      ORDER BY n_distinct DESC;
    `;

    const result = await this.pool.query(query, [tableName]);
    return result.rows;
  }

  /**
   * Check index health and usage
   */
  async getIndexStats(tableName) {
    const query = `
      SELECT
        indexname,
        idx_scan AS scans,
        idx_tup_read AS tuples_read,
        idx_tup_fetch AS tuples_fetched,
        pg_size_pretty(pg_relation_size(indexrelid)) AS size,
        CASE
          WHEN idx_scan = 0 THEN 'UNUSED'
          WHEN idx_scan < 100 THEN 'RARELY USED'
          ELSE 'ACTIVE'
        END AS status
      FROM pg_stat_user_indexes
      WHERE tablename = $1
      ORDER BY idx_scan DESC;
    `;

    const result = await this.pool.query(query, [tableName]);
    return result.rows;
  }

  /**
   * Create index with validation
   */
  async createIndexSafely(indexName, tableName, columns, options = {}) {
    const {
      unique = false,
      concurrent = true,
      where = null,
      include = []
    } = options;

    // Build index SQL
    let sql = `CREATE ${unique ? 'UNIQUE' : ''} INDEX ${concurrent ? 'CONCURRENTLY' : ''} ${indexName} ON ${tableName}(${columns.join(', ')})`;

    if (include.length > 0) {
      sql += ` INCLUDE (${include.join(', ')})`;
    }

    if (where) {
      sql += ` WHERE ${where}`;
    }

    console.log(`Creating index: ${sql}`);

    try {
      await this.pool.query(sql);
      console.log(`✅ Index ${indexName} created successfully`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to create index ${indexName}:`, error.message);
      return false;
    }
  }

  /**
   * Analyze table and suggest indexes
   */
  async suggestIndexes(tableName) {
    // Get table columns
    const columnsResult = await this.pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = $1
    `, [tableName]);

    // Get existing indexes
    const indexesResult = await this.pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = $1
    `, [tableName]);

    // Get column statistics
    const statsResult = await this.pool.query(`
      SELECT attname, n_distinct, correlation
      FROM pg_stats
      WHERE tablename = $1
    `, [tableName]);

    const suggestions = [];

    for (const stat of statsResult.rows) {
      const { attname, n_distinct, correlation } = stat;

      // Check if already indexed
      const hasIndex = indexesResult.rows.some(idx =>
        idx.indexdef.includes(attname)
      );

      if (!hasIndex && n_distinct > 100) {
        suggestions.push({
          column: attname,
          reason: `High cardinality (${n_distinct} distinct values)`,
          priority: n_distinct > 1000 ? 'HIGH' : 'MEDIUM'
        });
      }
    }

    return suggestions;
  }

  /**
   * Monitor index bloat
   */
  async checkIndexBloat() {
    const query = `
      SELECT
        schemaname,
        tablename,
        indexname,
        pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
        pg_size_pretty(pg_relation_size(relid)) AS table_size,
        ROUND(100 * pg_relation_size(indexrelid) / pg_relation_size(relid)) AS index_ratio
      FROM pg_stat_user_indexes
      JOIN pg_class ON pg_class.oid = indexrelid
      WHERE pg_relation_size(indexrelid) > 10 * 1024 * 1024  -- > 10MB
      ORDER BY pg_relation_size(indexrelid) DESC;
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  async close() {
    await this.pool.end();
  }
}

// Usage
const manager = new DatabaseIndexManager({
  host: 'localhost',
  database: 'myapp',
  user: 'postgres',
  password: 'password'
});

// Example 1: Analyze query performance
const explain = await manager.explainQuery(`
  SELECT * FROM users WHERE email = $1
`, ['john@example.com']);
console.log('Query Plan:', explain);

// Example 2: Find missing indexes
const missing = await manager.findMissingIndexes('users');
console.log('Suggested indexes:', missing);

// Example 3: Create covering index
await manager.createIndexSafely(
  'idx_users_email_covering',
  'users',
  ['email'],
  {
    concurrent: true,
    include: ['user_id', 'username', 'created_at']
  }
);

// Example 4: Check index usage
const stats = await manager.getIndexStats('users');
console.log('Index Statistics:', stats);

// Example 5: Get index suggestions
const suggestions = await manager.suggestIndexes('orders');
console.log('Index Suggestions:', suggestions);

await manager.close();
```

---

### Python (SQLAlchemy + PostgreSQL)

```python
from sqlalchemy import create_engine, text, Index, Column, Integer, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import time

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True)
    email = Column(String(255), nullable=False)
    username = Column(String(50))
    country = Column(String(2))
    created_at = Column(DateTime)

    # Define indexes in model
    __table_args__ = (
        Index('idx_users_email', 'email'),
        Index('idx_users_country_created', 'country', 'created_at'),
    )

class IndexAnalyzer:
    def __init__(self, connection_string):
        self.engine = create_engine(connection_string)
        self.Session = sessionmaker(bind=self.engine)

    def explain_query(self, query):
        """Get query execution plan"""
        with self.engine.connect() as conn:
            result = conn.execute(text(f"EXPLAIN ANALYZE {query}"))
            return [row[0] for row in result]

    def find_unused_indexes(self, min_size_mb=10):
        """Find indexes that are never used"""
        query = text("""
            SELECT
                schemaname,
                tablename,
                indexname,
                pg_size_pretty(pg_relation_size(indexrelid)) AS size,
                idx_scan
            FROM pg_stat_user_indexes
            WHERE idx_scan = 0
              AND pg_relation_size(indexrelid) > :min_size
            ORDER BY pg_relation_size(indexrelid) DESC
        """)

        with self.engine.connect() as conn:
            result = conn.execute(query, {'min_size': min_size_mb * 1024 * 1024})
            return [dict(row) for row in result]

    def get_index_usage(self, table_name):
        """Get detailed index usage statistics"""
        query = text("""
            SELECT
                indexname,
                idx_scan AS scans,
                idx_tup_read AS tuples_read,
                idx_tup_fetch AS tuples_fetched,
                pg_size_pretty(pg_relation_size(indexrelid)) AS size
            FROM pg_stat_user_indexes
            WHERE tablename = :table
            ORDER BY idx_scan DESC
        """)

        with self.engine.connect() as conn:
            result = conn.execute(query, {'table': table_name})
            return [dict(row) for row in result]

    def benchmark_query(self, query, iterations=10):
        """Benchmark query performance"""
        times = []

        with self.engine.connect() as conn:
            for _ in range(iterations):
                start = time.time()
                conn.execute(text(query))
                elapsed = time.time() - start
                times.append(elapsed)

        return {
            'avg_ms': sum(times) / len(times) * 1000,
            'min_ms': min(times) * 1000,
            'max_ms': max(times) * 1000
        }

    def create_index_concurrently(self, index_name, table, columns, unique=False):
        """Create index without locking table"""
        unique_sql = "UNIQUE" if unique else ""
        sql = f"CREATE {unique_sql} INDEX CONCURRENTLY {index_name} ON {table}({', '.join(columns)})"

        with self.engine.connect() as conn:
            conn.execute(text(sql))
            print(f"✅ Created index: {index_name}")

    def suggest_indexes(self, table_name):
        """Analyze table and suggest indexes"""
        query = text("""
            SELECT
                attname AS column_name,
                n_distinct,
                correlation,
                most_common_vals
            FROM pg_stats
            WHERE tablename = :table
              AND n_distinct > 100
            ORDER BY n_distinct DESC
        """)

        with self.engine.connect() as conn:
            result = conn.execute(query, {'table': table_name})

            suggestions = []
            for row in result:
                suggestions.append({
                    'column': row[0],
                    'distinct_values': row[1],
                    'correlation': row[2],
                    'recommendation': self._get_recommendation(row[1], row[2])
                })

            return suggestions

    def _get_recommendation(self, n_distinct, correlation):
        """Provide index recommendation based on statistics"""
        if n_distinct > 10000:
            return "HIGH PRIORITY - Excellent selectivity"
        elif n_distinct > 1000:
            return "MEDIUM PRIORITY - Good selectivity"
        elif abs(correlation) > 0.8:
            return "Consider for range queries"
        else:
            return "LOW PRIORITY - Low selectivity"

# Usage
analyzer = IndexAnalyzer('postgresql://user:pass@localhost/mydb')

# Example 1: Explain query
plan = analyzer.explain_query("SELECT * FROM users WHERE email = 'john@example.com'")
for line in plan:
    print(line)

# Example 2: Find unused indexes
unused = analyzer.find_unused_indexes(min_size_mb=10)
print("\nUnused Indexes:")
for idx in unused:
    print(f"  {idx['indexname']} ({idx['size']}) - {idx['idx_scan']} scans")

# Example 3: Benchmark with and without index
print("\nBenchmark without index:")
stats_before = analyzer.benchmark_query("SELECT * FROM users WHERE country = 'US'")
print(f"  Avg: {stats_before['avg_ms']:.2f}ms")

# Create index
analyzer.create_index_concurrently('idx_users_country', 'users', ['country'])

print("\nBenchmark with index:")
stats_after = analyzer.benchmark_query("SELECT * FROM users WHERE country = 'US'")
print(f"  Avg: {stats_after['avg_ms']:.2f}ms")
print(f"  Improvement: {(stats_before['avg_ms'] / stats_after['avg_ms']):.1f}x faster")

# Example 4: Get index suggestions
suggestions = analyzer.suggest_indexes('users')
print("\nIndex Suggestions:")
for s in suggestions:
    print(f"  {s['column']}: {s['recommendation']} ({s['distinct_values']} distinct values)")
```

---

## Interview Questions

### Q1: When should you NOT create an index?

**Answer:**

You should **avoid creating an index** in these scenarios:

**1. Small Tables (<1000 rows):**
```
Table with 500 rows:
- Full scan: 2ms
- Index scan: 3ms (slower due to index overhead)
```

**2. Low Cardinality Columns (few distinct values):**
```sql
-- Bad: Only 2 distinct values
CREATE INDEX idx_users_gender ON users(gender);

-- Full scan is faster for:
SELECT * FROM users WHERE gender = 'M';
-- Returns 50% of rows → index is useless
```

**3. Frequently Updated Columns:**
```sql
-- Bad: Updated on every page view
CREATE INDEX idx_users_last_seen ON users(last_seen);

-- Each update requires:
-- 1. Update table row
-- 2. Update index entry
-- Result: 2x write overhead
```

**4. Columns with Many NULL Values:**
```sql
-- Bad: 90% of rows have NULL middle_name
CREATE INDEX idx_users_middle_name ON users(middle_name);

-- Most queries return too many rows
SELECT * FROM users WHERE middle_name IS NOT NULL;
```

**5. Wide Columns (large text/binary):**
```sql
-- Bad: Index on 5KB text column
CREATE INDEX idx_articles_body ON articles(body);

-- Problems:
-- - Huge index size (5KB × rows)
-- - Slow index updates
-- - Use full-text index instead
```

**6. Rarely Queried Columns:**
```sql
-- Bad: Column used in 1% of queries
CREATE INDEX idx_users_favorite_color ON users(favorite_color);

-- Cost > Benefit:
-- - Storage cost: Always
-- - Update cost: Always
-- - Query benefit: Rarely
```

**Cost-Benefit Analysis:**

| Scenario | Index Cost | Query Benefit | Decision |
|----------|-----------|---------------|----------|
| Small table | Medium | Low | ❌ Don't index |
| Low cardinality | Medium | Low | ❌ Don't index |
| Frequent updates | High | Medium | ⚠️ Consider carefully |
| Large table + high cardinality | Medium | High | ✅ Index |

---

### Q2: Explain index selectivity and why it matters.

**Answer:**

**Index selectivity** measures how unique the values in an indexed column are.

**Formula:**
```
Selectivity = (Number of Distinct Values) / (Total Rows)

Range: 0.0 to 1.0
```

**Examples:**

```sql
-- Table: 1,000,000 users

-- Example 1: High Selectivity (Excellent)
SELECT COUNT(DISTINCT email) FROM users;
-- Result: 1,000,000 distinct values
-- Selectivity = 1,000,000 / 1,000,000 = 1.0 (100%)

-- Example 2: Medium Selectivity (Good)
SELECT COUNT(DISTINCT city) FROM users;
-- Result: 5,000 distinct values
-- Selectivity = 5,000 / 1,000,000 = 0.005 (0.5%)

-- Example 3: Low Selectivity (Poor)
SELECT COUNT(DISTINCT gender) FROM users;
-- Result: 3 distinct values
-- Selectivity = 3 / 1,000,000 = 0.000003 (0.0003%)
```

**Why It Matters:**

**1. Query Performance:**

High selectivity = Better performance
```sql
-- High selectivity (email: 1.0)
SELECT * FROM users WHERE email = 'john@example.com';
-- Returns: 1 row
-- Index reads: 3-4 nodes in B-Tree
-- Time: 2ms ✅

-- Low selectivity (gender: 0.000003)
SELECT * FROM users WHERE gender = 'M';
-- Returns: 500,000 rows
-- Index reads: Thousands of nodes
-- Time: 2000ms ❌
-- Better to use full table scan!
```

**2. Index Size:**

```
High selectivity:
- Index on email: 30MB (compact)

Low selectivity:
- Index on gender: 25MB (wasteful)
- Only 3 distinct values stored redundantly
```

**3. Optimizer Decisions:**

```sql
-- Database optimizer uses selectivity to choose plan

-- High selectivity: Use index
EXPLAIN SELECT * FROM users WHERE email = 'john@example.com';
-- Index Scan on idx_users_email
-- Cost: 8.44..8.45 rows=1

-- Low selectivity: Full scan
EXPLAIN SELECT * FROM users WHERE gender = 'M';
-- Seq Scan on users
-- Cost: 0.00..18334.00 rows=500000
```

**Selectivity Guidelines:**

| Selectivity | Category | Index Effectiveness |
|------------|----------|---------------------|
| **>0.5 (>50%)** | Excellent | Always beneficial |
| **0.1-0.5 (10-50%)** | Good | Usually beneficial |
| **0.01-0.1 (1-10%)** | Moderate | Case-by-case |
| **<0.01 (<1%)** | Poor | Rarely beneficial |

**Composite Index Selectivity:**

```sql
-- Individual selectivity:
-- country: 0.0002 (200 countries)
-- city: 0.005 (5,000 cities)

-- Combined selectivity:
CREATE INDEX idx_location ON users(country, city);
-- Effective selectivity: 0.0002 × 0.005 = 0.000001

-- Query benefits from combined selectivity:
SELECT * FROM users WHERE country = 'US' AND city = 'NYC';
-- Narrows down to ~5,000 users (0.5%)
-- Index is effective!
```

---

### Q3: What is a covering index and when would you use one?

**Answer:**

A **covering index** is an index that contains all columns needed by a query, allowing the database to satisfy the query entirely from the index without accessing the table.

**How It Works:**

**Without Covering Index:**
```
Query: SELECT user_id, name, email FROM users WHERE age = 25;

Step 1: Scan index on age → Find matching row IDs
Step 2: Access table rows → Retrieve name, email
Result: 2 I/O operations (index + table)
```

**With Covering Index:**
```
Covering Index: (age, user_id, name, email)

Query: SELECT user_id, name, email FROM users WHERE age = 25;

Step 1: Scan index → Read age, user_id, name, email directly
Result: 1 I/O operation (index only) ✅
```

**SQL Examples:**

```sql
-- Regular index
CREATE INDEX idx_users_age ON users(age);

-- Query needs table lookup
SELECT user_id, name, email FROM users WHERE age = 25;
-- Plan: Index Scan + Heap Fetch

-- Covering index (traditional)
CREATE INDEX idx_users_age_covering
ON users(age, user_id, name, email);

-- Query uses index only
SELECT user_id, name, email FROM users WHERE age = 25;
-- Plan: Index Only Scan ✅

-- PostgreSQL INCLUDE clause (preferred)
CREATE INDEX idx_users_age_include
ON users(age) INCLUDE (user_id, name, email);
```

**Benefits:**

| Metric | Without Covering | With Covering |
|--------|-----------------|---------------|
| **I/O Operations** | Index scan + table lookup | Index scan only |
| **Random I/O** | Yes (slow) | No (faster) |
| **Disk reads** | 2x | 1x |
| **Performance** | Baseline | 2-5x faster |

**When to Use:**

✅ **Good Use Cases:**

1. **High-Frequency Queries:**
```sql
-- Dashboard query runs 1M times/day
CREATE INDEX idx_dashboard
ON orders(user_id, created_at)
INCLUDE (order_total, status);

SELECT order_total, status
FROM orders
WHERE user_id = 12345
  AND created_at >= '2024-01-01';
```

2. **API Endpoints:**
```sql
-- GET /api/products?category=electronics
CREATE INDEX idx_products_api
ON products(category)
INCLUDE (product_id, name, price, image_url);

SELECT product_id, name, price, image_url
FROM products
WHERE category = 'electronics';
```

3. **Reporting Queries:**
```sql
-- Monthly sales report
CREATE INDEX idx_sales_report
ON sales(sale_date)
INCLUDE (amount, product_id, customer_id);

SELECT SUM(amount), COUNT(*)
FROM sales
WHERE sale_date BETWEEN '2024-01-01' AND '2024-01-31';
```

❌ **Don't Use When:**

1. **Selecting Many Columns:**
```sql
-- Bad: Including 20 columns makes index huge
CREATE INDEX idx_users_everything
ON users(age)
INCLUDE (name, email, address, phone, ..., 20 columns);

-- Index becomes larger than table!
```

2. **Frequently Updated Columns:**
```sql
-- Bad: last_updated changes constantly
CREATE INDEX idx_users_updated
ON users(status)
INCLUDE (last_updated);

-- Every update requires index maintenance
```

3. **Large Columns:**
```sql
-- Bad: Including large text columns
CREATE INDEX idx_articles_covering
ON articles(category)
INCLUDE (body);  -- body is 5KB per row

-- Index becomes massive and slow to maintain
```

**Real-World Performance:**

```sql
-- Before: Regular index
CREATE INDEX idx_orders_customer ON orders(customer_id);

SELECT order_id, order_total, status
FROM orders
WHERE customer_id = 12345
ORDER BY created_at DESC
LIMIT 20;

-- Performance: 45ms
-- Plan: Index Scan + 20 Heap Fetches

-- After: Covering index
CREATE INDEX idx_orders_customer_covering
ON orders(customer_id, created_at DESC)
INCLUDE (order_id, order_total, status);

-- Performance: 12ms (3.75x faster)
-- Plan: Index Only Scan
```

**Key Insight:**
> Covering indexes eliminate expensive random I/O by keeping all query data in the index. Use them for high-frequency queries selecting few columns, but avoid over-indexing with too many included columns.

---

## Best Practices

### ✅ DO:

1. **Index Foreign Keys:**
```sql
-- Always index foreign keys for joins
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
```

2. **Index WHERE Clause Columns:**
```sql
-- Index frequently filtered columns
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
```

3. **Use Partial Indexes for Filtered Queries:**
```sql
-- Index only active users (smaller, faster)
CREATE INDEX idx_users_active_email
ON users(email) WHERE status = 'active';

-- Query benefits
SELECT * FROM users WHERE email = 'john@example.com' AND status = 'active';
```

4. **Index Composite Keys in Order:**
```sql
-- Most selective column first
CREATE INDEX idx_search ON products(category_id, price, brand);

-- Equality before range
CREATE INDEX idx_orders ON orders(status, created_at);
```

5. **Monitor Index Usage:**
```sql
-- Remove unused indexes
SELECT indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0;
```

### ❌ DON'T:

1. **Don't Over-Index:**
```sql
-- Bad: Too many indexes
CREATE INDEX idx1 ON users(name);
CREATE INDEX idx2 ON users(email);
CREATE INDEX idx3 ON users(name, email);
CREATE INDEX idx4 ON users(email, name);
CREATE INDEX idx5 ON users(created_at);

-- Every INSERT/UPDATE becomes slow
```

2. **Don't Index Low-Cardinality Columns:**
```sql
-- Bad: Only 2 values
CREATE INDEX idx_users_active ON users(is_active);

-- Exception: Use partial index
CREATE INDEX idx_users_inactive ON users(id) WHERE is_active = false;
```

3. **Don't Duplicate Indexes:**
```sql
-- Redundant: idx2 is covered by idx1
CREATE INDEX idx1 ON users(email, name);
CREATE INDEX idx2 ON users(email);  -- Unnecessary

-- PostgreSQL can use idx1 for queries on email alone
```

4. **Don't Index Small Tables:**
```sql
-- Bad: Table has 50 rows
CREATE INDEX idx_countries_code ON countries(code);

-- Full scan is faster
```

5. **Don't Forget Index Maintenance:**
```sql
-- Bad: Never rebuild indexes
-- Good: Regular maintenance
REINDEX INDEX CONCURRENTLY idx_users_email;
VACUUM ANALYZE users;
```

---

## Real-World Examples

### Example 1: E-commerce Product Search

**Scenario:** Product search with multiple filters

```sql
-- Table structure
CREATE TABLE products (
  product_id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255),
  category_id INTEGER,
  brand VARCHAR(100),
  price DECIMAL(10,2),
  rating DECIMAL(3,2),
  in_stock BOOLEAN,
  created_at TIMESTAMP
);

-- Common query
SELECT product_id, name, price, rating
FROM products
WHERE category_id = 5
  AND brand = 'Apple'
  AND price BETWEEN 500 AND 1500
  AND in_stock = true
ORDER BY rating DESC
LIMIT 20;

-- Optimal indexes
-- 1. Composite index for filtering and sorting
CREATE INDEX idx_products_search
ON products(category_id, brand, price, rating DESC)
WHERE in_stock = true;

-- 2. Covering index for common queries
CREATE INDEX idx_products_list
ON products(category_id, in_stock, rating DESC)
INCLUDE (product_id, name, price);

-- Performance improvement: 450ms → 8ms (56x faster)
```

### Example 2: Social Media Timeline

**Scenario:** Facebook-like news feed

```sql
-- Posts table
CREATE TABLE posts (
  post_id BIGSERIAL PRIMARY KEY,
  user_id BIGINT,
  content TEXT,
  created_at TIMESTAMP,
  likes_count INTEGER,
  comments_count INTEGER
);

-- Followers table
CREATE TABLE followers (
  follower_id BIGINT,
  following_id BIGINT,
  PRIMARY KEY (follower_id, following_id)
);

-- Timeline query: Get posts from people I follow
SELECT p.post_id, p.content, p.created_at, p.likes_count
FROM posts p
JOIN followers f ON p.user_id = f.following_id
WHERE f.follower_id = 12345
  AND p.created_at >= NOW() - INTERVAL '7 days'
ORDER BY p.created_at DESC
LIMIT 50;

-- Optimal indexes
-- 1. Followers lookup
CREATE INDEX idx_followers_follower
ON followers(follower_id, following_id);

-- 2. Posts by user and time (covering)
CREATE INDEX idx_posts_user_time
ON posts(user_id, created_at DESC)
INCLUDE (post_id, content, likes_count);

-- 3. Partial index for recent posts only
CREATE INDEX idx_posts_recent
ON posts(user_id, created_at DESC)
WHERE created_at >= NOW() - INTERVAL '30 days';

-- Performance: 2.3s → 45ms (51x faster)
```

### Example 3: Uber Driver Matching

**Scenario:** Find nearby available drivers

```sql
-- Drivers table with location
CREATE TABLE drivers (
  driver_id BIGINT PRIMARY KEY,
  name VARCHAR(100),
  rating DECIMAL(3,2),
  status VARCHAR(20),
  location GEOGRAPHY(POINT, 4326),
  last_updated TIMESTAMP
);

-- Query: Find drivers within 2km
SELECT driver_id, name, rating,
       ST_Distance(location, ST_MakePoint(-73.935242, 40.730610)::geography) AS distance
FROM drivers
WHERE status = 'available'
  AND ST_DWithin(
    location,
    ST_MakePoint(-73.935242, 40.730610)::geography,
    2000
  )
ORDER BY distance
LIMIT 10;

-- Optimal indexes
-- 1. Spatial index on location
CREATE INDEX idx_drivers_location
ON drivers USING GIST (location)
WHERE status = 'available';

-- 2. Composite index for status + location
CREATE INDEX idx_drivers_available
ON drivers(status, last_updated DESC)
INCLUDE (driver_id, name, rating);

-- 3. Partial spatial index (only available drivers)
CREATE INDEX idx_drivers_available_location
ON drivers USING GIST (location)
WHERE status = 'available' AND last_updated >= NOW() - INTERVAL '5 minutes';

-- Performance: 890ms → 12ms (74x faster)
```

---

## Summary

### Key Takeaways

1. **Index Types:**
   - **B-Tree**: Default, best for equality and range queries
   - **Hash**: O(1) equality lookups, no range queries
   - **Bitmap**: Low-cardinality optimization
   - **Full-Text**: Search engine functionality
   - **Spatial**: Geographic queries

2. **Index Strategies:**
   - **Selectivity matters**: High cardinality = better indexes
   - **Composite indexes**: Column order is critical (left-to-right rule)
   - **Covering indexes**: Include columns for index-only scans
   - **Partial indexes**: Filter for subset of rows

3. **Trade-offs:**
   - Indexes speed up reads but slow down writes
   - Each index adds storage overhead
   - Too many indexes hurt INSERT/UPDATE performance
   - Balance query performance vs. maintenance cost

4. **Best Practices:**
   - Index foreign keys and WHERE clause columns
   - Use composite indexes for multi-column queries
   - Monitor and remove unused indexes
   - Regular maintenance (REINDEX, VACUUM)
   - Consider covering indexes for hot queries

### When to Use Each Index Type

| Scenario | Index Type | Reason |
|----------|-----------|--------|
| Equality searches | B-Tree or Hash | O(log n) or O(1) |
| Range queries | B-Tree | Sorted structure |
| Sorting | B-Tree | Maintains order |
| Low cardinality + analytics | Bitmap | Bitwise operations |
| Text search | Full-Text | Inverted index |
| Location queries | Spatial (R-Tree) | Geometric operations |
| High-frequency query | Covering | Index-only scan |
| Subset of rows | Partial | Smaller index |

### Performance Impact

```
Without proper indexes:
- Query time: 2000ms
- Full table scan
- Poor scalability

With optimized indexes:
- Query time: 5ms (400x faster)
- Index seek
- Scales to billions of rows
```

### Interview Focus

- Explain different index types and when to use each
- Understand selectivity and cardinality
- Know composite index column ordering
- Explain covering indexes and benefits
- Discuss trade-offs (read vs. write performance)
- Real-world examples (e-commerce, social media, maps)

---
[← Back to SystemDesign](../README.md)
