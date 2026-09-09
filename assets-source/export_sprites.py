"""Editable, deterministic native-pixel production sources. No external images.
Run python assets-source/export_sprites.py to export the runtime sprite atlas.
All coordinates are deliberate source pixels. Transparent padding is preserved.
"""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import json

OUT=Path(__file__).resolve().parents[1]/'public/assets'
OUT.mkdir(parents=True,exist_ok=True)
INK='#252c3d'; SKIN='#c78658'; LIGHT='#e6ac72'; HAIR='#332d37'; TEAL='#538b86'
SHIRTS=['#f0c266','#71bcb1','#d78c98']
def canvas(w,h):
 im=Image.new('RGBA',(w,h));return im,ImageDraw.Draw(im)
def rect(d,b,c): d.rectangle(tuple(int(v) for v in b),fill=c)
def hero(direction='down',frame=0,pose='walk',shirt=0):
 im,d=canvas(24,32); c=SHIRTS[shirt]; phase=[0,1,1,0,-1,-1][frame%6]
 bob=1 if frame in [1,4] and pose in ['walk','run'] else 0
 if pose=='idle':phase=0;bob=frame%2
 y=bob
 if pose=='slide':
  rect(d,(3,24,20,28),INK);rect(d,(7,21,16,26),c);rect(d,(13,19,19,24),SKIN);rect(d,(14,18,19,20),HAIR);rect(d,(3,26,8,28),'#242c3e');rect(d,(16,25,22,27),'#3b4c60');rect(d,(9,23,15,24),'#ffe0a0');return im
 if pose=='stumble':
  d.polygon([(3,20),(10,15),(18,21),(15,28),(8,27)],fill=INK);d.polygon([(6,20),(11,17),(17,22),(13,25),(8,24)],fill=c);rect(d,(14,13,20,19),SKIN);rect(d,(14,12,20,14),HAIR);rect(d,(2,26,10,28),'#35465d');rect(d,(15,26,19,29),'#35465d');return im
 # Feet and trousers retain the grounded footprint at x 7..17, y 24..30.
 leg=phase*2 if pose in ['walk','run'] else phase
 if pose=='jump':leg=2
 rect(d,(7,22+y,10,28+y+max(0,leg)),INK);rect(d,(13,22+y,16,28+y+max(0,-leg)),INK)
 rect(d,(8,22+y,10,27+y+max(0,leg)),'#4d556b');rect(d,(13,22+y,15,27+y+max(0,-leg)),'#3b425b')
 rect(d,(6,28+y+max(0,leg),10,30+y+max(0,leg)),INK);rect(d,(13,28+y+max(0,-leg),17,30+y+max(0,-leg)),INK)
 # Shirt with contrasting side shading and rolled sleeves.
 rect(d,(6,12+y,17,23+y),INK);rect(d,(7,12+y,16,21+y),c);rect(d,(7,14+y,8,21+y),'#d99a56' if shirt==0 else TEAL)
 rect(d,(7,22+y,16,23+y),'#454257');rect(d,(11,22+y,12,23+y),'#c1a16c')
 armL=-phase if direction in ['up','down'] else phase
 rect(d,(4,14+y+armL,6,21+y+armL),INK);rect(d,(5,14+y+armL,6,17+y+armL),c);rect(d,(5,18+y+armL,6,22+y+armL),SKIN)
 rect(d,(17,14+y-armL,19,20+y-armL),INK);rect(d,(17,14+y-armL,18,17+y-armL),c);rect(d,(17,18+y-armL,18,22+y-armL),LIGHT)
 rect(d,(8,3+y,15,11+y),INK);rect(d,(7,5+y,16,9+y),SKIN);rect(d,(9,4+y,15,10+y),LIGHT)
 rect(d,(8,2+y,15,5+y),HAIR);rect(d,(7,4+y,8,7+y),HAIR);rect(d,(9,2+y,13,2+y),'#61505a')
 if direction=='up':rect(d,(8,4+y,15,8+y),HAIR);rect(d,(9,9+y,14,10+y),SKIN)
 elif direction=='left':rect(d,(7,7+y,9,7+y),INK);rect(d,(14,4+y,15,8+y),HAIR)
 elif direction=='right':rect(d,(14,7+y,16,7+y),INK);rect(d,(8,4+y,9,8+y),HAIR)
 else:rect(d,(9,7+y,9,7+y),INK);rect(d,(14,7+y,14,7+y),INK);rect(d,(11,10+y,13,10+y),'#9a5c49')
 # Collar, ID lanyard and diagonal bag strap.
 if direction!='up':
  rect(d,(10,12+y,13,12+y),'#ffe7ba');d.line([(10,13+y),(11,17+y),(13,17+y),(14,13+y)],fill='#466c78');rect(d,(11,17+y,13,19+y),'#f5e9bd')
 d.line([(7,12+y),(15,22+y)],fill='#654939',width=2);rect(d,(15,20+y,20,26+y),INK);rect(d,(16,21+y,20,25+y),'#93654c');rect(d,(17,21+y,19,21+y),'#ba8657')
 if pose in ['cup','sutta']:
  rect(d,(16,15+y,18,18+y),SKIN);rect(d,(18,14+y,21,17+y),'#f8d08e');rect(d,(18,13+y,21,14+y),'#693e34')
  if pose=='sutta':rect(d,(3,15+y,6,15+y),'#e8dfc8');rect(d,(3,15+y,3,15+y),'#d87749')
 return im

