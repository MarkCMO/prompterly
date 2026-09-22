"""
Pro App Store marketing screenshots (device-framed, headline + CTA) for
Prompterly and Calculator Plug. Style modeled on Revolut / Shopify / Tinder
store listings: gradient backdrop, bold headline, real iPhone frame with a
believable in-app screen inside, accent badge.

    python store_shots.py prompterly
    python store_shots.py calcplug

Outputs 10 iPhone 6.5" (1242x2688) + 10 iPad 12.9" (2048x2732) PNGs into
<app>/store-shots/  as iphone-01..10.png / ipad-01..10.png
"""
import os, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

BOLD = "C:/Windows/Fonts/segoeuib.ttf"
BLACK = "C:/Windows/Fonts/seguibl.ttf"
REG = "C:/Windows/Fonts/segoeui.ttf"
SEMI = "C:/Windows/Fonts/seguisb.ttf"
EMOJI = "C:/Windows/Fonts/seguiemj.ttf"


def has(p):
    try:
        ImageFont.truetype(p, 10); return True
    except Exception:
        return False


HEAVY = BLACK if has(BLACK) else BOLD
SB = SEMI if has(SEMI) else BOLD


def F(p, s):
    return ImageFont.truetype(p, int(s))


def EM(s):
    return ImageFont.truetype(EMOJI, int(s))


# ---------------------------------------------------------------- primitives
def grad(w, h, stops):
    img = Image.new("RGB", (w, h), stops[0][1]); px = img.load()
    for y in range(h):
        t = y / (h - 1); c = stops[-1][1]
        for i in range(len(stops) - 1):
            a, ca = stops[i]; b, cb = stops[i + 1]
            if a <= t <= b:
                tt = (t - a) / (b - a) if b > a else 0
                c = tuple(int(ca[k] * (1 - tt) + cb[k] * tt) for k in range(3)); break
        for x in range(w):
            px[x, y] = c
    return img


def glow(img, box, color, blur=160, alpha=130):
    g = Image.new("RGBA", img.size, (0, 0, 0, 0)); d = ImageDraw.Draw(g)
    d.ellipse(box, fill=color + (alpha,)); g = g.filter(ImageFilter.GaussianBlur(blur))
    return Image.alpha_composite(img.convert("RGBA"), g)


def rr(d, box, r, **kw):
    d.rounded_rectangle(box, radius=r, **kw)


def tlen(d, t, f):
    return d.textlength(t, font=f)


def wrap(d, text, f, maxw):
    out, cur = [], ""
    for w in text.split():
        test = (cur + " " + w).strip()
        if tlen(d, test, f) <= maxw:
            cur = test
        else:
            out.append(cur); cur = w
    if cur:
        out.append(cur)
    return out


def headline(img, W, y, parts, size, lh=1.04):
    """parts: list of (text,color); wraps as a block, accent words colored."""
    d = ImageDraw.Draw(img); f = F(HEAVY, size)
    # build words with colors
    words = []
    for txt, col in parts:
        for i, w in enumerate(txt.split(" ")):
            words.append((w, col))
    lines, cur, curw = [], [], 0
    maxw = W * 0.84
    space = tlen(d, " ", f)
    for w, col in words:
        ww = tlen(d, w, f)
        if curw + ww > maxw and cur:
            lines.append(cur); cur = []; curw = 0
        cur.append((w, col, ww)); curw += ww + space
    if cur:
        lines.append(cur)
    cy = y
    sh = max(2, int(size * 0.045))
    for ln in lines:
        tot = sum(w for _, _, w in ln) + space * (len(ln) - 1)
        x = (W - tot) / 2
        for w, col, ww in ln:
            d.text((x + sh, cy + sh), w, font=f, fill=(0, 0, 0, 110), anchor="lm")
            d.text((x, cy), w, font=f, fill=col, anchor="lm"); x += ww + space
        cy += size * lh
    return cy


def sub(img, W, y, text, size, color=(225, 230, 245)):
    d = ImageDraw.Draw(img); f = F(REG, size)
    for ln in wrap(d, text, f, W * 0.8):
        d.text((W / 2, y), ln, font=f, fill=color, anchor="mm"); y += size * 1.32
    return y


