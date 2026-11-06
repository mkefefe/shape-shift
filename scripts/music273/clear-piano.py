"""Full-resolution sampled piano with SFZ tuning and a less competing old lead.

The original arrangement's notes, bass, drums, harmony, tempo and form are kept.
Only the old lead level is lowered 10 dB to give the new piano melody space.
No generated audio model or installed VST is used: lossless acoustic recordings
are played through a deterministic sampler with the source SFZ's root tuning.
"""
from pathlib import Path
from fractions import Fraction
import importlib.util,json,math,re,hashlib,subprocess
import numpy as np,soundfile as sf
from scipy.signal import resample_poly,butter,sosfilt,fftconvolve
import urllib.request,concurrent.futures

ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('melodies',ROOT/'scripts/music272/piano-melodies.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);c=m.c
OUT=ROOT/'outputs/music273';OUT.mkdir(parents=True,exist_ok=True)
INSTRUMENT=ROOT/'outputs/piano-instrument273'
def prepare_instrument():
 manifest=json.loads((Path(__file__).parent/'instrument-manifest.json').read_text())
 def fetch(item):
  path=INSTRUMENT/item['file'];path.parent.mkdir(parents=True,exist_ok=True)
  if not path.exists():path.write_bytes(urllib.request.urlopen(item['url'],timeout=60).read())
  assert hashlib.sha256(path.read_bytes()).hexdigest()==item['sha256'],f"Instrument source mismatch: {item['file']}"
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(fetch,manifest))
prepare_instrument()
TUNE={int(i):int(v) for i,v in re.findall(r'\$TUNE(\d+) (-?\d+)',(INSTRUMENT/'Data/tune_ret.txt').read_text())}
OFFSETS={v:{int(i):int(n) for i,n in re.findall(r'\$OFF(\d+) (\d+)',(INSTRUMENT/f'Data/vel_{v:02}.txt').read_text())} for v in [8,9]}
NAMES={63:'D#4',66:'F#4',69:'A4',72:'C5',75:'D#5',78:'F#5',81:'A5'}
SAMPLE_CACHE={};VOICE_CACHE={}

