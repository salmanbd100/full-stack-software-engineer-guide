---
sourceHash: "6e39a5254f676715f040f6a6f4779f9ac0316fb43103fbe040ecb6fce7ed09ac"
title: "বড় পরিসরে React ও TypeScript"
translatedAt: "2026-10-12T12:11:04.134Z"
model: "claude-opus-5-5 (Claude Code)"
---

# বড় পরিসরে React ও TypeScript {#ch-react-typescript-at-scale}

> Props, state, ref আর context-এ এমনভাবে type দিন, যাতে ভুল state লেখাই না যায়, আর একশোটা component-ও refactor করার মতো থাকে।

**এই অধ্যায়ে:** contract হিসেবে props · এমন state যেটা invalid হতে পারে না · generic component · ref আর context · server boundary-তে type দেওয়া

## 💡 মূল ধারণা

একটি React component একটি function, তাই component-এ type দেওয়া মানে একটি function-এ type দেওয়া: props-এর নাম দিন,
return-এর নাম দিন। এটুকু যান্ত্রিক কাজ। যে codebase scale করে আর যেটা শুধু compile হয়, তাদের পার্থক্য হলো *আপনি
কী model করতে বেছে নেন*।

সবচেয়ে বেশি লাভ দেয় যে পদক্ষেপ, সেটা হলো invalid state-কে প্রকাশের অযোগ্য করে দেওয়া। তিনটি স্বাধীন field হিসেবে
`{ loading, data, error }` আটটি combination বর্ণনা করে। চারটি অর্থহীন, যেমন error আর data-সহ loading, আর প্রতিটি
consumer-কে আটটির বিরুদ্ধেই সতর্ক থাকতে হয়। একটি discriminated union বর্ণনা করে চারটি, আর compiler ঠিক একটিতে
narrow করে। বড় একটি React codebase থেকে এই একটি পরিবর্তন যত defensive branch সরায়, অন্য কোনো typing সিদ্ধান্ত তত
সরায় না।

> ⚠️ **যা বদলাতে থাকে:** React 19 `ref`-কে একটি সাধারণ prop বানিয়েছে, তাই `forwardRef` অপ্রয়োজনীয় আর deprecation-এর
> পথে। `@types/react`-এর major version-এর মধ্যে hook-এর typing-ও বদলায়। স্থায়ী নীতিটি হলো: props একটি typed
> contract, আর hook হলো generic function। Helper-এর নামগুলো এর চারপাশে বদলায়।

## কীভাবে কাজ করে

### Props দুটো file-এর মধ্যে একটি contract

```tsx
interface UserCardProps {
  name: string;
  role: "admin" | "editor" | "viewer";
  avatarUrl?: string;
  onEdit: (id: number) => void;
}

function UserCard({ name, avatarUrl, onEdit }: UserCardProps) {
  return (
    <div>
      {avatarUrl !== undefined && <img src={avatarUrl} alt={name} />}
      <button onClick={() => onEdit(1)}>Edit</button>
    </div>
  );
}
```

`React.FC`-এর বদলে explicit props interface-সহ একটি সাধারণ function বেছে নিন। এটা আগে `children` ধরে নিত, এটা
generic component আটকায়, আর এখন যেহেতু আর ধরে নেয় না, তাই এটা কিছুই যোগ করে না।

| প্রয়োজন                                | Type                                                    |
| ----------------------------------- | ------------------------------------------------------- |
| Child হিসেবে render করা যায় এমন যেকোনো কিছু       | `React.ReactNode`                                       |
| একটি render prop বা একটি slot              | `(item: T) => React.ReactNode`                          |
| সাথে সব native attribute-ও        | `extends React.ButtonHTMLAttributes<HTMLButtonElement>` |
| ভেতরের element-এর একটি ref      | `ref?: React.Ref<HTMLButtonElement>` — React 19-এ একটি সাধারণ prop |

**Native props extend করাই একটি design-system component-কে ব্যবহারযোগ্য করে:**

```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "danger";
  loading?: boolean;
  ref?: React.Ref<HTMLButtonElement>; // React 19 — no forwardRef wrapper
}

function Button({ variant = "primary", loading, children, ...rest }: ButtonProps) {
  return (
    <button className={`btn-${variant}`} disabled={loading === true || rest.disabled} {...rest}>
      {loading === true ? "Loading…" : children}
    </button>
  );
}
```

