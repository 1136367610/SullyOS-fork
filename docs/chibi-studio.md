# QQ捏人工坊（神经链接 · 手办柜）

## 3D 家园形象与用户手办柜

角色手办柜增加「3D 家园形象」入口，保存在 `char.chibiStudio.home3D`（完整基础 state、预览 img、hair 3D 参数、updatedAt）；原三处一键同步保留此独立槽，不覆盖家园搭配。用户「个人档案 → 我的手办柜」管理自己的 Chibi 与 3D 形象：Chibi 沿用 `userProfile.vrState.chibi`，不会因捏人自动登录彼方；家园形象在 `userProfile.chibiStudio.home3D`。

`HomeFigureStudio` / `HomeFigureEditor` 复用基础捏人器和已有 `HairEditor`（脸、发、衣橱、体型、撤销/重做），已有基础形象可作为底稿，必须显式保存一份家园形象。取消不改正式形象；3D 参数不读写实验页全局草稿。角色和用户使用独立基础草稿键。基础合成图仅作展示柜缩略预览，3D 编辑器展示实时模型。

正式拜访通过 `Home3DSetupEntry` 执行：定义家园 → 双方家园形象 → 日程位置检查。`Home3DView` 优先读家园槽及其 hair；邀请居民也读取其独立外观参数。当前动作面板仍统一全场素体，切换素体仅临时预览，不覆写手办柜。完整备份递归保存这些数据；角色卡仍剥离整个 chibiStudio。

统一管理一只角色在三处的 Q 版形象：**小小窝**房间立绘、**彼方**chibi、**特别时光** 520 大头贴。每处可以单独捏（互不影响），也可以挑一处形象「同步到全部」。入口在 神经链接 → 角色详情 → **「手办」tab**（独立分区：迷你三格展示柜预览 `ChibiShelfPanel` + 「进入手办柜」按钮），全屏工坊 UI 走手办展示柜风（三层展台 + 射灯 + 底座）。

## 三处形象的落库位置（工坊不新增渲染路径）

| 槽位 | 消费方 | 图片存放 | 格式 |
|------|--------|----------|------|
| `room` | 小小窝 RoomApp（房间立绘） | `char.sprites['chibi']` | **blobref 令牌**（与上传路径一致，`putImageBlob`） |
| `vr` | 彼方 VRWorldApp | `char.vrState.chibi.img`（scale/offsetY/flip 保留不动） | dataURL |
| `like520` | 特别时光 520 活动 | 已通关：`char.specialMomentRecords['like520_2026'].customData.charChibi`；未通关：`char.chibiStudio.like520.img` 兜底 | dataURL |

> ⚠️ `char.sprites` 是混装袋：`chibi`（blobref 令牌）与见面情绪立绘同居一个对象。任何「从 sprites 里随便挑一张当立绘」的兜底都必须跳过 `chibi` 键和 blobref 值（不能直接当 `<img src>`），统一走 `utils/dateSprites.ts` 的 `pickDateFallbackSprite`——否则会复现「没传见面立绘的角色，捏完 Q 版后见面模式裂图」。

捏人器完整导出 state（选件 + 换色 + 翻转 + 眼型…）按槽位存 `char.chibiStudio.{room,vr,like520}.state`（`types.ts` 的 `ChibiStudioData`），再编辑时整套还原。`chibiStudio` 属运行时本地状态，已加入 `CARD_STRIPPED_FIELDS`（角色卡导出/导入双向剥离）。

## 关键文件

- `components/character/ChibiStudio.tsx` — 工坊本体（展示柜 + 单槽编辑 + 一键同步）。
- `apps/Character.tsx` — 入口按钮 + 全屏覆盖层。**注意**：详情页 `formData` 是整体 auto-save 的副本，工坊直接写库后，关闭回调里必须把最新角色数据 `setFormData` 拉回来，否则后续编辑会用旧副本盖掉工坊成果（新增外部写库的面板都要防这个）。
- `public/like520/character_creator.html` — 捏人器 iframe。`like520_init` 新增 `savedState` 字段：**草稿 > savedState > presets**（presets 只有 `selected`，savedState 连换色/翻转一起还原，见 `applyFullState`）。
- `components/Like520Event.tsx` — `CreatorIframe` 新增 `savedState` prop 透传；`isSullyChar`/`sullyPresets` 改为导出；520 活动 fresh 模式的角色捏人器会带上 `char.chibiStudio.like520.state`（工坊里捏好的造型开场直接穿上）。
- `apps/VRWorldApp.tsx` — 彼方两个 chibi 编辑器也改传 `savedState`（原来 presets 只回填选件，丢换色）。

## 安全区（iOS 顶/底约束）

全屏工坊浮层遵循项目单一来源（`index.html :root`）约定，见 `ChibiStudio.tsx` 顶部常量：

- 顶栏 `STUDIO_TOP = var(--chrome-top)`——安全区 + SullyOS 状态栏；状态栏隐藏（iOS 全屏 PWA 默认）时自动塌回 `--safe-top`。**不能只用 `--safe-top`**，否则状态栏显示时顶栏会怼进时钟/电量条。
- 底部 `--safe-bottom`（带 JS 探测兜底，iOS 全屏 PWA 原生 `env(safe-area-inset-bottom)` 偶发返回 0，别直接用它）+ 手势余量。展示柜滚动区 `STUDIO_BOTTOM`、同步弹层 `STUDIO_SHEET_BOTTOM`。

