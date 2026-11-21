# Run inside Blender with story.blend open, after characters.py:
#   exec(open('assets/story/animate.py').read()); animate('raka')
# Keys one character through the six beats of the landing page story, plus the props that
# react to them (chair, mug, laptop lid and screen, clock, nightfall). Poses are written in the
# character's own frame (origin on the floor under the pelvis, facing -Y before yaw), so the same
# script fits both bodies through their measured landmarks in characters.py.
import json
import math

import bpy
from mathutils import Matrix, Vector

O = bpy.data.objects
CHAIR = (0.62, 0.45)           # chair centre while seated; the character faces +X (yaw 90)
CHAIR_OUT = (0.34, 0.5)        # rolled back as they stand
CHAIR_BACK = (0.42, 1.02)      # then pushed aside, out of the walk to the coffee machine
DESK_MUG = (0.95, 0.14, 0.646)
MACHINE_MUG = (-1.62, 1.12, 0.9)
MACHINE_SPOT = (-1.62, 0.6)
DESK_SPOT = (0.62, 0.32)
LID_TOP = (1.13, 0.45, 0.85)
STEP = 2                        # every second frame is rendered
CHAIR_TOP = 0.455               # seat cushion height of the unscaled Kenney chair
BACKREST = 0.186                # how far the backrest front sits behind the centre of the unscaled chair
KEYS = 0.98                     # where the fingertips rest on the keyboard (world x)


def T(v):
    return Matrix.Translation(Vector(v))


def Rz(d):
    return Matrix.Rotation(math.radians(d), 4, 'Z')


def Rx(d):
    return Matrix.Rotation(math.radians(d), 4, 'X')


def Ry(d):
    return Matrix.Rotation(math.radians(d), 4, 'Y')


def ease(u):
    return u * u * (3 - 2 * u)


def lerp(a, b, u):
    return tuple(x + (y - x) * u for x, y in zip(a, b))


# Hand orientations in the character frame, from the T-pose hand (pointing out, palm down).
HAND = {
    'type': lambda k: Rz(-90 * k),
    'down': lambda k: Ry(90 * k),
    'up': lambda k: Ry(-90 * k),
    'mug': lambda k: Ry(90 * k) @ Rz(-90 * k),
    'cheek': lambda k: Rz(180) @ Ry(90 * k),
    'lap': lambda k: Rz(-90 * k) @ Rx(-25),
}
CONTROLS = [f'{b}.{s}' for b in ('hand_ik', 'elbow_pole', 'foot_ik', 'knee_pole') for s in ('L', 'R')]


