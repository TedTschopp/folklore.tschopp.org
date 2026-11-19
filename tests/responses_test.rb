# frozen_string_literal: true
require_relative '../_code/indieweb'

class FolkloreResponsesTest
  def assert_equal(expected, actual)
    raise "Expected #{expected.inspect}; got #{actual.inspect}" unless expected == actual
  end
  def assert_nil(value)
    assert_equal(nil, value)
  end
  def assert_raises(type)
    begin
      yield
    rescue type
      return
    end
    raise "Expected #{type}"
  end
  def entry(url = 'https://folklore.tschopp.org/stories/the-heavy-child-jecklin/')
    { 'url' => url, 'aliases' => ['/stories/old-id/', 'https://tedt.org/folklore/stories/the-heavy-child-jecklin/', 'https://tedt.org/folklore/stories/old-id/'], 'outgoing' => false }
  end
  def manifest
    IndieWeb::Manifest.new('version' => 1, 'entries' => [entry])
  end
  def test_old_and_new_targets_share_the_published_canonical
    %w[http https].each do |scheme|
      %w[tedt.org www.tedt.org].each do |host|
        assert_equal entry['url'], manifest.canonical("#{scheme}://#{host}/folklore/stories/old-id/")
      end
      assert_equal entry['url'], manifest.canonical("#{scheme}://folklore.tschopp.org/stories/old-id/")
    end
    assert_equal entry['url'], manifest.canonical(entry['url'])
    assert_equal [], manifest.outgoing_entries
  end
  def test_unknown_hosts_and_conflicting_aliases_are_rejected
    assert_nil manifest.canonical('https://example.com/stories/old-id/')
    assert_nil manifest.canonical('https://tedt.org/profile/')
    assert_raises(IndieWeb::Error) { IndieWeb::Manifest.new('version' => 1, 'entries' => [entry('https://evil.example/story/')]) }
    assert_raises(IndieWeb::Error) { IndieWeb::Manifest.new('version' => 1, 'entries' => [entry, entry('https://folklore.tschopp.org/stories/the-heavy-child-kohlrusch/')]) }
  end
  def test_only_public_moderated_records_render_under_the_new_target
    policy = { 'trusted_origins' => ['https://reader.example'], 'approved_ids' => [], 'blocked_ids' => [] }
    raw = { 'wm-id' => 1, 'wm-private' => false, 'wm-target' => 'https://tedt.org/folklore/stories/old-id/', 'wm-source' => 'https://reader.example/reply', 'wm-property' => 'in-reply-to', 'content' => { 'text' => 'An approved public reply.' }, 'author' => { 'name' => 'Reader' } }
    normalizer = IndieWeb::Mentions.new(manifest, policy)
    result, pending = normalizer.normalize([raw, raw.merge('wm-id' => 2, 'wm-private' => true), raw.merge('wm-id' => 3, 'wm-source' => 'https://unknown.example/reply')])
    assert_equal ['1'], result['by_target'].fetch(entry['url']).fetch('replies').map { |v| v['id'] }
    assert_equal ['3'], pending
    assert_equal 'An approved public reply.', result['by_target'][entry['url']]['replies'][0]['content']
    assert_equal 'https://tedt.org/folklore/stories/old-id/', raw['wm-target']
  end
end

checks = FolkloreResponsesTest.new
checks.public_methods.grep(/^test_/).each { |name| checks.public_send(name) }
puts "Response identity and moderation checks passed (3 scenarios)."
