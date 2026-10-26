import tables from '../data/grade1-characters.json' with { type: 'json' };
const neutralWords = { 的:'我的',地:'慢慢地走',得:'跑得快',了:'好了',子:'叶子',么:'什么',们:'我们',着:'看着',吗:'好吗',吧:'来吧',呢:'你呢',呀:'好呀',啦:'来啦',哪:'天哪',啊:'好啊' };
const toned = /[āáǎàōóǒòēéěèīíǐìūúǔùǖǘǚǜ]/;
export const characterTerms = tables.terms.map((term) => ({ semester:term.semester, edition:term.edition, recognized:term.recognized.length, writing:term.writing.length, sourceUrl:term.sourceUrl, sourceNote:term.sourceNote }));
export const characterLessons = tables.terms.flatMap((term) => {
  const records = new Map();
  for(const [kind,items] of [['recognition',term.recognized],['writing',term.writing]]) {
    for(const item of items) {
      const record = records.get(item.character) || {character:item.character,readings:[],recognition:false,writing:false,bookPage:item.bookPage};
      record[kind]=true;
      record.readings=[...new Set([...record.readings,item.reading,...(item.otherReadings || [])])];
      records.set(item.character,record);
    }
  }
  const pool=[...records.values()];
  return pool.map((record,index)=>{
    const id=`character-${term.code}-${record.character.codePointAt(0).toString(16)}`;
    const examples=record.readings.map((reading)=>toned.test(reading)?reading:neutralWords[record.character] || record.character);
    const distractors=pool.filter((other)=>other.character!==record.character&&!other.readings.some((reading)=>record.readings.includes(reading)));
    const options=[record.character,distractors[(index*3)%distractors.length].character,distractors[(index*3+1)%distractors.length].character];
    return {id,title:'汉字声音小卡',subtitle:`字表第 ${index+1} 张 · ${record.writing?'认读与练写':'认读练习'}`,category:'汉字小镇',semester:term.semester,grade:1,version:2,reward:0,order:2000+(term.code==='lower'?1000:0)+index,scene:'letters',color:'yellow',minutes:3,unit:'character-library',unitTitle:'课本字表练习场',unitSubtitle:'先认读，再练写，分别记录',knowledgeIds:[],characterCard:{...record,examples},curriculumReferences:[{title:`${term.edition} · ${term.semester}字表`,url:term.sourceUrl,note:term.sourceNote}],story:'先观察这张汉字卡，听一听、跟着读，再试试从几张卡片里找到它。',intro:'先观察字形和注音，点示范音跟读，再开始听音找字。会写字还可以在田字格中练习，笔顺请对照学校课本。',practice:examples.filter((example)=>toned.test(example)),questions:examples.map((example,readingIndex)=>({id:`${id}-${readingIndex+1}`,type:'choice',prompt:toned.test(example)?'听示范音，找出本卡学过的汉字。':'听词语，找到本卡刚学过的那个字。',options,answer:record.character,listen:example,audioOnly:true,hideOptionPinyin:true,hint:'先完整听一遍，再仔细观察字形。',explanation:`找到了。本题的读音示范是：${example}。`,skillId:`character:${term.code}:${record.character}:${record.readings[readingIndex]}`,skillLabel:`认读“${record.character}”：${record.readings[readingIndex]}`})),activities:record.writing?[{id:`handwriting-${record.character}`,kind:'draw',title:`写一写：${record.character}`,prompt:`对照学校课本的范字，在田字格中练写“${record.character}”，也可以在纸上写后记录。`,characters:[record.character],checklist:['观察了字形和占格','对照课本检查笔顺','又独立写了一次']}]:[]};
  });
});