class Actor:
    def __init__(self, name):
        from_chars = CHARACTERS[name]  # noqa: F821 (defined by characters.py)
        self.name, self.c = name, from_chars
        self.rig = O[f'rig_{name}']
        self.P = self.rig.pose.bones
        # thighs level and shins upright: the pelvis sits one shin above the ankles, the seat 7 cm below it
        self.seat = from_chars['ankle'][2] + self.rig.data.bones['shin.L'].length - 0.05
        self.thigh = self.rig.data.bones['thigh.L'].length
        verts = O[name].data.vertices
        # the chair rolls back until its backrest is a centimetre behind the back, measured at backrest height
        back = max(v.co.y for v in verts if from_chars['hips'] < v.co.z < from_chars['hips'] + 0.4) + 0.005
        self.chair_back = back + 0.01 - BACKREST * self.seat / CHAIR_TOP
        # wrists stop a hand's length short of the keys, so the fingertips land on the keyboard, not the screen
        self.type_y = CHAIR[0] - KEYS + max(abs(v.co.x) for v in verts) - from_chars['wrist_x']
        self.reach = from_chars['wrist_x'] - from_chars['shoulder_x']
        self.rest = {pb.name: pb.bone.matrix_local.to_3x3().to_4x4() for pb in self.P}
        self.keys = []

    def pole(self, kind, k, pz):
        c = self.c
        return {
            'type': (0.45 * k, 0.35, c['arm_z'] - 0.4 + pz),
            'lap': (0.45 * k, 0.35, c['arm_z'] - 0.4 + pz),
            'down': (0.25 * k, 0.6, c['arm_z'] - 0.3 + pz),
            'mug': (0.5 * k, 0.35, c['arm_z'] - 0.5 + pz),
            'up': (0.9 * k, 0.1, c['arm_z'] + 0.1 + pz),
            'cheek': (0.3 * k, -0.4, c['arm_z'] - 0.55 + pz),
        }[kind]

    def apply(self, f, p):
        P, c = self.P, self.c
        C = T((p['pos'][0], p['pos'][1], 0)) @ Rz(p['yaw'])
        P['root'].matrix = C
        bpy.context.view_layer.update()
        hb, ht, hl = p['hips_rot']
        P['hips'].matrix = C @ T(p['pelvis']) @ Rz(ht) @ Rx(hb) @ Ry(-hl) @ self.rest['hips']
        bpy.context.view_layer.update()
        for b in ('spine', 'chest', 'neck', 'head'):
            P[b].rotation_euler = [math.radians(v) for v in p[b]]
        # standing poses lift the elbow poles with the pelvis; seated ones drop them
        pz = p['pelvis'][2] - c['hips']
        for s, k in (('L', 1), ('R', -1)):
            kind, pos, *space = p['hands'][s]
            W = T(pos) if space else C @ T(pos)
            P[f'hand_ik.{s}'].matrix = T(W.translation) @ Rz(p['yaw']) @ HAND[kind](k) @ Rx(c['palm']) @ self.rest[f'hand_ik.{s}']
            P[f'elbow_pole.{s}'].matrix = C @ T(self.pole(kind, k, pz)) @ self.rest[f'elbow_pole.{s}']
            fx, fy, *fw = p['feet'][s]
            if fw:  # world plant: (x, y, yaw)
                P[f'foot_ik.{s}'].matrix = T((fx, fy, c['ankle'][2])) @ Rz(fw[0]) @ self.rest[f'foot_ik.{s}']
            else:
                P[f'foot_ik.{s}'].matrix = C @ T((fx, fy, c['ankle'][2])) @ self.rest[f'foot_ik.{s}']
            P[f'knee_pole.{s}'].matrix = C @ T((0.12 * k, -0.9, c['hips'])) @ self.rest[f'knee_pole.{s}']
        bpy.context.view_layer.update()
        for pb in P:
            pb.keyframe_insert('location', frame=f)
            pb.keyframe_insert('rotation_euler', frame=f)
        self.keys.append((f, p))

    # pose builders -------------------------------------------------------
    def base(self, **o):
        c = self.c
        p = dict(pos=CHAIR, yaw=90, pelvis=(0, 0.03, self.seat + 0.07), hips_rot=(0, 0, 0),
                 spine=(0, 0, 0), chest=(0, 0, 0), neck=(4, 0, 0), head=(8, 0, 0),
                 hands={'L': ('type', (0.12, self.type_y, 0.69)), 'R': ('type', (-0.12, self.type_y, 0.69))},
                 feet={'L': (0.12, 0.01 - self.thigh), 'R': (-0.12, 0.01 - self.thigh)})
        p.update(o)
        return p

    def standing(self, pos, yaw, **o):
        c = self.c
        hang = c['arm_z'] - self.reach + 0.03
        p = self.base(pos=pos, yaw=yaw, pelvis=(0, 0.025, c['hips'] - 0.005), neck=(0, 0, 0), head=(0, 0, 0),
                      hands={'L': ('down', (c['shoulder_x'] + 0.02, 0.0, hang)), 'R': ('down', (-c['shoulder_x'] - 0.02, 0.0, hang))},
                      feet={'L': (0.11, 0.0), 'R': (-0.11, 0.0)})
        p.update(o)
        return p

    def chin(self, p):
        c = self.c
        # under the jaw and a little forward, so the hand props the head instead of covering the face
        return (-0.24, -0.2, p['pelvis'][2] + (c['head_z'] - c['hips']) - 0.16)

    # walking ---------------------------------------------------------------
    def walk(self, f, start, goal, yaw0, yaw1, right='down', turn_via=None, stride=0.36, step_frames=9):
        """Steps from start to goal; returns the frame after the last step. Feet plant in world space."""
        c = self.c
        fwd = lambda y: Vector((math.sin(math.radians(y)), -math.cos(math.radians(y))))
        left = lambda y: Vector((math.cos(math.radians(y)), math.sin(math.radians(y))))
        a, b = Vector(start), Vector(goal)
        d = b - a
        heading = math.degrees(math.atan2(d.x, -d.y))
        # unwrap so turns take the short way, or the one through turn_via (towards the camera)
        def unwrap(y, ref):
            while y - ref > 180:
                y -= 360
            while y - ref < -180:
                y += 360
            return y
        heading = unwrap(heading, yaw0) if turn_via is None else unwrap(heading, turn_via)
        yaw1 = unwrap(yaw1, heading)
        stances = []
        turn_in = abs(heading - yaw0)
        for i in range(1, max(1, round(turn_in / 70)) + 1):
            stances.append((a, yaw0 + (heading - yaw0) * i / max(1, round(turn_in / 70))))
        n = max(1, math.ceil(d.length / stride))
        for i in range(1, n + 1):
            stances.append((a + d * (i / n), heading))
        turn_out = abs(yaw1 - heading)
        for i in range(1, max(1, round(turn_out / 70)) + 1):
            stances.append((b, heading + (yaw1 - heading) * i / max(1, round(turn_out / 70))))
        stances.append((b, yaw1))  # bring the trailing foot alongside
        plant = {'L': (a + left(yaw0) * 0.11, yaw0), 'R': (a - left(yaw0) * 0.11, yaw0)}
        prev = (a, yaw0)
        side = 'L'
        hang = c['arm_z'] - self.reach + 0.03
        for si, (pos, yaw) in enumerate(stances):
            k = 1 if side == 'L' else -1
            target = (pos + left(yaw) * 0.11 * k, yaw)
            start_plant = plant[side]
            for j in range(step_frames):
                u = (j + 1) / step_frames
                e = ease(u)
                cpos = prev[0].lerp(pos, e)
                cyaw = prev[1] + (yaw - prev[1]) * e
                swing = start_plant[0].lerp(target[0], e)
                feet = {side: (swing.x, swing.y, start_plant[1] + (target[1] - start_plant[1]) * e)}
                other = 'R' if side == 'L' else 'L'
                feet[other] = (plant[other][0].x, plant[other][0].y, plant[other][1])
                lift = 0.06 * math.sin(math.pi * u)
                arm = 0.12 * math.sin(math.pi * u) * (1 if side == 'L' else -1)
                p = self.standing((cpos.x, cpos.y), cyaw,
                                  pelvis=(0, 0.025, c['hips'] - 0.03 + 0.02 * math.sin(math.pi * u)),
                                  hips_rot=(0, 6 * arm / 0.12, 0), chest=(4, -8 * arm / 0.12, 0),
                                  feet=feet)
                p['hands'] = {
                    'L': ('down', (c['shoulder_x'] + 0.03, arm, hang + 0.02)),
                    'R': ('mug', (-0.15, -0.24, c['arm_z'] - 0.42)) if right == 'mug' else ('down', (-c['shoulder_x'] - 0.03, -arm, hang + 0.02)),
                }
                self.apply(f, p)
                # lift the swinging foot after the pose is keyed in world space
                fb = self.P[f'foot_ik.{side}']
                fb.matrix = T((0, 0, lift)) @ fb.matrix
                bpy.context.view_layer.update()
                fb.keyframe_insert('location', frame=f)
                f += 1
            plant[side] = target
            prev = (pos, yaw)
            side = 'R' if side == 'L' else 'L'
        return f


