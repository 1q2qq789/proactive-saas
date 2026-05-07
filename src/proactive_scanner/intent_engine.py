"""intent_engine.py — 意图分析引擎

分析用户输入的文本，推断用户在做什么事，主动给出建议。

纯 Python 标准库，零外部依赖。

使用方式:
    from proactive_scanner.intent_engine import analyze_intent

    result = analyze_intent("我在准备面试", "我在 Bitget Wallet 期间负责...")
    print(result["insights"])
    print(result["risks"])
    print(result["suggestions"])
"""

from __future__ import annotations
import re
from typing import Any

__all__ = ["analyze_intent"]


# ── 场景关键词 ────────────────────────────
_SCENE_INTERVIEW = {"面试", "面经", "自我介绍", "star", "STAR", "面试手册",
                    "求职", "跳槽", "面試", "面试准备"}
_SCENE_REPORT = {"研报", "报告", "研究", "分析", "文档", "调研", "深度",
                 "日报", "周报", "月报", "研究报告", "研报"}
_SCENE_CODE = {"代码", "开发", "部署", "上线", "bug", "Bug", "BUG",
               "代码审查", "code review", "重构"}
_SCENE_PUBLISH = {"分享", "发布", "推送", "发文", "发文章", "发推"}


def _match_scene(text: str) -> list[str]:
    """返回匹配的场景列表"""
    scenes = []
    lower = text.lower()
    for scene_name, keywords in [
        ("interview", _SCENE_INTERVIEW),
        ("report", _SCENE_REPORT),
        ("code", _SCENE_CODE),
        ("publish", _SCENE_PUBLISH),
    ]:
        for kw in keywords:
            if kw.lower() in lower:
                scenes.append(scene_name)
                break
    return scenes


def _find_numbers(text: str) -> list[str]:
    """提取文本中带单位的数字描述（如"增长30%", "下降50%", "达到100万"）"""
    pattern = r"(增长|下降|达到|超过|减少|提升|降低|占比|增速|规模)(\d+[\.\d]*(?:万|亿|%|倍|人|元|美元|个|家|次)?)"
    return [m[0] + m[1] for m in re.findall(pattern, text)]


def _check_star_stories(text: str) -> list[dict]:
    """检查 STAR 故事常见问题"""
    risks: list[dict] = []

    # 检查是否有 STAR 结构
    has_situation = any(kw in text for kw in ["Situation", "情境", "背景", "当时"])
    has_task = any(kw in text for kw in ["Task", "任务", "目标", "需要"])
    has_action = any(kw in text for kw in ["Action", "行动", "做法", "方案", "实现"])
    has_result = any(kw in text for kw in ["Result", "结果", "成效", "成果", "产出"])

    missing = []
    if not has_situation:
        missing.append("Situation（情境）")
    if not has_task:
        missing.append("Task（任务）")
    if not has_action:
        missing.append("Action（行动）")
    if not has_result:
        missing.append("Result（结果）")

    if missing:
        risks.append({
            "description": "STAR 故事缺少: " + "、".join(missing),
            "severity": "high",
            "suggestion": "完整的 STAR 需要 S+T+A+R 四部分，建议补充缺失部分",
        })

    # 检查数字口径
    numbers = _find_numbers(text)
    if len(numbers) > 2:
        # 检查是否有口径说明
        has_dimension = any(kw in text for kw in ["基准", "口径", "统计范围", "周期",
                                                    "同比", "环比", "MoM", "YoY",
                                                    "QoQ", "日活", "月活"])
        if not has_dimension:
            risks.append({
                "description": f"有 {len(numbers)} 处数字可能缺少口径定义: {' '.join(numbers[:3])}",
                "severity": "medium",
                "suggestion": "每个数字需要说明统计口径（如基准、时间范围、数据来源）",
            })

    # 检查是否有具体的量化成果
    if not re.search(r"\d+[\.\d]*(%|万|亿|倍|人|元|美元|个|家|次)", text):
        risks.append({
            "description": "缺少具体的量化成果",
            "severity": "medium",
            "suggestion": "在 Result 中加入具体数字（如提升了多少、节省了多少）",
        })

    return risks


def _check_code_security(text: str) -> list[dict]:
    """检查代码安全常见问题"""
    risks: list[dict] = []

    if "service_role" in text or "supabaseAdmin" in text:
        risks.append({
            "description": "代码中使用了 Service Role Key，绕过了 RLS",
            "severity": "high",
            "suggestion": "改用普通客户端并依赖 RLS 策略进行行级安全控制",
        })

    if "process.env" in text and "||" in text:
        risks.append({
            "description": "环境变量有默认值回退（fallback），可能泄露敏感信息",
            "severity": "medium",
            "suggestion": "确认回退值仅用于开发环境，生产环境应使用强环境变量",
        })

    # 检查硬编码密钥嫌疑
    key_patterns = [
        r'["\'](sk-[a-zA-Z0-9]{20,})["\']',       # OpenAI / DeepSeek key
        r'["\'](sb_publishable_[a-zA-Z0-9_-]{20,})["\']',  # Supabase anon key
        r'["\'](eyJ[a-zA-Z0-9_-]+[=]{0,2})["\']',  # JWT token suspicion
    ]
    for pat in key_patterns:
        matches = re.findall(pat, text)
        if matches:
            risks.append({
                "description": "可能包含硬编码的密钥或 Token（长度 >=20）",
                "severity": "high",
                "suggestion": "将密钥移到环境变量或 .env 文件中，不要在代码中硬编码",
            })
            break

    return risks


