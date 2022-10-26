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

  - 一行を `A["nameA"] --"path"--> B["nameB"]` のフォーマットで記述する（原則これ以外の行は無視）
    - `A`, `B`: ノードの ID
    - `nameA`, `nameB`: ノードの名称（ページのタイトル）、省略した場合は ID
    - `path`: （B ノードへ行くための）パス、必須
  - `一覧ページ` と `詳細ページ` からなるページが存在する場合（例えば`ユーザー一覧ページ`と`ユーザー詳細ページ`が存在する場合）、`path` には以下のようなルールをつけて作成する必要がある点に注意
    - 一覧は英語の「複数形」、詳細は「単数形/:id」
      - 例えば `/users` と `/user/:id`
        - 詳細の `:id` 部分はそのカテゴリの ID(ユーザーID)
      - 複数形は厳密な形式にはせず、単数形に **s** をつける
        - 例えば `/category/:id` の詳細ページは `/categories` ではなく `/categorys`
  - 全てのノードに向かうパスが必要
    - 例えば上の例だと、ノードの一覧という意味では最下行は不要（Top も Login も登場済み）
    - でも Login へ向かうパスがないため Login ページを表示するためのパスが未定義。そのため最下行を追加する必要がある

- フローファイルを指定して main.js を実行
  - `$ MERMAID=mermaid_sample.md node main`
  - `app.js`, `views/`, `public/` が作成される
    - `.gitignore`, `package.json`, `README.md` は生成済み

- app.js を実行
  - `$ npm install`
  - `$ npm start`

- ブラウザで実行
  - `http://localhost:8080/`

- 必要に応じて生成されたファイル（`app.js`, `/views/`, `/public/`）をカスタマイズ

- 一度生成したファイルをリセットして、生成前の状態に戻すには `$ npm run reset` を実行


## Licensing

This code is licensed under MIT.


## Copyright

2022 K.Kimura @ Juge.Me all rights reserved.

