---
sourceHash: "cf929c70db76b682b57f8439fe0775e874a1b7c9938db8a36f8e1feb801dbfbe"
title: "SQL-এর মূল কথা ও Schema Design"
translatedAt: "2026-10-17T14:00:08.198Z"
model: "claude-opus-5-5 (Claude Code)"
---

# SQL-এর মূল কথা ও Schema Design {#ch-sql-fundamentals}

> Interviewer যে query চান সেটা লিখুন, database সেটা নিয়ে কী করে তা ব্যাখ্যা করুন, আর এমন schema design করুন যা খারাপ data নিতেই রাজি হয় না।

**এই অধ্যায়ে:** clause কোন ক্রমে চলে · join, grouping আর window function · CTE আর `NOT IN`-এর ফাঁদ · normalisation, আর কখন সেটা ভাঙবেন · type আর constraint

## 💡 মূল ধারণা

SQL declarative। আপনি শুধু বলেন ফলাফল কেমন হবে, আর কীভাবে সেটা বের করা হবে তা ঠিক করে database-এর ভেতরের query
planner। একই row ফেরত দেওয়া দুটি query-র খরচে হাজার গুণ ফারাক থাকতে পারে। তাই "query-টা লিখতে পারেন কি" —
interviewer যা যাচাই করেন, এটা তার অর্ধেক মাত্র।

Schema আরও বেশি গুরুত্বপূর্ণ। Code আবার লেখা হয়, কিন্তু data থেকে যায়, তার ভেতরে জমা থাকা প্রতিটি খারাপ সিদ্ধান্ত
নিয়ে। লক্ষ্য হলো ভুল অবস্থা যেন **store করাই না যায়**। Customer ছাড়া যদি order থাকতে না পারে, তাহলে সেটা foreign
key, service-এর ভেতরের কোনো check নয়। Application-এর validation ভালো error message দেয়। কিন্তু নিয়মের নিশ্চয়তা দেয়
database, কারণ যে-ই লিখুক, তাকে database পেরিয়েই যেতে হয়।

## কীভাবে কাজ করে

### কোন ক্রমে চলে

**Query-র যুক্তিগত ক্রম, যেটা আপনার লেখার ক্রম নয়:**

```text
FROM → JOIN → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT
```

SQL-এর বেশিরভাগ চমক এই তালিকার সঙ্গে মিলিয়ে দেখলে বোঝা যায়। `SELECT`-এর alias `WHERE`-এ ব্যবহার করা যায় না, কারণ
`WHERE` আগে চলে। `ORDER BY`-তে করা যায়, কারণ সেটা পরে চলে। `WHERE` row ছাঁকে। `HAVING` ছাঁকে group, কারণ `WHERE`
চলার সময় group তৈরিই হয়নি। তাই `COUNT(o.id) >= 3`-এর মতো aggregate যাচাই করতে পারে একমাত্র `HAVING`।

`SELECT`-এর প্রতিটি column হয় `GROUP BY`-তে থাকতে হবে, নয়তো কোনো aggregate-এর ভেতরে। `COUNT(*)` row গোনে, কিন্তু
`COUNT(column)` `NULL` বাদ দেয়। তাই `LEFT JOIN`-এর পরে যে user-এর কোনো order নেই, সে পায় `0`, `1` নয়। খালি set-এর
ওপর `SUM` দেয় `NULL`, শূন্য নয়, তাই সেটা `COALESCE` দিয়ে মুড়ে দিন।

### Join

`INNER` রাখে শুধু সেই row, যেগুলো দুই দিকেই মেলে। `LEFT` বাঁ দিকের প্রতিটি row রাখে, আর যেখানে কিছু মেলে না সেখানে
ডান দিকে `NULL` বসায়: "প্রতিটি user, আর থাকলে তার order"। পরিচিত ফাঁদ হলো outer table-এর filter `ON`-এ না দিয়ে
`WHERE`-এ দেওয়া।

**যে `LEFT JOIN` চুপচাপ inner join হয়ে যায়:**

```sql
-- ❌ Unmatched users have NULL status, fail the WHERE test, and vanish
SELECT u.name, o.total FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE o.status = 'paid';

-- ✅ The condition belongs to the join, so unmatched users survive
SELECT u.name, o.total FROM users u
LEFT JOIN orders o ON o.user_id = u.id AND o.status = 'paid';
```

