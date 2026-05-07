#!/usr/bin/env python3
"""
proactive-scanner — 自检扫描引擎

功能：
1. 加载 checklists/ 下的所有 YAML 检查清单
2. 对指定内容逐项执行分析扫描（关键词 + LLM 语义）
3. 输出风险评分 + 修复建议

两种扫描模式：
- keyword_only: 仅关键词扫描（快速、零成本）
- llm: 调用 DeepSeek API 做语义分析（更准、有 API 成本）
"""

import json
import os
import re
import sys
import urllib.request
import urllib.error
from pathlib import Path
from typing import Any, Optional

# ── 路径查找 ──────────────────────────────────────────

def _get_data_dir() -> Path:
    """Return the path to the package data directory (checklists, etc.)."""
    return Path(__file__).resolve().parent / "data"

DATA_DIR = _get_data_dir()
CHECKLISTS_DIR = DATA_DIR / "checklists"

# LLM 配置
LLM_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
LLM_BASE_URL = os.environ.get("OPENAI_BASE_URL", "https://api.deepseek.com/v1")
LLM_MODEL = "deepseek-chat"


def load_yaml_simple(filepath):
    """简化版 YAML 解析（纯 stdlib，无 pyyaml 依赖）"""
    filepath = Path(filepath)
    result = {}
    current_list = None
    current_check = None

    def _flush():
        nonlocal current_check
        if current_check and current_list is not None and current_check.get("id"):
            current_list.append(current_check)
        current_check = None

    if not filepath.exists():
        return result

    with open(filepath, "r", encoding="utf-8") as f:
        lines = f.readlines()

    for raw_line in lines:
        stripped = raw_line.rstrip()
        if not stripped:
            continue

        indent = len(raw_line) - len(raw_line.lstrip())
        content = stripped.lstrip()

        if content.startswith("#"):
            continue

        m = re.match(r"^(\w[\w_-]*)\s*:\s*(.*)$", content)
        if m and indent == 0:
            _flush()
            key, val = m.group(1), m.group(2).strip()
            if " #" in val:
                val = val.split(" #")[0].strip()
            val = val.strip("\"'")
            if key == "checks":
                current_list = []
                result["checks"] = current_list
                continue
            result[key] = val
            continue

        lm = re.match(r"^-\s+(\w[\w_-]*)\s*:\s*(.*)$", content)
        if lm and indent == 2:
            _flush()
            k, v = lm.group(1), lm.group(2).strip()
            v = v.strip("\"'")
            current_check = {k: v}
            continue

        if current_check is not None:
            fm = re.match(r"^(\w[\w_-]*)\s*:\s*(.*)$", content)
            if fm:
                key, val = fm.group(1), fm.group(2).strip()
                if " #" in val:
                    val = val.split(" #")[0].strip()
                val = val.strip("\"'")
                if val.startswith(">") or val == "":
                    current_check[key] = ""
                    continue
                try:
                    if "." in val:
                        current_check[key] = float(val)
                    else:
                        current_check[key] = int(val)
                except ValueError:
                    current_check[key] = val
                continue

            if "prompt" in current_check and isinstance(current_check["prompt"], str):
                tc = content.strip()
                if tc and indent >= 6:
                    current_check["prompt"] += " " + tc

    _flush()
    return result


def load_all_checklists():
    """加载所有检查清单"""
    all_checks = []
    if not CHECKLISTS_DIR.exists():
        return all_checks

    for path in sorted(CHECKLISTS_DIR.glob("*.yaml")):
        data = load_yaml_simple(str(path))
        checks = data.get("checks", [])
        wgt = data.get("weight", 5)
        try:
            wgt = int(wgt)
        except (ValueError, TypeError):
            wgt = 5
        for c in checks:
            cw = c.get("weight", wgt)
            try:
                cw = int(cw)
            except (ValueError, TypeError):
                cw = wgt
            c["weight"] = cw
        all_checks.extend(checks)

    return all_checks


