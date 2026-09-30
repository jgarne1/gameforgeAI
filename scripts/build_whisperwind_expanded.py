"""Deterministic concept-led scene authoring. Does not mutate persistent data."""
from pathlib import Path
import json, math, random, copy
ROOT=Path(__file__).resolve().parents[1]
DIR=ROOT/'public/assets/worlds'
baseline=ROOT/'docs/design/archive/whisperwind_waterfront_v1.json'
old=json.loads((baseline if baseline.exists() else DIR/'whisperwind_hd_waterfront.json').read_text(encoding='utf-8-sig'))
cat={a['id']:a for a in json.loads((DIR/'world_asset_catalog.json').read_text())['assets']}
bridge=json.loads((ROOT/'public/assets/whisperwind_hd/stone_bridge_integrated_v3/metadata.json').read_text(encoding='utf-8'))
sc={k:copy.deepcopy(old[k]) for k in ['playerPack','time','lighting','groundSkin','groundMaterial','waterMaterial']}
sc.update(id='whisperwind_hd_expanded',townId='whisperwind_hd_waterfront',name='Whisperwind · River and Lanterns',layoutVersion=2,previewOnly=True,size={'w':9200,'h':7400},spawn={'x':3300,'y':3700,'face':'up'},objects=[],hotspots=[],paths=[],plazas=[],blockers=[],collisions=[],npcs=[],ambient=[],groundPatches=[],paint={'terraces':[],'groundDabs':[]},terrain={'water':[],'crossings':[]},walkable=[{'id':'town','points':[[180,250],[8980,250],[8980,7250],[180,7250]]}])
sc['layers']=[{'id':id,'label':id.title(),'visible':True} for id in ['terrain','structures','buildings','props','canopy','foreground','gameplay']]
def obj(id,asset,x,y,scale=1,layer='props',collide=None,**extra):
 o=dict(id=id,asset=asset,x=x,y=y,scale=scale,layer=layer,**extra)
 if collide:o['collide']=collide
 sc['objects'].append(o);return o
def smooth(points,steps=10):
 out=[]
 for i in range(len(points)-1):
  p0=points[max(0,i-1)];p1=points[i];p2=points[i+1];p3=points[min(len(points)-1,i+2)]
  for n in range(steps):
   t=n/steps;out.append([round(.5*((2*p1[k])+(-p0[k]+p2[k])*t+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*t*t+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*t*t*t),1) for k in [0,1]])
 return out+[list(points[-1])]
def planned_street(points,width):
 """Straight runs with short, intentional corner easements; no spline overshoot."""
 if len(points)<2:return [list(p) for p in points]
 knots=[list(points[0])]
 for a,b,c in zip(points,points[1:],points[2:]):
  incoming=[b[0]-a[0],b[1]-a[1]];outgoing=[c[0]-b[0],c[1]-b[1]]
  il=math.hypot(*incoming);ol=math.hypot(*outgoing)
  if not il or not ol:continue
  u=[v/il for v in incoming];v=[q/ol for q in outgoing]
  if u[0]*v[0]+u[1]*v[1]>.997:knots.append(list(b));continue
  r=min(width*.55,95,il*.22,ol*.22)
  start=[b[k]-u[k]*r for k in (0,1)];end=[b[k]+v[k]*r for k in (0,1)]
  knots.append(start)
  for t in (.25,.5,.75,1):knots.append([(1-t)**2*start[k]+2*(1-t)*t*b[k]+t*t*end[k] for k in (0,1)])
 knots.append(list(points[-1]))
 out=[]
 for a,b in zip(knots,knots[1:]):
  n=max(1,math.ceil(math.dist(a,b)/85))
  out.extend([[round(a[k]+(b[k]-a[k])*i/n,1) for k in (0,1)] for i in range(n)])
 return out+[[round(q,1) for q in knots[-1]]]
def road(id,points,width=150):
 sc['paths'].append({'id':id,'points':planned_street(points,width),'width':width,'kind':'lane'})
def ellipse(cx,cy,rx,ry,n=40):return [[round(cx+rx*math.cos(i*math.tau/n),1),round(cy+ry*math.sin(i*math.tau/n),1)] for i in range(n)]
def hot(id,x,y,label,message='',**extra):
 h=dict(id=id,x=x,y=y,label=label,r=85,message=message);h.update(extra);h.setdefault('type','message');sc['hotspots'].append(h);return h
