# 汉语拼音示范音频

来源：[davinfifield/mp3-chinese-pinyin-sound](https://github.com/davinfifield/mp3-chinese-pinyin-sound)

固定版本：aa25ecce7b7fb02757b2c2b8e3c01aa975812edc。

该仓库按 Unlicense 发布。许可原文见 [UNLICENSE.txt](./UNLICENSE.txt)。

## 使用方式

- syllables/ 保留来源中的 1,632 个音节录音，不依赖外部音频服务器。
- 单韵母 i、u、ü 分别使用 yi、wu、yu 的发音；部分韵母使用对应零声母音节的读音，例如 in/yin、ing/ying、ün/yun、ie/ye、üe/yue。
- 声母使用常见的呼读音示范，例如 b 使用 bo，拼读时应读得轻短。呼读音与声母本音不能混同。
- 来源没有独立的 o、eng、ong 文件，finals/ 为从 bo、deng、dong 中裁去声母起始段的韵母剪辑，共 12 段，附有淡入与短尾部留白。具体来源与剪辑起点见 derived-manifest.json；处理脚本为 scripts/prepare_pinyin_audio.py。
- 不通过英文字母 TTS 朗读拼音。缺少的发音会提示，不会自动改成英文读音或其他声调。

这些文件属于原型教学示范素材，尚未获得小学语文教师或普通话语音专家对全部音节、剪辑边界的逐项审核。尤其是声母本音与呼读音、后鼻韵母和声调曲线，应结合教师示范学习。音频不用于自动口语评分。

本项目的中文剧情和题目说明继续使用设备提供的中文语音。更换设备音色或语速，不改变拼音录音的发音与音高。