প্রতিটি native attribute, যেমন `type`, `aria-label` বা `onFocus`, কাজ করতে থাকে আর check-ও হয়।

Event-এর জন্য `React.MouseEvent<HTMLButtonElement>`, `React.ChangeEvent<HTMLInputElement>` আর
`React.FormEvent<HTMLFormElement>` ব্যবহার করুন। `currentTarget` পড়ুন, যার type হলো সেই element যেটায় handler
লাগানো আছে। `target` হলো আসলে যেটায় click হয়েছে, তাই এর type ঢিলেঢালা।

### এমন state, যেটা invalid হতে পারে না

```tsx
// ❌ Eight combinations, four of them meaningless
interface BadState { loading: boolean; data: User | null; error: string | null }

// ✅ Four, and the compiler narrows to one
type RequestState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: User }
  | { status: "error"; message: string };
```

Union থাকলে `status === "success"` না হওয়া পর্যন্ত `state.data`-র অস্তিত্বই থাকে না। তাই "loading চলাকালীন data
render করা" bug-টি code review-এর comment না হয়ে একটি compile error হয়ে যায়।

একই ধারণা `useReducer`-এ দুবার লাভ দেয়, কারণ প্রতিটি dispatch-এ action union check হয়:

```tsx
type CartAction =
  | { type: "add"; item: CartItem }
  | { type: "remove"; itemId: string }
  | { type: "clear" };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "add":
      return { items: [...state.items, action.item], total: state.total + action.item.price };
    case "remove":
      return { ...state, items: state.items.filter((i) => i.id !== action.itemId) };
    case "clear":
      return { items: [], total: 0 };
    default: {
      const exhaustive: never = action; // a new action type breaks the build here
      return exhaustive;
    }
  }
}
```

`item` ছাড়া `dispatch({ type: "add" })` compile হবে না, `type`-এ typo থাকলেও না।

দুটো `useState` annotation জেনে রাখা ভালো। যখন `null` আসল type-কে লুকিয়ে ফেলে, তখন annotate করুন। খালি array-ও
annotate করুন, কারণ `useState([])` widen হয়ে `never[]` হয়ে যায়, আর তাতে কখনো কিছু যোগ করা যায় না।

```tsx
const [count, setCount] = useState(0);                 // inferred: number
const [user, setUser] = useState<User | null>(null);   // null alone tells the compiler nothing
const [users, setUsers] = useState<User[]>([]);        // [] alone infers never[]
const timer = useRef<ReturnType<typeof setInterval> | null>(null);
```

### Generic component

একটি generic component caller-এর হুবহু type-টি শেষ পর্যন্ত বয়ে নিয়ে যায়। এর ফলেই একটি `List` application-এর
প্রতিটি entity-র কাজে লাগে।

```tsx
interface ListProps<T> {
  items: readonly T[];
  getKey: (item: T) => string;
  renderItem: (item: T) => React.ReactNode;
}

function List<T>({ items, getKey, renderItem }: ListProps<T>) {
  return <ul>{items.map((item) => <li key={getKey(item)}>{renderItem(item)}</li>)}</ul>;
}

// `item` is User inside both callbacks — no annotation at the call site
<List items={users} getKey={(u) => u.id} renderItem={(u) => u.name} />;
```

