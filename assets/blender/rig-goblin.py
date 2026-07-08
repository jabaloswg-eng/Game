# rig-goblin.py — takes the AI-converted goblin mesh (assets/goblin-ai.glb),
# cleans it up, builds a skeleton, binds the mesh with automatic weights,
# authors Idle / Walk / Attack animations, and exports
# assets/goblin-ai-rigged.glb with the clips embedded.
#
#   blender --background --python assets/blender/rig-goblin.py
#   PREVIEW=1 renders pose-check stills to assets/blender/rig-*.png

import bpy
import math
import os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SRC = os.path.join(ROOT, "goblin-ai.glb")
OUT = os.path.join(ROOT, "goblin-ai-rigged.glb")
PREVIEW_DIR = os.path.dirname(os.path.abspath(__file__))

# ---------------------------------------------------------------- import

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete()

bpy.ops.import_scene.gltf(filepath=SRC)
meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
for o in meshes:
    o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1:
    bpy.ops.object.join()
gob = bpy.context.view_layer.objects.active
gob.name = "Goblin"

# Stand the model up by baking transforms directly into the mesh data —
# operator-based transform_apply misses the importer's parent nodes.
# In world space the imported model lies with its body axis along +Y and
# its belly facing -Z; +90° X stands it up, 180° Z faces it to -Y.
from mathutils import Matrix

world = gob.matrix_world.copy()
stand = Matrix.Rotation(math.radians(180), 4, "Z") @ Matrix.Rotation(math.radians(90), 4, "X")
gob.data.transform(stand @ world)
if gob.parent:
    gob.parent = None
gob.matrix_world = Matrix.Identity(4)

spans = [max(v.co[i] for v in gob.data.vertices) - min(v.co[i] for v in gob.data.vertices) for i in range(3)]
print("spans x/y/z after standing:", [round(s, 2) for s in spans])
assert spans[2] == max(spans), "model is not upright — orientation assumptions are wrong"

# ---------------------------------------------------------------- cleanup

import bmesh

bm = bmesh.new()
bm.from_mesh(gob.data)
col_layer = bm.loops.layers.color.active

zs = [v.co.z for v in bm.verts]
z0, z1 = min(zs), max(zs)
H = z1 - z0

# the conversion left a pale blob between the legs: delete vertices that
# are (a) low on the body, (b) near the centerline, and (c) near-white —
# the skull mask and bone necklace sit much higher, so they're safe
doomed = set()
for face in bm.faces:
    for loop in face.loops:
        c = loop[col_layer]
        v = loop.vert
        rel_z = (v.co.z - z0) / H
        if rel_z < 0.42 and abs(v.co.x) < 0.30 * H and min(c[0], c[1], c[2]) > 0.55:
            doomed.add(v)
print("blob vertices to remove:", len(doomed))
bmesh.ops.delete(bm, geom=list(doomed), context="VERTS")
bm.to_mesh(gob.data)
bm.free()

# Blender 4.0's exporter only writes vertex colors if a material uses
# them — wire the color attribute into a Principled BSDF's base color.
vc_mat = bpy.data.materials.new("GoblinVertexColor")
vc_mat.use_nodes = True
nodes = vc_mat.node_tree.nodes
links = vc_mat.node_tree.links
bsdf = nodes["Principled BSDF"]
bsdf.inputs["Roughness"].default_value = 0.9
attr = nodes.new("ShaderNodeVertexColor")
attr.layer_name = gob.data.color_attributes[0].name if gob.data.color_attributes else "Color"
links.new(attr.outputs["Color"], bsdf.inputs["Base Color"])
gob.data.materials.clear()
gob.data.materials.append(vc_mat)

# ---------------------------------------------------------------- armature

# proportions measured from the cleaned mesh bounding box
bb = [gob.matrix_world @ v.co for v in [gob.data.vertices[i] for i in range(0, len(gob.data.vertices), 50)]]
z0 = min(v.z for v in bb); z1 = max(v.z for v in bb)
H = z1 - z0
W = max(abs(v.x) for v in bb)

def Z(f): return z0 + H * f

bpy.ops.object.armature_add(location=(0, 0, 0))
arm = bpy.context.object
arm.name = "GoblinRig"
bpy.ops.object.mode_set(mode="EDIT")
eb = arm.data.edit_bones
eb.remove(eb[0])