迷你预览 `ChibiShelfPanel` 渲染在角色详情 tab 内（非全屏浮层），安全区由神经链接（自理名单，见 `utils/safeAreaApps.ts`）统一处理，组件本身不再单独让位。

## 随「设置 → 导出」往返

`chibiStudio` 是 `CharacterProfile` 上的普通字段，随 `characters` store 走**整合导出（full）/ 纯文字（text_only）**。导出/导入的图片抽取（`extractImagesInPlace`）与还原（`restoreAssetsInPlace`）都是**全字段递归、无白名单**，所以：

- `chibiStudio.like520.img`（兜底大头贴 dataURL）、`vrState.chibi.img`、`specialMomentRecords…charChibi.dataUrl` 三处 dataURL 会被抽进 zip `assets/*`、导入时原样还原；
- `sprites.chibi`（blobref 令牌）原样进 JSON，二进制随 zip 的 `blobs/<id>` 旁路走、导入按原 id 写回（收集免名单，见 `utils/backupBlobs.ts`）；
- `chibiStudio.*.state`（选件 JSON，无图）随文字走，`text_only` 模式下图片被剥、但 state 仍在（可再编辑），与全局图片剥离行为一致。

**媒体与美化素材（media_only）**模式的角色只导出一份手挑的视觉子集（avatar/sprites/roomItems/backgrounds…），不含 `chibiStudio`/`vrState`/`specialMomentRecords`——与这些运行时字段既有的处理一致，官方也提示「别只导媒体包」。回归测试见 `utils/backupExport.test.ts`「角色的 chibiStudio / vrState.chibi / 520 记录里的图都会被递归抽取」。

角色**卡**分享（单角色导出）则会剥掉 `chibiStudio`（已在 `CARD_STRIPPED_FIELDS`），与 `vrState`/`specialMomentRecords` 同属运行时本地状态，不随卡外传。

## 草稿与 savedState 的关系

捏人器 iframe 用 `localStorage` 存未确认草稿（key 按 `draftKey` 隔离；工坊用 `studio_${charId}_${slot}`）。草稿优先于 savedState——用户上次捏一半退出，再进来先恢复 WIP；确认导出后草稿内容与已存 state 一致，行为无感。

家园捏人首屏直接展示 Chibi / 3D 体型，旁边说明家园内全员跟随房主体型。预览画布支持鼠标或单指水平拖动旋转，下方选项区域保留独立滚动；手机隐藏原生滚动条，桌面使用细滚动条。Sully 的家园入口沿用 `isSullyChar` 判断，向基础捏人器传递专属标识与初始预设，并提供仅替换前发、后发的「Sully 专属发型」快捷按钮（保留其它形象设置）。

家园捏人前先选择底稿：角色可选小小窝、彼方、特别时光中有完整 state 的形象，用户可选自己的 Chibi；也可继续当前家园形象或从头捏。来源只在显式保存时写入家园槽，不修改原手办。每次选择使用独立草稿键，避免旧草稿覆盖刚选的底稿。Sully 眼睛入口使用原画 `eyes_99`；`face.useBaseEyes` 保留专属完整眼睛，嘴型仍可独立调整，选择通用眼睛部件后切回可拆分捏脸。

自绘素材也直接出现在家园 3D 编辑器：`CustomPartChoices` 将 `loadCreatorPartsForRender()` 读取的用户素材按类目放入头发、眼睛、嘴巴、面饰；面饰中的 `facemark` / `decor` 保留多选开关。选择后经原基础捏人器桥重新合成，保留换色、翻转等状态；重建期间禁用保存。`useBaseEyes` / `useBaseMouth` 分别保留完整原画五官，通用眼型或嘴型选择可以切回拆分素材。现有导入格式没有独立眉毛类目，整套眼睛里的眉毛随眼睛保留。

Sully 眼型现直接列在「脸部 → 眼睛 → 眼型款式」缩略图网格首项，所有 3D 捏脸入口共用，不依赖家园外层按钮。`face.eyeArtwork='sully'` 直接加载原画，随 3D 参数保存/撤销；选择 01—07 或自绘眼睛时清除该选项。

捏人界面图片优先：套装并入衣橱一级分类，使用所含服装的真实缩略图组合展示；内置发型、Sully 发型、自绘素材平级展示。眼型和嘴型的自绘款与内置款处于同一网格，不另设优先级按钮。图格统一选中勾，保留短名称和无障碍标签。发色/发片参数、配色、版型、叠穿默认折叠；移除 SECTION 标号及选项前重复说明。预览只保留图标工具，试衣动作按需展开；眼部整体调整移回选项区。换基础部件保留当前分类，并与 3D 参数一起进入撤销/重做快照。

换装准备支持 AbortSignal：快速切换或卸载时取消旧任务，模型加载后及各服装/计算阶段让出浏览器主线程并检查取消；取消任务释放准备资源且不动正在显示的衣服。预览检测到单次动态叠穿处理超过 16ms 时暂停动作，保留旋转与换装，避免逐帧重算阻塞整个界面。可重新播放；切换衣服重新评估。回归见 `wardrobeSwap.test.ts`，重负载预览 `home-figure.html?sully=1&stress=1`。

2026-10-04 — 脸部→面饰按面纹/配饰展开素材网格，独立衣橱页补齐7款面纹与17款配饰，正式形象编辑器继续含本机自定义素材。支持多选/取下，每组高低、左右、大小、旋转与重置，数值保存在hair.layers.facemark/decor；面部图层合成时应用变换，身体配饰不随脸部整体偏移。独立页部件选择接入原CreatorRollBridge及撤销/重做，保存基础选件，调整跟随3D参数保存。
