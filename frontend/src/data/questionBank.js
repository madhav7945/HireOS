// ============================================================
// HireOS Technical Question Bank — Multi-Domain & Role-Adaptive
//
// Structured categories:
//   - Frontend (React, TypeScript, DOM, Async UI)
//   - Backend (Node.js, Python, Concurrency, Caching, Algorithms)
//   - DevOps & Cloud (CI/CD, Graph Validation, Log Streaming)
//   - Data Science & ML (Normalization, Vector Operations, Data Prep)
//   - System Design & Architecture (Scalability, Sharding, Real-Time)
//   - QA & Testing (Assertions, Boundary Conditions, Validation)
// ============================================================

export const QUESTION_BANK = {
  // ------------------------------------------------------------
  // 1. FRONTEND / JAVASCRIPT / REACT
  // ------------------------------------------------------------
  frontend: [
    {
      id: 'fe-01',
      category: 'coding',
      domain: 'frontend',
      difficulty: 'Medium',
      title: 'Custom Debounce Utility',
      description: 'Implement a debounce function `debounce(fn, delay)` that delays invoking `fn` until after `delay` milliseconds have elapsed since the last time the debounced function was invoked.\n\nYour solution should support passing arguments to the debounced function and maintain proper execution scope.',
      complexityTarget: { time: 'O(1)', space: 'O(1)' },
      hints: [
        { level: 1, text: 'Think about using a timer (setTimeout) that gets reset every time the function is called before the delay expires.' },
        { level: 2, text: 'Use a closure to store the timer ID (`timeoutId`). Clear the previous timeout with `clearTimeout(timeoutId)` before setting a new one.' },
        { level: 3, text: 'Return a wrapper function `function(...args)` that calls `clearTimeout` on the stored handle, then assigns `timeoutId = setTimeout(() => fn.apply(this, args), delay)`.' }
      ],
      starterCode: {
        javascript: `function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}`,
        python: `import time
import threading

def debounce(fn, delay_sec):
    timer = None
    def wrapper(*args, **kwargs):
        nonlocal timer
        if timer:
            timer.cancel()
        timer = threading.Timer(delay_sec, fn, args=args, kwargs=kwargs)
        timer.start()
    return wrapper`,
        java: `import java.util.concurrent.*;

public class Solution {
    // Java debounce demonstration wrapper
    public static Runnable debounce(Runnable fn, long delayMs) {
        return new Runnable() {
            private ScheduledFuture<?> future;
            private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();

            @Override
            public synchronized void run() {
                if (future != null && !future.isDone()) {
                    future.cancel(false);
                }
                future = scheduler.schedule(fn, delayMs, TimeUnit.MILLISECONDS);
            }
        };
    }
}`
      },
      fnName: 'debounce',
      tests: [
        { name: 'Function Returns Wrapper', args: ['fn', 100], expected: true, testType: 'unit' },
        { name: 'Trailing Execution Only', args: ['fn', 50], expected: true, testType: 'timing' },
      ],
      timeLimit: 600,
      tags: ['JavaScript', 'Async', 'Closures', 'React'],
    },
    {
      id: 'fe-02',
      category: 'coding',
      domain: 'frontend',
      difficulty: 'Medium',
      title: 'Flatten Deep Nested Array & Object',
      description: 'Implement a function `flattenDeep(arr)` that takes an array with arbitrarily nested arrays and returns a single, flat array containing all elements in order.\n\nDo not use the built-in `Array.prototype.flat()`.',
      complexityTarget: { time: 'O(N)', space: 'O(D) recursion depth' },
      hints: [
        { level: 1, text: 'Iterate through each item and check if it is an Array using `Array.isArray(item)`.' },
        { level: 2, text: 'If an item is an array, recursively call `flattenDeep` on it; otherwise, push the item into your accumulator result.' },
        { level: 3, text: 'You can use `Array.prototype.reduce` or an iterative loop with a stack for an iterative solution.' }
      ],
      starterCode: {
        javascript: `function flattenDeep(arr) {
  const result = [];
  function helper(list) {
    for (let i = 0; i < list.length; i++) {
      if (Array.isArray(list[i])) {
        helper(list[i]);
      } else {
        result.push(list[i]);
      }
    }
  }
  helper(arr);
  return result;
}`,
        python: `def flatten_deep(arr):
    result = []
    for item in arr:
        if isinstance(item, list):
            result.extend(flatten_deep(item))
        else:
            result.append(item)
    return result`,
        java: `import java.util.*;

class Solution {
    public List<Object> flattenDeep(List<Object> arr) {
        List<Object> result = new ArrayList<>();
        for (Object item : arr) {
            if (item instanceof List) {
                result.addAll(flattenDeep((List<Object>) item));
            } else {
                result.add(item);
            }
        }
        return result;
    }
}`
      },
      fnName: 'flattenDeep',
      tests: [
        { args: [[1, [2, [3, [4]], 5]]], expected: [1, 2, 3, 4, 5] },
        { args: [[[], [1, 2], [[3]]]], expected: [1, 2, 3] },
        { args: [[1, 2, 3]], expected: [1, 2, 3] },
        { args: [[]], expected: [] },
      ],
      timeLimit: 600,
      tags: ['Recursion', 'Array', 'Data Transformation'],
    },
    {
      id: 'fe-03',
      category: 'coding',
      domain: 'frontend',
      difficulty: 'Hard',
      title: 'DOM / Virtual Tree Diffing Identifier',
      description: 'Given two virtual node tree structures `oldTree` and `newTree`, return a list of modified node IDs that require DOM re-rendering.\n\nA node is considered changed if its `tag`, `text`, or any of its `props` have changed.',
      complexityTarget: { time: 'O(N)', space: 'O(N)' },
      hints: [
        { level: 1, text: 'Traverse both trees simultaneously starting from the root node.' },
        { level: 2, text: 'Compare node properties: `oldNode.tag === newNode.tag` and JSON representation of props.' },
        { level: 3, text: 'If mismatched, record the node ID and recursively compare matching children by key/index.' }
      ],
      starterCode: {
        javascript: `function getChangedNodeIds(oldTree, newTree) {
  const changed = [];
  function compare(a, b) {
    if (!a || !b) return;
    const propsChanged = JSON.stringify(a.props || {}) !== JSON.stringify(b.props || {});
    if (a.tag !== b.tag || a.text !== b.text || propsChanged) {
      changed.push(a.id || b.id);
    }
    const maxLen = Math.max(a.children?.length || 0, b.children?.length || 0);
    for (let i = 0; i < maxLen; i++) {
      compare(a.children?.[i], b.children?.[i]);
    }
  }
  compare(oldTree, newTree);
  return changed;
}`,
        python: `def get_changed_node_ids(old_tree, new_tree):
    changed = []
    def compare(a, b):
        if not a or not b:
            return
        props_changed = a.get('props') != b.get('props')
        if a.get('tag') != b.get('tag') or a.get('text') != b.get('text') or props_changed:
            changed.append(a.get('id') or b.get('id'))
        ch_a = a.get('children', [])
        ch_b = b.get('children', [])
        for i in range(max(len(ch_a), len(ch_b))):
            child_a = ch_a[i] if i < len(ch_a) else None
            child_b = ch_b[i] if i < len(ch_b) else None
            compare(child_a, child_b)
    compare(old_tree, new_tree)
    return changed`,
        java: `import java.util.*;

class Solution {
    public List<String> getChangedNodeIds(Map<String, Object> oldTree, Map<String, Object> newTree) {
        List<String> changed = new ArrayList<>();
        // implementation
        return changed;
    }
}`
      },
      fnName: 'getChangedNodeIds',
      tests: [
        {
          args: [
            { id: '1', tag: 'div', text: 'Hello', props: { className: 'header' }, children: [] },
            { id: '1', tag: 'div', text: 'Hello World', props: { className: 'header' }, children: [] }
          ],
          expected: ['1']
        },
        {
          args: [
            { id: '1', tag: 'div', text: 'Same', props: {}, children: [] },
            { id: '1', tag: 'div', text: 'Same', props: {}, children: [] }
          ],
          expected: []
        }
      ],
      timeLimit: 900,
      tags: ['React', 'Virtual DOM', 'Tree Traversal'],
    }
  ],

  // ------------------------------------------------------------
  // 2. BACKEND / ALGORITHMS / GENERAL ENGINEERING
  // ------------------------------------------------------------
  backend: [
    {
      id: 'be-01',
      category: 'coding',
      domain: 'backend',
      difficulty: 'Medium',
      title: 'Two Sum with Indices',
      description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice. Return the indices in any order.',
      complexityTarget: { time: 'O(N)', space: 'O(N)' },
      hints: [
        { level: 1, text: 'A brute force solution checks every pair in O(N^2). Can you use a hash map to do it in one pass?' },
        { level: 2, text: 'For each number `x`, you need to check if `target - x` was already seen.' },
        { level: 3, text: 'Store `{ number: index }` in a Hash Map / Map. If `target - num` exists in map, return `[map.get(target - num), currentIndex]`.' }
      ],
      starterCode: {
        javascript: `function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}`,
        python: `def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []`,
        java: `import java.util.*;

class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[] { map.get(complement), i };
            }
            map.put(nums[i], i);
        }
        return new int[] {};
    }
}`
      },
      fnName: 'twoSum',
      tests: [
        { args: [[2, 7, 11, 15], 9], expected: [0, 1] },
        { args: [[3, 2, 4], 6], expected: [1, 2] },
        { args: [[3, 3], 6], expected: [0, 1] },
        { args: [[-1, -2, -3, -4, -5], -8], expected: [2, 4] },
      ],
      timeLimit: 600,
      tags: ['Array', 'Hash Map', 'Optimization'],
    },
    {
      id: 'be-02',
      category: 'coding',
      domain: 'backend',
      difficulty: 'Medium',
      title: 'Merge Overlapping Intervals',
      description: 'Given an array of intervals where `intervals[i] = [start, end]`, merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.',
      complexityTarget: { time: 'O(N log N)', space: 'O(N)' },
      hints: [
        { level: 1, text: 'Sort the intervals by their start times first.' },
        { level: 2, text: 'Iterate through the sorted intervals. If the current interval overlaps with the previous one (i.e. `curr[0] <= prev[1]`), merge them by updating `prev[1] = Math.max(prev[1], curr[1])`.' },
        { level: 3, text: 'If they do not overlap, push the current interval as a new entry in your merged result array.' }
      ],
      starterCode: {
        javascript: `function mergeIntervals(intervals) {
  if (!intervals || intervals.length <= 1) return intervals || [];
  intervals.sort((a, b) => a[0] - b[0]);
  const merged = [intervals[0]];
  for (let i = 1; i < intervals.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = intervals[i];
    if (curr[0] <= prev[1]) {
      prev[1] = Math.max(prev[1], curr[1]);
    } else {
      merged.push(curr);
    }
  }
  return merged;
}`,
        python: `def merge_intervals(intervals):
    if not intervals:
        return []
    intervals.sort(key=lambda x: x[0])
    merged = [intervals[0]]
    for curr in intervals[1:]:
        prev = merged[-1]
        if curr[0] <= prev[1]:
            prev[1] = max(prev[1], curr[1])
        else:
            merged.append(curr)
    return merged`,
        java: `import java.util.*;

class Solution {
    public int[][] mergeIntervals(int[][] intervals) {
        if (intervals.length <= 1) return intervals;
        Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));
        List<int[]> result = new ArrayList<>();
        int[] current = intervals[0];
        result.add(current);
        for (int[] next : intervals) {
            if (next[0] <= current[1]) {
                current[1] = Math.max(current[1], next[1]);
            } else {
                current = next;
                result.add(current);
            }
        }
        return result.toArray(new int[result.size()][]);
    }
}`
      },
      fnName: 'mergeIntervals',
      tests: [
        { args: [[[1, 3], [2, 6], [8, 10], [15, 18]]], expected: [[1, 6], [8, 10], [15, 18]] },
        { args: [[[1, 4], [4, 5]]], expected: [[1, 5]] },
        { args: [[[1, 4], [0, 4]]], expected: [[0, 4]] },
        { args: [[[1, 4], [2, 3]]], expected: [[1, 4]] },
      ],
      timeLimit: 600,
      tags: ['Array', 'Sorting', 'Intervals'],
    },
    {
      id: 'be-03',
      category: 'coding',
      domain: 'backend',
      difficulty: 'Hard',
      title: 'LRU Cache Simulation',
      description: 'Implement a function `simulateLRU(capacity, operations)` that executes a sequence of `put` and `get` operations on a Least Recently Used (LRU) Cache and returns an array of the results from each `get` operation (-1 if key not found).',
      complexityTarget: { time: 'O(1) per operation', space: 'O(capacity)' },
      hints: [
        { level: 1, text: 'A Map in JavaScript preserves insertion order, which can be leveraged for O(1) eviction.' },
        { level: 2, text: 'When accessing a key with `get` or updating with `put`, delete it and re-insert it so it becomes the most recently used.' },
        { level: 3, text: 'When capacity is exceeded during `put`, delete the first key in the map (`map.keys().next().value`).' }
      ],
      starterCode: {
        javascript: `function simulateLRU(capacity, operations) {
  const cache = new Map();
  const output = [];

  for (const op of operations) {
    if (op.type === 'get') {
      if (!cache.has(op.key)) {
        output.push(-1);
      } else {
        const val = cache.get(op.key);
        cache.delete(op.key);
        cache.set(op.key, val);
        output.push(val);
      }
    } else if (op.type === 'put') {
      if (cache.has(op.key)) {
        cache.delete(op.key);
      } else if (cache.size >= capacity) {
        const oldestKey = cache.keys().next().value;
        cache.delete(oldestKey);
      }
      cache.set(op.key, op.value);
    }
  }
  return output;
}`,
        python: `from collections import OrderedDict

def simulate_lru(capacity, operations):
    cache = OrderedDict()
    output = []
    for op in operations:
        t = op.get('type')
        k = op.get('key')
        if t == 'get':
            if k not in cache:
                output.append(-1)
            else:
                cache.move_to_end(k)
                output.append(cache[k])
        elif t == 'put':
            v = op.get('value')
            if k in cache:
                cache.move_to_end(k)
            elif len(cache) >= capacity:
                cache.popitem(last=False)
            cache[k] = v
    return output`,
        java: `import java.util.*;

class Solution {
    public int[] simulateLRU(int capacity, List<Map<String, Object>> operations) {
        // Implementation
        return new int[]{};
    }
}`
      },
      fnName: 'simulateLRU',
      tests: [
        {
          args: [
            2,
            [
              { type: 'put', key: 1, value: 10 },
              { type: 'put', key: 2, value: 20 },
              { type: 'get', key: 1 },
              { type: 'put', key: 3, value: 30 },
              { type: 'get', key: 2 },
              { type: 'get', key: 3 }
            ]
          ],
          expected: [10, -1, 30]
        },
        {
          args: [
            1,
            [
              { type: 'put', key: 'a', value: 100 },
              { type: 'get', key: 'a' },
              { type: 'put', key: 'b', value: 200 },
              { type: 'get', key: 'a' },
              { type: 'get', key: 'b' }
            ]
          ],
          expected: [100, -1, 200]
        }
      ],
      timeLimit: 900,
      tags: ['Design', 'Hash Map', 'Linked List', 'Caching'],
    }
  ],

  // ------------------------------------------------------------
  // 3. DEVOPS & CLOUD INFRASTRUCTURE
  // ------------------------------------------------------------
  devops: [
    {
      id: 'ops-01',
      category: 'coding',
      domain: 'devops',
      difficulty: 'Medium',
      title: 'Build Pipeline Cycle Detection (DAG)',
      description: 'Given a list of build tasks and their direct dependencies `[[task, dependency], ...]`, determine if there is a circular dependency that would cause the CI/CD pipeline to deadlock.\n\nReturn `true` if the pipeline is valid (acyclic DAG), or `false` if a circular dependency cycle exists.',
      complexityTarget: { time: 'O(V + E)', space: 'O(V + E)' },
      hints: [
        { level: 1, text: 'Model the task dependencies as a directed graph and check for cycles using topological sort or DFS cycle detection.' },
        { level: 2, text: 'Use Kahn’s algorithm (in-degree tracking) or 3-color DFS (unvisited, visiting, visited).' },
        { level: 3, text: 'If the number of processed nodes in topological sort equals total unique tasks, there are no cycles (return true).' }
      ],
      starterCode: {
        javascript: `function isValidPipeline(tasks, dependencies) {
  const inDegree = new Map();
  const adj = new Map();

  for (const t of tasks) {
    inDegree.set(t, 0);
    adj.set(t, []);
  }

  for (const [task, dep] of dependencies) {
    adj.get(dep).push(task);
    inDegree.set(task, inDegree.get(task) + 1);
  }

  const queue = [];
  for (const [t, deg] of inDegree.entries()) {
    if (deg === 0) queue.push(t);
  }

  let count = 0;
  while (queue.length > 0) {
    const node = queue.shift();
    count++;
    for (const neighbor of adj.get(node)) {
      inDegree.set(neighbor, inDegree.get(neighbor) - 1);
      if (inDegree.get(neighbor) === 0) {
        queue.push(neighbor);
      }
    }
  }

  return count === tasks.length;
}`,
        python: `from collections import defaultdict, deque

def is_valid_pipeline(tasks, dependencies):
    in_degree = {t: 0 for t in tasks}
    adj = defaultdict(list)
    for task, dep in dependencies:
        adj[dep].append(task)
        in_degree[task] += 1
    queue = deque([t for t, deg in in_degree.items() if deg == 0])
    count = 0
    while queue:
        node = queue.popleft()
        count += 1
        for neighbor in adj[node]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)
    return count == len(tasks)`,
        java: `import java.util.*;

class Solution {
    public boolean isValidPipeline(String[] tasks, String[][] dependencies) {
        // Implementation
        return true;
    }
}`
      },
      fnName: 'isValidPipeline',
      tests: [
        { args: [['build', 'test', 'deploy'], [['test', 'build'], ['deploy', 'test']]], expected: true },
        { args: [['A', 'B'], [['A', 'B'], ['B', 'A']]], expected: false },
        { args: [['lint', 'compile', 'unit-test', 'publish'], [['compile', 'lint'], ['unit-test', 'compile'], ['publish', 'unit-test']]], expected: true },
      ],
      timeLimit: 600,
      tags: ['Graph', 'Topological Sort', 'CI/CD', 'DevOps'],
    },
    {
      id: 'ops-02',
      category: 'coding',
      domain: 'devops',
      difficulty: 'Medium',
      title: 'Sliding Window Log Error Rate Spikes',
      description: 'Given an array of server log timestamps (in seconds) that recorded `5xx` errors, and a window size `windowSeconds` with a threshold `maxAllowedErrors`, return `true` if any sliding window exceeded the error threshold, triggering an alert.',
      complexityTarget: { time: 'O(N)', space: 'O(N)' },
      hints: [
        { level: 1, text: 'Use a two-pointer sliding window or a queue of timestamps.' },
        { level: 2, text: 'Maintain timestamps in the current window `[left, right]` where `timestamps[right] - timestamps[left] <= windowSeconds`.' },
        { level: 3, text: 'If `(right - left + 1) > maxAllowedErrors`, return true immediately.' }
      ],
      starterCode: {
        javascript: `function hasErrorRateSpike(errorTimestamps, windowSeconds, maxAllowedErrors) {
  if (!errorTimestamps || errorTimestamps.length <= maxAllowedErrors) return false;
  errorTimestamps.sort((a, b) => a - b);
  let left = 0;
  for (let right = 0; right < errorTimestamps.length; right++) {
    while (errorTimestamps[right] - errorTimestamps[left] > windowSeconds) {
      left++;
    }
    if (right - left + 1 > maxAllowedErrors) {
      return true;
    }
  }
  return false;
}`,
        python: `def has_error_rate_spike(error_timestamps, window_seconds, max_allowed_errors):
    if not error_timestamps or len(error_timestamps) <= max_allowed_errors:
        return False
    error_timestamps.sort()
    left = 0
    for right in range(len(error_timestamps)):
        while error_timestamps[right] - error_timestamps[left] > window_seconds:
            left += 1
        if right - left + 1 > max_allowed_errors:
            return True
    return False`,
        java: `import java.util.*;

class Solution {
    public boolean hasErrorRateSpike(int[] errorTimestamps, int windowSeconds, int maxAllowedErrors) {
        Arrays.sort(errorTimestamps);
        int left = 0;
        for (int right = 0; right < errorTimestamps.length; right++) {
            while (errorTimestamps[right] - errorTimestamps[left] > windowSeconds) {
                left++;
            }
            if (right - left + 1 > maxAllowedErrors) return true;
        }
        return false;
    }
}`
      },
      fnName: 'hasErrorRateSpike',
      tests: [
        { args: [[10, 12, 14, 15, 18, 90], 10, 3], expected: true },
        { args: [[10, 30, 50, 70, 90], 10, 2], expected: false },
        { args: [[5, 6, 7, 8], 60, 3], expected: true },
      ],
      timeLimit: 600,
      tags: ['Sliding Window', 'Observability', 'DevOps'],
    }
  ],

  // ------------------------------------------------------------
  // 4. DATA SCIENCE & MACHINE LEARNING
  // ------------------------------------------------------------
  dataScience: [
    {
      id: 'ds-01',
      category: 'coding',
      domain: 'dataScience',
      difficulty: 'Medium',
      title: 'Min-Max Feature Normalizer',
      description: 'Given a 2D dataset array `matrix` where each row represents a sample and each column a numerical feature, implement `minMaxNormalize(matrix)` that normalizes each column feature to the range `[0.0, 1.0]`.\n\nIf all values in a column are equal, normalize them to `0.0`. Round all returned numbers to 2 decimal places.',
      complexityTarget: { time: 'O(R * C)', space: 'O(R * C)' },
      hints: [
        { level: 1, text: 'Find the minimum and maximum value for each column independently.' },
        { level: 2, text: 'For each element $X$, calculate (X - min) / (max - min). If max == min, set to 0.0.' },
        { level: 3, text: 'Use `Number(val.toFixed(2))` to round cleanly to 2 decimal places.' }
      ],
      starterCode: {
        javascript: `function minMaxNormalize(matrix) {
  if (!matrix || !matrix.length || !matrix[0].length) return matrix;
  const rows = matrix.length;
  const cols = matrix[0].length;
  const normalized = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let c = 0; c < cols; c++) {
    let minVal = Infinity;
    let maxVal = -Infinity;
    for (let r = 0; r < rows; r++) {
      minVal = Math.min(minVal, matrix[r][c]);
      maxVal = Math.max(maxVal, matrix[r][c]);
    }
    const range = maxVal - minVal;
    for (let r = 0; r < rows; r++) {
      const val = range === 0 ? 0 : (matrix[r][c] - minVal) / range;
      normalized[r][c] = Number(val.toFixed(2));
    }
  }
  return normalized;
}`,
        python: `def min_max_normalize(matrix):
    if not matrix or not matrix[0]:
        return matrix
    rows = len(matrix)
    cols = len(matrix[0])
    result = [[0.0] * cols for _ in range(rows)]
    for c in range(cols):
        col_vals = [matrix[r][c] for r in range(rows)]
        min_v, max_v = min(col_vals), max(col_vals)
        denom = max_v - min_v
        for r in range(rows):
            val = 0.0 if denom == 0 else (matrix[r][c] - min_v) / denom
            result[r][c] = round(val, 2)
    return result`,
        java: `class Solution {
    public double[][] minMaxNormalize(double[][] matrix) {
        // Implementation
        return matrix;
    }
}`
      },
      fnName: 'minMaxNormalize',
      tests: [
        {
          args: [
            [
              [10, 200],
              [20, 100],
              [30, 300]
            ]
          ],
          expected: [
            [0.0, 0.5],
            [0.5, 0.0],
            [1.0, 1.0]
          ]
        },
        {
          args: [
            [
              [5, 5],
              [5, 5]
            ]
          ],
          expected: [
            [0.0, 0.0],
            [0.0, 0.0]
          ]
        }
      ],
      timeLimit: 600,
      tags: ['Data Preprocessing', 'Normalization', 'Data Science'],
    },
    {
      id: 'ds-02',
      category: 'coding',
      domain: 'dataScience',
      difficulty: 'Medium',
      title: 'Cosine Similarity between Sparse Vectors',
      description: 'Compute the cosine similarity between two non-zero vectors A and B.\n\nCosine Similarity = (A . B) / (||A|| * ||B||)\n\nReturn the score rounded to 4 decimal places.',
      complexityTarget: { time: 'O(N)', space: 'O(1)' },
      hints: [
        { level: 1, text: 'Calculate the dot product of A and B in one pass.' },
        { level: 2, text: 'Calculate the magnitudes sqrt(sum(A_i^2)) and sqrt(sum(B_i^2)).' },
        { level: 3, text: 'Divide dot product by magA * magB and round with `toFixed(4)`.' }
      ],
      starterCode: {
        javascript: `function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magA += vecA[i] * vecA[i];
    magB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(magA) * Math.sqrt(magB);
  if (denominator === 0) return 0;
  return Number((dotProduct / denominator).toFixed(4));
}`,
        python: `import math

def cosine_similarity(vec_a, vec_b):
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    mag_a = math.sqrt(sum(a * a for a in vec_a))
    mag_b = math.sqrt(sum(b * b for b in vec_b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return round(dot / (mag_a * mag_b), 4)`,
        java: `class Solution {
    public double cosineSimilarity(double[] vecA, double[] vecB) {
        // Implementation
        return 1.0;
    }
}`
      },
      fnName: 'cosineSimilarity',
      tests: [
        { args: [[1, 2, 3], [1, 2, 3]], expected: 1.0 },
        { args: [[1, 0], [0, 1]], expected: 0.0 },
        { args: [[1, 2, 3], [4, 5, 6]], expected: 0.9746 },
      ],
      timeLimit: 600,
      tags: ['Vectors', 'Math', 'Embeddings', 'Machine Learning'],
    }
  ],

  // ------------------------------------------------------------
  // 5. SYSTEM DESIGN & ARCHITECTURE (Whiteboard / Conceptual)
  // ------------------------------------------------------------
  systemDesign: [
    {
      id: 'sd-01',
      category: 'system_design',
      domain: 'architecture',
      difficulty: 'Hard',
      title: 'Scalable Real-Time Notification Service',
      description: 'Design a globally distributed notification service that delivers 100M+ push, email, and SMS notifications daily with sub-second latency.\n\nAddress:\n1. Rate limiting & throttling per user/tenant\n2. Priority queues (critical OTPs vs. marketing blasts)\n3. Idempotency & deduplication to prevent double-sends\n4. Worker pool scaling & third-party provider failovers',
      complexityTarget: { throughput: '100k events/sec', latency: '< 500ms' },
      hints: [
        { level: 1, text: 'Use an event-driven architecture with message queues (Kafka / RabbitMQ / SQS) partitioned by user ID.' },
        { level: 2, text: 'Use Redis for idempotency key lookups (SET key NX EX 86400) and distributed token bucket rate limiting.' },
        { level: 3, text: 'Separate queues by priority: High Priority (OTPs, Security Alerts) vs Low Priority (Newsletters).' }
      ],
      starterCode: {
        javascript: `// System Design: Real-Time Notification Engine
/*
1. High Level Architecture:
   [API Gateway] -> [Auth & Rate Limiter (Redis)] -> [Event Ingestion Service]
                                                                |
                                             +------------------+------------------+
                                             v                                     v
                                   [High-Priority Queue]                 [Batch/Promo Queue]
                                             v                                     v
                                    [Worker Pool A]                       [Worker Pool B]
                                             |                                     |
                                  [Twilio / APNs / FCM]                    [SendGrid / SES]

2. Idempotency Key Strategy:
   ...

3. Failure & Retry Handling:
   ...
*/`,
        python: `"""
System Design: Real-Time Notification Engine

1. Components & Data Flow:
   ...
2. Database & Cache Schema:
   ...
"""`,
        java: `/*
System Design: Real-Time Notification Engine
*/`
      },
      timeLimit: 900,
      tags: ['System Design', 'Kafka', 'Redis', 'High Availability'],
    }
  ]
};

