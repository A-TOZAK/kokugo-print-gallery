# 国語プリント集

小学生向け国語プリントを学年・カテゴリ・問題/解答で絞り込み、ブラウザ上でPDFプレビューできる静的サイトです。

## 構成

- `index.html`: ページ本体
- `styles.css`: 画面デザイン
- `app.js`: 検索、フィルタ、PDFプレビュー
- `public/prints/`: 公開するPDF
- `public/prints.json`: PDF一覧データ

## ローカル確認

```sh
python3 -m http.server 8000
```

ブラウザで `http://localhost:8000` を開きます。

## 公開

GitHub Pages では、リポジトリの Settings > Pages から `main` ブランチの `/root` を公開元に設定します。
