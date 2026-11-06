"""Render the two-second inward swirl, timed to the beacon spiral at 1.3x."""
from pathlib import Path
import numpy as np
import soundfile as sf
rate=44100
t=np.arange(rate*2)/rate
p=t/2
rng=np.random.default_rng(260)
noise=rng.normal(0,1,len(t))
soft=np.convolve(noise,np.ones(12)/12,mode='same')
phase=2*np.pi*(180*t+170*t*t)
swirl=(.15*soft+.08*np.sin(phase)+.035*np.sin(phase*1.502))*(.72+.28*np.cos(2*np.pi*(2*t+1.8*t*t)))
envelope=np.minimum(1,p*8)*np.minimum(1,(1-p)*16)*(.45+.55*p)
mono=swirl*envelope
pan=.18*np.sin(2*np.pi*(1.1*t+.5*t*t))
audio=np.column_stack((mono*(1-pan),mono*(1+pan)))
audio*=.64/np.max(np.abs(audio))
sf.write(Path(__file__).resolve().parent.parent/'assets/audio/beacon-spiral-ui260.ogg',audio,rate,format='OGG',subtype='VORBIS')
