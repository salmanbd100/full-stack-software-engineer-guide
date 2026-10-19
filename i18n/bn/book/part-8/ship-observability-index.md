---
sourceHash: "dd3c12a41da62543cc5ccb7b8b9282e3641f43838d592e1dd51d06ad989f6248"
title: "Observability"
translatedAt: "2026-10-19T07:53:16.130Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Observability

Monitoring সেই প্রশ্নের উত্তর দেয়, যা আপনি আগে থেকে ভেবে রেখেছিলেন। Observability মানে, যে প্রশ্ন আপনি ভাবেননি,
রাত দুটায় সেটার উত্তর আপনি এখনই জমা করা data থেকে দিতে পারেন কি না। এই পার্থক্যটাই পুরো অংশের বিষয়। Interviewer-ও
এখান থেকেই সবচেয়ে তাড়াতাড়ি বুঝে ফেলেন, আপনি system সত্যিই চালিয়েছেন, নাকি শুধু বানিয়েছেন।

## অধ্যায়গুলো

| #  | অধ্যায় | কোন প্রশ্নের উত্তর দেয় |
| -- | ------ | -------------------- |
| 01 | [Monitoring ও Observability-র মূল কথা](#ch-monitoring-fundamentals) | কী মাপবেন, আর SLO দিয়ে আপনি কীসের দায় নিচ্ছেন? |
| 02 | [Metrics, Dashboard ও Alerting](#ch-metrics-and-dashboards) | Metrics query করবেন কীভাবে, আর কোন alert-এর জন্য মানুষকে ঘুম থেকে তোলা চলে? |

## Interviewer-রা যা যাচাই করেন

Part VIII-এর শুরুর পাতার part-স্তরের লক্ষণগুলোর ওপর, observability নিয়ে তিনটি প্রশ্ন:

- **Average নয়, percentile কেন?** 200 ms average-এর আড়ালে নয় সেকেন্ডের p99 লুকিয়ে থাকতে পারে। আলাদা আলাদা instance-এর
  percentile গড় করা যায় না। আগে histogram-এর bucket-গুলো যোগ করুন, তারপর quantile বের করুন।
- **Cardinality কী?** Time series-এর সংখ্যা হলো প্রতিটি label-এর আলাদা value-গুলোর গুণফল। Label-এ user ID রাখলেই
  metrics backend-এর memory ফুরিয়ে যায়।
- **CPU বেশি হলে alert দেবেন?** না। Page করুন সেই লক্ষণে, যা user দেখতে পান। Resource metrics থাকুক dashboard-এ,
  কারণ খুঁজতে কাজে লাগবে।

## পড়ার ক্রম

সবসময় আগে 01। অধ্যায় 02 এর শব্দগুলোই ব্যবহার করে, বিশেষ করে cardinality আর error budget।
