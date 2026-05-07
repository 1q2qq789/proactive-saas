# Proactive SaaS Template — 部署指南

> 一个基于意图分析的主动内容质量扫描 SaaS。用户在输入内容时，系统自动分析意图并给出建议。

## 一分钟预览

![Scan Page](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?logo=tailwindcss)
![Vercel](https://img.shields.io/badge/Vercel-000?logo=vercel)

**功能：**
1. **实时意图分析** — 用户在输入框打字时，实时检测场景并给出建议（面试准备？写研报？写代码？发布内容？）
2. **内容扫描** — 关键词或 LLM 模式扫描，检查数字口径、逻辑断层、代码安全等
3. **历史追踪** — 扫描结果保存到 Supabase

## 前置要求

- [Vercel](https://vercel.com) 账号
- [Supabase](https://supabase.com) 账号（Free Tier 即可）
- 可选：DeepSeek API Key（LLM 扫描模式需要）

## 部署步骤（30 分钟）

### 1. 克隆项目

```bash
git clone <your-new-repo-url>
cd proactive-saas
```

### 2. 创建 Supabase 项目

1. 打开 [supabase.com](https://supabase.com) → New Project
2. 记下 Project URL（如 `https://xxx.supabase.co`）
3. Settings → API → Project API keys 找到 `anon public` key（格式 `sb_publishable_...`）

### 3. 运行数据库迁移

打开 Supabase SQL Editor，执行以下 SQL：

```sql
-- users 表
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  scan_quota_remaining INTEGER DEFAULT 50,
  llm_quota_remaining INTEGER DEFAULT 10,
  is_pro BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- agents 表
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  checklists JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- scans 表
CREATE TABLE IF NOT EXISTS scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Scan',
  content_source TEXT,
  mode TEXT DEFAULT 'keyword',
  summary JSONB,
  issues JSONB,
  score_avg INTEGER DEFAULT 0,
  score_max INTEGER DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own data" ON users
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can CRUD own agents" ON agents
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can CRUD own scans" ON scans
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Auto-create user row on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 4. 配置环境变量

在 Vercel Dashboard 添加：

| Variable | Value | 说明 |
|----------|-------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_xxx` | Supabase anon public key |
| `DEEPSEEK_API_KEY` | `sk-xxx` | （可选）DeepSeek API Key |
| `PYTHON_PATH` | `python3` | 服务器 Python 路径 |

### 5. 部署到 Vercel

**方式 A — 一键部署（推荐）**

点这个按钮设置你的仓库：

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

连接 GitHub 仓库后，Vercel 会自动检测 Next.js 项目。

**重要：Vercel 设置**

如果是 monorepo 结构（`web/` 子目录 + root `vercel.json`）：

1. 在 Vercel Dashboard → Project Settings → General
2. **Root Directory** 留空（默认 `/`）
3. **Build Command** 留空（用 `vercel.json`）
4. **Output Directory** 留空

### 6. 配置 Supabase Auth

Supabase Dashboard → Authentication → Settings

- 添加 Site URL: `https://your-app.vercel.app`
- 添加 Redirect URLs: `https://your-app.vercel.app/auth/callback`

## 本地开发

```bash
cd web
npm install
cp ../.env.example .env.local  # 填入你的环境变量
npm run dev
```

## 为他人定制

### 修改意图分析场景

编辑 `web/src/lib/intent-engine/index.ts`：

- 场景关键词在第 49-52 行（面试）、87-88 行（研报）、117-118 行（代码）、150-151 行（发布）
- 每条规则的分析逻辑在对应 `if` 块内
- 可以删减或新增场景

### 修改扫描检查项

编辑 `src/proactive_scanner/data/checklists/` 下的 YAML 文件：

```yaml
# data_quality.yaml
checks:
  - id: undefined_numbers
    name: "未定义口径的数字"
    severity: error
    weight: 5
    prompt: "检查是否有数字但缺少上下文..."
```

## 项目结构

```
proactive-saas/
├── vercel.json                     # Vercel 部署配置
├── supabase/
│   └── migrations/                 # SQL 迁移（参考）
├── web/
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/
│   │   │   │   ├── scan/route.ts   # 扫描 API
│   │   │   │   └── intent/route.ts # 意图分析 API
│   │   │   ├── scan/page.tsx       # 扫描页面（含 IntentPanel）
│   │   │   ├── dashboard/page.tsx  # 仪表盘
│   │   │   └── auth/               # 登录注册
│   │   ├── components/
│   │   │   ├── IntentPanel.tsx      # 实时意图分析组件
│   │   │   └── Navbar.tsx
│   │   └── lib/
│   │       ├── intent-engine/       # 意图分析引擎（纯规则）
│   │       └── supabase/           # Supabase 客户端
│   ├── next.config.ts
│   ├── package.json
│   └── tsconfig.json
└── .env.example
```

## License

MIT — 自由使用、修改、分发。
