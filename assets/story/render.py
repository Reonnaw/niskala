# Run inside Blender with story.blend open, after animate.py has keyed a character:
#   exec(open('assets/story/render.py').read()); backgrounds(); actor('raka')
# The room is drawn once by day and once by night; the character and the props that move are
# drawn per frame on transparency with the room as a holdout, so the desk still hides the legs.
# It is seen like the landing hero: an isometric diorama standing on a slab of soga earth.
import os

import bpy
from mathutils import Vector

O = bpy.data.objects
OUT = bpy.path.abspath('//render')
SIZE = (1200, 1200)
ISO = {'__name__': 'iso'}
exec(open(bpy.path.abspath('//iso.py')).read(), ISO)


def _stage():
    cam = O.get('IsoStory')
    if cam:
        return cam
    base = ISO['box']('story_base', (ISO['X0'], ISO['Y0'], ISO['FLOOR_BOTTOM'] - 0.3), (ISO['X1'], ISO['Y1'], ISO['FLOOR_BOTTOM']),
                      ISO['toon']('Iso_soga', '#5a3a24', rim=0.3))
    # In the Room collection, so the character's frames hold it out like the rest of the room.
    bpy.context.scene.collection.objects.unlink(base)
    bpy.data.collections['Room'].objects.link(base)
    look = Vector(((ISO['X0'] + ISO['X1']) / 2, (ISO['Y0'] + ISO['Y1']) / 2, 1.15))
    return ISO["camera"]("IsoStory", look, 6.55)


def _setup():
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_EEVEE'
    sc.eevee.taa_render_samples = 16
    sc.render.film_transparent = True
    sc.render.resolution_x, sc.render.resolution_y = SIZE
    sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.camera = _stage()
    return sc


def _collections(**state):
    # state: name -> 'show' | 'hide' | 'holdout'
    for lc in bpy.context.view_layer.layer_collection.children:
        s = state.get(lc.name, 'show')
        lc.exclude = s == 'hide'
        lc.holdout = s == 'holdout'


def _night(on):
    # The lit shade glows a warm cream; it is made here because no saved file carries it.
    if 'LampOn' not in bpy.data.materials:
        ISO['toon']('LampOn', '#f7e7a8', glow=1.0)
    O['sky'].hide_render = on
    O['sky_night'].hide_render = not on
    lamp = O['lampRoundTable']
    for slot in lamp.material_slots:
        if slot.material and slot.material.name in ('KLampShade', 'LampOn'):
            slot.material = bpy.data.materials['LampOn' if on else 'KLampShade']


def backgrounds():
    sc = _setup()
    os.makedirs(OUT, exist_ok=True)
    for kind in ('day', 'night'):
        _night(kind == 'night')
        _collections(Props='hide', Actor='hide', Night='show' if kind == 'night' else 'hide')
        sc.frame_set(sc.frame_end if kind == 'night' else 0)
        sc.render.filepath = f'{OUT}/bg-{kind}.png'
        bpy.ops.render.render(write_still=True)
    _night(False)
    _collections()
    sc.frame_set(0)


def actor(name, start=None, end=None):
    sc = _setup()
    out = f'{OUT}/{name}'
    os.makedirs(out, exist_ok=True)
    others = [n for n in ('raka', 'ayu') if n != name]
    for n in others:
        O[n].hide_render = True
    O[name].hide_render = False
    _night(False)
    _collections(Room='holdout', Night='hide')
    step = 2
    first = sc.frame_start if start is None else start
    last = sc.frame_end if end is None else end
    for f in range(first, last + 1, step):
        sc.frame_set(f)
        sc.render.filepath = f'{out}/{f // step:03d}.png'
        bpy.ops.render.render(write_still=True)
    _collections()
    sc.frame_set(0)