river=[[6100,2050],[5550,2420],[5000,2850],[4900,3400],[5050,4000],[4780,4800],[5000,5600],[4600,6300],[4200,6900],[4000,7400]]
center=smooth(river)
sc['terrain']['water']=[{'id':'orchard_lake','points':ellipse(6930,1820,1230,720),'blocksWalking':True,'material':{'calm':True,'speed':.7,'tileSize':850}}, {'id':'river','points':[[x-220,y] for x,y in center]+[[x+220,y] for x,y in reversed(center)],'blocksWalking':True}]
def riverx(y):
 for (x1,y1),(x2,y2) in zip(center,center[1:]):
  if y1<=y<=y2:return x1+(x2-x1)*(y-y1)/(y2-y1)
 return center[-1][0]
for name,y in [('north',3000),('market',4800),('quay',6300)]:
 x=riverx(y)
 assembly=bridge['assembly']
 sc['terrain']['crossings'].append({'id':name+'_bridge','origin':[x,y],'points':[[x+px,y+py] for px,py in assembly['floorPolygonLocal']],'assembly':'stone_bridge_integrated_v3'})
 obj(name+'_integrated_bridge',bridge['assets'][0]['id'],x,y,layer='structures')
 for rail in assembly['railLinesLocal']:
  for i,(p,q) in enumerate(zip(rail['points'],rail['points'][1:])):
   dx,dy=q[0]-p[0],q[1]-p[1];length=math.hypot(dx,dy);nx,ny=-dy/length*18,dx/length*18
   sc['blockers'].append({'id':name+'_'+rail['side']+'_rail_'+str(i),'points':[[x+p[0]+nx,y+p[1]+ny],[x+q[0]+nx,y+q[1]+ny],[x+q[0]-nx,y+q[1]-ny],[x+p[0]-nx,y+p[1]-ny]]})
 line=[[x+px,y+py] for px,py in assembly['centerlineLocal']]
 road(name+'_crossing',[[line[0][0]-180,line[0][1]],*line,[line[-1][0]+180,line[-1][1]]],162)
sc['plazas']=[{'id':'commonlight','points':ellipse(3300,3550,650,490),'center':[3300,3550],'radius':315}]
# Each district has a legible loop and a shortcut; bridge approaches meet flat toes.
wn=(riverx(3000)-1194,3179.275);wm=(riverx(4800)-1194,4979.275);wq=(riverx(6300)-1194,6479.275)
en=(riverx(3000)+1201,3179.275);em=(riverx(4800)+1201,4979.275);eq=(riverx(6300)+1201,6479.275)
road('hill_homes_loop',[(600,1220),(1500,1250),(3000,1250),(3300,1480),(3150,1720),(1800,1720),(600,1720),(600,1220)],140)
road('lantern_stair_lane',[(1700,1100),(1800,1720),(1800,2250),(1760,2570)],155)
road('orchard_park_loop',[(1800,2250),(1180,2250),(1050,2440),(1300,2700),(1800,2750),(2350,2800),(1760,2570),(1800,2250)],125)
road('park_to_civic_stairs',[(2350,2800),(2850,2740),(3300,2790),(3300,3304),(3300,3550)],175)
road('market_high_street',[(3300,3550),(2400,3800),(1200,3900),(1100,4650),(1800,5100),(2600,5100),(3300,4450),(3300,3550)],185)
road('market_west_passage',[(1200,3900),(850,3650),(1050,3550),(1700,3600),(2400,3800)],135)
road('market_to_quay',[(1800,5100),(1700,5500),(2300,5650),(2300,6350),(2350,6950)],160)
road('market_south_shortcut',[(2600,5100),(2300,5650),(2300,6350)],140)
road('west_riverwalk',[wn,(3850,3800),(3800,4450),wm,(3650,5650),wq],160)
road('north_connection',[(3300,3550),(3150,3300),(3200,3179),wn],185)
road('market_bridge_lane',[(3300,4450),wm],150)
road('quay_bridge_lane',[(2300,6350),wq],160)
road('east_riverwalk',[en,(5700,3750),(5700,4300),em,(5600,5550),(5600,6150),eq],160)
road('east_garden_ring',[en,(7600,3130),(8750,3550),(8750,5200),(8750,6300),(8400,7040),(6400,7040),eq],165)
road('east_north_homes',[(5700,3950),(6800,3950),(7500,3980),(8300,4310),(8750,4450)],145)
road('east_market_homes',[em,(6800,4990),(7600,4990),(8300,5250),(8750,5250)],145)
road('east_south_homes',[(5600,6100),(6800,6120),(7600,6120),(8400,6290),(8750,6300)],145)
road('east_quay_homes',[eq,(6000,6800),(6700,6900),(7600,7000),(8400,7040)],145)
road('east_garden_walk',[(6900,4990),(7120,5400),(7350,5750),(7600,6120)],105)
road('south_orchard_walk',[(6800,6120),(7180,6600),(7600,7000)],100)
road('lake_mansion_trail',[en,(6200,2700),(7500,2700),(8400,2400),(8600,1600),(8220,1120)],120)
road('fairground_promenade',[(3300,1480),(3600,1450),(3900,1480),(4200,1700),(4300,2130),(5290,2210),(4750,2510),(3900,2600),(3300,2790)],165)
road('fairground_shortcut',[(4200,1700),(4490,1920),(4300,2130)],115)
road('zoo_walk',[(2350,6950),(1930,7020),(1300,7020),(520,7020)],155)
road('zoo_quay_access',[(2300,6350),(2090,6680),(1930,7020)],125)

