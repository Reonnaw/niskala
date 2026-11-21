# Run headless, without saving:  blender -b story.blend --python exercises.py
# Renders one short looping clip per exercise for each character, the visuals beside the steps of the guided
# routines: sitting tall, a chin tuck, a shoulder-blade squeeze and working upright seen from the side; shoulder
# rolls, neck tilts and looking into the distance seen from the front. Frames land in render/exercise/<who>/<id>/
# and are packed into public/exercise/<who>/<id>.webp outside Blender.
import math
import os

import bpy
from mathutils import Quaternion, Vector

ns = {}
exec(open(bpy.path.abspath('//animate.py')).read(), ns)
exec(open(bpy.path.abspath('//characters.py')).read(), ns)
O = bpy.data.objects
OUT = bpy.path.abspath('//render/exercise')
DESK = {'desk', 'laptop', 'laptop_lid', 'laptop_screen', 'mug', 'lid_hinge'}
KEEP = DESK | {'chairDesk', 'blob_actor', 'blob_chair'}
SIZE = 480


def camera(name, loc, look, scale):
    cam = O.get(name) or bpy.data.objects.new(name, bpy.data.cameras.new(name))
    if cam.name not in bpy.context.scene.collection.objects:
        bpy.context.scene.collection.objects.link(cam)
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = scale
    cam.location = loc
    cam.rotation_euler = (Vector(look) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    return cam


def lap(A):
    # resting on the thighs, a little short of the knees
    return {'L': ('lap', (0.12, -0.18, A.seat + 0.13)), 'R': ('lap', (-0.12, -0.18, A.seat + 0.13))}


def key(A, f, pose, shoulders=(0, 0)):
    """Keys a pose plus the shoulders, in degrees raised and pulled back, both sides alike."""
    up, back = shoulders
    for s, k in (('L', 1), ('R', -1)):
        # Turn about armature axes (front-back to raise, vertical to pull back), expressed in each bone's own frame,
        # so the left and right shoulder move as mirror images whatever their roll.
        to_bone = A.rig.data.bones[f'shoulder.{s}'].matrix_local.to_3x3().inverted()
        q = Quaternion(to_bone @ Vector((0, 0, k)), math.radians(back)) @ Quaternion(to_bone @ Vector((0, -k, 0)), math.radians(up))
        A.P[f'shoulder.{s}'].rotation_euler = q.to_euler('XYZ')
    A.apply(f, pose)


def stage(A, view):
    """Seats the character on its chair and points the camera: 'side' for forward and backward moves, 'front' for the rest."""
    who = A.name
    sc = bpy.context.scene
    sc.render.film_transparent = True
    sc.render.resolution_x = sc.render.resolution_y = SIZE
    sc.render.resolution_percentage = 100
    sc.eevee.taa_render_samples = 16
    bpy.data.node_groups['Toon'].nodes['night'].outputs[0].default_value = 0
    for lc in bpy.context.view_layer.layer_collection.children:
        lc.exclude = False
        lc.holdout = False
    for o in O:
        if o.type in ('MESH', 'EMPTY') and o.name not in KEEP and o.name not in ('raka', 'ayu'):
            o.hide_render = True
    for o in ('raka', 'ayu'):
        O[o].hide_render = o != who
    A.rig.animation_data_clear()
    for o in ('chairDesk', 'mug', 'lid_hinge'):
        O[o].animation_data_clear()
    chair = O['chairDesk']
    chair.scale = (A.seat / ns['CHAIR_TOP'],) * 3
    chair.rotation_euler = (0, 0, math.radians(90))
    bpy.context.view_layer.update()
    bb = [chair.matrix_world @ Vector(v) for v in chair.bound_box]
    chair.location.x += ns['CHAIR'][0] - A.chair_back - (min(v.x for v in bb) + max(v.x for v in bb)) / 2
    chair.location.y += ns['CHAIR'][1] - (min(v.y for v in bb) + max(v.y for v in bb)) / 2
    O['blob_actor'].constraints[0].target = A.rig
    c = A.c
    # the upper body fills the frame: from the seat to the crown, with a little room
    mid = A.seat + 0.07 + ((c['top'] - c['hips']) + 0.0) / 2 + 0.05
    span = (c['top'] - c['hips']) + 0.5
    if view in ('side', 'desk'):
        cam = camera('ExerciseCam', (ns['CHAIR'][0] + 0.15, -3.0, mid), (ns['CHAIR'][0] + 0.15, 0.45, mid), span)
    else:
        cam = camera('ExerciseCam', (3.2, 0.45, mid), (0.0, 0.45, mid), span)
    sc.camera = cam
    for n in DESK:
        O[n].hide_render = view != 'desk'


# --- main ---


def clips(A):
    """Each exercise as (view, length, keys); a key is (frame, pose, shoulders). The last key matches the first, so it loops."""
    s = A.seat

    def pose(**o):
        return A.base(**{'hands': lap(A), 'neck': (0, 0, 0), 'head': (0, 0, 0), **o})

    slouch = pose(pelvis=(0, -0.02, s + 0.06), hips_rot=(-8, 0, 0), spine=(12, 0, 0), chest=(12, 0, 0), neck=(14, 0, 0), head=(-6, 0, 0))
    tall = pose(chest=(-4, 0, 0))
    jut = pose(neck=(22, 0, 0), head=(-20, 0, 0))
    tuck = pose(neck=(-10, 0, 0), head=(10, 0, 0))
    rounded = pose(chest=(10, 0, 0))
    # hands drop beside the hips and the elbows draw back, which shows the squeeze from the side
    squeezed = pose(chest=(-8, 0, 0), hands={'L': ('down', (0.2, 0.06, s + 0.25)), 'R': ('down', (-0.2, 0.06, s + 0.25))})
    # -1 is the character's own left: the clip is mirrored later, so it shows on the left like in a mirror
    tilt = lambda l: pose(neck=(0, 0, 10 * l), head=(0, 0, 20 * l))
    screen = pose(neck=(4, 0, 0), head=(6, 0, 0))
    far = pose(neck=(-4, 20, 0), head=(-10, 28, 0))
    typing = A.base(chest=(-2, 0, 0))
    lift = lambda side: dict(typing, hands=dict(typing['hands'], **{side: ('type', tuple(v + d for v, d in zip(typing['hands'][side][1], (0, 0, 0.03))))}))
    return {
        'sit-tall': ('side', 36, [(0, slouch, (0, -15)), (12, tall, (0, 8)), (26, tall, (0, 8)), (36, slouch, (0, -15))]),
        'chin-tuck': ('side', 36, [(0, jut, (0, 0)), (10, tuck, (0, 0)), (26, tuck, (0, 0)), (36, jut, (0, 0))]),
        'squeeze': ('side', 36, [(0, rounded, (0, -20)), (10, squeezed, (-5, 30)), (26, squeezed, (-5, 30)), (36, rounded, (0, -20))]),
        'work': ('desk', 36, [(0, typing, (0, 0)), (9, lift('L'), (0, 0)), (18, typing, (0, 0)), (27, lift('R'), (0, 0)), (36, typing, (0, 0))]),
        'shoulder-roll': ('front', 36, [(0, pose(), (0, 0)), (9, pose(), (35, 0)), (18, pose(), (30, 25)), (27, pose(), (0, 20)), (36, pose(), (0, 0))]),
        'neck-tilt': ('front', 60, [(0, tilt(0), (0, 0)), (10, tilt(-1), (0, 0)), (24, tilt(-1), (0, 0)), (30, tilt(0), (0, 0)), (40, tilt(1), (0, 0)), (54, tilt(1), (0, 0)), (60, tilt(0), (0, 0))]),
        'look-far': ('front', 36, [(0, screen, (0, 0)), (10, far, (0, 0)), (28, far, (0, 0)), (36, screen, (0, 0))]),
    }


def main():
    sc = bpy.context.scene
    only = os.environ.get('EXERCISE')
    for who in ('raka', 'ayu'):
        A = ns['Actor'](who)
        for name, (view, length, keys) in clips(A).items():
            if only and name != only:
                continue
            stage(A, view)
            for f, p, sh in keys:
                key(A, f, p, sh)
            out = f'{OUT}/{who}/{name}'
            os.makedirs(out, exist_ok=True)
            # the last frame equals the first, so it is left out of the loop
            for f in range(length):
                sc.frame_set(f)
                sc.render.filepath = f'{out}/{f:03d}.png'
                bpy.ops.render.render(write_still=True)


main()
