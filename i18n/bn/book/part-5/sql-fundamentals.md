---
sourceHash: "cf929c70db76b682b57f8439fe0775e874a1b7c9938db8a36f8e1feb801dbfbe"
title: "SQL-এর মূল কথা ও Schema Design"
translatedAt: "2026-10-12T12:22:14.366Z"
model: "claude-opus-5-5 (Claude Code)"
---

# SQL-এর মূল কথা ও Schema Design {#ch-sql-fundamentals}

> Interviewer যে query চান, সেটা লিখুন, database সেটা নিয়ে কী করে তা ব্যাখ্যা করুন, আর এমন একটি schema design করুন, যেটা খারাপ data নিতে অস্বীকার করে।

**এই অধ্যায়ে:** clause evaluation-এর ক্রম · join, grouping আর window function · CTE আর `NOT IN`-এর ফাঁদ · normalisation আর কখন সেটা ভাঙবেন · type আর constraint

## 💡 মূল ধারণা

SQL declarative। আপনি ফলাফলটা বর্ণনা করেন, আর database-এর ভেতরের query planner ঠিক করে সেটা কীভাবে পাবে।
একই row return করা দুটো query-র খরচে হাজার গুণ পার্থক্য হতে পারে। তাই "আপনি কি এই query লিখতে পারেন" হলো
interviewer যা যাচাই করেন, তার অর্ধেক মাত্র।

Schema আরও বেশি গুরুত্বপূর্ণ। Code আবার লেখা হয়, কিন্তু data টিকে থাকে, তার ভেতরে জমা থাকা প্রতিটি খারাপ
সিদ্ধান্ত নিয়ে। লক্ষ্য হলো invalid state-কে **store করা অসম্ভব** করে দেওয়া। Customer ছাড়া যদি একটি order থাকতে
না পারে, তাহলে সেটা একটি foreign key, কোনো service-এর ভেতরের check নয়। Application validation আরও ভালো error
message দেয়। আর database নিয়মটার guarantee দেয়, কারণ প্রতিটি writer তার ভেতর দিয়েই যায়।

## কীভাবে কাজ করে

### Evaluation-এর ক্রম

**একটি query-র logical ক্রম, যেটা আপনি যে ক্রমে লেখেন সেটা নয়:**

```text
FROM → JOIN → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT
```

SQL-এর বেশিরভাগ চমকই এই তালিকার সাথে মিলিয়ে দেখলে বোঝা যায়। `WHERE`-এ আপনি একটি `SELECT` alias ব্যবহার করতে
পারবেন না, কারণ `WHERE` আগে চলে। `ORDER BY`-তে পারবেন, কারণ সেটা পরে চলে। `WHERE` row filter করে। `HAVING`
group filter করে, কারণ `WHERE` চলার সময় group-এর অস্তিত্বই থাকে না। তাই `HAVING`-ই একমাত্র clause, যেটা
`COUNT(o.id) >= 3`-এর মতো একটি aggregate পরীক্ষা করতে পারে।

`SELECT`-এর প্রতিটি column হয় `GROUP BY`-তে থাকতে হবে, নয়তো একটি aggregate-এ মোড়ানো থাকতে হবে। `COUNT(*)` row
গোনে, কিন্তু `COUNT(column)` `NULL` বাদ দেয়। তাই একটি `LEFT JOIN`-এর পরে, যে user-এর কোনো order নেই, সে পায় `0`,
`1` নয়। খালি set-এর ওপর `SUM` হলো `NULL`, শূন্য নয়, তাই এটাকে `COALESCE`-এ মুড়ে দিন।

### Join

`INNER` শুধু সেই row রাখে, যেগুলো দুই দিকেই মেলে। `LEFT` বাঁ দিকের প্রতিটি row রাখে, আর যেখানে কিছু মেলে না
সেখানে ডান দিকে `NULL` বসায়: "প্রতিটি user, আর তাদের order থাকলে সেগুলোও"। ক্লাসিক ফাঁদ হলো outer table-এর
filter `ON`-এর বদলে `WHERE`-এ রাখা।

**একটি `LEFT JOIN`, যেটা চুপচাপ inner join হয়ে যায়:**

```sql
-- ❌ Unmatched users have NULL status, fail the WHERE test, and vanish
SELECT u.name, o.total FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE o.status = 'paid';

-- ✅ The condition belongs to the join, so unmatched users survive
SELECT u.name, o.total FROM users u
LEFT JOIN orders o ON o.user_id = u.id AND o.status = 'paid';
```

> ⚠️ Join row-এর সংখ্যা গুণ করে। একজন user-কে তার order আর তার address-এর সাথে join করলে, প্রতি user-এ
> order × address সংখ্যক row পাবেন। এর ওপর যেকোনো `SUM` দুবার গোনে। আগে প্রতিটি দিক একটি subquery-তে
> aggregate করুন, বা `COUNT(DISTINCT …)` ব্যবহার করুন।

### CTE আর subquery