def coaster_track(knots,steps=14):
 """Sample a closed 3D Catmull-Rom course; cart and rails share these points."""
 out=[];count=len(knots)
 for i in range(count):
  a,b,c,d=(knots[(i+j)%count] for j in (-1,0,1,2))
  for n in range(steps):
   t=n/steps
   out.append(dict(zip(('x','y','z'),[round(.5*(2*b[k]+(-a[k]+c[k])*t+(2*a[k]-5*b[k]+4*c[k]-d[k])*t*t+(-a[k]+3*b[k]-3*c[k]+d[k])*t*t*t),1) for k in range(3)])))
 return out+[out[0].copy()]

sc['attractions']={
 'coaster':{'id':'lantern_run','name':'Lantern Run','station':{'x':4380,'y':1360},'stationSprite':{'src':'/assets/whisperwind_hd/fairground_v1/lantern_run_station.png','x':3650,'y':1045,'w':720,'h':475},'queue':{'x':3790,'y':1350,'w':270,'h':225},
            'boarding':{'x':4160,'y':1600},'exit':{'x':4250,'y':1680},'dwellSeconds':8,'travelSeconds':23,
            'cartSprite':{'src':'/assets/whisperwind_hd/fairground_v2/lantern_cart.png','w':160,'h':108},
            'tunnel':{'x':4610,'y':425,'rx':290,'ry':145,'sprite':'/assets/whisperwind_hd/fairground_v3/two_mouth_grotto.png','w':600,'h':295},
            'track':coaster_track([(4380,1360,25),(4700,1390,35),(5060,1470,70),(5390,1280,135),(5480,900,205),(5320,620,170),(4950,545,115),(4820,540,115),(4400,540,115),(4120,600,115),(3930,800,135),(3990,950,125),(4320,990,105),(4560,980,90),(4700,1070,70),(4600,1140,50),(4400,1230,30)])},
 'zoo':{'id':'wildlife_garden','sprite':{'src':'/assets/whisperwind_hd/fairground_v1/wildlife_animals.png','sourceRects':{'deer':[0,0,590,887],'capybara':[590,0,640,887],'owl':[1230,0,544,887]}},'pens':[
   {'id':'deer_meadow','name':'Deer Meadow','animal':'deer','x':350,'y':6350,'w':420,'h':460,'seed':1},
   {'id':'capybara_pool','name':'Capybara Pool','animal':'capybara','x':955,'y':6350,'w':420,'h':460,'seed':3},
   {'id':'owl_grove','name':'Owl Grove','animal':'owl','x':1440,'y':6350,'w':420,'h':460,'seed':5}]}}
