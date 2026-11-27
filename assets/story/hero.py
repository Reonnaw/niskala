# Run headless, without saving:  blender -b story.blend --python hero.py [-- idle]
# Renders the hero demo's two slider sequences per character: a side view that slouches from
# upright to fully rounded, and a front view (mirrored later, like a webcam) that leans from
# left to right with the head tilting along. Plus a face crop for the person picker. With `-- idle`, only the
# upright side view's idle loop: hands typing, a slow breath and a small reading nod, seamless over IDLE frames.
import math
import os
import sys

import bpy
from mathutils import Vector

ns = {}
exec(open(bpy.path.abspath('//animate.py')).read(), ns)
exec(open(bpy.path.abspath('//characters.py')).read(), ns)
O = bpy.data.objects
OUT = bpy.path.abspath('//render/hero')
N = 17  # frames per slider; the middle front frame is upright
IDLE = 24  # frames in the idle loop, played at 8 a second
ONLY_IDLE = 'idle' in sys.argv
SHOW = {'desk', 'laptop', 'laptop_lid', 'laptop_screen', 'chairDesk', 'mug', 'blob_actor', 'blob_chair', 'lid_hinge'}


def camera(name, loc, look, scale):
    cam = O.get(name) or bpy.data.objects.new(name, bpy.data.cameras.new(name))
    if cam.name not in bpy.context.scene.collection.objects:
        bpy.context.scene.collection.objects.link(cam)
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = scale
    cam.location = loc
    cam.rotation_euler = (Vector(look) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    return cam


def mix(a, b, u):
    if isinstance(a, tuple):
        return tuple(x + (y - x) * u for x, y in zip(a, b))
    return a + (b - a) * u


def blend(p, q, u):
    out = dict(p)
    for k in ('pelvis', 'hips_rot', 'spine', 'chest', 'neck', 'head'):
        out[k] = mix(p[k], q[k], u)
    out['hands'] = {s: (p['hands'][s][0], mix(p['hands'][s][1], q['hands'][s][1], u)) for s in ('L', 'R')}
    return out


def render(path, cam, res):
    sc = bpy.context.scene
    sc.camera = cam
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)


def main():
    sc = bpy.context.scene
    sc.render.film_transparent = True
    sc.eevee.taa_render_samples = 16
    bpy.data.node_groups['Toon'].nodes['night'].outputs[0].default_value = 0
    for o in O:
        if o.type in ('MESH', 'EMPTY') and o.name not in SHOW and o.name not in ('raka', 'ayu'):
            o.hide_render = True
    for lc in bpy.context.view_layer.layer_collection.children:
        lc.exclude = False
        lc.holdout = False
    side = camera('HeroSide', (0.92, -3.0, 0.76), (0.92, 0.45, 0.76), 1.62)
    # the webcam's view: head and shoulders, with the desk and the back of the laptop out of the way
    desk_side = {'desk', 'laptop', 'laptop_lid', 'laptop_screen', 'mug'}
    for who in ('raka', 'ayu'):
        for o in ('raka', 'ayu'):
            O[o].hide_render = o != who
        A = ns['Actor'](who)
        rig = A.rig
        c = A.c
        head = A.seat + 0.07 + ((c['head_z'] + c['top']) / 2 - c['hips'])
        front = camera('HeroFront', (3.2, 0.45, head - 0.1), (0.0, 0.45, head - 0.1), max(1.15, (c['top'] - c['head_z']) * 2.1))
        face = camera('HeroFace', (3.2, 0.45, head - 0.04), (0.0, 0.45, head - 0.04), (c['top'] - c['head_z']) * 1.45)
        rig.animation_data_clear()
        for o in ('chairDesk', 'mug', 'lid_hinge'):
            O[o].animation_data_clear()
        O['lid_hinge'].rotation_euler = (0, 0, 0)
        O['mug'].matrix_world = ns['Matrix'].Translation(ns['DESK_MUG']) @ ns['Rz'](200)
        O['mug'].scale = (1.3,) * 3
        chair = O['chairDesk']
        chair.scale = (A.seat / ns['CHAIR_TOP'],) * 3
        chair.rotation_euler = (0, 0, math.radians(90))
        bpy.context.view_layer.update()
        bb = [chair.matrix_world @ Vector(v) for v in chair.bound_box]
        chair.location.x += ns['CHAIR'][0] - A.chair_back - (min(v.x for v in bb) + max(v.x for v in bb)) / 2
        chair.location.y += ns['CHAIR'][1] - (min(v.y for v in bb) + max(v.y for v in bb)) / 2
        O['blob_actor'].constraints[0].target = rig
        up = A.base()
        down = A.base(pelvis=(0, -0.03, A.seat + 0.06), hips_rot=(-12, 0, 0), spine=(18, 0, 0), chest=(18, 0, 0),
                      neck=(28, 0, 0), head=(-16, 0, 0),
                      hands={'L': ('type', (0.11, A.type_y - 0.03, 0.69)), 'R': ('type', (-0.11, A.type_y - 0.03, 0.69))})
        out = f'{OUT}/{who}'
        os.makedirs(out, exist_ok=True)
        if ONLY_IDLE:
            for k in range(IDLE):
                t = 2 * math.pi * k / IDLE
                # Only the head moves, a slow reading nod: the mug hides the typing from the side, and a breath through the
                # chest would change most of the frame, which the animated WebP pays for on every frame.
                lift = {'L': 0.0, 'R': 0.0}
                A.apply(200 + k, A.base(head=(8 + 3 * math.sin(t), 0, 0),
                                        hands={'L': ('type', (0.12, A.type_y, 0.69 + lift['L'])), 'R': ('type', (-0.12, A.type_y, 0.69 + lift['R']))}))
            for k in range(IDLE):
                sc.frame_set(200 + k)
                render(f'{out}/idle-{k:02d}.png', side, (1000, 1000))
            continue
        for i in range(N):
            A.apply(i, blend(up, down, i / (N - 1)))
        for i in range(N):
            # -1 leans to their left, +1 to their right; the head tilts 60% further than the body
            l = i / (N - 1) * 2 - 1
            lap = {'L': ('lap', (0.12, -0.2, A.seat + 0.2)), 'R': ('lap', (-0.12, -0.2, A.seat + 0.2))}
            A.apply(100 + i, A.base(hips_rot=(0, 0, 4 * l), spine=(0, 0, 8 * l), chest=(0, 0, 9 * l), neck=(0, 0, 5 * l), head=(0, 0, 11 * l), hands=lap))
        for i in range(N):
            sc.frame_set(i)
            render(f'{out}/side-{i:02d}.png', side, (1000, 1000))
        for n in desk_side:
            O[n].hide_render = True
        for i in range(N):
            sc.frame_set(100 + i)
            render(f'{out}/front-{i:02d}.png', front, (640, 760))
        sc.frame_set(100 + N // 2)
        render(f'{out}/face.png', face, (240, 240))
        for n in desk_side:
            O[n].hide_render = False


main()