> ⚠️ Join row-এর সংখ্যা গুণ করে দেয়। User-এর সঙ্গে তার order আর address দুটিই join করলে প্রতি user-এর জন্য
> order × address সংখ্যক row পান। তার ওপর যেকোনো `SUM` দুবার গোনে। আগে প্রতিটি দিক আলাদা subquery-তে aggregate
> করুন, অথবা `COUNT(DISTINCT …)` ব্যবহার করুন।

### CTE আর subquery

**CTE** (`WITH …`) হলো নাম দেওয়া একটি subquery। এর মূল লাভ পড়তে সুবিধা। Postgres 12-এর আগে CTE সবসময় আগে পুরোটা
চলত, তাই বাইরের filter তার ভেতরে পৌঁছাতে পারত না। Recursive রূপটি দিয়ে hierarchy ধরে নিচে নামা যায়।

**একটি category-র সব descendant:**

```sql
WITH RECURSIVE tree AS (
  SELECT id, parent_id, name, 1 AS depth
  FROM categories WHERE id = $1          -- anchor row
  UNION ALL
  SELECT c.id, c.parent_id, c.name, t.depth + 1
  FROM categories c JOIN tree t ON c.parent_id = t.id
  WHERE t.depth < 10                     -- guard: a cycle would otherwise run forever
)
SELECT * FROM tree;
```

**`NOT IN` বনাম `NOT EXISTS`:**

```sql
-- ❌ One NULL in orders.user_id makes every comparison unknown: zero rows
SELECT * FROM users WHERE id NOT IN (SELECT user_id FROM orders);

-- ✅ Null-safe, and usually plans better
SELECT * FROM users u WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id);
```

### Window function

Window function কয়েকটি row জুড়ে হিসাব করে, **কিন্তু সেগুলোকে এক row-এ মিশিয়ে দেয় না**। `GROUP BY`-এর সঙ্গে
পার্থক্য এখানেই, আর "প্রতি group-এ top N" ধরনের বেশিরভাগ প্রশ্নের উত্তর এটাই।

**প্রতি user-এর সবচেয়ে সাম্প্রতিক তিনটি order:**

```sql
SELECT * FROM (
  SELECT o.*,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
  FROM orders o
) ranked
WHERE rn <= 3;
```

বাইরের query-টা লাগে, কারণ window function চলে `WHERE`-এর পরে। `RANK` আর `DENSE_RANK` সমান হলে একই নম্বর দেয়।
`LAG` আর `LEAD` আগের বা পরের row পড়ে, মাসে মাসে পরিবর্তন বের করতে কাজে লাগে।

### Normalisation

| Form    | নিয়ম                                                        | ভাঙলে দেখতে এমন                 |
| ------- | ----------------------------------------------------------- | ------------------------------------ |
| **1NF** | প্রতিটি column-এ একটিই atomic value                         | `tags` রাখা হয়েছে `"a,b,c"` হিসেবে           |
| **2NF** | কোনো non-key column composite key-এর একাংশের ওপর নির্ভর করে না        | `order_items`-এ `product_name`      |
| **3NF** | কোনো non-key column অন্য কোনো non-key column-এর ওপর নির্ভর করে না         | `users`-এ `city` আর `postcode` দুটিই |

Third normal form-ই default, কারণ একই তথ্য দুই জায়গায় থাকলে সময়ের সঙ্গে দুটি আলাদা হয়ে যায়। Product-এর নাম যদি
`order_items`-এ থাকে, তাহলে product-এর নাম বদলাতে দশ লাখ row update করতে হয়। যে row বাদ পড়ল, সেটা এখন ভুল।
একটি তথ্য, একটি জায়গা।

**Order আর তার item, normalise করা অবস্থায়:**

```sql
CREATE TABLE orders (
  id          bigserial PRIMARY KEY,
  customer_id bigint NOT NULL REFERENCES customers(id),
  status      text   NOT NULL CHECK (status IN ('pending', 'paid', 'shipped')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
  order_id   bigint  NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id bigint  NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity   integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(12,2) NOT NULL,   -- copied on purpose: an invoice must not change with the price
  PRIMARY KEY (order_id, product_id)
);
```

