# SECURITY realistisch auf die Uniform: tight gerenderter Text, zentriert mit
# Rand in die Rueckenflaeche eingepasst (Homographie), + dezentes Stoff-
# Displacement + Licht-Multiply + weicher Schatten.
import sys, json, cv2, numpy as np
from PIL import Image, ImageDraw, ImageFont

def make_text_layer(text="SECURITY", fs=180, tracking_frac=0.12, pad=10):
    font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", fs)
    tracking = int(fs * tracking_frac)
    tmp = Image.new("RGBA", (10, 10)); d = ImageDraw.Draw(tmp)
    widths = [d.textlength(c, font=font) for c in text]
    bbox = font.getbbox(text)
    th = bbox[3] - bbox[1]
    total = int(sum(widths) + tracking * (len(text) - 1))
    W = total + pad * 2; H = int(th + pad * 2)
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    x = pad
    for i, c in enumerate(text):
        d.text((x, pad - bbox[1]), c, font=font, fill=(238, 242, 247, 240))
        x += widths[i] + tracking
    return np.array(img)

def P(quad, u, v):
    TL, TR, BR, BL = quad
    top = (1 - u) * TL + u * TR
    bot = (1 - u) * BL + u * BR
    return (1 - v) * top + v * bot

def brand(img_path, out_path, quad, check_path=None, height_frac=0.52, max_width_frac=0.86, disp=0.05):
    img = cv2.imread(img_path, cv2.IMREAD_COLOR).astype(np.float32)
    H, W = img.shape[:2]
    quad = [np.array(p, np.float32) for p in quad]  # TL,TR,BR,BL
    panel_w = np.linalg.norm(quad[1] - quad[0]); panel_h = np.linalg.norm(quad[3] - quad[0])
    tl = make_text_layer()
    th, tw = tl.shape[:2]
    # Zielgroesse innerhalb Panel (Aspect erhalten)
    fv = height_frac
    fu = (fv * panel_h) * (tw / th) / panel_w
    if fu > max_width_frac:
        fu = max_width_frac
        fv = (fu * panel_w) * (th / tw) / panel_h
    u0, u1 = 0.5 - fu / 2, 0.5 + fu / 2
    v0, v1 = 0.5 - fv / 2, 0.5 + fv / 2
    dst = np.array([P(quad, u0, v0), P(quad, u1, v0), P(quad, u1, v1), P(quad, u0, v1)], np.float32)
    src = np.array([[0, 0], [tw, 0], [tw, th], [0, th]], np.float32)
    Hmg = cv2.getPerspectiveTransform(src, dst)
    warped = cv2.warpPerspective(tl, Hmg, (W, H), flags=cv2.INTER_LINEAR)
    alpha = warped[:, :, 3].astype(np.float32) / 255.0
    text_bgr = warped[:, :, :3][:, :, ::-1].astype(np.float32)

    # dezentes Stoff-Displacement
    gray = cv2.cvtColor(img.astype(np.uint8), cv2.COLOR_BGR2GRAY).astype(np.float32)
    low = cv2.GaussianBlur(gray, (0, 0), 7)
    detail = gray - low
    gx = cv2.Sobel(detail, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(detail, cv2.CV_32F, 0, 1, ksize=3)
    mx, my = np.meshgrid(np.arange(W, dtype=np.float32), np.arange(H, dtype=np.float32))
    dc = max(0.4, panel_h * 0.02)  # Displacement skaliert mit Panelgroesse
    mx = mx + np.clip(gx * disp, -dc, dc); my = my + np.clip(gy * disp, -dc, dc)
    text_bgr = cv2.remap(text_bgr, mx, my, cv2.INTER_LINEAR)
    alpha = cv2.remap(alpha, mx, my, cv2.INTER_LINEAR)

    # Licht-Multiply (Text folgt Falten/Schatten)
    cx, cy = int(np.mean([p[0] for p in quad])), int(np.mean([p[1] for p in quad]))
    pmean = max(1.0, float(low[cy, cx]))
    light = np.clip(low / pmean, 0.6, 1.15)
    text_bgr = np.clip(text_bgr * light[:, :, None] * 0.96, 0, 255)

    a = alpha[:, :, None]
    # Schatten
    sh = cv2.GaussianBlur(alpha, (0, 0), 1.3)
    sh = cv2.warpAffine(sh, np.float32([[1, 0, 1], [0, 1, 2]]), (W, H)) * 0.45
    out = img * (1 - sh[:, :, None])
    out = out * (1 - a) + text_bgr * a
    out = np.clip(out, 0, 255).astype(np.uint8)
    cv2.imwrite(out_path, out)
    if check_path:
        xs = [p[0] for p in quad]; ys = [p[1] for p in quad]
        x0, y0 = int(min(xs)) - 45, int(min(ys)) - 45; x1, y1 = int(max(xs)) + 45, int(max(ys)) + 45
        cv2.imwrite(check_path, out[max(0, y0):min(H, y1), max(0, x0):min(W, x1)])

if __name__ == "__main__":
    cfg = json.loads(sys.argv[1])
    brand(cfg["in"], cfg["out"], cfg["quad"], cfg.get("check"),
          cfg.get("height_frac", 0.52), cfg.get("max_width_frac", 0.86), cfg.get("disp", 0.05))
    print("branded", cfg["out"])
