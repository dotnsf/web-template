//. api.js
var fs = require( 'fs' );
var Common = require( './common' );

//. データベースURL
var DATABASE_URL = 'DATABASE_URL' in process.env && process.env.DATABASE_URL ? process.env.DATABASE_URL : '';
//. マーメイドファイル
var filename = 'MERMAID' in process.env && process.env.MERMAID ? process.env.MERMAID : 'mermaid_sample.md';
//. 出力先
var out = 'api';

var common = new Common( filename, out );

//. フォルダ作成
common.mkdirIfNotExisted( out + '/api' );
common.mkdirIfNotExisted( out + '/public' );
common.mkdirIfNotExisted( out + '/public/_doc' );

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
var dbcode = common.generateDbCode( DATABASE_URL );
db += dbcode;

var appname = common.getAppname( filename );

//. swagger
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

//. ddl
var ddl = "";

for( var i = 0; i < common.nodes.length; i ++ ){
  var node = common.nodes[i];
  var path = null;
  for( var j = 0; j < common.arrows.length && !path; j ++ ){
    if( common.arrows[j].to == node.id ){
      path = common.arrows[j].name;
    }
  }

  //. 一覧ページか？
  var is_list = false;
  if( path && path.endsWith( 's' ) ){
    var tmp = path.substr( 0, path.length - 1 ) + '/:id';
    for( var j = 0; j < common.arrows.length && !is_list; j ++ ){
      if( common.arrows[j].from == node.id && common.arrows[j].name == tmp ){
        is_list = true;
      }
    }
  }

  if( is_list ){
    var crud = common.generateApiCRUD( path, DATABASE_URL );
    db += crud;
    var route = common.generateApiRoute( path );
    db += route;

    //. swagger.yaml
    var swagger_tag = common.generateSwaggerTag( path );
    swagger_tags += swagger_tag;
    var swagger_path = common.generateSwaggerPath( path );
    swagger_paths += swagger_path;
    var swagger_def = common.generateSwaggerDef( path );
    swagger_defs += swagger_def;

    //. DDL
    var table_ddl = common.generateTableDDL( path );
    ddl += table_ddl;
  }
}

//. app.js
app += "\nvar port = process.env.PORT || 8081;\n"
  + "app.listen( port );\n"
  + "console.log( 'server starting on ' + port + ' ...' );\n\n";
common.ignoreException( fs.writeFileSync( out + '/app.js', app ) );

//. DDL
common.ignoreException( fs.writeFileSync( out + '/' + appname + ".ddl", ddl ) );

//. db.js
db += "\nmodule.exports = api;\n\n";
common.ignoreException( fs.writeFileSync( out + '/api/db.js', db ) );

//. swagger.yaml
swagger += swagger_tags;
swagger += swagger_paths;
swagger += swagger_defs;
common.ignoreException( fs.writeFileSync( out + '/public/_doc/swagger.yaml', swagger ) );

//. Swagger files
common.ignoreException( fs.copyFileSync( './templates/_doc/favicon-16x16.png', out + '/public/_doc/favicon-16x16.png' ) );
common.ignoreException( fs.copyFileSync( './templates/_doc/favicon-32x32.png', out + '/public/_doc/favicon-32x32.png' ) );
common.ignoreException( fs.copyFileSync( './templates/_doc/index.html', out + '/public/_doc/index.html' ) );
common.ignoreException( fs.copyFileSync( './templates/_doc/oauth2-redirect.html', out + '/public/_doc/oauth2-redirect.html' ) );
common.ignoreException( fs.copyFileSync( './templates/_doc/swagger-ui-bundle.js', out + '/public/_doc/swagger-ui-bundle.js' ) );
common.ignoreException( fs.copyFileSync( './templates/_doc/swagger-ui-bundle.js.map', out + '/public/_doc/swagger-ui-bundle.js.map' ) );
common.ignoreException( fs.copyFileSync( './templates/_doc/swagger-ui-standalone-preset.js', out + '/public/_doc/swagger-ui-standalone-preset.js' ) );
common.ignoreException( fs.copyFileSync( './templates/_doc/swagger-ui-standalone-preset.js.map', out + '/public/_doc/swagger-ui-standalone-preset.js.map' ) );
common.ignoreException( fs.copyFileSync( './templates/_doc/swagger-ui.css', out + '/public/_doc/swagger-ui.css' ) );
common.ignoreException( fs.copyFileSync( './templates/_doc/swagger-ui.css.map', out + '/public/_doc/swagger-ui.css.map' ) );
common.ignoreException( fs.copyFileSync( './templates/_doc/swagger-ui.js', out + '/public/_doc/swagger-ui.js' ) );
common.ignoreException( fs.copyFileSync( './templates/_doc/swagger-ui.js.map', out + '/public/_doc/swagger-ui.js.map' ) );
common.ignoreException( fs.copyFileSync( './templates/_doc/api_index.html', out + '/public/index.html' ) );

//. web package
common.ignoreException( fs.copyFileSync( './templates/.gitignore', out + '/.gitignore' ) );
common.ignoreException( fs.copyFileSync( './templates/package.json.api', out + '/package.json' ) );
common.ignoreException( fs.copyFileSync( filename, out + '/README.md' ) );

