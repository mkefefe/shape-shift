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

def playgama_index_html(shell, host):
    # Preserve the established shell/game-frame separation used by release 220.
    # Bridge belongs to the shell; the owned child awaits that same connection.
    # Withhold its URL until SDK initialization, and retain the real preload
    # barrier in the child before game_ready. Do not alter platform policy.
    sdk = '<script id="playgama-bridge-sdk" src="https://bridge.playgama.com/v2/stable/playgama-bridge.js"></script>'
    marker = '<head><meta charset="utf-8">'
    assert shell.count(marker) == 1, 'Unexpected shell document head'
    assert shell.count('<iframe src="game-frame.html') == 1, 'Expected one owned game frame'
    assert 'playables-bootstrap.js' not in shell and 'playgama-bootstrap.js' not in shell, 'Bootstrap belongs in the game frame'
    shell = shell.replace('<iframe src="game-frame.html', '<iframe data-playgama-src="game-frame.html', 1)
    return shell.replace(marker, marker + sdk + '<script id="playgama-host-loader">' + host + '</script>', 1)


def playgama_game_source(source):
    """Bound only the portal's initial render handoffs, after asset readiness."""
    start = source.index('async function prepareStartup(){')
    end = source.index('\nprepareStartup();', start)
    startup = source[start:end]
    frame_wait = 'await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));'
    first_reveal = 'await firstGate.reveal(()=>{update();timer();openingCoach?.paint();});'
    assert startup.count(frame_wait) == 1, 'Unexpected startup frame barrier'
    assert startup.count(first_reveal) == 1, 'Unexpected first-journey reveal barrier'
    startup = startup.replace(frame_wait, 'await waitForPortalStartupPaint();', 1)
    # Keep the existing firstGate input lock and its finally/dispose cleanup.
    # Only replace its startup reveal wait; later mode transitions stay intact.
    startup = startup.replace(first_reveal, 'await waitForPortalStartupPaint(()=>{update();timer();openingCoach?.paint();});', 1)
    return "import {waitForPortalStartupPaint} from './playgama-startup-render.mjs';\n" + source[:start] + startup + source[end:]

def playgama_audio_source(source, name):
    # Portal startup downloads the complete audio set before game_ready. The
    # former 12s request / 30s aggregate deadlines reject healthy downloads on
    # a reproduced 10 Mbps connection. Keep failures bounded and retryable while
    # allowing the complete preparation to finish; never substitute success.
    replacements = {
        'audio.js': [
            ('()=>controller.abort(),12000', '()=>controller.abort(),60000'),
            ('window.setTimeout(()=>resolve(false),30000)', 'window.setTimeout(()=>resolve(false),120000)'),
        ],
        'adaptive-music.js': [('setTimeout(()=>finish(false),12000)', 'setTimeout(()=>finish(false),60000)')],
    }
    for before, after in replacements[name]:
        assert source.count(before) == 1, f'Unexpected audio readiness deadline: {name}'
        source = source.replace(before, after, 1)
    return source


def playgama_battle_source(source, name):
    if name == 'battle-menu.js':
        marker = "frame.allow='autoplay';frame.onerror"
        assert source.count(marker) == 1, 'Unexpected Battle frame creation'
        direct = "frame.allow='autoplay';const preparingFrame=frame;frame.onload=async()=>{try{const ok=await prepareOwnedBattleFrame(preparingFrame,configuration(),location.origin);if(frame===preparingFrame)preparation.complete(ok);}catch{if(frame===preparingFrame)preparation.complete(false);}};frame.onerror"
        source = source.replace(marker, direct, 1)
        # Set the destination before mounting: appending an empty iframe may
        # synchronously fire load for about:blank, before its real navigation.
        source, count = re.subn(r"dialog\.replaceChildren\(frame\);(frame\.src='battle/index\.html[^']*';)", r"\1dialog.replaceChildren(frame);", source)
        assert count == 1, 'Unexpected Battle frame navigation'
        return "import {prepareOwnedBattleFrame} from './playgama-battle-preload.mjs';\n" + source
    assert name == 'battle/app.mjs'
    marker = "send('ready');"
    assert source.count(marker) == 1, 'Unexpected Battle runtime handshake'
    return source.replace(marker, "window.ShapeShiftBattlePreparation=Object.freeze({prepare(settings){applyBattleSettings(settings);return prepareBattle();}});\n" + marker, 1)


