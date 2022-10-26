# mermaid

```mermaid
  graph TD;
      Login["ログイン"] --"/"--> Top["トップ"];
      Top --"/items"--> Items["アイテム一覧"];
      Items --"/item/:id"--> Item["アイテム詳細"];
      Top --"/users"--> Users["ユーザー一覧"];
      Users --"/user/:id"--> User["ユーザー詳細"];
      Top --"/about"--> About["サイト解説"];
      Top --"/login"--> Login;
```