def _check_report_quality(text: str) -> list[dict]:
    """检查研报/文档常见问题"""
    risks: list[dict] = []

    # 检查数据来源引用
    if re.search(r"\d+[\.\d]*(%|倍|亿|万)", text):
        has_source = any(kw in text for kw in ["来源", "数据源", "根据", "统计显示",
                                                "引自", "参考", "Coingecko", "Dune",
                                                "DefiLlama", "CoinMarketCap",
                                                "区块律动", "BlockBeats"])
        if not has_source:
            risks.append({
                "description": "研报中有数字但没有标注数据来源",
                "severity": "high",
                "suggestion": "为每个关键数字标注数据来源和截止时间",
            })

    # 检查是否只有一个数据点而没有对比
    if re.search(r"\d+[\.\d]*%", text):
        has_comparison = any(kw in text for kw in ["同比", "环比", "vs", "vs.",
                                                     "对比", "相较", "较", "之前",
                                                     "去年", "上月", "上周", "上季度"])
        if not has_comparison:
            risks.append({
                "description": "有百分比数据但没有对比基准（同比/环比）",
                "severity": "medium",
                "suggestion": "建议给出对比基准让读者判断趋势",
            })

    return risks


def _check_generic(text: str) -> list[dict]:
    """通用检查"""
    risks: list[dict] = []

    # 长度检查
    if len(text.strip()) < 30:
        risks.append({
            "description": "输入内容太短（< 30 字），可能不足以做出有效分析",
            "severity": "low",
            "suggestion": "输入更多上下文以获得更准确的建议",
        })

    return risks


# ── 公共 API ──────────────────────────────

def analyze_intent(user_intent: str,
                   context_content: str = "",
                   scan_summary: str = "") -> dict[str, Any]:
    """分析用户意图，生成主动建议。

    Args:
        user_intent: 用户表达的方向（如"帮我写研报""准备面试"）
        context_content: 用户当前正在编辑的内容（可选）
        scan_summary: 上次扫描结果的摘要文本（可选）

    Returns:
        {
            "insights": [...],      # 发现了什么
            "risks": [...],         # 需要提醒的问题
            "suggestions": [...],   # 建议下一步做什么
            "next_scan_target": ...,  # 建议扫描的目标文件名
        }
    """
    insights: list[str] = []
    risks: list[dict] = []
    suggestions: list[str] = []
    next_scan: str | None = None

    combined = user_intent + " " + context_content
    scenes = _match_scene(combined)

    # ── 场景分析 ──
    if "interview" in scenes:
        insights.append("你在准备面试，我可以帮你检查 STAR 故事的结构完整性和数据可靠性")
        star_risks = _check_star_stories(context_content if context_content else combined)
        risks.extend(star_risks)
        if not star_risks and context_content:
            suggestions.append("STAR 故事结构完整，建议进一步检查追问链是否有盲区")

    if "report" in scenes:
        insights.append("你在写分析报告，建议完成后扫一遍数据质量和逻辑完整性")
        report_risks = _check_report_quality(context_content if context_content else combined)
        risks.extend(report_risks)
        suggestions.append("建议用 LLM 深度扫描模式检查数据冲突和逻辑断层")

    if "code" in scenes:
        insights.append("在做开发，建议检查代码安全和环境配置")
        code_risks = _check_code_security(context_content if context_content else combined)
        risks.extend(code_risks)

    if "publish" in scenes:
        insights.append("你要发布内容，建议发布前做一次完整的质量检查")
        suggestions.append("发布前用 LLM 模式扫描全文，检查数据口径和逻辑链")

    # ── 通用检查 ──
    generic_risks = _check_generic(combined)
    risks.extend(generic_risks)

    # ── 扫描历史 ──
    if scan_summary and ("未修复" in scan_summary or "风险" in scan_summary):
        risks.append({
            "description": "上次扫描发现有未修复的问题",
            "severity": "high",
            "suggestion": "建议先修复已发现的问题再继续工作",
        })

    # ── 统计去重 ──
    seen_desc: set[str] = set()
    unique_risks = []
    for r in risks:
        if r["description"] not in seen_desc:
            seen_desc.add(r["description"])
            unique_risks.append(r)

    return {
        "insights": list(dict.fromkeys(insights)),
        "risks": unique_risks,
        "suggestions": list(dict.fromkeys(suggestions)),
        "next_scan_target": next_scan,
    }


def format_intent_output(result: dict[str, Any]) -> str:
    """把意图分析结果格式化为人类可读的文本"""
    parts = []

    if result["insights"]:
        parts.append("🔍 我发现：")
        for i in result["insights"]:
            parts.append(f"  • {i}")

    if result["risks"]:
        parts.append("\n⚠️ 需要关注：")
        for r in result["risks"]:
            severity_icon = {"high": "🔴", "medium": "🟡", "low": "⚪"}
            icon = severity_icon.get(r.get("severity", "low"), "⚪")
            parts.append(f"  {icon} [{r['severity'].upper()}] {r['description']}")
            parts.append(f"    建议: {r['suggestion']}")

    if result["suggestions"]:
        parts.append("\n💡 建议下一步：")
        for s in result["suggestions"]:
            parts.append(f"  • {s}")

    return "\n".join(parts)
