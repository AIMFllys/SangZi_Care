from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
import fnmatch
from pathlib import Path
import json


PROJECT_ROOT = Path(__file__).resolve().parent.parent

INCLUDE_SUFFIXES = {
    ".py",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".vue",
    ".java",
    ".kt",
    ".kts",
    ".go",
    ".rs",
    ".php",
    ".cs",
    ".c",
    ".cpp",
    ".cc",
    ".h",
    ".hpp",
    ".swift",
}

TOTAL_INCLUDE_SUFFIXES = INCLUDE_SUFFIXES | {
    ".md",
}

BUSINESS_EXCLUDE_DIR_NAMES = {
    ".git",
    ".next",
    ".nuxt",
    ".svelte-kit",
    "node_modules",
    "dist",
    "build",
    "out",
    "coverage",
    "docs",
    "doc",
    "venv",
    ".venv",
    "__pycache__",
    "generated",
    "vendor",
    "third_party",
}

BUSINESS_EXCLUDE_DIR_PARTS = {
    "__tests__",
    "__mocks__",
    "test",
    "tests",
    "spec",
    "fixtures",
    "examples",
    "example",
    "demo",
    "demos",
}

TOTAL_EXCLUDE_DIR_NAMES = {
    ".git",
    ".agent",
    "__pycache__",
}

TOTAL_EXCLUDE_DIR_PARTS: set[str] = set()

EXCLUDE_FILE_SUFFIXES = (
    ".min.js",
    ".min.css",
    ".bundle.js",
)

EXCLUDE_FILE_PARTS: tuple[str, ...] = ()


@dataclass(frozen=True)
class GitignoreRule:
    pattern: str
    negated: bool
    directory_only: bool
    anchored: bool
    has_slash: bool

    def matches(self, relative_path: Path) -> bool:
        path_parts = relative_path.parts
        file_target = relative_path.as_posix()
        dir_targets = ["/".join(path_parts[:index]) for index in range(1, len(path_parts))]
        targets = dir_targets if self.directory_only else [file_target, *dir_targets]

        for target in targets:
            if self._matches_target(target):
                return True
        return False

    def _matches_target(self, target: str) -> bool:
        if not self.has_slash:
            return any(fnmatch.fnmatchcase(part, self.pattern) for part in target.split("/"))

        candidates = [target] if self.anchored else self._suffix_candidates(target)
        return any(fnmatch.fnmatchcase(candidate, self.pattern) for candidate in candidates)

    @staticmethod
    def _suffix_candidates(target: str) -> list[str]:
        parts = target.split("/")
        return ["/".join(parts[index:]) for index in range(len(parts))]


def should_skip_dir(path: Path, exclude_dir_names: set[str], exclude_dir_parts: set[str]) -> bool:
    lower_parts = {part.lower() for part in path.parts}
    return bool(lower_parts & exclude_dir_names) or bool(lower_parts & exclude_dir_parts)


def should_include_file(path: Path, include_suffixes: set[str]) -> bool:
    lower_name = path.name.lower()
    lower_suffix = path.suffix.lower()
    if lower_suffix not in include_suffixes:
        return False
    if any(lower_name.endswith(suffix) for suffix in EXCLUDE_FILE_SUFFIXES):
        return False
    if any(part in lower_name for part in EXCLUDE_FILE_PARTS):
        return False
    return True


def count_lines(path: Path) -> int:
    data = path.read_bytes()
    if not data:
        return 0
    line_breaks = data.count(b"\n")
    return line_breaks if data.endswith(b"\n") else line_breaks + 1