hot('lantern_run_board',4160,1600,'Board Lantern Run',type='coaster',r=150,message='The cart waits at the station before each circuit.')
hot('fairground_board',4380,2110,'Fairground Chronicle','The river festival is growing. The Lantern Run is open; this green is kept clear for more rides and stalls.')
for pen in sc['attractions']['zoo']['pens']:
 hot(pen['id']+'_sign',pen['x']+pen['w']/2,6905,pen['name'],f"The {pen['animal']} is cared for at Whisperwind's little wildlife garden.")
 for n,(xx,yy) in enumerate([(pen['x']+55,pen['y']+100),(pen['x']+pen['w']-55,pen['y']+250)]):obj(pen['id']+'_shrub_'+str(n),'wwhd_nature_shrub',xx,yy,scale=.75)
 for x,y,w,h in [(pen['x']-9,pen['y']-9,18,pen['h']+18),(pen['x']+pen['w']-9,pen['y']-9,18,pen['h']+18),(pen['x'],pen['y']-9,pen['w'],18),(pen['x'],pen['y']+pen['h']-9,pen['w'],18)]:
  sc['blockers'].append({'id':pen['id']+'_fence_'+str(len(sc['blockers'])),'x':x,'y':y,'w':w,'h':h})
for x,y in [(3870,1260),(4280,740),(4930,560),(5430,830),(5450,1280),(5010,1430)]:
 sc['collisions'].append({'id':'coaster_support_'+str(x),'x':x-15,'y':y-15,'w':30,'h':30})
sc['collisions'].append({'id':'coaster_ticket_booth','x':3665,'y':1330,'w':135,'h':175})
for x,y,w,h in [(3780,1340,12,245),(4052,1340,12,245)]:sc['blockers'].append({'id':'queue_rail_'+str(x),'x':x,'y':y,'w':w,'h':h})
for i,(x,y) in enumerate([(4490,2260),(4960,2360)]):obj('fair_stall_'+str(i),'wwhd_stall',x,y,collide=[-70,-60,140,55])
home_positions=[(800,1030),(1480,1110),(2180,980),(2900,1100),(800,1610),(1440,1740),(2360,1590),(3050,1670), (6100,3560),(6820,3420),(7500,3600),(8300,3950),(6250,4400),(6980,4600),(7690,4460),(8270,4850), (6100,5520),(6830,5640),(7560,5480),(8270,5860),(6010,6420),(6800,6600),(7550,6460),(8300,6700)]
for i,(x,y) in enumerate(home_positions,1):
 source=copy.deepcopy(next(o for o in old['objects'] if o.get('plotId')==f'town_home_{i:02d}'))
 h=copy.deepcopy(next(h for h in old['hotspots'] if h.get('plotId')==source['plotId']))
 dx=h['x']-source['x'];dy=h['y']-source['y'];source.update(x=x,y=y);sc['objects'].append(source);h.update(x=x+dx,y=y+dy);sc['hotspots'].append(h)
 # Branch reaches the real threshold rather than stopping at the building center.
 candidates=[pt for p in sc['paths'] if not p['id'].startswith('home_approach') for pt in p['points'] if pt[1]>h['y']+75]
 target=min(candidates,key=lambda pt:math.hypot(pt[0]-h['x'],pt[1]-h['y']))
 road('home_approach_'+str(i),[(h['x'],h['y']),(h['x'],h['y']+70),target],90)
for name,y,xs in [('west_npc',3300,[800,1450]),('market_npc',4530,[700,1750]),('quay_npc',5900,[850,1500])]:
 for j,x in enumerate(xs):
  asset='wwhd_cottage_right' if j else 'wwhd_cottage_roof_moss'
  a=cat[asset];o=obj(name+str(j),asset,x,y,layer='buildings',collide=[-155,-105,285,100],npcResidence=True)
  dx,dy=a.get('door',{}).get('approachOffsetWorld',[-20,40]);hot(o['id']+'_door',x+dx,y+dy,'A resident’s home','A family lives here. Their address is part of Whisperwind, and is not for sale.')
  candidates=[pt for p in sc['paths'] if not p['id'].startswith('home_approach') and not p['id'].endswith('_lane') for pt in p['points'] if pt[1]>y+dy+50]
  endpoint=min(candidates,key=lambda pt:math.hypot(pt[0]-x-dx,pt[1]-y-dy))
  road(o['id']+'_lane',[(x+dx,y+dy),(x+dx,y+100),endpoint],100)
