# Web tepmplate Bootstrap


## Overview

**Bootstrap** ベースのウェブアプリケーション・テンプレート


## Usage

- **マーメイド記法** で記述されたフローファイル（サンプル: mermaid_sample.md）を用意する


```
```mermaid_sample.md

# mermaid

  graph TD;

      Login["ログイン"] --"/"--> Top["トップ"];
      
      Top --"/items"--> Items["アイテム一覧"];

      Items --"/item/:id"--> Item["アイテム詳細"];

      Top --"/users"--> Users["ユーザー一覧"];

      Users --"/user/:id"--> User["ユーザー詳細"];

      Top --"/about"--> About["サイト解説"];

      Top --"/login"--> Login;

```

- フローファイルを指定して main.js を実行
  - `$ MERMAID=mermaid.md node main`
  - `app.js`, `views/`, `public/` が作成される

- app.js を実行
  - `$ npm install`
  - `$ npm start`

- ブラウザで実行
  - `http://localhost:8080/`

- 必要に応じて生成されたファイル（`app.js`, `/views/`, `/public/`）をカスタマイズ


## Licensing

This code is licensed under MIT.


## Copyright

2022 K.Kimura @ Juge.Me all rights reserved.