def bone(name, head, tail, parent=None):
    b = eb.new(name)
    b.head = head
    b.tail = tail
    if parent:
        b.parent = eb[parent]
    return b

# measure where the limbs actually are instead of guessing:
# arm x = average |x| of the widest vertices in the shoulder band,
# leg x = average |x| of vertices in the lower body
arm_xs, leg_xs = [], []
for v in gob.data.vertices:
    rz = (v.co.z - z0) / H
    if 0.40 < rz < 0.62 and abs(v.co.x) > 0.5 * W:
        arm_xs.append(abs(v.co.x))
    if 0.05 < rz < 0.30 and 0.02 < abs(v.co.x) < 0.5 * W:
        leg_xs.append(abs(v.co.x))
AW = (sum(arm_xs) / len(arm_xs)) if arm_xs else W * 0.62   # arm centerline
LW = (sum(leg_xs) / len(leg_xs)) if leg_xs else W * 0.30   # leg centerline
print("measured arm x:", round(AW, 3), "leg x:", round(LW, 3), "of W", round(W, 3))

bone("hips",  (0, 0, Z(0.46)), (0, 0, Z(0.58)))
bone("spine", (0, 0, Z(0.58)), (0, 0, Z(0.72)), "hips")
bone("head",  (0, 0, Z(0.72)), (0, 0, Z(0.98)), "spine")
for s, side in ((-1, ".L"), (1, ".R")):
    bone("upper_arm" + side, (s * AW * 0.85, 0, Z(0.62)), (s * AW, 0, Z(0.50)), "spine")
    bone("forearm" + side,   (s * AW, 0, Z(0.50)), (s * AW * 1.15, -0.04 * H, Z(0.34)), "upper_arm" + side)
    bone("thigh" + side,     (s * LW, 0, Z(0.42)), (s * LW, 0.01 * H, Z(0.22)), "hips")
    bone("shin" + side,      (s * LW, 0.01 * H, Z(0.22)), (s * LW, -0.03 * H, Z(0.02)), "thigh" + side)

bpy.ops.object.mode_set(mode="OBJECT")

# Bind mesh to skeleton. Blender's automatic ("bone heat") weighting fails
# on non-manifold AI-generated meshes, so weights are assigned by clean
# anatomical regions instead, then smoothed to soften the joints.
gob.select_set(True)
arm.select_set(True)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.parent_set(type="ARMATURE_NAME")  # empty groups, no auto weights

for b in arm.data.bones:
    if b.name not in gob.vertex_groups:
        gob.vertex_groups.new(name=b.name)

def region_bone(p):
    """pick a bone from a vertex position (model space: z up, front -y)"""
    rz = (p.z - z0) / H
    side = ".L" if p.x < 0 else ".R"
    ax = abs(p.x)
    if rz > 0.70:
        return "head"
    if ax > 0.45 * W or (ax > 0.8 * W):          # arms (and the club island)
        return ("upper_arm" if rz > 0.52 else "forearm") + side
    if rz < 0.42:
        return ("thigh" if rz > 0.22 else "shin") + side
    return "spine" if rz > 0.58 else "hips"

for v in gob.data.vertices:
    gob.vertex_groups[region_bone(v.co)].add([v.index], 1.0, "REPLACE")

# soften the hard region boundaries just enough that joints bend without
# tearing — too much smoothing lets weights bleed to distant bones and
# stretches the mesh into spikes
bpy.context.view_layer.objects.active = gob
bpy.ops.object.mode_set(mode="WEIGHT_PAINT")
bpy.ops.object.vertex_group_smooth(group_select_mode="ALL", factor=0.5, repeat=3, expand=0.0)
bpy.ops.object.mode_set(mode="OBJECT")
print("region weights assigned and smoothed")

# ---------------------------------------------------------------- animation

for pb in arm.pose.bones:
    pb.rotation_mode = "XYZ"

