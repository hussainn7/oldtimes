"""Astra art sources. Run with Blender 4.5: blender -b --python art/build_assets.py -- brachiosaurus.
Coordinates below are authored in glTF metres (+Y up), then converted for Blender.
All art is original; exported meshes, rigs and actions are editable in art/source/*.blend.
"""
import bpy, math, random, json, sys
from pathlib import Path
from mathutils import Vector
from mathutils.noise import noise_vector
ROOT=Path(__file__).resolve().parents[1]
random.seed(81)
def co(p): return Vector((p[0],-p[2],p[1]))
def xyz(p): return Vector((p[0],p[2],-p[1]))
def reset():
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
    for data in list(bpy.data.materials): bpy.data.materials.remove(data)
    bpy.context.scene.render.fps=24

def mat(name, rough=.84):
    m=bpy.data.materials.new(name);m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=rough
    vc=m.node_tree.nodes.new('ShaderNodeVertexColor');vc.layer_name='Color'
    m.node_tree.links.new(vc.outputs['Color'],bs.inputs['Base Color'])
    return m

def colorize(obj, fn, material):
    if obj.type!='MESH':return
    attr=obj.data.color_attributes.get('Color') or obj.data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT')
    obj.data.color_attributes.active_color=attr
    for v in obj.data.vertices: attr.data[v.index].color=(*fn(xyz(obj.matrix_world@v.co)),1)
    obj.data.materials.clear();obj.data.materials.append(material)

