"""Render an airy inward whoosh without pitched oscillators or pulsing."""
from pathlib import Path
import numpy as np
import soundfile as sf
rate=44100
t=np.arange(rate*2)/rate
p=t/2
rng=np.random.default_rng(261)
frequencies=np.fft.rfftfreq(len(t),1/rate)
def air():
    spectrum=np.fft.rfft(rng.normal(0,1,len(t)))
    layers=[]
    for cutoff in [450,850,1500,2400]:
        mask=(1-np.exp(-(frequencies/180)**2))*np.exp(-(frequencies/cutoff)**2)
        layer=np.fft.irfft(spectrum*mask,n=len(t))
        layers.append(layer/np.std(layer))
    position=p*3
    output=np.zeros(len(t))
    for i,layer in enumerate(layers):
        output+=layer*np.maximum(0,1-np.abs(position-i))
    return output
center=air()
side=air()*.12
envelope=np.sin(np.pi*p)**.8*(.3+.7*p)
audio=np.column_stack((center+side,center-side))*envelope[:,None]
audio*=.42/np.max(np.abs(audio))
sf.write(Path(__file__).resolve().parent.parent/'assets/audio/beacon-spiral-ui261.ogg',audio,rate,format='OGG',subtype='VORBIS')
