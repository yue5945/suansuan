# 算算 · 六爻占卜（安卓版）

由 Windows 桌面程序「六爻0519.py」完整移植：登录授权、随机起卦、六十四卦排盘（六亲/六神/世应/纳甲）、DeepSeek AI 解卦（问道/易康双模式）、历史记录、卦象备注、随喜入口。

本教程手把手教你：**不用安装任何开发软件**，通过 GitHub 云端构建出 APK 安装包。全程约 10 分钟。

---

## 第一步：注册 GitHub 账号（已有账号可跳过）

1. 打开 https://github.com ，点右上角 **Sign up**
2. 依次填写：邮箱（QQ/163/Outlook 均可）→ 密码 → 用户名（英文或数字）
3. 完成人机验证，点 **Create account**
4. 去邮箱收 6 位验证码填入，后面的问题页面可随意选或跳过

## 第二步：新建仓库

1. 登录后点右上角 **+** → **New repository**
2. **Repository name** 填：`suansuan`
3. 保持 **Public**（私有仓库也可以）
4. 不要勾选「Add a README」
5. 点 **Create repository**

## 第三步：上传代码

1. 在仓库页面，点 **Add file** → **Upload files**（或点「uploading an existing file」链接）
2. 打开你电脑上的 `suansuan` 文件夹，**进入文件夹内部**，全选里面所有内容（`web`、`android`、`.github`、`tools`、`README.md` 等），**整体拖进网页的虚线框**
   - ⚠️ 注意：`.github` 文件夹必须一起上传，它里面是自动构建脚本
   - 如果浏览器拖不进去 `.github`，看文末「常见问题 3」
3. 等全部文件上传完，点页面底部绿色按钮 **Commit changes**

## 第四步：云端构建 APK

1. 点仓库顶部的 **Actions** 标签
2. 第一次使用会看到提示页，点 **I understand my workflows, go ahead and enable them**
3. 左侧点 **Build APK**，右侧出现 **Run workflow** 下拉按钮，点它 → 再点绿色 **Run workflow**
4. 等 3~8 分钟，刷新页面，看到绿色 ✓ 表示构建成功

## 第五步：下载 APK

1. 点进那条绿色 ✓ 的构建记录
2. 页面下方 **Artifacts** 区域，点 **suansuan-apk** 下载（是一个 zip 压缩包）
3. 解压，里面就是 `app-debug.apk`

## 第六步：安装到手机

1. 把 APK 传到手机（微信文件传输、QQ、数据线、邮箱均可）
2. 手机上点开 APK，按提示**允许「安装未知来源应用」**
3. 安装完成，桌面出现太极鱼图标的「**算算**」

---

## 使用说明

| 功能 | 入口 |
|---|---|
| 登录 | 预置账号 `0` / 密码 `0`（有效期至 2026/12/31）；或 11 位手机号 + 该手机号对应的 6 位动态密码（与 Windows 版算法一致） |
| 起卦 | 首页选模式（问道/易康）→ 写所占之事 → 开始起卦 |
| AI 解卦 | 卦象页点「AI 解卦」；Key 在「设置」页管理，已预填 |
| 授权管理 | 设置页 → 输入管理密码（默认 `admin123`）→ 可增删用户、改有效期、改管理密码 |
| 历史/备注 | 底部导航栏 |

## 常见问题

**1. 构建失败（红色 ✗）怎么办？**
点进失败的记录 → 点「Build APK」步骤看报错日志。多数是网络抖动，重新 **Run workflow** 一次即可。

**2. 以后改了网页代码，怎么重新出 APK？**
在仓库里上传新文件覆盖（或网页上直接编辑），然后到 Actions 再点一次 **Run workflow**。

**3. `.github` 文件夹传不上去？**
在仓库页面点 **Add file → Create new file**，文件名填：
```
.github/workflows/build.yml
```
然后把本项目 `.github/workflows/build.yml` 的全部内容粘贴进去，点 **Commit changes**。

**4. AI 解卦提示 Key 无效？**
打开 App → 设置 → DeepSeek API，填入有效的 Key 保存即可，无需重新打包。

**5. 想换 App 名字或图标？**
名字在 `android/app/src/main/res/values/strings.xml`；图标重新运行 `tools/gen_icon.py` 生成后重新上传构建。

---

## 项目结构

```
suansuan/
├── web/                  # 网页应用本体（全部功能）
│   ├── index.html
│   ├── css/style.css
│   └── js/               # data(卦数据库) lunar(农历) core(排盘) auth(登录授权) api(AI) app(界面)
├── android/              # 安卓 WebView 壳（构建时自动把 web/ 打进 assets）
├── .github/workflows/    # 云端自动构建脚本
├── tools/                # 数据提取 / 图标生成 / 夹具生成脚本
└── test/                 # 对拍测试（与源程序输出逐项比对）
```