def ell(name,p,s,seg=20,rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg,ring_count=rings,location=co(p));o=bpy.context.object;o.name=name;o.scale=(s[0],s[2],s[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return o

def tube(name,points,radii,sides=12):
    verts=[];faces=[]
    for i,p in enumerate(points):
        t=(Vector(points[min(i+1,len(points)-1)])-Vector(points[max(0,i-1)])).normalized()
        a=t.cross(Vector((0,0,1))).normalized()
        if a.length<.1:a=Vector((1,0,0))
        b=t.cross(a).normalized()
        for j in range(sides):
            angle=j/sides*math.tau;v=Vector(p)+radii[i]*(a*math.cos(angle)+b*math.sin(angle));verts.append(co(v))
        if i:
            for j in range(sides):
                q=i*sides+j;n=i*sides+(j+1)%sides;faces.append((q,n,n-sides,q-sides))
    faces.append(tuple(reversed(range(sides))));faces.append(tuple((len(points)-1)*sides+j for j in range(sides)))
    me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);return o

def join(objects,name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();o=objects[0];o.name=name
    bpy.context.scene.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR');return o

def smooth(o):
    for p in o.data.polygons:p.use_smooth=True

def sculpt(parts,name,voxel=.085,triangles=12000):
    o=join(parts,name);bpy.context.view_layer.objects.active=o
    mod=o.modifiers.new('unified sculpt','REMESH');mod.mode='VOXEL';mod.voxel_size=voxel;bpy.ops.object.modifier_apply(modifier=mod.name)
    mod=o.modifiers.new('surface relaxation','SMOOTH');mod.factor=1.2;mod.iterations=5;bpy.ops.object.modifier_apply(modifier=mod.name)
    mod=o.modifiers.new('triangles','TRIANGULATE');bpy.ops.object.modifier_apply(modifier=mod.name)
    mod=o.modifiers.new('game topology','DECIMATE');mod.ratio=min(1,triangles/max(1,len(o.data.polygons)));bpy.ops.object.modifier_apply(modifier=mod.name);smooth(o);return o

def lerp(a,b,t):return tuple(x*(1-t)+y*t for x,y in zip(a,b))
def skin(p):
    x,y,z=p;n=noise_vector(Vector((x*.6,y*.85,z*.9)))[0]
    # Mineral olive back, warm pale underside, broad broken ochre bands.
    top=(.19,.255,.12);belly=(.43,.40,.23)
    underside=max(0,min(1,(3.5-y)*.5)) if x<2 else max(0,min(1,-z*.22+.1))
    c=lerp(top,belly,underside*.8)
    band=(math.sin(x*3.1+y*.5+n*4)+1)*.5
    c=lerp(c,(.31,.29,.135),max(0,band-.55)*.6)
    return tuple(max(.01,v*(.9+n*.17)) for v in c)

def rig_mesh(meshes,bones,choose):
    arm=bpy.data.armatures.new('expedition skeleton');rig=bpy.data.objects.new('Rig',arm);bpy.context.collection.objects.link(rig)
    bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
    for name,head,tail,parent in bones:
        b=arm.edit_bones.new(name);b.head=co(head);b.tail=co(tail)
        if parent:b.parent=arm.edit_bones[parent]
    bpy.ops.object.mode_set(mode='OBJECT')
    for o in meshes:
        for name,_,_,_ in bones:o.vertex_groups.new(name=name)
        for v in o.data.vertices:
            p=xyz(o.matrix_world@v.co)
            candidates=choose(p)
            # Smooth distance-to-bone blend inside each anatomical region.
            weighted=[]
            for name in candidates:
                bone=next(b for b in bones if b[0]==name);a=Vector(bone[1]);b=Vector(bone[2]);ab=b-a;t=max(0,min(1,(p-a).dot(ab)/max(.001,ab.length_squared)));d=(p-(a+ab*t)).length
                weighted.append((1/max(.08,d)**4,name))
            weighted=sorted(weighted,reverse=True)[:3];total=sum(w for w,_ in weighted)
            for w,name in weighted:o.vertex_groups[name].add([v.index],w/total,'REPLACE')
        mod=o.modifiers.new('skin','ARMATURE');mod.object=rig;o.parent=rig
    return rig

def actions(rig,names,duration,pose):
    rig.animation_data_create()
    for name in names:
        action=bpy.data.actions.new(name);rig.animation_data.action=action
        for frame in range(0,duration+1,4):
            t=frame/duration*math.tau
            for b in rig.pose.bones:
                b.rotation_mode='XYZ';b.rotation_euler=(0,0,0);b.location=(0,0,0)
            pose(name,t,rig)
            for b in rig.pose.bones:b.keyframe_insert('rotation_euler',frame=frame+1)
        track=rig.animation_data.nla_tracks.new();track.name=name;track.strips.new(name,1,action);track.mute=True
    rig.animation_data.action=None
    for b in rig.pose.bones:b.rotation_euler=(0,0,0)
    bpy.context.scene.frame_set(1)

def export(name,folder,metadata):
    out=ROOT/'public/assets'/folder;out.mkdir(parents=True,exist_ok=True)
    bpy.ops.object.select_all(action='SELECT')
    for o in bpy.context.selected_objects:
        if o.type=='MESH':smooth(o)
    bpy.context.scene.frame_set(1)
    src=ROOT/'art/source';src.mkdir(exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(src/f'{name}.blend'),compress=True)
    kwargs=dict(filepath=str(out/f'{name}.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_nla_strips=True,export_frame_range=False,export_skins=True,export_yup=True,export_materials='EXPORT',export_extras=True)
    props=bpy.ops.export_scene.gltf.get_rna_type().properties.keys();kwargs={k:v for k,v in kwargs.items() if k in props}
    bpy.ops.export_scene.gltf(**kwargs)
    count=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in bpy.context.scene.objects if o.type=='MESH')
    metadata.update(scale=1,offsetY=0,rotationY=0,triangles=count,author='Astra original art',source=f'art/source/{name}.blend',materials='vertex-painted PBR; no external textures')
    (out/f'{name}.asset.json').write_text(json.dumps(metadata,indent=2)+'\n')
    print('ASSET_RESULT',name,count,(out/f'{name}.glb').stat().st_size)

def brachiosaurus():
    reset();m=mat('riverstone olive skin')
    parts=[ell('barrel',(-.6,4,0),(3.1,1.75,1.4)),ell('shoulders',(1.25,4.55,0),(1.75,1.75,1.35)),ell('haunch',(-2.65,3.8,0),(1.3,1.35,1.25))]
    neck=[(1.45,4.6,0),(1.85,5.8,0),(2.25,6.9,0),(2.8,8,0),(3.35,8.95,0),(3.9,9.45,0),(4.35,9.65,0)]
    parts.append(tube('neck',neck,[1.12,.91,.70,.55,.4,.3,.26],20))
    parts += [ell('skull',(4.52,9.72,0),(.59,.39,.32)),ell('muzzle',(4.92,9.58,0),(.45,.23,.29)),ell('jaw',(4.8,9.38,0),(.48,.15,.26))]
    tail=[(-2.9,3.85,0),(-4.4,3.8,0),(-6.3,3.2,.08),(-8.4,2.55,.2),(-10.6,2.45,.35),(-12.6,2.7,.45),(-14,3,.52)]
    parts.append(tube('tail',tail,[.92,.65,.43,.26,.14,.075,.014],14))
    bones=[('root',(0,1,0),(0,2,0),None),('hips',(-2.5,3.8,0),(-.3,4.1,0),'root'),('chest',(-.3,4.1,0),(1.45,4.6,0),'hips')]
    for i in range(len(neck)-1):bones.append((f'neck{i}',neck[i],neck[i+1],'chest' if i==0 else f'neck{i-1}'))
    bones.append(('head',neck[-1],(5.15,9.6,0),'neck5'))
    bones.append(('jaw',(4.3,9.4,0),(5.2,9.4,0),'head'))
    for i in range(len(tail)-1):bones.append((f'tail{i}',tail[i],tail[i+1],'hips' if i==0 else f'tail{i-1}'))
    for side in [-1,1]:
        for front in [True,False]:
            key=('front' if front else 'back')+('L' if side<0 else 'R');x=1.6 if front else -2.7;z=side*1.0
            pts=[(x,4.2 if front else 3.7,z),(x-.12,2.5,z*1.07),(x+.03,1.0,z*1.06),(x+.12,.3,z*1.06)]
            parts.append(tube(key,pts,[.65,.47,.37,.46],16));parts.append(ell('foot',(x+.2,.30,z*1.06),(.59,.30,.5)))
            parts.append(ell('leg muscle',(x-.05,3.25,z),(.76,1.02,.68)))
            for j in range(3):bones.append((f'{key}{j}',pts[j],pts[j+1],('chest' if front else 'hips') if j==0 else f'{key}{j-1}'))
    body=sculpt(parts,'Brachiosaurus',.085,12500);colorize(body,skin,m)
    details=[]
    for side in [-1,1]:
        eye=ell('amber eye',(4.68,9.78,side*.301),(.084,.076,.035),12,8);colorize(eye,lambda p:(.65,.36,.075),m);details.append(eye)
        pupil=ell('pupil',(4.70,9.78,side*.329),(.037,.052,.017),10,6);colorize(pupil,lambda p:(.009,.014,.008),m);details.append(pupil)
        nostril=ell('nostril',(5.14,9.64,side*.18),(.055,.035,.022),10,6);colorize(nostril,lambda p:(.035,.04,.023),m);details.append(nostril)
        line=tube('mouth crease',[(4.6,9.44,side*.273),(4.95,9.44,side*.273),(5.24,9.46,side*.18)],[.018,.015,.008],5);colorize(line,lambda p:(.08,.09,.04),m);details.append(line)
    body=join([body]+details,'Brachiosaurus')
    def choose(p):
        x,y,z=p
        if x<-3.3 and y>1.8:return [f'tail{i}' for i in range(6)]+['hips']
        if x>1.6 and y>5.5:return [f'neck{i}' for i in range(6)]+['head']
        if y<3.25 and abs(z)>.45:
            key=('front' if x>-.2 else 'back')+('L' if z<0 else 'R');return [f'{key}{i}' for i in range(3)]
        return ['hips','chest']
    rig=rig_mesh([body],bones,choose)
    def pose(name,t,r):
        gait=name=='Walk'
        for i,side in enumerate(['L','R']):
            for j,limb in enumerate(['front','back']):
                phase=t+i*math.pi+j*math.pi*.6
                r.pose.bones[f'{limb}{side}0'].rotation_euler.y=math.sin(phase)*(.12 if gait else .005)
                r.pose.bones[f'{limb}{side}1'].rotation_euler.y=max(0,math.sin(phase))*(.12 if gait else 0)
        for i in range(6):
            r.pose.bones[f'neck{i}'].rotation_euler.y=math.sin(t+i*.15)*(.023 if name=='Browse' else .009)
            r.pose.bones[f'tail{i}'].rotation_euler.z=math.sin(t-i*.4)*.032
        r.pose.bones['head'].rotation_euler.z=math.sin(t)*(.15 if name=='Look' else .02)
    actions(rig,['Idle','Walk','Browse','Look'],144,pose)
    export('brachiosaurus','animals',dict(periodIds=['jurassic'],biomes=['jurassic'],species='Brachiosaurus',clips=dict(idle='Idle',walk='Walk',graze='Browse',alert='Look')))

def conifer():
    reset();bark=mat('warm bark',.95);needles=mat('needle mass',.88)
    trunk=tube('trunk',[(0,0,0),(.02,2,0),(-.03,4.5,0),(.01,6.8,0),(0,8.3,0)],[.32,.24,.17,.1,.04],8)
    colorize(trunk,lambda p:(.35+noise_vector(Vector(p))[0]*.08,.28,.18),bark)
    parts=[]
    for i,y,r,h in [(0,2.2,2.0,2.1),(1,3.4,1.75,1.9),(2,4.5,1.45,1.7),(3,5.5,1.15,1.5),(4,6.4,.85,1.3),(5,7.15,.55,1.1),(6,7.75,.3,.9)]:
        bpy.ops.mesh.primitive_cone_add(vertices=8,radius1=r*.9,depth=h,location=co((i%2*.08,y+h*.4,i%3*.05)))
        c=bpy.context.object;c.name=f'layer{i}';parts.append(c)
        for j in range(5):
            a=j*1.25+i*.7;br=r*(.5+(j%2)*.15)
            bpy.ops.mesh.primitive_cone_add(vertices=6,radius1=br*.5,depth=h*.55,location=co((0,y+h*.2,0)))
            t=bpy.context.object;t.rotation_euler=(0,0,a);t.location=co((math.cos(a)*br*.7,y+h*.25,math.sin(a)*br*.7))
            t.rotation_euler.y=.5;parts.append(t)
    bpy.ops.mesh.primitive_cone_add(vertices=6,radius1=.2,depth=.7,location=co((0,8.2,0)));parts.append(bpy.context.object)
    crown=sculpt(parts,'needles',.12,1200)
    colorize(crown,lambda p:(.12+noise_vector(Vector(p))[0]*.1,.28+p[1]*.01,.14),needles)
    snag=tube('snag',[(0,2.2,0),(.8,2.5,.4),(1.3,2.3,.6)],[.08,.05,.02],5);colorize(snag,lambda p:(.32,.25,.16),bark)
    join([trunk,crown,snag],'conifer')
    export('conifer','vegetation',dict(periodIds=['jurassic','cretaceous','triassic'],biomes=['jurassic','ice']))

def fern():
    reset();stem_m=mat('fern stem',.9);frond_m=mat('fern frond',.84)
    stems=[];fronds=[]
    for i in range(6):
        a=i/6*math.tau+(i%2)*.12;lean=.65+(i%3)*.08
        pts=[(0,.02,0),(math.cos(a)*.12,.3,math.sin(a)*.12),(math.cos(a)*lean*.5,.6,math.sin(a)*lean*.5),(math.cos(a)*lean*.95,.95,math.sin(a)*lean*.95)]
        s=tube(f'stem{i}',pts,[.032,.026,.018,.01],5);colorize(s,lambda p:(.2,.32,.14),stem_m);stems.append(s)
        for j in range(1,5):
            t=j/4;px=math.cos(a)*lean*t;py=.22+t*.78;pz=math.sin(a)*lean*t;w=.2*(1-t*.3)
            bpy.ops.mesh.primitive_uv_sphere_add(segments=6,ring_count=4,location=co((px,py,pz)));o=bpy.context.object
            o.scale=(w,w*.5,.04);o.rotation_euler=(0,a,-.4-t*.2);bpy.ops.object.transform_apply(scale=True,rotation=True)
            colorize(o,lambda p:(.22+noise_vector(Vector(p))[0]*.08,.42,.18),frond_m);fronds.append(o)
    join(stems+fronds,'fern');export('fern','vegetation',dict())

def river_boulder():
    reset();m=mat('river stone',.95)
    parts=[]
    for name,p,s,seg in [('core',(0,.4,0),(.95,.65,.85),1),('bump',(.45,.35,.2),(.5,.4,.45),1),('bump2',(-.4,.25,-.25),(.42,.32,.4),0),('facet',(.1,.55,-.35),(.35,.28,.4),0)]:
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=seg,radius=1,location=co(p));o=bpy.context.object;o.name=name;o.scale=s
        bpy.ops.object.transform_apply(scale=True);parts.append(o)
    rock=sculpt(parts,'river-boulder',.08,280)
    colorize(rock,lambda p:(.38+noise_vector(Vector(p))[0]*.12,.4,.35),m)
    # ground the origin
    mn=min(v.co.z for v in rock.data.vertices)
    for v in rock.data.vertices:v.co.z-=mn
    export('river-boulder','terrain',dict())

def explorer():
    reset();cloth=mat('khaki cloth',.88);skin_m=mat('skin',.7);hat_m=mat('canvas hat',.85);pack_m=mat('olive pack',.9);pants_m=mat('field pants',.9);boot_m=mat('boot',.92)
    parts=[];details=[]
    torso=ell('torso',(0,1.2,0),(.26,.42,.18),14,10);colorize(torso,lambda p:(.72,.68,.5),cloth);parts.append(torso)
    head=ell('head',(0,1.72,0),(.15,.18,.14),12,8);colorize(head,lambda p:(.74,.58,.44),skin_m);parts.append(head)
    bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=.3,depth=.04,location=co((0,1.86,0)));brim=bpy.context.object
    bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=.17,depth=.16,location=co((0,1.96,0)));crown=bpy.context.object
    hat=join([brim,crown],'hat');colorize(hat,lambda p:(.85,.78,.6),hat_m);details.append(hat)
    pack=ell('pack',(0,1.25,-.28),(.2,.28,.14),10,8);colorize(pack,lambda p:(.22,.32,.25),pack_m);details.append(pack)
    blanket=tube('blanket',[(-.2,1.52,-.28),(.2,1.52,-.28)],[.09,.09],8);colorize(blanket,lambda p:(.4,.34,.22),pack_m);details.append(blanket)
    bones=[('root',(0,.1,0),(0,.3,0),None),('hips',(0,.9,0),(0,1.15,0),'root'),('spine',(0,1.15,0),(0,1.45,0),'hips'),('head',(0,1.55,0),(0,1.85,0),'spine')]
    for side,tag in [(-1,'L'),(1,'R')]:
        leg=[(side*.12,.95,0),(side*.12,.5,0),(side*.12,.15,0),(side*.12,.05,.05)]
        parts.append(tube(f'leg{tag}',leg,[.1,.09,.08,.11],8));colorize(parts[-1],lambda p:(.22,.28,.24),pants_m)
        foot=ell(f'boot{tag}',(side*.12,.08,.08),(.11,.09,.18),8,6);colorize(foot,lambda p:(.2,.16,.12),boot_m);details.append(foot)
        for j in range(3):bones.append((f'leg{tag}{j}',leg[j],leg[j+1],'hips' if j==0 else f'leg{tag}{j-1}'))
        arm=[(side*.28,1.45,0),(side*.32,1.15,0),(side*.34,.95,0)]
        parts.append(tube(f'arm{tag}',arm,[.07,.065,.055],7));colorize(parts[-1],lambda p:(.7,.66,.5),cloth)
        for j in range(2):bones.append((f'arm{tag}{j}',arm[j],arm[j+1],'spine' if j==0 else f'arm{tag}{j-1}'))
    body=sculpt(parts,'Explorer',.055,6500)
    colorize(body,lambda p:(
        (.85,.78,.62) if p[1]>1.8 else
        (.76,.60,.46) if p[1]>1.55 else
        (.28,.38,.30) if p[2]<-.12 else
        (.28,.22,.16) if p[1]<.18 else
        (.30,.36,.30) if p[1]<.95 else
        (.78,.72,.55)
    ),cloth)
    body=join([body]+details,'Explorer')
    colorize(body,lambda p:(
        (.85,.78,.62) if p[1]>1.8 else
        (.76,.60,.46) if p[1]>1.55 else
        (.28,.38,.30) if p[2]<-.12 else
        (.28,.22,.16) if p[1]<.18 else
        (.30,.36,.30) if p[1]<.95 else
        (.78,.72,.55)
    ),cloth)
    def choose(p):
        x,y,z=p
        if y>1.55:return ['head','spine']
        if y<1.0 and abs(x)>.05:return [f'leg{"L" if x<0 else "R"}{i}' for i in range(3)]
        if abs(x)>.22 and y>1.0:return [f'arm{"L" if x<0 else "R"}{i}' for i in range(2)]+['spine']
        return ['hips','spine']
    rig=rig_mesh([body],bones,choose)
    def pose(name,t,r):
        walk=name in ('Walk','Run');amp=.55 if name=='Walk' else .75 if name=='Run' else .02
        for i,tag in enumerate(['L','R']):
            phase=t+i*math.pi
            r.pose.bones[f'leg{tag}0'].rotation_euler.x=math.sin(phase)*amp
            r.pose.bones[f'arm{tag}0'].rotation_euler.x=-math.sin(phase)*amp*.7
        r.pose.bones['head'].rotation_euler.z=math.sin(t)*.04
    actions(rig,['Idle','Walk','Run'],48,pose)
    export('explorer','characters',dict(clips=dict(idle='Idle',walk='Walk',run='Run')))

