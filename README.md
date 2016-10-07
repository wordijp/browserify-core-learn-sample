browserify-minimal-sample
=========================

# このプロジェクトについて

これは[Qiita記事](http://qiita.com/wordijp/items/f8949a7d122fd4610f3c)用の、Browserifyの内部処理の理解を深め、transformモジュール、plugin作成の手助けとなる事を目的とした学習用プロジェクトです。  
詳しい解説はQiita記事の方をお読みください。


# 自作のtransformモジュール、pluginについて

## node_modules/brainf_ckify

transformモジュールのサンプルです。  
brainf*ckのソースをトランスパイルします、AltJSと言えるのかは怪しいですが、まあ動いています。

## node_modules/file-count

pluginのサンプルです。  
ソースの数をカウントして表示します。


# 使い方

```sh
$ npm install

# 従来のbrowserifyを利用したbuild
$ npm run build

# browserifyを真似た自作のbuild
$ npm run node
```


# license

MIT
