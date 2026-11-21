# Run inside Blender with story.blend open: exec(open('assets/story/characters.py').read()).
# Turns a decimated Tripo T-pose mesh into a toon character: the Tripo colour texture through the
# shared Toon shader, ink outline, and one rig shared by name across characters so a single
# animation script can drive both.
import math

import bpy
from mathutils import Vector


# Landmarks measured on each rest mesh (metres, character faces -Y, left side is +X).
# hips: pelvis joint, crotch: where the legs split, arm_z/arm_y: arm axis, wrist_x/hand_x along the arm,
# shoulder_x: where the arm leaves the torso, neck_z/head_z: neck base and skull base, top: crown.
# palm: degrees about X that turn the rest hand palm-down (Raka's T-pose has the palms forward).
CHARACTERS = {
    'raka': dict(
        top=1.65, hips=0.56, crotch=0.5, chest=0.92, neck_z=1.14, head_z=1.22, arm_z=1.05, arm_y=0.04,
        shoulder_x=0.2, elbow_x=0.41, wrist_x=0.6, hand_x=0.78, knee=(0.11, 0.0, 0.33), ankle=(0.125, 0.025, 0.12),
        toe=(0.13, -0.14, 0.03), hip_x=0.1, palm=106, tex='//tex/raka.jpg',
    ),
    'ayu': dict(
        top=1.58, hips=0.55, crotch=0.5, chest=0.9, neck_z=1.1, head_z=1.16, arm_z=1.02, arm_y=0.045,
        shoulder_x=0.2, elbow_x=0.39, wrist_x=0.57, hand_x=0.7, knee=(0.08, 0.0, 0.33), ankle=(0.085, 0.02, 0.11),
        toe=(0.09, -0.12, 0.03), hip_x=0.08, palm=0, tex='//tex/ayu.jpg',
    ),
}


def toon_material(name, c):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = bpy.data.images.load(bpy.path.abspath(c['tex']), check_existing=True)
    tex.image.filepath = c['tex']
    g = nt.nodes.new('ShaderNodeGroup')
    g.node_tree = bpy.data.node_groups['Toon']
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    nt.links.new(tex.outputs['Color'], g.inputs['Color'])
    nt.links.new(g.outputs[0], out.inputs['Surface'])
    return m


def build_rig(name, c):
    rig_name = f'rig_{name}'
    if rig_name in bpy.data.objects:
        bpy.data.objects.remove(bpy.data.objects[rig_name])
    arm = bpy.data.armatures.new(rig_name)
    rig = bpy.data.objects.new(rig_name, arm)
    bpy.data.collections['Actor'].objects.link(rig)
    rig.show_in_front = True
    arm.display_type = 'STICK'
    for o in bpy.context.selected_objects:
        o.select_set(False)
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    E = arm.edit_bones

    def b(n, head, tail, parent=None, deform=True, connect=False):
        e = E.new(n)
        e.head, e.tail = Vector(head), Vector(tail)
        if parent:
            e.parent = E[parent]
            e.use_connect = connect
        e.use_deform = deform

    y = 0.025
    b('root', (0, 0, 0), (0, 0.4, 0), deform=False)
    b('hips', (0, y, c['hips']), (0, y, (c['hips'] + c['chest']) / 2), 'root')
    b('spine', (0, y, (c['hips'] + c['chest']) / 2), (0, y, c['chest']), 'hips', connect=True)
    b('chest', (0, y, c['chest']), (0, y, c['neck_z']), 'spine', connect=True)
    b('neck', (0, y, c['neck_z']), (0, 0.02, c['head_z']), 'chest', connect=True)
    b('head', (0, 0.02, c['head_z']), (0, 0.02, c['top']), 'neck', connect=True)
    az, ay = c['arm_z'], c['arm_y']
    for s, k in (('L', 1), ('R', -1)):
        b(f'shoulder.{s}', (0.04 * k, ay - 0.01, az + 0.04), (c['shoulder_x'] * k, ay, az + 0.01), 'chest')
        # a slight backward elbow and forward knee give the IK solver its bending direction
        b(f'upper_arm.{s}', (c['shoulder_x'] * k, ay, az), (c['elbow_x'] * k, ay + 0.025, az), f'shoulder.{s}')
        b(f'forearm.{s}', (c['elbow_x'] * k, ay + 0.025, az), (c['wrist_x'] * k, ay, az), f'upper_arm.{s}', connect=True)
        b(f'hand.{s}', (c['wrist_x'] * k, ay, az), (c['hand_x'] * k, ay, az - 0.005), f'forearm.{s}', connect=True)
        kx, ky, kz = c['knee']
        ax, ay2, az2 = c['ankle']
        tx, ty, tz = c['toe']
        b(f'thigh.{s}', (c['hip_x'] * k, 0.02, c['hips']), (kx * k, ky, kz), 'hips')
        b(f'shin.{s}', (kx * k, ky, kz), (ax * k, ay2, az2), f'thigh.{s}', connect=True)
        b(f'foot.{s}', (ax * k, ay2, az2), (tx * k, ty, tz), f'shin.{s}', connect=True)
        b(f'toe.{s}', (tx * k, ty, tz), (tx * k, ty - 0.08, tz), f'foot.{s}', connect=True)
        b(f'hand_ik.{s}', (c['wrist_x'] * k, ay, az), (c['hand_x'] * k, ay, az - 0.005), 'root', deform=False)
        b(f'elbow_pole.{s}', (c['elbow_x'] * k, ay + 0.5, az), (c['elbow_x'] * k, ay + 0.6, az), 'root', deform=False)
        b(f'foot_ik.{s}', (ax * k, ay2, az2), (tx * k, ty, tz), 'root', deform=False)
        b(f'knee_pole.{s}', (kx * k, -0.6, kz), (kx * k, -0.7, kz), 'root', deform=False)
    bpy.ops.object.mode_set(mode='POSE')
    P = rig.pose.bones
    for pb in P:
        pb.rotation_mode = 'XYZ'
    for s in ('L', 'R'):
        for chain, tgt, pole in (('forearm', 'hand_ik', 'elbow_pole'), ('shin', 'foot_ik', 'knee_pole')):
            ik = P[f'{chain}.{s}'].constraints.new('IK')
            ik.target, ik.subtarget, ik.pole_target, ik.pole_subtarget, ik.chain_count = rig, f'{tgt}.{s}', rig, f'{pole}.{s}', 2
        for bone, tgt in (('hand', 'hand_ik'), ('foot', 'foot_ik')):
            cr = P[f'{bone}.{s}'].constraints.new('COPY_ROTATION')
            cr.target, cr.subtarget = rig, f'{tgt}.{s}'
    bpy.ops.object.mode_set(mode='OBJECT')
    # pick each pole angle so the rest pose stays put under IK
    for s in ('L', 'R'):
        for chain in ('forearm', 'shin'):
            pb = P[f'{chain}.{s}']
            ik = pb.constraints['IK']
            best = None
            for a10 in range(-1800, 1801, 5):
                ik.pole_angle = math.radians(a10 / 10)
                bpy.context.view_layer.update()
                d = sum((x.matrix.col[0].xyz - x.bone.matrix_local.col[0].xyz).length
                        + (x.matrix.col[1].xyz - x.bone.matrix_local.col[1].xyz).length for x in (pb, pb.parent))
                if best is None or d < best[0]:
                    best = (d, a10 / 10)
            ik.pole_angle = math.radians(best[1])
    return rig


