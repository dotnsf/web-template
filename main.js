//. main.js
var fs = require( 'fs' );

//. 環境変数
var LIST_SIZE = 'LIST_SIZE' in process.env && process.env.LIST_SIZE ? parseInt( process.env.LIST_SIZE ) : 5;
var filename = 'MERMAID' in process.env && process.env.MERMAID ? process.env.MERMAID : 'mermaid_sample.md';
var base = 'BASE' in process.env && process.env.BASE ? process.env.BASE : 'bootstrap';
var web = 'web';

//. フォルダ作成
mkdirIfNotExisted( web + '/public' );
mkdirIfNotExisted( web + '/public/js' );
mkdirIfNotExisted( web + '/public/css' );
mkdirIfNotExisted( web + '/public/img' );
mkdirIfNotExisted( web + '/views' );

//. マーメイド定義ファイル読み取り
var lines = fs.readFileSync( filename, 'UTF-8' );
lines = lines.split( "\n" );

var nodes = [];   //. { id: 'A', name: 'トップページ' }
var arrows = [];  //. { name: '/items', from: 'A', to: 'B' }
for( var i = 0; i < lines.length; i ++ ){
  lines[i] = lines[i].trim();
  if( lines[i].endsWith( ';' ) ){
    lines[i] = lines[i].substring( 0, lines[i].length - 1 );
  }

  var n1 = lines[i].indexOf( '--"' );
  var n2 = lines[i].indexOf( '"-->' );
  if( n1 > -1 && n2 > n1 ){
    var tmp1 = lines[i].substring( 0, n1 ).trim();
    var tmp2 = lines[i].substring( n1 + 3, n2 ).trim();
    var tmp3 = lines[i].substring( n2 + 4 ).trim();

    //. id["name"] (from)
    var from_id = tmp1;
    var from_name = '';
    n1 = tmp1.indexOf( '["' );
    n2 = tmp1.indexOf( '"]' );
    if( n1 > -1 && n2 > n1 + 2 ){
      from_id = tmp1.substring( 0, n1 );
      from_name = tmp1.substring( n1 + 2, n2 );
    }
    if( !registeredId( nodes, from_id ) ){
      nodes.push( { id: from_id, name: from_name } );
    }

    //. id["name"] (to)
    var to_id = tmp3;
    var to_name = '';
    n1 = tmp3.indexOf( '["' );
    n2 = tmp3.indexOf( '"]' );
    if( n1 > -1 && n2 > n1 + 2 ){
      to_id = tmp3.substring( 0, n1 );
      to_name = tmp3.substring( n1 + 2, n2 );
    }
    if( !registeredId( nodes, to_id ) ){
      nodes.push( { id: to_id, name: to_name } );
    }

    //. --"name"-->
    var name = tmp2;
    arrows.push( { name: name, from: from_id, to: to_id } );
  }
}

//console.log( nodes );
//console.log( arrows );

var app = "//. app.js\n"
  + "var express = require( 'express' ),\n"
  + "  ejs = require( 'ejs' ),\n"
  + "  app = express();\n\n"
  + "app.use( express.Router() );\n"
  + "app.use( express.static( __dirname + '/public' ) );\n\n"
  + "app.set( 'views', __dirname + '/views' );\n"
  + "app.set( 'view engine', 'ejs' );\n\n";

var appname = filename;
var tmp = filename.lastIndexOf( '.' );
if( tmp > 0 ){
  appname = filename.substr( 0, tmp );
}
app += "var appname = '" + appname + "';\n\n";

for( var i = 0; i < nodes.length; i ++ ){
  var node = nodes[i];
  var path = null;
  for( var j = 0; j < arrows.length && !path; j ++ ){
    if( arrows[j].to == node.id ){
      path = arrows[j].name;
    }
  }

  //. 詳細ページの存在する一覧ページか？
  var is_list = false;
  if( path && path.endsWith( 's' ) ){
    var tmp = path.substr( 0, path.length - 1 ) + '/:id';
    for( var j = 0; j < arrows.length && !is_list; j ++ ){
      if( arrows[j].from == node.id && arrows[j].name == tmp ){
        is_list = true;
      } 
    }
  }

  //. 別ページへのリンクが存在しているか？
  var links = [];
  for( var j = 0; j < arrows.length; j ++ ){
    if( arrows[j].from == node.id ){
      if( ( ( path == '/' || !path.endsWith( 's' ) ) && arrows[j].from == nodes[i].id ) || ( path.endsWith( 's' ) && arrows[j].from == nodes[i].id && !nodes[i].id.startsWith( arrows[j].to ) ) ){
        var link_id = arrows[j].to;
        var link_name = link_id;
        for( var k = 0; k < nodes.length; k ++ ){
          if( nodes[k].id == link_id ){
            link_name = nodes[k].name;
          }
        }

        links.push( { id: link_id, path: arrows[j].name, name: link_name } );
      }
    }
  }

  //. app.js
  var route = generateRoute( path, node.name, links, is_list, appname );
  //console.log( route );
  app += route;

  //. ejs
  var view = generateView( path, is_list );
}

