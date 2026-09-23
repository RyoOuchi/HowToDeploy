# How to Deploy

A collection of published documentation. The root `index.html` lists the documents and searches their titles, descriptions, keywords, and full text. The design shares the Lightning Page's base stylesheet.

## Add or update a document

1. Add the published HTML page and its assets to a folder in this repository.
2. Include a descriptive `<h1>` and `<meta name="description">`. Optionally add `<meta name="keywords" content="keyword, another keyword">` for the tags shown in the listing.
3. Run `python3 scripts/build_document_index.py` from the repository root.
4. Commit the document and updated `index.html` along with your other changes, then publish through the existing GitHub Pages setup.

The script discovers HTML pages recursively, excluding the homepage, hidden directories, and asset/tool directories. It rebuilds both the HTML listing and the embedded search index. Regenerate the index whenever a document is added, edited, or removed.

Search runs entirely in the browser, with no server or API dependency. Links are relative, so the site works under the GitHub Pages `/HowToDeploy/` path. Without JavaScript, the complete document list remains available.

## Local preview

Run `python3 -m http.server 4173`, then open `http://localhost:4173/`.
