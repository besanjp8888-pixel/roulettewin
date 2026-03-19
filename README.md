# 歐洲輪盤間隔預測工具

這是一個手機優先的靜態 Web App，可直接部署到 GitHub Pages。

## 功能
- 手動輸入歷史開出號碼（0~36）
- 批量貼上歷史號碼
- 自動計算相鄰期數的順向 / 逆向間隔
- 依歷史間隔推算下一期可能會開與預測不會開的號碼
- 自動保存到瀏覽器 localStorage

## 檔案
- `index.html`
- `style.css`
- `script.js`
- `.nojekyll`

## 本機使用
直接用瀏覽器打開 `index.html` 即可。

## GitHub Pages
把整個資料夾內容推到 GitHub repository 後，在 Settings > Pages 設定從 `main` branch 的 `/root` 發佈即可。