def format_report(passed, warnings, errors, llm_used=False):
    """格式化扫描报告"""
    parts = []
    # Header
    mode = "LLM" if llm_used else "keyword"
    parts.append(f"## Self-check Report (mode: {mode})")
    parts.append("")

    # Summary bar
    parts.append(f"> Summary: {len(passed)} passed | {len(warnings)} warnings | {len(errors)} issues")
    parts.append("")

    # Passed
    if passed:
        parts.append(f"### Passed ({len(passed)})")
        for p in passed:
            parts.append(f"-  {p.get('name', p.get('id', '?'))}")
        parts.append("")

    # Warnings
    if warnings:
        parts.append(f"### Warnings ({len(warnings)})")
        for w in sorted(warnings, key=lambda x: x.get("score", 0), reverse=True):
            sc = w.get("score", 0)
            parts.append(f"- **{w.get('name', w.get('id', '?'))}** [score: {sc}]")
            if dt := w.get("detail"):
                parts.append(f"  > {dt[:200]}")
        parts.append("")

    # Issues
    if errors:
        parts.append(f"### Issues ({len(errors)})")
        for e in sorted(errors, key=lambda x: x.get("score", 0), reverse=True):
            sc = e.get("score", 0)
            rk = "high priority" if sc >= 100 else ("needs attention" if sc >= 60 else "low risk")
            parts.append(f"- **{e.get('name', e.get('id', '?'))}** [score: {sc} -- {rk}]")
            if dt := e.get("detail"):
                parts.append(f"  > {dt[:200]}")
            if fix := e.get("suggestion"):
                parts.append(f"  > Fix: {fix[:200]}")
        parts.append("")

    # Next steps
    if errors or warnings:
        parts.append("### Suggested next steps")
        if errors:
            parts.append(f"- Fix {len(errors)} issue(s) first (highest risk)")
        if warnings:
            parts.append(f"- Address {len(warnings)} warning(s)")
        parts.append("")

    return "\n".join(parts)


def score_item(check, finding, suggestion=None):
    """对扫描结果评分"""
    result = {
        "id": check["id"],
        "name": check.get("name", check["id"]),
        "detail": finding or "",
    }
    if suggestion:
        result["suggestion"] = suggestion

    if not finding:
        result["status"] = "pass"
        result["score"] = 0
        return result

    severity = check.get("severity", "warning")
    weight = check.get("weight", 5)
    try:
        weight = int(weight)
    except (ValueError, TypeError):
        weight = 5

    impact = max(weight, 7) if severity == "error" else max(weight, 4)
    prob = 7 if severity == "error" else 5
    urg = 7 if severity == "error" else 4

    result["score"] = impact * prob * urg
    result["status"] = "error" if severity == "error" else "warning"
    return result


