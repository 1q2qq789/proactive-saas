# Proactive SaaS

> **Proactive content quality scanning as a service** — your users type, it reads their intent and suggests what to check. Deploy in 10 minutes.
>
> **主动式内容质量 SaaS** — 用户在输入框打字的时候，系统自动读懂意图、给出检查建议。10 分钟部署上线。

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?logo=tailwindcss)](https://tailwindcss.com)
[![Vercel](https://img.shields.io/badge/Vercel-000?logo=vercel)](https://vercel.com)

---

## 🇬🇧 English

### What is this?

A ready-to-deploy SaaS template that gives your users **proactive quality suggestions** as they type:

- **Real-time intent analysis** — user starts typing, the system detects what they're doing (interview prep? writing a report? coding?) and shows relevant tips
- **Content scanning** — keyword or LLM-powered scan checks for undefined numbers, logic gaps, data source issues, hardcoded secrets
- **Scan history** — all results saved to Supabase, searchable from dashboard

### Quick Preview

| Feature | Screenshot |
|---------|-----------|
| User types content | ↔️ 1.5s debounce | Intent panel appears with suggestions |
| Scan button | ↔️ 10-60s | Full quality report with risk scores |

### Deploy Your Own (10 minutes)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. **Clone the repo** → `git clone <your-fork-url>`
2. **Create Supabase project** at [supabase.com](https://supabase.com)
3. **Run SQL migrations** — copy `supabase/migrations/schema.sql` into Supabase SQL Editor
4. **Set environment variables** in Vercel Dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — your Supabase publishable key
   - `DEEPSEEK_API_KEY` — optional, for LLM scan mode
5. **Deploy** → Vercel auto-detects Next.js

### Features

| Feature | Free Tier | Pro Tier |
|---------|-----------|----------|
| Keyword scans | Unlimited | Unlimited |
| LLM deep scans | 10/month | Unlimited |
| Intent analysis | ✓ | ✓ |
| Scan history | 30 days | Forever |
| Custom checklists | — | ✓ |

---

## 🇨🇳 中文

### 这是什么？

一个开箱即用的 SaaS 模板，让用户在输入内容时**自动获得主动质量建议**：

- **实时意图分析** — 用户一打字，系统就识别他在干什么（准备面试？写研报？写代码？开发？），展示相关建议
- **内容扫描** — 关键词或 LLM 深度扫描，检查未定义口径的数字、逻辑断层、数据来源问题、硬编码密钥
- **扫描历史** — 所有结果保存到 Supabase，可在仪表盘搜索

### 效果预览

| 功能 | 流程 |
|------|------|
| 用户在输入框打字 | → 1.5 秒防抖 → 意图面板浮出，显示检查建议 |
| 点击扫描按钮 | → 10-60 秒 → 完整质量报告，含风险评分 |

### 自己部署（10 分钟）

1. **克隆项目** → `git clone <你的仓库地址>`
2. **创建 Supabase 项目** → [supabase.com](https://supabase.com)
3. **运行数据库迁移** → 将 `supabase/migrations/schema.sql` 复制到 Supabase SQL 编辑器
4. **设置环境变量**（Vercel Dashboard）：
   - `NEXT_PUBLIC_SUPABASE_URL` — Supabase 项目 URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase publishable key
   - `DEEPSEEK_API_KEY` — 可选，LLM 扫描模式需要
5. **部署到 Vercel** → 自动识别 Next.js

### 功能对比

| 功能 | 免费版 | Pro 版 |
|------|--------|--------|
| 关键词扫描 | 无限 | 无限 |
| LLM 深度扫描 | 10次/月 | 无限 |
| 意图分析 | ✓ | ✓ |
| 扫描历史 | 30天 | 永久 |
| 自定义检查项 | — | ✓ |

### 技术栈

```
Next.js 16 + Tailwind CSS v4 + Supabase (Auth + DB) + Vercel
```

---

## Project Structure / 项目结构

```
proactive-saas/
├── vercel.json                  # Vercel deployment config
├── supabase/
│   └── migrations/schema.sql    # Database schema (users, agents, scans)
├── web/
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/
│   │   │   │   ├── scan/route.ts        # Content scan API
│   │   │   │   └── intent/route.ts      # Intent analysis API
│   │   │   ├── scan/page.tsx            # Scan page w/ IntentPanel
│   │   │   ├── dashboard/page.tsx       # Dashboard w/ stats & history
│   │   │   └── auth/                    # Login & signup
│   │   ├── components/
│   │   │   └── IntentPanel.tsx          # Realtime intent analysis widget
│   │   └── lib/
│   │       ├── intent-engine/           # Intent analysis engine (rule-based, <10ms)
│   │       └── supabase/                # Supabase client (browser + server)
│   ├── next.config.ts
│   └── package.json
└── .env.example
```

## Customization / 自定义

### Modify intent scenarios / 修改意图场景

Edit `web/src/lib/intent-engine/index.ts`:

- **Line 49-52**: Interview prep keywords (面试 / 面经 / STAR)
- **Line 87-88**: Report writing keywords (研报 / 报告 / 文档)
- **Line 117-118**: Code development keywords (代码 / 开发 / 部署)
- **Line 150-151**: Publish keywords (分享 / 发布 / 发文)

### Modify scan checklists / 修改扫描检查项

Edit (or create new) YAML files in your deployed scanner package:
- `data_quality.yaml` — number definitions, source citations
- `logic_integrity.yaml` — hidden assumptions, reasoning chains
- `code_quality.yaml` — hardcoded secrets, error handling
- `consistency.yaml` — cross-reference conflicts
- `environment.yaml` — missing config, insecure defaults

---

## License / 许可

MIT — free to use, modify, distribute.  
MIT 协议 — 自由使用、修改、分发。
