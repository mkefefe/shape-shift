from pathlib import Path
import hashlib, io, shutil, zipfile
root=Path(__file__).resolve().parent.parent
bundle=b''.join((root/f'game.zip.part{i:02}').read_bytes() for i in range(3))
assert hashlib.sha256(bundle).hexdigest()=='72b1e734f6818851c4f513157e608d74171c2145d5b9e960ee66366da3f90376', 'Base bundle checksum mismatch'
site=root/'_site'
zipfile.ZipFile(io.BytesIO(bundle)).extractall(site)
for line in (root/'web-fix.sha256').read_text().splitlines():
    digest,name=line.split('  ',1)
    source=root/name
    assert hashlib.sha256(source.read_bytes()).hexdigest()==digest, f'Checksum mismatch: {name}'
    target=site/name
    target.parent.mkdir(parents=True,exist_ok=True)
    shutil.copy2(source,target)
(site/'.nojekyll').touch()
print('Built verified browser release in',site)
