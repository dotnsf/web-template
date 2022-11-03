//. api.js
var fs = require( 'fs' );

//. 環境変数
var DATABASE_URL = 'DATABASE_URL' in process.env && process.env.DATABASE_URL ? process.env.DATABASE_URL : '';
var filename = 'MERMAID' in process.env && process.env.MERMAID ? process.env.MERMAID : 'mermaid_sample.md';
var out = 'api';

//. フォルダ作成
mkdirIfNotExisted( out + '/api' );
mkdirIfNotExisted( out + '/public' );
mkdirIfNotExisted( out + '/public/_doc' );

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

var app = "//. app.js\n"
  + "var express = require( 'express' ),\n"
  + "  app = express();\n\n"
  + "var db = require( './api/db' );\n"
  + "app.use( express.Router() );\n"
  + "app.use( express.static( __dirname + '/public' ) );\n"
  + "app.use( '/api', db );\n\n";

var db = "//. db.js\n"
  + "var express = require( 'express' ),\n"
  + "  bodyParser = require( 'body-parser' ),\n"
  + "  cors = require( 'cors' ),\n"
  + "  { v4: uuidv4 } = require( 'uuid' ),\n"
  + "  api = express();\n\n"
  + "api.use( express.Router() );\n"
  + "api.use( bodyParser.urlencoded( { extended: true } ) );\n"
  + "api.use( bodyParser.json() );\n\n"
  + "//. env values\n"
  + "var settings_cors = 'CORS' in process.env ? process.env.CORS : '';\n\n"
  + "//. CORS\n"
  + "if( settings_cors ){\n"
  + "  var opt = {\n"
  + "    origin: settings_cors,\n"
  + "    optionsSuccessStatus: 200\n"
  + "  };\n"
  + "  api.use( cors( opt ) );\n"
  + "}\n\n";

//. Database
var dbcode = generateDbCode( DATABASE_URL );
db += dbcode;

var appname = filename;
var tmp = filename.lastIndexOf( '.' );
if( tmp > 0 ){
  appname = filename.substr( 0, tmp );
}

var swagger = "swagger: '2.0'\n"
  + "info:\n"
  + "  description: " + appname + " REST API ドキュメント\n"
  + "  version: 0.0.1\n"
  + "  title: " + appname + " REST APIs\n"
  + "basePath: /api\n"
  + "schemes:\n"
  + "  - http\n"
  + "  - https\n";

var swagger_tags = "tags:\n";
var swagger_paths = "paths:\n";
var swagger_defs = "definitions:\n";

for( var i = 0; i < nodes.length; i ++ ){
  var node = nodes[i];
  var path = null;
  for( var j = 0; j < arrows.length && !path; j ++ ){
    if( arrows[j].to == node.id ){
      path = arrows[j].name;
    }
  }

  //. 一覧ページか？
  var is_list = false;
  if( path && path.endsWith( 's' ) ){
    var tmp = path.substr( 0, path.length - 1 ) + '/:id';
    for( var j = 0; j < arrows.length && !is_list; j ++ ){
      if( arrows[j].from == node.id && arrows[j].name == tmp ){
        is_list = true;
      }
    }
  }

  if( is_list ){
    var crud = generateApiCRUD( path, DATABASE_URL );
    db += crud;
    var route = generateApiRoute( path );
    db += route;

    //. swagger.yaml
    var swagger_tag = generateSwaggerTag( path );
    swagger_tags += swagger_tag;
    var swagger_path = generateSwaggerPath( path );
    swagger_paths += swagger_path;
    var swagger_def = generateSwaggerDef( path );
    swagger_defs += swagger_def;
  }
}

app += "\nvar port = process.env.PORT || 8081;\n"
  + "app.listen( port );\n"
  + "console.log( 'server starting on ' + port + ' ...' );\n\n";
ignoreException( fs.writeFileSync( out + '/app.js', app ) );

db += "\nmodule.exports = api;\n\n";
ignoreException( fs.writeFileSync( out + '/api/db.js', db ) );

swagger += swagger_tags;
swagger += swagger_paths;
swagger += swagger_defs;
ignoreException( fs.writeFileSync( out + '/public/_doc/swagger.yaml', swagger ) );

//. Swagger
ignoreException( fs.copyFileSync( './templates/_doc/favicon-16x16.png', out + '/public/_doc/favicon-16x16.png' ) );
ignoreException( fs.copyFileSync( './templates/_doc/favicon-32x32.png', out + '/public/_doc/favicon-32x32.png' ) );
ignoreException( fs.copyFileSync( './templates/_doc/index.html', out + '/public/_doc/index.html' ) );
ignoreException( fs.copyFileSync( './templates/_doc/oauth2-redirect.html', out + '/public/_doc/oauth2-redirect.html' ) );
ignoreException( fs.copyFileSync( './templates/_doc/swagger-ui-bundle.js', out + '/public/_doc/swagger-ui-bundle.js' ) );
ignoreException( fs.copyFileSync( './templates/_doc/swagger-ui-bundle.js.map', out + '/public/_doc/swagger-ui-bundle.js.map' ) );
ignoreException( fs.copyFileSync( './templates/_doc/swagger-ui-standalone-preset.js', out + '/public/_doc/swagger-ui-standalone-preset.js' ) );
ignoreException( fs.copyFileSync( './templates/_doc/swagger-ui-standalone-preset.js.map', out + '/public/_doc/swagger-ui-standalone-preset.js.map' ) );
ignoreException( fs.copyFileSync( './templates/_doc/swagger-ui.css', out + '/public/_doc/swagger-ui.css' ) );
ignoreException( fs.copyFileSync( './templates/_doc/swagger-ui.css.map', out + '/public/_doc/swagger-ui.css.map' ) );
ignoreException( fs.copyFileSync( './templates/_doc/swagger-ui.js', out + '/public/_doc/swagger-ui.js' ) );
ignoreException( fs.copyFileSync( './templates/_doc/swagger-ui.js.map', out + '/public/_doc/swagger-ui.js.map' ) );
ignoreException( fs.copyFileSync( './templates/_doc/api_index.html', out + '/public/index.html' ) );