def allosaurus():
    reset();m=mat('allo hide',.9)
    parts=[ell('hips',(-.2,2.9,0),(1.35,.75,.55)),ell('chest',(1.1,3.15,0),(.9,.6,.48)),ell('belly',(.3,2.55,0),(1.1,.4,.42))]
    neck=[(1.7,3.4,0),(2.15,3.75,0),(2.55,4.05,0)]
    parts.append(tube('neck',neck,[.32,.26,.2],12))
    parts += [ell('skull',(3.05,4.15,0),(.65,.32,.28)),ell('muzzle',(3.55,4.05,0),(.4,.2,.18)),ell('crestL',(2.9,4.4,.14),(.2,.12,.06)),ell('crestR',(2.9,4.4,-.14),(.2,.12,.06))]
    tail=[(-1.4,2.85,0),(-2.8,2.7,0),(-4.2,2.4,0),(-5.6,2.2,.08),(-6.8,2.35,.15)]
    parts.append(tube('tail',tail,[.42,.3,.18,.09,.03],12))
    bones=[('root',(0,1,0),(0,1.5,0),None),('hips',(-.8,2.9,0),(.4,3.0,0),'root'),('chest',(.4,3.0,0),(1.7,3.4,0),'hips')]
    for i in range(len(neck)-1):bones.append((f'neck{i}',neck[i],neck[i+1],'chest' if i==0 else f'neck{i-1}'))
    bones.append(('head',neck[-1],(3.7,4.05,0),'neck1'))
    for i in range(len(tail)-1):bones.append((f'tail{i}',tail[i],tail[i+1],'hips' if i==0 else f'tail{i-1}'))
    for side,tag in [(-1,'L'),(1,'R')]:
        pts=[(-.1,2.85,side*.45),(.05,2.0,side*.5),(.2,1.2,side*.48),(.25,.35,side*.45)]
        parts.append(tube(f'leg{tag}',pts,[.35,.28,.2,.16],10));parts.append(ell(f'foot{tag}',(.4,.2,side*.5),(.35,.12,.22)))
        for j in range(3):bones.append((f'leg{tag}{j}',pts[j],pts[j+1],'hips' if j==0 else f'leg{tag}{j-1}'))
        arm=[(1.3,2.95,side*.4),(1.45,2.55,side*.42),(1.55,2.3,side*.4)]
        parts.append(tube(f'arm{tag}',arm,[.1,.08,.05],6))
        for j in range(2):bones.append((f'arm{tag}{j}',arm[j],arm[j+1],'chest' if j==0 else f'arm{tag}{j-1}'))
    body=sculpt(parts,'Allosaurus',.07,10000)
    colorize(body,lambda p:(.42+noise_vector(Vector(p))[0]*.08,.4,.28),m)
    for side in [-1,1]:
        eye=ell('eye',(3.15,4.25,side*.24),(.05,.055,.035),8,6);colorize(eye,lambda p:(.05,.04,.02),m);body=join([body,eye],'Allosaurus')
    def choose(p):
        x,y,z=p
        if x<-2:return [f'tail{i}' for i in range(4)]+['hips']
        if x>1.8 and y>3.5:return [f'neck{i}' for i in range(2)]+['head']
        if y<2.6 and abs(z)>.25:return [f'leg{"L" if z<0 else "R"}{i}' for i in range(3)]
        return ['hips','chest']
    rig=rig_mesh([body],bones,choose)
    def pose(name,t,r):
        gait=name=='Walk'
        for i,tag in enumerate(['L','R']):
            phase=t+i*math.pi
            r.pose.bones[f'leg{tag}0'].rotation_euler.y=math.sin(phase)*(.2 if gait else .02)
        for i in range(4):r.pose.bones[f'tail{i}'].rotation_euler.z=math.sin(t-i*.35)*.05
        r.pose.bones['head'].rotation_euler.z=math.sin(t)*(.22 if name=='Alert' else .03)
    actions(rig,['Idle','Walk','Alert'],72,pose)
    export('allosaurus','animals',dict(periodIds=['jurassic'],species='Allosaurus',clips=dict(idle='Idle',walk='Walk',alert='Alert')))

