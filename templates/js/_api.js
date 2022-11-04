//. api.js
var API_SERVER = 'http://localhost:8081';


function createSingle( singular, single_data ){
  return new Promise( ( resolve, reject ) => {
    $.ajax({
      type: 'POST',
      url: API_SERVER + '/api/' + singular,
      contentType: 'application/json',
      dataType: 'json',
      data: JSON.stringify( single_data ),
      success: function( result ){
        resolve( result );
      },
      error: function( e0, e1, e2 ){
        reject( e0 );
      }
    });
  });
}

function createMulti( prural, array_data ){
  return new Promise( ( resolve, reject ) => {
    $.ajax({
      type: 'POST',
      url: API_SERVER + '/api/' + prural,
      contentType: 'application/json',
      dataType: 'json',
      data: JSON.stringify( array_data ),
      success: function( result ){
        resolve( result );
      },
      error: function( e0, e1, e2 ){
        reject( e0 );
      }
    });
  });
}

function readSingle( singular, id ){
  return new Promise( ( resolve, reject ) => {
    $.ajax({
      type: 'GET',
      url: API_SERVER + '/api/' + singular + '/' + id,
      success: function( result ){
        resolve( result );
      },
      error: function( e0, e1, e2 ){
        reject( e0 );
      }
    });
  });
}

function readMulti( prural, limit, start ){
  return new Promise( ( resolve, reject ) => {
    $.ajax({
      type: 'GET',
      url: API_SERVER + '/api/' + prural + '?limit=' + limit + '&start=' + start,
      success: function( result ){
        resolve( result );
      },
      error: function( e0, e1, e2 ){
        reject( e0 );
      }
    });
  });
}

function updateSingle( singular, single_data ){
  return new Promise( ( resolve, reject ) => {
    $.ajax({
      type: 'PUT',
      url: API_SERVER + '/api/' + singular + '/' + singular.id,
      contentType: 'application/json',
      dataType: 'json',
      data: JSON.stringify( single_data ),
      success: function( result ){
        resolve( result );
      },
      error: function( e0, e1, e2 ){
        reject( e0 );
      }
    });
  });
}

function deleteSingle( singular, id ){
  return new Promise( ( resolve, reject ) => {
    $.ajax({
      type: 'DELETE',
      url: API_SERVER + '/api/' + singular + '/' + id,
      success: function( result ){
        resolve( result );
      },
      error: function( e0, e1, e2 ){
        reject( e0 );
      }
    });
  });
}

function deleteMulti( prural ){
  return new Promise( ( resolve, reject ) => {
    $.ajax({
      type: 'DELETE',
      url: API_SERVER + '/api/' + prural,
      success: function( result ){
        resolve( result );
      },
      error: function( e0, e1, e2 ){
        reject( e0 );
      }
    });
  });
}

