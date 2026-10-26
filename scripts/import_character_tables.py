"""Extract factual character/reading pairs from identified textbook appendices.
Usage: python import_character_tables.py upper.pdf lower.pdf
No textbook passages or page artwork are included in application output.
"""
import sys,re,json,hashlib
from pathlib import Path
from pypdf import PdfReader
root=Path(__file__).resolve().parents[1]
marks=dict(zip('QWASTYGHERDFUIJKOPLMVC',['ā','á','ǎ','à','ō','ó','ǒ','ò','ē','é','ě','è','ī','í','ǐ','ì','ū','ú','ǔ','ù','ǚ','ǜ']))
terms=[]
for index,(code,semester,recognition_pages,writing_pages,expected) in enumerate([
 ('upper','上册',[109,110,111],[112],(280,100)),('lower','下册',[118,119,120],[121,122,123],(410,200))]):
 file=Path(sys.argv[index+1]); reader=PdfReader(file)
 def extract(indices,writing=False):
  result=[]
  for page in indices:
   text=reader.pages[page].extract_text()
   # This lower-book PDF has hidden previous-page text after the visible writing table.
   if code=='lower' and writing and page==121:text=text[:text.index('1 2',50)]
   for char,raw in re.findall(r'([\u4e00-\u9fff])\s*\n([A-Za-z]+)',text):
    reading=''.join(marks.get(letter,letter) for letter in raw)
    result.append({'character':char,'reading':reading,'bookPage':page-4})
  return result
 raw_recognized=extract(recognition_pages); writing=extract(writing_pages,True)
 rec_map={}
 # These three are blue polyphonic repeats from upper term, not new lower-term characters.
 repeats=set('只了空') if code=='lower' else set()
 for item in raw_recognized:
  if item['character'] in repeats:continue
  if item['character'] not in rec_map:rec_map[item['character']]=item
  else:rec_map[item['character']].setdefault('otherReadings',[]).append(item['reading'])
 recognized=list(rec_map.values())
 assert (len(recognized),len(writing))==expected,(code,len(recognized),len(writing))
 assert len(set(item['character'] for item in writing))==len(writing)
 terms.append({'code':code,'semester':semester,'edition':'统编语文修订版（依据2022年课程标准）','recognized':recognized,'writing':writing,'sourceSha256':hashlib.sha256(file.read_bytes()).hexdigest(),'appendixPdfPages':{'recognition':[p+1 for p in recognition_pages],'writing':[p+1 for p in writing_pages]},'sourceUrl': 'https://r2-ndr.ykt.cbern.com.cn/edu_product/esp/assets/1c73b348-e8b6-47d6-84b0-6dbacbe28268.pkg/%E4%B9%89%E5%8A%A1%E6%95%99%E8%82%B2%E6%95%99%E7%A7%91%E4%B9%A6%20%E8%AF%AD%E6%96%87%20%E4%B8%80%E5%B9%B4%E7%BA%A7%20%E4%B8%8A%E5%86%8C_1725097498841.pdf' if code=='upper' else 'https://cdn.xschu.com/zixunzhan/1772423081347%E4%B8%80%E5%B9%B4%E7%BA%A7%E4%B8%8B%E8%AF%AD%E6%96%87%E4%BA%BA%E6%95%99.pdf','sourceNote':'上册来源：国家智慧教育平台；下册来源：公开教材副本，已核对编修委员会、目录与附录数量。纸质教材版次不同时请以学校教材为准。'})
(root/'data/grade1-characters.json').write_text(json.dumps({'notice':'仅收录字表事实数据，不含现代课文全文。认读不等于会写；字形书写采用人工检查。','terms':terms},ensure_ascii=False,indent=2))
print([(t['semester'],len(t['recognized']),len(t['writing'])) for t in terms])
