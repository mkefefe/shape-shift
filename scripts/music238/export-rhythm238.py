from pathlib import Path
import importlib.util,numpy as np,soundfile as sf,subprocess,json,hashlib
base=Path(__file__).resolve().parent;spec=importlib.util.spec_from_file_location('score238',base/'compose238.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);out=base/'rhythm';out.mkdir(exist_ok=True);rows=[]
for kind in ['kick','snare','hat']:
 a=m.drum(kind).copy();a*=.9/np.max(np.abs(a));a[-1]=0
 wav=out/f'flow-{kind}-238.wav';ogg=out/f'flow-{kind}-238.ogg';sf.write(wav,a,m.SR,subtype='PCM_24');subprocess.run([m.FF,'-hide_banner','-loglevel','error','-y','-i',str(wav),'-c:a','libvorbis','-q:a','6',str(ogg)],check=True)
 d,sr=sf.read(ogg);assert np.isfinite(d).all() and np.max(np.abs(d))<.99
 row={'kind':kind,'file':ogg.name,'seconds':len(d)/sr,'sampleRate':sr,'channels':1,'peak':float(np.max(np.abs(d))),'rms':float(np.sqrt(np.mean(d*d))),'firstNonzeroFrame':int(np.flatnonzero(np.abs(d)>1e-5)[0]),'lastSample':float(d[-1]),'sha256':hashlib.sha256(ogg.read_bytes()).hexdigest()};rows.append(row)
(out/'sample-manifest.json').write_text(json.dumps({'version':'238','originalSynthesis':True,'samples':rows},indent=2));print(json.dumps(rows,indent=2))
