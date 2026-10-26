# 第三方来源与许可

本项目自行编写的应用代码和文档按 [MIT License](LICENSE) 发布。下列第三方内容分别遵循其原有许可；代码开源不改变数据和素材的使用条件。

## 1. 小学语文知识点数据

- 来源：[mmlong818/k12-knowledge-points](https://github.com/mmlong818/k12-knowledge-points)
- 上游原文件：`split/小学/语文.json`。
- 派生文件：`data/primary-knowledge.json`、`data/grade1-knowledge.json`，以及保留其文字或来源条目的导出清单和审查报告。
- 上游声明：[PolyForm Noncommercial 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0)。
- 保留 ID、原始目标、教材出处、导入文件哈希和核对状态；分类、年级筛选及课程目标关联由本项目添加。

Required Notice: Copyright © 2026 猫叔 (https://github.com/mmlong818/k12-knowledge-points)

随仓库提供该数据供符合上游条款的非商业学习、研究和分发使用。使用随附数据进行商业活动，需要另行取得相应授权。MIT 许可不覆盖这些数据。完整追溯说明见 [data/ATTRIBUTION.md](data/ATTRIBUTION.md)。

## 2. 拼音音频

- 来源：[davinfifield/mp3-chinese-pinyin-sound](https://github.com/davinfifield/mp3-chinese-pinyin-sound)。
- 固定版本：`aa25ecce7b7fb02757b2c2b8e3c01aa975812edc`。
- 文件：`public/audio/pinyin/syllables/`、`public/audio/pinyin/finals/`。
- 上游许可：[Unlicense 原文](public/audio/pinyin/UNLICENSE.txt)。
- 韵母剪辑来源与处理见 [音频说明](public/audio/pinyin/ATTRIBUTION.md) 和 `derived-manifest.json`。

## 3. 一年级字表与古诗文

`data/grade1-characters.json` 根据教材附录整理汉字、读音、认读/会写标记、页码及出处，保留教材来源说明。现代教材及其编排的权利归相关权利人所有，本项目未复制完整现代课文，也不对教材内容授予 MIT 许可。实际教学请以学校使用的教材版次为准。

自编故事、题目、提示及解释见 `server/`；所用古诗文保留篇名和作者。上游抽取数据中的内容仍按其来源和许可处理。

## 4. 软件依赖

React、Vite、Express、sql.js、Zod、lucide-react、pinyin-pro 等依赖保留各自的版权与许可，安装后可在对应 npm 包内查看。版本锁定于 `package-lock.json`。浏览器使用的汉字转拼音功能另保留 [pinyin-pro 许可](public/pinyin-pro-LICENSE.txt)。

## 5. 项目插画与截图

小书狐、森林及拼音卡片封面由项目内 SVG 代码绘制。README 和使用说明的截图来自项目演示界面，不包含真实学习者资料。截图中出现的课程与数据仍遵循上面的相应来源说明。
