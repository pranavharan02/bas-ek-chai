"""Render a lossless audition master of the original runtime composition.
This file preserves the score and deterministic synthesis, not a recording of
someone else's track. The browser plays the same score through Web Audio.
"""
import json,math,wave
from pathlib import Path
import numpy as np
p=Path(__file__).parent;score=json.loads((p/'music-score.json').read_text());sr=22050
step=60/score['bpm']/4;length=64*step;audio=np.zeros(int(length*sr),dtype=np.float64)
def tone(midi,start,duration,volume,triangle=False):
 n=int(duration*sr);t=np.arange(n)/sr;freq=440*2**((midi-69)/12)
 signal=(2/np.pi*np.arcsin(np.sin(2*np.pi*freq*t))) if triangle else np.sin(2*np.pi*freq*t)
 env=np.minimum(t/.008,1)*np.exp(-t/(duration/7));indices=(np.arange(n)+int(start*sr))%len(audio)
 np.add.at(audio,indices,signal*env*volume)
for i,note in enumerate(score['melody']):
 if note is not None:tone(score['tonicMidi']+note,i*step,step*2.4,.13,True)
 if i%4==0:tone(score['tonicMidi']+score['bass'][i//8]-12,i*step,step*3.7,.23)
 if i%16==0:
  for n in score['chords'][i//16]:tone(score['tonicMidi']+n,i*step,step*13,.025)
 if i%4==0:tone(33,i*step,.13,.13)
 if i%4==2:tone(117,i*step,.025,.016,True)
audio*=.65
with wave.open(str(p/'the-long-way-master.wav'),'wb') as out:
 out.setnchannels(1);out.setsampwidth(2);out.setframerate(sr);out.writeframes((np.clip(audio,-1,1)*32767).astype('<i2').tobytes())
report={'sampleRate':sr,'durationSeconds':length,'peak':float(np.max(np.abs(audio))),'rms':float(np.sqrt(np.mean(audio**2))),'clippedSamples':int(np.sum(np.abs(audio)>=1)),'loopBoundaryDelta':float(abs(audio[0]-audio[-1])),'listeningStatus':'Headphone, phone-speaker and ten-seam listening tests pending; numerical checks are not listening evidence.'}
(p/'music-analysis.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
