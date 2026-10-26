"""Import a reproducible first-grade slice; upstream extraction is not an audited curriculum."""
import argparse
import collections
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE_URL = 'https://github.com/mmlong818/k12-knowledge-points'

def load_json(value, fallback):
    try:
        return json.loads(value) if isinstance(value, str) else value or fallback
    except (ValueError, TypeError):
        return fallback

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', default='/private/tmp/k12-primary-chinese.json')
    args = parser.parse_args()
    raw = Path(args.source).read_bytes()
    source = json.loads(raw)
    points = []
    for point in source['knowledge_points']:
        if '一年级' not in point.get('grades', []):
            continue
        ann = load_json(point.get('annotations'), {})
        value = lambda name, default=None: ann.get(name, {}).get('value', default)
        books = [book for book in point.get('textbooks', []) if book.get('grade') == '一年级']
        if not books:
            continue
        title = point['canonical_name']
        warnings = []
        examples = ' '.join(load_json(point.get('aliases'), []))
        if 'ABB' in title and any(word in examples for word in ['碧绿碧绿', '雪白雪白', '火红火红']):
            warnings.append('标题叠词类型与例词不一致，需要人工核对')
        points.append({
            'id': point['id'], 'name': title, 'grade': 1,
            'category': category(title, books),
            'semesters': sorted(set(book['volume'] for book in books)),
            'confidence': point.get('confidence'),
            'aliases': load_json(point.get('aliases'), []),
            'summary': point.get('summary') or '',
            'objectives': value('learningObjectives', []),
            'difficulty': value('difficulty'),
            'textbooks': books, 'reviewStatus': 'source-unreviewed', 'warnings': warnings,
        })
    ids = {point['id'] for point in points}
    relations = [rel for rel in source['relations'] if rel['from_kp_id'] in ids and rel['to_kp_id'] in ids]
    metadata = {
        'source': SOURCE_URL,
        'sourceFile': 'split/小学/语文.json',
        'sourceSha256': hashlib.sha256(raw).hexdigest(),
        'importedAt': '2026-10-21',
        'license': 'PolyForm Noncommercial 1.0.0',
        'requiredNotice': 'Copyright © 2026 猫叔 (https://github.com/mmlong818/k12-knowledge-points)',
        'pointCount': len(points), 'relationCount': len(relations),
        'semesterCounts': {term: sum(term in point['semesters'] for point in points) for term in ['上册', '下册']},
        'categoryCounts': dict(collections.Counter(point['category'] for point in points)),
        'notice': '原始抽取条目，含新旧教材版本与相近条目；尚未经逐条教学审核。题目为本项目另外编写。',
    }
    output = ROOT / 'data' / 'grade1-knowledge.json'
    output.write_text(json.dumps({'metadata': metadata, 'knowledge_points': points, 'relations': relations}, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(metadata, ensure_ascii=False, indent=2))

def category(title, books):
    chapter = ' '.join(str(book.get('chapter_path', [])) for book in books)
    if '汉语拼音' in chapter or any(word in title for word in ['韵母', '声母', '拼音', '音节', '四声', '声调', '拼读', '变调']): return '拼音乐园'
    if any(word in title for word in ['古诗', '静夜思', '春晓', '诗歌', '诗句', '池上', '小池', '咏鹅']): return '诗意星空'
    if any(word in title for word in ['说话', '表达', '口语', '交际', '写话', '倾听']): return '表达工坊'
    if any(word in title for word in ['句子', '标点', '量词', '词语', '叠词', '反义']): return '词句花园'
    if any(word in title for word in ['识字', '认读', '生字', '汉字', '笔画', '笔顺', '书写', '偏旁']) or '识字' in chapter: return '汉字小镇'
    return '阅读森林'

if __name__ == '__main__':
    main()
