#!/usr/bin/env ruby
# frozen_string_literal: true

require 'json'
require 'digest'
require 'nokogiri'
require 'pathname'
require 'rexml/document'
require 'uri'

site = Pathname.new(ARGV.fetch(0, '_site'))
root = Pathname.new(__dir__).parent
archive = JSON.parse(root.join('_data/folklore/archive.json').read)
guides = JSON.parse(root.join('_data/folklore/reader_guides.json').read)
discovery = JSON.parse(root.join('_data/folklore/discovery.json').read)
editorial_review = JSON.parse(root.join('docs/editorial-integrity-2026-11-20.json').read)
canonical_redirects = JSON.parse(root.join('_code/domain-router/canonical-redirects.json').read)
story_stubs = root.glob('folklore/stories/**/*.html').filter_map do |path|
  fields = path.read[/\A---\n(\{.*?\})\n---/m, 1]
  next unless fields

  story = JSON.parse(fields)
  [story.fetch('permalink'), story] if story['story_id']
end.to_h
sitemap_stories = archive.fetch('stories')
all_entries = sitemap_stories + archive.fetch('source_notes')
all_aliases = story_stubs.flat_map { |url, fields| fields.fetch('redirect_from', []).map { |old| [old, url] } }.to_h
abort 'Domain redirects differ from the published response aliases' unless canonical_redirects == all_aliases
editorial_review.fetch('title_corrections').each do |correction|
  entry = all_entries.find { |story| story.fetch('id') == correction.fetch('id') }
  abort 'A reviewed English title regressed' unless entry&.fetch('title') == correction.fetch('after')
end
origin = 'https://folklore.tschopp.org'
indieweb = JSON.parse(site.join('indieweb-manifest.json').read).fetch('entries').to_h { |entry| [entry.fetch('url'), entry] }
sitemap = REXML::Document.new(site.join('sitemap.xml').read)
sitemap_paths = REXML::XPath.match(sitemap, '//*[local-name()="loc"]').map { |node| URI(node.text).path }

def page(site, url)
  Nokogiri::HTML(site.join(url.delete_prefix('/'), 'index.html').read)
end

def published_english(article)
  references = {}
  paragraphs = article.css('#english p').each_with_index.map do |paragraph, index|
    text = +''
    paragraph.children.each do |child|
      if child['class'] == 'folklore-note-reference'
        link = child.at_css('a')
        references[link['id']] = [index, text.length, link['href']]
      else
        text << child.text
      end
    end
    text
  end
  [paragraphs, references]
end

published = sitemap_stories.map { |item| item.fetch('url') }
source_notes = archive.fetch('source_notes').map { |item| item.fetch('url') }
abort 'Folklore catalog contains duplicate URLs' unless (published + source_notes).uniq.size == published.size + source_notes.size
abort 'Reader guide coverage differs from the published catalog' unless guides.fetch('stories').keys.sort == sitemap_stories.map { |entry| entry.fetch('id') }.sort

all_entries.each do |entry|
  url = entry.fetch('url')
  id = entry.fetch('id')
  canonical = origin + url
  aliases = story_stubs.fetch(url).fetch('redirect_from', [])
  response_aliases = aliases + story_stubs.fetch(url).fetch('legacy_urls', [])
  unless archive.fetch('urls_by_id').fetch(id) == url && url.match?(%r{\A/stories/[a-z0-9-]+/\z}) && !url.include?(id)
    abort "Invalid title-based folklore URL at #{url}"
  end

  document = page(site, url)
  unless document.css('h1').size == 1 && document.at_css('h1').text.strip == entry.fetch('title')
    abort "Story heading differs from its English catalog title at #{url}"
  end
  source_records = story_stubs.fetch(url).dig('edition', 'source_records') || []
  rendered_sources = document.css('#story-sources > ul > li')
  abort "Source records missing or duplicated at #{url}" unless rendered_sources.size == source_records.size
  source_records.zip(rendered_sources).each do |record, rendered|
    links = rendered.css('a').map { |link| link['href'] }
    unless (record.fetch('urls') - links).empty? && record.fetch('notes').all? { |note| rendered.text.include?(note) }
      abort "Source links or annotations missing from shared page at #{url}"
    end
  end
  document.css('script[type="application/ld+json"]').each { |node| JSON.parse(node.text) }
  endpoint = document.at_css('link[rel="webmention"]')&.[]('href')
  form = document.at_css('#webmentions-section form')
  discussion = document.at_css('#discussion a[rel~="external"]')
  unless document.at_css('link[rel="canonical"]')&.[]('href') == canonical &&
         document.at_css('.folklore-discussion-links a[href="#discussion"]') &&
         document.at_css('.folklore-discussion-links a[href="#webmentions-section"]') &&
         discussion && endpoint && form&.[]('action') == endpoint &&
         form.at_css('input[name="target"]')&.[]('value') == canonical
    abort "Missing canonical discussion or Webmention controls at #{url}"
  end
  unless indieweb.fetch(canonical).values_at('aliases', 'outgoing') == [response_aliases, false]
    abort "Missing response routing for #{url}"
  end
  aliases.each do |alias_url|
    redirect = page(site, alias_url)
    unless redirect.at_css('link[rel="canonical"]')&.[]('href') == canonical &&
           redirect.at_css('meta[http-equiv="refresh"]')&.[]('content') == "0; url=#{canonical}" &&
           redirect.at_css('link[rel="webmention"]')&.[]('href') == endpoint &&
           !sitemap_paths.include?(alias_url) && !redirect.at_css('[data-pagefind-body]')
      abort "Incorrect story redirect from #{alias_url}"
    end
  end
