"""Dry, monophonic piano hooks over the original 239 masters (not the 271 remix).

Each written A phrase repeats unchanged, returns after B, and has one note at a
time. No added chord blocks, pad, percussion, reverb, or randomized pitches.
Original Salamander samples retain their existing project attribution.
"""
from pathlib import Path
import importlib.util,json,hashlib,subprocess
import numpy as np
import soundfile as sf
from scipy.signal import butter,sosfilt

ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('composer',ROOT/'scripts/music238/compose238.py')
c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c)
OUT=ROOT/'outputs/music272';OUT.mkdir(parents=True,exist_ok=True)

# Four beats per written measure. Repeated pitches and returning rhythmic
# shapes are intentional; melodic changes belong to an authored answer phrase.
HOOKS={
 'adventure':{
  'A':[
   'F#5:.5 A5:.5 A5:1 F#5:.5 E5:.5 F#5:1',
   'E5:.5 E5:.5 C#5:1 B4:.5 C#5:.5 E5:1',
   'F#5:.5 A5:.5 A5:1 F#5:.5 E5:.5 F#5:1',
   'D5:.5 D5:.5 B4:1 A4:.5 B4:.5 D5:1',
   'F#5:.5 A5:.5 A5:1 F#5:.5 E5:.5 F#5:1',
   'E5:.5 E5:.5 D5:1 B4:.5 D5:.5 E5:1',
   'D5:1 D5:.5 E5:.5 D5:.5 B4:.5 G4:1',
   'C#5:.5 E5:.5 E5:1 C#5:.5 B4:.5 A4:1'],
  'B':[
   'B4:1 D5:1 D5:.5 B4:.5 A4:1',
   'A4:1 D5:1 D5:.5 E5:.5 F#5:1',
   'B4:1 E5:1 E5:.5 D5:.5 B4:1',
   'C#5:1 E5:1 E5:.5 C#5:.5 A4:1',
   'B4:1 D5:1 D5:.5 E5:.5 F#5:1',
   'C#5:1 E5:1 E5:.5 C#5:.5 A4:1',
   'B4:1 D5:1 B4:1 A4:.5 G4:.5',
   'C#5:1 B4:.5 C#5:.5 E5:1 A4:1']},
 'endless':{
  'A':[
   'C#5:1 C#5:1 B4:1 C#5:1',
   'B4:1 B4:.5 C#5:.5 E5:1 B4:1',
   'C#5:1 C#5:1 E5:1 C#5:1',
   'D5:1 D5:.5 E5:.5 F#5:1 E5:1',
   'C#5:1 C#5:1 B4:1 C#5:1',
   'B4:1 B4:.5 C#5:.5 D5:1 B4:1',
   'A4:1 D5:1 D5:1 C#5:.5 B4:.5',
   'B4:1 C#5:1 B4:1 A4:1'],
  'B':[
   'C#5:1 E5:1 F#5:1 E5:1',
   'D5:1 D5:.5 E5:.5 F#5:1 E5:1',
   'C#5:1 E5:1 E5:1 C#5:1',
   'B4:1 B4:.5 C#5:.5 E5:1 B4:1',
   'D5:1 F#5:1 F#5:1 E5:1',
   'D5:1 D5:.5 E5:.5 F#5:1 E5:1',
   'B4:1 E5:1 E5:1 C#5:.5 B4:.5',
   'G#4:1 B4:1 B4:1 A4:1']},
 'drop':{
  'A':[
   'A4:1 C5:.5 C5:.5 A4:1 G4:1',
   'G4:1 G4:1 E4:1 G4:1',
   'A4:1 C5:.5 C5:.5 A4:1 F4:1',
   'F4:1 F4:1 D4:1 F4:1',
   'A4:1 C5:.5 C5:.5 A4:1 G4:1',
   'G4:1 G4:1 Bb4:1 G4:1',
   'F4:1 G4:1 Bb4:1 A4:1',
   'G4:1 E4:1 G4:1 C5:1'],
  'B':[
   'D5:1 D5:1 C5:1 Bb4:1',
   'C5:1 C5:1 A4:1 G4:1',
   'Bb4:1 Bb4:1 A4:1 G4:1',
   'G4:1 A4:1 G4:1 E4:1',
   'F4:1 A4:1 C5:1 A4:1',
   'E4:1 G4:1 C5:1 G4:1',
   'Bb4:1 Bb4:1 A4:1 G4:1',
   'E4:1 G4:1 G4:1 C5:1']},
 'slice':{
  'A':[
   'E5:.5 E5:.5 B4:1 D5:.5 E5:.5 B4:1',
   'C#5:.5 C#5:.5 E5:1 C#5:.5 B4:.5 A4:1',
   'D5:.5 D5:.5 A4:1 C#5:.5 D5:.5 A4:1',
   'B4:.5 B4:.5 D5:1 B4:.5 A4:.5 F#4:1',
   'E5:.5 E5:.5 B4:1 D5:.5 E5:.5 B4:1',
   'C#5:.5 C#5:.5 E5:1 C#5:.5 B4:.5 A4:1',
   'B4:.5 D5:.5 D5:1 B4:.5 A4:.5 G4:1',
   'A4:.5 D5:.5 D5:1 E5:.5 D5:.5 A4:1'],
  'B':[
   'G5:1 D5:.5 D5:.5 B4:1 D5:1',
   'E5:1 C#5:.5 C#5:.5 A4:1 C#5:1',
   'F#5:1 D5:.5 D5:.5 B4:1 D5:1',
   'F#5:1 E5:.5 D5:.5 A4:1 D5:1',
   'G5:1 D5:.5 D5:.5 B4:1 D5:1',
   'E5:1 C#5:.5 C#5:.5 A4:1 C#5:1',
   'E5:1 B4:.5 B4:.5 D5:1 B4:1',
   'C#5:1 B4:.5 A4:.5 E5:1 E5:1']},
 'battle':{
  'A':[
   'G5:.5 G5:.5 D5:1 F5:.5 G5:.5 D5:1',
   'E5:.5 E5:.5 D5:1 C5:.5 D5:.5 E5:1',
   'F5:.5 F5:.5 D5:1 Bb4:.5 D5:.5 F5:1',
   'C5:.5 C5:.5 A4:1 C5:.5 D5:.5 C5:1',
   'G5:.5 G5:.5 D5:1 F5:.5 G5:.5 D5:1',
   'F5:.5 F5:.5 D5:1 A4:.5 C5:.5 D5:1',
   'Eb5:.5 Eb5:.5 D5:1 Bb4:.5 D5:.5 Eb5:1',
   'D5:.5 D5:.5 C5:1 A4:.5 F#4:.5 D5:1'],
  'B':[
   'F5:1 D5:.5 D5:.5 Bb4:1 D5:1',
   'C5:1 A4:.5 A4:.5 C5:1 F5:1',
   'D5:1 Bb4:.5 Bb4:.5 G4:1 Bb4:1',
   'E5:1 D5:.5 D5:.5 C5:1 E5:1',
   'G5:1 Eb5:.5 Eb5:.5 D5:1 Bb4:1',
   'F5:1 D5:.5 D5:.5 Bb4:1 D5:1',
   'Eb5:1 D5:.5 C5:.5 G4:1 C5:1',
   'D5:1 C5:.5 A4:.5 F#4:1 D5:1']}}

