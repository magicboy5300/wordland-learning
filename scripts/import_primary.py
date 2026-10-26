"""Normalize the full primary Chinese source; preserve grade and edition provenance."""
import argparse,json,hashlib,collections
from pathlib import Path
from import_grade1 import load_json,category
root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--source',default='/private/tmp/k12-primary-chinese.json');args=parser.parse_args()
raw=Path(args.source).read_bytes();source=json.loads(raw);points=[];names=['一','二','三','四','五','六']
for p in source['knowledge_points']:
 books=[b for b in p.get('textbooks',[]) if b.get('grade') in [n+'年级' for n in names] and b.get('volume') in ['上册','下册']]
 if not books:continue
 grades=sorted({names.index(b['grade'][0])+1 for b in books});ann=load_json(p.get('annotations'),{})
 title=p['canonical_name'];aliases=load_json(p.get('aliases'),[])
 warnings=['标题叠词类型与例词不一致，需要人工核对'] if 'ABB' in title and any(w in ' '.join(aliases) for w in ['碧绿碧绿','雪白雪白','火红火红']) else []
 points.append({'id':p['id'],'name':title,'grade':grades[0],'grades':grades,'category':category(title,books),'semesters':sorted({b['volume'] for b in books}),'confidence':p.get('confidence'),'aliases':aliases,'summary':p.get('summary') or '', 'objectives':ann.get('learningObjectives',{}).get('value',[]),'difficulty':ann.get('difficulty',{}).get('value'),'textbooks':books,'reviewStatus':'source-unreviewed','warnings':warnings})
ids={p['id'] for p in points};relations=[r for r in source['relations'] if r['from_kp_id'] in ids and r['to_kp_id'] in ids]
metadata={'source':'https://github.com/mmlong818/k12-knowledge-points','sourceFile':'split/小学/语文.json','sourceSha256':hashlib.sha256(raw).hexdigest(),'importedAt':'2026-10-23','license':'PolyForm Noncommercial 1.0.0','requiredNotice':'Copyright © 2026 猫叔 (https://github.com/mmlong818/k12-knowledge-points)','pointCount':len(points),'relationCount':len(relations),'gradeCounts':{str(i):sum(i in p['grades'] for p in points) for i in range(1,7)},'semesterCounts':{t:sum(t in p['semesters'] for p in points) for t in ['上册','下册']},'categoryCounts':dict(collections.Counter(p['category'] for p in points)),'notice':'来源包含新旧教材和相近条目，原始抽取仍待逐条核对。课程按年级能力目标自编，不以导入条目数代替课程覆盖或学习掌握。'}
(root/'data/primary-knowledge.json').write_text(json.dumps({'metadata':metadata,'knowledge_points':points,'relations':relations},ensure_ascii=False,separators=(',',':'))+'\n')
print(json.dumps(metadata,ensure_ascii=False))