landmarks={'tavern':(2200,3300),'pet_center':(1400,2650),'bakery':(2600,4080),'fishing_shop':(2100,6230),'echo_hall':(3570,2680),'lantern_inn':(6530,4830),'old_lake_mansion':(8170,1080)}
for id,(x,y) in landmarks.items():
 o=copy.deepcopy(next(o for o in old['objects'] if o['id']==id));dx=x-o['x'];dy=y-o['y'];o.update(x=x,y=y);sc['objects'].append(o)
 right={'tavern':'wwhd_tavern_right','fishing_shop':'wwhd_fishing_shop_right','lantern_inn':'wwhd_apartment_inn_right'}.get(id)
 if right:o['asset']=right;o['collide']=[-190,-150,290,115]
 for h0 in old['hotspots']:
  if (id=='old_lake_mansion' and h0['id']=='old_mansion_door') or h0['id']=={'lantern_inn':'inn_door','echo_hall':'echo_hall_door'}.get(id,id+'_door'):
   h=copy.deepcopy(h0);h['x']+=dx;h['y']+=dy
   if right:offset=cat[right]['door']['approachOffsetWorld'];h.update(x=x+offset[0],y=y+offset[1])
   sc['hotspots'].append(h)
   public=[p for p in sc['paths'] if not p['id'].startswith('home_approach') and not p['id'].endswith('_approach')]
   candidates=[pt for p in public for pt in p['points'] if pt[1]>h['y']+40]
   endpoint=min(candidates,key=lambda pt:math.hypot(pt[0]-h['x'],pt[1]-h['y']))
   road(id+'_approach',[(h['x'],h['y']),(h['x']+35,h['y']+70),endpoint],110)
 for a0 in old['ambient']:
  if id=='pet_center' and a0['type']=='windowPet':
   a=copy.deepcopy(a0);a['x']+=dx;a['y']+=dy
   if a['pet']=='dog':a['x']=x-28;a['y']=y-253;a['w']=26;a['h']=34
   sc['ambient'].append(a)
obj('heart_fountain','wwhd_river_fountain',3300,3520,collide=[-125,-120,250,115]);sc['ambient'].append({'type':'fountain'})
obj('chronicle_board','wwhd_noticeboard',3530,3710,collide=[-48,-30,96,25]);hot('town_board',3530,3745,'Chronicle Board and Town Guide',type='townGuide')
for i,(x,y) in enumerate([(2880,3480),(3710,3480),(3080,3890),(3520,3890),(7100,2700),(1770,2450),(2850,6630)]):obj('view_bench_'+str(i),'wwhd_river_bench',x,y,collide=[-65,-25,130,24])
for i,(x,y) in enumerate([(2730,3580),(3900,3560),(3070,3150),(3560,3150)]):obj('square_stall_'+str(i),'wwhd_stall',x,y,collide=[-70,-60,140,55])
# Playground: chamfered sandy clearing, two open approaches, furniture off the walkway.
sc['groundPatches']=[{'id':'playground_sand','points':[[1280,2080],[1420,1970],[2140,2010],[2340,2200],[2290,2490],[2000,2590],[1380,2530],[1250,2330]],'material':old['groundPatches'][0]['material']}]
for id,asset,x,y,c in [('park_slide','wwhd_playground_slide',1450,2430,[-60,-22,115,20]),('garden_climber','wwhd_playground_jungle_gym',1500,2200,None),('park_swing','wwhd_playground_swing',2110,2280,None),('garden_seesaw','wwhd_seesaw',1950,2440,[-60,-20,120,20]),('park_gate_left','wwhd_playground_entrance_left',1645,2570,[-35,-12,70,18]),('park_gate_right','wwhd_playground_entrance_right',1875,2570,[-35,-12,70,18])]:obj(id,asset,x,y,collide=c)
for i,(x,y) in enumerate([(1420,2180),(1570,2180),(1460,2125),(1550,2125),(2025,2260),(2180,2260)]):sc['collisions'].append({'id':'park_support_'+str(i),'x':x,'y':y,'w':16,'h':18})
road('park_gate_approach',[(1760,2570),(1850,2690),(2350,2800)],120)
road('park_orchard_approach',[(1320,2100),(1040,2110),(650,1900)],100)
hot('playground',1760,2590,'Orchard Playground','The neighbors built this playground from reclaimed ferry timber. The wide gate is always open.')
# A matching stair corridor in each retaining wall, with proper top and bottom landings.
for id,x0,x1,y,gap in [('lantern',550,3530,1860,1800),('civic',2620,4020,2910,3300)]:
 base_y=y+60;lower_y=base_y+223.84341637010678;upper_y=base_y-100
 sc['paint']['terraces'].append({'id':id,'points':[[x0, y-680],[x1+393,y-680],[x1+393,base_y-202],[x1+275,upper_y],[x0,upper_y]],'fill':'#45623c','height':100})
 for start,end in [(x0,gap-150),(gap+150,x1)]:
  x=start
  while x<end:
   width=min(636.9565,end-x);asset='wwhd_terrace_wall_straight'
   if x==x0:asset='wwhd_terrace_wall_end';width=min(261.8736,end-x)
   a=cat[asset];native=636.9565 if asset.endswith('straight') else 261.8736
   obj(id+'_wall_'+str(x),asset,x,base_y,layer='structures',w=a['displaySize']['w']*width/native)
   sc['blockers'].append({'id':id+'_face_'+str(x),'x':x,'y':upper_y+4,'w':width,'h':96});x+=width
 obj(id+'_outer_corner','wwhd_terrace_wall_outer_corner',x1+275.3333,base_y,layer='structures')
 sc['blockers'].append({'id':id+'_corner_face','points':[[x1,upper_y],[x1+275,upper_y],[x1+393,base_y-202],[x1+393,base_y-102],[x1+275,base_y],[x1,base_y]]})
 obj(id+'_stairs','wwhd_terrace_stairs',gap,lower_y,layer='structures')
 obj(id+'_upper_landing','wwhd_terrace_landing',gap,upper_y,layer='structures')
 obj(id+'_lower_landing','wwhd_terrace_landing',gap,lower_y+20,layer='structures')
 road(id+'_stairs_landings',[(gap,upper_y-80),(gap,lower_y+110)],195)
 for x in [gap-145,gap+110]:sc['blockers'].append({'id':id+'_rail_'+str(x),'x':x,'y':upper_y-25,'w':35,'h':lower_y-upper_y+45})