def setup(name):
    c = CHARACTERS[name]
    obj = bpy.data.objects[name]
    me = obj.data
    me.materials.clear()
    me.materials.append(toon_material(f'{name.title()}Toon', c))
    me.materials.append(bpy.data.materials['Ink'])
    for p in me.polygons:
        p.material_index = 0
        p.use_smooth = True
    for m in list(obj.modifiers):
        obj.modifiers.remove(m)
    obj.vertex_groups.clear()
    obj.parent = None
    rig = build_rig(name, c)
    # Tripo meshes are not watertight and bone heat can fail on every vertex, so weight a voxel
    # copy and carry its weights over to the nearest point of the real surface
    proxy = bpy.data.objects.new('weights_proxy', me.copy())
    bpy.data.collections['Actor'].objects.link(proxy)
    rm = proxy.modifiers.new('voxel', 'REMESH')
    rm.mode, rm.voxel_size = 'VOXEL', 0.012
    proxy.data = bpy.data.meshes.new_from_object(proxy.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    proxy.modifiers.clear()
    for o in bpy.context.selected_objects:
        o.select_set(False)
    proxy.select_set(True)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    for g in proxy.vertex_groups:
        obj.vertex_groups.new(name=g.name)
    dt = obj.modifiers.new('weights', 'DATA_TRANSFER')
    dt.object, dt.use_vert_data, dt.data_types_verts = proxy, True, {'VGROUP_WEIGHTS'}
    dt.vert_mapping, dt.layers_vgroup_select_src, dt.layers_vgroup_select_dst = 'POLYINTERP_NEAREST', 'ALL', 'NAME'
    with bpy.context.temp_override(object=obj, active_object=obj):
        bpy.ops.object.modifier_apply(modifier=dt.name)
    pm = proxy.data
    bpy.data.objects.remove(proxy)
    bpy.data.meshes.remove(pm)
    # Seated, the thighs swing up 90 degrees, and anything above the hip joint that follows them folds
    # into the belly; their pull fades out between the crotch and the joint and the hips take the rest.
    hips = obj.vertex_groups['hips']
    thighs = {obj.vertex_groups[f'thigh.{s}'].index for s in 'LR'}
    for v in me.vertices:
        keep = min(1.0, max(0.0, (c['hips'] - v.co.z) / (c['hips'] - c['crotch'])))
        moved = 0.0
        for g in v.groups:
            if g.group in thighs and keep < 1:
                moved += g.weight * (1 - keep)
                g.weight *= keep
        if moved:
            hips.add([v.index], moved, 'ADD')
    obj.parent = rig
    obj.modifiers.new('rig', 'ARMATURE').object = rig
    s = obj.modifiers.new('outline', 'SOLIDIFY')
    s.thickness, s.offset, s.use_flip_normals, s.use_rim, s.material_offset = 0.008, 1.0, True, False, 1
    for m in [m for m in bpy.data.materials if m.users == 0]:
        bpy.data.materials.remove(m)
    unweighted = sum(1 for v in me.vertices if not any(g.weight > 0.01 for g in v.groups))
    return rig, unweighted