ওই `unit_price`-এর copy-টাই আসল সূক্ষ্মতা। *Order দেওয়ার সময়ের* দাম আর আজকের দাম দুটি আলাদা তথ্য। নির্দিষ্ট
সময়ের data সবসময় copy করা হয়, আর সেটা নিয়ম ভাঙা নয়।

`ON DELETE` একটি design-এর সিদ্ধান্ত: parent যে data-র মালিক, তার জন্য `CASCADE`। আর reference যখন প্রমাণ করে যে
parent ব্যবহার হচ্ছে, তখন `RESTRICT`। সব জায়গায় `CASCADE` দিলে একটি ভুল delete-এ অর্ধেক database মুছে যায়।

### Type আর constraint

| দরকার                          | ব্যবহার করুন                    | এটা নয়                                                  |
| ----------------------------- | ---------------------- | ---------------------------------------------------- |
| টাকা                         | `numeric(12,2)`        | `float` — 0.1 + 0.2 মানে 0.3 নয়                        |
| Timestamp                     | `timestamptz`          | `timestamp` — zone না থাকলে কোনো অর্থই থাকে না                |
| Identifier                    | `bigint` / `bigserial` | `int` — 2.1 billion আপনার ধারণার চেয়ে আগেই চলে আসে     |
| Client-এর বানানো identifier    | `uuid` v7              | Clustered key হিসেবে `uuid` v4 — random insert index-কে টুকরো টুকরো করে দেয় |

> ⚠️ `timestamp without time zone` zone ছাড়া শুধু ঘড়ির একটি reading রাখে। দুটি region-এর server এর অর্থ নিয়ে
> একমত হয় না, আর daylight saving বদলালে ভুলটা আর শোধরানো যায় না। `timestamptz` ব্যবহার করুন।

বেশিরভাগ নিয়ম `NOT NULL`, `UNIQUE`, `FOREIGN KEY` আর `CHECK` দিয়েই হয়ে যায়। Interview-এ যেটার নাম নেওয়ার মতো, সেটা
`EXCLUDE`। Application code-এ "overlap নেই" নিশ্চিত করতে একবার পড়তে হয় আর lock নিতে হয়, আর দুটির মাঝে একটু ফাঁক
থাকলেই race। Constraint যেকোনো concurrency-তে ঠিক থাকে। সাধারণ column-এ `=` ব্যবহার করতে `btree_gist` লাগে।

**একই user-এর দুটি subscription-এর সময় যেন না মেলে:**

```sql
ALTER TABLE subscriptions
  ADD CONSTRAINT valid_period CHECK (ends_at > starts_at),
  ADD CONSTRAINT no_overlap EXCLUDE USING gist (
    user_id WITH =, tstzrange(starts_at, ends_at) WITH &&
  );
```

## কখন ব্যবহার করবেন

আগে normalise করুন। Denormalise করুন শুধু মেপে দেখার পরে, আর বলে দিন copy-টা ঠিক রাখার দায়িত্ব কার।

| পরিস্থিতি                                      | বেছে নিন                         | যে দাম দিতে রাজি                                   |
| ---------------------------------------------- | ------------------------------ | ------------------------------------------------- |
| Hot post-এর প্রতিটি read-এ `COUNT(*)`         | একটি counter column               | একই transaction-এ update করুন, নইলে মান সরে যায়   |
| Hot list-এ author-এর নাম লাগে             | Copy করা একটি display field         | নাম বদলালে পুরনো থেকে যায়, যদি না মিলিয়ে নেন      |
| Dashboard-এর aggregate খুব ধীর              | Materialised view            | Refresh-এর দেরি, আর প্রতিটি refresh-এর খরচ          |
| Product category ভেদে attribute আলাদা         | GIN index-সহ একটি `jsonb` column | Foreign key নেই, check দুর্বল                  |

## সাধারণ ভুল