app += "\nvar port = process.env.PORT || 8080;\n"
  + "app.listen( port );\n"
  + "console.log( 'server starting on ' + port + ' ...' );\n\n";
//console.log( app );
ignoreException( fs.writeFileSync( web + '/app.js', app ) );

//. template.ejs
ignoreException( fs.copyFileSync( './templates/views/' + base + '/_header.ejs', web + '/views/header.ejs' ) );
ignoreException( fs.copyFileSync( './templates/views/' + base + '/_footer.ejs', web + '/views/footer.ejs' ) );
ignoreException( fs.copyFileSync( './templates/views/' + base + '/_navi.ejs', web + '/views/navi.ejs' ) );
ignoreException( fs.copyFileSync( './templates/views/' + base + '/_links.ejs', web + '/views/links.ejs' ) );

//. static files
ignoreException( fs.copyFileSync( './templates/js/template.js', web + '/public/js/_main.js' ) );
ignoreException( fs.copyFileSync( './templates/css/template.css', web + '/public/css/_main.css' ) );
ignoreException( fs.copyFileSync( './templates/img/icon.png', web + '/public/img/icon.png' ) );

//. web package
ignoreException( fs.copyFileSync( './templates/.gitignore', web + '/.gitignore' ) );
ignoreException( fs.copyFileSync( './templates/package.json', web + '/package.json' ) );
ignoreException( fs.copyFileSync( filename, web + '/README.md' ) );


function registeredId( arr, id ){
  var r = false;
  for( var i = 0; i < arr.length && !r; i ++ ){
    r = ( arr[i].id == id );
  }

  return r;
}

function registeredName( arr, name ){
  var r = false;
  for( var i = 0; i < arr.length && !r; i ++ ){
    r = ( arr[i].name == name );
  }

  return r;
}

function generateRoute( path, _title, _links, is_list, appname ){
  var route = "app.get( '" + path + "', function( req, res ){\n";
  var list = [];
  var _record = null;
  if( is_list ){
    //. 一覧ページ
    var _names = path.substring( 1, path.length );
    var _name = _names.substring( 0, _names.length - 1 );
    for( var i = 0; i < LIST_SIZE; i ++ ){
      var rec = { id: i, name: _name + ' ' + i };
      list.push( rec );
    }

    route += "  var _records = " + stringifyArray( list ) + ";\n\n"
      + '  res.render( "' + _names + '", { _title: "' + _title + '", _name: "' + _names + '", _records: _records, _links: ' + stringifyArray( _links ) + ', _appname: "' + appname + '" } );\n'
      + '});\n\n';
  }else if( path.endsWith( '/:id' ) ){
    //. 詳細ページ
    var tmp = path.split( '/' );
    var _name = tmp[1];
    _record = { name: _name, description: _name + ' ' + _name };

    route += "  var _id = req.params.id;\n"
      + "  var _record = " + JSON.stringify( _record ) + ";\n\n"
      + '  res.render( "' + _name + '", { _id: _id, _title: "' + _title + '", _name: "' + _name + '", _record : _record, _links: ' + stringifyArray( _links ) + ', _appname: "' + appname + '" } );\n'
      + "});\n\n";
  }else if( path == '/' ){
    //. トップページ
    route += '  res.render( "index", { _title: "' + _title + '", _name: "index", _links: ' + stringifyArray( _links ) + ', _appname: "' + appname + '" } );\n'
      + "});\n\n";
  }else{
    //. それ以外のページ
    var _name = path.substring( 1, path.length );
    route += '  res.render( "' + _name + '", { _title: "' + _title + '", _name: "' + _name + '", _links: ' + stringifyArray( _links ) + ', _appname: "' + appname + '" } );\n'
      + "});\n\n";
  }

  return route;
}

function generateView( path, is_list ){
  var name = '';
  var template = '';
  if( is_list ){
    //. 一覧ページ
    name = path.substring( 1, path.length );
    template= '_list';
  }else if( path.endsWith( '/:id' ) ){
    //. 詳細ページ
    var tmp = path.split( '/' );
    name = tmp[1];
    template= '_detail';
  }else if( path == '/' ){
    //. トップページ
    name = 'index';
    template= '_index';
  }else{
    //. それ以外のページ
    name = path.substring( 1, path.length );
    template= '_else';
  }

  ignoreException( fs.copyFileSync( './templates/views/' + base + '/' + template + '.ejs', web + '/views/' + name + '.ejs' ) );
  ignoreException( fs.copyFileSync( './templates/js/template.js', web + '/public/js/' + name + '.js' ) );
  ignoreException( fs.copyFileSync( './templates/css/template.css', web + '/public/css/' + name + '.css' ) );
}

function stringifyArray( arr ){
  var str = "[\n";
  for( var i = 0; i < arr.length; i ++ ){
    str += JSON.stringify( arr[i] );
    if( i < arr.length - 1 ){
      str += ",";
    }
    str += "\n";
  }
  str += "]\n";

  return str;
}

//. #5
function ignoreException( func ){
  try{
    func;
  }catch( e ){
  }
}

function mkdirIfNotExisted( dir ){
  if( !fs.existsSync( dir ) ){
    fs.mkdirSync( dir );
  }
}
