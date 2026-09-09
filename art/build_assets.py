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

if __name__=='__main__':
    requested=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['brachiosaurus']
    for name in requested:globals()[name]()
