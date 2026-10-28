import importlib.util, tempfile, unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('packs',Path(__file__).with_name('android-content-pack.py'));packs=importlib.util.module_from_spec(spec);spec.loader.exec_module(packs)
class PackTests(unittest.TestCase):
    def test_complete_patch_and_immutable_baseline(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp); source=root/'source';(source/'assets').mkdir(parents=True);image=source/'assets/test.png';image.write_bytes(b'original');out=root/'out'
            self.assertEqual(packs.build(source,out,1116,True)['files'],[])
            with self.assertRaises(ValueError):packs.build(source,out,1116,True)
            image.write_bytes(b'new art');patch=packs.build(source,out,1116);entry=patch['files'][0]
            self.assertEqual((out/'blobs'/entry['sha256']).read_bytes(),b'new art')
            self.assertEqual(packs.build(source,out,1116),patch)
            image.write_bytes(b'original');self.assertEqual(packs.build(source,out,1116)['files'],[])
    def test_no_executable_or_traversal(self):
        for name in ['assets/run.js','assets/../image.png','assets/a.svg','file.png','assets/a.png?x=1']:
            self.assertFalse(packs.permitted(name))
if __name__=='__main__':unittest.main()