obj('lake_pier','wwhd_timber_pier',7140,2640,layer='structures');hot('orchard_lake_shore',7100,2730,'Orchard Lake','Small fish flicker among the reeds. River Tackle can guide you to the working fishing dock; lake catches will come later.')
obj('dock','wwhd_dock',2350,6930,layer='structures');hot('woods_path',2350,6950,'Go Fishing · Shadow Woods',type='door',targetScene='shadow_woods_dock');road('fishing_dock',[(2300,6350),(2350,6690),(2350,6950)],180)
hot('old_mark',2520,6700,'The old dock mark','The broken-circle hammer mark was carved before the flood. The builders still use it when they set the first stone of a new home.')
hot('upper_garden',1850,1500,'Lantern Hill overlook','This hill sheltered the ferry families during the flood. The lantern path still leads their children home.')
hot('orchard_letter',1000,2100,'An orchard letter','We planted the trees when the river took our first garden. If you are beginning again, take an apple and stay awhile.')
hot('commonlight_history',2980,3720,'The square inscription','One stone, one welcome. Each household brought a stone to rebuild this square after the flood. There is still room for yours.')
hot('construction_site',2600,2800,'A future address','The builders have marked the ground for a new home. This address is not available for purchase yet.')
obj('construction_board','wwhd_noticeboard',2600,2760,collide=[-40,-25,80,22])
obj('future_house_frame','wwhd_construction_timber_frame',2520,2610,layer='buildings',collide=[-258,-140,425,138],futureAddress=True)
for id,asset,x,y,c in [('site_scaffold','wwhd_construction_scaffold',2740,2580,[-63,-22,126,28]),('site_lumber','wwhd_construction_lumber',2240,2580,[-35,-22,70,28]),('site_stone','wwhd_construction_stone_stack',2220,2700,[-32,-22,64,28]),('site_wheelbarrow','wwhd_construction_wheelbarrow',2750,2700,[-32,-22,64,28]),('site_workbench','wwhd_construction_workbench',2470,2700,[-46,-22,92,28]),('site_fence_west','wwhd_construction_work_fence',2370,2740,[-80,-8,160,12]),('site_fence_east','wwhd_construction_work_fence',2750,2740,[-80,-8,160,12])]:obj(id,asset,x,y,collide=c)
# Short routines occupy intentional clear street pockets, not building footprints.
people=[('npc_mira','Mira','mira',2350,3520,True),('npc_toma','Toma','toma',1740,2710,True),('npc_dockmaster','Dockmaster','dockmaster',2500,6480,True),('npc_innkeeper','Innkeeper','mira',6610,5010,False),('npc_builder','Rowan the builder','dockmaster',2400,3030,False),('npc_gardener','Elin the gardener','mira',1100,2240,False),('npc_neighbor','Ari','toma',7020,3850,False),('npc_quay_resident','Nell','mira',2880,6280,False)]
for id,name,skin,x,y,intro in people:
 original=next((n for n in old['npcs'] if n['id']==id),{})
 points=[{'x':x,'y':y,'wait':5},{'x':x+160,'y':y+15,'wait':7},{'x':x+140,'y':y+100,'wait':5},{'x':x,'y':y+90,'wait':6}]
 chatter={'npc_mira':['The bread is still warm.','Have you seen the lake this morning?'],'npc_toma':['The park gate is always open.','That little dog knows everyone.'],'npc_dockmaster':['The river is running clear today.','Fresh supplies at River Tackle.'],'npc_builder':['This beam needs another brace.','A sturdy home for the next family.'],'npc_gardener':['The flowers like this river soil.','An apple for the road?']}.get(id,['Good morning, neighbor.','The lanterns will be lit by supper.'])
 sc['npcs'].append(dict(id=id,name=name,label='Talk to '+name,skinId=skin,x=x,y=y,r=85,face='down',storyIntro=intro,chatter=chatter,chatterOffset=len(sc['npcs'])*3.7,message=original.get('message','The river brings new faces every season. We are making room for the next family.'),routine={'speed':48,'points':points}))