// Map job title / department / skills to the appropriate question domain.
export function getQuestionsForRole({ role = '', skills = [], department = '', difficulty = 'Adaptive', count = 2 } = {}) {
  const r = (role || '').toLowerCase();
  const d = (department || '').toLowerCase();
  const s = (Array.isArray(skills) ? skills.join(' ') : String(skills || '')).toLowerCase();
  const context = `${r} ${d} ${s}`;

  let pool = [];

  if (/react|frontend|ui|ux|css|javascript|typescript|web|vue|angular|designer/.test(context)) {
    pool = [...QUESTION_BANK.frontend, ...QUESTION_BANK.backend];
  } else if (/devops|cloud|sre|infrastructure|kubernetes|docker|aws|linux|ci\/cd/.test(context)) {
    pool = [...QUESTION_BANK.devops, ...QUESTION_BANK.backend];
  } else if (/machine learning|data scientist|ai engineer|pandas|tensorflow|pytorch|analytics|nlp|deep learning/.test(context)) {
    pool = [...QUESTION_BANK.dataScience, ...QUESTION_BANK.backend];
  } else if (/architect|lead|principal|system/.test(context)) {
    pool = [...QUESTION_BANK.systemDesign, ...QUESTION_BANK.backend, ...QUESTION_BANK.frontend];
  } else if (/backend|server|django|fastapi|node|express|spring|golang|rust|ruby|database|sql/.test(context)) {
    pool = [...QUESTION_BANK.backend, ...QUESTION_BANK.systemDesign];
  } else {
    // General / Fullstack / Default
    pool = [...QUESTION_BANK.backend, ...QUESTION_BANK.frontend, ...QUESTION_BANK.devops];
  }

  // Filter or sort by difficulty if requested
  if (difficulty !== 'Adaptive' && ['Easy', 'Medium', 'Hard'].includes(difficulty)) {
    const matched = pool.filter(q => q.difficulty === difficulty);
    if (matched.length >= count) {
      return matched.slice(0, count);
    }
  }

  return pool.slice(0, Math.max(1, Math.min(pool.length, Number(count) || 2)));
}