একটি **CTE** (`WITH …`) হলো একটি নাম দেওয়া subquery। এটা মূলত readability এনে দেয়। Postgres 12-এর আগে একটি CTE
সবসময় আগে পুরোটা চলত, তাই বাইরের filter এর ভেতরে পৌঁছাতে পারত না। Recursive রূপটি একটি hierarchy-র ভেতর দিয়ে হাঁটে।

**একটি category-র প্রতিটি descendant:**

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

একটি window function একটি row-এর set জুড়ে হিসাব করে, **সেগুলোকে এক করে না ফেলে**। `GROUP BY`-এর সাথে পার্থক্য
এটাই, আর বেশিরভাগ "প্রতি group-এ top N" প্রশ্নের উত্তর এটা দেয়।

**প্রতি user-এর সবচেয়ে সাম্প্রতিক তিনটি order:**

```sql
SELECT * FROM (
  SELECT o.*,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
  FROM orders o
) ranked
WHERE rn <= 3;
```

বাইরের মোড়কটা লাগে, কারণ window function `WHERE`-এর পরে চলে। `RANK` আর `DENSE_RANK` সমান মানের row-গুলোকে একই
সংখ্যা দেয়। `LAG` আর `LEAD` আগের বা পরের row পড়ে, মাস থেকে মাসের পরিবর্তনের জন্য।

### Normalisation

| Form    | নিয়ম                                                        | Violation দেখতে কেমন                 |
| ------- | ----------------------------------------------------------- | ------------------------------------ |
| **1NF** | প্রতিটি column একটি atomic value ধরে                         | `tags` রাখা হয়েছে `"a,b,c"` হিসেবে           |
| **2NF** | কোনো non-key column একটি composite key-এর অংশের ওপর নির্ভর করে না        | `order_items`-এ `product_name`      |
| **3NF** | কোনো non-key column অন্য একটি non-key column-এর ওপর নির্ভর করে না         | `users`-এ `city` আর `postcode` দুটোই |

Third normal form হলো default, কারণ duplication সময়ের সাথে সরে যায়। একটি product-এর নাম যদি `order_items`-এ
থাকে, তাহলে product-এর নাম বদলানো মানে দশ লাখ row update করা। যে row বাদ পড়ল, সেটা এখন ভুল। একটি তথ্য, একটি জায়গা।

**Order আর তাদের item, normalised:**

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

ওই `unit_price` copy-টাই মূল সূক্ষ্মতা। *Order-এর সময়ের* দাম আর আজকের দাম দুটো আলাদা তথ্য। নির্দিষ্ট সময়ের
data সবসময় copy করা হয়, আর সেটা কোনো violation নয়।

`ON DELETE` একটি design-এর সিদ্ধান্ত: parent যে data-র মালিক, তার জন্য `CASCADE`, আর reference যখন প্রমাণ করে
parent ব্যবহার হচ্ছে, তখন `RESTRICT`। সব জায়গায় `CASCADE` মানে একটি ভুল delete অর্ধেক database মুছে ফেলে।

### Type আর constraint

| দরকার                          | ব্যবহার করুন                    | যা নয়                                                  |
| ----------------------------- | ---------------------- | ---------------------------------------------------- |
| টাকা                         | `numeric(12,2)`        | `float` — 0.1 + 0.2 মানে 0.3 নয়                        |
| Timestamp                     | `timestamptz`          | `timestamp` — zone নেই মানে কোনো অর্থ নেই                |
| Identifier                    | `bigint` / `bigserial` | `int` — 2.1 billion আপনার ধারণার চেয়ে আগেই চলে আসে     |
| Client-এর তৈরি identifier    | `uuid` v7              | clustered key হিসেবে `uuid` v4 — random insert index-কে টুকরো করে দেয় |

> ⚠️ `timestamp without time zone` zone ছাড়া একটি দেয়ালঘড়ির পাঠ store করে। দুই region-এর server এর মানে নিয়ে
> একমত হয় না, আর daylight-saving-এর পরিবর্তন আর ফেরানো যায় না। `timestamptz` ব্যবহার করুন।

`NOT NULL`, `UNIQUE`, `FOREIGN KEY` আর `CHECK` বেশিরভাগ নিয়ম cover করে। Interview-এ যেটার নাম নেওয়ার মতো, সেটা
`EXCLUDE`। Application code-এ "কোনো overlap নয়" করতে একটি read আর একটি lock লাগে, আর এদের মাঝের যেকোনো ফাঁক একটি
race। Constraint যেকোনো concurrency-তে সঠিক থাকে। একটি সাধারণ column-এ `=`-এর জন্য `btree_gist` লাগে।

**একজন user-এর জন্য overlap করা দুটো subscription নয়:**

```sql
ALTER TABLE subscriptions
  ADD CONSTRAINT valid_period CHECK (ends_at > starts_at),
  ADD CONSTRAINT no_overlap EXCLUDE USING gist (
    user_id WITH =, tstzrange(starts_at, ends_at) WITH &&
  );
```

## কখন ব্যবহার করবেন

আগে normalise করুন। শুধু মেপে দেখার পরেই denormalise করুন, আর বলে দিন copy-টা সঠিক রাখার দায়িত্ব কার।