def piano_note(pitch,duration,accent):
 layer=9 if accent else 8;key=(pitch,round(duration,5),layer)
 if key in VOICE_CACHE:return VOICE_CACHE[key]
 root=min(NAMES,key=lambda k:abs(k-pitch));assert abs(root-pitch)<=1
 index=(root-21)//3+1
 if (root,layer) not in SAMPLE_CACHE:
  raw,rate=sf.read(INSTRUMENT/f'Samples/{NAMES[root]}v{layer}.flac',always_2d=True)
  # Align the recorded hammer onset using the library's own sample offsets.
  raw=raw[max(0,OFFSETS[layer][index]-96):]
  SAMPLE_CACHE[root,layer]=(raw,rate)
 raw,rate=SAMPLE_CACHE[root,layer];ratio=2**((pitch-root+TUNE[index]/100)/12)
 fraction=Fraction(c.SR/(rate*ratio)).limit_denominator(4096)
 count=round(duration*c.SR)
 raw=raw[:min(len(raw),math.ceil(count*rate*ratio/c.SR)+128)]
 a=resample_poly(raw,fraction.numerator,fraction.denominator,axis=0,window=('kaiser',9))[:count].copy()
 if len(a)<count:a=np.pad(a,((0,count-len(a)),(0,0)))
 attack=min(round(.0015*c.SR),len(a));a[:attack]*=np.linspace(0,1,attack)[:,None]
 release=min(round(.09*c.SR),len(a)//3);a[-release:]*=np.linspace(1,0,release)[:,None]**1.6
 # Keep the acoustic stereo detail, narrowed around a stable central attack.
 mid=a.mean(axis=1);a=mid[:,None]+(a-mid[:,None])*.3
 VOICE_CACHE[key]=a;return a

def stereo_room(audio,wet):
 count=round(.48*c.SR);time=np.arange(count)/c.SR;result=audio.copy();send=audio.mean(axis=1)
 for channel,seed in enumerate([913,1847]):
  ir=np.random.default_rng(seed).standard_normal(count)*np.exp(-time*12)
  ir=sosfilt(butter(2,[240,6200],fs=c.SR,btype='bandpass',output='sos'),ir);ir[:round(.013*c.SR)]=0
  ir/=max(1e-9,float(np.sqrt(np.sum(ir*ir))));tail=fftconvolve(send,ir,mode='full')*(wet*3.2)
  result[:,channel]+=tail[:len(audio)];result[:len(tail)-len(audio),channel]+=tail[len(audio):]
 return result

def background(mode,frames):
 # These are the exact panned 239 event scores, saved with this renderer.
 score=json.loads((Path(__file__).parent/'scores'/f'{mode}-score.json').read_text())
 beat=60/score['bpm'];buses={k:np.zeros((frames,2)) for k in ['melody','harmony','bass','drums']}
 for e in score['events']:
  a=c.drum(e['instrument']) if e['bus']=='drums' else c.sound(e['instrument'],e['pitch'],e['durationBeats']*beat)
  energy=10**(1.5/20) if e['bus']=='bass' else (10**(4.5/20) if e['instrument'] in ['kick','snare','rim'] else (10**(1/20) if e['instrument'] in ['hat','open','shaker'] else (10**(2.5/20) if e['instrument']=='tom' else 1)))
  a=a*e['gain']*energy;start=round(e['beat']*beat*c.SR)%frames;pan=e.get('pan',0);n=min(len(a),frames);head=min(n,frames-start)
  for channel,gain in enumerate([math.sqrt((1-pan)/2),math.sqrt((1+pan)/2)]):
   buses[e['bus']][start:start+head,channel]+=a[:head]*gain
   if head<n:buses[e['bus']][:n-head,channel]+=a[head:n]*gain
 buses['melody']=stereo_room(buses['melody'],.085)*10**(-10/20)
 buses['harmony']=stereo_room(buses['harmony'],.12)
 bed=sosfilt(butter(2,28,fs=c.SR,btype='highpass',output='sos'),sum(buses.values()),axis=0)
 bed-=bed.mean(axis=0);bed=np.tanh(bed*.95)/.95
 return bed,score

def render(mode,phrases):
 name={'drop':'shape-drop','slice':'shape-slice'}.get(mode,mode)
 original=ROOT/'_site'/(f'battle/assets/battle-239.ogg' if mode=='battle' else f'assets/music/{name}-239.ogg')
 old,sr=sf.read(original,always_2d=True);n=len(old);bed,score=background(mode,n)
 original_rms=np.sqrt(np.mean(old*old));bed*=original_rms/np.sqrt(np.mean(bed*bed))
 beat=60/score['bpm'];piano=np.zeros_like(bed);events=[]
 for bar in range(32):
  phrase='B' if 16<=bar<24 else 'A'
  for pos,pitch,length in c.measure(phrases[phrase][bar%8]):
   at=bar*4+pos;duration=length*beat*.97;accent=pos==0 or pos==2
   note=piano_note(pitch,duration,accent);start=round(at*beat*sr);count=min(len(note),n-start)
   piano[start:start+count]+=note[:count]*(1 if accent else .92)
   events.append(dict(beat=at,pitch=pitch,durationSeconds=duration,velocityLayer=9 if accent else 8))
 piano*=original_rms*10**(-3/20)/np.sqrt(np.mean(piano*piano))
 full=bed+piano;full-=full.mean(axis=0);gain=min(original_rms/np.sqrt(np.mean(full*full)),.86/np.max(np.abs(full)));full*=gain
 edge=round(.003*sr);full[-edge:]+=np.linspace(0,1,edge)[:,None]*(full[0]-full[-1])
 wav=OUT/f'{name}.wav';sf.write(wav,full,sr,subtype='PCM_24')
 solo=OUT/f'{name}-piano-only.wav';sf.write(solo,piano*gain,sr,subtype='PCM_24')
 target=ROOT/(f'battle/assets/battle-273.ogg' if mode=='battle' else f'assets/music/{name}-273.ogg');target.parent.mkdir(parents=True,exist_ok=True)
 subprocess.run([c.FF,'-hide_banner','-loglevel','error','-y','-i',str(wav),'-c:a','libvorbis','-q:a','6',str(target)],check=True)
 for label,source in [('mix',wav),('piano-only',solo)]:
  tempo=108/140 if mode=='endless' else 1
  subprocess.run([c.FF,'-hide_banner','-loglevel','error','-y','-i',str(source),'-t','16','-af',f'atempo={tempo},afade=t=out:st=15:d=1','-c:a','libmp3lame','-q:a','2',str(OUT/f'{name}-{label}-preview.mp3')],check=True)
 decoded,_=sf.read(target,always_2d=True);measured=m.measure_audio(target)
 assert len(decoded)==n and np.isfinite(decoded).all() and np.max(np.abs(decoded))<.98
 report=dict(mode=mode,file=target.relative_to(ROOT).as_posix(),sha256=hashlib.sha256(target.read_bytes()).hexdigest(),sourceMasterSha256=hashlib.sha256(original.read_bytes()).hexdigest(),originalLeadDb=-10,sourceLUFS=float(measured['input_i']),truePeakDbTP=float(measured['input_tp']),stereoCorrelation=float(np.corrcoef(decoded.T)[0,1]),frames=n,seconds=n/sr,loopStep=float(np.max(np.abs(decoded[0]-decoded[-1]))),instrument='Lossless Salamander Grand Piano V3, velocity layers 8 and 9, retuned SFZ mapping',sampleMaxTransposeSemitones=1,pianoAddedReverb=False)
 (OUT/f'{name}-score.json').write_text(json.dumps(events,indent=2));c.CACHE.clear();VOICE_CACHE.clear();print(json.dumps(report),flush=True);return report

if __name__=='__main__':
 reports=[render(mode,phrases) for mode,phrases in m.HOOKS.items()]
 (OUT/'report.json').write_text(json.dumps(reports,indent=2))
