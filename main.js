//. main.js
var fs = require( 'fs' );

//. 環境変数
var LIST_SIZE = 'LIST_SIZE' in process.env && process.env.LIST_SIZE ? parseInt( process.env.LIST_SIZE ) : 5;
var filename = 'MERMAID' in process.env && process.env.MERMAID ? process.env.MERMAID : 'mermaid_sample.md';
var base = 'BASE' in process.env && process.env.BASE ? process.env.BASE : 'bootstrap';

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
      //if( /*path != '/' &&*/ !arrows[j].name.startsWith( path.substring( 0, path.length - 1 ) ) ){
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
  var route = generateRoute( path, node.name, links, is_list );
  //console.log( route );
  app += route;

  //. ejs
  var view = generateView( path, is_list );
}

app += "\nvar port = process.env.PORT || 8080;\n"
  + "app.listen( port );\n"
  + "console.log( 'server starting on ' + port + ' ...' );\n\n";
//console.log( app );
fs.writeFileSync( './app.js', app );


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

function generateRoute( path, title, links, is_list ){
  var route = "app.get( '" + path + "', function( req, res ){\n";
  var list = [];
  var record = null;
  if( is_list ){
    //. 一覧ページ
    var names = path.substring( 1, path.length );
    var name = names.substring( 0, names.length - 1 );
    for( var i = 0; i < LIST_SIZE; i ++ ){
      var rec = { id: i, name: name + ' ' + i };
      list.push( rec );
    }

    route += "  var records = " + JSON.stringify( list ) + ";\n\n"
      + '  res.render( "' + names + '", { title: "' + title + '", name: "' + names + '", records: records, links: ' + JSON.stringify( links ) + " } );\n"
      + '});\n\n';
  }else if( path.endsWith( '/:id' ) ){
    //. 詳細ページ
    var tmp = path.split( '/' );
    var name = tmp[1];
    record = { name: name, description: name + ' ' + name };

    route += "  var id = req.params.id;\n"
      + "  var record = " + JSON.stringify( record ) + ";\n\n"
      + '  res.render( "' + name + '", { id: id, title: "' + title + '", name: "' + name + '", record : record, links: ' + JSON.stringify( links ) + " } );\n"
      + "});\n\n";
  }else if( path == '/' ){
    //. トップページ
    route += '  res.render( "index", { title: "' + title + '", name: "index", links: ' + JSON.stringify( links ) + " } );\n"
      + "});\n\n";
  }else{
    //. それ以外のページ
    var name = path.substring( 1, path.length );
    route += '  res.render( "' + name + '", { title: "' + title + '", name: "' + name + '", links: ' + JSON.stringify( links ) + " } );\n"
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

  fs.copyFileSync( './templates/views/' + template + '.ejs', './views/' + name + '.ejs' );
  fs.copyFileSync( './templates/js/template.js', './public/js/' + name + '.js' );
  fs.copyFileSync( './templates/css/template.css', './public/css/' + name + '.css' );
}

//. template.ejs
fs.copyFileSync( './templates/views/_header.ejs', './views/header.ejs' );
fs.copyFileSync( './templates/views/_footer.ejs', './views/footer.ejs' );
fs.copyFileSync( './templates/views/_navi.ejs', './views/navi.ejs' );
fs.copyFileSync( './templates/views/_links.ejs', './views/links.ejs' );

fs.copyFileSync( './templates/js/template.js', './public/js/_main.js' );
fs.copyFileSync( './templates/css/template.css', './public/css/_main.css' );
fs.copyFileSync( './templates/img/icon.png', './public/img/icon.png' );


