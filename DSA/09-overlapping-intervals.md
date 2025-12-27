# Overlapping Intervals Pattern

## What is Overlapping Intervals? (In Simple Words)

Imagine you're managing a calendar or scheduling meeting rooms. You have several appointments or meetings, each with a start time and end time. Some meetings might overlap (happen at the same time), while others don't. The **Overlapping Intervals** pattern is all about solving problems related to these time ranges.

### Real-World Analogy: Your Daily Calendar

Think about your daily schedule:
- Meeting 1: 9:00 AM - 10:30 AM
- Meeting 2: 10:00 AM - 11:00 AM (overlaps with Meeting 1!)
- Meeting 3: 2:00 PM - 3:00 PM (no overlap)

**Questions you might ask:**
- Can I attend all meetings? (Do any overlap?)
- How many meeting rooms do I need? (How many meetings happen at the same time?)
- Can I merge back-to-back meetings? (Combine 9-10 AM and 10-11 AM into 9-11 AM)

These are exactly the types of problems the Overlapping Intervals pattern solves!

### Visual Timeline Example

```
Timeline: 0 -------- 5 -------- 10 ------- 15 ------- 20 ------- 25 ------- 30

Meeting A: |===============================|  [0, 30]
              0                            30

Meeting B:      |=====|                       [5, 10]
                5    10

Meeting C:                |=====|             [15, 20]
                         15    20
```

**What do we notice?**
- Meeting B happens DURING Meeting A (5-10 is inside 0-30) → They overlap!
- Meeting C also happens DURING Meeting A (15-20 is inside 0-30) → They overlap!
- Meetings B and C don't overlap with each other
- We need 2 rooms maximum (when A and B run simultaneously)

---

## Pattern Overview

The **Overlapping Intervals** pattern deals with problems involving intervals (ranges) that may overlap with each other. This pattern typically involves sorting intervals and then merging, inserting, or finding overlaps.

### When to Use
- Merging overlapping intervals
- Finding free time slots or conflicts
- Scheduling problems (meeting rooms)
- Inserting new intervals
- Checking if intervals overlap

### Key Characteristics
- Usually requires sorting intervals first (by start time)
- Compares current interval with previous/next interval
- Often involves merging or counting overlaps
- Time complexity: O(n log n) for sorting + O(n) for processing

### Pattern Identification
Look for this pattern when you see:
- "Merge overlapping intervals"
- "Meeting rooms" or scheduling problems
- "Insert interval"
- "Find free time"
- "Check if intervals conflict"
- Problems involving time ranges, appointments, or schedules

---

## How to Recognize This Pattern (Beginner's Checklist)

You should think "Overlapping Intervals" when you see:

1. **Keywords in the problem:**
   - "Intervals", "ranges", "time slots"
   - "Overlapping", "merging", "conflicts"
   - "Meeting rooms", "calendar", "scheduling"
   - "Start time" and "end time"

2. **Input format:**
   - Array of pairs/arrays: `[[1,3], [2,6], [8,10]]`
   - Each element has a start and end: `[start, end]`

3. **Questions being asked:**
   - "Merge overlapping..."
   - "How many rooms/resources needed?"
   - "Can you attend all meetings?"
   - "Find free time between..."
   - "Minimum removals to make non-overlapping"

4. **Real-world scenarios:**
   - Calendar scheduling
   - Resource allocation (meeting rooms, servers)
   - Time range queries
   - Event planning with time conflicts

---

## Visual Understanding: Types of Interval Overlaps

### Case 1: Complete Overlap (One inside the other)
```
Timeline: 0 --- 1 --- 2 --- 3 --- 4 --- 5 --- 6

Interval A: |===================|  [1, 5]
            1                   5

Interval B:     |=======|           [2, 4]
                2       4

Result: Merge to [1, 5] (B is completely inside A)
```

