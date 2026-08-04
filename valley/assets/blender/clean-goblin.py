# clean-goblin.py — tidies the raw TripoSR goblin: stands it upright,
# faces it the way the game expects, and removes the leftover blob
# between its legs. Overwrites assets/goblin-ai.glb.
#
#   blender --background --python assets/blender/clean-goblin.py

import bpy
import bmesh
import math
import os
from mathutils import Matrix

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
GLB = os.path.join(ROOT, "goblin-ai.glb")

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete()
bpy.ops.import_scene.gltf(filepath=GLB)

meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
for o in meshes:
    o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1:
    bpy.ops.object.join()
gob = bpy.context.view_layer.objects.active

# stand upright facing -Y (exports to glTF facing +Z, the game's forward)
world = gob.matrix_world.copy()
stand = Matrix.Rotation(math.radians(180), 4, "Z") @ Matrix.Rotation(math.radians(90), 4, "X")
gob.data.transform(stand @ world)
if gob.parent:
    gob.parent = None
gob.matrix_world = Matrix.Identity(4)

# remove the pale blob between the legs
bm = bmesh.new()
bm.from_mesh(gob.data)
col_layer = bm.loops.layers.color.active
zs = [v.co.z for v in bm.verts]
z0, H = min(zs), max(zs) - min(zs)
doomed = set()
for face in bm.faces:
    for loop in face.loops:
        c = loop[col_layer]
        v = loop.vert
        if (v.co.z - z0) / H < 0.42 and abs(v.co.x) < 0.30 * H and min(c[0], c[1], c[2]) > 0.55:
            doomed.add(v)
print("blob vertices removed:", len(doomed))
bmesh.ops.delete(bm, geom=list(doomed), context="VERTS")
bm.to_mesh(gob.data)
bm.free()

# a material that uses the vertex colors, so the exporter keeps them
mat = bpy.data.materials.new("GoblinVertexColor")
mat.use_nodes = True
bsdf = mat.node_tree.nodes["Principled BSDF"]
bsdf.inputs["Roughness"].default_value = 0.9
attr = mat.node_tree.nodes.new("ShaderNodeVertexColor")
attr.layer_name = gob.data.color_attributes[0].name if gob.data.color_attributes else "Color"
mat.node_tree.links.new(attr.outputs["Color"], bsdf.inputs["Base Color"])
gob.data.materials.clear()
gob.data.materials.append(mat)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(filepath=GLB, export_format="GLB", export_yup=True)
print("cleaned and exported:", GLB)
