---
sourceHash: "6e39a5254f676715f040f6a6f4779f9ac0316fb43103fbe040ecb6fce7ed09ac"
title: "বড় পরিসরে React ও TypeScript"
translatedAt: "2026-10-17T01:36:14.944Z"
model: "claude-opus-5-5 (Claude Code)"
---

# বড় পরিসরে React ও TypeScript {#ch-react-typescript-at-scale}

> Props, state, ref আর context এমনভাবে type করুন, যাতে ভুল state লেখাই না যায়, আর একশো component-ও নিশ্চিন্তে refactor করা যায়।

**এই অধ্যায়ে:** contract হিসেবে props · যে state কখনো invalid হতে পারে না · generic component · ref আর context · server boundary type করা

## 💡 মূল ধারণা

React component আসলে একটি function, তাই component type করা মানে function type করা: props-এর নাম দিন, return-এর
নাম দিন। এটুকু যান্ত্রিক কাজ। যে codebase বড় হলেও টেকে, আর যে শুধু compile হয়, তাদের পার্থক্য হলো *আপনি কী
model করবেন বলে ঠিক করেন*।

সবচেয়ে বেশি লাভ দেয় একটি কৌশল: invalid state-কে প্রকাশ করাই অসম্ভব করে দেওয়া। `{ loading, data, error }` তিনটি
স্বাধীন field হিসেবে রাখলে আটটি combination হয়। তার চারটি অর্থহীন, যেমন একই সঙ্গে loading, error আর data। আর
প্রতিটি consumer-কে আটটির বিরুদ্ধেই সাবধান থাকতে হয়। Discriminated union-এ combination মাত্র চারটি, আর compiler
ঠিক একটিতে narrow করে। বড় React codebase থেকে defensive branch সরাতে অন্য কোনো typing সিদ্ধান্ত এর ধারেকাছেও আসে না।

> ⚠️ **যা বদলাতে থাকে:** React 19-এ `ref` একটি সাধারণ prop হয়ে গেছে, তাই `forwardRef` এখন বাড়তি, আর deprecated
> হওয়ার পথে। `@types/react`-এর major version বদলালে hook-এর typing-ও বদলায়। টেকসই নীতি: props হলো typed contract,
> আর hook হলো generic function। Helper-গুলোর নাম এর চারপাশে বদলাতে থাকে।

## কীভাবে কাজ করে

### Props হলো দুটি file-এর মধ্যে contract

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

`React.FC`-এর বদলে explicit props interface দেওয়া সাধারণ function লিখুন। React.FC আগে নিজে থেকেই `children`
ধরে নিত, generic component আটকে দেয়, আর এখন যেহেতু children আর ধরে না, তাই কিছুই যোগ করে না।

| দরকার                                | Type                                                    |
| ----------------------------------- | ------------------------------------------------------- |
| Child হিসেবে render করা যায় এমন সবকিছু | `React.ReactNode`                                       |
| Render prop বা slot                  | `(item: T) => React.ReactNode`                          |
| সব native attribute-ও                | `extends React.ButtonHTMLAttributes<HTMLButtonElement>` |
| ভেতরের element-এর ref               | `ref?: React.Ref<HTMLButtonElement>` — React 19-এ সাধারণ prop |

**Native props extend করলেই design-system component সত্যিই ব্যবহারযোগ্য হয়:**

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

`type`, `aria-label` বা `onFocus`-এর মতো প্রতিটি native attribute কাজ করতেই থাকে, আর type check-ও হয়।

Event-এর জন্য ব্যবহার করুন `React.MouseEvent<HTMLButtonElement>`, `React.ChangeEvent<HTMLInputElement>` আর
`React.FormEvent<HTMLFormElement>`। পড়ুন `currentTarget`, কারণ এর type হলো যে element-এ handler লাগানো সেটাই।
`target` হলো আসলে যেটায় click পড়েছে, তাই এর type ঢিলেঢালা।

### যে state কখনো invalid হতে পারে না

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

Union থাকলে `status === "success"` না হওয়া পর্যন্ত `state.data`-র অস্তিত্বই নেই। ফলে "loading চলার সময় data
render করা" bug-টা code review-এর comment না হয়ে সরাসরি compile error হয়ে যায়।

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

`item` ছাড়া `dispatch({ type: "add" })` compile হবে না, আর `type`-এ বানান ভুল হলেও হবে না।

`useState`-এর দুটি annotation জেনে রাখা ভালো। `null` আসল type লুকিয়ে ফেললে annotate করুন। খালি array-ও annotate
করুন, কারণ `useState([])` চওড়া হয়ে `never[]` হয়ে যায়, আর তাতে কখনো কিছু যোগ করা যায় না।

