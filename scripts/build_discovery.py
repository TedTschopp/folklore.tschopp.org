#!/usr/bin/env python3
"""Build reader navigation from approved public exports. Never edits those exports."""
from collections import defaultdict
from copy import deepcopy
import hashlib
import json
import math
from pathlib import Path
import re
import unicodedata
from urllib.parse import urlencode

ROOT = Path(__file__).resolve().parents[1]
PAGE_SIZE = 24
GENERATOR = 'build_discovery.py/v1'


def read(path):
    return json.loads(path.read_text())


def save(path, data):
    text = json.dumps(data, ensure_ascii=False, indent=2) + '\n'
    write(path, text)


def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists() or path.read_text() != text:
        path.write_text(text)


def slug(text):
    return re.sub(r'[^a-z0-9]+', '-', unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode().lower()).strip('-')


def opening(paragraphs, title):
    """Skip title-only and short location headings; retain narrative wording."""
    for paragraph in paragraphs:
        paragraph = ' '.join(paragraph.split())
        if paragraph.casefold().rstrip('.') == title.casefold().rstrip('.') or len(paragraph.split()) < 8:
            continue
        if len(paragraph) <= 235:
            return paragraph
        first = re.split(r'(?<=[.!?])\s+', paragraph)[0]
        if len(first) <= 260:
            return first
        return paragraph[:235].rsplit(' ', 1)[0].rstrip(',;:') + '…'
    return 'Read this short telling in English, alongside its original text and reader notes.'


