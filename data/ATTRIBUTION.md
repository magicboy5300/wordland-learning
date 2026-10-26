# 数据来源与使用范围

一年级知识点来源：[mmlong818/k12-knowledge-points](https://github.com/mmlong818/k12-knowledge-points)，原文件 `split/小学/语文.json`。

Required Notice: Copyright © 2026 猫叔 (https://github.com/mmlong818/k12-knowledge-points)

上游声明许可：[PolyForm Noncommercial 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0)。本项目导入数据按非商业学习用途提供；该声明不构成上游商业授权。本项目代码的 MIT 许可不覆盖这些上游数据。

`grade1-knowledge.json` 为按一年级及来源教材筛选后的派生数据，保留原始 ID、目标和教材路径，增加分类及核对状态；不是经校对的完整一年级教学大纲。记录含新旧教材版本和相近知识点。置信度是抽取指标，不能作为正确率。

`server/lessons.js`、`server/additional-lessons.js` 与 `server/review-bank.js` 中剧情、练习、提示和解释由本项目单独编写，引用知识点 ID 用于来源追溯，不复制完整现代课文。古诗引用使用已进入公有领域的作品。现阶段题目仍应由语文教学人员复审后用于正式教学。

重新导入：下载原文件后运行 `npm run import:grade1 -- --source /绝对路径/语文.json`。导入脚本记录原始文件 SHA-256。

## 2026-10-23 小学全年级扩展

`primary-knowledge.json` 从同一上游 `split/小学/语文.json` 规范化导入，共 4,851 个唯一来源条目和 2,889 条内部关系。按年级出现次数分别为：一年级940、二年级855、三年级908、四年级732、五年级736、六年级700；多教材条目可能跨年级出现，不能将这些数相加作为唯一条目数。

原文件 SHA-256、导入日期、教材版本、学期、多年级标签、原始目标及警告均保留。课程来源关联是能力目标匹配，题目和短文另行编写，不表示对原始抽取目标的教师审定或对某一版教材的全部覆盖。

原创课程见 `server/curriculum/`；公版古诗文保留篇名和作者。现代教材课文全文未复制进新增课程。上游版权和 PolyForm Noncommercial 1.0.0 声明继续适用。
