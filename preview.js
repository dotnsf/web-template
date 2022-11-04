//. preview.js
var express = require( 'express' ),
    ejs = require( 'ejs' ),
    fs = require( 'fs' ),
    app = express();

//. マーメイドファイル
var filename = 'MERMAID' in process.env && process.env.MERMAID ? process.env.MERMAID : 'mermaid_sample.md';

app.use( express.Router() );
app.set( 'views', __dirname + '/templates/views' );
app.set( 'view engine', 'ejs' );

app.get( '/', function( req, res ){
  try{
    var filepath = __dirname + '/' + filename;
    //. #30, #31
    fs.stat( filepath, function( err, stat ){
      if( err ){
        if( err.code == 'ENOENT' ){
          //. ファイルが存在していない
          res.render( 'preview', { file: null, error: 'no file exists: ' + filepath } );
        }else{
          res.render( 'preview', { file: null, error: JSON.stringify( err, null, 2 ) } );
        }
      }else{
        if( stat.isFile() ){
          fs.readFile( filepath, { encoding: 'utf8' }, function( err, file ){
            if( err ){
              console.log( err );
              res.render( 'preview', { file: null, error: JSON.stringify( err, null, 2 ) } );
            }else{
              file = file.split( '```mermaid' ).join( '<div class="mermaid">' );
              file = file.split( '```' ).join( '</div>' );

              res.render( 'preview', { file: file, error: '' } );
            }
          });
        }else{
          res.render( 'preview', { file: null, error: 'not file.' } );
        }
      }
    });
  }catch( e ){
    console.log( e );
    res.render( 'preview', { file: null, error: JSON.stringify( e, null, 2 ) } );
  }
});


var port = process.env.PORT || 8000;
app.listen( port );
console.log( "server starting on " + port + " ..." );