def _keyword_scan(content, check):
    """基础关键词扫描"""
    cid = check["id"]

    # 检测是否为代码/HTML文件（包含大量技术符号）
    code_patterns = [r'<[a-z]+', r'function\s+\w+\s*\(', r'import\s+\{', r'export\s+',
                     r'\.eq\(', r'process\.env', r'const\s+\w+\s*=', r'SELECT.*FROM',
                     r'@media', r'</', r'\{[^}]*\}[;{]', r'//.*', r'/\*']
    is_code = sum(1 for p in code_patterns if re.search(p, content)) >= 3

    if cid == "undefined_numbers":
        # 代码中的数字不计入
        if is_code:
            return None
        pattern = r"(增长|下降|达到|超过|减少|提升)[了约近]?(\d+[\.\d]?)(?![.%])"
        matches = re.findall(pattern, content)
        if matches:
            dirt = "; ".join(f"{m[0]}{m[1]}" for m in matches[:3])
            return f"数字可能缺少口径定义: {dirt}"
        return None

    if cid == "undefined_terms":
        # 技术/代码文件跳过术语检查（误报太多）
        if is_code:
            return None
        # 只有纯文本内容才检查，且要求是中文为主的文档
        chinese_chars = len(re.findall(r'[\u4e00-\u9fff]', content))
        if chinese_chars < 20:
            return None

        terms = re.findall(r"\b[A-Z][A-Z0-9]{1,7}\b", content)
        known = {
            # 通用技术
            "API", "SDK", "UI", "UX", "IDE", "SQL", "HTML", "CSS", "JS",
            "JSON", "YAML", "CLI", "PRD", "CI", "CD",
            "DNS", "HTTP", "HTTPS", "SSH", "TLS", "SSL", "TCP", "IP", "URL", "URI",
            "PDF", "PNG", "SVG", "GIF", "JPG", "JPEG", "AI", "ML",
            "LLM", "RAG", "AGI", "DB", "ID", "OKR", "KPI", "ROI", "CTR",
            "SSR", "CSR", "SPA", "REST", "AJAX", "DOM", "CORS",
            "JWT", "OAuth", "SSO", "LDAP", "SAML",
            "SHA", "AES", "RSA", "HMAC", "UUID", "GUID",
            "CPU", "GPU", "RAM", "BIOS", "USB",
            "FTP", "SFTP", "SMTP", "IMAP", "POP",
            "OS", "VM",
            "CRUD", "ORM",
            "MCP", "RWA", "SEO", "KOL",
            # 前端框架/工具
            "Vue", "React", "Svelte", "Next",
            "Webpack", "Vite", "ESLint", "Babel",
            "TypeScript", "JavaScript",
            "Node", "Deno", "Bun",
            "NPM", "YARN", "PNPM",
            "Tailwind", "Bootstrap",
            # 数据库/SQL
            "DDL", "DML", "DCL", "TCL", "CTE", "OLAP", "OLTP",
            "PK", "FK",
            "SELECT", "FROM", "WHERE", "JOIN", "LEFT", "RIGHT",
            "INNER", "OUTER", "CROSS", "ON", "AND", "OR", "IN",
            "NOT", "NULL", "TRUE", "FALSE",
            "GROUP", "ORDER", "HAVING", "LIMIT", "OFFSET",
            "INSERT", "UPDATE", "DELETE", "CREATE", "TABLE",
            "ALTER", "DROP", "TRUNCATE", "SET",
            "PRIMARY", "FOREIGN", "KEY", "UNIQUE", "CHECK",
            "DEFAULT", "CASCADE", "INDEX",
            "COUNT", "SUM", "AVG", "MIN", "MAX",
            "DISTINCT", "ASC", "DESC", "BY",
            "INT", "VARCHAR", "TEXT", "BOOL", "BOOLEAN",
            "SERIAL", "JSONB", "TIMESTAMPTZ",
            "RLS", "POLICY", "ROW", "USING",
            # 金融/商业
            "CEO", "CTO", "CFO", "COO", "CMO", "CIO",
            "GMV", "MAU", "DAU", "WAU", "ARPU", "LTV", "CAC",
            "USD", "EUR", "GBP", "JPY", "CNY", "HKD", "KRW", "SGD",
            "GDP", "CPI", "PPI", "PMI",
            "IPO", "PE", "VC", "LP", "GP",
            "B2B", "B2C", "SaaS", "PaaS", "IaaS",
            "EBITDA", "EPS",
            "ETF", "REIT",
            "SEC", "FED", "ECB", "IMF",
            "YoY", "QoQ", "MoM",
            "CAGR", "ROI",
            # 加密/Web3
            "BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOT", "AVAX", "FTM",
            "TVL", "NFT", "DEX", "CEX", "DeFi", "Web3",
            "DAO", "POS", "POW",
            "USDT", "USDC", "DAI", "TUSD", "FDUSD",
            "ERC", "BEP", "TRC", "BSC", "EVM",
            "AMM", "APY", "APR",
            "KYC", "AML", "CFTC",
            "P2P", "OTC", "MEV", "ZK", "L2", "L1",
            "MPC", "EOA", "SCA",
            "OKX", "MEXC", "Bybit", "Bitget", "Binance",
            "ICP", "NEAR", "ARB", "OP", "STRK", "MATIC",
            "BRC", "ORC",
            "CEX", "DEX", "POW", "POS",
            "ICO", "IDO", "IEO",
            # 考试/语言
            "IELTS", "TOEFL", "GRE", "GMAT", "SAT", "ACT",
            "CEFR", "CET", "TEM",
            # 媒体
            "CNN", "VOA", "BBC", "CNBC", "Reuters", "Bloomberg",
            # 网络/安全
            "VPN", "WIFI", "ASCII", "UTF",
            "XSS", "CSRF", "SQLi", "RCE",
            # 文件/格式
            "CSV", "XML", "YAML", "TOML",
            "DOC", "DOCX", "XLS", "XLSX", "PPT", "PPTX",
            "MP3", "MP4", "AVI", "MKV", "MOV", "WAV", "FLAC",
            "ZIP", "RAR", "TAR", "GZ",
            # 许可证
            "MIT", "GPL", "LGPL", "AGPL", "Apache", "BSD", "SPDX",
            # Python 库
            "PIL", "NumPy", "Pandas", "Flask", "Django", "FastAPI",
            # 其他常见
            "RGB", "FAQ", "TOS", "EULA",
        }
        unknown = [t for t in terms if t not in known]
        # 过滤：纯 hex、纯数字、HTML 实体
        unknown = [t for t in unknown if not re.match(r'^[A-F0-9]{4,}$', t)
                   and not t.isdigit()
                   and not re.match(r'^[A-Z]{3,}[0-9]+$', t)]
        # 要求至少3个未知缩写，且未知数不超过总术语数的30%（否则说明是代码里的随机串）
        if unknown and len(unknown) >= 3 and len(unknown) < len(terms) * 0.3:
            return f"未定义的缩写: {', '.join(unknown[:6])}"
        return None

    if cid == "assumption_check":
        if is_code:
            return None
        patterns = [r"按照这个趋势", r"假设", r"理论上", r"用户会[喜欢接受选择]",
                    r"成本会[降低下降减少]", r"大家都会", r"理所应当", r"显然"]
        hits = [m for p in patterns for m in re.findall(p, content)]
        if hits:
            return f"发现隐含假设（{len(hits)}处）"
        return None

    return None