# Natural banks and curated plant groups. Keep all trunks clear of roads/doors.
def inside(p,poly):
 x,y=p;hit=False
 for a,b in zip(poly,poly[1:]+poly[:1]):
  if (a[1]>y)!=(b[1]>y) and x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:hit=not hit
 return hit
def distseg(x,y,a,b):
 dx=b[0]-a[0];dy=b[1]-a[1];t=max(0,min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy or 1)));return math.hypot(x-a[0]-t*dx,y-a[1]-t*dy)
buildings=[o for o in sc['objects'] if o['layer']=='buildings']
def clearplant(x,y):
 # Keep tree trunks and their overhanging crowns off the complete ramp footprint.
 if any(abs(x-riverx(cy))<1130 and cy-240<y<cy+580 for cy in [3000,4800,6300]):return False
 if 3420<x<5660 and 280<y<2670:return False
 if 350<x<1960 and 6180<y<7180:return False
 if any(inside((x,y),w['points']) for w in sc['terrain']['water']):return False
 if any(inside((x,y),p['points']) for p in sc['groundPatches']+sc['plazas']+sc['terrain']['crossings']):return False
 if any(abs(x-o['x'])<cat[o['asset']]['displaySize']['w']*(o.get('scale',1))/2+80 and -cat[o['asset']]['displaySize']['h']*o.get('scale',1)-80<y-o['y']<200 for o in buildings):return False
 if any(abs(x-riverx(cy))<350 and cy-100<y<cy+400 for cy in [3000,4800,6300]):return False
 if any(math.hypot(x-h['x'],y-h['y'])<160 for h in sc['hotspots']):return False
 if any(distseg(x,y,a,b)<p['width']/2+105 for p in sc['paths'] for a,b in zip(p['points'],p['points'][1:])):return False
 if any(abs(x-n['x'])<290 and abs(y-n['y'])<220 for n in sc['npcs']):return False
 if any(b.get('points') and inside((x,y),b['points']) for b in sc['blockers']):return False
 if any('x' in b and b['x']-120<x<b['x']+b['w']+120 and b['y']-100<y<b['y']+b['h']+100 for b in sc['blockers']):return False
 return True
rng=random.Random(61);trees=[]
for i in range(2300):
 x=rng.randrange(240,8920);y=rng.randrange(450,7140)
 if not clearplant(x,y) or any(math.hypot(x-a,y-b)<165 for a,b in trees):continue
 asset=rng.choice(['wwhd_tree_oak','wwhd_tree_apple','wwhd_tree_cedar','wwhd_tree_willow']);obj('nature_tree_'+str(i),asset,x,y,scale=rng.uniform(.78,1.14),collide=[-16,-16,32,22],sway=True);trees.append((x,y))
 if len(trees)>=360:break
for i in range(170):
 x=rng.randrange(400,8650);y=rng.randrange(650,7000)
 if clearplant(x,y):obj('nature_flowers_'+str(i),'wwhd_nature_shrub' if i%3==0 else 'wwhd_nature_wildflowers',x,y,scale=rng.uniform(.7,1.1))