end

indexes = {
  'places' => page(site, '/locations/'),
  'themes' => page(site, '/themes/')
}
discovery_groups = %w[topics tags places regions].flat_map { |key| discovery.fetch(key) }.to_h { |group| [group.fetch('url'), group.fetch('story_ids')] }

sitemap_stories.each do |entry|
  story_id = entry.fetch('id')
  url = entry.fetch('url')
  document = page(site, url)
  article = document.at_css('[data-pagefind-body]')
  unless article&.at_css('#english p') && article.at_css('#original [lang] p') &&
         document.at_css('.content-credit-translation-editor') && sitemap_paths.count(url) == 1
    abort "Missing bilingual text, credits, or canonical sitemap entry at #{url}"
  end

  guide = guides.fetch('stories').fetch(entry.fetch('id'))
  notes = guide.fetch('notes')
  editorial_review.fetch('preserved_note_ids').fetch(story_id, []).each do |old_note|
    current = notes.find { |note| note.fetch('id', note.fetch('number')) == old_note.fetch('id') }
    unless current && current.fetch('label') == old_note.fetch('label') && Digest::SHA256.hexdigest(current.fetch('text')) == old_note.fetch('text_sha256')
      abort "An existing reader-note bookmark changed meaning at #{url}"
    end
  end
  english, references = published_english(article)
  edition = story_stubs.fetch(url).fetch('edition')
  if context = guide['reading_context']
    rendered = article.at_css('aside[aria-label="Reading context"]')
    unless rendered&.at_css('p')&.text == context.fetch('text') &&
           rendered.css('a').map { |link| [link.text, link['href']] } == context.fetch('stories').map { |story| story.values_at('title', 'url') } &&
           context.fetch('stories').all? { |story| story_stubs.key?(story.fetch('url')) }
      abort "Missing or incorrect companion story context at #{url}"
    end
  end
  %w[heading_correction opening_correction].each do |kind|
    next unless correction = edition[kind]

    reviewed = editorial_review.fetch(kind == 'heading_correction' ? 'heading_corrections' : 'opening_corrections').find { |row| row.fetch('public_page_id') == story_id }
    unless reviewed && correction.values_at('before', 'after') == reviewed.values_at('before', 'after') && english.first == reviewed.fetch('after')
      abort "Unreviewed editorial change at #{url}"
    end
  end
  unless english == edition.fetch('english_paragraphs')
    abort "Reader notes changed the approved English text at #{url}"
  end
  unless article.css('#original [lang] p').map(&:text) == edition.fetch('original_paragraphs')
    abort "Reader notes changed the approved original text at #{url}"
  end
  summary = article.at_css('.folklore-story-summary')
  valid_summary = guide['summary_kind'] == 'opening' ? summary.nil? : summary&.text == guide.fetch('summary')
  unless notes.any? && article.css('#reader-notes ol > li').size == notes.size && valid_summary
    abort "Missing reader notes or incorrect story introduction at #{url}"
  end
  sections = article.css('.folklore-reading-nav, #english, #reader-notes, #original, #story-context')
                    .map { |node| node['id'] || 'reading-nav' }
  nav = article.at_css('.folklore-reading-nav')
  unless sections == %w[reading-nav english reader-notes original story-context] &&
         nav.css('a').map { |link| link['href'] } == %w[#english #reader-notes #original]
    abort "Reading navigation and story context overlap at #{url}"
  end
  notes.each do |note|
    number = note.fetch('number')
    note_id = note.fetch('id', number)
    body = article.at_css("#reader-note-#{note_id}")
    abort "Reader note text differs from its approved explanation at #{url}" unless body&.at_css('p')&.text == note.fetch('text')
    next unless note['anchor']

    reference = "reader-note-ref-#{note_id}"
    expected = [note.fetch('paragraph'), note.fetch('offset'), "#reader-note-#{note_id}"]
    unless references.delete(reference) == expected && body&.at_css("a[href='##{reference}']")
      abort "Invalid reader note #{number} reference or return link at #{url}"
    end
  end
  abort "Unexpected reader note reference at #{url}" unless references.empty?
  indexes.each do |field, index|
    guide.fetch(field).each do |entry|
      target = index.at_css("##{entry.fetch('url').split('#').last}")
      mapping = discovery.fetch(field == 'places' ? 'place_links' : 'theme_links')
      destination = mapping.fetch(entry.fetch('url'))
      unless target && target['data-legacy-target'] == destination && discovery_groups.fetch(destination).include?(story_id)
        abort "Missing #{field} index mapping or membership at #{url}"
      end
    end
  end
end

source_notes.each do |url|
  document = page(site, url)
  if document.at_css('[data-pagefind-body], #english, #original, #reader-notes, .folklore-story-text') ||
     sitemap_paths.include?(url) || !document.at_css('meta[name="robots"]')&.[]('content')&.include?('noindex')
    abort "Source note exposes story text or appears in discovery at #{url}"
  end
end

index = JSON.parse(site.join('pagefind/pagefind-entry.json').read)
index_count = index.fetch('languages').values.sum { |language| language.fetch('page_count') }
abort "Pagefind indexed #{index_count} stories, expected #{published.size}" unless index_count == published.size
search = page(site, '/search/').at_css('pagefind-config')
unless search&.[]('base-url') == '/' && search['bundle-path'] == '/pagefind/'
  abort 'Folklore search must resolve story results from the site root'
end
archive_pages = archive.fetch('page_count').times.map { |i| i.zero? ? '/stories/' : "/page/#{i + 1}/" }
browse_links = archive_pages.flat_map do |url|
  listing = page(site, url)
  links = listing.css('.folklore-catalog h3 a').map { |link| link['href'] }
  abort "Folklore browse page exceeds page size at #{url}" if links.size > archive.fetch('page_size')
  links
end
abort 'Bilingual stories and archive browse links differ' unless published == browse_links

# Check the rendered result pages independently of their generated data.
# These are bounded static pages, so all stories remain reachable without JS.
root.glob('folklore/discovery-pages/*.html').each do |path|
  fields = JSON.parse(path.read[/\A---\n(\{.*?\})\n---/m, 1])
  listing = page(site, fields.fetch('permalink'))
  expected_links = fields.fetch('story_ids').map { |id| discovery.fetch('stories').fetch(id).fetch('url') }
  actual_links = listing.css('.folklore-catalog h3 a').map { |link| link['href'] }
  unless actual_links == expected_links && actual_links.size <= discovery.fetch('page_size') &&
         listing.css('h1').size == 1 && listing.at_css('h1').text == fields.fetch('title')
    abort "Incorrect or unbounded discovery listing at #{fields.fetch('permalink')}"
  end
  listing.css('a[rel=next], a[rel=prev]').each do |link|
    abort "Missing discovery pagination target #{link['href']}" unless site.join(link['href'].delete_prefix('/'), 'index.html').file?
  end
end
abort 'Discovery exposes held source notes' unless discovery.fetch('stories').keys.sort == guides.fetch('stories').keys.sort

reader_note_count = guides.fetch('stories').values.sum { |guide| guide.fetch('notes').size }
puts "Folklore archive OK (#{published.size} bilingual pages, #{reader_note_count} reader notes, #{source_notes.size} source notes, #{index_count} indexed)"
