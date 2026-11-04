import hashlib
from html.parser import HTMLParser
import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest


spec = importlib.util.spec_from_file_location('build_editions', Path(__file__).with_name('build-editions.py'))
build_editions = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build_editions)


class PortalStartupTests(unittest.TestCase):
    def test_normal_sdk_is_first_script_and_iframe_has_no_fetchable_source(self):
        root = Path(__file__).resolve().parent.parent
        source = (root/'index.html').read_text(encoding='utf-8')
        output = build_editions.playgama_index_html(source, 'window.hostLoaderStarted=true;')
        class Tags(HTMLParser):
            def __init__(self):
                super().__init__()
                self.tags = []
            def handle_starttag(self, tag, attrs):
                self.tags.append((tag, dict(attrs)))
        parsed = Tags()
        parsed.feed(output)
        scripts = [attrs for tag, attrs in parsed.tags if tag == 'script']
        self.assertEqual(scripts[0], {'id':'playgama-bridge-sdk', 'src':'https://bridge.playgama.com/v2/stable/playgama-bridge.js'})
        self.assertEqual(scripts[1]['id'], 'playgama-host-loader')
        self.assertEqual(sum('playgama-bridge.js' in attrs.get('src', '') for attrs in scripts), 1)
        frames = [attrs for tag, attrs in parsed.tags if tag == 'iframe']
        self.assertEqual(len(frames), 1)
        self.assertNotIn('src', frames[0])
        self.assertEqual(frames[0]['data-playgama-src'], 'game-frame.html?v=494240')
        self.assertLess(output.index('<meta charset="utf-8">'), 1024)
        self.assertNotIn('data-playgama-src', source)

    def test_unknown_shell_cannot_silently_ship_an_ungated_game(self):
        with self.assertRaisesRegex(AssertionError, 'Expected one deferred game iframe'):
            build_editions.playgama_index_html('<head><meta charset="utf-8"></head><iframe></iframe>', '')

    def test_shipped_host_loader_runtime_regressions(self):
        result = subprocess.run(['node', '--test', str(Path(__file__).with_name('playgama-host-loader.test.mjs'))], capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


class SharedStageTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.addCleanup(self.folder.cleanup)
        self.root = Path(self.folder.name)
        self.site = self.root/'_site'
        self.site.mkdir()
        self.sources = {
            'privacy-content.js': b'current privacy loader',
            'battle/readiness.mjs': b'current battle readiness',
            'support-report.test.mjs': b'test intentionally excluded from shipping',
            'battle/readiness.test.mjs': b'test intentionally excluded from shipping',
        }
        for name, data in self.sources.items():
            source = self.root/name
            source.parent.mkdir(parents=True, exist_ok=True)
            source.write_bytes(data)
            if '.test.' not in name:
                staged = self.site/name
                staged.parent.mkdir(parents=True, exist_ok=True)
                staged.write_bytes(data)
        (self.root/'web-fix.sha256').write_text(''.join(
            hashlib.sha256(data).hexdigest()+'  '+name+'\n'
            for name, data in self.sources.items()), encoding='utf-8')

    def test_verified_stage_accepts_intentionally_excluded_tests(self):
        build_editions.verify_shared_stage(self.root, self.site)

    def test_stale_stage_is_rejected_even_when_source_manifest_matches(self):
        (self.site/'privacy-content.js').write_bytes(b'previous privacy loader')
        with self.assertRaisesRegex(RuntimeError, r'stage is stale: privacy-content.js.*Run build-site.py'):
            build_editions.verify_shared_stage(self.root, self.site)

    def test_missing_required_staged_module_is_rejected(self):
        (self.site/'battle/readiness.mjs').unlink()
        with self.assertRaisesRegex(RuntimeError, r'stage is stale: battle/readiness.mjs.*Run build-site.py'):
            build_editions.verify_shared_stage(self.root, self.site)

    def test_source_drift_is_rejected_even_when_stage_matches_manifest(self):
        (self.root/'privacy-content.js').write_bytes(b'new unsynchronized source')
        with self.assertRaisesRegex(RuntimeError, r'Source manifest mismatch: privacy-content.js'):
            build_editions.verify_shared_stage(self.root, self.site)

    def test_excluded_test_sources_still_require_matching_manifest(self):
        (self.root/'support-report.test.mjs').write_bytes(b'new unsynchronized test')
        with self.assertRaisesRegex(RuntimeError, r'Source manifest mismatch: support-report.test.mjs'):
            build_editions.verify_shared_stage(self.root, self.site)


if __name__ == '__main__':
    unittest.main()