def load_gitignore_rules(root: Path) -> list[GitignoreRule]:
    gitignore_path = root / ".gitignore"
    if not gitignore_path.exists():
        return []

    rules: list[GitignoreRule] = []
    for raw_line in gitignore_path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue

        negated = line.startswith("!")
        if negated:
            line = line[1:]
        line = line.replace("\\", "/")

        directory_only = line.endswith("/")
        if directory_only:
            line = line[:-1]

        anchored = line.startswith("/")
        if anchored:
            line = line[1:]

        if not line:
            continue

        rules.append(
            GitignoreRule(
                pattern=line,
                negated=negated,
                directory_only=directory_only,
                anchored=anchored,
                has_slash="/" in line,
            )
        )
    return rules


def get_gitignored_paths(root: Path, files: list[Path]) -> set[Path]:
    rules = load_gitignore_rules(root)
    if not rules:
        return set()

    ignored: set[Path] = set()
    for file_path in files:
        relative_path = file_path.relative_to(root)
        is_ignored = False
        for rule in rules:
            if rule.matches(relative_path):
                is_ignored = not rule.negated
        if is_ignored:
            ignored.add(file_path)
    return ignored


def iter_source_files(
    root: Path,
    include_suffixes: set[str],
    exclude_dir_names: set[str],
    exclude_dir_parts: set[str],
):
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if should_skip_dir(path.parent.relative_to(root), exclude_dir_names, exclude_dir_parts):
            continue
        if should_include_file(path, include_suffixes):
            yield path


def build_stats(
    root: Path,
    include_suffixes: set[str],
    exclude_dir_names: set[str],
    exclude_dir_parts: set[str],
    apply_gitignore: bool,
) -> dict:
    total_files = 0
    total_lines = 0
    by_extension: Counter[str] = Counter()
    lines_by_extension: Counter[str] = Counter()
    source_files = list(iter_source_files(root, include_suffixes, exclude_dir_names, exclude_dir_parts))
    ignored_files = get_gitignored_paths(root, source_files) if apply_gitignore else set()

    for file_path in source_files:
        if file_path in ignored_files:
            continue
        lines = count_lines(file_path)
        suffix = file_path.suffix.lower()
        total_files += 1
        total_lines += lines
        by_extension[suffix] += 1
        lines_by_extension[suffix] += lines

    return {
        "summary": {
            "files": total_files,
            "lines": total_lines,
        },
        "by_extension": [
            {
                "extension": extension,
                "files": by_extension[extension],
                "lines": lines_by_extension[extension],
            }
            for extension in sorted(lines_by_extension, key=lambda item: (-lines_by_extension[item], item))
        ],
    }


def main() -> None:
    result = {
        "project_root": str(PROJECT_ROOT),
        "counting_rule": {
            "business_include_suffixes": sorted(INCLUDE_SUFFIXES),
            "total_include_suffixes": sorted(TOTAL_INCLUDE_SUFFIXES),
            "exclude_file_suffixes": sorted(EXCLUDE_FILE_SUFFIXES),
            "exclude_file_parts": sorted(EXCLUDE_FILE_PARTS),
            "line_counting": "count bytes b'\\n'; if file does not end with newline, add 1",
            "business_code": {
                "exclude_dir_names": sorted(BUSINESS_EXCLUDE_DIR_NAMES),
                "exclude_dir_parts": sorted(BUSINESS_EXCLUDE_DIR_PARTS),
            },
            "total_code": {
                "exclude_dir_names": sorted(TOTAL_EXCLUDE_DIR_NAMES),
                "exclude_dir_parts": sorted(TOTAL_EXCLUDE_DIR_PARTS),
                "apply_gitignore": True,
                "note": "includes dependency paths such as node_modules or venv if source files match include_suffixes, but excludes paths matched by .gitignore",
            },
        },
        "business_code": build_stats(PROJECT_ROOT, INCLUDE_SUFFIXES, BUSINESS_EXCLUDE_DIR_NAMES, BUSINESS_EXCLUDE_DIR_PARTS, False),
        "total_code": build_stats(PROJECT_ROOT, TOTAL_INCLUDE_SUFFIXES, TOTAL_EXCLUDE_DIR_NAMES, TOTAL_EXCLUDE_DIR_PARTS, True),
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
