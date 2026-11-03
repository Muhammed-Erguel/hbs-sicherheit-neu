# Hero-Video: SECURITY per Frame-Tracking auf die Ruecken-Panelflaeche.
# Template-Matching verfolgt die (leicht bewegte) Rueckenflaeche -> pro Frame
# Panel-Quad -> Perspektiv-Warp von SECURITY + Licht-Multiply + Schatten.
# KEIN statisches Overlay: Text bewegt sich mit der Jacke.
import os, sys, cv2, numpy as np
from PIL import Image, ImageDraw, ImageFont

SRC = sys.argv[1]
OUT_DIR = sys.argv[2]
os.makedirs(OUT_DIR, exist_ok=True)

# Basis-Panelquad auf Frame 0 (TL,TR,BR,BL)
Q0 = np.array([[1215,457],[1470,455],[1468,548],[1217,552]], np.float32)
# Template-Region fuer Tracking (Panelumfeld mit Kanten)
TX0,TY0,TX1,TY1 = 1180,430,1500,560
SEARCH = 55

def text_layer():
    font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 200)
    text="SECURITY"; tr=int(200*0.12)
    tmp=Image.new("RGBA",(10,10)); d=ImageDraw.Draw(tmp)
    ws=[d.textlength(c,font=font) for c in text]; bb=font.getbbox(text)
    W=int(sum(ws)+tr*(len(text)-1))+20; H=int(bb[3]-bb[1])+20
    img=Image.new("RGBA",(W,H),(0,0,0,0)); d=ImageDraw.Draw(img); x=10
    for i,c in enumerate(text):
        d.text((x,10-bb[1]),c,font=font,fill=(240,244,249,240)); x+=ws[i]+tr
    return np.array(img)

TL_IMG = text_layer(); TH,TW = TL_IMG.shape[:2]

def P(q,u,v):
    top=(1-u)*q[0]+u*q[1]; bot=(1-u)*q[3]+u*q[2]; return (1-v)*top+v*bot

def dst_quad(q, hf=0.5, mwf=0.9):
    pw=np.linalg.norm(q[1]-q[0]); ph=np.linalg.norm(q[3]-q[0])
    fv=hf; fu=(fv*ph)*(TW/TH)/pw
    if fu>mwf: fu=mwf; fv=(fu*pw)*(TH/TW)/ph
    u0,u1=0.5-fu/2,0.5+fu/2; v0,v1=0.5-fv/2,0.5+fv/2
    return np.array([P(q,u0,v0),P(q,u1,v0),P(q,u1,v1),P(q,u0,v1)],np.float32)

def composite(frame, q):
    Hh,Ww=frame.shape[:2]
    dst=dst_quad(q)
    Hmg=cv2.getPerspectiveTransform(np.array([[0,0],[TW,0],[TW,TH],[0,TH]],np.float32),dst)
    warp=cv2.warpPerspective(TL_IMG,Hmg,(Ww,Hh),flags=cv2.INTER_LINEAR)
    a=(warp[:,:,3].astype(np.float32)/255.0)[:,:,None]
    txt=warp[:,:,:3][:,:,::-1].astype(np.float32)
    gray=cv2.cvtColor(frame,cv2.COLOR_BGR2GRAY).astype(np.float32)
    low=cv2.GaussianBlur(gray,(0,0),7)
    cx,cy=int(q[:,0].mean()),int(q[:,1].mean())
    pm=max(1.0,float(low[cy,cx]))
    light=np.clip(low/pm,0.6,1.15)[:,:,None]
    txt=np.clip(txt*light*0.95,0,255)
    sh=cv2.GaussianBlur(a[:,:,0],(0,0),1.3)
    sh=cv2.warpAffine(sh,np.float32([[1,0,1],[0,1,2]]),(Ww,Hh))*0.45
    out=frame.astype(np.float32)*(1-sh[:,:,None])
    out=out*(1-a)+txt*a
    return np.clip(out,0,255).astype(np.uint8)

cap=cv2.VideoCapture(SRC)
ok,f0=cap.read()
g0=cv2.cvtColor(f0,cv2.COLOR_BGR2GRAY)
templ=g0[TY0:TY1,TX0:TX1]
idx=0; offs=[]
while True:
    if idx==0: frame=f0
    else:
        ok,frame=cap.read()
        if not ok: break
    g=cv2.cvtColor(frame,cv2.COLOR_BGR2GRAY)
    x0=max(0,TX0-SEARCH); y0=max(0,TY0-SEARCH); x1=min(g.shape[1],TX1+SEARCH); y1=min(g.shape[0],TY1+SEARCH)
    roi=g[y0:y1,x0:x1]
    res=cv2.matchTemplate(roi,templ,cv2.TM_CCOEFF_NORMED)
    _,_,_,ml=cv2.minMaxLoc(res)
    mx=x0+ml[0]; my=y0+ml[1]
    dx=mx-TX0; dy=my-TY0
    offs.append((dx,dy))
    q=Q0+np.array([dx,dy],np.float32)
    out=composite(frame,q)
    cv2.imwrite(os.path.join(OUT_DIR,f"f{idx:04d}.png"),out)
    idx+=1
cap.release()
arr=np.array(offs)
print(f"frames={idx} dx[{arr[:,0].min()},{arr[:,0].max()}] dy[{arr[:,1].min()},{arr[:,1].max()}]")
