"""Render finalized interactive Piano Flow charts for musical audition.
Mirrors the237 expressive sampler and backing mix, not a second fixed backing song.
The exported full songs simulate accurate performance of every written note.
"""
from pathlib import Path
import numpy as np,soundfile as sf,json,math,argparse,subprocess,hashlib
from scipy.signal import lfilter,fftconvolve
import imageio_ffmpeg
HERE=Path(__file__).resolve().parent;SR=44100;FF=imageio_ffmpeg.get_ffmpeg_exe();RAW={};VOICES={}
# Repository copy lives in scripts/music237; --samples also supports another checkout.
SAMPLES=HERE.parents[1]/'_site/assets/music/keys'
def key_sample(p):
 if p in RAW:return RAW[p]
 keys=[int(x.stem) for x in SAMPLES.glob('*.ogg') if x.stem.isdigit()];k=min(keys,key=lambda x:abs(x-p));a,rate=sf.read(SAMPLES/f'{k}.ogg',always_2d=True)
 a=a[:,np.argmax(np.sum(a*a,axis=0))];a=a/max(.08,np.max(np.abs(a)))
 x=np.arange(0,len(a)-1,2**((p-k)/12)*rate/SR);a=np.interp(x,np.arange(len(a)),a);RAW[p]=a;return a
def lowpass(a,frequency,q=.55):
 w=2*np.pi*frequency/SR;c=np.cos(w);alpha=np.sin(w)/(2*10**(q/20))
 return lfilter([(1-c)/2,1-c,(1-c)/2],[1+alpha,-2*c,1-alpha],a)
def voice(p,hold,v,backing=False):
 hold=max(.08,min(6,hold));cache=(p,round(hold,5),round(v,6),backing)
 if cache in VOICES:return VOICES[cache].copy()
 volume=v if backing else .32*v**1.35;attack=.010 if backing else .005;tail=.28 if backing else .38
 length=round((hold+tail+.02)*SR);a=np.zeros(length);raw=key_sample(p);a[:min(length,len(raw))]=raw[:length]
 a=lowpass(a,4800 if backing else 3800+5200*math.sqrt(v));t=np.arange(length)/SR
 # Actual gain ramps are exponential toward .0001; their target is compensated
 # by bus gain in game. Tiny end differences are below the audible release tail.
 floor=.0001/(5.4166666667 if backing else 1)
 envelope=np.where(t<attack,volume*t/attack,np.where(t<=hold,volume,volume*np.exp(np.log(floor/max(volume,1e-7))*(t-hold)/tail)))
 envelope[t>hold+tail]=0;a*=envelope;VOICES[cache]=a.astype(np.float32);return a

def impulses():
 n=round(SR*1.25);out=[]
 for channel in range(2):
  a=np.zeros(n);seed=7319+channel*1237
  for i in range(math.floor(SR*.018),n):
   seed=(seed*16807)%2147483647;t=i/SR;a[i]=(seed/1073741824-1)*.018*math.exp(-t*6)*min(1,t/.06)
  for delay,level in [(.027,.18),(.047,.12),(.081,.07)]:a[math.floor((delay+channel*.004)*SR)]+=level
  out.append(a)
 return out
IR=impulses()
def room(mono,wet):
 out=np.zeros((len(mono),2),np.float32)
 for c in range(2):out[:,c]=mono+fftconvolve(mono,IR[c],mode='full')[:len(mono)]*wet
 return out

def render(song,folder):
 folder.mkdir(parents=True,exist_ok=True);beat=60/song['bpm'];N=round((song['beats']*beat+1.7)*SR);lead=np.zeros(N,np.float32);back=np.zeros_like(lead)
 def put(bus,a,at):
  i=round(at*SR);n=min(len(a),N-i)
  if i>=0 and n>0:bus[i:i+n]+=a[:n]
 notes=song['notes']
 for i,n in enumerate(notes):
  at=n['songBeat']*beat;hold=n.get('soundBeats',n['duration']*.84)*beat;a=voice(n['pitch'],hold,n.get('accent',.9))
  repeated=next((m['songBeat']*beat-at for m in notes[i+1:] if m['pitch']==n['pitch']),None)
  if repeated is not None and repeated<len(a)/SR:
   start=round(repeated*SR);end=min(len(a),start+round(.075*SR));a[start:end]*=np.linspace(1,0,end-start);a[end:]=0
  put(lead,a,at)
 for e in song['backing']:put(back,voice(e['pitch'],e['duration']*beat,e['gain'],True),e['songBeat']*beat)
 # A single audition gain leaves differences between songs/dynamics intact.
 # This is a listening export; saved music/effects sliders still control the game.
 leadRoom=room(lead,.22).mean(axis=1);mix=(leadRoom[:,None]+room(back,.16))*1.40
 peak=float(np.max(np.abs(mix)));assert peak<.99,(song['id'],peak)
 name=song['id'];wav=folder/(name+'.wav');sf.write(wav,mix,SR,subtype='PCM_24')
 for ext,codec in [('mp3',['-c:a','libmp3lame','-q:a','2']),('ogg',['-c:a','libvorbis','-q:a','5'])]:subprocess.run([FF,'-hide_banner','-loglevel','error','-y','-i',str(wav),*codec,str(folder/(name+'.'+ext))],check=True)
 # Listen immediately to the actual verse and then to an actual chorus, not just an intro.
 start=round(8*beat*SR);preview=mix[start:start+round(28*SR)].copy();f=round(.5*SR);preview[-f:]*=np.linspace(1,0,f)[:,None]
 previewfile=folder/(name+'-preview.wav');sf.write(previewfile,preview,SR,subtype='PCM_24');subprocess.run([FF,'-hide_banner','-loglevel','error','-y','-i',str(previewfile),'-c:a','libmp3lame','-q:a','2',str(folder/(name+'-preview.mp3'))],check=True)
 decoded,sr=sf.read(folder/(name+'.ogg'),always_2d=True);assert np.isfinite(decoded).all() and np.max(np.abs(decoded))<.99
 result={'id':name,'title':song['title'],'bpm':song['bpm'],'seconds':round(len(decoded)/sr,3),'leadNotes':len(notes),'backingNotes':len(song['backing']),'peakDb':round(20*np.log10(np.max(np.abs(decoded))),2),'rmsDb':round(20*np.log10(np.sqrt(np.mean(decoded*decoded))),2),'sha256':hashlib.sha256((folder/(name+'.ogg')).read_bytes()).hexdigest(),'previewStartBeat':8,'previewSeconds':28,'render':'Exact237 melody/backing chart; expressive normalized acoustic-piano samples; same relative default mix; common presentation gain1.40'}
 (folder/(name+'-qa.json')).write_text(json.dumps(result,indent=2));print(json.dumps(result),flush=True);return result

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('catalog',type=Path,nargs='?',default=HERE/'piano-catalog237.json');p.add_argument('--ids',nargs='*');p.add_argument('--samples',type=Path,default=SAMPLES);p.add_argument('--output',type=Path,default=Path.cwd()/'work/music237-piano-renders');a=p.parse_args();SAMPLES=a.samples
 songs=json.loads(a.catalog.read_text(encoding='utf-8-sig'))['songs'];reports=[]
 for song in songs:
  if not a.ids or song['id'] in a.ids:reports.append(render(song,a.output))
 (a.output/'render-manifest.json').write_text(json.dumps({'sourceSHA256':hashlib.sha256(a.catalog.read_bytes()).hexdigest(),'songs':reports},indent=2))
