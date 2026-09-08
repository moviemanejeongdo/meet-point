import asyncio
import edge_tts
import json
import os

VOICE = "ko-KR-SunHiNeural"  # Friendly, bright, energetic Korean female voice
RATE = "+10%"  # Slightly faster for dynamic YouTube Shorts tempo

SCENES = [
    {
        "id": 1,
        "text": "주말에 친구들이랑 모이기로 했는데, 어디서 만날지 아직도 싸우고 계신가요?",
        "subtitle": "주말 약속 어디서 만날지 아직도 싸우시나요?",
        "theme": "hook"
    },
    {
        "id": 2,
        "text": "홍대? 강남? 누구는 10분, 누구는 1시간 걸리면 진짜 불공평하잖아요!",
        "subtitle": "누구는 10분, 누구는 1시간! 진짜 불공평하죠?",
        "theme": "conflict"
    },
    {
        "id": 3,
        "text": "이제 싸우지 마세요! 친구 모임 중간장소 찾기, 얼중간이 해결해 드립니다!",
        "subtitle": "이제 싸우지 마세요! '얼중간'이 해결해 드립니다!",
        "theme": "solution"
    },
    {
        "id": 4,
        "text": "방 만들고 카톡 링크만 쓱 공유하면 끝! 친구들이 각자 출발지만 찍으면...",
        "subtitle": "카톡 링크 공유하고 각자 출발지만 찍으면 끝!",
        "theme": "step1"
    },
    {
        "id": 5,
        "text": "모두에게 가장 공평한 최적의 지하철역과 이동 시간을 1초 만에 딱 찾아줍니다!",
        "subtitle": "모두에게 공평한 최적의 중간역과 소요 시간 도출!",
        "theme": "step2"
    },
    {
        "id": 6,
        "text": "게다가 중간역 주변의 인기 맛집과 추천 카페까지 한 번에 보여줍니다!",
        "subtitle": "주변 추천 맛집과 감성 카페까지 한눈에!",
        "theme": "places"
    },
    {
        "id": 7,
        "text": "약속 장소 고민 끝! 지금 검색창에 얼중간을 검색하거나 링크로 바로 접속해보세요!",
        "subtitle": "약속 장소 고민 끝! 검색창에 '얼중간'을 검색해보세요!",
        "theme": "cta"
    }
]

async def generate_audio():
    os.makedirs("e:/unity 26.04.28/만남장소중간지점찾기/shorts/audio", exist_ok=True)
    manifest = []
    
    for item in SCENES:
        out_path = f"e:/unity 26.04.28/만남장소중간지점찾기/shorts/audio/scene_{item['id']:02d}.mp3"
        communicate = edge_tts.Communicate(item["text"], VOICE, rate=RATE)
        await communicate.save(out_path)
        print(f"Generated {out_path}")
        manifest.append({
            "id": item["id"],
            "audio_file": out_path,
            "text": item["text"],
            "subtitle": item["subtitle"],
            "theme": item["theme"]
        })
        
    with open("e:/unity 26.04.28/만남장소중간지점찾기/shorts/manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    asyncio.run(generate_audio())