def measure_audio(path):
 p=subprocess.run([c.FF,'-hide_banner','-i',str(path),'-af','loudnorm=I=-16:TP=-1:LRA=11:print_format=json','-f','null','-'],capture_output=True,text=True,check=True)
 return json.loads(p.stderr[p.stderr.rfind('{'):p.stderr.rfind('}')+1])

def render(mode,phrases):
 name={'drop':'shape-drop','slice':'shape-slice'}.get(mode,mode)
 old=Path('battle/assets/battle-239.ogg') if mode=='battle' else Path(f'assets/music/{name}-239.ogg')
 source=ROOT/'_site'/old;bed,sr=sf.read(source,always_2d=True)
 score=json.loads((ROOT/f'scripts/music238/scores/{mode}-score.json').read_text())
 beat=60/score['bpm'];n=len(bed);piano=np.zeros(n);events=[]
 assert sr==c.SR and abs(n/sr-score['beats']*beat)<.01
 for bar in range(32):
  phrase='B' if 16<=bar<24 else 'A'
  for pos,pitch,length in c.measure(phrases[phrase][bar%8]):
   at=bar*4+pos;gate=length*beat*.72;release=min(.08,length*beat*.15)
   note=c.sound('piano',pitch,gate).astype(float)[:round((gate+release)*sr)].copy()
   fade=round(release*sr);note[-fade:]*=np.linspace(1,0,fade)
   note=sosfilt(butter(2,120,fs=sr,btype='highpass',output='sos'),note)
   # Dry, central piano; repeated notes keep a clear attack and a short release.
   note*=1 if pos%2==0 else .88
   start=round(at*beat*sr);count=min(len(note),n-start);piano[start:start+count]+=note[:count]
   events.append(dict(beat=at,pitch=pitch,durationBeats=length,gateSeconds=gate,releaseSeconds=release,phrase=phrase))
 for a,b in zip(events,events[1:]):assert a['beat']*beat+a['gateSeconds']+a['releaseSeconds']<=b['beat']*beat+.00001
 assert [(e['beat'],e['pitch']) for e in events if e['beat']<32]==[(e['beat']-32,e['pitch']) for e in events if 32<=e['beat']<64]
 bed_rms=float(np.sqrt(np.mean(bed*bed)));piano*=bed_rms*10**(-4/20)/float(np.sqrt(np.mean(piano*piano)))
 full=bed+piano[:,None];full-=full.mean(axis=0)
 gain=min(bed_rms/np.sqrt(np.mean(full*full)),.86/np.max(np.abs(full)));full*=gain
 edge=round(.003*sr);full[-edge:]+=np.linspace(0,1,edge)[:,None]*(full[0]-full[-1])
 wav=OUT/f'{name}.wav';sf.write(wav,full,sr,subtype='PCM_24')
 sf.write(OUT/f'{name}-piano-only.wav',piano*gain,sr,subtype='PCM_24')
 target=ROOT/(Path('battle/assets/battle-272.ogg') if mode=='battle' else Path(f'assets/music/{name}-272.ogg'));target.parent.mkdir(parents=True,exist_ok=True)
 subprocess.run([c.FF,'-hide_banner','-loglevel','error','-y','-i',str(wav),'-c:a','libvorbis','-q:a','6',str(target)],check=True)
 # Endless previews demonstrate the real pitch-preserving start and fast rates.
 tempos=[('slow',108/140),('fast',170/140)] if mode=='endless' else [('melody',1)]
 for suffix,tempo in tempos:
  subprocess.run([c.FF,'-hide_banner','-loglevel','error','-y','-i',str(wav),'-t','20','-af',f'atempo={tempo},afade=t=out:st=19:d=1','-c:a','libmp3lame','-q:a','2',str(OUT/f'{name}-{suffix}-preview.mp3')],check=True)
 decoded,rate=sf.read(target,always_2d=True);measured=measure_audio(target)
 assert len(decoded)==n and np.isfinite(decoded).all() and np.max(np.abs(decoded))<.98
 report=dict(mode=mode,file=target.relative_to(ROOT).as_posix(),bpm=score['bpm'],key=score['key'],bars=32,frames=n,seconds=n/rate,sourceSha256=hashlib.sha256(source.read_bytes()).hexdigest(),sha256=hashlib.sha256(target.read_bytes()).hexdigest(),sourceLUFS=float(measured['input_i']),truePeakDbTP=float(measured['input_tp']),stereoCorrelation=float(np.corrcoef(decoded.T)[0,1]),pianoRelativeRmsDb=-4,loopStep=float(np.max(np.abs(decoded[0]-decoded[-1]))),pianoNotes=len(events),pianoMaxPolyphony=1,addedReverb=False)
 (OUT/f'{name}-piano-score.json').write_text(json.dumps(events,indent=2));c.CACHE.clear();print(json.dumps(report),flush=True);return report

if __name__=='__main__':
 reports=[render(mode,phrases) for mode,phrases in HOOKS.items()]
 (OUT/'report.json').write_text(json.dumps(reports,indent=2))
