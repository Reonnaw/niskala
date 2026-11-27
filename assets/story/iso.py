# Run headless, without saving:  blender -b story.blend --python iso.py -- [preview]
# Renders the landing hero: the story room as an isometric diorama (sekala, the seen world) standing on
# a cut-away of dyed strata (niskala, the unseen), where the kawung lights up what the room keeps hidden.
# render.py execs this file for its helpers and camera, so the story's room is seen the same way.
import math
import os
import sys

import bpy
from mathutils import Vector

ns = {}
exec(open(bpy.path.abspath('//animate.py')).read(), ns)
exec(open(bpy.path.abspath('//characters.py')).read(), ns)
O = bpy.data.objects
OUT = bpy.path.abspath('//render/iso')
PREVIEW = 'preview' in sys.argv

# Floor footprint of the room (x0, x1, y0, y1) and its underside.
X0, X1, Y0, Y1 = -2.73, 2.41, -1.21, 1.73
FLOOR_BOTTOM = -0.13
# Top to bottom: soga earth, then the mind's dyes darkening into the deep. Name, height, share of the footprint kept.
# The unseen part runs about as deep as the room is tall.
STRATA = [('soga', 0.45, 1.0, '#5a3a24'), ('ungu', 0.7, 0.92, '#5b4486'), ('nila', 0.8, 0.78, '#2c3f6b'), ('deep', 0.85, 0.58, '#1c2643')]
GLOW = '#e9b04a'


def rgb(hex_):
    # Hex in sRGB, Blender colour sockets in linear.
    return tuple(((int(hex_[i:i + 2], 16) / 255 + 0.055) / 1.055) ** 2.4 if int(hex_[i:i + 2], 16) / 255 > 0.04045
                 else int(hex_[i:i + 2], 16) / 255 / 12.92 for i in (1, 3, 5)) + (1,)


def toon(name, hex_, rim=0.6, glow=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    g = nt.nodes.new('ShaderNodeGroup')
    g.node_tree = bpy.data.node_groups['Toon']
    g.inputs['Color'].default_value = rgb(hex_)
    g.inputs['Rim'].default_value = rim
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    if glow:
        em = nt.nodes.new('ShaderNodeEmission')
        em.inputs['Color'].default_value = rgb(hex_)
        em.inputs['Strength'].default_value = glow
        nt.links.new(em.outputs[0], out.inputs['Surface'])
    else:
        nt.links.new(g.outputs[0], out.inputs['Surface'])
    return m


def outline(o, base=1):
    if bpy.data.materials['Ink'].name not in [m.name for m in o.data.materials]:
        o.data.materials.append(bpy.data.materials['Ink'])
    mod = o.modifiers.new('outline', 'SOLIDIFY')
    mod.thickness = 0.01
    mod.offset = 1
    mod.use_flip_normals = True
    mod.material_offset = base


def box(name, lo, hi, mat):
    me = bpy.data.meshes.new(name)
    (x0, y0, z0), (x1, y1, z1) = lo, hi
    v = [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0), (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)]
    f = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    me.from_pydata(v, [], f)
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    me.materials.append(mat)
    outline(o)
    return o


def strata():
    """Steps in towards the middle layer by layer, like a floating island; returns each layer's (x0, x1, y0, y1, top, bottom)."""
    cx, cy = (X0 + X1) / 2, (Y0 + Y1) / 2
    z = FLOOR_BOTTOM
    layers = []
    for name, h, keep, hex_ in STRATA:
        hx, hy = (X1 - X0) / 2 * keep, (Y1 - Y0) / 2 * keep
        box(f'iso_{name}', (cx - hx, cy - hy, z - h), (cx + hx, cy + hy, z), toon(f'Iso_{name}', hex_, rim=0.3))
        layers.append((cx - hx, cx + hx, cy - hy, cy + hy, z, z - h))
        z -= h
    return layers


def trace(name, pts):
    """A glowing line through `pts`, with a dot at each end, like a circuit trace."""
    cu = bpy.data.curves.new(name, 'CURVE')
    cu.dimensions = '3D'
    cu.bevel_depth = 0.014
    sp = cu.splines.new('POLY')
    sp.points.add(len(pts) - 1)
    for p, v in zip(sp.points, pts):
        p.co = (*v, 1)
    o = bpy.data.objects.new(name, cu)
    bpy.context.scene.collection.objects.link(o)
    cu.materials.append(toon('Iso_glow', GLOW, glow=1.2))
    for i, v in enumerate((pts[0], pts[-1])):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.035, location=v, segments=12, ring_count=8)
        bpy.context.object.name = f'{name}_dot{i}'
        bpy.context.object.data.materials.append(toon('Iso_glow', GLOW, glow=1.2))


