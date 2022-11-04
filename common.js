//. common.js
var fs = require( 'fs' );

//. 環境変数
var DATABASE_URL = 'DATABASE_URL' in process.env && process.env.DATABASE_URL ? process.env.DATABASE_URL : '';
var LIST_SIZE = 'LIST_SIZE' in process.env && process.env.LIST_SIZE ? parseInt( process.env.LIST_SIZE ) : 5;
var filename = 'MERMAID' in process.env && process.env.MERMAID ? process.env.MERMAID : 'mermaid_sample.md';
var base = 'BASE' in process.env && process.env.BASE ? process.env.BASE : 'bootstrap';

class __common{
  constructor( filename, out ){
    this.filename = filename;
    this.out = out;
    this.lines = fs.readFileSync( filename, 'UTF-8' );
    this.lines = this.lines.split( "\n" );

    this.nodes = [];
    this.arrows = [];
    this.appname = filename;
    var tmp = filename.lastIndexOf( '.' );
    if( tmp > 0 ){
      this.appname = filename.substr( 0, tmp );
    }

    for( var i = 0; i < this.lines.length; i ++ ){
      this.lines[i] = this.lines[i].trim();
      if( this.lines[i].endsWith( ';' ) ){
        this.lines[i] = this.lines[i].substring( 0, this.lines[i].length - 1 );
      }

      var n1 = this.lines[i].indexOf( '--"' );
      var n2 = this.lines[i].indexOf( '"-->' );
      if( n1 > -1 && n2 > n1 ){
        var tmp1 = this.lines[i].substring( 0, n1 ).trim();
        var tmp2 = this.lines[i].substring( n1 + 3, n2 ).trim();
        var tmp3 = this.lines[i].substring( n2 + 4 ).trim();
    
        //. id["name"] (from)
        var from_id = tmp1;
        var from_name = '';
        n1 = tmp1.indexOf( '["' );
        n2 = tmp1.indexOf( '"]' );
        if( n1 > -1 && n2 > n1 + 2 ){
          from_id = tmp1.substring( 0, n1 );
          from_name = tmp1.substring( n1 + 2, n2 );
        }
        if( !this.registeredId( this.nodes, from_id ) ){
          this.nodes.push( { id: from_id, name: from_name } );
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
        if( !this.registeredId( this.nodes, to_id ) ){
          this.nodes.push( { id: to_id, name: to_name } );
        }

        //. --"name"-->
        var name = tmp2;
        this.arrows.push( { name: name, from: from_id, to: to_id } );
      }
    }
  }

  capitalize = function( str ){
	  if( typeof str !== 'string' || !str ) return str;
	  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  getAppname = function( filename ){
    var appname = filename;
    var tmp = filename.lastIndexOf( '.' );
    if( tmp > 0 ){
      appname = filename.substr( 0, tmp );
    }

    return appname;
  }

  registeredId = function( arr, id ){
    var r = false;
    for( var i = 0; i < arr.length && !r; i ++ ){
      r = ( arr[i].id == id );
    }

    return r;
  }

  registeredName = function( arr, name ){
    var r = false;
    for( var i = 0; i < arr.length && !r; i ++ ){
      r = ( arr[i].name == name );
    }

    return r;
  }

  generateRoute = function( path, _title, _links, is_list, appname ){
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

      route += "  var _records = " + this.stringifyArray( list ) + ";\n\n"
        + '  res.render( "' + _names + '", { _title: "' + _title + '", _name: "' + _names + '", _records: _records, _links: ' + this.stringifyArray( _links ) + ', _appname: appname } );\n'
        + '});\n\n';
    }else if( path.endsWith( '/:id' ) ){
      //. 詳細ページ
      var tmp = path.split( '/' );
      var _name = tmp[1];
      _record = { name: _name, description: _name + ' ' + _name };

      route += "  var _id = req.params.id;\n"
        + "  var _record = " + JSON.stringify( _record ) + ";\n\n"
        + '  res.render( "' + _name + '", { _id: _id, _title: "' + _title + '", _name: "' + _name + '", _record : _record, _links: ' + this.stringifyArray( _links ) + ', _appname: appname } );\n'
        + "});\n\n";
    }else if( path == '/' ){
      //. トップページ
      route += '  res.render( "index", { _title: "' + _title + '", _name: "index", _links: ' + this.stringifyArray( _links ) + ', _appname: appname } );\n'
        + "});\n\n";
    }else{
      //. それ以外のページ
      var _name = path.substring( 1, path.length );
      route += '  res.render( "' + _name + '", { _title: "' + _title + '", _name: "' + _name + '", _links: ' + this.stringifyArray( _links ) + ', _appname: appname } );\n'
        + "});\n\n";
    }

    return route;
  }

  generateView = function( path, is_list, base ){
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

    this.ignoreException( fs.copyFileSync( './templates/views/' + base + '/' + template + '.ejs', this.out + '/views/' + name + '.ejs' ) );
    this.ignoreException( fs.copyFileSync( './templates/js/template.js', this.out + '/public/js/' + name + '.js' ) );
    this.ignoreException( fs.copyFileSync( './templates/css/template.css', this.out + '/public/css/' + name + '.css' ) );
  }

  generateTableDDL = function( path ){
    var prural = path.substr( 1 );
    var singular = prural.substr( 0, prural.length - 1 );

    var table_ddl = "/* " + prural + " */\n"
      + "drop table " + prural + ";\n"
      + "create table if not exists " + prural + " ( id varchar(50) not null primary key, name text default '', created bigint default 0, updated bigint default 0 );\n";

    return table_ddl;
  }

  generateSwaggerTag = function( path ){
    var prural = path.substr( 1 );
    var singular = prural.substr( 0, prural.length - 1 );

    var swagger_tag = "  - name: " + singular + "\n" 
      + "    description: " + this.capitalize( singular ) + " APIs\n";

    return swagger_tag;
  }

  generateSwaggerPath = function( path ){
    var prural = path.substr( 1 );
    var singular = prural.substr( 0, prural.length - 1 );

    var swagger_path = 
        "  /" + prural + ":\n" 
      + "    get:\n"
      + "      tags:\n"
      + "        - " + singular + "\n"
      + "      summary: GET " + this.capitalize( prural ) + "\n"
      + "      description: GET " + this.capitalize( prural ) + "\n"
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
      + "      summary: POST " + this.capitalize( prural ) + "\n"
      + "      description: POST " + this.capitalize( prural ) + "\n"
      + "      produces:\n"
      + "        - application/json\n"
      + "      parameters:\n"
      + "        - name: body\n"
      + "          in: body\n"
      + "          schema:\n"
      + "            $ref: '#/definitions/" + this.capitalize( prural ) + "Request'\n"
      + "      responses:\n"
      + "        '200':\n"
      + "          description: success\n"
      + "        '400':\n"
      + "          description: error\n"
  
      + "    delete:\n"
      + "      tags:\n"
      + "        - " + singular + "\n"
      + "      summary: DELETE " + this.capitalize( prural ) + "\n"
      + "      description: DELETE " + this.capitalize( prural ) + "\n"
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
      + "      summary: POST " + this.capitalize( singular ) + "\n"
      + "      description: POST " + this.capitalize( singular ) + "\n"
      + "      produces:\n"
      + "        - application/json\n"
      + "      parameters:\n"
      + "        - name: body\n"
      + "          in: body\n"
      + "          schema:\n"
      + "            $ref: '#/definitions/" + this.capitalize( singular ) + "Request'\n"
      + "      responses:\n"
      + "        '200':\n"
      + "          description: success\n"
      + "        '400':\n"
      + "          description: error\n"
  
      + "  /" + singular + "/{id}:\n"
      + "    get:\n"
      + "      tags:\n"
      + "        - " + singular + "\n"
      + "      summary: GET " + this.capitalize( singular ) + "/{id}\n"
      + "      description: GET " + this.capitalize( singular ) + "/{id}\n"
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
      + "      summary: PUT " + this.capitalize( singular ) + "/{id}\n"
      + "      description: PUT " + this.capitalize( singular ) + "/{id}\n"
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
      + "            $ref: '#/definitions/" + this.capitalize( singular ) + "Request'\n"
      + "      responses:\n"
      + "        '200':\n"
      + "          description: success\n"
      + "        '400':\n"
      + "          description: error\n"
  
      + "    delete:\n"
      + "      tags:\n"
      + "        - " + singular + "\n"
      + "      summary: DELETE " + this.capitalize( singular ) + "/{id}\n"
      + "      description: DELETE " + this.capitalize( singular ) + "/{id}\n"
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
  
  generateSwaggerDef = function( path ){
    var prural = path.substr( 1 );
    var singular = prural.substr( 0, prural.length - 1 );
  
    var swagger_def = "  " + this.capitalize( singular ) + "Request:\n" 
      + "    type: object\n"
      + "    properties:\n"
      + "      id:\n"
      + "        type: string\n"
      + "        description: id\n"
      + "      name:\n"
      + "        type: string\n"
      + "        description: name\n"
      + "  " + this.capitalize( prural ) + "Request:\n"
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
  
  
  generateApiRoute = function( path ){
    var prural = path.substr( 1 );
    var singular = prural.substr( 0, prural.length - 1 );
  
    var route = "api.post( '/" + singular + "', async function( req, res ){\n"
      + "  res.contentType( 'application/json; charset=utf-8' );\n\n"
      + "  var " + singular + " = req.body;\n"
      + "  api.create" + this.capitalize( singular ) + "( " + singular + " ).then( function( result ){\n"
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
      + "  api.create" + this.capitalize( prural ) + "( " + prural + " ).then( function( result ){\n"
      + "    res.status( result.status ? 200 : 400 );\n"
      + "    res.write( JSON.stringify( result, null, 2 ) );\n"
      + "    res.end();\n"
      + "  });\n"
      + "});\n\n"
  
      + "api.get( '/" + singular + "/:id', async function( req, res ){\n"
      + "  res.contentType( 'application/json; charset=utf-8' );\n\n"
      + "  var " + singular + "_id = req.params.id;\n"
      + "  api.read" + this.capitalize( singular ) + "( " + singular + "_id ).then( function( result ){\n"
      + "    res.status( result.status ? 200 : 400 );\n"
      + "    res.write( JSON.stringify( result, null, 2 ) );\n"
      + "    res.end();\n"
      + "  });\n"
      + "});\n\n"
  
      + "api.get( '/" + prural + "', async function( req, res ){\n"
      + "  res.contentType( 'application/json; charset=utf-8' );\n\n"
      + "  var limit = req.query.limit ? parseInt( limit ) : 0;\n"
      + "  var offset = req.query.offset ? parseInt( offset ) : 0;\n"
      + "  api.read" + this.capitalize( prural ) + "( limit, offset ).then( function( results ){\n"
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
      + "  api.update" + this.capitalize( singular ) + "( " + singular + " ).then( function( result ){\n"
      + "    res.status( result.status ? 200 : 400 );\n"
      + "    res.write( JSON.stringify( result, null, 2 ) );\n"
      + "    res.end();\n"
      + "  });\n"
      + "});\n\n"
  
      + "api.delete( '/" + singular + "/:id', async function( req, res ){\n"
      + "  res.contentType( 'application/json; charset=utf-8' );\n\n"
      + "  var " + singular + "_id = req.params.id;\n"
      + "  api.delete" + this.capitalize( singular ) + "( " + singular + "_id ).then( function( result ){\n"
      + "    res.status( result.status ? 200 : 400 );\n"
      + "    res.write( JSON.stringify( result, null, 2 ) );\n"
      + "    res.end();\n"
      + "  });\n"
      + "});\n\n"
  
      + "api.delete( '/" + prural + "', function( req, res ){\n"
      + "  res.contentType( 'application/json; charset=utf-8' );\n\n"
      + "  api.delete" + this.capitalize( prural ) + "().then( function( result ){\n"
      + "    res.status( result.status ? 200 : 400 );\n"
      + "    res.write( JSON.stringify( result, null, 2 ) );\n"
      + "    res.end();\n"
      + "  });\n"
      + "});\n\n";
  
    return route;
  }
  
  generateApiCRUD = function( path, database_url ){
    var prural = path.substr( 1 );
    var singular = prural.substr( 0, prural.length - 1 );
    var crud = "";
  
    if( !database_url ){
      crud = "api.create" + this.capitalize( singular ) + " = function( " + singular + " ){\n"
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
  
        + "api.create" + this.capitalize( prural ) + " = function( " + prural + " ){\n"
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
  
        + "api.read" + this.capitalize( singular ) + " = function( " + singular + "_id ){\n"
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
  
        + "api.read" + this.capitalize( prural ) + " = function( limit, start ){\n"
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
  
        + "api.update" + this.capitalize( singular ) + " = function( " + singular + " ){\n"
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
  
        + "api.delete" + this.capitalize( singular ) + " = function( " + singular + "_id ){\n"
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
  
        + "api.delete" + this.capitalize( prural ) + " = async function(){\n"
        + "  return new Promise( async ( resolve, reject ) => {\n"
        + "    db = {};\n"
        + "    resolve( { status: true } );\n"
        + "  });\n"
        + "};\n\n";
    }else{
      if( database_url.indexOf( "mysql" ) > -1 ){
        crud = "api.create" + this.capitalize( singular ) + " = function( " + singular + " ){\n"
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
    
          + "api.create" + this.capitalize( prural ) + " = function( " + prural + " ){\n"
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
    
          + "api.read" + this.capitalize( singular ) + " = function( " + singular + "_id ){\n"
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
    
          + "api.read" + this.capitalize( prural ) + " = function( limit, start ){\n"
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
    
          + "api.update" + this.capitalize( singular ) + " = function( " + singular + " ){\n"
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
    
          + "api.delete" + this.capitalize( singular ) + " = function( " + singular + "_id ){\n"
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
    
          + "api.delete" + this.capitalize( prural ) + " = async function(){\n"
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
        crud = "api.create" + this.capitalize( singular ) + " = function( " + singular + " ){\n"
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
    
          + "api.create" + this.capitalize( prural ) + " = function( " + prural + " ){\n"
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
    
          + "api.read" + this.capitalize( singular ) + " = function( " + singular + "_id ){\n"
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
    
          + "api.read" + this.capitalize( prural ) + " = function( limit, start ){\n"
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
          + "              resolve( { status: false, error: err } );\n"
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
  
  generateDbCode = function( database_url ){
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
  
  stringifyArray = function( arr ){
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

  ignoreException = function( func ){
    try{
      func;
    }catch( e ){
    }
  }

  mkdirIfNotExisted = function( dir ){
    if( !fs.existsSync( dir ) ){
      fs.mkdirSync( dir );
    }
  }
};

module.exports = __common;
