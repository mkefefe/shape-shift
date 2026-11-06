"""Local listening candidate: five distinct hooks with one lighter indie palette.

The menu reference is analyzed, never sampled into these mode recordings.
273's approved lossless piano voice and authored 272 note sequences are retained.
Existing 239 bass/percussion patterns remain, with less sub-bass, compact plucked
backing chords and less competing lead. Piano Flow and menu assets are untouched.
"""
from pathlib import Path
import importlib.util,json,hashlib,subprocess,math
import numpy as np,soundfile as sf
from scipy.signal import butter,sosfilt,stft

ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('approved_piano',ROOT/'scripts/music273/clear-piano.py')
p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
c=p.c;OUT=ROOT/'outputs/music274';OUT.mkdir(parents=True,exist_ok=True)

def fingerprint(path):
 audio,sr=sf.read(path,always_2d=True);mono=audio.mean(axis=1)
 f,_,z=stft(mono,fs=sr,nperseg=4096,noverlap=2048)
 power=np.mean(abs(z)**2,axis=1)
 return {f'{lo}-{hi}Hz':float(power[(f>=lo)&(f<hi)].sum()/power.sum()) for lo,hi in [(0,180),(180,500),(500,2000),(2000,12000)]}

PLUCKS={}
def pluck(pitch,duration):
 key=(pitch,round(duration,4))
 if key in PLUCKS:return PLUCKS[key]
 t=np.arange(round(duration*c.SR))/c.SR;freq=440*2**((pitch-69)/12)
 # Stable pitched attacks; no detuned layer, chorus or smeared pad tail.
 a=sum(level*np.sin(2*np.pi*freq*h*t)*np.exp(-t*decay) for h,level,decay in [(1,.7,7),(2,.38,12),(3,.18,18),(4,.07,24)])
 a*=np.minimum(1,t/.003)*np.minimum(1,(duration-t)/.035)
 PLUCKS[key]=a;return a

def add(bus,a,beat,pan):
 start=round(beat*SECONDS_PER_BEAT*c.SR)%len(bus);a=a[:len(bus)];head=min(len(a),len(bus)-start)
 if a.ndim==1:a=np.column_stack([a*math.sqrt((1-pan)/2),a*math.sqrt((1+pan)/2)])
 bus[start:start+head]+=a[:head]
 if head<len(a):bus[:len(a)-head]+=a[head:]

def render(mode,phrases):
 global SECONDS_PER_BEAT
 name={'drop':'shape-drop','slice':'shape-slice'}.get(mode,mode)
 score=json.loads((ROOT/'scripts/music273/scores'/f'{mode}-score.json').read_text())
 SECONDS_PER_BEAT=60/score['bpm'];n=round(128*SECONDS_PER_BEAT*c.SR)
 buses={k:np.zeros((n,2)) for k in ['piano','harmony','bass','drums','old_lead']}
 for e in score['events']:
  kind=e['instrument'];bus=e['bus'];dur=e['durationBeats']*SECONDS_PER_BEAT
  if bus=='harmony':
   if kind=='pad':continue
   a=pluck(e['pitch']+(12 if e['pitch']<60 else 0),min(.43,max(.15,dur)))*e['gain']*1.9
  elif bus=='bass':
   a=c.sound('bass',e['pitch'],dur)*e['gain']*.41
  elif bus=='drums':
   energy={'kick':.70,'snare':1.35,'rim':1.35,'hat':1.05,'open':1.0,'shaker':1.0,'tom':.9}[kind]
   a=c.drum(kind)*e['gain']*energy
  else:
   # Keep only a quiet trace of the old answer voice; the approved piano leads.
   a=c.sound(kind,e['pitch'],dur)*e['gain']*10**(-18/20);bus='old_lead'
  add(buses[bus],a,e['beat'],e.get('pan',0))
 events=[]
 for bar in range(32):
  phrase='B' if 16<=bar<24 else 'A'
  for pos,pitch,length in c.measure(phrases[phrase][bar%8]):
   at=bar*4+pos;duration=length*SECONDS_PER_BEAT*.97;accent=pos in [0,2]
   note=p.piano_note(pitch,duration,accent)*(1 if accent else .92)
   add(buses['piano'],note,at,0)
   events.append(dict(beat=at,pitch=pitch,durationSeconds=duration,velocityLayer=9 if accent else 8))
 # Same acoustic piano samples, centered attacks and dynamics as approved in 273.
 piano=buses['piano'];piano*=.070/np.sqrt(np.mean(piano*piano))
 bed=sum(buses[k] for k in ['harmony','bass','drums','old_lead'])
 bed=sosfilt(butter(2,52,fs=c.SR,btype='highpass',output='sos'),bed,axis=0)
 bed*=.055/np.sqrt(np.mean(bed*bed))
 full=piano+bed;full-=full.mean(axis=0)
 gain=min(.12/np.sqrt(np.mean(full*full)),.85/np.max(abs(full)));full*=gain
 edge=round(.003*c.SR);full[-edge:]+=np.linspace(0,1,edge)[:,None]*(full[0]-full[-1])
 wav=OUT/f'{name}.wav';sf.write(wav,full,c.SR,subtype='PCM_24')
 target=ROOT/(f'battle/assets/battle-274.ogg' if mode=='battle' else f'assets/music/{name}-274.ogg')
 subprocess.run([c.FF,'-hide_banner','-loglevel','error','-y','-i',str(wav),'-c:a','libvorbis','-q:a','6',str(target)],check=True)
 tempo=108/140 if mode=='endless' else 1
 subprocess.run([c.FF,'-hide_banner','-loglevel','error','-y','-i',str(wav),'-af',f'atempo={tempo},afade=t=out:st=19:d=1','-t','20','-c:a','libmp3lame','-q:a','2',str(OUT/f'{name}-preview.mp3')],check=True)
 measured=p.m.measure_audio(target);decoded,_=sf.read(target,always_2d=True)
 assert len(decoded)==n and np.isfinite(decoded).all() and np.max(abs(decoded))<.98
 report=dict(mode=mode,file=target.relative_to(ROOT).as_posix(),sha256=hashlib.sha256(target.read_bytes()).hexdigest(),sourceLUFS=float(measured['input_i']),truePeakDbTP=float(measured['input_tp']),frames=n,seconds=n/c.SR,stereoCorrelation=float(np.corrcoef(decoded.T)[0,1]),loopStep=float(np.max(abs(decoded[0]-decoded[-1]))),bands=fingerprint(target))
 (OUT/f'{name}-score.json').write_text(json.dumps(events,indent=2));print(json.dumps(report),flush=True)
 p.VOICE_CACHE.clear();c.CACHE.clear();return report

if __name__=='__main__':
 reference=ROOT/'assets/music/indie-game-soundtrack-251864.mp3'
 (OUT/'reference-analysis.json').write_text(json.dumps({'source':reference.name,'sha256':hashlib.sha256(reference.read_bytes()).hexdigest(),'bands':fingerprint(reference)},indent=2))
 reports=[render(mode,phrases) for mode,phrases in p.m.HOOKS.items()]
 (OUT/'report.json').write_text(json.dumps(reports,indent=2))
