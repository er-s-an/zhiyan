# UI/UX Pro Max Skill：安装、配置与实测

本项目按任务要求下载并配置了 [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)（v2.15.0），并用它生成了本项目的设计系统。下面记录安装位置、实际执行过的命令和结果。

## 安装

DSH 会从 `~/.dsh/skills` 发现并加载 skill：

```bash
git clone --depth 1 https://github.com/nextlevelbuilder/ui-ux-pro-max-skill.git /tmp/ui-ux-pro-max-skill
mkdir -p ~/.dsh/skills
cp -r /tmp/ui-ux-pro-max-skill/.claude/skills/ui-ux-pro-max ~/.dsh/skills/ui-ux-pro-max
```

安装后 skill 出现在本 session 的可用 skills 目录中，名称为 `ui-ux-pro-max`。脚本不依赖第三方 Python 包，`python3` 即可运行。

## 实测命令

### 1. 设计系统生成（完整跑通）

```bash
python3 ~/.dsh/skills/ui-ux-pro-max/scripts/search.py \
  "B2B research workspace product team knowledge dashboard" \
  --design-system -p "Zhiyan" --density 7 --variance 3 --motion 2 \
  -f markdown --persist --output-dir ~/Developer/zhiyan
```

输出：Pattern、Style、Colors、Typography、Effects、Motion、Anti-patterns、Pre-Delivery Checklist。
持久化到 `design-system/zhiyan/MASTER.md`。原始调色板是 Indigo/Emerald，项目按知乎官方蓝白主题覆盖为 `#0066FF`，并在 MASTER 文件顶部注明 brand override；其余结构、间距、可达性规则继续沿用。

### 2. Domain 搜索（完整跑通）

```bash
python3 ~/.dsh/skills/ui-ux-pro-max/scripts/search.py "SaaS dashboard data table professional blue" --domain typography -n 3
python3 ~/.dsh/skills/ui-ux-pro-max/scripts/search.py "SaaS dashboard data table professional blue" --domain color -n 3
python3 ~/.dsh/skills/ui-ux-pro-max/scripts/search.py "SaaS dashboard data table professional blue" --domain ux -n 3
```

用于确认工作台的信息密度、数据表在窄屏的处理、按钮和链接的对比度，以及中文界面的可读性。

### 3. Stack 指引（完整跑通）

```bash
python3 ~/.dsh/skills/ui-ux-pro-max/scripts/search.py "suspense streaming server components" --stack nextjs -n 3
```

输入返回 Next.js 16.2 的 Server Components / Suspense 指引。本项目在 `/workbench` 使用 `Suspense` 包裹读取 `useSearchParams` 的客户端组件，静态内容优先留在 Server Component（如 `/plan` 直接读取计划书文件）。

## 落到本项目的结果

- 设计令牌：知乎蓝 `#0066FF`、白色卡片、`#F4F6FB` 背景、语义化灰阶；无第二饱和色。
- 字体：系统中文字体栈，不加载 Google Fonts，避免国内首屏阻塞。
- 交互：所有可点击元素有 hover/focus 状态，过渡 150–250ms，遵守 `prefers-reduced-motion`。
- 布局：1440 / 1024 / 768 / 390 四档实测；移动端左侧导航收成顶部两行，tabbar 可横向滚动，列表/详情改为纵向。
- 可达性：正文对比度 ≥ 4.5:1，表单有可见 label，图标按钮有 `aria-label`，不使用 emoji 充当图标。
- 设计系统文件：`design-system/zhiyan/MASTER.md`。

## 备注

- Skill 只用于设计决策与检查，不参与运行时；仓库不依赖它构建。
- 搜索结果视为建议，不覆盖本项目的品牌约束（知乎蓝白、刘看山 IP、中文优先）。