### Case 2: Partial Overlap
```
Timeline: 0 --- 1 --- 2 --- 3 --- 4 --- 5 --- 6

Interval A: |===============|       [1, 4]
            1               4

Interval B:         |===============|  [3, 6]
                    3               6

Result: Merge to [1, 6] (they overlap from 3-4)
```

### Case 3: Touching at Boundary
```
Timeline: 0 --- 1 --- 2 --- 3 --- 4 --- 5 --- 6

Interval A: |===========|           [1, 3]
            1           3

Interval B:             |===========| [3, 5]
                        3           5

Result: Merge to [1, 5] (touching at point 3)
```

### Case 4: No Overlap (Gap between)
```
Timeline: 0 --- 1 --- 2 --- 3 --- 4 --- 5 --- 6

Interval A: |=======|               [1, 2]
            1       2

Interval B:                 |=======| [4, 5]
                            4       5

Result: Keep both [1, 2] and [4, 5] (gap from 2-4)
```

---

## Example 1: Merge Intervals (JavaScript)

### Problem
Given an array of `intervals` where `intervals[i] = [start_i, end_i]`, merge all overlapping intervals and return an array of the non-overlapping intervals.

**LeetCode**: [56. Merge Intervals](https://leetcode.com/problems/merge-intervals/)

### Solution

```javascript
/**
 * Merge overlapping intervals
 * @param {number[][]} intervals - Array of intervals [start, end]
 * @return {number[][]} - Merged non-overlapping intervals
 */
function merge(intervals) {
    // Edge case: empty or single interval
    if (intervals.length <= 1) {
        return intervals;
    }

    // Step 1: Sort intervals by start time
    intervals.sort((a, b) => a[0] - b[0]);

    // Step 2: Initialize result with first interval
    const merged = [intervals[0]];

    // Step 3: Iterate through remaining intervals
    for (let i = 1; i < intervals.length; i++) {
        const currentInterval = intervals[i];
        const lastMerged = merged[merged.length - 1];

        // Check if current interval overlaps with last merged interval
        if (currentInterval[0] <= lastMerged[1]) {
            // Overlaps - merge by extending end time
            lastMerged[1] = Math.max(lastMerged[1], currentInterval[1]);
        } else {
            // No overlap - add current interval as new interval
            merged.push(currentInterval);
        }
    }

    return merged;
}

// Example usage
console.log(merge([[1, 3], [2, 6], [8, 10], [15, 18]]));
// Output: [[1, 6], [8, 10], [15, 18]]
// Explanation: [1,3] and [2,6] overlap → merged to [1,6]

console.log(merge([[1, 4], [4, 5]]));
// Output: [[1, 5]]
// Explanation: [1,4] and [4,5] overlap at 4 → merged to [1,5]

console.log(merge([[1, 4], [0, 4]]));
// Output: [[0, 4]]
// Explanation: After sorting → [[0,4], [1,4]] → merged to [0,4]

console.log(merge([[1, 4], [2, 3]]));
// Output: [[1, 4]]
// Explanation: [2,3] is completely inside [1,4] → merged to [1,4]
```

### Explanation

**How to check overlap**:
- Two intervals `[a, b]` and `[c, d]` overlap if `c <= b` (assuming sorted by start)
- When overlapping, merge to `[a, max(b, d)]`

### Step-by-Step Walkthrough with Timeline Visualization

Let's trace through: `[[1,3], [2,6], [8,10], [15,18]]`

**Step 0: Initial State (Before Sorting)**
```
Input: [[1,3], [2,6], [8,10], [15,18]]

Timeline: 0 --- 1 --- 2 --- 3 --- 4 --- 5 --- 6 --- 7 --- 8 --- 9 --- 10 --- ... --- 15 --- ... --- 18

         [1,3]:  |=======|
                 1       3

         [2,6]:      |===============|
                     2               6

        [8,10]:                              |=======|
                                             8       10

       [15,18]:                                              |===============|
                                                            15              18
```

**Step 1: Sort by start time**
```
After sorting: [[1,3], [2,6], [8,10], [15,18]]
(Already sorted in this example)

Initialize merged = [[1,3]]  ← Start with first interval
```

**Step 2: Process [2,6]**
```
Current: [2,6]
Last merged: [1,3]

Question: Does [2,6] overlap with [1,3]?
Check: Is 2 <= 3? YES! → They overlap!

Timeline: 0 --- 1 --- 2 --- 3 --- 4 --- 5 --- 6
         [1,3]:  |=======|
                 1       3
         [2,6]:      |===============|
                     2               6
         MERGED: |===================|  ← Combine them!
                 1                   6

Merge: [1, max(3, 6)] = [1, 6]
merged = [[1,6]]
```

**Step 3: Process [8,10]**
```
Current: [8,10]
Last merged: [1,6]

Question: Does [8,10] overlap with [1,6]?
Check: Is 8 <= 6? NO! → No overlap, there's a gap!

Timeline: 0 --- 1 --- ... --- 6 --- 7 --- 8 --- 9 --- 10
         [1,6]:  |=============|
                 1             6
                                   GAP
        [8,10]:                        |=======|
                                       8       10

Action: Add [8,10] as a new separate interval
merged = [[1,6], [8,10]]
```

**Step 4: Process [15,18]**
```
Current: [15,18]
Last merged: [8,10]

Question: Does [15,18] overlap with [8,10]?
Check: Is 15 <= 10? NO! → No overlap, there's a gap!

Timeline: 8 --- 9 --- 10 --- 11 --- ... --- 15 --- ... --- 18
        [8,10]: |=======|
                8       10
                            GAP
      [15,18]:                          |===============|
                                       15              18

Action: Add [15,18] as a new separate interval
merged = [[1,6], [8,10], [15,18]]
```

**Final Result:**
```
Timeline: 0 --- 1 --- ... --- 6 --- 7 --- 8 --- ... --- 10 --- ... --- 15 --- ... --- 18

Result:  |=============|              |=========|              |===============|
         1             6              8         10            15              18

Output: [[1,6], [8,10], [15,18]]
```

### Another Example: Completely Contained Intervals

Let's trace: `[[1,4], [2,3]]`

**Visual Timeline:**
```
Timeline: 0 --- 1 --- 2 --- 3 --- 4 --- 5

         [1,4]:  |===============|
                 1               4

         [2,3]:      |=======|     ← Completely inside [1,4]!
                     2       3
```

**Step-by-step:**
```
1. Sort: [[1,4], [2,3]] (already sorted)
2. merged = [[1,4]]
3. Process [2,3]:
   - Check: Is 2 <= 4? YES! → Overlap!
   - Merge: [1, max(4, 3)] = [1, 4]
   - merged = [[1,4]]  ← Result stays [1,4] because [2,3] was inside it!

Result: [[1,4]]
```

**Edge Cases**:
1. Completely contained: `[1,4]` contains `[2,3]` → merge to `[1,4]`
2. Touching at boundary: `[1,4]` and `[4,5]` → merge to `[1,5]`
3. No overlap: `[1,3]` and `[4,6]` → keep both

---

## Example 2: Meeting Rooms II (Python)

### Problem
Given an array of meeting time intervals consisting of start and end times `[[s1,e1],[s2,e2],...]`, find the minimum number of conference rooms required.

**LeetCode**: [253. Meeting Rooms II](https://leetcode.com/problems/meeting-rooms-ii/) (Premium)

### Solution

```python
from typing import List
import heapq

class Solution:
    def minMeetingRooms(self, intervals: List[List[int]]) -> int:
        """
        Find minimum number of meeting rooms required using heap

        Args:
            intervals: List of meeting intervals [start, end]

        Returns:
            Minimum number of meeting rooms needed
        """
        # Edge case
        if not intervals:
            return 0

        # Step 1: Sort meetings by start time
        intervals.sort(key=lambda x: x[0])

        # Step 2: Use min-heap to track end times of ongoing meetings
        # Heap stores end times of meetings currently in progress
        meeting_rooms = []

        # Step 3: Process each meeting
        for interval in intervals:
            start, end = interval

            # If earliest ending meeting finishes before current starts,
            # we can reuse that room
            if meeting_rooms and meeting_rooms[0] <= start:
                heapq.heappop(meeting_rooms)  # Remove finished meeting

            # Add current meeting's end time to heap
            heapq.heappush(meeting_rooms, end)

        # Number of rooms needed = size of heap (concurrent meetings)
        return len(meeting_rooms)

    def minMeetingRoomsAlternative(self, intervals: List[List[int]]) -> int:
        """
        Alternative solution using separate start/end arrays

        Time: O(n log n), Space: O(n)
        """
        if not intervals:
            return 0

        # Separate start and end times
        start_times = sorted([i[0] for i in intervals])
        end_times = sorted([i[1] for i in intervals])

        rooms_needed = 0
        max_rooms = 0
        start_ptr = 0
        end_ptr = 0

        # Process all start times
        while start_ptr < len(start_times):
            # If a meeting starts before earliest one ends
            if start_times[start_ptr] < end_times[end_ptr]:
                rooms_needed += 1
                max_rooms = max(max_rooms, rooms_needed)
                start_ptr += 1
            else:
                # A meeting ended, free up a room
                rooms_needed -= 1
                end_ptr += 1

        return max_rooms

# Example usage
solution = Solution()

# Example 1
intervals1 = [[0, 30], [5, 10], [15, 20]]
print(solution.minMeetingRooms(intervals1))  # Output: 2
# Explanation:
# Meeting 1: 0-30
# Meeting 2: 5-10 (overlaps with 1, need room 2)
# Meeting 3: 15-20 (still overlaps with 1, can reuse room 2)
# Max concurrent meetings: 2

# Example 2
intervals2 = [[7, 10], [2, 4]]
print(solution.minMeetingRooms(intervals2))  # Output: 1
# Explanation: Meetings don't overlap, can use same room

# Example 3
intervals3 = [[1, 5], [2, 3], [4, 6], [5, 7]]
print(solution.minMeetingRooms(intervals3))  # Output: 3
# Explanation:
# Time 2-3: [1,5], [2,3] overlap → 2 rooms
# Time 4-5: [1,5], [4,6] overlap → 2 rooms
# Time 5-6: [1,5], [4,6], [5,7] overlap → 3 rooms needed

# Example 4
intervals4 = [[0, 30], [5, 10], [15, 20]]
print(solution.minMeetingRoomsAlternative(intervals4))  # Output: 2
```

### Explanation

**Heap-based Approach**:

1. **Sort by start time**: Process meetings in chronological order
2. **Min-heap of end times**: Track when current meetings will end
3. **For each meeting**:
   - Check if earliest ending meeting finishes before current starts
   - If yes, reuse that room (pop from heap)
   - Add current meeting's end time to heap
4. **Result**: Heap size = number of concurrent meetings = rooms needed

### Step-by-Step Walkthrough with Timeline Visualization

Let's trace: `[[0,30], [5,10], [15,20]]`

**Visual Timeline of All Meetings:**
```
Timeline: 0 -------- 5 -------- 10 ------- 15 ------- 20 ------- 25 ------- 30

Meeting A: |===============================================================| [0, 30]
           0                                                              30

Meeting B:          |===========|                                          [5, 10]
                    5          10

Meeting C:                              |===========|                      [15, 20]
                                       15          20

At time 5-10: Both A and B are running → Need 2 rooms!
At time 15-20: Both A and C are running → Need 2 rooms!
Maximum rooms needed: 2
```

**Step 1: Sort by start time**
```
After sorting: [[0,30], [5,10], [15,20]]
(Already sorted)

heap = []  ← Min-heap to track when meetings end
rooms_used = 0
```

**Step 2: Process Meeting [0,30]**
```
Meeting: [0, 30]
heap = []  ← Empty, so no rooms are free

Timeline: 0 -------- ... -------- 30
Room 1:   |====================| [0, 30] ONGOING
           0                    30

Action: Allocate a new room (Room 1)
heap = [30]  ← Room 1 will be free at time 30
rooms_used = 1
```

**Step 3: Process Meeting [5,10]**
```
Meeting: [5, 10]
heap = [30]  ← Room 1 ends at 30

Question: Can we reuse Room 1?
Check: Does any room end before time 5?
Earliest end time: 30
Is 30 <= 5? NO! → Room 1 is still busy

Timeline: 0 -------- 5 -------- 10 ------- ... ------- 30
Room 1:   |=======================================| [0, 30] ONGOING
           0                                      30
Room 2:              |===========|                   [5, 10] ONGOING
                     5          10

Action: Allocate a new room (Room 2)
heap = [10, 30]  ← Room 2 ends at 10, Room 1 ends at 30
rooms_used = 2  ← Maximum so far
```

**Step 4: Process Meeting [15,20]**
```
Meeting: [15, 20]
heap = [10, 30]  ← Room 2 ends at 10, Room 1 ends at 30

Question: Can we reuse any room?
Check: Does any room end before time 15?
Earliest end time: 10 (Room 2)
Is 10 <= 15? YES! → Room 2 is now free!

Timeline: 0 -------- 5 -------- 10 ------- 15 ------- 20 ------- 30
Room 1:   |========================================================| [0, 30] ONGOING
           0                                                      30
Room 2:              |===========|                                  [5, 10] FINISHED
                     5          10
Room 2:                                    |===========|            [15, 20] REUSED!
                                          15          20

Action: Reuse Room 2
Remove 10 from heap (Room 2 is now free)
heap = [30]
Add 20 to heap (Room 2 now ends at 20)
heap = [20, 30]
rooms_used = 2  ← Still 2 (we reused a room)
```

**Final Result:**
```
Timeline: 0 -------- 5 -------- 10 ------- 15 ------- 20 ------- 30

Room 1:   |========================================================|
           0                                                      30

Room 2:              |===========|       |===========|
                     5          10      15          20

Maximum concurrent meetings: 2 (happened from time 5-10 and 15-20)
Answer: 2 rooms needed
```

### Another Example: Three Concurrent Meetings

Let's trace: `[[1,5], [2,3], [4,6], [5,7]]`

**Visual Timeline:**
```
Timeline: 0 --- 1 --- 2 --- 3 --- 4 --- 5 --- 6 --- 7

Meeting A:      |===============|               [1, 5]
                1               5

Meeting B:          |=======|                   [2, 3]
                    2       3

Meeting C:                  |===========|       [4, 6]
                            4           6

Meeting D:                      |===========|   [5, 7]
                                5           7

At time 4-5: A, C running → 2 rooms
At time 5-6: A, C, D all running → 3 ROOMS NEEDED!
```

**Processing:**
```
1. Sort: [[1,5], [2,3], [4,6], [5,7]]

2. [1,5]:  heap = [5], rooms = 1
   Room 1: [1,5]

3. [2,3]:  Can reuse? 5 > 2 → NO
   heap = [3, 5], rooms = 2
   Room 1: [1,5]
   Room 2: [2,3]

4. [4,6]:  Can reuse? Earliest end = 3
   3 <= 4? YES! → Reuse Room 2
   Remove 3, add 6
   heap = [5, 6], rooms = 2
   Room 1: [1,5]
   Room 2: [4,6]

5. [5,7]:  Can reuse? Earliest end = 5
   5 <= 5? YES! → Reuse Room 1
   Remove 5, add 7
   heap = [6, 7], rooms = 2
   Room 1: [5,7]
   Room 2: [4,6]

Wait... this seems wrong!

Let me recalculate...
Actually at time 5-6, we have:
- [1,5] ends at 5
- [4,6] ongoing (4 to 6)
- [5,7] starts at 5

At exactly time 5, [1,5] ends and [5,7] starts.
Since start = end counts as overlap, we need 3 rooms!

The heap approach gives us max heap size = 3
```

---

## Time & Space Complexity

### Example 1: Merge Intervals
- **Time Complexity**: O(n log n) - Sorting dominates
- **Space Complexity**: O(n) - Result array (or O(log n) for sorting)

### Example 2: Meeting Rooms II
- **Heap approach**:
  - Time Complexity: O(n log n) - Sorting + n heap operations
  - Space Complexity: O(n) - Heap can contain all meetings
- **Two arrays approach**:
  - Time Complexity: O(n log n) - Sorting
  - Space Complexity: O(n) - Two arrays

---

## Common Variations

1. **Merge Intervals**
   - Basic merging of overlapping intervals
   - LeetCode: [56. Merge Intervals](https://leetcode.com/problems/merge-intervals/)

2. **Insert Interval**
   - Insert new interval and merge if necessary
   - LeetCode: [57. Insert Interval](https://leetcode.com/problems/insert-interval/)

3. **Meeting Rooms**
   - Check if person can attend all meetings
   - LeetCode: [252. Meeting Rooms](https://leetcode.com/problems/meeting-rooms/)

4. **Meeting Rooms II**
   - Find minimum conference rooms needed
   - LeetCode: [253. Meeting Rooms II](https://leetcode.com/problems/meeting-rooms-ii/)

5. **Non-overlapping Intervals**
   - Find minimum intervals to remove to make non-overlapping
   - LeetCode: [435. Non-overlapping Intervals](https://leetcode.com/problems/non-overlapping-intervals/)

6. **Employee Free Time**
   - Find free time intervals for all employees
   - LeetCode: [759. Employee Free Time](https://leetcode.com/problems/employee-free-time/)

---

## Practice Problems

### Easy
1. [252. Meeting Rooms](https://leetcode.com/problems/meeting-rooms/)

### Medium
2. [56. Merge Intervals](https://leetcode.com/problems/merge-intervals/)
3. [57. Insert Interval](https://leetcode.com/problems/insert-interval/)
4. [253. Meeting Rooms II](https://leetcode.com/problems/meeting-rooms-ii/)
5. [435. Non-overlapping Intervals](https://leetcode.com/problems/non-overlapping-intervals/)
6. [452. Minimum Number of Arrows to Burst Balloons](https://leetcode.com/problems/minimum-number-of-arrows-to-burst-balloons/)
7. [986. Interval List Intersections](https://leetcode.com/problems/interval-list-intersections/)

### Hard
8. [759. Employee Free Time](https://leetcode.com/problems/employee-free-time/)

---

## Key Takeaways

1. **Always sort first**: Sort by start time (or end time depending on problem)

2. **Overlap condition**: Two intervals `[a,b]` and `[c,d]` overlap if `c <= b` (when sorted by start)

3. **Merge formula**: When merging `[a,b]` and `[c,d]`, result is `[a, max(b,d)]`

4. **Common patterns**:
   - Merging: Track last merged interval
   - Counting overlaps: Use heap or sweep line algorithm
   - Finding gaps: Look for spaces between merged intervals

5. **Edge cases**: Touching intervals `[1,2]` and `[2,3]`, contained intervals `[1,5]` and `[2,3]`

6. **Heap for scheduling**: Min-heap of end times tracks active intervals

[← Previous: Top K Elements](./07-top-k-elements.md) | [Back to Index](./README.md) | [Next: Modified Binary Search →](./09-modified-binary-search.md)
