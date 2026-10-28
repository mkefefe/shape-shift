from pathlib import Path
import hashlib, io, shutil, zipfile, json
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
manifest=json.loads((site/'startup-assets.js').read_text(encoding='utf-8').split('export const STARTUP_ASSETS=',1)[1].rstrip().removesuffix(';'))
media={p.relative_to(site).as_posix() for p in site.rglob('*') if p.is_file() and (p.is_relative_to(site/'assets') or p.parent==site) and p.suffix.lower() in {'.webp','.png','.jpg','.jpeg','.svg','.gif','.ogg','.wav','.mp3','.ttf','.woff','.woff2'}}
assert set(manifest)==media, f'Startup asset coverage mismatch: missing {media-set(manifest)}, stale {set(manifest)-media}'
(site/'.nojekyll').touch()
print('Built verified browser release in',site)

# Android media packs have independent compatibility manifests; never add them to web preloads.
if (root/"android-assets").exists():
    shutil.copytree(root/"android-assets",site/"android-assets",dirs_exist_ok=True,ignore=shutil.ignore_patterns("baseline.json"))
