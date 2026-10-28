"""Build media-only patches against an immutable APK baseline, then publish through Pages.

First release: --baseline captures checksums of the actual staged APK assets.
Later packs: omit --baseline; only media at existing paths may be replaced.
Every manifest is a complete patch against that baseline, not a delta from an earlier pack.
"""
import argparse, hashlib, json, re
from pathlib import Path

def digest(data): return hashlib.sha256(data).hexdigest()
def permitted(name):
    return name.startswith('assets/') and '..' not in name and re.fullmatch(r'[A-Za-z0-9_./-]+\.(png|webp|jpg|jpeg|gif|wav|ogg|mp3|ttf|woff|woff2)', name)

def build(source, destination, code, baseline=False):
    source, destination = Path(source), Path(destination)
    folder=destination/str(code); folder.mkdir(parents=True,exist_ok=True)
    baseline_file=folder/'baseline.json'
    media={p.relative_to(source).as_posix():p for p in (source/'assets').rglob('*') if p.is_file() and permitted(p.relative_to(source).as_posix())}
    current={name:{'sha256':digest(p.read_bytes()),'size':p.stat().st_size} for name,p in media.items()}
    if baseline:
        if baseline_file.exists(): raise ValueError('Never overwrite a shipped baseline; use a new app version code.')
        baseline_file.write_text(json.dumps(current,sort_keys=True),encoding='utf-8')
    original=json.loads(baseline_file.read_text(encoding='utf-8'))
    files=[]
    for name,old in sorted(original.items()):
        if name not in current: raise ValueError('Existing APK asset removed: '+name)
        info=current[name]
        if info==old: continue
        if info['size']>32*1024*1024: raise ValueError('Asset exceeds download limit: '+name)
        blob=destination/'blobs'/info['sha256'];blob.parent.mkdir(parents=True,exist_ok=True)
        blob.write_bytes(media[name].read_bytes()); files.append({'path':name,**info})
    if len(files)>1500 or sum(f['size'] for f in files)>150*1024*1024:raise ValueError('Pack exceeds limits')
    manifest={'schema':1,'appVersionCode':int(code),'files':files}
    pending=folder/'manifest.json.tmp';pending.write_text(json.dumps(manifest,separators=(',',':')),encoding='utf-8');pending.replace(folder/'manifest.json')
    return manifest

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--source',required=True);parser.add_argument('--output',default='android-assets');parser.add_argument('--code',type=int,required=True);parser.add_argument('--baseline',action='store_true');args=parser.parse_args()
    pack=build(args.source,args.output,args.code,args.baseline);print(f"Prepared {len(pack['files'])} verified asset replacements for Android {args.code}")
