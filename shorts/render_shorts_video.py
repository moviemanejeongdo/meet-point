import os
import sys
import json
import subprocess
from PIL import Image, ImageDraw, ImageFont, ImageFilter

WIDTH = 1080
HEIGHT = 1920
FPS = 30

FONT_ROUND_EB = "C:/Windows/Fonts/NanumSquareRoundEB.ttf"
FONT_ROUND_B = "C:/Windows/Fonts/NanumSquareRoundB.ttf"
FONT_ROUND_R = "C:/Windows/Fonts/NanumSquareRoundR.ttf"

def get_font(size, bold=True):
    try:
        p = FONT_ROUND_EB if bold else FONT_ROUND_R
        return ImageFont.truetype(p, size)
    except:
        return ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf" if bold else "C:/Windows/Fonts/malgun.ttf", size)

def create_base_canvas(theme="indigo"):
    img = Image.new("RGBA", (WIDTH, HEIGHT), (11, 13, 20, 255))
    draw = ImageDraw.Draw(img)
    
    for y in range(HEIGHT):
        ratio = y / HEIGHT
        r = int(10 + 12 * ratio)
        g = int(12 + 14 * ratio)
        b = int(22 + 28 * ratio)
        draw.line([(0, y), (WIDTH, y)], fill=(r, g, b, 255))
        
    accent = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    acc_draw = ImageDraw.Draw(accent)
    
    if theme == "red":
        acc_draw.ellipse([-150, -100, 700, 700], fill=(239, 68, 68, 45))
        acc_draw.ellipse([500, 300, 1200, 1000], fill=(245, 158, 11, 35))
    elif theme == "green":
        acc_draw.ellipse([-150, -100, 700, 700], fill=(16, 185, 129, 45))
        acc_draw.ellipse([500, 300, 1200, 1000], fill=(6, 182, 212, 35))
    else: # indigo
        acc_draw.ellipse([-150, -100, 700, 700], fill=(79, 70, 229, 55))
        acc_draw.ellipse([500, 300, 1200, 1000], fill=(6, 182, 212, 40))
        acc_draw.ellipse([-200, 1100, 600, 1800], fill=(236, 72, 153, 35))
        
    accent = accent.filter(ImageFilter.GaussianBlur(120))
    return Image.alpha_composite(img, accent)

def draw_header_badge(draw, text, y=140, bg_color=(99, 102, 241, 230), text_color=(255, 255, 255)):
    font = get_font(32, bold=True)
    bbox = font.getbbox(text)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    pad_x, pad_y = 28, 12
    bx = (WIDTH - tw) // 2 - pad_x
    by = y
    bw = tw + pad_x * 2
    bh = th + pad_y * 2
    
    draw.rounded_rectangle([bx, by, bx + bw, by + bh], radius=24, fill=bg_color)
    draw.text((bx + pad_x, by + pad_y - 2), text, font=font, fill=text_color)
    return by + bh

def draw_title(draw, lines, start_y=225):
    font = get_font(54, bold=True)
    curr_y = start_y
    for line, hl in lines:
        bbox = font.getbbox(line)
        tw = bbox[2] - bbox[0]
        tx = (WIDTH - tw) // 2
        col = (255, 230, 0, 255) if hl else (255, 255, 255, 255)
        # Shadow
        draw.text((tx + 3, curr_y + 3), line, font=font, fill=(0, 0, 0, 180))
        draw.text((tx, curr_y), line, font=font, fill=col)
        curr_y += 74
    return curr_y

def draw_card(draw, x1, y1, x2, y2, bg=(20, 24, 38, 220), border=(99, 102, 241, 150), radius=28, border_w=2):
    draw.rounded_rectangle([x1, y1, x2, y2], radius=radius, fill=bg, outline=border, width=border_w)