Custom hook-এও একই যুক্তি খাটে। `useFetch<User>(url)` যদি
`{ data: User | null; status: RequestState["status"] }` return করে, তাহলে caller কোনো cast ছাড়াই একটি typed value
পায়। খেয়াল করুন এটা কী **করে না**। Type argument response-এর shape assert করে। এটা check করে না। Boundary-তে
validate করুন — [Chapter ?? — TypeScript Type Guard](#ch-type-guards) দেখুন।

### প্রতিটি consumer-এ `| undefined` ছাড়া context

```tsx
// `undefined` as the default is deliberate: it makes "used outside the
// provider" a detectable state rather than a silently wrong default
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx; // narrowed, so consumers never see undefined
}
```

Throw করা accessor hook-টিই প্রতিটি consumer থেকে `| undefined` সরিয়ে দেয়। এটা না থাকলে প্রতিটি component এমন একটি
case handle করে, যেটা অসম্ভব হওয়া উচিত। React 19-এ provider হলো context নিজেই: `<AuthContext value={auth}>`, আর
`.Provider` এখন optional।

### Server boundary পেরিয়ে type দেওয়া

React 19-এর দুটো ধারণার typing-এর নিয়ম আছে, যেগুলো শুধু server/client ভাগের কারণেই আছে।

**একটি Client Component-এ ঢোকা props-কে serialisable হতে হবে।** Server Component থেকে render করা একটি Client
Component-এ TypeScript খুশিমনে `onSave: () => void` মেনে নেবে, কিন্তু runtime-এ এটা fail করে। Type system
boundary-টি model করে না, তাই শৃঙ্খলা রাখার দায় আপনার। যে props এটা পার হয়, সেগুলো data, সাথে Server Function।

**Action-এর একটি নির্দিষ্ট shape আছে,** আর state-এ type দেওয়াই error path-কে নিরাপদ করে:

```tsx
interface FormState {
  error: string | null;
}

const [state, submitAction, isPending] = useActionState<FormState, FormData>(
  async (_prev: FormState, formData: FormData): Promise<FormState> => {
    const parsed = ProfileSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: "Check the highlighted fields" };
    await updateProfile(parsed.data); // parsed.data is typed and validated
    return { error: null };
  },
  { error: null },
);
```

`FormData`-র value হলো `string | File | null`, কখনোই আপনার চাওয়া shape নয়। একটি runtime schema parse এগুলোকে একটি
typed object-এ পরিণত করে। একই parse হাতে বানানো একটি request-কে আপনার database পর্যন্ত পৌঁছাতেও দেয় না।

## কখন ব্যবহার করবেন

| পরিস্থিতি                                       | কী ব্যবহার করবেন                                | কেন                                            |
| ---------------------------------------------- | ---------------------------------------- | ---------------------------------------------- |
| একটি component, যেটা একটি native element wrap করে           | `extends …HTMLAttributes<T>`             | প্রতিটি native prop typed থাকে আর পাস করা যায়   |
| Loading আর error state-সহ async data        | `status`-এর ওপর একটি discriminated union        | অসম্ভব combination-গুলোর অস্তিত্বই আর থাকে না       |
| কয়েকটি value, যেগুলো একসাথে বদলায়             | Action union-সহ `useReducer`         | Invalid dispatch compile হয় না              |
| একটি component, বিভিন্ন entity type-এ পুনর্ব্যবহৃত        | একটি generic component বা hook               | Caller-এর type callback পর্যন্ত টিকে থাকে     |
| অনেক component-এর পড়া shared state            | Context, সাথে একটি throw করা accessor hook     | Consumer-দের কখনো undefined case handle করতে হয় না       |
| Network বা form থেকে আসা data          | আগে একটি runtime schema, তারপর type            | Type মুছে যায়; boundary-তে একটি সত্যিকারের check লাগে    |

## সাধারণ ভুল

**❌ Type argument ছাড়া `useState([])`।** এটা `never[]` infer করে, তাই কখনো কিছু যোগ করা যায় না।

**❌ `React.FC<Props>`।** এটা আগে একটি implicit `children` যোগ করত, এটা generic component আটকায়, আর annotate করা
সাধারণ function যা দেয় না, এমন কিছুই এটা দেয় না।

**❌ `createContext({} as AuthContextValue)`।** Cast-এর কারণে provider না থাকলে সেটা ধরা যায় না, তাই ব্যর্থতাটা একটি
child-এর গভীরে `undefined is not a function` হিসেবে বেরিয়ে আসে। Default হিসেবে `undefined` দিন, আর accessor-এ
throw করুন।

**❌ যেখানে union দরকার, সেখানে boolean flag:**

```tsx
// ❌ isLoading && isError && data — what does that mean?
const [isLoading, setIsLoading] = useState(false);
const [isError, setIsError] = useState(false);
const [data, setData] = useState<User | null>(null);
```

এখন প্রতিটি consumer নিজের মতো অনুমান লেখে, কোন combination-গুলো আসল। একটি union এদের সবার জায়গা নেয়।

**❌ React 19-এও `forwardRef` লেখা।** `ref` এখন একটি সাধারণ prop। Wrapper একটি বাড়তি স্তর যোগ করে, আর এটা deprecate
হবে। যে codebase এখনো React 18-এ আছে, সেখানে `forwardRef<HTMLInputElement, Props>` এখনো সঠিক, তাই কিছু বদলানোর আগে
version দেখে নিন।

**❌ Type argument-কে validation মনে করা।** `await res.json() as User` একটি assertion, check নয়। Compiler প্রশ্ন করা
বন্ধ করে দেয়, আর runtime পরে টের পায়, এমন একটি component-এ যেটা নিজেকে ব্যাখ্যা করতে পারে না।

## 🔑 মূল শিক্ষা

- একটি props interface দুটো file-এর মধ্যে একটি contract। এটা explicit-ভাবে annotate করুন, আর `React.FC` বাদ দিন।
- `status`-এর ওপর একটি discriminated union সেই অসম্ভব combination-গুলো সরিয়ে দেয়, যেগুলো boolean flag তৈরি করে।
- একটি action union, সাথে একটি `never` default, প্রতিটি invalid dispatch-কে একটি compile error-এ পরিণত করে।
- একটি context-এর default `undefined` দিন আর accessor hook-এ throw করুন, যাতে consumer-দের কখনো এটা handle করতে না হয়।
- Runtime-এ type মুছে যায়। Network বা form boundary পার হওয়া data একটি সত্যিকারের schema parse দিয়ে validate করুন।

## Interview-এর প্রশ্ন

**Q: Async state-কে `loading`, `data` আর `error` field হিসেবে না রেখে union হিসেবে model করবেন কেন?**

তিনটি স্বাধীন field আটটি combination বর্ণনা করে, আর তার মধ্যে মাত্র চারটি অর্থপূর্ণ। তাই প্রতিটি consumer এমন state-এর
জন্য defensive branch লেখে, যেগুলো ঘটতেই পারে না, আর একদিন তাদের একটি ভুল করে। `status`-এর ওপর একটি union একটিমাত্র
variant-এ narrow করে, তাই request সফল হওয়ার পরেই কেবল `data`-তে পৌঁছানো যায়। Invalid state-গুলো আর handle করতে হয়
না, কারণ সেগুলো আর প্রকাশই করা যায় না।

**Q: `useReducer`-এর action-কে discriminated union হিসেবে type দিলে কী লাভ হয়?**

প্রতিটি dispatch union-এর সাথে check হয়, তাই একটি field বাদ পড়লে বা action-এর নামে typo থাকলে call site-এই fail করে।
Reducer-এর ভেতরে `type`-এর ওপর switch করলে action narrow হয়, তাই শুধু সেই variant-এর field-গুলোই পাওয়া যায়।
`default` branch-এ action-টিকে `never`-এ assign করলে নতুন যোগ করা একটি action নীরব no-op না হয়ে একটি build failure
হয়ে যায়।

**Q: একটি context-এর default খালি object cast না করে `undefined` কেন দেবেন?**

Cast-এর কারণে অনুপস্থিত provider দেখতে আসলটার মতোই লাগে। তখন ব্যর্থতাটা একটি child component-এর ভেতরে একটি বিভ্রান্তিকর
runtime error হিসেবে বেরিয়ে আসে। `undefined` এমন একটি state, যেটা accessor hook ধরতে পারে আর একটি পরিষ্কার message-এ
পরিণত করতে পারে। Narrowing-এর ফলে প্রতিটি consumer একটি non-optional value-ও পায়।

**Q: TypeScript কি আপনাকে একটি Server Component থেকে একটি Client Component-এ function পাঠাতে বাধা দেয়?**

না, আর এটাই ফাঁদ। Type system-এর কাছে server/client boundary-র কোনো model নেই। তাই code compile হয়, তারপর render-এর
সময় fail করে, যখন React prop-টি serialise করার চেষ্টা করে। নিয়মটা লেখককেই মনে রাখতে হয়: যা ওই boundary পার হয়,
তা data, বা একটি Server Function, আর কিছু নয়।

## এরপর কী পড়বেন

- [Chapter ?? — Server Component ও Client Component](#ch-server-components-vs-client-components) — boundary কী পার হতে দেয়
- [Chapter ?? — TypeScript Generics](#ch-generics) — generic component আর hook-এর পেছনের mechanism
- [Chapter ?? — TypeScript Type Guard](#ch-type-guards) — একটি typed fetch যা শুধু ধরে নেয়, সেটা validate করা
