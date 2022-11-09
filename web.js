//. web.js
var fs = require( 'fs' );
var Common = require( './common' );

//. マーメイドファイル
var filename = 'MERMAID' in process.env && process.env.MERMAID ? process.env.MERMAID : 'mermaid_sample.md';
//. ベースカテゴリー
var base = 'BASE' in process.env && process.env.BASE ? process.env.BASE : 'bootstrap';
//. 出力先
var out = 'web';

var common = new Common( filename, out );

//. フォルダ作成
common.mkdirIfNotExisted( out + '/public' );
common.mkdirIfNotExisted( out + '/public/js' );
common.mkdirIfNotExisted( out + '/public/css' );
common.mkdirIfNotExisted( out + '/public/img' );
common.mkdirIfNotExisted( out + '/views' );

var app = "//. app.js\n"
  + "var express = require( 'express' ),\n"
  + "  ejs = require( 'ejs' ),\n"
  + "  app = express();\n\n"
  + "app.use( express.Router() );\n"
  + "app.use( express.static( __dirname + '/public' ) );\n\n"
  + "app.set( 'views', __dirname + '/views' );\n"
  + "app.set( 'view engine', 'ejs' );\n\n";

var appname = common.getAppname( filename );
app += "var appname = '" + appname + "';\n\n";

for( var i = 0; i < common.nodes.length; i ++ ){
  var node = common.nodes[i];
  var path = null;
  for( var j = 0; j < common.arrows.length && !path; j ++ ){
    if( common.arrows[j].to == node.id ){
      path = common.arrows[j].name;
    }
  }

  //. 詳細ページの存在する一覧ページか？
  var is_list = false;
  if( path && path.endsWith( 's' ) ){
    var tmp = path.substr( 0, path.length - 1 ) + '/:id';
    for( var j = 0; j < common.arrows.length && !is_list; j ++ ){
      if( common.arrows[j].from == node.id && common.arrows[j].name == tmp ){
        is_list = true;
      } 
    }
  }

  //. 別ページへのリンクが存在しているか？
  var links = [];
  for( var j = 0; j < common.arrows.length; j ++ ){
    if( common.arrows[j].from == node.id ){
      if( ( ( path == '/' || !path.endsWith( 's' ) ) && common.arrows[j].from == common.nodes[i].id ) || ( path.endsWith( 's' ) && common.arrows[j].from == common.nodes[i].id && !common.nodes[i].id.startsWith( common.arrows[j].to ) ) ){
        var link_id = common.arrows[j].to;
        var link_name = link_id;
        for( var k = 0; k < common.nodes.length; k ++ ){
          if( common.nodes[k].id == link_id ){
            link_name = common.nodes[k].name;
          }
        }

        links.push( { id: link_id, path: common.arrows[j].name, name: link_name } );
      }
    }
  }

  //. app.js
  var route = common.generateRoute( path, node.name, links, is_list, appname );
  //console.log( route );
  app += route;

  //. ejs
  var view = common.generateView( path, is_list, base );
}

//. #11
var _samples = [ 
  { path: '_sample_login', title: 'ログイン' }, 
  { path: '_sample_parts', title: 'パーツ' }, 
  { path: '_sample_framework_parts', title: 'フレームワークパーツ' } 
];
for( var i = 0; i < _samples.length; i ++ ){
  app += "\napp.get( '/" + _samples[i].path + "', function( req, res ){\n"
    + '  res.render( "' + _samples[i].path + '", { _appname: "' + appname + '", _title: "' + _samples[i].title + '", _name: "' + _samples[i].path + '" } );\n'
    + "});\n\n";

  common.ignoreException( fs.copyFileSync( './templates/views/' + base + '/' + _samples[i].path + '.ejs', out + '/views/' + _samples[i].path + '.ejs' ) );
  common.ignoreException( fs.copyFileSync( './templates/js/template.js', out + '/public/js/' + _samples[i].path + '.js' ) );
  common.ignoreException( fs.copyFileSync( './templates/css/template.css', out + '/public/css/' + _samples[i].path + '.css' ) );
}


app += "\nvar port = process.env.PORT || 8080;\n"
  + "app.listen( port );\n"
  + "console.log( 'server starting on ' + port + ' ...' );\n\n";

common.ignoreException( fs.writeFileSync( out + '/app.js', app ) );

//. template.ejs
common.ignoreException( fs.copyFileSync( './templates/views/' + base + '/_header.ejs', out + '/views/header.ejs' ) );
common.ignoreException( fs.copyFileSync( './templates/views/' + base + '/_footer.ejs', out + '/views/footer.ejs' ) );
common.ignoreException( fs.copyFileSync( './templates/views/' + base + '/_navi.ejs', out + '/views/navi.ejs' ) );
common.ignoreException( fs.copyFileSync( './templates/views/' + base + '/_links.ejs', out + '/views/links.ejs' ) );

//. static files
common.ignoreException( fs.copyFileSync( './templates/js/_main.js', out + '/public/js/_main.js' ) );
common.ignoreException( fs.copyFileSync( './templates/js/_api.js', out + '/public/js/_api.js' ) );
common.ignoreException( fs.copyFileSync( './templates/css/_main.css', out + '/public/css/_main.css' ) );
common.ignoreException( fs.copyFileSync( './templates/img/icon.png', out + '/public/img/icon.png' ) );

//. web package
common.ignoreException( fs.copyFileSync( './templates/.gitignore', out + '/.gitignore' ) );
common.ignoreException( fs.copyFileSync( './templates/package.json.web', out + '/package.json' ) );
common.ignoreException( fs.copyFileSync( filename, out + '/README.md' ) );

