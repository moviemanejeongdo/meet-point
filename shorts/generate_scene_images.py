import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUTPUT_DIR = "shorts/scenes"
os.makedirs(OUTPUT_DIR, exist_ok=True)

WIDTH = 1080
HEIGHT = 1920

FONT_ROUND_EB = "C:/Windows/Fonts/NanumSquareRoundEB.ttf"
FONT_ROUND_B = "C:/Windows/Fonts/NanumSquareRoundB.ttf"
FONT_ROUND_R = "C:/Windows/Fonts/NanumSquareRoundR.ttf"

def get_font(size, bold=True):
    try:
        p = FONT_ROUND_EB if bold else FONT_ROUND_R
        return ImageFont.truetype(p, size)
    except:
        return ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf" if bold else "C:/Windows/Fonts/malgun.ttf", size)

def create_base_canvas(theme="blue"):
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
    else: # indigo / blue
        acc_draw.ellipse([-150, -100, 700, 700], fill=(79, 70, 229, 55))
        acc_draw.ellipse([500, 300, 1200, 1000], fill=(6, 182, 212, 40))
        acc_draw.ellipse([-200, 1100, 600, 1800], fill=(236, 72, 153, 35))
        
    accent = accent.filter(ImageFilter.GaussianBlur(120))
    return Image.alpha_composite(img, accent)

def draw_header_badge(draw, text, y=140, bg_color=(99, 102, 241, 230), text_color=(255, 255, 255)):
    font = get_font(34, bold=True)
    bbox = font.getbbox(text)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    pad_x, pad_y = 30, 14
    bx = (WIDTH - tw) // 2 - pad_x
    by = y
    bw = tw + pad_x * 2
    bh = th + pad_y * 2
    
    draw.rounded_rectangle([bx, by, bx + bw, by + bh], radius=26, fill=bg_color)
    draw.text((bx + pad_x, by + pad_y - 3), text, font=font, fill=text_color)
    return by + bh

def draw_title(draw, lines, start_y=230):
    font = get_font(56, bold=True)
    curr_y = start_y
    for line, hl in lines:
        bbox = font.getbbox(line)
        tw = bbox[2] - bbox[0]
        tx = (WIDTH - tw) // 2
        col = (255, 230, 0, 255) if hl else (255, 255, 255, 255)
        # Shadow
        draw.text((tx + 3, curr_y + 3), line, font=font, fill=(0, 0, 0, 180))
        draw.text((tx, curr_y), line, font=font, fill=col)
        curr_y += 76
    return curr_y

