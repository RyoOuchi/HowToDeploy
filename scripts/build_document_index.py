#!/usr/bin/env python3
"""Rebuild the static document list and full-text search index in index.html."""

import json
import re
from html import escape
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
SKIP_DIRS = {"assets", "node_modules", "vendor", "scripts"}


class DocumentParser(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.title = []
        self.heading = []
        self.body = []
        self.main = []
        self.header_meta = []
        self.description = ""
        self.keywords = ""
        self.stack = []
        self.feed(source)

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if tag == "meta":
            if attrs.get("name") == "description":
                self.description = attrs.get("content", "")
            if attrs.get("name") == "keywords":
                self.keywords = attrs.get("content", "")
        if tag not in {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}:
            self.stack.append((tag, attrs))

    def handle_startendtag(self, tag, attributes):
        self.handle_starttag(tag, attributes)
        self.handle_endtag(tag)

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index][0] == tag:
                self.stack = self.stack[:index]
                break

    def handle_data(self, data):
        tags = {tag for tag, _ in self.stack}
        if tags & {"script", "style", "noscript", "template"}:
            return
        if "title" in tags:
            self.title.append(data)
        if "h1" in tags:
            self.heading.append(data)
        if "body" in tags:
            self.body.append(data)
        if "main" in tags:
            self.main.append(data)
        if any("header-meta" in attrs.get("class", "").split() for _, attrs in self.stack):
            self.header_meta.append(data)


def clean(parts):
    return re.sub(r"\s+", " ", " ".join(parts)).strip()


def collect_documents():
    documents = []
    for path in sorted(ROOT.rglob("*.html")):
        relative = path.relative_to(ROOT)
        if path == ROOT / "index.html" or any(part.startswith(".") or part in SKIP_DIRS for part in relative.parts):
            continue
        parsed = DocumentParser(path.read_text(encoding="utf-8"))
        title = re.sub(r"\s+", " ", "".join(parsed.heading or parsed.title)).strip()
        if not title:
            continue
        tags = [tag.strip() for tag in re.split(r"[,、×]", parsed.keywords or clean(parsed.header_meta)) if tag.strip()]
        documents.append({
            "id": f"document-{len(documents) + 1}",
            "url": quote(relative.as_posix(), safe="/"),
            "title": title,
            "description": parsed.description or clean(parsed.main or parsed.body)[:140],
            "tags": list(dict.fromkeys(tags)),
            "text": clean(parsed.main or parsed.body),
        })
    return documents


def render_document(document, number):
    identifier = document["id"]
    title, url, description = (escape(document[key], quote=True) for key in ("title", "url", "description"))
    tags = "".join(f"<li>{escape(tag)}</li>" for tag in document["tags"])
    tag_list = f'<ul class="document-tags" aria-label="キーワード">{tags}</ul>' if tags else ""
    return f'''        <article id="{identifier}" class="document-row" aria-labelledby="{identifier}-title">
          <span class="document-number" aria-hidden="true">{number:02d}</span>
          <div class="document-content">
            <h3 id="{identifier}-title" class="document-heading"><a href="{url}">{title}</a></h3>
            <p class="document-description">{description}</p>
            {tag_list}
            <p class="search-excerpt" hidden></p>
          </div>
          <a class="document-open" href="{url}" aria-label="{title}を読む"><span aria-hidden="true">→</span></a>
        </article>'''


def replace_block(source, marker, content):
    pattern = rf"(<!-- {marker}:START -->).*?(<!-- {marker}:END -->)"
    result, replacements = re.subn(pattern, lambda match: f"{match[1]}\n{content}\n      {match[2]}", source, flags=re.DOTALL)
    if replacements != 1:
        raise ValueError(f"Expected one {marker} block in index.html")
    return result


def main():
    documents = collect_documents()
    entry = ROOT / "index.html"
    source = entry.read_text(encoding="utf-8")
    source = replace_block(source, "DOCUMENTS", "\n".join(render_document(document, number) for number, document in enumerate(documents, 1)))
    # Escape '<' so document text can never terminate the JSON script element.
    data = json.dumps(documents, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
    source = replace_block(source, "SEARCH-INDEX", f'  <script id="document-index" type="application/json">{data}</script>')
    source = re.sub(r'(<p id="result-count"[^>]*>).*?(</p>)', lambda match: f"{match[1]}{len(documents)} 件{match[2]}", source)
    entry.write_text(source, encoding="utf-8")
    print(f"Indexed {len(documents)} document(s):")
    for document in documents:
        print(f"  {document['url']} — {document['title']}")


if __name__ == "__main__":
    main()
