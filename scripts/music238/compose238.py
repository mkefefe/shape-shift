"""Original Shape Shift 238 score-first production. Never writes to the game tree.
Author notes/chords/form first; render separate instruments, short audition, and full loop.
Existing Salamander keys are CC BY 3.0 Alexander Holm; all synthesis and scores original.
"""
from pathlib import Path
import numpy as np, soundfile as sf, json, subprocess, math, argparse, hashlib, struct
from scipy.signal import butter,sosfilt,fftconvolve
import imageio_ffmpeg
HERE=Path(__file__).resolve().parent
SAMPLES=HERE.parent.parent/'_site/assets/music/keys'
SR=44100;FF=imageio_ffmpeg.get_ffmpeg_exe();CACHE={}
KEYS=[int(p.stem) for p in SAMPLES.glob('*.ogg') if p.stem.isdigit()]
PITCH={'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11}
def midi(s):return (int(s[-1])+1)*12+PITCH[s[:-1]]
def measure(text):
 out=[];at=0
 for item in text.split():
  p,d=item.split(':');d=float(d)
  if p!='R':out.append((at,midi(p),d))
  at+=d
 assert abs(at-4)<1e-8,(text,at)
 return out
# Every melody below is written against its actual chord. No random note selection,
# automatic transposition of one hook across modes, or nearest-chord-tone correction.
THEMES={
'adventure':dict(title='Sunbeam Avenue',bpm=104,key='D major',lead='piano',swing=.018,
 chords=['Dmaj9','A/C#','Bm7','Gmaj7','D/F#','Em7','G6','A6'],bridge=['Gmaj7','D/F#','Em7','A6','Bm7','F#m7','Gmaj7','A6'],
 A=['F#4:.5 A4:.5 D5:1 C#5:.5 B4:.5 A4:1','R:.5 F#4:.5 E4:.5 F#4:.5 A4:1 E4:1','B4:.75 D5:.25 F#5:1 E5:.5 D5:.5 B4:1','A4:1 B4:.5 A4:.5 F#4:1 R:1','F#4:.5 A4:.5 D5:.75 E5:.25 F#5:1 E5:1','D5:.5 B4:.5 G4:1 B4:.5 A4:.5 G4:1','F#4:1 A4:.5 B4:.5 D5:1 B4:.5 A4:.5','C#5:.75 B4:.25 A4:1 F#4:.5 E4:.5 R:1'],
 B=['B4:1 D5:.5 E5:.5 F#5:1 D5:1','A4:.5 F#4:.5 A4:1 D5:1 C#5:1','B4:.5 G4:.5 E4:1 F#4:.5 G4:.5 B4:1','C#5:1 E5:.5 D5:.5 C#5:.5 B4:.5 A4:1','F#5:.75 E5:.25 D5:.5 B4:.5 A4:1 B4:1','A4:.5 C#5:.5 E5:1 C#5:1 A4:1','G4:.5 A4:.5 B4:1 D5:.5 B4:.5 A4:1','E5:.5 C#5:.5 B4:.5 A4:.5 G4:1 R:1'],
 variations={11:'G4:.5 A4:.5 B4:.5 D5:.5 B4:1 R:1',15:'C#5:.5 E5:.5 C#5:1 B4:.5 A4:.5 R:1',28:'F#5:1 E5:.5 D5:.5 A4:.5 F#4:.5 E4:1',31:'C#5:.5 B4:.5 A4:1 E4:.5 A4:.5 R:1'}),
'endless':dict(title='Bright Circuit',bpm=140,key='A major',lead='synth',swing=0,
 chords=['Aadd9','E/G#','F#m7','Dmaj7','A/C#','Bm7','Dmaj7','E6'],bridge=['F#m7','Dmaj7','Aadd9','E6','Bm7','Dmaj7','E6','E6'],
 A=['E5:.5 C#5:.5 B4:.5 C#5:.5 E5:1 R:.5 A5:.5','G#5:.75 E5:.25 B4:.5 E5:.5 F#5:1 E5:1','C#5:.5 E5:.5 F#5:1 E5:.5 C#5:.5 A4:.5 C#5:.5','D5:1 F#5:.5 E5:.5 D5:.5 C#5:.5 B4:1','E5:.5 C#5:.5 B4:.5 C#5:.5 E5:.75 A5:.25 G#5:.5 E5:.5','F#5:.5 D5:.5 C#5:1 B4:.5 A4:.5 F#4:1','A4:.5 D5:.5 F#5:.5 A5:.5 F#5:1 E5:.5 D5:.5','G#5:.5 F#5:.5 E5:1 B4:.5 C#5:.5 R:1'],
 B=['A5:1 G#5:.5 F#5:.5 E5:1 C#5:1','F#5:.75 E5:.25 D5:1 A4:.5 B4:.5 D5:1','E5:1 A5:.5 B5:.5 A5:.5 G#5:.5 E5:1','G#5:.5 F#5:.5 E5:1 B4:1 R:1','D5:.5 F#5:.5 A5:1 F#5:.5 E5:.5 D5:1','F#5:1 A5:.5 F#5:.5 E5:.5 D5:.5 C#5:1','B4:.5 E5:.5 G#5:.5 B5:.5 A5:1 G#5:.5 F#5:.5','E5:1 G#5:.5 F#5:.5 E5:1 R:1'],
 variations={10:'C#5:.5 E5:.5 F#5:.5 A5:.5 G#5:1 F#5:.5 E5:.5',15:'G#5:.5 B5:.5 A5:.5 G#5:.5 F#5:1 E5:1',27:'D5:.5 F#5:.5 A5:1 F#5:.5 E5:.5 D5:1',31:'G#5:.5 F#5:.5 E5:1 B4:1 R:1'}),
'drop':dict(title='Pocket Picnic',bpm=100,key='F major',lead='ep',swing=.035,
 chords=['Fmaj9','C/E','Dm9','Bbmaj7','F/A','Gm7','Bb6','C6'],bridge=['Bbmaj7','F/A','Gm7','C6','Dm9','Am7','Bbmaj7','C6'],
 A=['A4:.75 C5:.25 D5:.5 C5:.5 A4:1 R:1','G4:.5 A4:.5 G4:1 E4:1 R:1','F4:.75 A4:.25 D5:1 C5:.5 A4:.5 F4:1','D5:1 C5:.5 Bb4:.5 A4:1 R:1','A4:.75 C5:.25 F5:1 E5:.5 C5:.5 A4:1','Bb4:.5 A4:.5 G4:1 D5:.5 C5:.5 Bb4:1','A4:.5 Bb4:.5 D5:1 F5:.5 D5:.5 C5:1','E5:.75 D5:.25 C5:1 G4:1 R:1'],
 B=['D5:1 F5:.5 E5:.5 D5:1 Bb4:1','C5:.5 A4:.5 F4:1 A4:.5 C5:.5 E5:1','D5:.75 C5:.25 Bb4:1 A4:.5 G4:.5 F4:1','G4:1 C5:.5 D5:.5 E5:1 R:1','F5:1 E5:.5 D5:.5 C5:1 A4:1','G4:.5 A4:.5 C5:1 E5:.5 D5:.5 C5:1','Bb4:.75 D5:.25 F5:1 D5:.5 C5:.5 Bb4:1','G4:.5 A4:.5 C5:1 E5:1 R:1'],
 variations={11:'D5:.75 F5:.25 D5:1 C5:.5 Bb4:.5 R:1',15:'E5:.5 D5:.5 C5:1 A4:.5 G4:.5 R:1',29:'Bb4:.5 D5:.5 G5:1 F5:.5 D5:.5 Bb4:1',31:'E5:.5 D5:.5 C5:1 G4:1 R:1'}),
'slice':dict(title='Ribbon Radio',bpm=124,key='E Dorian',lead='pluck',swing=.025,
 chords=['Em9','A6','Dmaj7','Bm7','Em9','A6','Gmaj7','D/F#'],bridge=['Gmaj7','A6','Bm7','Dmaj7','Gmaj7','F#m7','Em9','A6'],
 A=['B4:.5 R:.25 D5:.25 E5:.5 F#5:.5 E5:1 B4:1','C#5:.75 B4:.25 A4:.5 E5:.5 C#5:1 R:1','A4:.5 D5:.5 F#5:.75 E5:.25 D5:.5 C#5:.5 A4:1','F#5:.5 E5:.5 D5:1 B4:.5 A4:.5 R:1','B4:.5 R:.25 D5:.25 E5:.5 F#5:.5 G5:.5 F#5:.5 E5:1','C#5:.5 E5:.5 A5:.75 G5:.25 E5:.5 C#5:.5 B4:1','D5:.75 B4:.25 A4:1 G4:.5 A4:.5 B4:1','A4:.5 F#4:.5 A4:1 D5:1 R:1'],
 B=['D5:.5 G5:.5 F#5:.5 D5:.5 B4:1 A4:1','C#5:1 E5:.5 F#5:.5 E5:.5 C#5:.5 A4:1','F#5:.75 D5:.25 B4:1 A4:.5 B4:.5 D5:1','E5:.5 F#5:.5 A5:1 F#5:.5 E5:.5 D5:1','G5:1 F#5:.5 E5:.5 D5:1 B4:1','C#5:.5 A4:.5 F#4:1 A4:.5 C#5:.5 E5:1','B4:.5 D5:.5 E5:1 F#5:.5 E5:.5 D5:1','C#5:.5 B4:.5 A4:1 E5:1 R:1'],
 variations={9:'C#5:.5 E5:.5 F#5:.5 E5:.5 C#5:1 A4:.5 R:.5',15:'A4:.5 F#4:.5 A4:.5 D5:.5 C#5:1 R:1',28:'B4:.5 D5:.5 E5:.75 F#5:.25 G5:1 E5:1',31:'A4:.5 F#4:.5 D5:1 C#5:.5 B4:.5 R:1'}),
'battle':dict(title='Color After Dark',bpm=116,key='G minor with Dorian color',lead='ep',swing=.012,
 chords=['Gm9','C9','Bbmaj7','F/A','Gm9','Dm7','Ebmaj7','D7'],bridge=['Bbmaj7','F/A','Gm9','C9','Ebmaj7','Bb/D','Cm9','D7'],
 A=['D5:.5 G5:.5 F5:.75 D5:.25 Bb4:.5 A4:.5 G4:1','E5:.5 G5:.5 A5:1 G5:.5 E5:.5 D5:1','F5:1 D5:.5 Bb4:.5 D5:.5 F5:.5 A5:1','G5:.75 F5:.25 C5:1 A4:1 R:1','D5:.5 G5:.5 Bb5:.75 A5:.25 G5:.5 F5:.5 D5:1','F5:1 E5:.5 D5:.5 A4:.5 C5:.5 D5:1','G5:.75 F5:.25 Eb5:.5 D5:.5 Bb4:1 G4:1','F#4:.5 A4:.5 D5:.75 Eb5:.25 D5:1 R:1'],
 B=['D5:1 F5:.5 Bb5:.5 A5:.5 F5:.5 D5:1','C5:.5 F5:.5 A5:1 G5:.5 F5:.5 E5:1','D5:.75 Bb4:.25 G4:1 A4:.5 Bb4:.5 D5:1','E5:1 G5:.5 A5:.5 G5:.5 E5:.5 D5:1','Eb5:.5 G5:.5 Bb5:1 G5:.5 F5:.5 Eb5:1','D5:.75 F5:.25 Bb5:1 A5:.5 F5:.5 D5:1','Eb5:.5 G5:.5 C6:1 Bb5:.5 G5:.5 Eb5:1','F#5:.5 E5:.5 D5:1 A4:1 R:1'],
 variations={11:'G5:.5 F5:.5 C5:1 A4:.5 C5:.5 R:1',15:'F#5:.5 A5:.5 G5:.5 F#5:.5 E5:.5 D5:.5 R:1',28:'D5:.5 G5:.5 Bb5:1 A5:.5 G5:.5 F5:1',31:'F#5:.5 E5:.5 D5:1 A4:1 R:1'})}
# Root and compact, voice-led chord registers; seventh/ninth colors belong to each key.
CHORDS={
'Dmaj9':('D2',['F#3','A3','C#4','E4']),'A/C#':('C#2',['E3','A3','B3','C#4']),'Bm7':('B2',['F#3','A3','B3','D4']),'Gmaj7':('G2',['F#3','G3','B3','D4']),'D/F#':('F#2',['A3','D4','E4','F#4']),'Em7':('E2',['G3','B3','D4','E4']),'G6':('G2',['B3','D4','E4','G4']),'A6':('A2',['G3','A3','C#4','F#4']),'F#m7':('F#2',['A3','C#4','E4','F#4']),
'Aadd9':('A2',['B3','C#4','E4','A4']),'E/G#':('G#2',['B3','E4','F#4','G#4']),'Dmaj7':('D2',['A3','C#4','D4','F#4']),'A/C#':('C#2',['A3','B3','C#4','E4']),'E6':('E2',['G#3','B3','C#4','E4']),
'Fmaj9':('F2',['A3','C4','E4','G4']),'C/E':('E2',['G3','C4','D4','E4']),'Dm9':('D2',['F3','A3','C4','E4']),'Bbmaj7':('Bb2',['F3','A3','Bb3','D4']),'F/A':('A2',['F3','G3','A3','C4']),'Gm7':('G2',['F3','G3','Bb3','D4']),'Bb6':('Bb2',['G3','Bb3','D4','F4']),'C6':('C2',['G3','A3','C4','E4']),'Am7':('A2',['G3','A3','C4','E4']),
'Em9':('E2',['G3','B3','D4','F#4']),
'Gm9':('G2',['F3','A3','Bb3','D4']),'C9':('C2',['E3','G3','Bb3','D4']),'Dm7':('D2',['F3','A3','C4','D4']),'Ebmaj7':('Eb2',['G3','Bb3','D4','Eb4']),'D7':('D2',['F#3','A3','C4','D4']),'Bb/D':('D2',['F3','A3','Bb3','D4']),'Cm9':('C2',['Eb3','G3','Bb3','D4'])}

def sound(kind,pitch,duration,velocity=1):
 # Rounded voices retain attacks and distinct spectral colors. No indefinite arpeggio bed.
 key=(kind,pitch,round(duration,3));a=CACHE.get(key)
 if a is not None:return a
 tail={'piano':.30,'ep':.26,'pluck':.13,'synth':.14,'bass':.07,'pad':.65}[kind]
 length=duration+tail;t=np.arange(round(length*SR))/SR;f=440*2**((pitch-69)/12)
 attack=.008
 if kind=='piano':
  k=min(KEYS,key=lambda x:abs(x-pitch));raw,rate=sf.read(SAMPLES/f'{k}.ogg',always_2d=True)
  raw=raw[:,np.argmax(np.mean(raw*raw,axis=0))];raw/=max(.08,float(np.max(np.abs(raw))))
  x=np.arange(len(t))*2**((pitch-k)/12)*rate/SR
  a=np.interp(x,np.arange(len(raw)),raw,left=0,right=0);a=sosfilt(butter(2,9000,fs=SR,output='sos'),a)
 elif kind=='ep':
  a=np.sin(2*np.pi*f*t)*np.exp(-t*.65)+.26*np.sin(2*np.pi*f*2.002*t)*np.exp(-t*2.8)+.12*np.sin(2*np.pi*f*3.997*t)*np.exp(-t*4.7)+.035*np.sin(2*np.pi*f*7*t)*np.exp(-t*8)
  a=np.tanh(a*1.15)*.8;attack=.006
 elif kind=='pluck':
  a=sum(v*np.sin(2*np.pi*f*h*t)*np.exp(-t*d) for h,v,d in [(1,1,1.7),(2,.26,4),(3,.16,5.5),(4,.06,8),(5,.035,11)])
  a+=.09*np.sin(2*np.pi*f*.998*t)*np.exp(-t*2.8);a*=.7;attack=.006
 elif kind=='synth':
  a=sum(v*(np.sin(2*np.pi*f*h*t)+.22*np.sin(2*np.pi*f*h*1.0012*t))*np.exp(-t*d) for h,v,d in [(1,.7,1),(2,.19,2.8),(3,.10,4.5),(5,.035,7)])
  attack=.009
 elif kind=='bass':
  a=(np.sin(2*np.pi*f*t)+.32*np.sin(4*np.pi*f*t)+.10*np.sin(6*np.pi*f*t))*np.exp(-t*1.2)*.8;attack=.012
 elif kind=='pad':
  a=(np.sin(2*np.pi*f*t)+.2*np.sin(2*np.pi*f*2*t)+.08*np.sin(2*np.pi*f*3*t))*.5;attack=.16
 env=np.minimum(1,t/attack)*np.clip((length-t)/tail,0,1)
 a=(a*env).astype(np.float32);CACHE[key]=a;return a
DRUMS={}
def drum(kind):
 if kind in DRUMS:return DRUMS[kind]
 seed={'kick':7,'rim':11,'snare':13,'hat':17,'open':19,'shaker':23,'tom':29}[kind];rng=np.random.default_rng(seed)
 dur={'kick':.25,'rim':.08,'snare':.19,'hat':.07,'open':.18,'shaker':.09,'tom':.20}[kind];t=np.arange(round(dur*SR))/SR;n=rng.standard_normal(len(t))
 if kind=='kick':
  phase=2*np.pi*(48*t+50*.025*(1-np.exp(-t/.025)));a=np.sin(phase)*np.exp(-t*18)+.016*n*np.exp(-t*120)
 elif kind=='rim':
  a=(.48*np.sin(2*np.pi*1850*t)+.3*np.sin(2*np.pi*1120*t)+.18*n)*np.exp(-t*82)
 elif kind=='snare':
  noise=sosfilt(butter(2,[850,7500],fs=SR,btype='bandpass',output='sos'),n)
  a=(.32*noise*np.exp(-t*30)+.35*np.sin(2*np.pi*180*t)*np.exp(-t*45)+.18*np.sin(2*np.pi*330*t)*np.exp(-t*55))
 elif kind in ['hat','open','shaker']:
  n=sosfilt(butter(2,[4800,11000],fs=SR,btype='bandpass',output='sos'),n)
  a=n*.23*np.exp(-t*({'hat':75,'open':26,'shaker':55}[kind]))
 else:a=np.sin(2*np.pi*(105*t+24*.025*(1-np.exp(-t/.025))))*np.exp(-t*22)*.7
 a*=np.minimum(1,t/.0015)*np.minimum(1,(dur-t)/.01);DRUMS[kind]=a.astype(np.float32);return DRUMS[kind]

def make_score(mode):
 c=THEMES[mode];events=[];chords=[]
 def add(bus,kind,p,at,dur,vel,pan=0):events.append(dict(bus=bus,instrument=kind,pitch=p,beat=round(at,5),durationBeats=round(dur,5),gain=round(vel,5),pan=pan))
 for bar in range(32):
  section=bar//8;ix=bar%8;progression=c['bridge'] if section==2 else c['chords'];chname=progression[ix];root,voicing=CHORDS[chname];root=midi(root);voicing=list(map(midi,voicing));chords.append(chname)
  density=[.83,.95,.79,1][section];mel=c['variations'].get(bar,(c['B'] if section==2 else c['A'])[ix]);notes=measure(mel)
  for i,(pos,p,dur) in enumerate(notes):
   # Strong phrase shape and softer pickups, not a flat MIDI typewriter.
   accent=1 if i==0 else .89 if pos%1==0 else .76;accent*=1+.025*math.sin(bar*2+i)
   timing=(c['swing'] if pos%1==.5 else 0)+(.004*math.sin(i*1.7+bar) if c['lead'] in ['piano','ep'] else 0)
   gate=.88 if dur>=1 else .78
   add('melody',c['lead'],p,bar*4+pos+timing,max(.10,dur*gate),.30*accent*(.94 if section==2 else 1),0)
  # The chords answer rhythmically with voice leading and leave the melody's attack clear.
  chordkind='ep' if c['lead'] in ['piano','pluck','synth'] else 'piano'
  positions={'adventure':[.65,2.65],'endless':[.75,2.25],'drop':[.75,2.75],'slice':[.75,2.5],'battle':[.75,2.75]}[mode]
  if section==2 and bar%2==1:positions=[.65]
  for j,pos in enumerate(positions):
   for k,p in enumerate(voicing):add('harmony',chordkind,p,bar*4+pos+k*.012,.75 if mode!='endless' else .45,.037*density*(.9 if j else 1),-.13)
  # Occasional long color tone; the pad never doubles an entire sustained block chord.
  if bar%2==0 and mode in ['adventure','drop','battle']:
   for p in voicing[1:3]:add('harmony','pad',p,bar*4+.3,6.5,.019*density,.18)
  # Phrase-ending answers are confined to actual lead rests.
  if ix in [1,3,7] and notes[-1][0]+notes[-1][2]<=3:
   for j,p in enumerate([voicing[1]+12,voicing[0]+12]):add('harmony','pluck',p,bar*4+3.15+j*.42,.25,.044,-.22)
  basspos={'adventure':[(0,1.1,0),(1.75,.45,7),(2.5,.8,0),(3.5,.35,12)],'endless':[(0,.65,0),(1.5,.4,0),(2,.65,12),(3,.4,7),(3.5,.35,0)],'drop':[(0,1.15,0),(2.5,.65,7),(3.5,.35,12)],'slice':[(0,.65,0),(1.5,.45,12),(2.75,.55,7),(3.5,.3,0)],'battle':[(0,.7,0),(.75,.35,12),(2,.65,0),(3,.4,7),(3.5,.3,12)]}[mode]
  for i,(pos,dur,off) in enumerate(basspos):
   if section==2 and ix<2 and i>1:continue
   p=root+off
   if p<34:p+=12
   add('bass','bass',p,bar*4+pos,dur,.18*density*(1 if i==0 else .78),0)
  # Drums have a groove, restrained backbeat, ghost hits, and a short fill per8bars.
  kick={'adventure':[0,2.5],'endless':[0,1.75,2.5],'drop':[0,2.75],'slice':[0,1.5,2.75],'battle':[0,.75,2,2.75]}[mode]
  if section==2 and ix<2:kick=[0,2]
  drumlevel={'adventure':.72,'endless':1,'drop':.60,'slice':.90,'battle':.9}[mode]*density
  for pos in kick:add('drums','kick',0,bar*4+pos,.1,.24*drumlevel,0)
  for pos in [1,3]:add('drums','rim' if mode in ['adventure','drop'] else 'snare',0,bar*4+pos+.013,.1,.18*drumlevel,0)
  # Hats are subordinate, especially under upper-register melody.
  for j in range(8):
   if mode=='drop' and j%2==0:continue
   if section==2 and ix<2 and j%2==0:continue
   pos=j*.5+(c['swing'] if j%2 else 0)
   add('drums','hat',0,bar*4+pos,.1,(.105 if j%2 else .075)*drumlevel,.16 if j%2 else -.1)
  if ix in [3,7]:add('drums','open',0,bar*4+3.5,.1,.10*drumlevel,.18)
  if ix==7:
   for j,pos in enumerate([3.25,3.5,3.75]):add('drums','rim' if mode in ['adventure','drop'] else 'tom',0,bar*4+pos,.1,.08*drumlevel*(1+j*.22),-.1+j*.1)
  elif bar%4==2 and mode in ['slice','battle','endless']:add('drums','snare',0,bar*4+2.75,.1,.055*drumlevel,-.08)
 return dict(id=mode,title=c['title'],bpm=c['bpm'],key=c['key'],beats=128,bars=32,form=['A','A variation','B contrast','A return'],chords=chords,events=events)

def room(a,wet=.10):
 # Short diffuse room, not an echo or another melody; stereo detail is mono-compatible.
 n=round(.75*SR);t=np.arange(n)/SR;rng=np.random.default_rng(237);ir=rng.standard_normal(n)*np.exp(-t*9)
 ir=sosfilt(butter(1,4800,fs=SR,output='sos'),ir);ir[:round(.022*SR)]=0
 ir/=max(1,np.sqrt(np.sum(ir*ir)));out=a.copy()
 for ch in range(2):
  tail=fftconvolve(a[:,ch],ir,mode='full')*wet;out[:,ch]+=tail[:len(a)];out[:len(tail)-len(a),ch]+=tail[len(a):]
 return out

def render(score,outdir,preview=True,stems=True):
 outdir.mkdir(parents=True,exist_ok=True);beat=60/score['bpm'];N=round(score['beats']*beat*SR)
 buses={k:np.zeros((N,2),np.float32) for k in ['melody','harmony','bass','drums']}
 for e in score['events']:
  a=drum(e['instrument']) if e['bus']=='drums' else sound(e['instrument'],e['pitch'],e['durationBeats']*beat)
  energy=10**(1.5/20) if e['bus']=='bass' else (10**(4.5/20) if e['instrument'] in ['kick','snare','rim'] else (10**(1/20) if e['instrument'] in ['hat','open','shaker'] else (10**(2.5/20) if e['instrument']=='tom' else 1)))
  a=a*e['gain']*energy;start=round(e['beat']*beat*SR)%N;pan=e.get('pan',0);n=min(len(a),N)
  a=a[:n];left=min(n,N-start)
  for ch,gain in enumerate([math.sqrt((1-pan)/2),math.sqrt((1+pan)/2)]):
   buses[e['bus']][start:start+left,ch]+=a[:left]*gain
   if left<n:buses[e['bus']][:n-left,ch]+=a[left:]*gain
 buses['melody']=room(buses['melody'],.085);buses['harmony']=room(buses['harmony'],.12)
 full=sum(buses.values());full=sosfilt(butter(2,28,fs=SR,btype='highpass',output='sos'),full,axis=0)
 full-=full.mean(axis=0);full=np.tanh(full*.95)/.95
 rms=float(np.sqrt(np.mean(full*full)));peak=float(np.max(np.abs(full)));gain=min(.127/max(rms,1e-9),.89/max(peak,1e-9));full*=gain
 # Wrapped tails and exact beat count provide musical loop continuity. No master fade.
 edge=round(.003*SR);step=full[0]-full[-1];full[-edge:]+=np.linspace(0,1,edge)[:,None]*step
 name=score['id'];wav=outdir/(name+'.wav');sf.write(wav,full,SR,subtype='PCM_24')
 ogg=outdir/(name+'.ogg');subprocess.run([FF,'-hide_banner','-loglevel','error','-y','-i',str(wav),'-c:a','libvorbis','-q:a','6',str(ogg)],check=True)
 if stems:
  folder=outdir/'stems'/name;folder.mkdir(parents=True,exist_ok=True)
  for k,a in buses.items():sf.write(folder/(k+'.wav'),a*gain,SR,subtype='PCM_24')
 if preview:
  excerpt=full[:round(min(28,N/SR)*SR)].copy();f=round(.65*SR);excerpt[-f:]*=np.linspace(1,0,f)[:,None]
  sf.write(outdir/(name+'-preview.wav'),excerpt,SR,subtype='PCM_24')
  subprocess.run([FF,'-hide_banner','-loglevel','error','-y','-i',str(outdir/(name+'-preview.wav')),'-c:a','libmp3lame','-q:a','2',str(outdir/(name+'-preview.mp3'))],check=True)
 decoded,sr=sf.read(ogg,always_2d=True);barRms=[]
 for bar in range(score['bars']):
  block=decoded[round(bar*4*beat*sr):round((bar+1)*4*beat*sr)];barRms.append(round(20*np.log10(max(1e-9,np.sqrt(np.mean(block*block)))),2))
 report=dict(id=name,title=score['title'],bpm=score['bpm'],key=score['key'],seconds=round(N/SR,3),bars=score['bars'],notes=len(score['events']),peakDb=round(20*np.log10(np.max(np.abs(decoded))),2),rmsDb=round(20*np.log10(np.sqrt(np.mean(decoded*decoded))),2),crestDb=round(20*np.log10(np.max(np.abs(decoded))/np.sqrt(np.mean(decoded*decoded))),2),loopStep=float(np.max(np.abs(decoded[0]-decoded[-1]))),barRmsDb=barRms,sha256=hashlib.sha256(ogg.read_bytes()).hexdigest())
 assert np.isfinite(decoded).all() and np.max(np.abs(decoded))<.98
 (outdir/(name+'-score.json')).write_text(json.dumps(score,indent=2));(outdir/(name+'-qa.json')).write_text(json.dumps(report,indent=2));print(json.dumps(report),flush=True)
 return report

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--modes',nargs='*',default=list(THEMES));p.add_argument('--output',type=Path,default=HERE/'modes');p.add_argument('--no-stems',action='store_true');p.add_argument('--samples',type=Path,default=SAMPLES);a=p.parse_args();SAMPLES=a.samples;KEYS=[int(x.stem) for x in SAMPLES.glob('*.ogg') if x.stem.isdigit()];assert KEYS,'No piano sample files found; pass --samples PATH'
 for mode in a.modes:render(make_score(mode),a.output,stems=not a.no_stems)