def verify_shared_stage(root, site):
    """Reject stale source overlays before an edition can copy the shared stage."""
    if not site.is_dir():
        raise RuntimeError('Shared browser stage is missing. Run build-site.py before build-editions.py.')
    for line in read(root/'web-fix.sha256').splitlines():
        expected, name = line.split('  ', 1)
        source = root/name
        if not source.is_file() or digest(source) != expected:
            raise RuntimeError(f'Source manifest mismatch: {name}. Refresh web-fix.sha256, then run build-site.py before build-editions.py.')
        relative = Path(name)
        # build-site.py intentionally removes tests from these two runtime folders.
        if relative.parent in (Path('.'), Path('battle')) and relative.match('*.test.*'):
            continue
        staged = site/name
        if not staged.is_file() or digest(staged) != expected:
            raise RuntimeError(f'Shared browser stage is stale: {name}. Run build-site.py before build-editions.py.')

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
    verify_shared_stage(ROOT, site)
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
    write(portal/'index.html',playgama_index_html(read(site/'index.html'),host))
    write(portal/'telemetry-config.js',f"export const TELEMETRY_BUILD='{version}';\nexport const TELEMETRY_DISTRIBUTION='playgama';\n")
    # Bridge owns pause/resume on this portal (including ads); preserve that contract.
    for name in ('game.js','piano-flow.js','shape-drop.js','shape-slice.js'):
        text=read(site/name)
        for event in ('visibilitychange','androidpause','androidresume'):
            text=text.replace("'"+event+"'","'unused-"+event+"'")
        if name=='game.js':
            text=playgama_game_source(text)
            needle='if(animateRewards)startResultRewards();'
            assert text.count(needle)==1
            text=text.replace(needle,needle+'\n  void window.ShapeShiftPlatform.runComplete();')
        write(portal/name,text)
    for name in ('audio.js', 'adaptive-music.js'):
        write(portal/name, playgama_audio_source(read(site/name), name))
    for name in ('battle-menu.js', 'battle/app.mjs'):
        write(portal/name, playgama_battle_source(read(site/name), name))
    # Hide a genuinely unavailable portal player ID instead of showing an empty row.
    with (portal/'playables.css').open('a',encoding='utf-8') as file:
        file.write('\n#profile-dialog #player-id-row[hidden]{display:none!important;}\n')
    for dest in (mobile,portal):
        catalog(dest)

    adapted={'index.html','game-frame.html','telemetry-config.js','startup-assets.js','game.js','piano-flow.js','shape-drop.js','shape-slice.js','playables.css','rewarded.js','audio.js','adaptive-music.js','battle-menu.js','battle/app.mjs'}
    for name in ('audio.js', 'adaptive-music.js','battle-menu.js','battle/app.mjs'):
        assert digest(mobile/name) == digest(site/name), f'Native audio drift: {name}'
    shared={p.relative_to(site).as_posix():digest(p) for p in site.rglob('*')
        if p.is_file() and not p.is_relative_to(site/'android-assets') and p.relative_to(site).as_posix() not in adapted}
    for name,expected in shared.items():
        for dest in (mobile,portal):
            assert digest(dest/name)==expected, f'{dest.name} drift: {name}'
    required=json.loads(read(ROOT/'release-content.json'))
    for track in required['recordings']+required['piano'].get('rhythmSamples',[]):
        for dest in (site,mobile,portal):
            assert digest(dest/track['file'])==track['sha256'], f'Audio missing or changed: {track["file"]} in {dest}'
    receipt={'version':version,'android_version_code':args.android_version_code,'shared_files_verified':len(shared),'recordings':required['recordings'],'rhythm_samples':required['piano'].get('rhythmSamples',[]),
        'shared_sha256':shared,'editions':{}}
    for name,dest in [('github',site),('android',mobile),('playgama',portal)]:
        receipt['editions'][name]={p.relative_to(dest).as_posix():digest(p) for p in dest.rglob('*')
            if p.is_file() and (p.parent==dest or p.is_relative_to(dest/'assets') or p.is_relative_to(dest/'battle'))
            and p.suffix.lower() in MEDIA|{'.js','.mjs','.css','.html','.json','.webmanifest'} and '.test.' not in p.name}
    write(output/'release-verification.json',json.dumps(receipt,indent=2)+'\n')
    print(f'Built {version}: {len(shared)} shared files match across all three editions; every manifest recording verified.')

if __name__=='__main__':main()
