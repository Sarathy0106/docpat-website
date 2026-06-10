"""Generate a realistic rack-mount server model -> assets/server.glb
Coordinate system: Y up, front face = +Z (matches three.js scene)."""
import numpy as np
import trimesh
from trimesh.visual.material import PBRMaterial

scene = trimesh.Scene()
_id = 0

def mat(base, metal=0.6, rough=0.45, emis=(0, 0, 0), estr=1.0):
    return PBRMaterial(
        baseColorFactor=[base[0], base[1], base[2], 1.0],
        metallicFactor=metal, roughnessFactor=rough,
        emissiveFactor=[emis[0] * estr, emis[1] * estr, emis[2] * estr],
    )

def box(extents, pos, material, name):
    global _id
    T = trimesh.transformations.translation_matrix(pos)
    m = trimesh.creation.box(extents=extents, transform=T)
    m.visual = trimesh.visual.TextureVisuals(material=material)
    scene.add_geometry(m, node_name=f"{name}_{_id}")
    _id += 1
    return m

# ---- palette (sRGB-ish linear values kept simple) ----
CHASSIS = (0.10, 0.12, 0.16)   # dark slate metal
BEZEL   = (0.16, 0.19, 0.24)   # lighter face panel
TRIM    = (0.05, 0.06, 0.08)   # near-black recesses / vents
STEEL   = (0.30, 0.34, 0.40)   # handles / rails
LED_CY  = (0.22, 0.74, 0.95)   # cyan  #38bdf8
LED_GR  = (0.20, 0.83, 0.60)   # green #34d399
LED_AM  = (0.98, 0.70, 0.20)   # amber

# ---- overall dimensions ----
W, H, D = 1.9, 2.7, 1.55       # width(x), height(y), depth(z)
hW = W / 2

# ---- main chassis enclosure ----
box([W, H, D], [0, 0, 0], mat(CHASSIS, metal=0.7, rough=0.4), "chassis")
# subtle side rails (vertical) for a cabinet look
for sx in (-1, 1):
    box([0.06, H * 1.02, D * 0.98], [sx * (hW - 0.02), 0, 0],
        mat(STEEL, metal=0.85, rough=0.3), "rail")
# top + bottom caps
box([W * 1.03, 0.08, D * 1.02], [0,  H / 2, 0], mat(TRIM, metal=0.6, rough=0.5), "cap")
box([W * 1.03, 0.10, D * 1.02], [0, -H / 2, 0], mat(TRIM, metal=0.6, rough=0.5), "cap")
# small feet
for sx in (-1, 1):
    for sz in (-1, 1):
        box([0.14, 0.10, 0.14], [sx * (hW - 0.18), -H / 2 - 0.06, sz * (D / 2 - 0.18)],
            mat(TRIM, metal=0.5, rough=0.6), "foot")

# ---- stacked server units on the front face (+Z) ----
N = 7
top = H / 2 - 0.12
bot = -H / 2 + 0.10
span = top - bot
uh = span / N                      # unit height
fz = D / 2                         # front plane
led_colors = [LED_GR, LED_CY, LED_AM]

for i in range(N):
    cy = top - uh * (i + 0.5)
    ph = uh * 0.84                 # panel height
    # raised front bezel of this unit
    box([W * 0.95, ph, 0.05], [0, cy, fz + 0.025],
        mat(BEZEL, metal=0.55, rough=0.5), "bezel")
    # recessed ventilation grille (right two-thirds): thin dark slats
    vx0 = -hW * 0.2
    for k in range(5):
        vy = cy + (k - 2) * (ph * 0.16)
        box([W * 0.52, ph * 0.07, 0.02], [vx0 + W * 0.18, vy, fz + 0.055],
            mat(TRIM, metal=0.3, rough=0.7), "vent")
    # left: two horizontal drive-bay slots
    for d in (0.22, -0.22):
        box([W * 0.30, ph * 0.30, 0.03], [-hW * 0.52, cy + ph * d, fz + 0.055],
            mat(TRIM, metal=0.4, rough=0.6), "bay")
    # status LEDs (emissive) on the far left
    for j in range(3):
        c = led_colors[(i + j) % 3]
        box([0.05, 0.05, 0.04], [-hW * 0.82, cy + (j - 1) * ph * 0.26, fz + 0.06],
            mat((c[0]*0.3, c[1]*0.3, c[2]*0.3), metal=0.0, rough=0.4,
                emis=c, estr=2.4), "led")
    # pull handle on the right edge
    box([0.07, ph * 0.55, 0.10], [hW * 0.86, cy, fz + 0.06],
        mat(STEEL, metal=0.9, rough=0.25), "handle")

# ---- thin glowing seam down the front for a hi-tech accent ----
box([0.03, span, 0.02], [hW * 0.62, (top + bot) / 2, fz + 0.07],
    mat((0.1, 0.3, 0.4), metal=0.0, rough=0.4, emis=LED_CY, estr=1.6), "seam")

scene.export("assets/server.glb")
print("exported assets/server.glb  geometries:", len(scene.geometry))