```tsx
const [count, setCount] = useState(0);                 // inferred: number
const [user, setUser] = useState<User | null>(null);   // null alone tells the compiler nothing
const [users, setUsers] = useState<User[]>([]);        // [] alone infers never[]
const timer = useRef<ReturnType<typeof setInterval> | null>(null);
```

### Generic component

Generic component caller-এর হুবহু type শুরু থেকে শেষ পর্যন্ত ধরে রাখে। এ কারণেই একটি `List` দিয়ে application-এর
সব entity চালানো যায়।

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
`{ data: User | null; status: RequestState["status"] }` return করে, caller কোনো cast ছাড়াই typed value পায়।
তবে এটা কী করে **না**, সেটা খেয়াল করুন। Type argument response-এর shape দাবি করে, যাচাই করে না। Boundary-তে
validate করুন — দেখুন [Chapter ?? — TypeScript Type Guard](#ch-type-guards)।

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

Throw করা accessor hook-ই প্রতিটি consumer থেকে `| undefined` সরিয়ে দেয়। এটা না থাকলে প্রতিটি component-কে এমন
একটি case সামলাতে হয়, যা হওয়ারই কথা নয়। React 19-এ context নিজেই provider:
`<AuthContext value={auth}>`, আর `.Provider` এখন ঐচ্ছিক।

### Server boundary পার হওয়া type

React 19-এর দুটি ধারণার typing নিয়ম আছে, যা শুধু server/client ভাগের কারণেই তৈরি।

**Client Component-এ ঢোকা props serialisable হতে হবে।** Server Component থেকে render করা Client Component-এ
TypeScript দিব্যি `onSave: () => void` মেনে নেবে, কিন্তু runtime-এ সেটা fail করে। Type system boundary-টা model
করে না, তাই নিয়ম মানার দায় আপনার। যে props boundary পার হয়, সেগুলো data, সঙ্গে Server Function।

**Action-এর shape নির্দিষ্ট,** আর state type করলেই error-এর পথটা নিরাপদ হয়:

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

`FormData`-র value হলো `string | File | null`, আপনি যে shape চান তা কখনোই নয়। Runtime-এ schema parse করলে সেগুলো
typed object হয়ে যায়। একই parse হাতে বানানো request-কেও আপনার database পর্যন্ত পৌঁছাতে দেয় না।

## কখন ব্যবহার করবেন

| পরিস্থিতি                                        | কী ব্যবহার করবেন                         | কেন                                              |
| ---------------------------------------------- | ---------------------------------------- | ------------------------------------------------ |
| Native element-কে মোড়া component              | `extends …HTMLAttributes<T>`             | প্রতিটি native prop typed থাকে, পাঠানোও যায়      |
| Loading আর error state সহ async data           | `status`-এর ওপর discriminated union      | অসম্ভব combination-গুলোর অস্তিত্বই থাকে না       |
| কয়েকটি value, যারা একসঙ্গে বদলায়               | Action union সহ `useReducer`              | ভুল dispatch compile-ই হয় না                     |
| এক component, অনেক ধরনের entity-তে               | Generic component বা hook                 | Caller-এর type callback পর্যন্ত টিকে থাকে        |
| অনেক component যে shared state পড়ে            | Context, সঙ্গে throw করা accessor hook    | Consumer-কে কখনো undefined case সামলাতে হয় না    |
| Network বা form থেকে আসা data                  | আগে runtime schema, তারপর type            | Type মুছে যায়; boundary-তে সত্যিকারের check লাগে |

## সাধারণ ভুল

**❌ Type argument ছাড়া `useState([])`।** এটা `never[]` infer করে, তাই কখনো কিছু যোগ করা যায় না।

**❌ `React.FC<Props>`।** আগে এটা গোপনে `children` যোগ করত, generic component আটকে দেয়, আর annotate করা সাধারণ
function যা দেয় না এমন কিছুই দেয় না।

**❌ `createContext({} as AuthContextValue)`।** এই cast-এর কারণে provider না থাকলেও ধরা যায় না। ফলে ভুলটা ধরা পড়ে
কোনো child-এর গভীরে `undefined is not a function` হয়ে। Default `undefined` রাখুন, আর accessor-এ throw করুন।

**❌ যেখানে union দরকার, সেখানে boolean flag:**

```tsx
// ❌ isLoading && isError && data — what does that mean?
const [isLoading, setIsLoading] = useState(false);
const [isError, setIsError] = useState(false);
const [data, setData] = useState<User | null>(null);
```

এখন প্রতিটি consumer নিজের মতো অনুমান লেখে, কোন combination-গুলো আসল। একটি union দিয়ে এর সবগুলো বাদ দেওয়া যায়।

**❌ React 19-এও `forwardRef` লেখা।** `ref` এখন সাধারণ prop। Wrapper একটি বাড়তি স্তর যোগ করে, আর deprecated হবে।
যে codebase এখনো React 18-এ, সেখানে `forwardRef<HTMLInputElement, Props>` ঠিকই আছে, তাই কিছু বদলানোর আগে version
দেখে নিন।

**❌ Type argument-কে validation ভাবা।** `await res.json() as User` একটি assertion, check নয়। Compiler প্রশ্ন করা
বন্ধ করে দেয়, আর runtime ব্যাপারটা টের পায় পরে, এমন কোনো component-এ যে নিজের ভুল ব্যাখ্যা করতে পারে না।

## 🔑 মূল শিক্ষা

- Props interface দুটি file-এর মধ্যে contract। এটা explicit annotate করুন, আর `React.FC` বাদ দিন।
- `status`-এর ওপর discriminated union boolean flag-এর তৈরি অসম্ভব combination-গুলো সরিয়ে দেয়।
- Action union আর `never` default মিলে প্রতিটি ভুল dispatch-কে compile error বানিয়ে দেয়।
- Context-এর default `undefined` রাখুন আর accessor hook-এ throw করুন, তাহলে consumer-কে এটা সামলাতে হয় না।
- Runtime-এ type মুছে যায়। Network বা form boundary পার হওয়া data সত্যিকারের schema parse দিয়ে validate করুন।

## Interview-এর প্রশ্ন

**Q: Async state-কে `loading`, `data` আর `error` field-এর বদলে union হিসেবে model করবেন কেন?**

তিনটি স্বাধীন field আটটি combination তৈরি করে, যার মাত্র চারটি অর্থপূর্ণ। ফলে প্রতিটি consumer এমন state-এর জন্য
defensive branch লেখে, যা ঘটতেই পারে না, আর একদিন কেউ একটায় ভুল করে। `status`-এর ওপর union একটিমাত্র variant-এ
narrow করে, তাই request সফল হওয়ার পরেই কেবল `data` পাওয়া যায়। Invalid state আর সামলাতে হয় না, কারণ সেগুলো
প্রকাশ করাই আর সম্ভব নয়।

**Q: `useReducer`-এর action-কে discriminated union হিসেবে type করলে কী লাভ?**

প্রতিটি dispatch union-এর সঙ্গে মিলিয়ে check হয়, তাই কোনো field বাদ পড়লে বা action-এর নামে বানান ভুল হলে call
site-এই fail করে। Reducer-এর ভেতরে `type` দিয়ে switch করলে action narrow হয়, ফলে শুধু ওই variant-এর field-গুলোই
পাওয়া যায়। `default` branch-এ action-কে `never`-তে assign করলে নতুন যোগ করা action চুপচাপ কিছু না করে থাকে না,
build fail করায়।

**Q: খালি object cast না করে context-এর default `undefined` রাখবেন কেন?**

Cast করলে provider না থাকা আর আসল provider থাকা দেখতে একই রকম হয়। তখন ভুলটা ধরা পড়ে কোনো child component-এর
ভেতরে বিভ্রান্তিকর runtime error হয়ে। `undefined` এমন একটি state, যা accessor hook ধরতে পারে আর পরিষ্কার message-এ
বদলে দিতে পারে। Narrowing-এর ফলে প্রতিটি consumer non-optional value-ও পায়।

**Q: Server Component থেকে Client Component-এ function পাঠানো কি TypeScript আটকায়?**

না, আর ফাঁদটা এখানেই। Server/client boundary-র কোনো model type system-এ নেই। তাই code compile হয়ে যায়, তারপর
render-এর সময় React যখন prop-টা serialise করতে যায়, তখন fail করে। নিয়মটা লেখককেই মনে রাখতে হয়: ওই boundary পার
হয় শুধু data, অথবা Server Function, আর কিছু নয়।

## এরপর কী পড়বেন

- [Chapter ?? — Server Component ও Client Component](#ch-server-components-vs-client-components) — boundary কী পার হতে দেয়
- [Chapter ?? — TypeScript Generics](#ch-generics) — generic component আর hook-এর পেছনের mechanism
- [Chapter ?? — TypeScript Type Guard](#ch-type-guards) — typed fetch যা শুধু ধরে নেয়, তা যাচাই করা
