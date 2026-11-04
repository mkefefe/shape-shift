import hashlib
import json
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
    def test_audio_preparation_deadlines_and_failure_guards(self):
        result = subprocess.run(['node', '--test', str(Path(__file__).with_name('playgama-audio-deadlines.test.mjs'))], capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_normal_sdk_is_first_script_and_game_is_in_the_entry_document(self):
        root = Path(__file__).resolve().parent.parent
        source = (root/'game-frame.html').read_text(encoding='utf-8').replace('playables-bootstrap.js', 'playgama-bootstrap.js')
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
        self.assertEqual(frames, [])
        self.assertIn(('main', {'id': 'app', 'data-screen': 'home'}), parsed.tags)
        self.assertEqual(sum(attrs.get('id') == 'startup-ready' for _, attrs in parsed.tags), 1)
        cache_version = json.loads((root/'package.json').read_text(encoding='utf-8'))['version'].replace('.', '')
        self.assertEqual(scripts[-1], {'type': 'module', 'src': 'playgama-bootstrap.js?v=' + cache_version})
        self.assertLess(output.index('<meta charset="utf-8">'), 1024)
        self.assertNotIn('playgama-bridge-sdk', source)
        self.assertNotIn('shell-keyboard.js', output)
        # Injecting the SDK cannot discard or rewrite any of the actual game UI.
        self.assertEqual(output[output.index('<body>'):], source[source.index('<body>'):])

    def test_unknown_shell_cannot_silently_ship_an_ungated_game(self):
        with self.assertRaisesRegex(AssertionError, 'Expected the actual game document'):
            build_editions.playgama_index_html('<head><meta charset="utf-8"></head><iframe></iframe>', '')

    def test_browser_bootstrap_cannot_ship_as_a_portal_entry(self):
        root = Path(__file__).resolve().parent.parent
        with self.assertRaisesRegex(AssertionError, 'Expected one portal bootstrap'):
            build_editions.playgama_index_html((root/'game-frame.html').read_text(encoding='utf-8'), '')

    def test_shipped_host_loader_runtime_regressions(self):
        result = subprocess.run(['node', '--test', str(Path(__file__).with_name('playgama-host-loader.test.mjs'))], capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_portal_startup_render_runtime_regressions(self):
        result = subprocess.run(['node', '--test', str(Path(__file__).with_name('playgama-startup-render.test.mjs'))], capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_direct_entry_bootstrap_regressions(self):
        result = subprocess.run(['node', '--test', str(Path(__file__).with_name('playgama-entry.test.mjs'))], capture_output=True, text=True, timeout=30)
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
