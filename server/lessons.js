import {primaryLessons} from './primary-courses.js';
export {gradeCatalog} from './primary-courses.js';
import { characterLessons } from './character-courses.js';
export { characterLessons, characterTerms } from './character-courses.js';
import { shuffledQuestion } from './learning-evidence.js';
// Original exercises, linked to upstream knowledge IDs. Answers stay on the server.
import { additionalLessons } from './additional-lessons.js';
import { upperLessons, upperUnits } from './upper-lessons.js';
import { expandedLessons, lowerUnits, extraUpperUnits, characterActivities } from './term-expansion.js';
const choice = (id, prompt, options, answer, hint, explanation, extra = {}) => ({ id, type: 'choice', prompt, options, answer, hint, explanation, ...extra });
const order = (id, prompt, options, answer, hint, explanation, extra = {}) => ({ id, type: 'order', prompt, options, answer, hint, explanation, ...extra });
const originalLessons = [
  {
    id: 'sunrise', title: '找回太阳的名字', subtitle: '认识日、月、水、火', category: '汉字小镇', semester: '上册', scene: 'sun', minutes: 5, color: 'peach',
    knowledgeIds: ['dda8e30a-a65b-4cec-afbf-8c754788719d'],
    story: '森林里的路牌被风吹乱了。小书狐想邀请你，把太阳、月亮和小河的名字送回家。',
    intro: '“日”可以表示太阳，“月”可以表示月亮。看看身边的事物，也能发现汉字的秘密！',
    questions: [
      choice('sun-1', '哪一个字可以表示太阳？', ['月', '日', '水'], '日', '想一想：“日出”是什么升起来了？', '“日”可以表示太阳。太阳升起，我们说“日出”。', { illustration: 'sun' }),
      choice('sun-2', '夜空中弯弯的月亮，应该找到哪个字？', ['火', '田', '月'], '月', '读一读：“月亮、月光”。', '月亮的“月”就是这个字。', { illustration: 'moon' }),
      choice('sun-3', '小河里的东西能流动，鱼儿在里面游。它的名字是？', ['水', '火', '山'], '水', '我们每天喝的是什么？', '小河里流动的是水。“水”和“火”是不同的字。', { illustration: 'water' }),
    ],
  },
  {
    id: 'vowels', title: '拼音精灵的邀请', subtitle: '和单韵母打个招呼', category: '拼音乐园', semester: '上册', scene: 'letters', minutes: 5, color: 'lavender',
    knowledgeIds: ['fc9633b4-1d3d-4743-ac5c-b5bdb52a1850', '8c19e6f8-7885-4ecd-8c4a-f30ff5cb40de'],
    story: '三位拼音精灵藏在树叶后。找到它们的名字，就能打开声音森林的小门。',
    intro: '听示范，再跟着读一读单韵母：a、o、e、i、u、ü。读拼音要用汉语的发音，和英文字母读音不同。',
    questions: [
      choice('vowel-1', '圆圆的 o 藏在哪一张卡片里？', ['e', 'o', 'a'], 'o', '找一找像圆圈的字母。', 'o 的样子像一个圆圈，它是单韵母。', { focus: 'o' }),
      choice('vowel-2', '给 u 戴上两点小帽子，会变成谁？', ['ü', 'i', 'e'], 'ü', '注意看卡片上方有没有两点。', 'ü 的上方有两点。书写时要分清 u 和 ü。', { focus: 'u → ?' }),
      choice('vowel-3', '哪一组都是我们刚认识的单韵母？', ['a o e', 'b p m', 'd t n'], 'a o e', '回想刚才认识的三位精灵。', 'a、o、e 都是单韵母。b、p、m 和 d、t、n 是声母。'),
    ],
  },
  {
    id: 'little-forest', title: '树木的秘密朋友', subtitle: '木、林、森的奇妙组合', category: '汉字小镇', semester: '上册', scene: 'tree', minutes: 5, color: 'green',
    knowledgeIds: ['013477ae-f427-4766-b8c8-d98c64a987c8'],
    story: '一棵小树想交朋友。你能找到由“木”组成的字，让它的小树林热闹起来吗？',
    intro: '木、林、森里都有“木”。观察字的组成，可以帮助我们记住它们。',
    questions: [
      choice('forest-1', '两个“木”并排在一起，能组成哪个字？', ['林', '日', '明'], '林', '看看哪个字有左右两个“木”。', '“林”由两个“木”组成，树林里有许多树。', { focus: '木 + 木' }),
      choice('forest-2', '哪个字里藏着三个“木”？', ['木', '林', '森'], '森', '可以用手指一个一个数。', '“森”里面有三个“木”，森林的“森”就是它。', { illustration: 'tree' }),
      choice('forest-3', '“日”和“月”一起，能组成哪个字？', ['明', '林', '水'], '明', '看看谁的左边是“日”，右边是“月”。', '“明”左边是“日”，右边是“月”。我们可以这样记住“明亮”的“明”。', { focus: '日 + 月' }),
    ],
  },
  {
    id: 'post-office', title: '小镇邮局开门啦', subtitle: '给词语找个合适的伙伴', category: '词句花园', semester: '上册', scene: 'mail', minutes: 6, color: 'yellow',
    knowledgeIds: ['4b032133-8db2-4fb6-bd6b-92b915857155'],
    story: '邮递员送来了几张图片卡。请帮忙选好量词，把包裹送给它们的主人。',
    intro: '量词和事物搭配着说：一只小鸟、一条小鱼、一头牛。',
    questions: [
      choice('mail-1', '一（　）小鱼在水里游。', ['条', '头', '朵'], '条', '想一想：“一条小河”里的量词。', '通常说“一条小鱼”。量词要和后面的事物搭配。'),
      choice('mail-2', '树上飞来了一（　）小鸟。', ['本', '只', '棵'], '只', '“只”常常可以和小动物搭配。', '通常说“一只小鸟”。“棵”可以搭配树。'),
      choice('mail-3', '选一句搭配合适的话，送给农场。', ['一朵牛在吃草。', '一头牛在吃草。', '一本牛在吃草。'], '一头牛在吃草。', '牛可以用量词“头”。', '“一头牛在吃草。”搭配合适。读一读这句完整的话。'),
    ],
  },
  {
    id: 'story-trail', title: '南瓜回家的小路', subtitle: '按先后顺序讲故事', category: '表达工坊', semester: '上册', scene: 'carrot', minutes: 6, color: 'peach',
    knowledgeIds: ['26b28007-d6b1-4cbb-b857-608f4e181a3b'],
    story: '小兔发现一个大南瓜。先看看它遇到了什么问题，再帮它把故事讲清楚。以下练习为自编情境。',
    intro: '讲一件事，可以按“先发生什么、接着做什么、最后怎么样”的顺序。',
    questions: [
      choice('trail-1', '小兔抱不动南瓜。它现在遇到的问题是什么？', ['南瓜太重了', '没有找到南瓜', '家里没有门'], '南瓜太重了', '回到第一句话，想一想“抱不动”的原因。', '“抱不动”说明南瓜太重了。讲故事要先说清遇到的问题。'),
      order('trail-2', '按事情发生的顺序，点选三张卡片。', ['把南瓜送到家', '发现大南瓜', '想出滚动的办法'], ['发现大南瓜', '想出滚动的办法', '把南瓜送到家'], '先发现问题，再想办法，最后说结果。', '先发现南瓜，再想出办法，最后把它送回家，故事就有顺序了。'),
      choice('trail-3', '想请朋友帮忙，哪句话说得清楚又有礼貌？', ['快点！', '请你帮我把南瓜送回家，好吗？', '那个，这个……'], '请你帮我把南瓜送回家，好吗？', '说清想请朋友做什么，还可以加上“请”。', '这句话既说清了需要的帮助，也用了礼貌的表达。'),
    ],
  },
  {
    id: 'seasons', title: '四季花园的明信片', subtitle: '认识春、夏、秋、冬', category: '阅读森林', semester: '下册', scene: 'flower', minutes: 5, color: 'green',
    knowledgeIds: ['6882c4d1-96c2-4d03-bd6a-cdd69b8f47d3'],
    story: '花园寄来四张明信片。读一读卡片的线索，找出它们来自哪个季节。',
    intro: '一年有春、夏、秋、冬四个季节。观察天气和植物，可以发现季节的变化。',
    questions: [
      choice('season-1', '天气渐渐暖了，柳树发芽了。这张卡片最像来自哪个季节？', ['春', '秋', '冬'], '春', '春天，许多植物开始长出新芽。', '“暖了”“发芽”都提示了春天的特点。', { illustration: 'flower' }),
      order('season-2', '从春天开始，按一年里的顺序排列四季。', ['冬', '夏', '春', '秋'], ['春', '夏', '秋', '冬'], '春天之后是夏天，秋天之后是冬天。', '从春天开始，依次是春、夏、秋、冬。'),
      choice('season-3', '卡片上写着：“雪花飘，小手套戴起来。”它最像哪个季节？', ['夏', '冬', '春'], '冬', '雪花和手套都提示天气很冷。', '雪花和戴手套的情景，通常让我们想到冬天。'),
    ],
  },
  {
    id: 'opposites', title: '反义词的小桥', subtitle: '给相反的意思找朋友', category: '词句花园', semester: '下册', scene: 'bridge', minutes: 5, color: 'lavender',
    knowledgeIds: ['439876b7-d09a-40dd-8819-9d605358a720'],
    story: '通往古镇的小桥需要词语伙伴。找到意思相反的词，就能接好桥上的木板。',
    intro: '大和小、多和少、古和今，它们分别表示相反的意思。',
    questions: [
      choice('opposite-1', '给“大”找一个意思相反的伙伴。', ['小', '多', '长'], '小', '大象很大，小蚂蚁很小。', '“大”和“小”是一组意思相反的词。', { focus: '大 ↔ ?' }),
      choice('opposite-2', '从前叫“古”，现在叫“今”。和“古”相对的是？', ['今', '前', '高'], '今', '回到第一句话找答案。', '“古”和“今”相对，“今”可以表示现在。'),
      choice('opposite-3', '小鸟飞得高，小草长得（　）。', ['亮', '低', '远'], '低', '想一想“高”的相反意思。', '“高”和“低”相对。把句子补完整后再读一遍。'),
    ],
  },
  {
    id: 'punctuation', title: '句子的小尾巴', subtitle: '认识句号和问号', category: '词句花园', semester: '下册', scene: 'letters', minutes: 5, color: 'yellow',
    knowledgeIds: ['b43e4e5d-ec52-435f-9d3f-b8b7b1d41d72'],
    story: '小书狐的留言少了小尾巴。用标点把句子补好，让朋友读懂它的意思。',
    intro: '告诉别人一件事，句末常用句号“。”；提出问题，句末常用问号“？”。',
    questions: [
      choice('punct-1', '“你叫什么名字”后面应该加哪个标点？', ['。', '？', '，'], '？', '这句话正在向别人提问。', '提出问题的句子，句末用问号：“你叫什么名字？”'),
      choice('punct-2', '“小鸟在树上唱歌”是在告诉我们一件事。句末选哪个标点？', ['？', '，', '。'], '。', '告诉别人一件事，可以用句号结尾。', '这句话在陈述一件事，句末用句号。'),
      choice('punct-3', '选出一句正在提问的话。', ['我喜欢看书。', '你的书在哪里？', '这里有一本书。'], '你的书在哪里？', '看看哪句话想得到别人的回答。', '“你的书在哪里？”在询问地点，是一个问句。'),
    ],
  },
  {
    id: 'moon-poem', title: '月光里的悄悄话', subtitle: '走进古诗《静夜思》', category: '诗意星空', semester: '下册', scene: 'moon', minutes: 6, color: 'lavender',
    knowledgeIds: ['acee6212-c217-40e1-9953-791790d170f2'],
    story: '夜晚的诗歌灯塔亮起来了。和小书狐一起读古诗，听听月光里的思念。',
    intro: '《静夜思》 李白\n床前明月光，疑是地上霜。\n举头望明月，低头思故乡。',
    questions: [
      choice('poem-1', '“举头望明月”中，诗人抬头看见了什么？', ['明月', '小河', '树林'], '明月', '答案藏在“望”后面。', '诗人抬起头，望着明亮的月亮。', { illustration: 'moon' }),
      choice('poem-2', '“低头思故乡”中，诗人在思念什么？', ['故乡', '玩具', '花园'], '故乡', '再读一遍最后一句。', '“思”是思念，“故乡”是家乡。诗人在思念家乡。'),
      order('poem-3', '按刚才读到的顺序，排列最后两句。', ['低头思故乡', '举头望明月'], ['举头望明月', '低头思故乡'], '先抬头看月亮，再低头想家乡。', '“举头望明月，低头思故乡。”借着月亮，诗人表达了思乡之情。'),
    ],
  },
  {
    id: 'sentence-garden', title: '把发现说清楚', subtitle: '给句子添一点细节', category: '表达工坊', semester: '下册', scene: 'flower', minutes: 6, color: 'peach',
    knowledgeIds: ['09363c48-cbfa-4346-b418-83b46f466619'],
    story: '花园里发生了好多有趣的事。告诉小书狐谁在做什么，再加上你发现的细节。',
    intro: '“小鸭子游泳。”加上地点，可以说：“小鸭子在池塘里游泳。”细节让别人听得更明白。',
    questions: [
      choice('sentence-1', '“小鸭子在池塘里游泳。”这句话中，谁在游泳？', ['小鸭子', '池塘', '小鸟'], '小鸭子', '找一找句子里做事情的小动物。', '小鸭子是做事情的小动物，它在池塘里游泳。'),
      choice('sentence-2', '给“小鸟唱歌”加上地点，哪句话合适？', ['小鸟在树上唱歌。', '小鸟唱。', '树上。'], '小鸟在树上唱歌。', '句子里既要有“小鸟唱歌”，也要说清在哪里。', '“在树上”说明了地点，句子表达得更具体。'),
      order('sentence-3', '按“谁—在哪里—做什么”的顺序说一句话。', ['看书。', '小书狐', '在书屋里'], ['小书狐', '在书屋里', '看书。'], '先说谁，再说地点，最后说做什么。', '“小书狐在书屋里看书。”这句话说清了谁、在哪里、做什么。'),
    ],
  },
  ...additionalLessons,
  ...upperLessons,
];
const legacy = JSON.parse(JSON.stringify(originalLessons)).map((lesson, index) => ({ ...lesson, grade: 1, order: index + 1, version: 1, reward: 3 }));
const all = [...originalLessons, ...expandedLessons];
const checkpointIds = [];
const pinyinGroups = [ ['声母', 'b p m f d t n l g k h j q x zh ch sh r z c s y w'], ['韵母','a o e i u ü ai ei ui ao ou iu ie üe er an en in un ün ang eng ing ong'], ['整体认读音节','zhi chi shi ri zi ci si yi wu yu ye yue yuan yin yun ying'] ];
for (const [groupIndex, [label, text]] of pinyinGroups.entries()) {
  const tokens = text.split(' ');
  for (let start=0; start<tokens.length; start+=6) {
    const id = `listening-${groupIndex}-${start / 6 + 1}`;
    checkpointIds.push(id);
    all.push({ id, title: `${label}听音探险 ${start / 6 + 1}`, subtitle: `逐个辨认${label}，先听再选`, semester: '上册', category: '拼音乐园', scene: 'letters', color: 'lavender', minutes: 5, knowledgeIds: ['fc9633b4-1d3d-4743-ac5c-b5bdb52a1850'], story: '声音精灵藏起了名字。听完声音，找出对应的卡片。', intro: '本关不自动读出选项，先听示范，再观察卡片。需要时可以重听。声母采用呼读音示范。', practice: tokens.slice(start,start+6), questions: tokens.slice(start,start+6).map((token,index) => choice(`ear-${id}-${index+1}`, '听示范音，选出对应的拼音。', [token,tokens[(start+index+1)%tokens.length],tokens[(start+index+3)%tokens.length]],token,'先听声音，再观察卡片。',`示范音是 ${token}。`,{listen:token,audioOnly:true,skillLabel:`${label}：${token}`,skillId:`pinyin:${label}:${token}`})) });
  }
}
const alphabet = all.find((lesson)=>lesson.id==='alphabet');
const alphabetParts = [alphabet.id];
const alphabetQuestions = [...alphabet.questions];
alphabet.questions = alphabetQuestions.slice(0,7);
for(let index=1;index<4;index++) {
  const id = `alphabet-${index+1}`; alphabetParts.push(id);
  all.push({...alphabet,id,title:`大小写配对站 ${index+1}`,questions:alphabetQuestions.slice(index*7,(index+1)*7)});
}
const units = [...upperUnits.map((unit) => ({ ...unit, lessons: [...unit.lessons, ...(extraUpperUnits[unit.id] || []), ...(unit.id==='pinyin'?checkpointIds:[])] })), ...lowerUnits.map((unit)=>({...unit,lessons:unit.lessons.flatMap((id)=>id==='alphabet'?alphabetParts:[id])}))];
const extraQuestions = {
  sunrise: [choice('sun-4', '可以燃烧、给人带来热的“火”是哪个字？', ['火','水','日'], '火', '注意字形，读一读“火苗”。', '火苗的“火”是这个字。')],
  'body-characters': [choice('body-4', '我们用哪个部位说话？', ['口','手','足'], '口', '口可以表示嘴。', '口可以表示嘴，我们用嘴说话。'), choice('body-5', '拿铅笔常常用哪个部位？', ['手','耳','目'], '手', '手可以握住铅笔。', '手可以拿东西。')],
};
export const grade1Lessons = all.map((lesson) => {
  const unit = units.find((unit) => unit.lessons.includes(lesson.id));
  const termUnits = units.filter((unit) => unit.lessons.some((id) => all.find((l) => l.id === id)?.semester === lesson.semester));
  const unitIndex = termUnits.indexOf(unit);
  const position = termUnits.slice(0, unitIndex).reduce((sum, value) => sum + value.lessons.length, 0) + (unit?.lessons.indexOf(lesson.id) || 0) + 1;
  const questions = [...lesson.questions, ...(extraQuestions[lesson.id] || [])].map((question) => ({ ...question, skillId: question.skillId || question.id, skillLabel: question.skillLabel || question.prompt }));
  return { ...lesson, questions, activities: (lesson.activities || characterActivities[lesson.id] || []).flatMap((activity) => activity.kind === 'draw' ? activity.characters.map((character)=>({...activity,id:`${activity.id}-${character}`,title:`写一写：${character}`,prompt:`先观察，再在田字格中写“${character}”。笔顺请对照课本。`,characters:[character]})) : [activity]), ...(lesson.id === 'vowels' ? { practice: ['a','o','e','i','u','ü'] } : {}), unit: unit?.id, unitTitle: unit?.title, unitSubtitle: unit?.subtitle, grade: 1, order: (lesson.semester === '下册' ? 1000 : 0) + position, version: 2, reward: 3 };
}).sort((a,b) => a.order-b.order);

export const lessons = [...grade1Lessons,...primaryLessons];

/** @param {any} lesson @returns {any} */
export const publicLesson = ({ questions, ...lesson }) => ({ ...lesson, questionCount: questions.length });
export const publicQuestion = ({ answer, explanation, hint, skillId, skillLabel, ...question }, seed) => {
  const safe = question;
  return seed ? shuffledQuestion(safe, seed) : safe;
};
export const getLesson = (id, version) => characterLessons.find((lesson)=>lesson.id===id) || (version === 1 ? legacy.find((lesson) => lesson.id === id) || lessons.find((lesson) => lesson.id === id) : lessons.find((lesson) => lesson.id === id));