**❌ String জোড়া দিয়ে SQL বানানো।** ✅ সবসময় parameter পাঠান — দেখুন
[Chapter ?? — Input Validation ও Injection](#ch-backend-input-validation)।

**❌ অনেক পেছনের page-এর জন্য `OFFSET`।** বাদ দেওয়া প্রতিটি row database-কে তবু পেরোতে হয়। ✅ Keyset pagination
ব্যবহার করুন, যেমনটা আছে [Chapter ?? — REST Best Practice ও Versioning](#ch-rest-best-practices)-এ।

**❌ Email-এর মতো natural key-কে primary key করা।** একদিন সেটা বদলাবে, আর সঙ্গে প্রতিটি foreign key-ও বদলাতে হবে।
✅ Surrogate key ব্যবহার করুন, আর natural key-টার ওপর একটি `UNIQUE` constraint দিন।

## 🔑 মূল শিক্ষা

- Clause কোন ক্রমে চলে — `WHERE`, তারপর `GROUP BY`, তারপর `SELECT` — এটা জানলে SQL-এর বেশিরভাগ চমক বোঝা যায়।
- `LEFT JOIN`-এর outer table-এর filter লিখতে হয় `ON`-এ, নইলে join চুপচাপ inner join হয়ে যায়।
- Nullable column-এর ওপর `NOT IN` কিছুই ফেরত দেয় না, তাই নিরাপদ default হলো `NOT EXISTS`।
- Third normal form পর্যন্ত normalise করুন। Denormalise করুন শুধু মেপে দেখার পরে, আর মান সরে যাওয়ার দায়িত্ব কারও হাতে দিয়ে।
- নিয়মের জায়গা schema-তে, type আর constraint হিসেবে, কারণ প্রতিটি writer-কে একমাত্র database পেরিয়েই যেতে হয়।

## Interview-এর প্রশ্ন

**Q: একটি `LEFT JOIN` শুধু মেলা row ফেরত দিচ্ছে। কেন?**

ডান দিকের table-এর একটি শর্ত বসানো আছে `WHERE`-এ। না-মেলা row-গুলোতে সেখানে `NULL` থাকে, তাই তুলনার ফল হয় unknown,
আর সেগুলো বাদ পড়ে যায়। ফলে outer join হয়ে যায় inner join। শর্তটা `ON` clause-এ সরিয়ে দিন।

**Q: প্রতি group-এর top তিনটি row কীভাবে বের করবেন?**

একটি subquery-তে `ROW_NUMBER() OVER (PARTITION BY group_col ORDER BY sort_col DESC)` ব্যবহার করুন, তারপর বাইরে rank
দিয়ে ছাঁকুন। বাইরের query-টা লাগে, কারণ window function চলে `WHERE`-এর পরে। Postgres-এ প্রতি group-এ ঠিক একটি row
চাইলে `DISTINCT ON` ছোট করে লেখা যায়।

**Q: কখন denormalise করবেন?**

শুধু তখন, যখন মেপে দেখেছেন যে একটি join বা aggregate-ই bottleneck, আর index দিয়ে সেটা ঠিক হচ্ছে না। Read যখন write-এর
চেয়ে অনেক বেশি, তখন comment-এর counter রাখা যুক্তিসঙ্গত। তবে এতে একটি দায় তৈরি হয়: comment-এর একই transaction-এ
counter update করতে হবে, আর একটি job চালাতে হবে যেটা মাঝে মাঝে মিলিয়ে দেখে।

**Q: একই room-এর দুটি booking-এর সময় যেন না মেলে, তা কীভাবে আটকাবেন?**

Room id আর সময়ের range-এর ওপর overlap operator দিয়ে একটি `EXCLUDE USING gist` constraint দিন। Application code-এ
আগের booking পড়ে lock নিতে হয়, আর পড়া আর লেখার মাঝে সামান্য ফাঁক থাকলেই race। Concurrency থাকলে একমাত্র সঠিক উত্তর
constraint।

## এরপর কী পড়বেন

- [Chapter ?? — Index, Query Plan, ORM ও Migration](#ch-indexes) — এইমাত্র লেখা query-টা কেন ধীর, আর চালু schema কীভাবে বদলাবেন
- [Chapter ?? — Transaction ও Concurrency](#ch-sql-transactions) — এমন দুটি query একসঙ্গে চললে কী হয়
