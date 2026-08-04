# goblin.py — builds the masked tribal goblin in Blender (headless) and
# exports assets/goblin-blender.glb for the game.
#
#   blender --background --python assets/blender/goblin.py
#
# Optional: render a preview image with PREVIEW=1 in the environment.

import bpy
import math
import os

OUT_DIR = os.path.dirname(os.path.abspath(__file__))
GLB_PATH = os.path.join(OUT_DIR, "..", "goblin-blender.glb")
PREVIEW_PATH = os.path.join(OUT_DIR, "preview-goblin.png")

# ---------------------------------------------------------------- helpers

def clean_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.lights, bpy.data.cameras):
        for item in list(block):
            if item.users == 0:
                block.remove(item)


def make_mat(name, color, rough=0.85, metallic=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metallic
    return mat


def finish(obj, mat, smooth=True, subsurf=2):
    obj.data.materials.append(mat)
    if smooth:
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.shade_smooth()
    if subsurf:
        mod = obj.modifiers.new("Subsurf", "SUBSURF")
        mod.levels = subsurf
        mod.render_levels = subsurf
    return obj


def sphere(loc, scale, mat, name="part", smooth=True, subsurf=1, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1, location=loc, segments=24, ring_count=16)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.rotation_euler = rot
    return finish(obj, mat, smooth, subsurf)


def cone(loc, r1, r2, depth, mat, name="part", rot=(0, 0, 0), smooth=True, subsurf=0, verts=16):
    bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=r2, depth=depth, location=loc, vertices=verts)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = rot
    return finish(obj, mat, smooth, subsurf)


def cylinder(loc, r, depth, mat, name="part", rot=(0, 0, 0), scale=(1, 1, 1), smooth=True, subsurf=1):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, location=loc, vertices=16)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = rot
    obj.scale = scale
    return finish(obj, mat, smooth, subsurf)

# ---------------------------------------------------------------- build

clean_scene()

# NOTE ON DIRECTION: the goblin faces Blender's -Y (the standard "front"),
# which the glTF exporter turns into +Z — the forward direction enemies
# face in the game.
# NOTE ON COLOR: Principled colors are LINEAR; values are chosen so the
# on-screen (sRGB) result matches the reference palette.

SKIN = make_mat("skin", (0.085, 0.155, 0.045), 0.9)        # mossy goblin green
SKIN_DARK = make_mat("skin_dark", (0.055, 0.095, 0.03), 0.9)
MASK = make_mat("mask", (0.62, 0.55, 0.40), 0.6)           # weathered bone
RUNE = make_mat("rune", (0.28, 0.045, 0.025), 0.7)         # rust-red painted rune
HORN = make_mat("horn", (0.028, 0.022, 0.018), 0.5)
HAIR = make_mat("hair", (0.40, 0.24, 0.075), 0.95)         # straw mane
CLOTH = make_mat("cloth", (0.155, 0.085, 0.04), 0.95)      # skirt
CLOTH_DARK = make_mat("cloth_dark", (0.10, 0.066, 0.038), 0.95)  # wraps & belt
WOOD = make_mat("wood", (0.09, 0.05, 0.024), 0.9)
CLAW = make_mat("claw", (0.60, 0.52, 0.38), 0.45)

# torso: lean hunched core with a small belly, facing -Y
sphere((0, 0, 0.82), (0.27, 0.23, 0.34), SKIN, "torso")
sphere((0, -0.05, 0.64), (0.25, 0.22, 0.22), SKIN, "belly")
sphere((0, 0.02, 1.10), (0.10, 0.10, 0.10), SKIN, "neck")

# head, clearly above the shoulders
head = sphere((0, -0.02, 1.34), (0.235, 0.24, 0.215), SKIN, "head")
head.rotation_euler = (math.radians(-8), 0, 0)

# bone mask: sits on the face (not over the whole head), carved rune,
# eye slits, short horns on the brow
sphere((0, -0.20, 1.33), (0.145, 0.055, 0.185), MASK, "mask")
sphere((0, -0.245, 1.42), (0.042, 0.016, 0.042), RUNE, "rune_top")
sphere((0, -0.253, 1.33), (0.022, 0.016, 0.045), RUNE, "rune_bottom")
for side in (-1, 1):
    sphere((side * 0.07, -0.243, 1.36), (0.04, 0.016, 0.018), HORN, f"eye_{side}")
    cone((side * 0.12, -0.17, 1.53), 0.05, 0.0, 0.26, HORN, f"horn_{side}",
         rot=(math.radians(-20), 0, side * math.radians(-44)), subsurf=1)

# shaggy straw mane: two rings of thick spikes, face left clear
for i in range(12):
    a = (i / 12.0) * math.pi * 2
    fx, fy = math.sin(a), math.cos(a)   # fy = +1 is the back of the head
    if fy < -0.35:  # skip spikes that would cover the mask
        continue
    cone((fx * 0.19, -0.02 + fy * 0.21, 1.44), 0.095, 0.0, 0.46, HAIR, f"mane_a_{i}",
         rot=(math.radians(58) * fy, math.radians(58) * fx, 0), subsurf=1)
