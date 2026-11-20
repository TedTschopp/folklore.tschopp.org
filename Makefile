.PHONY: build check
build:
	python3 scripts/build_discovery.py
	JEKYLL_ENV=production bundle exec jekyll build
	npm run build:search
	python3 scripts/site_analytics.py _site --mode standard
	python3 scripts/site_analytics.py _site --mode standard --check
	bundle exec ruby tests/check_folklore_archive.rb _site
check: build
	bundle exec ruby tests/responses_test.rb
	npm test