def draw_phone_mockup(base_img, content_img, center_x=540, center_y=980, target_w=620, target_h=1050):
    cont = content_img.resize((target_w - 24, target_h - 24), Image.Resampling.LANCZOS)
    phone = Image.new("RGBA", (target_w + 40, target_h + 40), (0, 0, 0, 0))
    p_draw = ImageDraw.Draw(phone)
    p_draw.rounded_rectangle([10, 10, target_w + 30, target_h + 30], radius=44, fill=(99, 102, 241, 60))
    p_draw.rounded_rectangle([15, 15, target_w + 25, target_h + 25], radius=40, fill=(30, 35, 55, 255), outline=(99, 102, 241, 200), width=4)
    p_draw.rounded_rectangle([27, 27, target_w + 13, target_h + 13], radius=34, fill=(15, 17, 26, 255))
    
    mask = Image.new("L", cont.size, 0)
    m_draw = ImageDraw.Draw(mask)
    m_draw.rounded_rectangle([0, 0, cont.size[0], cont.size[1]], radius=32, fill=255)
    phone.paste(cont, (27, 27), mask)
    p_draw.rounded_rectangle([target_w//2 - 55, 34, target_w//2 + 55, 56], radius=11, fill=(10, 10, 15, 255))
    
    px = center_x - phone.size[0] // 2
    py = center_y - phone.size[1] // 2
    base_img.paste(phone, (px, py), phone)

def draw_card(draw, x1, y1, x2, y2, bg=(20, 24, 38, 220), border=(99, 102, 241, 150), radius=28, border_w=2):
    draw.rounded_rectangle([x1, y1, x2, y2], radius=radius, fill=bg, outline=border, width=border_w)

def render_scene_1():
    img = create_base_canvas("indigo")
    draw = ImageDraw.Draw(img)
    draw_header_badge(draw, "🤔 주말 약속 어디서 볼까?", y=130, bg_color=(99, 102, 241, 230))
    draw_title(draw, [("이번 주말 친구 모임,", False), ("어디서 만날지 아직도 싸우나요?", True)], start_y=220)
    
    # KakaoTalk Chat Box Card
    draw_card(draw, 100, 420, 980, 1260, bg=(24, 28, 45, 230), border=(99, 102, 241, 180), radius=32, border_w=3)
    
    # Chat Header
    draw.rounded_rectangle([100, 420, 980, 510], radius=32, fill=(35, 41, 65, 255))
    draw.rectangle([100, 470, 980, 510], fill=(35, 41, 65, 255)) # flat bottom
    h_font = get_font(32, bold=True)
    draw.text((150, 445), "💬 주말 정기 모임 (3명)", font=h_font, fill=(255, 255, 255))
    
    # Chat bubbles
    # Bubble 1 (민수)
    name_font = get_font(26, bold=True)
    text_font = get_font(30, bold=False)
    
    draw.ellipse([140, 540, 200, 600], fill=(234, 88, 12, 255))
    draw.text((158, 552), "민", font=get_font(28, True), fill=(255, 255, 255))
    draw.text((215, 535), "민수 (홍대 거주)", font=name_font, fill=(180, 190, 210))
    draw_card(draw, 215, 570, 720, 660, bg=(40, 48, 75, 255), border=(70, 80, 120, 150), radius=20, border_w=1)
    draw.text((240, 595), "야 이번엔 홍대에서 보자! 핫플 가자 🔥", font=text_font, fill=(255, 255, 255))
    
    # Bubble 2 (지은)
    draw.ellipse([140, 700, 200, 760], fill=(147, 51, 234, 255))
    draw.text((158, 712), "지", font=get_font(28, True), fill=(255, 255, 255))
    draw.text((215, 695), "지은 (강남 거주)", font=name_font, fill=(180, 190, 210))
    draw_card(draw, 215, 730, 820, 820, bg=(40, 48, 75, 255), border=(70, 80, 120, 150), radius=20, border_w=1)
    draw.text((240, 755), "홍대는 너무 멀어 ㅠㅠ 강남에서 만나자!", font=text_font, fill=(255, 255, 255))
    
    # Bubble 3 (영호)
    draw.ellipse([140, 860, 200, 920], fill=(13, 148, 136, 255))
    draw.text((158, 872), "영", font=get_font(28, True), fill=(255, 255, 255))
    draw.text((215, 855), "영호 (수원 거주)", font=name_font, fill=(180, 190, 210))
    draw_card(draw, 215, 890, 850, 980, bg=(40, 48, 75, 255), border=(70, 80, 120, 150), radius=20, border_w=1)
    draw.text((240, 915), "난 수원인데... 중간이 도대체 어디야? 😭", font=text_font, fill=(255, 255, 255))
    
    # Stress / Conflict alert badge inside chat
    draw_card(draw, 140, 1030, 940, 1200, bg=(239, 68, 68, 30), border=(239, 68, 68, 180), radius=22, border_w=2)
    warn_font = get_font(34, bold=True)
    draw.text((240, 1070), "⚡ 약속 장소 정하다가 모임 취소 위기!", font=warn_font, fill=(255, 120, 120))
    draw.text((320, 1125), "누구는 10분, 누구는 1시간...", font=get_font(28, False), fill=(220, 220, 230))
    
    img.save(f"{OUTPUT_DIR}/scene_01.png")
    print("Scene 1 rendered.")

def render_scene_2():
    img = create_base_canvas("red")
    draw = ImageDraw.Draw(img)
    draw_header_badge(draw, "⚠️ 불공평한 약속 장소", y=130, bg_color=(239, 68, 68, 220))
    draw_title(draw, [("누구는 10분, 누구는 1시간!", True), ("진짜 너무 불공평하잖아요!", False)], start_y=220)
    
    # Card A: Happy Friend (15 mins)
    draw_card(draw, 100, 420, 980, 780, bg=(16, 185, 129, 20), border=(16, 185, 129, 180), radius=30, border_w=3)
    draw.text((150, 460), "🏡 집 근처에서 보는 친구", font=get_font(34, True), fill=(52, 211, 153))
    draw.text((150, 520), "소요 시간: 단 12분!", font=get_font(48, True), fill=(255, 255, 255))
    draw.text((150, 600), "☕ 여유롭게 커피 마시며 천천히 출발", font=get_font(30, False), fill=(200, 240, 220))
    draw.text((150, 655), "😄 약속 나가는데 부담 0%!", font=get_font(30, False), fill=(200, 240, 220))
    # Big emoji/tag
    draw.text((820, 510), "😎", font=get_font(80, True), fill=(255, 255, 255))
    
    # Card B: Exhausted Friend (1 hour 15 mins)
    draw_card(draw, 100, 830, 980, 1240, bg=(239, 68, 68, 20), border=(239, 68, 68, 180), radius=30, border_w=3)
    draw.text((150, 870), "🚌 먼 곳에서 출발하는 친구", font=get_font(34, True), fill=(248, 113, 113))
    draw.text((150, 930), "소요 시간: 무려 1시간 15분?!", font=get_font(48, True), fill=(255, 100, 100))
    draw.text((150, 1010), "💦 버스 1번 + 지하철 2번 환승 지옥", font=get_font(30, False), fill=(240, 210, 210))
    draw.text((150, 1065), "😭 만나기도 전에 지쳐서 녹초...", font=get_font(30, False), fill=(240, 210, 210))
    draw.text((820, 920), "🥵", font=get_font(80, True), fill=(255, 255, 255))
    
    img.save(f"{OUTPUT_DIR}/scene_02.png")
    print("Scene 2 rendered.")

def render_scene_3():
    img = create_base_canvas("indigo")
    draw = ImageDraw.Draw(img)
    draw_header_badge(draw, "✨ 친구 모임 중간장소 찾기", y=130, bg_color=(99, 102, 241, 230))
    draw_title(draw, [("이제 싸우지 마세요!", False), ("'얼중간' 이 해결해 드립니다!", True)], start_y=220)
    
    # App Logo & Branding Center
    try:
        app_icon = Image.open("shorts/assets/app_icon.png").resize((220, 220), Image.Resampling.LANCZOS)
        # Rounded icon mask
        mask = Image.new("L", (220, 220), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, 220, 220], radius=50, fill=255)
        img.paste(app_icon, ((WIDTH - 220) // 2, 420), mask)
    except Exception as e:
        print("Icon load error:", e)
        
    draw.text((WIDTH//2 - 120, 670), "얼중간", font=get_font(68, True), fill=(255, 255, 255))
    draw.text((WIDTH//2 - 210, 760), "“얼추 중간에서 보자!”", font=get_font(40, True), fill=(255, 230, 0))
    
    # Feature Pills / Benefit Cards
    features = [
        ("⚡ 앱 설치 없는 웹 링크 1초 접속", "회원가입 없이 링크만 열면 즉시 사용!"),
        ("👥 친구들 출발지만 콕 찍으면 끝", "각자 위치를 등록하면 실시간 반영!"),
        ("🎯 대중교통 최적 공평 중간역 도출", "모두의 이동 시간이 비슷한 진짜 중간!")
    ]
    
    y = 860
    for title, sub in features:
        draw_card(draw, 100, y, 980, y + 130, bg=(30, 36, 60, 230), border=(99, 102, 241, 160), radius=24, border_w=2)
        draw.text((150, y + 26), title, font=get_font(34, True), fill=(255, 255, 255))
        draw.text((150, y + 74), sub, font=get_font(26, False), fill=(180, 195, 225))
        y += 155
        
    img.save(f"{OUTPUT_DIR}/scene_03.png")
    print("Scene 3 rendered.")

def render_scene_4():
    img = create_base_canvas("blue")
    draw = ImageDraw.Draw(img)
    draw_header_badge(draw, "STEP 1. 링크 공유 & 출발지 입력", y=130, bg_color=(6, 182, 212, 230))
    draw_title(draw, [("방 만들고 링크만 쓱 공유!", False), ("각자 출발지만 찍으면 끝!", True)], start_y=220)
    
    # Phone Mockup with home_view
    try:
        home_v = Image.open("shorts/assets/home_view.png")
        draw_phone_mockup(img, home_v, center_x=360, center_y=880, target_w=460, target_h=780)
    except Exception as e:
        print("Mockup error:", e)
        
    # Friend Status Badges on the right
    draw_card(draw, 640, 520, 1000, 680, bg=(30, 40, 65, 240), border=(234, 88, 12, 200), radius=22, border_w=3)
    draw.text((670, 550), "🟢 홍대민수", font=get_font(32, True), fill=(255, 255, 255))
    draw.text((670, 605), "출발: 홍대입구역", font=get_font(26, False), fill=(200, 220, 255))
    
    draw_card(draw, 640, 720, 1000, 880, bg=(30, 40, 65, 240), border=(147, 51, 234, 200), radius=22, border_w=3)
    draw.text((670, 750), "🔵 강남지은", font=get_font(32, True), fill=(255, 255, 255))
    draw.text((670, 805), "출발: 강남역", font=get_font(26, False), fill=(200, 220, 255))
    
    draw_card(draw, 640, 920, 1000, 1080, bg=(30, 40, 65, 240), border=(13, 148, 136, 200), radius=22, border_w=3)
    draw.text((670, 950), "🟠 수원영호", font=get_font(32, True), fill=(255, 255, 255))
    draw.text((670, 1005), "출발: 수원역", font=get_font(26, False), fill=(200, 220, 255))
    
    # Bottom Callout
    draw_card(draw, 100, 1330, 980, 1440, bg=(6, 182, 212, 30), border=(6, 182, 212, 180), radius=24, border_w=2)
    draw.text((150, 1365), "📲 친구들에게 카톡으로 링크 공유하면 1초 만에 참여 완료!", font=get_font(28, True), fill=(255, 255, 255))
    
    img.save(f"{OUTPUT_DIR}/scene_04.png")
    print("Scene 4 rendered.")

def render_scene_5():
    img = create_base_canvas("indigo")
    draw = ImageDraw.Draw(img)
    draw_header_badge(draw, "STEP 2. 공평한 최적 중간역 도출", y=130, bg_color=(99, 102, 241, 230))
    draw_title(draw, [("모두에게 가장 공평한", False), ("최적의 중간역 1초 도출!", True)], start_y=220)
    
    # Phone Mockup with map_view
    try:
        map_v = Image.open("shorts/assets/map_view.png")
        draw_phone_mockup(img, map_v, center_x=540, center_y=740, target_w=640, target_h=680)
    except Exception as e:
        print("Mockup error:", e)
        
    # Result Highlight Card
    draw_card(draw, 100, 1140, 980, 1460, bg=(35, 42, 68, 250), border=(255, 230, 0, 220), radius=30, border_w=4)
    draw.text((150, 1175), "🏆 추천 중간 만남 장소", font=get_font(30, True), fill=(255, 230, 0))
    draw.text((150, 1225), "사당역 (2호선 · 4호선 환승역)", font=get_font(46, True), fill=(255, 255, 255))
    
    # Times comparison
    draw.line([(150, 1300), (930, 1300)], fill=(80, 90, 120, 200), width=2)
    draw.text((150, 1325), "민수: 24분", font=get_font(32, True), fill=(52, 211, 153))
    draw.text((430, 1325), "지은: 21분", font=get_font(32, True), fill=(52, 211, 153))
    draw.text((710, 1325), "영호: 27분", font=get_font(32, True), fill=(52, 211, 153))
    draw.text((250, 1395), "✨ 세 사람 모두 20분대! 완벽한 황금 밸런스!", font=get_font(28, True), fill=(255, 230, 0))
    
    img.save(f"{OUTPUT_DIR}/scene_05.png")
    print("Scene 5 rendered.")

def render_scene_6():
    img = create_base_canvas("green")
    draw = ImageDraw.Draw(img)
    draw_header_badge(draw, "STEP 3. 주변 맛집 & 카페 추천", y=130, bg_color=(16, 185, 129, 230))
    draw_title(draw, [("중간역 주변 맛집과 감성 카페도", False), ("한눈에 코스 완성!", True)], start_y=220)
    
    # Phone Mockup with room_view
    try:
        room_v = Image.open("shorts/assets/room_view.png")
        draw_phone_mockup(img, room_v, center_x=360, center_y=880, target_w=460, target_h=780)
    except Exception as e:
        print("Mockup error:", e)
        
    # Recommendation Cards on the right
    places = [
        ("🍽️ 추천 맛집", "인기 고깃집 & 맛집거리", "도보 3분 · 리뷰 평점 4.8"),
        ("☕ 감성 카페", "루프탑 & 베이커리 카페", "도보 4분 · 대형 좌석 완비"),
        ("🧭 길찾기 연동", "카카오내비 · 대중교통", "원클릭 실시간 경로 확인")
    ]
    
    y = 520
    for cat, name, sub in places:
        draw_card(draw, 640, y, 1000, y + 175, bg=(30, 42, 60, 240), border=(16, 185, 129, 180), radius=22, border_w=2)
        draw.text((670, y + 20), cat, font=get_font(26, True), fill=(52, 211, 153))
        draw.text((670, y + 60), name, font=get_font(28, True), fill=(255, 255, 255))
        draw.text((670, y + 115), sub, font=get_font(22, False), fill=(180, 210, 200))
        y += 200
        
    # Bottom callout
    draw_card(draw, 100, 1330, 980, 1440, bg=(16, 185, 129, 30), border=(16, 185, 129, 180), radius=24, border_w=2)
    draw.text((180, 1365), "약속 장소뿐만 아니라 2차 카페 고민까지 한 번에 해결!", font=get_font(28, True), fill=(255, 255, 255))
    
    img.save(f"{OUTPUT_DIR}/scene_06.png")
    print("Scene 6 rendered.")

def render_scene_7():
    img = create_base_canvas("indigo")
    draw = ImageDraw.Draw(img)
    draw_header_badge(draw, "🎉 약속 장소 고민 완전 해결!", y=130, bg_color=(99, 102, 241, 230))
    draw_title(draw, [("지금 검색창에 검색해보세요!", False), ("'얼중간' 에서 우리 만나요!", True)], start_y=220)
    
    # App Logo
    try:
        app_icon = Image.open("shorts/assets/app_icon.png").resize((200, 200), Image.Resampling.LANCZOS)
        mask = Image.new("L", (200, 200), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, 200, 200], radius=44, fill=255)
        img.paste(app_icon, ((WIDTH - 200) // 2, 420), mask)
    except Exception as e:
        print("Icon error:", e)
        
    draw.text((WIDTH//2 - 110, 650), "얼중간", font=get_font(64, True), fill=(255, 255, 255))
    draw.text((WIDTH//2 - 190, 735), "친구 모임 중간장소 찾기", font=get_font(34, True), fill=(200, 220, 255))
    
    # Search Box Simulation
    draw_card(draw, 140, 840, 940, 960, bg=(255, 255, 255, 255), border=(99, 102, 241, 220), radius=60, border_w=4)
    draw.text((200, 878), "🔍", font=get_font(42, True), fill=(100, 100, 100))
    draw.text((280, 878), "얼중간", font=get_font(46, True), fill=(20, 20, 30))
    # Green search button
    draw.rounded_rectangle([780, 855, 920, 945], radius=45, fill=(3, 199, 90, 255)) # Naver Green
    draw.text((815, 878), "검색", font=get_font(34, True), fill=(255, 255, 255))
    
    # URL Pill Card
    draw_card(draw, 140, 1010, 940, 1120, bg=(30, 36, 60, 240), border=(99, 102, 241, 180), radius=30, border_w=2)
    draw.text((220, 1045), "🌐 meet-point-aql.pages.dev", font=get_font(38, True), fill=(6, 182, 212))
    
    # Big CTA Button
    draw_card(draw, 140, 1180, 940, 1310, bg=(255, 230, 0, 255), border=(255, 255, 255, 255), radius=35, border_w=2)
    draw.text((200, 1222), "👉 지금 바로 친구들에게 공유하기!", font=get_font(42, True), fill=(15, 20, 30))
    
    img.save(f"{OUTPUT_DIR}/scene_07.png")
    print("Scene 7 rendered.")

if __name__ == "__main__":
    render_scene_1()
    render_scene_2()
    render_scene_3()
    render_scene_4()
    render_scene_5()
    render_scene_6()
    render_scene_7()
    print("All 7 scenes successfully generated!")