# ── LLM 扫描 ──────────────────────────────────────────────

def _llm_call(messages, temperature=0.1, max_tokens=1024):
    """调用 DeepSeek API"""
    if not LLM_API_KEY:
        return None, "No DEEPSEEK_API_KEY configured"

    url = f"{LLM_BASE_URL.rstrip('/')}/chat/completions"
    payload = json.dumps({
        "model": LLM_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }).encode("utf-8")

    req = urllib.request.Request(url, data=payload, headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {LLM_API_KEY}",
    })

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data["choices"][0]["message"]["content"], None
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        return None, f"HTTP {e.code}: {body[:200]}"
    except Exception as e:
        return None, str(e)


def llm_scan_check(content, check, context_content=None):
    """用 LLM 对单个检查项执行语义扫描

    Returns:
        (finding_text_or_None, suggestion_text_or_None, error_or_None)
    """
    prompt = check.get("prompt", "")
    if not prompt:
        return None, None, "No prompt defined"

    # Build scan context
    scan_text = content
    if context_content:
        scan_text = f"[New Content]\n{content}\n\n[Existing Content]\n{context_content}"

    messages = [
        {
            "role": "system",
            "content": (
                "You are a meticulous QA reviewer. Your task is to scan content for issues "
                "based on the given CHECK INSTRUCTION. Be specific and actionable.\n\n"
                "Respond in this exact JSON format:\n"
                "{\"finding\": \"description of what's wrong, or empty if none\", "
                "\"suggestion\": \"how to fix it, or empty if none\"}\n\n"
                "Use Chinese for findings and suggestions."
            ),
        },
        {
            "role": "user",
            "content": f"CHECK INSTRUCTION:\n{prompt}\n\nCONTENT TO SCAN:\n{scan_text}",
        },
    ]

    reply, error = _llm_call(messages)
    if error:
        return None, None, error

    # Parse JSON response
    try:
        # Find JSON block in response
        json_match = re.search(r"\{[^}]+\}", reply, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
        else:
            result = json.loads(reply)
    except (json.JSONDecodeError, ValueError):
        # Fallback: treat whole response as finding
        return reply.strip()[:200], None, None

    finding = result.get("finding", "").strip()
    suggestion = result.get("suggestion", "").strip()

    return (finding if finding else None,
            suggestion if suggestion else None,
            None)


# ── 主入口 ──────────────────────────────────────────────

def scan_content(content, target_files=None, mode="keyword", context_content=None):
    """对指定内容执行扫描

    Args:
        content: 要扫描的文本内容
        target_files: 关联的文件路径列表
        mode: "keyword" | "llm"
        context_content: 可选的"已有内容"，用于对比扫描

    Returns:
        格式化的扫描报告 Markdown
    """
    checks = load_all_checklists()

    if not checks:
        return "No checklists found. Check references/checklists/ directory."

    passed = []
    warnings = []
    errors = []
    llm_used = False

    for check in checks:
        if mode == "keyword":
            finding = _keyword_scan(content, check)
            result = score_item(check, finding)
        else:
            # LLM mode
            finding, suggestion, error = llm_scan_check(content, check, context_content)
            if error:
                # Fallback to keyword scan on error
                finding = _keyword_scan(content, check)
                result = score_item(check, finding)
                result["detail"] = f"[LLM error, fell back to keyword] {result.get('detail', '')}"
            else:
                llm_used = True
                result = score_item(check, finding, suggestion)

        if result["status"] == "pass":
            passed.append(result)
        elif result["status"] == "warning":
            warnings.append(result)
        else:
            errors.append(result)

    return format_report(passed, warnings, errors, llm_used=llm_used)


def scan_content_json(
    content: str,
    target_files: Optional[list] = None,
    mode: str = "keyword",
    context_content: Optional[str] = None,
    checklists_dir: Optional[Path] = None,
) -> dict:
    """对指定内容执行扫描，返回结构化 JSON。"""
    if checklists_dir:
        checks = load_all_checklists(checklists_dir)
    else:
        checks = load_all_checklists()
    if not checks:
        return {"summary": {"total_checks": 0, "passed": 0, "warnings": 0, "errors": 0},
                "issues": [], "score_avg": 0, "score_max": 0}

    passed, warnings, errors = [], [], []

    for check in checks:
        if mode == "keyword":
            finding = _keyword_scan(content, check)
            result = score_item(check, finding)
        else:
            finding, suggestion, error = llm_scan_check(content, check, context_content)
            if error:
                finding = _keyword_scan(content, check)
                result = score_item(check, finding)
                result["detail"] = f"[LLM error] {result.get('detail', '')}"
            else:
                result = score_item(check, finding, suggestion)

        if result["status"] == "pass":
            passed.append(result)
        elif result["status"] == "warning":
            warnings.append(result)
        else:
            errors.append(result)

    all_scores = [i["score"] for i in errors + warnings if i["score"] > 0]
    issues = errors + warnings
    issues.sort(key=lambda x: x["score"], reverse=True)

    return {
        "summary": {
            "total_checks": len(checks),
            "passed": len(passed),
            "warnings": len(warnings),
            "errors": len(errors),
        },
        "issues": [
            {
                "id": i["id"],
                "name": i["name"],
                "score": i["score"],
                "severity": "error" if i["status"] == "error" else "warning",
                "detail": i.get("detail", ""),
                "suggestion": i.get("suggestion", None),
            }
            for i in issues
        ],
        "score_avg": int(sum(all_scores) / len(all_scores)) if all_scores else 0,
        "score_max": max(all_scores) if all_scores else 0,
    }


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Proactive Scanner")
    parser.add_argument("--mode", choices=["keyword", "llm"], default="keyword",
                        help="Scan mode: keyword (fast/free) or llm (DeepSeek semantic)")
    parser.add_argument("--file", help="File to scan")
    parser.add_argument("--context", help="Existing content file for comparison")
    args = parser.parse_args()

    if args.file:
        with open(args.file, "r", encoding="utf-8") as f:
            content = f.read()
    else:
        content = sys.stdin.read() if not sys.stdin.isatty() else ""

    context_content = None
    if args.context:
        with open(args.context, "r", encoding="utf-8") as f:
            context_content = f.read()

    if not content:
        print("Usage: echo 'content' | python scanner.py --mode llm")
        print("   Or: python scanner.py --mode llm --file path/to/file.md")
        sys.exit(1)

    print(scan_content(content, mode=args.mode, context_content=context_content))