for i in range(6):
    a = (i / 6.0) * math.pi * 2
    fx, fy = math.sin(a) * 0.6, math.cos(a) * 0.6
    cone((fx * 0.14, -0.02 + fy * 0.14, 1.60), 0.075, 0.0, 0.36, HAIR, f"mane_b_{i}",
         rot=(math.radians(35) * fy, math.radians(35) * fx, 0), subsurf=1)

# long pointed ears poking sideways through the mane
for side in (-1, 1):
    ear = cone((side * 0.34, -0.02, 1.36), 0.055, 0.0, 0.42, SKIN, f"ear_{side}",
               rot=(0, side * math.radians(98), 0), subsurf=1)
    ear.scale = (1.0, 0.55, 1.0)  # flatten into a leaf shape

# arms: skinny stretched-sphere limbs (subdivision-safe), wraps on forearms
for side in (-1, 1):
    sphere((side * 0.28, 0, 1.02), (0.095, 0.095, 0.10), SKIN, f"shoulder_{side}")
    sphere((side * 0.36, -0.01, 0.88), (0.055, 0.055, 0.17), SKIN, f"upper_arm_{side}",
           rot=(0, side * math.radians(18), 0))
    sphere((side * 0.41, -0.04, 0.66), (0.06, 0.06, 0.155), CLOTH_DARK, f"forearm_{side}",
           rot=(math.radians(-14), side * math.radians(10), 0))
    sphere((side * 0.45, -0.10, 0.50), (0.075, 0.085, 0.075), SKIN_DARK, f"hand_{side}")
    for f in range(3):
        cone((side * 0.45 + (f - 1) * 0.035, -0.165, 0.46), 0.016, 0.0, 0.10, CLAW,
             f"claw_{side}_{f}", rot=(math.radians(100), 0, 0), subsurf=0, verts=8)

# waist cloth (flared skirt) + belt + bone charm on the front
cone((0, 0, 0.46), 0.36, 0.27, 0.30, CLOTH, "skirt", subsurf=1)
belt = cylinder((0, 0, 0.60), 0.275, 0.07, CLOTH_DARK, "belt", subsurf=0)
belt.scale = (1.0, 0.92, 1.0)
sphere((0.13, -0.25, 0.605), (0.035, 0.022, 0.045), MASK, "charm")

# legs: short stretched spheres, big three-toed feet pointing forward (-Y)
for side in (-1, 1):
    sphere((side * 0.14, 0, 0.28), (0.065, 0.065, 0.19), SKIN_DARK, f"leg_{side}")
    sphere((side * 0.15, -0.05, 0.07), (0.085, 0.125, 0.06), SKIN_DARK, f"foot_{side}")
    for f in range(3):
        cone((side * 0.15 + (f - 1) * 0.05, -0.19, 0.05), 0.02, 0.0, 0.09, CLAW,
             f"toe_{side}_{f}", rot=(math.radians(94), 0, 0), subsurf=0, verts=8)

# crude knobby club held in the right hand, resting against the shoulder
club_rot = (math.radians(14), 0, math.radians(-20))
sphere((0.50, -0.06, 0.72), (0.035, 0.035, 0.34), WOOD, "club_handle", rot=club_rot)
sphere((0.615, -0.135, 1.04), (0.10, 0.10, 0.17), WOOD, "club_head", rot=club_rot)
for i in range(6):  # knobs poking out of the club's head
    a = i / 6.0 * math.pi * 2
    sphere((0.615 + math.cos(a) * 0.105, -0.135 + math.sin(a) * 0.105, 1.00 + (i % 3) * 0.06),
           (0.032, 0.032, 0.032), WOOD, f"knob_{i}", subsurf=0)

# ---------------------------------------------------------------- export

bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(
    filepath=GLB_PATH,
    export_format="GLB",
    export_apply=True,   # bake the subdivision modifiers into the mesh
    export_yup=True,
)
print("exported:", os.path.abspath(GLB_PATH))

# ---------------------------------------------------------------- preview

if os.environ.get("PREVIEW"):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 32
    scene.cycles.device = "CPU"
    scene.cycles.use_denoising = False  # this Blender build ships without a denoiser
    scene.render.resolution_x = 640
    scene.render.resolution_y = 720
    scene.render.filepath = PREVIEW_PATH
    scene.view_settings.view_transform = "Standard"  # AgX washes the colors out

    bpy.ops.object.camera_add(location=(0.9, -3.2, 1.35),
                              rotation=(math.radians(80), 0, math.radians(16)))
    scene.camera = bpy.context.object
    bpy.ops.object.light_add(type="SUN", location=(2, -2, 4),
                             rotation=(math.radians(40), math.radians(20), 0))
    bpy.context.object.data.energy = 4
    world = bpy.data.worlds["World"]
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (0.75, 0.82, 0.9, 1)
    world.node_tree.nodes["Background"].inputs[1].default_value = 0.8

    bpy.ops.render.render(write_still=True)
    print("preview:", PREVIEW_PATH)