def traces(layers, core):
    """From under the room down every front face, jogging at 45 degrees once per layer like a circuit trace, across
    every ledge, then hanging free into the core under the island."""
    e = 0.012

    def run(start, along, at, flip):
        # `along` picks the coordinate that moves sideways on the face; `at` puts a point on the face of a layer.
        pts, u = [], start
        for i, (x0, x1, y0, y1, top, bot) in enumerate(layers):
            lo, hi = (x0, x1) if along == 'x' else (y0, y1)
            u = min(max(u, lo + 0.2), hi - 0.2)
            j = 0.16 * (1 if (i + flip) % 2 else -1)
            j = j if lo + 0.2 < u + j < hi - 0.2 else -j
            mid = (top + bot) / 2
            if pts:
                pts.append(at(i, u, top + e, ledge=True))
            pts += [at(i, u, top - (0.1 if i == 0 else 0)), at(i, u, mid + abs(j) / 2), at(i, u + j, mid - abs(j) / 2), at(i, u + j, bot + 0.05)]
            u += j
        return pts + [core]

    def front(i, u, z, ledge=False):
        y0 = layers[i][2]
        return (u, y0 - e if not ledge else y0 - e, z)

    def side(i, u, z, ledge=False):
        return (layers[i][1] + e, u, z)

    for k, x in enumerate((-0.6, 0.15, 0.9)):
        trace(f'iso_trace_y{k}', run(x, 'x', front, k))
    for k, y in enumerate((-0.35, 0.85)):
        trace(f'iso_trace_x{k}', run(y, 'y', side, k + 1))


def kawung(at, facing, size):
    """The logo from objects.blend, standing on a cut face; `facing` is the face's outward normal."""
    with bpy.data.libraries.load(bpy.path.abspath('//../objects/objects.blend')) as (src, dst):
        dst.objects = [n for n in src.objects if n in ('logo', 'petal0', 'petal1', 'petal2', 'petal3', 'pupil', 'glint')]
    logo = None
    for o in dst.objects:
        bpy.context.scene.collection.objects.link(o)
        if o.name.startswith('logo'):
            logo = o
    logo.location = at
    logo.scale = (size,) * 3
    logo.rotation_euler = Vector(facing).to_track_quat('Z', 'Y').to_euler()
    for o in dst.objects:
        if o.type == 'MESH' and o.data.materials and o.data.materials[0].name.startswith('Kunyit'):
            # The one lit petal glows: it is what Niskala makes visible.
            o.data.materials[0] = toon('Iso_glow', GLOW, glow=1.2)
    return logo


def stretcher():
    """Ayu on the open floor, standing and reaching up with a side bend: the break next to the work."""
    B = ns['Actor']('ayu')
    B.rig.animation_data_clear()
    c = B.c
    # Both hands raised beside the head, the way the story's wave raises one.
    up = B.standing((-1.15, -0.4), 45, chest=(-6, 0, 6), spine=(0, 0, 5), head=(-10, 0, 8),
                    hands={'L': ('up', (0.32, -0.1, c['arm_z'] + 0.34)), 'R': ('up', (-0.32, -0.1, c['arm_z'] + 0.34))})
    B.apply(0, up)
    blob = bpy.data.objects.new('blob_ayu', O['blob_actor'].data)
    bpy.context.scene.collection.objects.link(blob)
    blob.location.z = O['blob_actor'].location.z
    con = blob.constraints.new('COPY_LOCATION')
    con.target, con.subtarget, con.use_z = B.rig, 'hips', False


def actor():
    O['raka'].hide_render = O['ayu'].hide_render = False
    A = ns['Actor']('raka')
    A.rig.animation_data_clear()
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
    O['blob_actor'].constraints[0].target = A.rig
    A.apply(0, A.base())
    stretcher()
    bpy.context.scene.frame_set(0)


def camera(name, look, scale):
    """True isometric: 45 degrees round, 35.26 degrees down, looking into the room's open corner."""
    cam = O.get(name) or bpy.data.objects.new(name, bpy.data.cameras.new(name))
    if cam.name not in bpy.context.scene.collection.objects:
        bpy.context.scene.collection.objects.link(cam)
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = scale
    cam.location = look + Vector((1, -1, 1)).normalized() * 20
    cam.rotation_euler = (look - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cam.data.clip_end = 60
    return cam


def main():
    sc = bpy.context.scene
    sc.render.film_transparent = True
    sc.eevee.taa_render_samples = 8 if PREVIEW else 32
    bpy.data.node_groups['Toon'].nodes['night'].outputs[0].default_value = 0
    for lc in bpy.context.view_layer.layer_collection.children:
        lc.exclude = False
        lc.holdout = False
    for o in bpy.data.collections['Night'].objects:
        o.hide_render = True
    O['sky_night'].hide_render = True
    actor()
    layers = strata()
    x0, x1, y0, y1, _, bottom = layers[-1]
    view = Vector((1, -1, 1)).normalized()
    # The core hangs under the tip, facing the viewer, nudged forward so the island does not cut into it.
    core = Vector(((x0 + x1) / 2, (y0 + y1) / 2, bottom - 1.7)) + view * 2
    kawung(core, view, 0.42)
    # The traces gather just above the logo, so it hangs from them.
    traces(layers, tuple(core + Vector((-1, 1, 2)).normalized() * 0.5))

    sc.camera = camera('Iso', Vector(((X0 + X1) / 2, (Y0 + Y1) / 2, (bottom - 1.4 + 2.7) / 2)), 9.2)
    size = 800 if PREVIEW else 1800
    sc.render.resolution_x = sc.render.resolution_y = size
    os.makedirs(OUT, exist_ok=True)
    sc.render.filepath = f'{OUT}/{"preview" if PREVIEW else "iso"}.png'
    bpy.ops.render.render(write_still=True)


if __name__ == '__main__':
    main()
