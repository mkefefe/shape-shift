"""Spatial remix of the existing 238 score, with unchanged notes and rhythms."""
from pathlib import Path
import importlib.util, json, hashlib, math
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

ROOT=Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('score238',ROOT/'music238/compose238.py')
producer=importlib.util.module_from_spec(spec);spec.loader.exec_module(producer)
OUT=ROOT/'music239/renders';SR=producer.SR

def stereo_room(audio,wet=.10):
    # Independent diffuse room responses create space around a stable dry centre.
    # No opposite-polarity channels, pitch shifting, or delayed copy of the dry lead.
    count=round(.48*SR);time=np.arange(count)/SR;result=audio.copy()
    send=(audio[:,0]+audio[:,1])*.5
    for channel,seed in enumerate([913,1847]):
        ir=np.random.default_rng(seed).standard_normal(count)*np.exp(-time*12)
        ir=sosfilt(butter(2,[240,6200],fs=SR,btype='bandpass',output='sos'),ir)
        ir[:round(.013*SR)]=0
        ir/=max(1e-9,float(np.sqrt(np.sum(ir*ir))))
        tail=fftconvolve(send,ir,mode='full')*(wet*3.2)
        result[:,channel]+=tail[:len(audio)]
        result[:len(tail)-len(audio),channel]+=tail[len(audio):]
    return result

producer.room=stereo_room
reports=[]
for name in producer.THEMES:
    original=json.loads((ROOT/f'music238/scores/{name}-score.json').read_text())
    score=json.loads(json.dumps(original))
    for event in score['events']:
        if event['bus']=='harmony':
            if event['instrument']=='pad':event['pan']=.4 if event['pitch']%2 else -.4
            else:event['pan']=max(-.6,min(.6,(event['pitch']-55)/18))
        elif event['bus']=='melody':
            event['pan']=max(-.12,min(.12,(event['pitch']-74)/80))
        elif event['instrument'] in ['hat','open','shaker']:
            event['pan']=.28 if event.get('pan',0)>0 else -.28
    # Keep each instrumental group balanced overall; musical emphasis is unchanged.
    for bus in ['melody','harmony','drums']:
        events=[e for e in score['events'] if e['bus']==bus and (bus!='drums' or e['instrument'] in ['hat','open','shaker'])]
        total=sum(e['gain']**2*e['durationBeats'] for e in events)
        centre=sum(e['pan']*e['gain']**2*e['durationBeats'] for e in events)/total
        for e in events:e['pan']=round(max(-.7,min(.7,e['pan']-centre)),6)
    assert [{k:v for k,v in e.items() if k!='pan'} for e in score['events']]==[{k:v for k,v in e.items() if k!='pan'} for e in original['events']]
    report=producer.render(score,OUT,stems=False)
    report['compositionUnchanged']=True
    report['sourceScoreSHA256']=hashlib.sha256((ROOT/f'music238/scores/{name}-score.json').read_bytes()).hexdigest()
    reports.append(report)
    producer.CACHE.clear()
(OUT/'remix-report.json').write_text(json.dumps(reports,indent=2))