def build(root=ROOT):
    archive_path = root / '_data/folklore/archive.json'
    guide_path = root / '_data/folklore/reader_guides.json'
    editorial_path = root / '_data/folklore/discovery_editorial.json'
    archive, guides, editorial = map(read, (archive_path, guide_path, editorial_path))
    approved = {row['id']: row for row in archive['stories']}
    by_url = {row['url']: row['id'] for row in archive['stories']}
    assert len(by_url) == len(approved)
    editions = {}
    for path in (root / 'folklore/stories').rglob('*.html'):
        front = re.match(r'\A---\n(.*?)\n---(?:\n|$)', path.read_text(), re.S)
        if not front or not front[1].lstrip().startswith('{'):
            continue
        page = json.loads(front[1])
        if page.get('story_id') in approved:
            assert page['permalink'] == approved[page['story_id']]['url']
            editions[page['story_id']] = page['edition']
    assert set(editions) == set(approved) == set(guides['stories'])
    all_tags = {row['label'] for row in guides['themes']}
    configured = {tag for row in editorial['topics'] for tag in row['tags']}
    assert not configured - all_tags, f'Unknown editorial tags: {configured - all_tags}'
    summaries = {row['url']: row['summary'] for row in editorial['starters']}
    assert set(summaries) <= set(by_url), 'A suggested story is not published'
    region_aliases = {alias: row['slug'] for row in editorial['regions'] for alias in row['aliases']}
    region_by_key = {row['slug']: row for row in editorial['regions']}
    stories = {}
    for sid, row in approved.items():
        guide, edition = guides['stories'][sid], editions[sid]
        text = '\n'.join(edition['english_paragraphs'])
        words = len(re.findall(r"[^\W_]+(?:[’'-][^\W_]+)*", text, re.UNICODE))
        minutes = max(1, math.ceil(words / 200))
        tags = [item['label'] for item in guide['themes']]
        places = list(dict.fromkeys(editorial['place_aliases'].get(item['label'], item['label']) for item in guide['places']))
        regions = list(dict.fromkeys(region_aliases[name] for name in places if name in region_aliases))
        topic_ids = [topic['slug'] for topic in editorial['topics'] if set(tags) & set(topic['tags'])]
        length = 'Under 2 minutes' if words < 400 else '2–5 minutes' if words <= 1000 else 'Over 5 minutes'
        summary = summaries.get(row['url']) or (guide['summary'] if guide.get('summary_kind') != 'opening' else None) or opening(edition['english_paragraphs'], row['title'])
        stories[sid] = {**row, 'summary': summary, 'word_count': words, 'minutes': minutes, 'reading_label': 'Under 1 min' if words < 200 else f'About {minutes} min', 'length': length, 'tags': tags, 'places': places, 'regions': regions, 'region_labels': [region_by_key[key]['label'] for key in regions], 'topics': topic_ids}

    order = list(approved)
    def ordered(ids):
        wanted = set(ids)
        return [sid for sid in order if sid in wanted]

    topics = []
    for topic in editorial['topics']:
        members = [sid for sid in order if topic['slug'] in stories[sid]['topics']]
        topics.append({**topic, 'url': f"/themes/{topic['slug']}/", 'count': len(members), 'story_ids': members})
    assert len({topic['slug'] for topic in topics}) == len(topics)
    theme_links, place_links = {}, {}
    tags = []
    for tag in guides['themes']:
        url = f"/themes/{tag['id'].removeprefix('theme-')}/"
        members = ordered(by_url[item['url']] for item in tag['stories'])
        old_url = f"/themes/#{tag['id']}"
        theme_links[old_url] = url
        tags.append({'label': tag['label'], 'id': tag['id'], 'slug': tag['id'].removeprefix('theme-'), 'url': url, 'count': len(members), 'story_ids': members})
    assert not {t['url'] for t in tags} & {t['url'] for t in topics}, 'Topic routes collide with detailed labels'

    places_by_name = {}
    for place in guides['places']:
        label = editorial['place_aliases'].get(place['label'], place['label'])
        key = region_aliases.get(label, slug(label))
        url = f'/locations/{key}/'
        place_links[f"/locations/#{place['id']}"] = url
        entry = places_by_name.setdefault(label, {'label': label, 'slug': key, 'url': url, 'legacy_ids': [], 'story_ids': []})
        entry['legacy_ids'].append(place['id'])
        entry['story_ids'] += [by_url[item['url']] for item in place['stories']]
    places = []
    for label, place in sorted(places_by_name.items(), key=lambda p: p[0].casefold()):
        place['story_ids'] = ordered(place['story_ids'])
        place['count'] = len(place['story_ids'])
        place['search_terms'] = ' '.join([label, *region_by_key.get(place['slug'], {}).get('aliases', [])])
        places.append(place)
    assert len({p['url'] for p in places}) == len(places), 'Place routes collide'
    regions = []
    for region in editorial['regions']:
        members = [sid for sid in order if region['slug'] in stories[sid]['regions']]
        if not members:
            continue
        named = [dict(label=p['label'], url=p['url'], count=len(set(p['story_ids']) & set(members))) for p in places if p['label'] not in region_aliases and set(p['story_ids']) & set(members)]
        regions.append({**region, 'url': f"/locations/{region['slug']}/", 'count': len(members), 'story_ids': members, 'named_places': named})

    # Related links use recorded topics/places, never a guessed place or new source.
    pools = defaultdict(set)
    for sid, story in stories.items():
        for topic in story['topics']:
            if topic != 'village-legends':
                pools['topic:' + topic].add(sid)
        for place in story['places']:
            if place != 'Across Switzerland':
                pools['place:' + place].add(sid)
    for sid, story in stories.items():
        keys = ['topic:' + t for t in story['topics'] if t != 'village-legends'] + ['place:' + p for p in story['places'] if p != 'Across Switzerland']
        candidates = set().union(*(pools[k] for k in keys)) if keys else set()
        candidates.discard(sid)
        def score(other):
            s = stories[other]
            specific = set(story['tags']) & set(s['tags']) - {'Local memory', 'Storytelling and belief'}
            return (-len(specific) * 5 - len(set(story['places']) & set(s['places'])) * 2, abs(story['minutes'] - s['minutes']), s['title'].casefold(), other)
        story['related'] = sorted(candidates, key=score)[:3]

    glossary = []
    for term in editorial['glossary']:
        matches = [(sid, note) for sid, guide in guides['stories'].items() for note in guide['notes'] if note['label'].casefold() == term['note_label'].casefold()]
        assert matches, f'Missing glossary evidence: {term["term"]}'
        sid, note = matches[0]
        glossary.append({**term, 'example_url': stories[sid]['url'] + f"#reader-note-{note['number']}", 'example_title': stories[sid]['title'], 'id': slug(term['term'])})
    data = {'generator': GENERATOR, 'source_release': archive['release'], 'story_count': len(stories), 'page_size': PAGE_SIZE, 'topics': topics, 'regions': regions, 'places': places, 'tags': tags, 'theme_links': theme_links, 'place_links': place_links, 'stories': stories, 'starters': [by_url[row['url']] for row in editorial['starters']], 'glossary': glossary, 'lengths': ['Under 2 minutes', '2–5 minutes', 'Over 5 minutes']}
    save(root / '_data/folklore/discovery.json', data)

    directory = root / 'folklore/discovery-pages'
    manifest_path = directory / '.generated-pages.json'
    previous = read(manifest_path) if manifest_path.exists() else []
    generated, routes = [], set()
    def listing(kind, group, parent_url, parent_label, description):
        ids = group['story_ids']
        page_count = max(1, math.ceil(len(ids) / PAGE_SIZE))
        for index in range(page_count):
            url = group['url'] if not index else group['url'] + f'page/{index + 1}/'
            assert url not in routes, f'Duplicate generated route: {url}'
            routes.add(url)
            filename = f"{kind}-{group['slug']}-{index + 1}.html"
            fields = {'layout': 'folklore-listing', 'title': group['label'], 'description': description, 'permalink': url, 'listing_kind': kind, 'parent_url': parent_url, 'parent_label': parent_label, 'story_ids': ids[index * PAGE_SIZE:(index + 1) * PAGE_SIZE], 'result_count': len(ids), 'listing_page': index + 1, 'listing_pages': page_count, 'listing_root': group['url'], 'generated_by': GENERATOR, 'noindex': index > 0 or kind == 'tag', 'sitemap': index == 0 and kind != 'tag'}
            params = {'topic': group['label']} if kind == 'topic' else {'region': group['label']} if kind == 'region' else {'place': group['label']} if kind == 'place' else {'tag': group['label']}
            fields['search_url'] = '/search/?' + urlencode(params)
            if kind == 'region':
                fields['named_places'] = group['named_places']
            write(directory / filename, '---\n' + json.dumps(fields, ensure_ascii=False, indent=2) + '\n---\n')
            generated.append(filename)
    for topic in topics:
        listing('topic', topic, '/themes/', 'Topics', topic['description'])
    for tag in tags:
        listing('tag', tag, '/research/', 'Detailed topic index', f"Tales carrying the recorded topic label “{tag['label']}”.")
    region_urls = {region['url'] for region in regions}
    for place in places:
        if place['url'] not in region_urls:
            listing('place', place, '/locations/', 'Places', f"Tales in which {place['label']} is named or recorded as a setting.")
    for region in regions:
        listing('region', region, '/locations/', 'Places', f"Explore the tales associated with {region['label']}. Each story has its own source and reader notes.")
    shorts = {'slug': 'short-tales', 'label': 'Short tales', 'url': '/short-tales/', 'story_ids': [sid for sid in order if stories[sid]['word_count'] <= 1000]}
    listing('short', shorts, '/', 'Start here', 'A few minutes among the tales: each of these can be read in about five minutes or less. Estimates cover the English story, with extra time for notes.')
    for filename in set(previous) - set(generated):
        path = directory / filename
        assert path.parent == directory and re.fullmatch(r'[a-z0-9-]+\.html', filename)
        if path.exists() and f'"generated_by": "{GENERATOR}"' in path.read_text():
            path.unlink()
    save(manifest_path, generated)
    summary = {'story_count': len(stories), 'topics': len(topics), 'regions': len(regions), 'named_place_groups': len(places), 'detailed_tags': len(tags), 'generated_listing_pages': len(generated), 'source_release': archive['release'], 'source_sha256': {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest() for p in (archive_path, guide_path, editorial_path)}}
    save(root / 'docs/discovery-build.json', summary)
    print(json.dumps(summary, indent=2))
    return data


if __name__ == '__main__':
    build()
