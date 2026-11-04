import hashlib
import importlib.util
from pathlib import Path
import tempfile
import unittest


spec = importlib.util.spec_from_file_location('build_editions', Path(__file__).with_name('build-editions.py'))
build_editions = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build_editions)


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