def animate(name):
    exec(open(bpy.path.abspath('//characters.py')).read(), globals())
    rig = O[f'rig_{name}']
    rig.location = (0, 0, 0)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode='EDIT')
    for n in CONTROLS:
        rig.data.edit_bones[n].parent = None
    bpy.ops.object.mode_set(mode='OBJECT')
    for o in (rig, O['chairDesk'], O['mug'], O['clock_hour'], O['clock_min']):
        o.animation_data_clear()
    for pb in rig.pose.bones:
        pb.location, pb.rotation_euler, pb.scale = (0, 0, 0), (0, 0, 0), (1, 1, 1)
    A = Actor(name)
    O['blob_actor'].constraints[0].target = rig
    c = A.c
    s = A.seat
    marks = {}

    # 1 Bungkuk ke depan: typing, then the back rounds and the head juts towards the screen
    f = 0
    marks['b0'] = f
    A.apply(0, A.base())
    A.apply(14, A.base(head=(10, 0, 0)))
    slouch = A.base(pelvis=(0, -0.02, s + 0.06), hips_rot=(-10, 0, 0), spine=(16, 0, 0), chest=(16, 0, 0), neck=(24, 0, 0), head=(-14, 0, 0),
                    hands={'L': ('type', (0.11, A.type_y - 0.02, 0.69)), 'R': ('type', (-0.11, A.type_y - 0.02, 0.69))})
    A.apply(52, slouch)
    A.apply(72, slouch)
    marks['glow0'] = (48, 72)

    # 2 Miring ke samping: sits up, then slumps onto one hand
    marks['b1'] = 72
    A.apply(84, A.base())
    lean = A.base(hips_rot=(0, 0, 6), spine=(4, 0, 12), chest=(4, -6, 14), neck=(4, 0, 10), head=(2, -8, 18))
    lean['hands'] = dict(lean['hands'], R=('cheek', A.chin(lean)))
    A.apply(110, lean)
    A.apply(144, lean)
    marks['glow1'] = (106, 144)

    # 3 Kedipan: leans back, hands in the lap, looks far out of the window
    marks['b2'] = 144
    A.apply(156, A.base())
    away = A.base(spine=(-6, 4, 0), chest=(-4, 10, 0), neck=(-4, 22, 0), head=(-12, 34, 0),
                  hands={'L': ('lap', (0.12, -0.2, s + 0.2)), 'R': ('lap', (-0.12, -0.2, s + 0.2))})
    A.apply(172, away)
    A.apply(204, dict(away, head=(-14, 36, 2)))
    marks['cue2'] = (144, 158)

    # 4 Lama di depan layar: stands up and stretches
    marks['b3'] = 204
    A.apply(212, A.base(hands={'L': ('type', (0.14, A.type_y + 0.05, 0.68)), 'R': ('type', (-0.14, A.type_y + 0.05, 0.68))}))
    A.apply(222, A.base(spine=(22, 0, 0), chest=(10, 0, 0), feet={'L': (0.12, -0.1), 'R': (-0.12, -0.1)},
                        hands={'L': ('type', (0.16, A.type_y + 0.05, 0.68)), 'R': ('type', (-0.16, A.type_y + 0.05, 0.68))}))
    stand = A.standing(CHAIR, 90)
    A.apply(238, stand)
    # reach forward and up: the arms are shorter than the head is tall, so they can't go over it
    up = A.standing(CHAIR, 90, chest=(-8, 0, 0), head=(-12, 0, 0),
                    hands={'L': ('type', (0.15, -0.28, c['arm_z'] + 0.2)), 'R': ('type', (-0.15, -0.28, c['arm_z'] + 0.2))})
    A.apply(252, up)
    A.apply(264, dict(up, spine=(0, 0, 8), chest=(-6, 0, 12)))
    A.apply(276, dict(up, spine=(0, 0, -8), chest=(-6, 0, -12)))
    A.apply(288, stand)
    marks['cue3'] = (204, 214)

    # 5 Pas kamu pergi: takes the mug and walks to the coffee machine
    marks['b4'] = 288
    grab = A.standing(CHAIR, 90, spine=(10, 0, 0))
    grab['hands'] = dict(grab['hands'], R=('mug', (DESK_MUG[0] - 0.05, DESK_MUG[1] + 0.04, DESK_MUG[2] + 0.07), 'world'))
    A.apply(298, grab)
    A.apply(302, grab)
    hold = A.standing(CHAIR, 90)
    hold['hands'] = dict(hold['hands'], R=('mug', (-0.15, -0.24, c['arm_z'] - 0.42)))
    A.apply(310, hold)
    f = A.walk(311, CHAIR, MACHINE_SPOT, 90, 180, right='mug', turn_via=0)
    at = A.standing(MACHINE_SPOT, 180)
    at['hands'] = dict(at['hands'], R=('mug', (-0.15, -0.24, c['arm_z'] - 0.42)))
    A.apply(f + 2, at)
    put = A.standing(MACHINE_SPOT, 180, spine=(8, 0, 0))
    put['hands'] = dict(put['hands'], R=('mug', (MACHINE_MUG[0] + 0.05, MACHINE_MUG[1] - 0.04, MACHINE_MUG[2] + 0.07), 'world'))
    A.apply(f + 10, put)
    marks['mug_drop'] = f + 12
    A.apply(f + 20, A.standing(MACHINE_SPOT, 180))
    marks['b5'] = f + 30
    A.apply(f + 30, A.standing(MACHINE_SPOT, 180, head=(-6, -10, 0)))

    # 6 Jam malam: night falls, takes the mug back to the desk, closes the laptop, waves goodnight
    f += 30
    marks['night'] = (f, f + 20)
    A.apply(f + 12, put)
    marks['mug_pick'] = f + 14
    A.apply(f + 22, at)
    f = A.walk(f + 23, MACHINE_SPOT, DESK_SPOT, 180, 90, right='mug')
    lay = A.standing(DESK_SPOT, 90, spine=(10, 0, 0))
    lay['hands'] = dict(lay['hands'], R=('mug', (DESK_MUG[0] - 0.05, DESK_MUG[1] + 0.04, DESK_MUG[2] + 0.07), 'world'))
    A.apply(f + 8, lay)
    marks['mug_down'] = f + 10
    A.apply(f + 16, A.standing(DESK_SPOT, 90))
    reach = A.standing(DESK_SPOT, 90, spine=(14, 0, 0))
    reach['hands'] = dict(reach['hands'], R=('type', (LID_TOP[0] - 0.08, LID_TOP[1] - 0.06, LID_TOP[2] + 0.02), 'world'))
    A.apply(f + 26, reach)
    marks['lid'] = (f + 28, f + 40)
    shut = A.standing(DESK_SPOT, 90, spine=(16, 0, 0))
    shut['hands'] = dict(shut['hands'], R=('type', (1.0, LID_TOP[1] - 0.06, 0.74), 'world'))
    A.apply(f + 40, shut)
    A.apply(f + 50, A.standing(DESK_SPOT, 90))
    wave = A.standing(DESK_SPOT, 30, head=(-4, 0, 0))
    wave_up = lambda dx: dict(wave, hands=dict(wave['hands'], R=('up', (-0.32 + dx, -0.12, c['arm_z'] + 0.32))))
    A.apply(f + 62, wave)
    A.apply(f + 70, wave_up(0))
    A.apply(f + 76, wave_up(-0.06))
    A.apply(f + 82, wave_up(0.04))
    A.apply(f + 88, wave_up(-0.06))
    A.apply(f + 94, wave_up(0.04))
    end = f + 100
    A.apply(end, wave_up(0))
    marks['end'] = end
    scene = bpy.context.scene
    scene.frame_start, scene.frame_end = 0, end

    # props --------------------------------------------------------------
    chair = O['chairDesk']
    seat_scale = s / CHAIR_TOP
    chair.scale = (seat_scale,) * 3
    cx, cy = chair.location.x, chair.location.y
    bpy.context.view_layer.update()
    seated = (CHAIR[0] - A.chair_back, CHAIR[1])
    for fr, (x, y) in ((0, seated), (218, seated), (236, CHAIR_OUT), (262, CHAIR_BACK)):
        bb = [chair.matrix_world @ Vector(v) for v in chair.bound_box]
        chair.location.x += x - (min(v.x for v in bb) + max(v.x for v in bb)) / 2
        chair.location.y += y - (min(v.y for v in bb) + max(v.y for v in bb)) / 2
        bpy.context.view_layer.update()
        chair.keyframe_insert('location', frame=fr)
    chair.rotation_euler.z = math.radians(90)
    chair.keyframe_insert('rotation_euler', frame=218)
    chair.rotation_euler.z = math.radians(60)
    chair.keyframe_insert('rotation_euler', frame=262)

    hinge = O.get('lid_hinge')
    if hinge is None:
        hinge = bpy.data.objects.new('lid_hinge', None)
        bpy.data.collections['Props'].objects.link(hinge)
        hinge.location = O['laptop_lid'].matrix_world.translation
        bpy.context.view_layer.update()
        lid = O['laptop_lid']
        mw = lid.matrix_world.copy()
        lid.parent = hinge
        lid.matrix_parent_inverse = hinge.matrix_world.inverted()
        lid.matrix_world = mw
    hinge.animation_data_clear()
    # the lid leans back 23 degrees from vertical; fold it onto the base about world Y
    for fr, deg in ((marks['lid'][0], 0), (marks['lid'][1], -112)):
        hinge.rotation_euler = (0, math.radians(deg), 0)
        hinge.keyframe_insert('rotation_euler', frame=fr)

    scr = O['laptop_screen'].active_material.node_tree.nodes
    for node, keys in (('glow', [(0, 0), (marks['glow0'][0] - 4, 0), (marks['glow0'][0] + 6, 1), (marks['glow0'][1] + 8, 0),
                                 (marks['glow1'][0] - 4, 0), (marks['glow1'][0] + 6, 1), (marks['glow1'][1] + 8, 0)]),
                       ('warm', [(0, 0), (marks['night'][0], 0), (marks['night'][1], 1)]),
                       ('on', [(0, 1), (marks['lid'][1] - 4, 1), (marks['lid'][1], 0)])):
        sock = scr[node].outputs[0]
        for fr, v in keys:
            sock.default_value = v
            sock.keyframe_insert('default_value', frame=fr)
    night = bpy.data.node_groups['Toon'].nodes['night'].outputs[0]
    for fr, v in ((0, 0), (marks['night'][0], 0), (marks['night'][1], 0.75)):
        night.default_value = v
        night.keyframe_insert('default_value', frame=fr)

    # clock: 09:00 at the start, 22:30 by the goodnight
    for fr, hh in ((0, 9), (marks['b1'], 10.5), (marks['b2'], 12.5), (marks['b3'], 15), (marks['b4'], 16.5), (marks['b5'], 18.5), (marks['end'], 22.5)):
        O['clock_min'].rotation_euler = (0, math.radians((hh % 1) * 360 + int(hh - 9) * 360), 0)
        O['clock_hour'].rotation_euler = (0, math.radians(hh / 12 * 360), 0)
        O['clock_min'].keyframe_insert('rotation_euler', frame=fr)
        O['clock_hour'].keyframe_insert('rotation_euler', frame=fr)

    # mug: sits on the desk, rides in the right hand, waits at the machine, rides back
    mug = O['mug']
    held = [(marks['mug_drop'] > fr >= 302) or (marks['mug_down'] > fr >= marks['mug_pick']) for fr in range(end + 1)]
    offset = None
    rest_desk = Matrix.Translation(DESK_MUG) @ Rz(200)
    rest_machine = Matrix.Translation(MACHINE_MUG) @ Rz(180)
    for fr in range(end + 1):
        scene.frame_set(fr)
        hand = rig.matrix_world @ rig.pose.bones['hand.R'].matrix
        if held[fr]:
            if offset is None:
                offset = hand.inverted() @ mug.matrix_world
            mug.matrix_world = hand @ offset
        else:
            offset = None
            mug.matrix_world = rest_desk if fr < 302 or fr >= marks['mug_down'] else rest_machine
            mug.scale = (1.3,) * 3
        mug.keyframe_insert('location', frame=fr)
        mug.keyframe_insert('rotation_euler', frame=fr)
    scene.frame_set(0)

    timeline = dict(end=end, step=STEP, marks=marks)
    with open(bpy.path.abspath(f'//timeline-{name}.json'), 'w') as fh:
        json.dump(timeline, fh, indent=1)
    return timeline
