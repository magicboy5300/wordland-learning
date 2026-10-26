"""Prepare local phoneme examples from the pinned Unlicense syllable collection.

Extract the downloaded repository into public/audio/pinyin/syllables first.
The few finals without independent syllable recordings are clipped from
the vowel portion of bo/deng/dong. No English-letter TTS fallback is used.
"""
import json
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[1]
sounds = root / 'public/audio/pinyin'
derived = sounds / 'finals'
derived.mkdir(parents=True, exist_ok=True)
clips = {}
for final, syllable, start in [('o', 'bo', 0.14), ('eng', 'deng', 0.11), ('ong', 'dong', 0.11)]:
    for tone in range(1, 5):
        source = sounds / 'syllables' / f'{syllable}{tone}.mp3'
        target = derived / f'{final}{tone}.mp3'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(source), '-ss', str(start), '-af', 'afade=t=in:d=0.012,apad=pad_dur=0.10', '-codec:a', 'libmp3lame', '-b:a', '128k', str(target)], check=True)
        clips[f'{final}{tone}'] = {'source': f'{syllable}{tone}.mp3', 'startSeconds': start, 'file': f'/audio/pinyin/finals/{final}{tone}.mp3'}
(sounds / 'derived-manifest.json').write_text(json.dumps(clips, ensure_ascii=False, indent=2))
print(f'已生成 {len(clips)} 段韵母示范剪辑')