for i in range(36):
 angle=i*math.tau/36;x=6930+1280*math.cos(angle);y=1820+770*math.sin(angle)
 if clearplant(x,y):obj('lake_bank_'+str(i),'wwhd_nature_riverplants' if i%3 else 'wwhd_shoreline_rocks',round(x),round(y))
for i,(x,y) in enumerate(center[::4]):
 for side in [-1,1]:
  px=x+side*(255+i%3*15)
  if clearplant(px,y):obj('river_bank_'+str(i)+'_'+str(side),'wwhd_nature_riverplants' if i%3 else 'wwhd_shoreline_rocks',round(px),round(y),scale=.9)
for i,p in enumerate(sc['paths']):
 if p['width']<130:continue
 for j in range(5,len(p['points'])-1,13):
  x,y=p['points'][j];a=p['points'][j-1];b=p['points'][j+1];dx=b[0]-a[0];dy=b[1]-a[1];length=math.hypot(dx,dy) or 1
  for side in [-1,1]:
   px=x-dy/length*(p['width']/2+145)*side;py=y+dx/length*(p['width']/2+145)*side
   if clearplant(px,py):obj('lane_plant_'+str(i)+'_'+str(j)+'_'+str(side),'wwhd_nature_shrub' if j%3 else 'wwhd_nature_wildflowers',round(px),round(py),scale=.8)
for i,p in enumerate(sc['paths']):
 if p['width']<150:continue
 for j in range(0,len(p['points']),25):
  x,y=p['points'][j];a=p['points'][max(0,j-1)];b=p['points'][min(len(p['points'])-1,j+1)];dx=b[0]-a[0];dy=b[1]-a[1];length=math.hypot(dx,dy) or 1;offset=p['width']/2+28;x+=-dy/length*offset;y+=dx/length*offset
  if any(inside((x,y),w['points']) for w in sc['terrain']['water']):continue
  if any(math.hypot(x-o['x'],y-o['y'])<155 for o in sc['objects'] if not o['id'].startswith('nature_')):continue
  obj('street_lamp_'+str(i)+'_'+str(j),'wwhd_lamp',round(x),round(y),collide=[-8,-8,16,12])
sc['districts']=[{'id':id,'name':name,'bounds':bounds} for id,name,bounds in [('lantern','Lantern Hill',[400,400,3400,1500]),('orchard','Orchard Gardens',[500,1900,1900,900]),('commonlight','Commonlight Square',[2600,3000,1500,1200]),('market','Market Lanes',[600,3100,2300,2000]),('lake','Orchard Lake',[5600,850,3100,2150]),('eastbank','Eastbank Homes',[5700,3200,3100,1800]),('southgardens','South Gardens',[5500,5300,3300,1700]),('quay','Fishing Quay',[1700,5800,2500,1300])]]
sc['guidePlaces']=[{'name':name,'x':x,'y':y} for name,x,y in [('Commonlight Square',3300,3700),('Orchard Playground',1760,2590),('Lantern Run Fairground',4005,1550),('Wildlife Garden',1300,7020),('Lantern Hill',1800,1650),('River Tackle',2075,6280),('Lake Shore',7100,2730),('Old Mansion',8150,1130),('North Bridge',riverx(3200)-500,3200),('Market Bridge',riverx(4800)-500,4800),('Quay Bridge',riverx(6300)-500,6300)]]
sc['spawnPoints']=[{'id':id,'x':x,'y':y,'face':'up'} for id,x,y in [('playground',1760,2650),('fair',4160,1620),('cave',4610,755),('zoo',850,6800),('lake',7100,2730),('mansion',8150,1200),('bridge',riverx(4800)-1100,4977.5),('hill',1800,2000)]]
for id,(x,y) in landmarks.items():
 name={'lantern_inn':'inn','echo_hall':'echo_hall','pet_center':'pet_center','fishing_shop':'fishing_shop','bakery':'market','tavern':'tavern'}.get(id)
 if name:
  door=next(h for h in sc['hotspots'] if h['id']=={'lantern_inn':'inn_door','echo_hall':'echo_hall_door'}.get(id,id+'_door'))
  sc['spawnPoints'].append({'id':'from_'+name,'x':door['x'],'y':door['y']+50,'face':'down'})
(DIR/(sc['id']+'.json')).write_text(json.dumps(sc,indent=2)+'\n')
print(f"Authored {sc['id']}: {len(sc['objects'])} objects, {len(trees)} trees, {len(sc['paths'])} routes. Three measured bridge assemblies.")
