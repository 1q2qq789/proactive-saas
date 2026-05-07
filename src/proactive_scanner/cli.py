#!/usr/bin/env python3
"""
proactive-scanner CLI — 命令行入口

Usage:
    echo "content to scan" | proactive-scan [--mode keyword|llm]
    proactive-scan [--mode llm] --file path/to/file.md
    proactive-scan [--mode llm] --file path/to/file.md --context path/to/existing.md
    proactive-scan --intent --intent-text "我在准备面试" --file star.md
"""

import argparse
import json
import sys
import os

from .scanner import scan_content, scan_content_json
from .intent_engine import analyze_intent, format_intent_output


def main() -> None:
    parser = argparse.ArgumentParser(
        description="proactive-scanner — AI-powered content quality scanner",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            "  echo 'content to scan' | proactive-scan\n"
            "  proactive-scan --file doc.md\n"
            "  proactive-scan --mode llm --file doc.md\n"
            "  proactive-scan --mode llm --file new.md --context existing.md\n"
            "  proactive-scan --intent\n"
            "  proactive-scan --intent --intent-text \"准备面试\" --file star.md\n"
        ),
    )
    parser.add_argument(
        "--mode",
        choices=["keyword", "llm"],
        default="keyword",
        help="Scan mode: keyword (fast/free) or llm (DeepSeek semantic)",
    )
    parser.add_argument(
        "--file",
        help="File to scan (reads from stdin if not provided)",
    )
    parser.add_argument(
        "--context",
        help="Existing content file path for comparison scanning",
    )
    parser.add_argument(
        "--stdin",
        action="store_true",
        help="Read content from stdin (for API usage)",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output structured JSON instead of Markdown report",
    )
    parser.add_argument(
        "--checklists",
        help="Custom checklists directory path (default: bundled checklists)",
    )
    parser.add_argument(
        "--version",
        action="store_true",
        help="Show version and exit",
    )
    # ── Intent Analysis (new in v0.2.0) ──
    parser.add_argument(
        "--intent",
        action="store_true",
        help="Run intent analysis instead of content scanning",
    )
    parser.add_argument(
        "--intent-text",
        help="User intent description (e.g. '准备面试', '写研报', '开发代码')",
    )
    args = parser.parse_args()

    if args.version:
        from . import __version__
        print(f"proactive-scanner v{__version__}")
        sys.exit(0)

    # ── Intent Analysis Mode ──
    if args.intent:
        user_intent = args.intent_text or ""
        context_content = ""

        # Read from file if provided
        if args.file:
            with open(args.file, "r", encoding="utf-8") as f:
                context_content = f.read()
        elif not sys.stdin.isatty():
            context_content = sys.stdin.read()

        # If no explicit intent, derive from context
        if not user_intent and context_content:
            user_intent = context_content.strip()[:100]

        result = analyze_intent(
            user_intent=user_intent,
            context_content=context_content,
        )

        if args.json:
            print(json.dumps(result, ensure_ascii=False, indent=2))
        else:
            print(format_intent_output(result))
        sys.exit(0)

    # ── Standard Scan Mode ──
    # Read content
    if args.file:
        with open(args.file, "r", encoding="utf-8") as f:
            content = f.read()
    elif args.stdin or not sys.stdin.isatty():
        content = sys.stdin.read()
    else:
        print("No input provided. Use --file or pipe content via stdin.")
        print()
        parser.print_help()
        sys.exit(1)

    # Read context if provided
    context_content = None
    if args.context:
        with open(args.context, "r", encoding="utf-8") as f:
            context_content = f.read()

    # Run scan
    if args.json:
        result = scan_content_json(
            content,
            mode=args.mode,
            context_content=context_content,
        )
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        report = scan_content(
            content,
            mode=args.mode,
            context_content=context_content,
        )
        print(report)


if __name__ == "__main__":
    main()