animations={}; frames=[]
for shirt in range(3):
 for pose in ['idle','walk','hop']:
  for direction in ['up','down','left','right']:
   start=len(frames)
   for f in range(6):frames.append(hero(direction,f,pose,shirt))
   animations[f'{shirt}-{pose}-{direction}']={'start':start,'end':len(frames)-1}
 for pose in ['run','jump','slide','stumble','cup','sutta']:
  start=len(frames)
  for f in range(6):frames.append(hero('up' if pose in ['run','jump'] else 'down',f,pose,shirt))
  animations[f'{shirt}-{pose}']={'start':start,'end':len(frames)-1}
sheet=Image.new('RGBA',(24*6,32*((len(frames)+5)//6)))
for i,im in enumerate(frames):sheet.paste(im,((i%6)*24,(i//6)*32))
sheet.save(OUT/'hero.png')
(OUT/'animations.json').write_text(json.dumps(animations,indent=2))

def wheels(d,xs,y):
 for x in xs:
  rect(d,(x-3,y-3,x+3,y+3),INK);rect(d,(x-1,y-1,x+1,y+1),'#829190')
def car(kind):
 bus=kind in ['bus','train'];w=92 if bus else 56;im,d=canvas(w,40)
 color={'car':'#6aa096','taxi':'#e5b150','auto':'#3d8f70','bus':'#cd6857','train':'#77a6aa'}[kind]
 if kind=='auto':
  wheels(d,[14,42],31);d.polygon([(7,15),(14,9),(36,9),(47,17),(49,28),(6,28)],fill=INK);rect(d,(8,19,44,28),color);rect(d,(12,9,34,18),'#ebbd63');rect(d,(14,11,32,16),'#e9ca83');rect(d,(36,17,43,22),'#93c6c3');rect(d,(14,20,27,26),'#234c4a');rect(d,(29,20,34,27),'#72ad85');rect(d,(45,23,48,26),'#ffe1a2');rect(d,(9,27,45,29),'#dbab55')
 else:
  wheels(d,[15,w-14],31);d.polygon([(5,17),(12,13),(15,7),(w-21,7),(w-12,14),(w-5,17),(w-4,28),(4,28)],fill=INK)
  rect(d,(6,18,w-6,28),color);rect(d,(16,8,w-22,12),color)
  if bus:
   for x in range(13,w-15,12):rect(d,(x,11,x+9,19),'#afd0c1');rect(d,(x,11,x+9,12),'#608689');rect(d,(x,15,x+8,15),'#d1dfc1')
   rect(d,(8,23,w-8,25),'#e8c382');rect(d,(w-17,13,w-9,22),'#456c73')
  else:
   d.polygon([(17,9),(w-23,9),(w-17,15),(12,15)],fill='#a4ceca');d.line([(25,9),(24,15)],fill=INK);rect(d,(12,17,w-16,17),'#bee4ce');rect(d,(24,20,28,20),INK)
  rect(d,(w-7,21,w-4,24),'#ffe6aa');rect(d,(4,21,6,24),'#d78975');rect(d,(7,27,w-7,28),'#3b535a');rect(d,(w-12,26,w-8,27),'#c6d4ba')
  if kind=='taxi':rect(d,(24,5,32,7),INK);rect(d,(25,5,31,6),'#f5d17b')
 return im
for kind in ['car','taxi','auto','bus','train']:car(kind).save(OUT/(kind+'.png'))
def small(kind,frame=0):
 im,d=canvas(40,40)
 if kind in ['scooter','bike','bicycle','parked']:
  wheels(d,[9,30],31);d.line([(9,29),(17,23),(28,30),(9,29),(15,18)],fill='#a2baad',width=2)
  if kind!='bicycle':rect(d,(12,23,28,29),'#f0b763' if kind=='scooter' else '#b87d83');rect(d,(26,19,29,27),'#8db9b0');rect(d,(26,19,30,20),'#f7d488')
  d.line([(29,27),(27,16),(31,16)],fill=INK,width=2)
  if kind!='parked':
   rect(d,(15,16,21,22),'#6bb4af');rect(d,(16,11,21,16),SKIN);rect(d,(15,10,22,12),'#3b4359');d.line([(18,21),(22,25),(24,29)],fill=INK,width=3);d.line([(20,17),(25,19),(28,17)],fill=SKIN,width=2)
 if kind=='cow':
  rect(d,(7,19,27,29),INK);rect(d,(8,18,27,26),'#d3c9ad');rect(d,(9,20,17,25),'#796e63');rect(d,(21,22,26,26),'#9d8d71');rect(d,(8,27,11,34),INK);rect(d,(22,27,25,34),INK);rect(d,(28,14,35,25),'#d3c9ad');rect(d,(29,22,36,25),'#a8947e');rect(d,(32,17,32,18),INK);rect(d,(27,12,28,16),'#f0dec0');rect(d,(35,12,36,15),'#f0dec0');d.line([(6,20),(4,26),(3+frame%2,28)],fill='#9a8b79',width=1)
 if kind=='cart':
  wheels(d,[9,30],33);rect(d,(5,22,34,30),INK);rect(d,(6,22,33,27),'#b37b51');rect(d,(7,24,32,25),'#ddaa6b');
  for x in range(8,32,5):rect(d,(x,17+(x%3),x+3,22),'#83944e');rect(d,(x,17+(x%3),x+2,18+(x%3)),'#b0bc67')
  d.line([(33,25),(38,25)],fill=INK,width=2)
 if kind=='pedestrian':im.alpha_composite(hero('right',frame,'walk',2),(8,5))
 if kind=='crate':
  rect(d,(7,20,32,34),INK);rect(d,(8,20,31,31),'#b88559');rect(d,(8,17,29,20),'#ddb475');rect(d,(10,23,29,25),'#5d4944');d.line([(10,29),(28,21)],fill='#e5b776',width=2)
 if kind=='banner':
  rect(d,(2,7,5,35),INK);rect(d,(35,7,38,35),INK);rect(d,(2,5,38,15),INK);rect(d,(4,6,36,13),'#e9bb60')
  for x in range(5,35,8):d.polygon([(x,6),(x+4,6),(x,13),(x-4,13)],fill='#675148')
  rect(d,(4,16,5,33),'#819c8c');rect(d,(35,16,36,33),'#819c8c')
 if kind=='drain':
  d.polygon([(4,18),(30,16),(36,32),(7,35)],fill='#dfb365');d.polygon([(8,20),(28,19),(31,30),(10,32)],fill='#192d39');
  for x in range(5,31,8):d.line([(x,18),(x+3,21)],fill=INK,width=2);d.line([(x+3,31),(x+5,34)],fill=INK,width=2)
 return im
for kind in ['scooter','bike','bicycle','parked','cow','cart','pedestrian','crate','banner','drain']:
 atlas=Image.new('RGBA',(40*2,40))
 for f in range(2):atlas.alpha_composite(small(kind,f),(f*40,0))
 atlas.save(OUT/(kind+'.png'))
# UI pickup, source pixel cup and steam frames.
cup=Image.new('RGBA',(16*4,20))
for f in range(4):
 im,d=canvas(16,20);rect(d,(4,9,11,15),INK);rect(d,(5,9,10,14),'#efc36c');rect(d,(4,8,11,9),'#70473b');rect(d,(11,10,13,13),'#e4b567');rect(d,(4,16,12,16),'#cba364');d.line([(7,6),(6+f%2,4),(8,2)],fill='#e5d3a4');cup.alpha_composite(im,(16*f,0))
cup.save(OUT/'cup.png')
# Six-frame clock-out vignette: laptop closes, the worker stretches, bag collected.
office=Image.new('RGBA',(80*6,64))
for f in range(6):
 im,d=canvas(80,64)
 rect(d,(8,44,70,48),'#283941');rect(d,(13,46,16,62),'#344650');rect(d,(63,46,66,62),'#344650')
 im.alpha_composite(hero('down',f,'idle' if f<3 else 'walk'),(28+max(0,f-3)*5,11))
 if f<4:
  rect(d,(11,35,68,40),'#976f50');rect(d,(11,35,68,36),'#cea877');rect(d,(15,40,18,62),'#6b5548');rect(d,(60,40,63,62),'#6b5548')
  height=[13,10,6,2][f];rect(d,(29,34-height,49,34),'#293e48');rect(d,(31,min(32,36-height),47,32),'#73a9a5' if f<2 else '#466b72');rect(d,(27,34,51,36),'#a9b9a9');rect(d,(37,35,42,35),'#6c8b8a')
 else:
  rect(d,(11,35,31,40),'#976f50');rect(d,(12,33,31,35),'#849d9b')
  if f==4:rect(d,(32,24,35,29),SKIN);rect(d,(51,24,54,29),SKIN)
 office.alpha_composite(im,(f*80,0))
office.save(OUT/'office-sequence.png')
# A curated preview sheet for source QA, not shipped as a game image.
contact=Image.new('RGBA',(480,288),'#34434b')
for i,pose in enumerate(['idle','walk','hop','run','jump','slide','stumble','cup','sutta']):
 for f in range(6):contact.alpha_composite(hero('down' if i<3 else 'up',f,pose),(i*48,f*40))
contact.resize((960,576),Image.Resampling.NEAREST).save(Path(__file__).parent/'animation-contact.png')
print(f'Exported {len(frames)} hero frames, 15 hazard sprites, cup animation and editable sources.')