def badge(img, cx, cy, text, bg, fg, s=1.0):
    d = ImageDraw.Draw(img); f = F(HEAVY, 40 * s); tw = tlen(d, text, f)
    rr(d, [cx - tw / 2 - 34 * s, cy - 40 * s, cx + tw / 2 + 34 * s, cy + 40 * s], 40 * s, fill=bg)
    d.text((cx, cy), text, font=f, fill=fg, anchor="mm")


# ---------------------------------------------------------------- device frame
def phone(screen, scale=1.0):
    """Wrap a screen image (RGB/RGBA) in a dark iPhone frame. Returns RGBA."""
    sw, sh = screen.size
    bez = int(sw * 0.035)            # bezel thickness
    rad = int(sw * 0.16)             # screen corner radius
    frad = rad + bez                 # frame corner radius
    W = sw + bez * 2; H = sh + bez * 2
    out = Image.new("RGBA", (W + 40, H + 40), (0, 0, 0, 0))
    d = ImageDraw.Draw(out)
    # drop shadow
    sh_layer = Image.new("RGBA", out.size, (0, 0, 0, 0)); sd = ImageDraw.Draw(sh_layer)
    rr(sd, [20, 36, 20 + W, 36 + H], frad, fill=(0, 0, 0, 150))
    out = Image.alpha_composite(out, sh_layer.filter(ImageFilter.GaussianBlur(26)))
    d = ImageDraw.Draw(out)
    # titanium frame
    rr(d, [20, 20, 20 + W, 20 + H], frad, fill=(28, 30, 36, 255))
    rr(d, [20 + 3, 20 + 3, 20 + W - 3, 20 + H - 3], frad - 3, outline=(70, 74, 84, 255), width=3)
    # screen
    sc = screen.convert("RGBA")
    mask = Image.new("L", (sw, sh), 0); md = ImageDraw.Draw(mask)
    rr(md, [0, 0, sw, sh], rad, fill=255)
    out.paste(sc, (20 + bez, 20 + bez), mask)
    # dynamic island
    iw = int(sw * 0.30); ih = int(sw * 0.085)
    ix = 20 + bez + (sw - iw) // 2; iy = 20 + bez + int(sh * 0.018)
    d = ImageDraw.Draw(out)
    rr(d, [ix, iy, ix + iw, iy + ih], ih // 2, fill=(0, 0, 0, 255))
    return out


# ---------------------------------------------------------------- status bar
def statusbar(d, x, y, w, fg):
    f = F(SB, w * 0.052)
    d.text((x + w * 0.07, y + w * 0.045), "9:41", font=f, fill=fg, anchor="lm")
    # battery + signal (simple)
    bx = x + w - w * 0.16
    rr(d, [bx, y + w * 0.028, bx + w * 0.085, y + w * 0.064], w * 0.012, outline=fg, width=2)
    rr(d, [bx + 2, y + w * 0.032, bx + w * 0.07, y + w * 0.060], w * 0.006, fill=fg)


# ================================================================ PROMPTERLY
PT = dict(bg=(11, 11, 15), surf=(22, 22, 29), surf2=(31, 31, 41), border=(42, 42, 54),
          text=(245, 245, 247), dim=(154, 154, 168), primary=(108, 92, 231))
SCRIPT = [
    "Welcome back to",
    "the channel.",
    "Today we break down",
    "three habits that",
    "changed my whole",
    "business this year",
    "and how you can too.",
]


def prompterly_screen(W, focus):
    H = int(W * 2.16)
    img = Image.new("RGBA", (W, H), PT["bg"]); d = ImageDraw.Draw(img)
    statusbar(d, 0, 0, W, PT["text"])
    top = int(H * 0.075)
    # header
    d.text((W * 0.5, top + W * 0.04), "Teleprompter", font=F(HEAVY, W * 0.062),
           fill=PT["text"], anchor="mm")
    # progress bar
    py = top + W * 0.11
    rr(d, [W * 0.08, py, W * 0.92, py + W * 0.018], W * 0.01, fill=PT["surf2"])
    prog = {"speed": 0.45, "color": 0.6, "rec": 0.3, "mirror": 0.7}.get(focus, 0.5)
    rr(d, [W * 0.08, py, W * 0.08 + (W * 0.84) * prog, py + W * 0.018], W * 0.01, fill=PT["primary"])
    # script text — middle line highlighted
    ty = top + W * 0.22
    line_h = W * 0.165
    hl = 3
    txtcol = PT["text"]
    if focus == "color":
        txtcol = (255, 230, 109)  # preset yellow
    for i, ln in enumerate(SCRIPT):
        f = F(BOLD, W * 0.072)
        if i == hl:
            col = PT["primary"] if focus != "color" else (255, 230, 109)
            d.text((W * 0.5, ty + i * line_h), ln, font=F(HEAVY, W * 0.078), fill=col, anchor="mm")
        else:
            fade = 255 if abs(i - hl) <= 1 else 150
            base = txtcol
            d.text((W * 0.5, ty + i * line_h), ln, font=f,
                   fill=base + (fade,) if len(base) == 3 else base, anchor="mm")
    # mirror hint
    if focus == "mirror":
        d.text((W * 0.5, ty + 6.4 * line_h), "MIRRORED  ◀▶", font=F(HEAVY, W * 0.05),
               fill=PT["dim"], anchor="mm")
    # bottom control bar
    by = H - int(W * 0.46)
    rr(d, [W * 0.05, by, W * 0.95, by + W * 0.34], W * 0.07, fill=PT["surf"])
    # speed / font steppers
    def stepper(cx, label, val, active):
        d.text((cx, by + W * 0.07), label, font=F(SB, W * 0.038), fill=PT["dim"], anchor="mm")
        ring = PT["primary"] if active else PT["surf2"]
        rr(d, [cx - W * 0.12, by + W * 0.115, cx + W * 0.12, by + W * 0.215],
           W * 0.03, fill=PT["surf2"], outline=ring, width=4 if active else 0)
        d.text((cx - W * 0.085, by + W * 0.165), "–", font=F(HEAVY, W * 0.07), fill=PT["text"], anchor="mm")
        d.text((cx, by + W * 0.165), val, font=F(HEAVY, W * 0.058), fill=PT["text"], anchor="mm")
        d.text((cx + W * 0.085, by + W * 0.165), "+", font=F(BOLD, W * 0.06), fill=PT["text"], anchor="mm")
    stepper(W * 0.28, "SPEED", "3.5", focus == "speed")
    stepper(W * 0.72, "FONT", "64", focus == "font")
    # play / record button
    pcx, pcy = W * 0.5, by - W * 0.02
    if focus == "rec":
        d.ellipse([pcx - W * 0.085, pcy - W * 0.085, pcx + W * 0.085, pcy + W * 0.085],
                  fill=(255, 70, 70))
        d.ellipse([pcx - W * 0.032, pcy - W * 0.032, pcx + W * 0.032, pcy + W * 0.032], fill=(255, 255, 255))
    else:
        d.ellipse([pcx - W * 0.085, pcy - W * 0.085, pcx + W * 0.085, pcy + W * 0.085], fill=PT["primary"])
        d.polygon([(pcx - W * 0.025, pcy - W * 0.04), (pcx - W * 0.025, pcy + W * 0.04),
                   (pcx + W * 0.045, pcy)], fill=(255, 255, 255))
    return img


PROMPTERLY_SLIDES = [
    # (headline parts, sub, focus, bg-stops, badge)
    ([("Read like a ", PT["text"]), ("pro.", (255, 222, 140)), (" Hands-free.", PT["text"])],
     "Smooth auto-scrolling teleprompter in your pocket.", "play",
     [(0, (96, 80, 220)), (0.55, (60, 48, 150)), (1, (16, 14, 34))], None),
    ([("Set the ", PT["text"]), ("perfect pace", (255, 222, 140))],
     "Dial scroll speed up or down without missing a beat.", "speed",
     [(0, (40, 60, 180)), (0.6, (30, 36, 110)), (1, (12, 14, 32))], None),
    ([("Big, ", PT["text"]), ("readable", (255, 230, 130)), (" text", PT["text"])],
     "Crank the font size so you can read from across the room.", "font",
     [(0, (180, 120, 40)), (0.55, (120, 70, 40)), (1, (28, 18, 16))], None),
    ([("Your words, ", PT["text"]), ("your colors", (255, 230, 109))],
     "Switch text colors for any lighting or background.", "color",
     [(0, (200, 150, 40)), (0.5, (150, 70, 80)), (1, (32, 16, 28))], None),
    ([("Record while ", PT["text"]), ("you read", (255, 150, 150))],
     "Hit record and deliver every line straight to camera.", "rec",
     [(0, (200, 60, 90)), (0.55, (130, 36, 70)), (1, (30, 12, 24))], None),
    ([("Mirror mode ", PT["text"]), ("for rigs", (160, 220, 255))],
     "Flips the text for beam-splitter teleprompter hardware.", "mirror",
     [(0, (40, 120, 180)), (0.55, (24, 70, 120)), (1, (10, 22, 36))], None),
    ([("Stay ", PT["text"]), ("on track", (170, 255, 200))],
     "A live progress bar shows exactly where you are.", "speed",
     [(0, (30, 150, 110)), (0.55, (20, 90, 80)), (1, (10, 28, 26))], None),
    ([("Paste any ", PT["text"]), ("script", (255, 222, 140))],
     "Drop in your notes and start reading in seconds.", "play",
     [(0, (90, 70, 200)), (0.55, (52, 44, 130)), (1, (14, 12, 30))], None),
    ([("Free ", (255, 230, 130)), ("to start", PT["text"])],
     "Read your first scripts free. Upgrade only if you love it.", "font",
     [(0, (70, 130, 90)), (0.55, (40, 80, 70)), (1, (12, 24, 22))],
     ("FREE TO DOWNLOAD", (255, 230, 130), (24, 24, 24))),
    ([("Get ", PT["text"]), ("Glideprompt", (255, 222, 140))],
     "Your teleprompter, ready whenever you hit record.", "play",
     [(0, (108, 92, 231)), (0.5, (60, 48, 150)), (1, (16, 14, 34))],
     ("DOWNLOAD NOW", (255, 222, 140), (16, 14, 34))),
]


# ================================================================ CALC PLUG
CP = dict(bg=(14, 17, 22), card=(23, 28, 36), card2=(31, 38, 48), border=(42, 50, 61),
          text=(242, 245, 249), dim=(154, 167, 182), accent=(245, 166, 35),
          blue=(74, 144, 217), green=(63, 185, 132), red=(229, 86, 75))
CATS = [("\U0001F3E0", "Construction"), ("⚡", "Electrical"), ("\U0001F527", "Plumbing"),
        ("\U0001F4B0", "Finance"), ("\U0001F321", "HVAC"), ("\U0001F3D7", "Roofing"),
        ("\U0001F697", "Automotive"), ("\U0001F6E0", "Welding"), ("\U0001F33E", "Farm"),
        ("\U0001F9EA", "Chemistry"), ("\U0001F4C8", "Trading"), ("\U0001F48A", "Medical")]


def calc_card(d, W, x, y, w, title, sub_t, rows, result_label, result_val, result_unit, accent):
    h = W * 0.86
    rr(d, [x, y, x + w, y + h], W * 0.05, fill=CP["card"])
    d.text((x + w * 0.07, y + w * 0.09), title, font=F(HEAVY, W * 0.055), fill=CP["text"], anchor="lm")
    d.text((x + w * 0.07, y + w * 0.16), sub_t, font=F(REG, W * 0.034), fill=CP["dim"], anchor="lm")
    ry = y + w * 0.24
    for lab, val in rows:
        rr(d, [x + w * 0.06, ry, x + w * 0.94, ry + w * 0.115], W * 0.025, fill=CP["card2"])
        d.text((x + w * 0.10, ry + w * 0.057), lab, font=F(SB, W * 0.036), fill=CP["dim"], anchor="lm")
        d.text((x + w * 0.90, ry + w * 0.057), val, font=F(BOLD, W * 0.04), fill=CP["text"], anchor="rm")
        ry += w * 0.145
    # result
    ry += w * 0.02
    rr(d, [x + w * 0.06, ry, x + w * 0.94, ry + w * 0.2], W * 0.03, fill=tuple(min(255, c + 6) for c in CP["card2"]))
    d.text((x + w * 0.10, ry + w * 0.06), result_label, font=F(SB, W * 0.034), fill=CP["dim"], anchor="lm")
    d.text((x + w * 0.10, ry + w * 0.135), result_val, font=F(HEAVY, W * 0.085), fill=accent, anchor="lm")
    d.text((x + w * 0.90, ry + w * 0.145), result_unit, font=F(BOLD, W * 0.04), fill=CP["dim"], anchor="rm")


def calc_grid_screen(W):
    H = int(W * 2.16); img = Image.new("RGBA", (W, H), CP["bg"]); d = ImageDraw.Draw(img)
    statusbar(d, 0, 0, W, CP["text"])
    top = int(H * 0.075)
    d.text((W * 0.08, top + W * 0.03), "Calculators", font=F(HEAVY, W * 0.075), fill=CP["text"], anchor="lm")
    d.text((W * 0.08, top + W * 0.11), "300+ tools across 30 trades", font=F(REG, W * 0.038), fill=CP["dim"], anchor="lm")
    # search bar
    sy = top + W * 0.17
    rr(d, [W * 0.06, sy, W * 0.94, sy + W * 0.11], W * 0.028, fill=CP["card"])
    d.text((W * 0.12, sy + W * 0.055), "Search a calculator", font=F(REG, W * 0.04), fill=CP["dim"], anchor="lm")
    # grid 2 cols
    gy = sy + W * 0.18; cw = W * 0.41; gx = [W * 0.06, W * 0.53]; ch = W * 0.30
    for i, (emo, name) in enumerate(CATS):
        col = i % 2; row = i // 2
        x = gx[col]; y = gy + row * (ch + W * 0.04)
        rr(d, [x, y, x + cw, y + ch], W * 0.045, fill=CP["card"])
        try:
            d.text((x + cw * 0.12, y + ch * 0.32), emo, font=EM(W * 0.072), anchor="lm", embedded_color=True)
        except Exception:
            pass
        d.text((x + cw * 0.12, y + ch * 0.7), name, font=F(BOLD, W * 0.042), fill=CP["text"], anchor="lm")
        cnt = ["18", "24", "15", "22", "16", "12", "20", "9", "14", "11", "10", "13"][i]
        d.text((x + cw * 0.12, y + ch * 0.86), cnt + " calculators", font=F(REG, W * 0.03), fill=CP["dim"], anchor="lm")
    return img


def field_screen(W):
    H = int(W * 2.16); img = Image.new("RGBA", (W, H), CP["bg"]); d = ImageDraw.Draw(img)
    statusbar(d, 0, 0, W, CP["text"])
    top = int(H * 0.075)
    d.text((W * 0.08, top + W * 0.03), "Field", font=F(HEAVY, W * 0.075), fill=CP["text"], anchor="lm")
    d.text((W * 0.08, top + W * 0.11), "Live conditions where you stand", font=F(REG, W * 0.038), fill=CP["dim"], anchor="lm")
    cards = [("☀️", "Weather", "72°F", "Clear · humidity 41%", CP["accent"]),
             ("\U0001F30A", "Tides", "4.2 ft", "High tide 2:48 PM", CP["blue"]),
             ("\U0001F319", "Moon", "Waxing", "68% · illuminated", (200, 200, 220)),
             ("\U0001F4C9", "Barometer", "30.1 inHg", "Rising · steady", CP["green"])]
    cy = top + W * 0.2
    for emo, name, big, small, ac in cards:
        rr(d, [W * 0.06, cy, W * 0.94, cy + W * 0.32], W * 0.05, fill=CP["card"])
        try:
            d.text((W * 0.14, cy + W * 0.13), emo, font=EM(W * 0.1), anchor="mm", embedded_color=True)
        except Exception:
            pass
        d.text((W * 0.26, cy + W * 0.08), name, font=F(SB, W * 0.04), fill=CP["dim"], anchor="lm")
        d.text((W * 0.26, cy + W * 0.18), big, font=F(HEAVY, W * 0.08), fill=ac, anchor="lm")
        d.text((W * 0.92, cy + W * 0.16), small, font=F(REG, W * 0.034), fill=CP["dim"], anchor="rm")
        cy += W * 0.38
    return img


def calcplug_slides_screen(focus, W):
    if focus == "grid":
        return calc_grid_screen(W)
    if focus == "field":
        return field_screen(W)
    H = int(W * 2.16); img = Image.new("RGBA", (W, H), CP["bg"]); d = ImageDraw.Draw(img)
    statusbar(d, 0, 0, W, CP["text"])
    top = int(H * 0.075)
    specs = {
        "finance": ("Mortgage Payment", "Finance", [("Loan Amount", "$350,000"), ("Annual Rate", "6.5%"), ("Term", "30 yr")],
                    "Monthly payment", "$2,212", "/mo", CP["accent"]),
        "elec": ("Wire Size (Ampacity)", "Electrical", [("Load", "48 A"), ("Length", "120 ft"), ("Material", "Copper")],
                 "Recommended", "6 AWG", "75°C", CP["blue"]),
        "const": ("Concrete Volume", "Construction", [("Slab", "20 × 24 ft"), ("Thickness", "4 in"), ("Waste", "10%")],
                  "You need", "5.9", "yd³", CP["accent"]),
        "roof": ("Roofing Squares", "Roofing", [("Footprint", "1,800 ft²"), ("Pitch", "6/12"), ("Waste", "12%")],
                 "Order", "22.6", "squares", CP["red"]),
        "hvac": ("BTU / Room Sizing", "HVAC", [("Area", "320 ft²"), ("Climate", "Warm"), ("Sun", "High")],
                 "Required", "8,000", "BTU", CP["green"]),
    }
    title, cat, rows, rl, rv, ru, ac = specs.get(focus, specs["finance"])
    d.text((W * 0.08, top + W * 0.03), cat, font=F(SB, W * 0.045), fill=ac, anchor="lm")
    d.text((W * 0.08, top + W * 0.1), title, font=F(HEAVY, W * 0.066), fill=CP["text"], anchor="lm")
    calc_card(d, W, W * 0.06, top + W * 0.22, W * 0.88, "Inputs", "Tap a field to edit", rows, rl, rv, ru, ac)
    # related chips
    chips = ["Slab", "Footings", "Rebar", "Bags"]
    cyy = top + W * 1.2; cx = W * 0.06
    for c in chips:
        f = F(SB, W * 0.038); cw = tlen(d, c, f) + W * 0.09
        rr(d, [cx, cyy, cx + cw, cyy + W * 0.1], W * 0.05, fill=CP["card"])
        d.text((cx + cw / 2, cyy + W * 0.05), c, font=f, fill=CP["dim"], anchor="mm"); cx += cw + W * 0.03
    return img


CALCPLUG_SLIDES = [
    ([("300+ calculators.", (255, 210, 120)), (" One app.", CP["text"])],
     "Every trade, every job, every number you need.", "grid",
     [(0, (200, 140, 30)), (0.55, (120, 80, 30)), (1, (16, 18, 22))], None),
    ([("Built for ", CP["text"]), ("every trade", (255, 210, 120))],
     "30 categories from construction to medical, ready to go.", "grid",
     [(0, (40, 70, 120)), (0.55, (24, 40, 70)), (1, (12, 16, 22))], None),
    ([("Mortgage to ", CP["text"]), ("payoff", (255, 210, 120))],
     "Loan payments, interest and amortization in a tap.", "finance",
     [(0, (180, 130, 30)), (0.55, (110, 70, 30)), (1, (16, 16, 20))], None),
    ([("Wire sizing, ", CP["text"]), ("instantly", (150, 200, 255))],
     "Ampacity, voltage drop and AWG without the code book.", "elec",
     [(0, (40, 100, 180)), (0.55, (24, 56, 100)), (1, (10, 18, 28))], None),
    ([("Concrete, ", CP["text"]), ("framing, fill", (255, 210, 120))],
     "Order the right amount of material the first time.", "const",
     [(0, (170, 120, 40)), (0.55, (100, 70, 36)), (1, (16, 16, 20))], None),
    ([("Roofing ", CP["text"]), ("squares", (255, 150, 140))],
     "Pitch, area and waste rolled into one estimate.", "roof",
     [(0, (190, 70, 60)), (0.55, (110, 40, 40)), (1, (24, 12, 14))], None),
    ([("Size every ", CP["text"]), ("HVAC", (150, 230, 190)), (" job", CP["text"])],
     "BTU loads, duct and airflow math, solved.", "hvac",
     [(0, (30, 150, 110)), (0.55, (20, 88, 74)), (1, (10, 24, 22))], None),
    ([("Out in the ", CP["text"]), ("field", (150, 200, 255))],
     "Weather, tides, moon phase and barometer in one place.", "field",
     [(0, (30, 90, 150)), (0.55, (20, 50, 90)), (1, (10, 18, 28))], None),
    ([("Free ", (255, 210, 120)), ("to start", CP["text"])],
     "Core calculators free forever. Unlock the full kit anytime.", "grid",
     [(0, (60, 130, 90)), (0.55, (36, 80, 64)), (1, (12, 22, 20))],
     ("FREE TO DOWNLOAD", (255, 210, 120), (22, 20, 14))),
    ([("Get ", CP["text"]), ("Calculator Plug", (255, 210, 120))],
     "The only calculator app a working pro needs.", "finance",
     [(0, (245, 166, 35)), (0.5, (140, 90, 30)), (1, (16, 16, 20))],
     ("DOWNLOAD NOW", (255, 210, 120), (16, 16, 20))),
]


# ---------------------------------------------------------------- render
def render(app, slides, screen_fn, theme_text, W, H, prefix, outdir):
    sw = int(W * 0.60)  # screen width inside the frame
    for i, (parts, subt, focus, stops, bdg) in enumerate(slides):
        img = grad(W, H, stops)
        img = glow(img, [W * 0.05, H * 0.30, W * 0.95, H * 0.66], stops[0][1], 200, 90)
        img = img.convert("RGBA")
        cy = headline(img, W, int(H * 0.058), parts, W * 0.072)
        sub(img, W, cy + H * 0.005, subt, W * 0.034)
        # device
        screen = screen_fn(focus, sw) if app == "calcplug" else screen_fn(sw, focus)
        ph = phone(screen)
        # scale phone to fit
        max_h = int(H * (0.62 if not bdg else 0.58))
        if ph.height > max_h:
            r = max_h / ph.height
            ph = ph.resize((int(ph.width * r), max_h), Image.LANCZOS)
        px = (W - ph.width) // 2
        py = int(H * (0.30 if not bdg else 0.29))
        img.alpha_composite(ph, (px, py))
        if bdg:
            text, bg, fg = bdg
            badge(img, W * 0.5, H * 0.945, text, bg, fg, s=W / 1242.0)
        img.convert("RGB").save(os.path.join(outdir, f"{prefix}-{i+1:02d}.png"), "PNG")
    print(f"{app}: wrote 10 {prefix} -> {outdir}")


def main():
    app = sys.argv[1] if len(sys.argv) > 1 else "prompterly"
    if app == "prompterly":
        base = "C:/Users/13219/Desktop/Prompterly"; slides = PROMPTERLY_SLIDES
        screen_fn = prompterly_screen; tcol = PT["text"]
    elif app == "calcplug":
        base = "C:/Users/13219/Desktop/TradeKit"; slides = CALCPLUG_SLIDES
        screen_fn = calcplug_slides_screen; tcol = CP["text"]
    else:
        print("unknown app", app); return
    outdir = os.path.join(base, "store-shots"); os.makedirs(outdir, exist_ok=True)
    render(app, slides, screen_fn, tcol, 1242, 2688, "iphone", outdir)
    render(app, slides, screen_fn, tcol, 2048, 2732, "ipad", outdir)


if __name__ == "__main__":
    main()
