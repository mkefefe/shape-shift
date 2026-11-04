"""Build every edition from the verified shared game, with explicit host adapters.

No edition may reuse a selectively patched archive. Runtime, art and audio always
come from _site; only startup/storage/advertising integration differs by host.
"""
from pathlib import Path
import argparse, hashlib, json, re, shutil

ROOT = Path(__file__).resolve().parent.parent
MEDIA = {'.webp','.png','.jpg','.jpeg','.svg','.gif','.ogg','.wav','.mp3','.ttf','.woff','.woff2'}

def read(path):
    return path.read_text(encoding='utf-8-sig')

def write(path, text):
    path.write_text(text, encoding='utf-8', newline='\n')

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def catalog(root):
    names = sorted(p.relative_to(root).as_posix() for p in root.rglob('*')
        if p.is_file() and (p.is_relative_to(root/'assets') or p.parent == root) and p.suffix.lower() in MEDIA)
    write(root/'startup-assets.js','export const STARTUP_ASSETS='+json.dumps(names,separators=(',',':'))+';\n')

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--android-base',type=Path,required=True)
    parser.add_argument('--android-version-code',type=int,required=True)
    parser.add_argument('--output-root',type=Path,required=True)
    args=parser.parse_args()
    site=ROOT/'_site'
    assert site.is_dir(), 'Run build-site.py first'
    version=json.loads(read(ROOT/'package.json'))['version']
    output=args.output_root.resolve()
    output.mkdir(parents=True,exist_ok=True)
    mobile=output/'android'
    portal=output/'playgama'
    # Keep native wrapper and original art for the existing fail-closed asset audit.
    shutil.copytree(args.android_base,mobile,dirs_exist_ok=True,
        ignore=shutil.ignore_patterns('.git','.gradle','__pycache__','outputs','*.log','*.test.*','server.*'))
    for dest in (mobile,portal):
        shutil.copytree(site,dest,dirs_exist_ok=True,ignore=shutil.ignore_patterns('android-assets'))
    for name in ('android','playgama'):
        for source in (ROOT/'platforms'/name).iterdir():
            if source.name=='host-loader.js':continue
            shutil.copy2(source,output/name/source.name)

    frame=read(site/'game-frame.html')
    native=frame.replace('playables-bootstrap.js','android-bootstrap.js')
    native=re.sub(r'<link[^>]+href="playables\.css[^>]+>','',native)
    native=native.replace('browser-cursor.css','mobile-parity.css')
    assert 'first-minute.css' in native and 'android-bootstrap.js' in native
    write(mobile/'index.html',native)
    # Native boot is the same frame, so fixes cannot be lost in a duplicate HTML copy.
    write(mobile/'game-frame.html',native)
    gradle=read(mobile/'android/build.gradle')
    gradle=re.sub(r'versionCode\s+\d+',f'versionCode {args.android_version_code}',gradle)
    gradle=re.sub(r"versionName\s+'[^']+'",f"versionName '{version}'",gradle)
    gradle=gradle.replace("file('../../../work/android-build')","file('../../android-build')")
    write(mobile/'android/build.gradle',gradle)
    write(mobile/'telemetry-config.js',f"export const TELEMETRY_BUILD='{version}';\nexport const TELEMETRY_DISTRIBUTION='android';\n")
    portal_frame=frame.replace('playables-bootstrap.js','playgama-bootstrap.js')
    portal_frame=portal_frame.replace('</head>',f'<link rel="stylesheet" href="feature-visibility.css?v={version.replace(".", "")}"></head>')
    write(portal/'game-frame.html',portal_frame)
    host=read(ROOT/'platforms/playgama/host-loader.js')
    write(portal/'index.html',read(site/'index.html').replace('</head>','<script id="playgama-host-loader">'+host+'</script></head>'))
    write(portal/'telemetry-config.js',f"export const TELEMETRY_BUILD='{version}';\nexport const TELEMETRY_DISTRIBUTION='playgama';\n")
    # Bridge owns pause/resume on this portal (including ads); preserve that contract.
    for name in ('game.js','piano-flow.js','shape-drop.js','shape-slice.js'):
        text=read(site/name)
        for event in ('visibilitychange','androidpause','androidresume'):
            text=text.replace("'"+event+"'","'unused-"+event+"'")
        if name=='game.js':
            needle='if(animateRewards)startResultRewards();'
            assert text.count(needle)==1
            text=text.replace(needle,needle+'\n  void window.ShapeShiftPlatform.runComplete();')
        write(portal/name,text)
    # Hide a genuinely unavailable portal player ID instead of showing an empty row.
    with (portal/'playables.css').open('a',encoding='utf-8') as file:
        file.write('\n#profile-dialog #player-id-row[hidden]{display:none!important;}\n')
    for dest in (mobile,portal):
        catalog(dest)

    adapted={'index.html','game-frame.html','telemetry-config.js','startup-assets.js','game.js','piano-flow.js','shape-drop.js','shape-slice.js','playables.css','rewarded.js'}
    shared={p.relative_to(site).as_posix():digest(p) for p in site.rglob('*')
        if p.is_file() and not p.is_relative_to(site/'android-assets') and p.relative_to(site).as_posix() not in adapted}
    for name,expected in shared.items():
        for dest in (mobile,portal):
            assert digest(dest/name)==expected, f'{dest.name} drift: {name}'
    required=json.loads(read(ROOT/'release-content.json'))
    for track in required['recordings']:
        for dest in (site,mobile,portal):
            assert digest(dest/track['file'])==track['sha256'], f'Approved audio missing or changed: {track["mode"]} in {dest}'
    receipt={'version':version,'android_version_code':args.android_version_code,'shared_files_verified':len(shared),'recordings':required['recordings'],
        'shared_sha256':shared,'editions':{}}
    for name,dest in [('github',site),('android',mobile),('playgama',portal)]:
        receipt['editions'][name]={p.relative_to(dest).as_posix():digest(p) for p in dest.rglob('*')
            if p.is_file() and (p.parent==dest or p.is_relative_to(dest/'assets') or p.is_relative_to(dest/'battle'))
            and p.suffix.lower() in MEDIA|{'.js','.mjs','.css','.html','.json','.webmanifest'} and '.test.' not in p.name}
    write(output/'release-verification.json',json.dumps(receipt,indent=2)+'\n')
    print(f'Built {version}: {len(shared)} shared files match across all three editions; every manifest recording verified.')

if __name__=='__main__':main()
