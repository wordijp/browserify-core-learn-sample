// nodejsによるbrowserifyのコア処理を模倣したサンプル
//
// transformプラグイン、プラグインの適用と、bundle処理だけの最小構成
// なお、CommonJS化はされてません

const through = require('through2');
const path = require('path');
const fs = require('fs');
const resolve = require('resolve');

const splicer = require('labeled-stream-splicer');

const EventEmitter = require('events').EventEmitter;
const inherits = require('inherits');
const Transform = require('readable-stream').Transform;
const readonly = require('read-only-stream');

const source = require('vinyl-source-stream');
const vfs = require('vinyl-fs');


// ---------------------
// ModuleDepsMinimal ---
// module-depsを模倣した最小構成

inherits(ModuleDepsMinimal, Transform);
function ModuleDepsMinimal() {
    if (!(this instanceof ModuleDepsMinimal)) return new ModuleDepsMinimal();
    Transform.call(this, { objectMode: true });

	this.transforms = [];
	this.rows = [];
}

// through.obj(function transform(row, enc, next) { ここの処理 });
ModuleDepsMinimal.prototype._transform = function (row, enc, next) {
	// streamに渡されたrowデータを種類分けする
	if (row.transform) {
		// transformプラグインの場合
		var r = require(row.transform);
		this.transforms.push(r);
	} else if (row.file) {
		// ソースファイルの場合
		this.rows.push(row);
	}
	next();
}

// through.obj(transform, function flush(done) { ここの処理 });
ModuleDepsMinimal.prototype._flush = function () {
	var self = this;

	var input = through(), output = through();
	var stream = input;

	var count = 0;
	this.rows
		.map(function (row) {
			var file = resolve.sync(row.file);

			// ファイルをstream化
			var stream = fs.createReadStream(file);
			// transformプラグインの適用
			self.transforms.forEach(function (tr) {
				stream = stream.pipe(tr(file));
			});
			return stream;
		})
		.forEach(function (stream) {
			stream.pipe(through.obj(
				function transform(row, enc, next) { self.push(row); next() },
				function flush(done) {
					// 完了チェック
					if (++count == self.rows.length) self.push(null); // 完了通知
					done();
				}
			));
		});
};


// ---------------------
// BrowserifyMinimal ---
// Browserifyを模倣した最小構成

inherits(BrowserifyMinimal, EventEmitter);

function BrowserifyMinimal() {
    if (!(this instanceof BrowserifyMinimal)) return new BrowserifyMinimal();

	// Streamパイプライン
	// ここに登録されているStream処理が、上から順次実行されていく
	// このパイプラインの改造も可能、改造は基本プラグインが行う
	this.pipeline = splicer.obj([
		// require('readable-stream').Transformの継承クラスインスタンスを渡しても良いし
		'deps', [ModuleDepsMinimal()],
		// through.objで直接作成しても良い
		// NOTE : through.objも内部でrequire('readable-stream').Transform継承クラスのインスタンスを返している
		'wrap', [through.obj()], // through.obj()はno-op
	]);
}
BrowserifyMinimal.prototype.plugin = function (p) {
	if (typeof p === 'function') {
		p(this);
	} else {
		var pfile = resolve.sync(p);
		var f = require(pfile);
		f(this);
	}
	return this;
}

// ------------
// main処理 ---

var bm = BrowserifyMinimal()
	.plugin('file-count');

// browserify.add()相当の処理
{
	// ここで指定されたfileが、depsでstreamとして読み込まれる
	var file = path.resolve('.'); // 最終的にpackage.jsonの'main'で指定されたファイルを取得する、ファイル直指定でもよい

	var row = {
//		entry: true,
//		expose: false,
//		basedir: undefined,
		file: file,
//		id: file,
//		order: 0,
	};
	bm.pipeline.write(row);
}

// browserify.transform()相当の処理
{
	// ここで指定したtransformプラグインが、depsで利用される
	//var opts = {};
	//opts._flags = {};
	var row = {
		transform: 'brainf_ckify',
		//options: opts,
		//global: undefined,
	};
	bm.pipeline.write(row);
}

// browserify.bundle()相当の処理
var output;
{
	output = readonly(bm.pipeline);
	bm.emit('bundle', output);
	bm.pipeline.end();
}

// bundleファイルとして出力
output
	.pipe(source('bundle-no-commonjs.js'))
	.pipe(vfs.dest('dist'));