def make_action(name, length, keys):
    """keys: {frame: {bone: (rx, ry, rz [, loc])}} rotations in radians"""
    action = bpy.data.actions.new(name)
    arm.animation_data_create()
    arm.animation_data.action = action
    for frame, bones in keys.items():
        bpy.context.scene.frame_set(frame)
        for bname, val in bones.items():
            pb = arm.pose.bones[bname]
            pb.rotation_euler = val[:3]
            pb.keyframe_insert("rotation_euler", frame=frame)
            if len(val) > 3:
                pb.location = val[3]
                pb.keyframe_insert("location", frame=frame)
    action.use_fake_user = True
    # push to NLA so the exporter writes every action as its own clip
    track = arm.animation_data.nla_tracks.new()
    track.name = name
    track.strips.new(name, 1, action)
    arm.animation_data.action = None
    return action

R = math.radians
S = 0.5  # limb swing amplitude

walk = {}
for i, t in ((1, 0), (7, 0.5), (13, 1), (19, 1.5), (25, 2)):  # two full steps
    sw = math.sin(t * math.pi) * S
    hop = abs(math.cos(t * math.pi)) * 0.02 * H
    walk[i] = {
        "thigh.L": (sw, 0, 0), "thigh.R": (-sw, 0, 0),
        "shin.L": (max(0, -sw) * 0.9, 0, 0), "shin.R": (max(0, sw) * 0.9, 0, 0),
        "upper_arm.L": (-sw * 0.6, 0, 0), "upper_arm.R": (sw * 0.6, 0, 0),
        "spine": (R(8), sw * 0.12, 0),
        "hips": (0, 0, 0, (0, 0, hop)),
    }
make_action("Walk", 25, walk)

idle = {}
for i, t in ((1, 0), (24, 0.5), (48, 1)):
    sway = math.sin(t * 2 * math.pi)
    idle[i] = {
        "spine": (R(3) + sway * R(2), sway * R(3), 0),
        "head": (sway * R(-2), 0, sway * R(3)),
        "upper_arm.L": (sway * R(3), 0, R(4)),
        "upper_arm.R": (sway * R(-3), 0, R(-4)),
    }
make_action("Idle", 48, idle)

attack = {
    1:  {"upper_arm.R": (0, 0, 0), "forearm.R": (0, 0, 0), "spine": (R(8), 0, 0)},
    6:  {"upper_arm.R": (R(-130), 0, R(-20)), "forearm.R": (R(-40), 0, 0),   # wind up overhead
         "spine": (R(-6), 0, R(18)), "head": (R(-8), 0, 0)},
    10: {"upper_arm.R": (R(60), 0, R(10)), "forearm.R": (R(25), 0, 0),       # slam down
         "spine": (R(22), 0, R(-14)), "head": (R(6), 0, 0)},
    20: {"upper_arm.R": (0, 0, 0), "forearm.R": (0, 0, 0),
         "spine": (R(8), 0, 0), "head": (0, 0, 0)},
}
make_action("Attack", 20, attack)

# ---------------------------------------------------------------- export

bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(
    filepath=OUT,
    export_format="GLB",
    export_yup=True,
    export_animations=True,
    export_animation_mode="ACTIONS",
    export_skins=True,
)
print("exported:", OUT)

# ---------------------------------------------------------------- previews

if os.environ.get("PREVIEW"):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 16
    scene.cycles.use_denoising = False
    scene.cycles.device = "CPU"
    scene.render.resolution_x = 480
    scene.render.resolution_y = 560
    scene.view_settings.view_transform = "Standard"

    bpy.ops.object.light_add(type="SUN", rotation=(R(45), R(25), 0))
    bpy.context.object.data.energy = 4
    world = bpy.data.worlds["World"]
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (0.8, 0.85, 0.92, 1)
    world.node_tree.nodes["Background"].inputs[1].default_value = 0.9

    bpy.ops.object.camera_add(location=(H * 1.6, -H * 2.6, Z(0.55)),
                              rotation=(R(84), 0, R(30)))
    scene.camera = bpy.context.object

    for action_name, frame in (("Walk", 7), ("Attack", 6), ("Attack", 10), ("Idle", 1)):
        arm.animation_data.action = bpy.data.actions[action_name]
        scene.frame_set(frame)
        scene.render.filepath = os.path.join(PREVIEW_DIR, f"rig-{action_name.lower()}-{frame}.png")
        bpy.ops.render.render(write_still=True)
        print("rendered", action_name, frame)