//. web package
ignoreException( fs.copyFileSync( './templates/.gitignore', out + '/.gitignore' ) );
ignoreException( fs.copyFileSync( './templates/package.json.api', out + '/package.json' ) );
ignoreException( fs.copyFileSync( filename, out + '/README.md' ) );


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

function capitalize( str ){
	if( typeof str !== 'string' || !str ) return str;
	return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function generateSwaggerTag( path ){
  var prural = path.substr( 1 );
  var singular = prural.substr( 0, prural.length - 1 );

  var swagger_tag = "  - name: " + singular + "\n" 
    + "    description: " + capitalize( singular ) + " APIs\n";

  return swagger_tag;
}

function generateSwaggerPath( path ){
  var prural = path.substr( 1 );
  var singular = prural.substr( 0, prural.length - 1 );

  var swagger_path = 
      "  /" + prural + ":\n" 
    + "    get:\n"
    + "      tags:\n"
    + "        - " + singular + "\n"
    + "      summary: GET " + capitalize( prural ) + "\n"
    + "      description: GET " + capitalize( prural ) + "\n"
    + "      produces:\n"
    + "        - application/json\n"
    + "      parameters:\n"
    + "        - name: limit\n"
    + "          type: integer\n"
    + "          in: query\n"
    + "          description: limit\n"
    + "        - name: start\n"
    + "          type: integer\n"
    + "          in: query\n"
    + "          description: start\n"
    + "      responses:\n"
    + "        '200':\n"
    + "          description: success\n"
    + "        '400':\n"
    + "          description: error\n"

    + "    post:\n"
    + "      tags:\n"
    + "        - " + singular + "\n"
    + "      summary: POST " + capitalize( prural ) + "\n"
    + "      description: POST " + capitalize( prural ) + "\n"
    + "      produces:\n"
    + "        - application/json\n"
    + "      parameters:\n"
    + "        - name: body\n"
    + "          in: body\n"
    + "          schema:\n"
    + "            $ref: '#/definitions/" + capitalize( prural ) + "Request'\n"
    + "      responses:\n"
    + "        '200':\n"
    + "          description: success\n"
    + "        '400':\n"
    + "          description: error\n"

    + "    delete:\n"
    + "      tags:\n"
    + "        - " + singular + "\n"
    + "      summary: DELETE " + capitalize( prural ) + "\n"
    + "      description: DELETE " + capitalize( prural ) + "\n"
    + "      produces:\n"
    + "        - application/json\n"
    + "      responses:\n"
    + "        '200':\n"
    + "          description: success\n"
    + "        '400':\n"
    + "          description: error\n"

    + "  /" + singular + ":\n"
    + "    post:\n"
    + "      tags:\n"
    + "        - " + singular + "\n"
    + "      summary: POST " + capitalize( singular ) + "\n"
    + "      description: POST " + capitalize( singular ) + "\n"
    + "      produces:\n"
    + "        - application/json\n"
    + "      parameters:\n"
    + "        - name: body\n"
    + "          in: body\n"
    + "          schema:\n"
    + "            $ref: '#/definitions/" + capitalize( singular ) + "Request'\n"
    + "      responses:\n"
    + "        '200':\n"
    + "          description: success\n"
    + "        '400':\n"
    + "          description: error\n"

    + "  /" + singular + "/{id}:\n"
    + "    get:\n"
    + "      tags:\n"
    + "        - " + singular + "\n"
    + "      summary: GET " + capitalize( singular ) + "/{id}\n"
    + "      description: GET " + capitalize( singular ) + "/{id}\n"
    + "      produces:\n"
    + "        - application/json\n"
    + "      parameters:\n"
    + "        - name: id\n"
    + "          type: string\n"
    + "          in: path\n"
    + "          description: id\n"
    + "          required: true\n"
    + "      responses:\n"
    + "        '200':\n"
    + "          description: success\n"
    + "        '400':\n"
    + "          description: error\n"
    
    + "    put:\n"
    + "      tags:\n"
    + "        - " + singular + "\n"
    + "      summary: PUT " + capitalize( singular ) + "/{id}\n"
    + "      description: PUT " + capitalize( singular ) + "/{id}\n"
    + "      produces:\n"
    + "        - application/json\n"
    + "      parameters:\n"
    + "        - name: id\n"
    + "          type: string\n"
    + "          in: path\n"
    + "          description: id\n"
    + "          required: true\n"
    + "        - name: body\n"
    + "          in: body\n"
    + "          schema:\n"
    + "            $ref: '#/definitions/" + capitalize( singular ) + "Request'\n"
    + "      responses:\n"
    + "        '200':\n"
    + "          description: success\n"
    + "        '400':\n"
    + "          description: error\n"

    + "    delete:\n"
    + "      tags:\n"
    + "        - " + singular + "\n"
    + "      summary: DELETE " + capitalize( singular ) + "/{id}\n"
    + "      description: DELETE " + capitalize( singular ) + "/{id}\n"
    + "      produces:\n"
    + "        - application/json\n"
    + "      parameters:\n"
    + "        - name: id\n"
    + "          type: string\n"
    + "          in: path\n"
    + "          description: id\n"
    + "          required: true\n"
    + "      responses:\n"
    + "        '200':\n"
    + "          description: success\n"
    + "        '400':\n"
    + "          description: error\n";

  return swagger_path;
}

function generateSwaggerDef( path ){
  var prural = path.substr( 1 );
  var singular = prural.substr( 0, prural.length - 1 );

  var swagger_def = "  " + capitalize( singular ) + "Request:\n" 
    + "    type: object\n"
    + "    properties:\n"
    + "      id:\n"
    + "        type: string\n"
    + "        description: id\n"
    + "      name:\n"
    + "        type: string\n"
    + "        description: name\n"
    + "  " + capitalize( prural ) + "Request:\n"
    + "    type: array\n"
    + "    items:\n"
    + "      type: object\n"
    + "      properties:\n"
    + "        id:\n"
    + "          type: string\n"
    + "          description: id\n"
    + "        name:\n"
    + "          type: string\n"
    + "          description: name\n";

  return swagger_def;
}


function generateApiRoute( path ){
  var prural = path.substr( 1 );
  var singular = prural.substr( 0, prural.length - 1 );

  var route = "api.post( '/" + singular + "', async function( req, res ){\n"
    + "  res.contentType( 'application/json; charset=utf-8' );\n\n"
    + "  var " + singular + " = req.body;\n"
    + "  api.create" + capitalize( singular ) + "( " + singular + " ).then( function( result ){\n"
    + "    res.status( result.status ? 200 : 400 );\n"
    + "    res.write( JSON.stringify( result, null, 2 ) );\n"
    + "    res.end();\n"
    + "  });\n"
    + "});\n\n"

    + "api.post( '/" + prural + "', async function( req, res ){\n"
    + "  res.contentType( 'application/json; charset=utf-8' );\n\n"
    + "  var " + prural + " = req.body;\n"
    + "  " + prural + ".forEach( function( " + singular + " ){\n"
    + "    if( !" + singular + ".id ){\n"
    + "      " + singular + ".id = uuidv4();\n"
    + "    }\n"
    + "  });\n"
    + "  api.create" + capitalize( prural ) + "( " + prural + " ).then( function( result ){\n"
    + "    res.status( result.status ? 200 : 400 );\n"
    + "    res.write( JSON.stringify( result, null, 2 ) );\n"
    + "    res.end();\n"
    + "  });\n"
    + "});\n\n"

    + "api.get( '/" + singular + "/:id', async function( req, res ){\n"
    + "  res.contentType( 'application/json; charset=utf-8' );\n\n"
    + "  var " + singular + "_id = req.params.id;\n"
    + "  api.read" + capitalize( singular ) + "( " + singular + "_id ).then( function( result ){\n"
    + "    res.status( result.status ? 200 : 400 );\n"
    + "    res.write( JSON.stringify( result, null, 2 ) );\n"
    + "    res.end();\n"
    + "  });\n"
    + "});\n\n"

    + "api.get( '/" + prural + "', async function( req, res ){\n"
    + "  res.contentType( 'application/json; charset=utf-8' );\n\n"
    + "  var limit = req.query.limit ? parseInt( limit ) : 0;\n"
    + "  var offset = req.query.offset ? parseInt( offset ) : 0;\n"
    + "  api.read" + capitalize( prural ) + "( limit, offset ).then( function( results ){\n"
    + "    res.status( results.status ? 200 : 400 );\n"
    + "    res.write( JSON.stringify( results, null, 2 ) );\n"
    + "    res.end();\n"
    + "  });\n"
    + "});\n\n"

    + "api.put( '/" + singular + "/:id', async function( req, res ){\n"
    + "  res.contentType( 'application/json; charset=utf-8' );\n\n"
    + "  var " + singular + "_id = req.params.id;\n"
    + "  var item = req.body;\n"
    + "  " + singular + ".id = " + singular + "_id;\n"
    + "  api.update" + capitalize( singular ) + "( " + singular + " ).then( function( result ){\n"
    + "    res.status( result.status ? 200 : 400 );\n"
    + "    res.write( JSON.stringify( result, null, 2 ) );\n"
    + "    res.end();\n"
    + "  });\n"
    + "});\n\n"

    + "api.delete( '/" + singular + "/:id', async function( req, res ){\n"
    + "  res.contentType( 'application/json; charset=utf-8' );\n\n"
    + "  var " + singular + "_id = req.params.id;\n"
    + "  api.delete" + capitalize( singular ) + "( " + singular + "_id ).then( function( result ){\n"
    + "    res.status( result.status ? 200 : 400 );\n"
    + "    res.write( JSON.stringify( result, null, 2 ) );\n"
    + "    res.end();\n"
    + "  });\n"
    + "});\n\n"

    + "api.delete( '/" + prural + "', function( req, res ){\n"
    + "  res.contentType( 'application/json; charset=utf-8' );\n\n"
    + "  api.delete" + capitalize( prural ) + "().then( function( result ){\n"
    + "    res.status( result.status ? 200 : 400 );\n"
    + "    res.write( JSON.stringify( result, null, 2 ) );\n"
    + "    res.end();\n"
    + "  });\n"
    + "});\n\n";

  return route;
}

function generateApiCRUD( path, database_url ){
  var prural = path.substr( 1 );
  var singular = prural.substr( 0, prural.length - 1 );
  var crud = "";

  if( !database_url ){
    crud = "api.create" + capitalize( singular ) + " = function( " + singular + " ){\n"
      + "  return new Promise( ( resolve, reject ) => {\n"
      + "    if( !" + singular + ".id ){\n"
      + "      " + singular + ".id = uuidv4();\n"
      + "    }\n\n"
      + "    if( db[" + singular + ".id] ){\n"
      + "      resolve( { status: false, error: 'id in use.' } );\n"
      + "    }else{\n"
      + "      var t = ( new Date() ).getTime();\n"
      + "      " + singular + ".created = t;\n"
      + "      " + singular + ".updated = t;\n"
      + "      db[" + singular + ".id] = " + singular + ";\n"
      + "      resolve( { status: true, result: " + singular + " } );\n"
      + "    }\n"
      + "  });\n"
      + "};\n\n"

      + "api.create" + capitalize( prural ) + " = function( " + prural + " ){\n"
      + "  return new Promise( ( resolve, reject ) => {\n"
      + "    var count = 0;\n"
      + "    for( var i = 0; i < " + prural + ".length; i ++ ){\n"
      + "      var " + singular + " = " + prural + "[i];\n"
      + "      if( !" + singular + ".id ){\n"
      + "        " + singular + ".id = uuidv4();\n"
      + "      }\n"
      + "      if( db[" + singular + ".id] ){\n"
      + "      }else{\n"
      + "        var t = ( new Date() ).getTime();\n"
      + "        " + singular + ".created = t;\n"
      + "        " + singular + ".updated = t;\n"
      + "        db[" + singular + ".id] = " + singular + ";\n"
      + "        count ++;\n"
      + "      }\n"
      + "    }\n"
      + "    resolve( { status: true, count: count } );\n"
      + "  });\n"
      + "};\n\n"

      + "api.read" + capitalize( singular ) + " = function( " + singular + "_id ){\n"
      + "  return new Promise( async ( resolve, reject ) => {\n"
      + "    if( !" + singular + "_id ){\n"
      + "      resolve( { status: false, error: 'id not specified.' } );\n"
      + "    }else{\n"
      + "      if( !db[" + singular + "_id] ){\n"
      + "        resolve( { status: false, error: 'no data found.' } );\n"
      + "      }else{\n"
      + "        resolve( { status: true, result: db[" + singular + "_id] } );\n"
      + "      }\n"
      + "    }\n"
      + "  });\n"
      + "};\n\n"

      + "api.read" + capitalize( prural ) + " = function( limit, start ){\n"
      + "  return new Promise( async ( resolve, reject ) => {\n"
      + "    var " + prural + " = [];\n"
      + "    Object.keys( db ).forEach( function( key ){\n"
      + "      " + prural + ".push( db[key] );\n"
      + "    });\n"
      + "    if( start ){\n"
      + "      " + prural + ".splice( 0, start );\n"
      + "    }\n"
      + "    if( limit ){\n"
      + "      " + prural + ".splice( limit );\n"
      + "    }\n"
      + "    resolve( { status: true, results: " + prural + " } );\n"
      + "  });\n"
      + "};\n\n"

      + "api.update" + capitalize( singular ) + " = function( " + singular + " ){\n"
      + "  return new Promise( async ( resolve, reject ) => {\n"
      + "    if( !" + singular + ".id ){\n"
      + "      resolve( { status: false, error: 'no id specified.' } );\n"
      + "    }else{\n"
      + "      if( !db[" + singular + ".id] ){\n"
      + "        resolve( { status: false, error: 'no data found.' } );\n"
      + "      }else{\n"
      + "        var t = ( new Date() ).getTime();\n"
      + "        " + singular + ".updated = t;\n"
      + "        db[" + singular + ".id] = " + singular + ";\n"
      + "        resolve( { status: true, result: " + singular + " } );\n"
      + "      }\n"
      + "    }\n"
      + "  });\n"
      + "};\n\n"

      + "api.delete" + capitalize( singular ) + " = function( " + singular + "_id ){\n"
      + "  return new Promise( async ( resolve, reject ) => {\n"
      + "    if( !" + singular + "_id ){\n"
      + "      resolve( { status: false, error: 'no id specified.' } );\n"
      + "    }else{\n"
      + "      if( !db[" + singular + ".id] ){\n"
      + "        resolve( { status: false, error: 'no data found.' } );\n"
      + "      }else{\n"
      + "        delete db[" + singular + "_id];\n"
      + "        resolve( { status: true } );\n"
      + "      }\n"
      + "    }\n"
      + "  });\n"
      + "};\n\n"

      + "api.delete" + capitalize( prural ) + " = async function(){\n"
      + "  return new Promise( async ( resolve, reject ) => {\n"
      + "    db = {};\n"
      + "    resolve( { status: true } );\n"
      + "  });\n"
      + "};\n\n";
  }else{
    if( database_url.indexOf( "mysql" ) > -1 ){
      crud = "api.create" + capitalize( singular ) + " = function( " + singular + " ){\n"
        + "  return new Promise( ( resolve, reject ) => {\n"
        + "    if( mysql ){\n"
        + "      mysql.getConnection( function( err, conn ){\n"
        + "        if( err ){\n"
        + "          console.log( err );\n"
        + "          resolve( { status: false, error: err } );\n"
        + "        }else{\n"
        + "          try{\n"
        + "            var sql = 'insert into " + prural + " set ?';\n"
        + "            if( !" + singular + ".id ){\n"
        + "              " + singular + ".id = uuidv4();\n"
        + "            }\n"
        + "            var t = ( new Date() ).getTime();\n"
        + "            conn.query( sql, " + singular + ", function( err, result ){\n"
        + "              if( err ){\n"
        + "                console.log( err );\n"
        + "                resolve( { status: false, error: err } );\n"
        + "              }else{\n"
        + "                resolve( { status: true, result: result } );\n"
        + "              }\n"
        + "            });\n"
        + "          }catch( e ){\n"
        + "            console.log( e );\n"
        + "            resolve( { status: false, error: err } );\n"
        + "          }finally{\n"
        + "            conn.release();\n"
        + "          }\n"
        + "        }\n"
        + "      });\n"
        + "    }else{\n"
        + "      resolve( { status: false, error: 'db not ready.' } );\n"
        + "    }\n"
        + "  });\n"
        + "};\n\n"
  
        + "api.create" + capitalize( prural ) + " = function( " + prural + " ){\n"
        + "  return new Promise( ( resolve, reject ) => {\n"
        + "    if( mysql ){\n"
        + "      mysql.getConnection( function( err, conn ){\n"
        + "        if( err ){\n"
        + "          console.log( err );\n"
        + "          resolve( { status: false, error: err } );\n"
        + "        }else{\n"
        + "          try{\n"
        + "            var num = 0;\n"
        + "            var count = 0;\n"
        + "            var sql = 'insert into " + prural + " set ?';\n"
        + "            for( var i = 0; i < " + prural + ".length; i ++ ){\n"
        + "              var " + singular + " = " + prural + "[i];\n"
        + "              if( !" + singular + ".id ){\n"
        + "                " + singular + ".id = uuidv4();\n"
        + "              }\n"
        + "              var t = ( new Date() ).getTime();\n"
        + "              " + singular + ".created = t;\n"
        + "              " + singular + ".updated = t;\n"
        + "              conn.query( sql, " + singular + ", function( err, result ){\n"
        + "                num ++;\n"
        + "                if( err ){\n"
        + "                  console.log( err );\n"
        + "                }else{\n"
        + "                  count ++;\n"
        + "                }\n"
        + "                if( num == " + prural + ".length ){\n"
        + "                  resolve( { status: true, count: count } );\n"
        + "                }\n"
        + "              });\n"
        + "            }\n"
        + "          }catch( e ){\n"
        + "            console.log( e );\n"
        + "            resolve( { status: false, error: err } );\n"
        + "          }finally{\n"
        + "            conn.release();\n"
        + "          }\n"
        + "        }\n"
        + "      });\n"
        + "    }else{\n"
        + "      resolve( { status: false, error: 'db not ready.' } );\n"
        + "    }\n"
        + "  });\n"
        + "};\n\n"
  
        + "api.read" + capitalize( singular ) + " = function( " + singular + "_id ){\n"
        + "  return new Promise( async ( resolve, reject ) => {\n"
        + "    if( mysql ){\n"
        + "      mysql.getConnection( function( err, conn ){\n"
        + "        if( err ){\n"
        + "          console.log( err );\n"
        + "          resolve( { status: false, error: err } );\n"
        + "        }else{\n"
        + "          try{\n"
        + "            var sql = 'select * from " + prural + " where id = ?';\n"
        + "            conn.query( sql, [ " + singular + "_id ], function( err, results ){\n"
        + "              if( err ){\n"
        + "                console.log( err );\n"
        + "                resolve( { status: false, error: err } );\n"
        + "              }else{\n"
        + "                if( results && results.length > 0 ){\n"
        + "                  resolve( { status: true, result: results[0] } );\n"
        + "                }else{\n"
        + "                  resolve( { status: false, error: 'no data' } );\n"
        + "                }\n"
        + "              }\n"
        + "            });\n"
        + "          }catch( e ){\n"
        + "            console.log( e );\n"
        + "            resolve( { status: false, error: err } );\n"
        + "          }finally{\n"
        + "            conn.release();\n"
        + "          }\n"
        + "        }\n"
        + "      });\n"
        + "    }else{\n"
        + "      resolve( { status: false, error: 'db not ready.' } );\n"
        + "    }\n"
        + "  });\n"
        + "};\n\n"
  
        + "api.read" + capitalize( prural ) + " = function( limit, start ){\n"
        + "  return new Promise( async ( resolve, reject ) => {\n"
        + "    if( mysql ){\n"
        + "      mysql.getConnection( function( err, conn ){\n"
        + "        if( err ){\n"
        + "          console.log( err );\n"
        + "          resolve( { status: false, error: err } );\n"
        + "        }else{\n"
        + "          try{\n"
        + "            var sql = 'select * from " + prural + " order by updated';\n"
        + "            if( limit ){\n"
        + "              if( offset ){\n"
        + "                sql += ' limit ' + offset + ',' + limit;\n"
        + "              }else{\n"
        + "                sql += ' limit ' + limit;\n"
        + "              }\n"
        + "            }\n"
        + "            conn.query( sql, function( err, results ){\n"
        + "              if( err ){\n"
        + "                console.log( err );\n"
        + "                resolve( { status: false, error: err } );\n"
        + "              }else{\n"
        + "                resolve( { status: true, results: results } );\n"
        + "              }\n"
        + "            });\n"
        + "          }catch( e ){\n"
        + "            console.log( e );\n"
        + "            resolve( { status: false, error: err } );\n"
        + "          }finally{\n"
        + "            conn.release();\n"
        + "          }\n"
        + "        }\n"
        + "      });\n"
        + "    }else{\n"
        + "      resolve( { status: false, error: 'db not ready.' } );\n"
        + "    }\n"
        + "  });\n"
        + "};\n\n"
  
        + "api.update" + capitalize( singular ) + " = function( " + singular + " ){\n"
        + "  return new Promise( async ( resolve, reject ) => {\n"
        + "    if( mysql ){\n"
        + "      mysql.getConnection( function( err, conn ){\n"
        + "        if( err ){\n"
        + "          console.log( err );\n"
        + "          resolve( { status: false, error: err } );\n"
        + "        }else{\n"
        + "          try{\n"
        + "            if( !" + singular + ".id ){\n"
        + "              resolve( { status: false, error: 'no id.' } );\n"
        + "            }else{\n"
        + "              var id = " + singular + ".id;\n"
        + "              delete " + singular + "['id'];\n"
        + "              var sql = 'update " + prural + " set ? where id = ?';\n"
        + "              var t = ( new Date() ).getTime();\n"
        + "              " + singular + ".updated = t;\n"
        + "              conn.query( sql, [ " + singular + ", id ], function( err, result ){\n"
        + "                if( err ){\n"
        + "                  console.log( err );\n"
        + "                  resolve( { status: false, error: err } );\n"
        + "                }else{\n"
        + "                  resolve( { status: true, result: result } );\n"
        + "                }\n"
        + "            });\n"
        + "          }catch( e ){\n"
        + "            console.log( e );\n"
        + "            resolve( { status: false, error: err } );\n"
        + "          }finally{\n"
        + "            conn.release();\n"
        + "          }\n"
        + "        }\n"
        + "      });\n"
        + "    }else{\n"
        + "      resolve( { status: false, error: 'db not ready.' } );\n"
        + "    }\n"
        + "  });\n"
        + "};\n\n"
  
        + "api.delete" + capitalize( singular ) + " = function( " + singular + "_id ){\n"
        + "  return new Promise( async ( resolve, reject ) => {\n"
        + "    if( mysql ){\n"
        + "      mysql.getConnection( function( err, conn ){\n"
        + "        if( err ){\n"
        + "          console.log( err );\n"
        + "          resolve( { status: false, error: err } );\n"
        + "        }else{\n"
        + "          try{\n"
        + "            var sql = 'delete from " + prural + " where id = ?';\n"
        + "            conn.query( sql, [ " + singular + "_id ], function( err, result ){\n"
        + "              if( err ){\n"
        + "                console.log( err );\n"
        + "                resolve( { status: false, error: err } );\n"
        + "              }else{\n"
        + "                resolve( { status: true, result: result } );\n"
        + "              }\n"
        + "            });\n"
        + "          }catch( e ){\n"
        + "            console.log( e );\n"
        + "            resolve( { status: false, error: err } );\n"
        + "          }finally{\n"
        + "            conn.release();\n"
        + "          }\n"
        + "        }\n"
        + "      });\n"
        + "    }else{\n"
        + "      resolve( { status: false, error: 'db not ready.' } );\n"
        + "    }\n"
        + "  });\n"
        + "};\n\n"
  
        + "api.delete" + capitalize( prural ) + " = async function(){\n"
        + "  return new Promise( async ( resolve, reject ) => {\n"
        + "    if( mysql ){\n"
        + "      mysql.getConnection( function( err, conn ){\n"
        + "        if( err ){\n"
        + "          console.log( err );\n"
        + "          resolve( { status: false, error: err } );\n"
        + "        }else{\n"
        + "          try{\n"
        + "            var sql = 'delete from " + prural + "';\n"
        + "            conn.query( sql, [], function( err, result ){\n"
        + "              if( err ){\n"
        + "                console.log( err );\n"
        + "                resolve( { status: false, error: err } );\n"
        + "              }else{\n"
        + "                resolve( { status: true, result: result } );\n"
        + "              }\n"
        + "            });\n"
        + "          }catch( e ){\n"
        + "            console.log( e );\n"
        + "            resolve( { status: false, error: err } );\n"
        + "          }finally{\n"
        + "            conn.release();\n"
        + "          }\n"
        + "        }\n"
        + "      });\n"
        + "    }else{\n"
        + "      resolve( { status: false, error: 'db not ready.' } );\n"
        + "    }\n"
        + "  });\n"
        + "};\n\n";
    }else if( database_url.indexOf( "postgres" ) > -1 ){
      crud = "api.create" + capitalize( singular ) + " = function( " + singular + " ){\n"
        + "  return new Promise( ( resolve, reject ) => {\n"
        + "    if( pg ){\n"
        + "      var conn = await pg.connect();\n"
        + "      if( conn ){\n"
        + "        try{\n"
        + "          var sql = 'insert into " + prural + "( id, name, created, updated ) values ( $1, $2, $3, $4 )';\n"
        + "          if( !" + singular + ".id ){\n"
        + "            " + singular + ".id = uuidv4();\n"
        + "          }\n"
        + "          var t = ( new Date() ).getTime();\n"
        + "          var query = { text: sql, values: [ " + singular + ".id, " + singular + ".name, t, t ] };\n"
        + "          conn.query( query, function( err, result ){\n"
        + "            if( err ){\n"
        + "              console.log( err );\n"
        + "              resolve( { status: false, error: err } );\n"
        + "            }else{\n"
        + "              resolve( { status: true, result: result } );\n"
        + "            }\n"
        + "          });\n"
        + "        }catch( e ){\n"
        + "          console.log( e );\n"
        + "          resolve( { status: false, error: err } );\n"
        + "        }finally{\n"
        + "          if( conn ){\n"
        + "            conn.release();\n"
        + "          }\n"
        + "        }\n"
        + "      }else{\n"
        + "        resolve( { status: false, error: 'no connection.' } );\n"
        + "      }\n"
        + "    }else{\n"
        + "      resolve( { status: false, error: 'db not ready.' } );\n"
        + "    }\n"
        + "  });\n"
        + "};\n\n"
  
        + "api.create" + capitalize( prural ) + " = function( " + prural + " ){\n"
        + "  return new Promise( ( resolve, reject ) => {\n"
        + "    if( pg ){\n"
        + "      var conn = await pg.connect();\n"
        + "      if( conn ){\n"
        + "        try{\n"
        + "          var num = 0;\n"
        + "          var count = 0;\n"
        + "          var sql = 'insert into " + prural + "( id, name, created, updated ) values ( $1, $2, $3, $4 )';\n"
        + "          for( var i = 0; i < " + prural + ".length; i ++ ){\n"
        + "            var " + singular + " = " + prural + "[i];\n"
        + "            if( !" + singular + ".id ){\n"
        + "              " + singular + ".id = uuidv4();\n"
        + "            }\n"
        + "            var t = ( new Date() ).getTime();\n"
        + "            var query = { text: sql, values: [ " + singular + ".id, " + singular + ".name, t, t ] };\n"
        + "            conn.query( query, function( err, result ){\n"
        + "              num ++;\n"
        + "              if( err ){\n"
        + "                console.log( err );\n"
        + "              }else{\n"
        + "                count ++;\n"
        + "              }\n"
        + "              if( num == " + prural + ".length ){\n"
        + "                resolve( { status: true, count: count } );\n"
        + "              }\n"
        + "            });\n"
        + "          }\n"
        + "        }catch( e ){\n"
        + "          console.log( e );\n"
        + "          resolve( { status: false, error: err } );\n"
        + "        }finally{\n"
        + "          if( conn ){\n"
        + "            conn.release();\n"
        + "          }\n"
        + "        }\n"
        + "      }else{\n"
        + "        resolve( { status: false, error: 'no connection.' } );\n"
        + "      }\n"
        + "    }else{\n"
        + "      resolve( { status: false, error: 'db not ready.' } );\n"
        + "    }\n"
        + "  });\n"
        + "};\n\n"
  
        + "api.read" + capitalize( singular ) + " = function( " + singular + "_id ){\n"
        + "  return new Promise( async ( resolve, reject ) => {\n"
        + "    if( pg ){\n"
        + "      var conn = await pg.connect();\n"
        + "      if( conn ){\n"
        + "        try{\n"
        + "          var sql = 'select * from " + prural + " where id = $1';\n"
        + "          var query = { text: sql, values: [ " + singular + "_id ] };\n"
        + "          conn.query( query, function( err, result ){\n"
        + "            if( err ){\n"
        + "              console.log( err );\n"
        + "              resolve( { status: false, error: err } );\n"
        + "            }else{\n"
        + "              if( result && result.rows && result.rows.length > 0 ){\n"
        + "                resolve( { status: true, result: result.rows[0] } );\n"
        + "              }else{\n"
        + "                resolve( { status: false, error: 'no data' } );\n"
        + "              }\n"
        + "            }\n"
        + "          });\n"
        + "        }catch( e ){\n"
        + "          console.log( e );\n"
        + "          resolve( { status: false, error: err } );\n"
        + "        }finally{\n"
        + "          if( conn ){\n"
        + "            conn.release();\n"
        + "          }\n"
        + "        }\n"
        + "      }else{\n"
        + "        resolve( { status: false, error: 'no connection.' } );\n"
        + "      }\n"
        + "    }else{\n"
        + "      resolve( { status: false, error: 'db not ready.' } );\n"
        + "    }\n"
        + "  });\n"
        + "};\n\n"
  
        + "api.read" + capitalize( prural ) + " = function( limit, start ){\n"
        + "  return new Promise( async ( resolve, reject ) => {\n"
        + "    if( pg ){\n"
        + "      var conn = await pg.connect();\n"
        + "      if( conn ){\n"
        + "        try{\n"
        + "          var sql = 'select * from " + prural + " order by updated';\n"
        + "          if( limit ){\n"
        + "            sql += ' limit ' + limit;\n"
        + "          }\n"
        + "          if( offset ){\n"
        + "            sql += ' start ' + offset;\n"
        + "          }\n"
        + "          var query = { text: sql, values: [] };\n"
        + "          conn.query( query, function( err, result ){\n"
        + "            if( err ){\n"
        + "              console.log( err );\n"
        + "        l     resolve( { status: false, error: err } );\n"
        + "            }else{\n"
        + "              resolve( { status: true, results: result.rows } );\n"
        + "            }\n"
        + "          });\n"
        + "        }catch( e ){\n"
        + "          console.log( e );\n"
        + "          resolve( { status: false, error: err } );\n"
        + "        }finally{\n"
        + "          if( conn ){\n"
        + "            conn.release();\n"
        + "          }\n"
        + "        }\n"
        + "      }else{\n"
        + "        resolve( { status: false, error: 'no connection.' } );\n"
        + "      }\n"
        + "    }else{\n"
        + "      resolve( { status: false, error: 'db not ready.' } );\n"
        + "    }\n"
        + "  });\n"
        + "};\n\n"
  
        + "api.update" + capitalize( singular ) + " = function( " + singular + " ){\n"
        + "  return new Promise( async ( resolve, reject ) => {\n"
        + "    if( pg ){\n"
        + "      var conn = await pg.connect();\n"
        + "      if( conn ){\n"
        + "        try{\n"
        + "          if( !" + singular + ".id ){\n"
        + "            resolve( { status: false, error: 'no id.' } );\n"
        + "          }else{\n"
        + "            var sql = 'update " + prural + " set name = $1, updated = $2 where id = $3';\n"
        + "            var t = ( new Date() ).getTime();\n"
        + "            var query = { text: sql, values: [ " + singular + ".name, t, " + singular + ".id ] };\n"
        + "            conn.query( query, function( err, result ){\n"
        + "              if( err ){\n"
        + "                console.log( err );\n"
        + "                resolve( { status: false, error: err } );\n"
        + "              }else{\n"
        + "                resolve( { status: true, result: result } );\n"
        + "              }\n"
        + "            });\n"
        + "          }\n"
        + "        }catch( e ){\n"
        + "          console.log( e );\n"
        + "          resolve( { status: false, error: err } );\n"
        + "        }finally{\n"
        + "          if( conn ){\n"
        + "            conn.release();\n"
        + "          }\n"
        + "        }\n"
        + "      }else{\n"
        + "        resolve( { status: false, error: 'no connection.' } );\n"
        + "      }\n"
        + "    }else{\n"
        + "      resolve( { status: false, error: 'db not ready.' } );\n"
        + "    }\n"
        + "  });\n"
        + "};\n\n"
  
        + "api.delete" + capitalize( singular ) + " = function( " + singular + "_id ){\n"
        + "  return new Promise( async ( resolve, reject ) => {\n"
        + "    if( pg ){\n"
        + "      var conn = await pg.connect();\n"
        + "      if( conn ){\n"
        + "        try{\n"
        + "          var sql = 'delete from " + prural + " where id = $1';\n"
        + "          var query = { text: sql, values: [ " + singular + "_id ] };\n"
        + "          conn.query( query, function( err, result ){\n"
        + "            if( err ){\n"
        + "              console.log( err );\n"
        + "              resolve( { status: false, error: err } );\n"
        + "            }else{\n"
        + "              resolve( { status: true, result: result } );\n"
        + "            }\n"
        + "          });\n"
        + "        }catch( e ){\n"
        + "          console.log( e );\n"
        + "          resolve( { status: false, error: err } );\n"
        + "        }finally{\n"
        + "          if( conn ){\n"
        + "            conn.release();\n"
        + "          }\n"
        + "        }\n"
        + "      }else{\n"
        + "        resolve( { status: false, error: 'no connection.' } );\n"
        + "      }\n"
        + "    }else{\n"
        + "      resolve( { status: false, error: 'db not ready.' } );\n"
        + "    }\n"
        + "  });\n"
        + "};\n\n"
  
        + "api.delete" + capitalize( prural ) + " = async function(){\n"
        + "  return new Promise( async ( resolve, reject ) => {\n"
        + "    if( pg ){\n"
        + "      var conn = await pg.connect();\n"
        + "      if( conn ){\n"
        + "        try{\n"
        + "          var sql = 'delete from " + prural + "';\n"
        + "          var query = { text: sql, values: [] };\n"
        + "          conn.query( query, function( err, result ){\n"
        + "            if( err ){\n"
        + "              console.log( err );\n"
        + "              resolve( { status: false, error: err } );\n"
        + "            }else{\n"
        + "              resolve( { status: true, result: result } );\n"
        + "            }\n"
        + "          });\n"
        + "        }catch( e ){\n"
        + "          console.log( e );\n"
        + "          resolve( { status: false, error: err } );\n"
        + "        }finally{\n"
        + "          if( conn ){\n"
        + "            conn.release();\n"
        + "          }\n"
        + "        }\n"
        + "      }else{\n"
        + "        resolve( { status: false, error: 'no connection.' } );\n"
        + "      }\n"
        + "    }else{\n"
        + "      resolve( { status: false, error: 'db not ready.' } );\n"
        + "    }\n"
        + "  });\n"
        + "};\n\n";
      }
  }

  return crud;
}

function generateDbCode( database_url ){
  var dbcode = '';

  if( !database_url ){
    dbcode = "var db = {};\n\n";
  }else{
    if( database_url.indexOf( "mysql" ) > -1 ){
      dbcode = "var Mysql = require( 'mysql' ),\n"
        + "    mysql = Mysql.createPool( '" + database_url + "' );\n\n"
        + "mysql.on( 'error', function( err ){\n"
        + "  console.log( 'error on working', err );\n"
        + "  if( err.code && err.code.startsWith( '5' ) ){\n"
        + "    try_reconnect( 1000 );\n"
        + "  }\n"
        + "});\n\n"
        + "function try_reconnect( ts ){\n"
        + "  setTimeout( function(){\n"
        + "    console.log( 'reconnecting...' );\n"
        + "    mysql = Mysql.createPool( database_url );\n"
        + "    mysql.on( 'error', function( err ){\n"
        + "      console.log( 'error on retry(' + ts + ')', err );\n"
        + "      if( err.code && err.code.startsWith( '5' ) ){\n"
        + "        ts = ( ts < 10000 ? ( ts + 1000 ) : ts );\n"
        + "        try_reconnect( ts );\n"
        + "      }\n"
        + "    });\n"
        + "  }, ts );\n"
        + "}\n\n";
    }else if( database_url.indexOf( "postgres" ) > -1 ){
      dbcode = "var PG = require( 'pg' );\n"
        + "var pg = null;\n"
        + "pg = new PG.Pool({\n"
        + "  connectionString: '" + database_url + "',\n"
        + "  idleTimeoutMillis: ( 3 * 86400 * 1000 )\n"
        + "});\n"
        + "pg.on( 'error', function( err ){\n"
        + "  console.log( 'error on working', err );\n"
        + "  if( err.code && err.code.startsWith( '5' ) ){\n"
        + "     try_reconnect( 1000 );\n"
        + "  }\n"
        + "});\n\n"
        + "function try_reconnect( ts ){\n"
        + "  setTimeout( function(){\n"
        + "    console.log( 'reconnecting...' );\n"
        + "    pg = new PG.Pool({\n"
        + "      connectionString: '" + database_url + "',\n"
        + "      idleTimeoutMillis: ( 3 * 86400 * 1000 )\n"
        + "    });\n"
        + "    pg.on( 'error', function( err ){\n"
        + "      console.log( 'error on retry(' + ts + ')', err );\n"
        + "      if( err.code && err.code.startsWith( '5' ) ){\n"
        + "        ts = ( ts < 10000 ? ( ts + 1000 ) : ts );\n"
        + "        try_reconnect( ts );\n"
        + "      }\n"
        + "    });\n"
        + "  }, ts );\n"
        + "}\n\n";
    }else if( database_url.indexOf( "redis" ) > -1 ){
      dbcode = "var request = require( 'request' );\n"
        + "var redisClient = redis.createClient( database_url, {} );\n"
        + "console.log( 'redis connected' );\n"
        + "redisClient.on( 'error', function( err ){\n"
        + "  console.error( 'on error redis', err );\n"
        + "  try_reconnect( 1000 );\n"
        + "});\n\n"
        + "function try_reconnect( ts ){\n"
        + "  setTimeout( function(){\n"
        + "    console.log( 'reconnecting...' );\n"
        + "    redisClient = redis.createClient( database_url, {} );\n"
        + "    redisClient.on( 'error', function( err ){\n"
        + "      console.error( 'on error redis', err );\n"
        + "      ts = ( ts < 10000 ? ( ts + 1000 ) : ts );\n"
        + "      try_reconnect( ts );\n"
        + "    });\n"
        + "  }, ts );\n"
        + "}\n\n";
    }
  }

  return dbcode;
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