def _mammoth(name,shoulder,color,tusk_curve,back_slope,fringe,species,period_ids):
    reset();m=mat(f'{name} hide',.92);tusk_m=mat('ivory',.55)
    bh=shoulder*.55
    parts=[ell('barrel',(.2,bh*.9,0),(1.7,bh*.55,1.15)),ell('shoulder',(.9,bh*1.1+back_slope,0),(1.2,bh*.5,1.05)),ell('haunch',(-1.1,bh*.85,0),(1.1,bh*.45,.95))]
    if fringe:parts.append(ell('fringe',(.1,bh*.55,0),(1.6,.45,1.2)))
    parts += [ell('skull',(2.2,bh*1.35,0),(.7,.55,.55)),ell('mouth',(2.7,bh*1.2,0),(.45,.35,.4))]
    for side in [-1,1]:parts.append(ell(f'ear{side}',(2.0,bh*1.4,side*.55),(.2,.45,.08)))
    trunk=[(2.9,bh*1.15,0),(3.05,bh*.7,0),(3.25,bh*.25,0),(3.45,bh*.1,.05)]
    parts.append(tube('trunk',trunk,[.28,.22,.15,.08],10))
    tusks=[]
    for side in [-1,1]:
        pts=[(2.6,bh*1.05,side*.28),(3.15,bh*.75,side*.4),(3.7,bh*.9+tusk_curve*.2,side*.35),(3.95,bh*1.15+tusk_curve*.35,side*.25)]
        t=tube(f'tusk{side}',pts,[.12,.1,.07,.03],7);colorize(t,lambda p:(.9,.85,.72),tusk_m);tusks.append(t)
    bones=[('root',(0,.5,0),(0,1,0),None),('hips',(-1,bh*.9,0),(.5,bh,0),'root'),('chest',(.5,bh,0),(1.8,bh*1.15,0),'hips'),('head',(1.8,bh*1.15,0),(2.9,bh*1.3,0),'chest'),('trunk0',trunk[0],trunk[1],'head'),('trunk1',trunk[1],trunk[2],'trunk0'),('trunk2',trunk[2],trunk[3],'trunk1')]
    for side,tag in [(-1,'L'),(1,'R')]:
        for front,x in [(True,1.1),(False,-1.0)]:
            key=f'{"f" if front else "b"}{tag}'
            lp=[(x,bh*.9,side*.7),(x,bh*.5,side*.72),(x+.02,bh*.15,side*.7),(x+.05,.12,side*.68)]
            parts.append(tube(key,lp,[.38,.3,.22,.28],9));parts.append(ell(f'foot{key}',(x+.08,.14,side*.7),(.32,.16,.28)))
            for j in range(3):bones.append((f'{key}{j}',lp[j],lp[j+1],('chest' if front else 'hips') if j==0 else f'{key}{j-1}'))
    body=sculpt(parts,name,.075,10000);colorize(body,lambda p:tuple(max(.05,c+noise_vector(Vector(p))[0]*.08) for c in color),m)
    body=join([body]+tusks,name)
    def choose(p):
        x,y,z=p
        if x>2.6 and y<bh*.9:return ['trunk0','trunk1','trunk2','head']
        if x>1.6 and y>bh:return ['head','chest']
        if y<bh*.55 and abs(z)>.35:
            front=x>0;key=f'{"f" if front else "b"}{"L" if z<0 else "R"}';return [f'{key}{i}' for i in range(3)]
        return ['hips','chest']
    rig=rig_mesh([body],bones,choose)
    def pose(act,t,r):
        gait=act=='Walk'
        for i,tag in enumerate(['L','R']):
            for front in ['f','b']:
                phase=t+i*math.pi+(0 if front=='f' else math.pi*.6)
                r.pose.bones[f'{front}{tag}0'].rotation_euler.y=math.sin(phase)*(.14 if gait else .01)
        for i in range(3):r.pose.bones[f'trunk{i}'].rotation_euler.x=math.sin(t+i*.3)*(.12 if act=='Graze' else .05)
        r.pose.bones['head'].rotation_euler.z=math.sin(t)*(.2 if act=='Alert' else .03)
    actions(rig,['Idle','Walk','Graze','Alert'],96,pose)
    export(name,'animals',dict(periodIds=period_ids,species=species,clips=dict(idle='Idle',walk='Walk',graze='Graze',alert='Alert')))

def early_mammoth():_mammoth('early-mammoth',3.7,(.42,.35,.25),.7,.15,False,'Early mammoth',['pleistocene'])
def steppe_mammoth():_mammoth('steppe-mammoth',4.2,(.38,.32,.24),.55,.05,False,'Steppe mammoth',['million'])
def woolly_mammoth():_mammoth('woolly-mammoth',3.2,(.32,.26,.2),1.15,.35,True,'Woolly mammoth',['human-world'])

if __name__=='__main__':
    requested=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['brachiosaurus']
    for name in requested:globals()[name.replace('-','_')]()