def draw_phone_mockup(base_img, content_img, center_x=370, center_y=800, target_w=480, target_h=760):
    cont = content_img.resize((target_w - 20, target_h - 20), Image.Resampling.LANCZOS)
    phone = Image.new("RGBA", (target_w + 30, target_h + 30), (0, 0, 0, 0))
    p_draw = ImageDraw.Draw(phone)
    p_draw.rounded_rectangle([5, 5, target_w + 25, target_h + 25], radius=42, fill=(99, 102, 241, 60))
    p_draw.rounded_rectangle([10, 10, target_w + 20, target_h + 20], radius=38, fill=(28, 33, 50, 255), outline=(99, 102, 241, 200), width=4)
    p_draw.rounded_rectangle([20, 20, target_w + 10, target_h + 10], radius=32, fill=(15, 17, 26, 255))
    
    mask = Image.new("L", cont.size, 0)
    m_draw = ImageDraw.Draw(mask)
    m_draw.rounded_rectangle([0, 0, cont.size[0], cont.size[1]], radius=30, fill=255)
    phone.paste(cont, (20, 20), mask)
    
    # Dynamic Island pill
    p_draw.rounded_rectangle([target_w//2 - 45, 26, target_w//2 + 45, 46], radius=10, fill=(10, 10, 15, 255))
    
    px = center_x - phone.size[0] // 2
    py = center_y - phone.size[1] // 2
    base_img.paste(phone, (px, py), phone)

# SCENE RENDERING FUNCTIONS
def build_scene_1():
    img = create_base_canvas("indigo")
    draw = ImageDraw.Draw(img)
    draw_header_badge(draw, "[약속 장소] 이번 주말 어디서 볼까?", y=130, bg_color=(99, 102, 241, 230))
    draw_title(draw, [("이번 주말 친구 모임,", False), ("어디서 만날지 아직도 싸우나요?", True)], start_y=220)
    
    # KakaoTalk Chat Box Card
    draw_card(draw, 100, 390, 980, 1200, bg=(24, 28, 45, 235), border=(99, 102, 241, 180), radius=32, border_w=3)
    
    # Header bar
    draw.rounded_rectangle([100, 390, 980, 480], radius=32, fill=(35, 41, 65, 255))
    draw.rectangle([100, 440, 980, 480], fill=(35, 41, 65, 255))
    # Green active dot
    draw.ellipse([140, 426, 160, 446], fill=(52, 211, 153, 255))
    draw.text((175, 416), "모임 채팅방 (3명 참여 중)", font=get_font(30, True), fill=(255, 255, 255))
    
    name_font = get_font(26, True)
    text_font = get_font(30, False)
    
    # Bubble 1 (민수)
    draw.ellipse([140, 510, 200, 570], fill=(234, 88, 12, 255))
    draw.text((158, 522), "민", font=get_font(28, True), fill=(255, 255, 255))
    draw.text((215, 505), "민수 (홍대 거주)", font=name_font, fill=(180, 190, 210))
    draw_card(draw, 215, 540, 750, 630, bg=(40, 48, 75, 255), border=(70, 80, 120, 150), radius=20, border_w=1)
    draw.text((240, 565), "야 이번엔 홍대에서 보자! 핫플 가자!", font=text_font, fill=(255, 255, 255))
    
    # Bubble 2 (지은)
    draw.ellipse([140, 660, 200, 720], fill=(147, 51, 234, 255))
    draw.text((158, 672), "지", font=get_font(28, True), fill=(255, 255, 255))
    draw.text((215, 655), "지은 (강남 거주)", font=name_font, fill=(180, 190, 210))
    draw_card(draw, 215, 690, 830, 780, bg=(40, 48, 75, 255), border=(70, 80, 120, 150), radius=20, border_w=1)
    draw.text((240, 715), "홍대는 너무 멀어 ㅠㅠ 강남에서 만나자!", font=text_font, fill=(255, 255, 255))
    
    # Bubble 3 (영호)
    draw.ellipse([140, 810, 200, 870], fill=(13, 148, 136, 255))
    draw.text((158, 822), "영", font=get_font(28, True), fill=(255, 255, 255))
    draw.text((215, 805), "영호 (수원 거주)", font=name_font, fill=(180, 190, 210))
    draw_card(draw, 215, 840, 860, 930, bg=(40, 48, 75, 255), border=(70, 80, 120, 150), radius=20, border_w=1)
    draw.text((240, 865), "난 수원인데... 중간이 도대체 어디야?!", font=text_font, fill=(255, 255, 255))
    
    # Stress / Warning Alert Box
    draw_card(draw, 140, 980, 940, 1140, bg=(239, 68, 68, 30), border=(239, 68, 68, 180), radius=22, border_w=2)
    draw.text((230, 1015), "[주의] 장소 정하다가 모임 파토 위기!", font=get_font(34, True), fill=(255, 120, 120))
    draw.text((310, 1070), "누구는 10분, 누구는 1시간...", font=get_font(28, False), fill=(220, 220, 230))
    return img

def build_scene_2():
    img = create_base_canvas("red")
    draw = ImageDraw.Draw(img)
    draw_header_badge(draw, "[불공평 경보] 약속 장소 불공평 주의!", y=130, bg_color=(239, 68, 68, 220))
    draw_title(draw, [("누구는 10분, 누구는 1시간!", True), ("진짜 너무 불공평하잖아요!", False)], start_y=220)
    
    # Card A: Happy Friend (12 mins)
    draw_card(draw, 100, 400, 980, 750, bg=(16, 185, 129, 20), border=(16, 185, 129, 180), radius=30, border_w=3)
    draw.ellipse([150, 440, 175, 465], fill=(52, 211, 153, 255))
    draw.text((190, 435), "집 근처에서 만나는 친구 (강남 거주)", font=get_font(32, True), fill=(52, 211, 153))
    draw.text((150, 495), "소요 시간: 단 12분!", font=get_font(50, True), fill=(255, 255, 255))
    draw.text((150, 580), "- 여유롭게 커피 마시며 천천히 출발", font=get_font(28, False), fill=(200, 240, 220))
    draw.text((150, 630), "- 약속 나가는 발걸음이 가벼움 [부담 0%]", font=get_font(28, False), fill=(200, 240, 220))
    
    # Card B: Exhausted Friend (1h 15m)
    draw_card(draw, 100, 800, 980, 1190, bg=(239, 68, 68, 20), border=(239, 68, 68, 180), radius=30, border_w=3)
    draw.ellipse([150, 840, 175, 865], fill=(248, 113, 113, 255))
    draw.text((190, 835), "먼 곳에서 출발하는 친구 (수원 거주)", font=get_font(32, True), fill=(248, 113, 113))
    draw.text((150, 895), "소요 시간: 무려 1시간 15분?!", font=get_font(50, True), fill=(255, 110, 110))
    draw.text((150, 980), "- 광역버스 + 지하철 2번 환승 지옥", font=get_font(28, False), fill=(240, 210, 210))
    draw.text((150, 1030), "- 도착하기도 전에 지쳐서 녹초 & 억울함!", font=get_font(28, False), fill=(240, 210, 210))
    draw.text((150, 1090), "- 모임 나가기 전부터 스트레스 폭발 [지침 100%]", font=get_font(28, True), fill=(255, 140, 140))
    return img

def build_scene_3():
    img = create_base_canvas("indigo")
    draw = ImageDraw.Draw(img)
    draw_header_badge(draw, "[완벽 해결] 친구 모임 중간장소 찾기", y=130, bg_color=(99, 102, 241, 230))
    draw_title(draw, [("이제 싸우지 마세요!", False), ("'얼중간' 이 해결해 드립니다!", True)], start_y=220)
    
    # App Logo Center
    try:
        app_icon = Image.open("shorts/assets/app_icon.png").resize((200, 200), Image.Resampling.LANCZOS)
        mask = Image.new("L", (200, 200), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, 200, 200], radius=46, fill=255)
        img.paste(app_icon, ((WIDTH - 200) // 2, 400), mask)
    except Exception as e:
        print(e)
        
    draw.text((WIDTH//2 - 110, 630), "얼중간", font=get_font(64, True), fill=(255, 255, 255))
    draw.text((WIDTH//2 - 200, 715), "“얼추 중간에서 보자!”", font=get_font(38, True), fill=(255, 230, 0))
    
    features = [
        ("[1초 접속] 앱 설치 없는 웹 링크", "회원가입 없이 카톡 링크만 열면 즉시 시작!"),
        ("[간편 등록] 친구들 출발지만 콕 찍기", "각자 위치만 등록하면 실시간 자동 계산!"),
        ("[공평 도출] 대중교통 최적 중간역", "누구도 억울하지 않은 최적의 공평 중간 장소!")
    ]
    
    y = 800
    for tag, desc in features:
        draw_card(draw, 100, y, 980, y + 125, bg=(30, 36, 60, 235), border=(99, 102, 241, 160), radius=22, border_w=2)
        draw.text((140, y + 24), tag, font=get_font(32, True), fill=(6, 182, 212))
        draw.text((140, y + 70), desc, font=get_font(26, False), fill=(220, 230, 245))
        y += 145
    return img

def build_scene_4():
    img = create_base_canvas("blue")
    draw = ImageDraw.Draw(img)
    draw_header_badge(draw, "STEP 1. 링크 공유 & 출발지 입력", y=130, bg_color=(6, 182, 212, 230))
    draw_title(draw, [("방 만들고 링크만 쓱 공유!", False), ("각자 출발지만 찍으면 끝!", True)], start_y=220)
    
    # Left: Phone Mockup with home_view
    try:
        home_v = Image.open("shorts/assets/home_view.png")
        draw_phone_mockup(img, home_v, center_x=340, center_y=790, target_w=460, target_h=760)
    except Exception as e:
        print(e)
        
    # Right: Friend Badges
    draw_card(draw, 610, 440, 1000, 600, bg=(30, 40, 65, 240), border=(234, 88, 12, 200), radius=22, border_w=3)
    draw.ellipse([640, 470, 665, 495], fill=(234, 88, 12, 255))
    draw.text((680, 465), "홍대민수 [방장]", font=get_font(30, True), fill=(255, 255, 255))
    draw.text((640, 525), "출발: 홍대입구역 2호선", font=get_font(26, False), fill=(200, 220, 255))
    
    draw_card(draw, 610, 640, 1000, 800, bg=(30, 40, 65, 240), border=(147, 51, 234, 200), radius=22, border_w=3)
    draw.ellipse([640, 670, 665, 695], fill=(147, 51, 234, 255))
    draw.text((680, 665), "강남지은", font=get_font(30, True), fill=(255, 255, 255))
    draw.text((640, 725), "출발: 강남역 2호선", font=get_font(26, False), fill=(200, 220, 255))
    
    draw_card(draw, 610, 840, 1000, 1000, bg=(30, 40, 65, 240), border=(13, 148, 136, 200), radius=22, border_w=3)
    draw.ellipse([640, 870, 665, 895], fill=(13, 148, 136, 255))
    draw.text((680, 865), "수원영호", font=get_font(30, True), fill=(255, 255, 255))
    draw.text((640, 925), "출발: 수원역 1호선", font=get_font(26, False), fill=(200, 220, 255))
    
    # Bottom Callout Card
    draw_card(draw, 100, 1110, 980, 1220, bg=(6, 182, 212, 30), border=(6, 182, 212, 180), radius=22, border_w=2)
    draw.text((130, 1145), "[원클릭 공유] 카톡으로 링크 보내면 친구들이 바로 참여!", font=get_font(28, True), fill=(255, 255, 255))
    return img

def build_scene_5():
    img = create_base_canvas("indigo")
    draw = ImageDraw.Draw(img)
    draw_header_badge(draw, "STEP 2. 공평한 최적 중간역 도출", y=130, bg_color=(99, 102, 241, 230))
    draw_title(draw, [("모두에게 가장 공평한", False), ("최적의 중간역 1초 도출!", True)], start_y=220)
    
    # Phone Mockup with map_view
    try:
        map_v = Image.open("shorts/assets/map_view.png")
        draw_phone_mockup(img, map_v, center_x=540, center_y=680, target_w=620, target_h=600)
    except Exception as e:
        print(e)
        
    # Result Highlight Card
    draw_card(draw, 100, 960, 980, 1250, bg=(30, 36, 60, 250), border=(255, 230, 0, 230), radius=30, border_w=4)
    draw.text((150, 990), "[최적 추천 만남 장소]", font=get_font(28, True), fill=(255, 230, 0))
    draw.text((150, 1035), "사당역 (2호선 · 4호선 환승역)", font=get_font(44, True), fill=(255, 255, 255))
    
    draw.line([(150, 1110), (930, 1110)], fill=(80, 90, 120, 200), width=2)
    draw.text((150, 1135), "민수: 24분", font=get_font(30, True), fill=(52, 211, 153))
    draw.text((430, 1135), "지은: 21분", font=get_font(30, True), fill=(52, 211, 153))
    draw.text((710, 1135), "영호: 27분", font=get_font(30, True), fill=(52, 211, 153))
    draw.text((210, 1195), "[황금 밸런스] 세 사람 모두 20분대 도착 완료!", font=get_font(28, True), fill=(255, 230, 0))
    return img

def build_scene_6():
    img = create_base_canvas("green")
    draw = ImageDraw.Draw(img)
    draw_header_badge(draw, "STEP 3. 주변 맛집 & 카페 추천", y=130, bg_color=(16, 185, 129, 230))
    draw_title(draw, [("중간역 주변 맛집과 감성 카페도", False), ("한눈에 코스 완성!", True)], start_y=220)
    
    # Left: Phone Mockup with room_view
    try:
        room_v = Image.open("shorts/assets/room_view.png")
        draw_phone_mockup(img, room_v, center_x=340, center_y=790, target_w=460, target_h=760)
    except Exception as e:
        print(e)
        
    # Right: Recommendation Cards
    places = [
        ("[추천 맛집]", "인기 고깃집 & 맛집거리", "도보 3분 · 회식/모임 최적"),
        ("[감성 카페]", "루프탑 & 베이커리 카페", "도보 4분 · 단체석 완비"),
        ("[길안내 연동]", "카카오내비 · 대중교통", "원클릭 실시간 경로 확인")
    ]
    
    y = 440
    for tag, name, sub in places:
        draw_card(draw, 610, y, 1000, y + 165, bg=(30, 42, 60, 240), border=(16, 185, 129, 180), radius=22, border_w=2)
        draw.text((640, y + 20), tag, font=get_font(26, True), fill=(52, 211, 153))
        draw.text((640, y + 60), name, font=get_font(28, True), fill=(255, 255, 255))
        draw.text((640, y + 110), sub, font=get_font(22, False), fill=(180, 210, 200))
        y += 190
        
    # Bottom callout
    draw_card(draw, 100, 1110, 980, 1220, bg=(16, 185, 129, 30), border=(16, 185, 129, 180), radius=22, border_w=2)
    draw.text((150, 1145), "만남 장소부터 2차 카페 코스까지 완벽하게 해결!", font=get_font(28, True), fill=(255, 255, 255))
    return img

def build_scene_7():
    img = create_base_canvas("indigo")
    draw = ImageDraw.Draw(img)
    draw_header_badge(draw, "[약속 고민 끝] 지금 바로 시작하세요!", y=130, bg_color=(99, 102, 241, 230))
    draw_title(draw, [("지금 검색창에 검색해보세요!", False), ("'얼중간' 에서 우리 만나요!", True)], start_y=220)
    
    # App Logo Center
    try:
        app_icon = Image.open("shorts/assets/app_icon.png").resize((180, 180), Image.Resampling.LANCZOS)
        mask = Image.new("L", (180, 180), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, 180, 180], radius=40, fill=255)
        img.paste(app_icon, ((WIDTH - 180) // 2, 380), mask)
    except Exception as e:
        print(e)
        
    draw.text((WIDTH//2 - 95, 580), "얼중간", font=get_font(58, True), fill=(255, 255, 255))
    draw.text((WIDTH//2 - 175, 655), "친구 모임 중간장소 찾기", font=get_font(32, True), fill=(200, 220, 255))
    
    # Search Box Simulation
    draw_card(draw, 140, 750, 940, 870, bg=(255, 255, 255, 255), border=(99, 102, 241, 220), radius=60, border_w=4)
    draw.text((200, 790), "[검색]", font=get_font(36, True), fill=(100, 100, 100))
    draw.text((320, 786), "얼중간", font=get_font(46, True), fill=(20, 20, 30))
    draw.rounded_rectangle([780, 765, 920, 855], radius=45, fill=(3, 199, 90, 255)) # Naver Green
    draw.text((820, 790), "검색", font=get_font(32, True), fill=(255, 255, 255))
    
    # URL Pill Card
    draw_card(draw, 140, 910, 940, 1020, bg=(30, 36, 60, 240), border=(99, 102, 241, 180), radius=28, border_w=2)
    draw.text((220, 945), "웹 주소: meet-point-aql.pages.dev", font=get_font(34, True), fill=(6, 182, 212))
    
    # Big CTA Button
    draw_card(draw, 140, 1070, 940, 1200, bg=(255, 230, 0, 255), border=(255, 255, 255, 255), radius=35, border_w=2)
    draw.text((215, 1112), "[바로가기] 지금 친구들에게 공유하기!", font=get_font(38, True), fill=(15, 20, 30))
    return img

def main():
    print("Building scene templates...")
    scenes = [
        build_scene_1(),
        build_scene_2(),
        build_scene_3(),
        build_scene_4(),
        build_scene_5(),
        build_scene_6(),
        build_scene_7()
    ]
    
    # Save clean preview images
    for idx, sc in enumerate(scenes):
        sc.save(f"shorts/scenes/clean_scene_{idx+1:02d}.png")
    print("Clean scene templates saved.")
    
    with open("shorts/timeline.json", "r", encoding="utf-8") as f:
        tl = json.load(f)
        
    scene_timelines = tl["scenes"]
    total_dur = tl["total_duration"]
    total_frames = int(total_dur * FPS)
    print(f"Total video duration: {total_dur:.2f}s ({total_frames} frames at {FPS} fps)")
    
    # Pre-render RGB bytes for each scene
    scene_bytes = [sc.convert("RGB").tobytes() for sc in scenes]
    
    # Map each frame index to a scene
    # Cutpoints based on timeline
    cut_frames = []
    for s in scene_timelines:
        cut_frames.append(int(s["end"] * FPS))
        
    # FFmpeg command to read rawvideo from stdin, burn ass subtitles, mix master audio
    ffmpeg_cmd = [
        "ffmpeg", "-y",
        "-f", "rawvideo",
        "-vcodec", "rawvideo",
        "-s", f"{WIDTH}x{HEIGHT}",
        "-pix_fmt", "rgb24",
        "-r", str(FPS),
        "-i", "-", # stdin
        "-i", "shorts/master_audio.wav",
        "-vf", "ass='shorts/subtitles.ass'",
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "18", # High visual quality
        "-pix_fmt", "yuv420p",
        "-r", str(FPS),
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        "shorts/meetpoint_shorts.mp4"
    ]
    
    print("Launching ffmpeg pipe...")
    proc = subprocess.Popen(ffmpeg_cmd, stdin=subprocess.PIPE)
    
    for frame_idx in range(total_frames):
        # Determine scene
        t = frame_idx / FPS
        scene_idx = 0
        for i, s in enumerate(scene_timelines):
            if t < s["end"]:
                scene_idx = i
                break
        else:
            scene_idx = len(scenes) - 1
            
        proc.stdin.write(scene_bytes[scene_idx])
        if frame_idx % 150 == 0:
            print(f"Rendered frame {frame_idx}/{total_frames} ({t:.1f}s)")
            
    proc.stdin.close()
    proc.wait()
    print("Video generation completed successfully!")

if __name__ == "__main__":
    main()
