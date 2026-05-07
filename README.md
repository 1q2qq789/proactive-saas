# Proactive Scanner

> **AI-powered proactive content scanner** — catches data quality issues, logic gaps, and security risks before they get noticed. Also reads your intent and suggests what to fix next.
>
> **主动式内容质量扫描器** — 在问题被人发现之前，自动抓出数据口径不清、逻辑断层、代码安全隐患。还能读懂你的意图，主动告诉你下一步该检查什么。

[![Python 3.10+](https://img.shields.io/badge/Python-3.10+-blue)](https://python.org)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase)](https://supabase.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🇬🇧 English

### What is this?

This monorepo contains **two products**:

| Product | Use Case | Try It |
|---------|----------|--------|
| **CLI / Python Library** (`src/`) | Terminal users, CI pipelines, Python scripts | `pip install proactive-scanner` |
| **SaaS Web App** (`web/`) | Deploy a quality scanning website for your team | Deploy to Vercel in 10 min |

Both share the same **intent detection engine** — a zero-dependency, rule-based system (<10ms) that figures out what you're working on and suggests what to check.

---

### CLI / Python Library

Zero-dependency Python tools for proactive content quality checking.

```bash
# Install
pip install proactive-scanner

# Content Scan — check text for undefined numbers, logic gaps, hardcoded secrets
echo "User count grew 30%, costs decreased." | proactive-scan

# Intent Analysis — tells you what to check based on what you're doing
proactive-scan --intent --intent-text "Preparing for an interview"
proactive-scan --intent --intent-text "Writing a research report" --file report.md
proactive-scan --intent --intent-text "Reviewing code" --file app.ts

# Use as Python library
python3 -c "
from proactive_scanner.intent_engine import analyze_intent
r = analyze_intent('Writing a report', 'TVL grew 30%')
for risk in r['risks']: print(risk['description'])
"
```

**Scan modes:**
| Mode | Speed | Cost | Use |
|------|-------|------|-----|
| `keyword` | Instant | Free | Quick static checks |
| `llm` | 30-60s | API credits | Deep semantic analysis |

**18 checks across 5 categories:** data quality, logic integrity, consistency, code security, environment health.

**4 intent scenarios:** interview prep, report writing, code development, publishing.

---

### SaaS Web App

A ready-to-deploy Next.js + Supabase web app. Deploy your own in 10 minutes.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

**Features:**
- **Real-time intent analysis** — user types, system detects what they're doing and shows tips
- **Content scanning** — keyword or LLM scan, results saved to database
- **Dashboard** — scan history, stats, quota management
- **Auth** — built-in Supabase authentication (email/password)

**Tech stack:** Next.js 16 + Tailwind CSS v4 + Supabase (Auth + DB) + Vercel

**Deploy:**
1. Clone → `git clone https://github.com/1q2qq789/proactive-saas.git`
2. Create Supabase project, run `supabase/migrations/schema.sql`
3. Set env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy to Vercel

---

## 🇨🇳 中文

### 这是什么？

这个仓库包含**两个产品**：

| 产品 | 用途 | 快速体验 |
|------|------|---------|
| **CLI / Python 库** (`src/`) | 终端用户、CI 流水线、Python 脚本 | `pip install proactive-scanner` |
| **SaaS Web 应用** (`web/`) | 给团队部署一个质量扫描网站 | 10 分钟部署到 Vercel |

两者共享同一个**意图检测引擎** — 纯规则系统（<10ms），识别你在干什么，主动建议该检查什么。

---

### CLI / Python 库

零依赖的 Python 工具，检查内容质量。

```bash
# 安装
pip install proactive-scanner

# 内容扫描 — 检查未定义口径的数字、逻辑断层、硬编码密钥
echo "用户数量增长了30%，成本降低了。" | proactive-scan

# 意图分析 — 识别你在做什么，主动建议检查方向
proactive-scan --intent --intent-text "准备面试"
proactive-scan --intent --intent-text "写一份研报" --file report.md
proactive-scan --intent --intent-text "审查代码" --file app.ts

# 作为 Python 库使用
python3 -c "
from proactive_scanner.intent_engine import analyze_intent
r = analyze_intent('写研报', 'TVL 增长了30%')
for risk in r['risks']: print(risk['description'])
"
```

**扫描模式：**
| 模式 | 速度 | 成本 | 用途 |
|------|------|------|------|
| `keyword` | 即时 | 免费 | 快速静态检查 |
| `llm` | 30-60秒 | API 费用 | 深度语义分析 |

**18 项检查覆盖 5 大类：** 数据质量、逻辑完整性、一致性、代码安全、环境健康。

**4 种意图场景：** 面试准备、研报撰写、代码开发、内容发布。

---

### SaaS Web 应用

可快速部署的 Next.js + Supabase Web 应用。10 分钟上线。

**功能：**
- **实时意图分析** — 用户在输入框打字时，系统自动识别场景并显示提示
- **内容扫描** — 关键词或 LLM 扫描，结果保存到数据库
- **仪表盘** — 扫描历史、统计数据、配额管理
- **用户认证** — 内置 Supabase 邮箱密码登录

**技术栈：** Next.js 16 + Tailwind CSS v4 + Supabase + Vercel

**部署：**
1. 克隆 → `git clone https://github.com/1q2qq789/proactive-saas.git`
2. 创建 Supabase 项目，执行 `supabase/migrations/schema.sql`
3. 配置环境变量：`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. 部署到 Vercel

---

## Project Structure / 项目结构

```
proactive-saas/
├── src/                              ← CLI / Python Library
│   └── proactive_scanner/
│       ├── scanner.py                # Content scan engine (18 checks)
│       ├── intent_engine.py          # Intent analysis engine (4 scenarios)
│       ├── cli.py                    # CLI entry point
│       └── data/checklists/          # YAML checklists for each category
├── web/                              ← SaaS Web App
│   ├── src/app/
│   │   ├── scan/page.tsx            # Scan page w/ IntentPanel
│   │   ├── dashboard/               # Dashboard w/ stats & history
│   │   ├── auth/                    # Login & signup
│   │   └── api/                     # Scan API + Intent Analysis API
│   └── src/components/
│       └── IntentPanel.tsx           # Realtime intent analysis widget
├── supabase/migrations/schema.sql    # Database schema
├── DEPLOY.md                         # Full deployment guide
├── pyproject.toml                    # Python package config
└── vercel.json                       # Vercel deployment config
```

## License / 许可

MIT — free to use, modify, distribute.
MIT 协议 — 自由使用、修改、分发。
