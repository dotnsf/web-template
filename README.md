# Web tepmplate


## Overview

**Bootstrap** ベースのウェブアプリケーション・テンプレート、および API サーバー・テンプレート


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

### Usage for web-app

- フローファイルを指定して web.js を実行
  - `$ MERMAID=mermaid_sample.md node web`
  - `web/` フォルダ内に `app.js`, `.gitignore`, `package.json`, `README.md`, `views/`, `public/` が作成される
    - `README.md` には元のマーメイドファイルの内容が含まれる

- app.js を実行
  - `$ cd web`
  - `$ npm install`
  - `$ npm start`

- ブラウザで実行
  - `http://localhost:8080/`

- 必要に応じて生成されたファイル（`app.js`, `/views/`, `/public/`）をカスタマイズ

- 一度生成したファイルをリセットして、生成前の状態に戻すには `$ npm run reset-web` を実行


### Usage for api

- フローファイルと `DATABASE_URL` を指定して api.js を実行
  - `$ MERMAID=mermaid_sample.md DATABASE_URL=postgres://user:pass@localhost:5432/db node api`
  - `api/` フォルダ内に `app.js`, `.gitignore`, `package.json`, `README.md`, `api/`, `public/` が作成される
    - `README.md` には元のマーメイドファイルの内容が含まれる

- app.js を実行
  - `$ cd api`
  - `$ npm install`
  - `$ npm start`

- ブラウザで実行
  - `http://localhost:8081/_doc`

- 必要に応じて生成されたファイル（`app.js`, `/api/db.js`, `/public/swagger.yaml`）をカスタマイズ

- 一度生成したファイルをリセットして、生成前の状態に戻すには `$ npm run reset-api` を実行


### Preview mermaid-file

- 付属のマーメイドビューワでマーメイドファイルをプレビューする

  - （`web-template` のフォルダをターミナルで開く）

  - `$ npm install`

  - `$ MERMAID=mermaid_sample.md node preview`

  - ブラウザで `http://localhost:8000` を開いてプレビューする


## Parameters

### Parameters for web-app

実行時に以下の**環境変数**を指定する：

- `MERMAID`: マーメイドファイル名（必須）

- `LIST_SIZE`: 一覧ページに表示するサンプル数（デフォルト＝5）

- `BASE`: EJS ファイルのベースとなる CSS テンプレート（`base`, `bootstrap`, `carbon`, `material` のいずれかを選択。デフォルト＝`bootstrap`）


また、**生成されたアプリケーションの実行時**に以下の**環境変数**を指定する：

- `PORT`: ウェブアプリケーションの待ち受けポート番号（デフォルト＝8080）


### Parameters for api

実行時に以下の**環境変数**を指定する：

- `MERMAID`: マーメイドファイル名（必須）

- `DATABASE_URL`: データベース URL（デフォルト＝''(メモリDB)）


また、**生成されたアプリケーションの実行時**に以下の**環境変数**を指定する：

- `PORT`: API アプリケーションの待ち受けポート番号（デフォルト＝8081）


## Customize

以下の手順でテンプレートをカスタマイズし、自分でデザインできる。以下、`bootstrap` テンプレートをベースに `mytemplate` という名前でカスタマイズする例を紹介する：

- `./templates/views/` 以下のフォルダをコピーする：

  - `$ cd templates/views`

  - `$ cp -r bootstrap/ mytemplate/`

- `./templates/js/_main.js` をコピーする：

  - `$ cd ../js`

  - `$ cp _main.js _mytemplate.js`

- `./templates/css/_main.css` をコピーする：

  - `$ cd ../css`

  - `$ cp _main.css _mytemplate.css`

  - `$ cd ../..`

- コピーしたファイルをカスタマイズする。ファイルの主な用途は以下の通り：

  - `./templates/js/_mytemplate.js`
  
    - 全ページから参照される JavaScript ファイル

  - `./templates/css/_mytemplate.css`
  
    - 全ページから参照される CSS ファイル。全ページで使う CSS を定義する

  - `./templates/views/mytemplate/`
  
    - BootStrap ベースの Web テンプレート(EJS)

    - それぞれのファイルの要素は以下の通り：

      - `_detail.ejs` : （一覧ページで１件クリックした時の）詳細ページ

      - `_else.ejs` : トップページ、一覧ページ、詳細ページのいずれでもないページ

      - `_footer.ejs` : 共通フッター。Google Analytics を使う場合はここに記載するのがよい

      - `_header.ejs` : 共通ヘッダー。UI はなく、共通で読み込むライブラリをここに記載する。またこのファイル内の `_main..js`, `_main.css` をそれぞれ `_mytemplate.js`, `_mytemplate.css` に書き換えておく

      - `_index.ejs` : トップページ

      - `_links.ejs` : あるページから別のページへのリンクがある場合、その各ページへのリンクボタンを表示する EJS

      - `_list.ejs` : （詳細ページの遷移元となる）一覧ページ

      - `_navi.ejs` : 共通ナビゲーション部分の EJS

      - `_mytemplate.js` : _header.ejs から全ページ向けに読み込まれる JavaScript ファイル

      - `_mytemplate.css` : _header.ejs から全ページ向けに読み込まれる CSS ファイル

- カスタマイズ後に以下を（`BASE` に `mytemplate` を指定して）実行する：

  - `$ MERMAID=mermaid_sample.md BASE=mytemplate node web`

  - `$ cd web`

  - `$ npm install`

  - `$ npm start`

  - :


## Licensing

This code is licensed under MIT.


## Copyright

2022 K.Kimura @ Juge.Me all rights reserved.