| পরিস্থিতি                                      | বেছে নিন                         | যে খরচ মেনে নিচ্ছেন                                   |
| ---------------------------------------------- | ------------------------------ | ------------------------------------------------- |
| একটি জনপ্রিয় post-এর প্রতিটি read-এ `COUNT(*)`         | একটি counter column               | একই transaction-এ update করুন, নইলে এটা সরে যায়   |
| একটি hot list-এ author-এর নাম লাগে             | Copy করা একটি display field         | নাম বদলালে stale, যদি না reconcile করেন      |
| একটি dashboard aggregate খুব ধীর              | একটি materialised view            | Refresh-এর দেরি, আর প্রতিটি refresh-এর খরচ          |
| Product category অনুযায়ী attribute আলাদা         | GIN index-সহ একটি `jsonb` column | কোনো foreign key নেই, check দুর্বল                  |

## সাধারণ ভুল

**❌ String জোড়া দিয়ে SQL বানানো।** ✅ সবসময় parameter পাঠান — দেখুন
[Chapter ?? — Input Validation ও Injection](#ch-backend-input-validation)।

**❌ গভীর pagination-এর জন্য `OFFSET`।** Database তখনো বাদ দেওয়া প্রতিটি row-এর ভেতর দিয়ে হাঁটে। ✅ Keyset pagination ব্যবহার করুন,
যেমন [Chapter ?? — REST Best Practice ও Versioning](#ch-rest-best-practices)-এ আছে।

**❌ Primary key হিসেবে একটি natural key, যেমন email।** একদিন এটা বদলায়, আর প্রতিটি foreign key-কেও এর সাথে
বদলাতে হয়। ✅ একটি surrogate key ব্যবহার করুন, সাথে natural key-এর ওপর একটি `UNIQUE` constraint।

## 🔑 মূল শিক্ষা

- Clause evaluation-এর ক্রম, যেখানে `WHERE` আসে `GROUP BY`-এর আগে আর সেটা `SELECT`-এর আগে, SQL-এর বেশিরভাগ চমক ব্যাখ্যা করে।
- একটি `LEFT JOIN`-এর outer table-এর filter থাকবে `ON`-এ, নইলে join চুপচাপ inner join হয়ে যায়।
- Nullable column-এর ওপর `NOT IN` কিছুই return করে না, তাই `NOT EXISTS`-ই নিরাপদ default।
- Third normal form পর্যন্ত normalise করুন, আর শুধু মেপে দেখার পরেই denormalise করুন, সরে যাওয়ার দায়িত্ব কারও হাতে দিয়ে।
- নিয়মগুলোর জায়গা schema-তে, type আর constraint হিসেবে, কারণ database-ই একমাত্র জিনিস যার ভেতর দিয়ে প্রতিটি writer যায়।

## Interview-এর প্রশ্ন

**Q: একটি `LEFT JOIN` শুধু মেলা row return করছে। কেন?**

ডান দিকের table-এর একটি condition `WHERE`-এ আছে। না মেলা row-গুলোতে সেখানে `NULL` থাকে, তাই তুলনাটা unknown হয়,
আর সেগুলো filter হয়ে বাদ যায়। এতে outer join একটি inner join হয়ে যায়। Condition-টি `ON` clause-এ সরিয়ে নিন।

**Q: প্রতি group-এর top তিনটি row কীভাবে পাবেন?**

একটি subquery-তে `ROW_NUMBER() OVER (PARTITION BY group_col ORDER BY sort_col DESC)` ব্যবহার করুন, তারপর বাইরে rank-এর
ওপর filter করুন। বাইরের মোড়কটা লাগে, কারণ window function `WHERE`-এর পরে চলে। Postgres-এ প্রতি group-এ ঠিক একটি
row চাইলে `DISTINCT ON` আরও ছোট।

**Q: কখন denormalise করবেন?**

শুধু মেপে দেখার পরে যে একটি join বা aggregate-ই bottleneck, আর একটি index সেটা ঠিক করতে পারে না। Read যখন write-এর
চেয়ে অনেক বেশি, তখন একটি comment counter ন্যায্য বিনিময়। তবে এটা একটি দায় তৈরি করে: comment-এর একই
transaction-এ এটা update করুন, আর একটি job চালান যেটা এটাকে reconcile করে।

**Q: একই room-এর জন্য overlap করা দুটো booking কীভাবে আটকাবেন?**

Room id আর time range-এর ওপর overlap operator দিয়ে একটি `EXCLUDE USING gist` constraint ব্যবহার করুন। Application
code-এ আপনাকে বিদ্যমান booking পড়তে আর lock নিতে হয়, আর read আর write-এর মাঝের যেকোনো ফাঁক একটি race।
Concurrency-তে constraint-ই একমাত্র সঠিক উত্তর।

## এরপর কী পড়বেন

- [Chapter ?? — Index, Query Plan, ORM ও Migration](#ch-indexes) — এইমাত্র লেখা query-টি কেন ধীর, আর একটি live schema কীভাবে বদলাবেন
- [Chapter ?? — Transaction ও Concurrency](#ch-sql-transactions) — এমন দুটো query একসাথে চললে কী হয়
