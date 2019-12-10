function home(){
    if( typeof( localStorage.pallet_connect_hud_token ) === "undefined" ){
        $.ajax({
            url: app.SERVICE_URL + "code_generator",
            success: function( response ){
                app.codeTimer = setTimeout( home, response.validUntil - response.createdAt ); 
                $.observable( app.data ).setProperty( "code" , response.code );
                var app_codes_channel = socketHelper.pusher.subscribe( 'hud_app_codes.' + response.code  );
                    app_codes_channel.bind( 'verified', code_verified );
            },
            error: function( response ){
                console.log(response);
            }
        });  
    }else{
        app.token = localStorage.pallet_connect_hud_token;
        // maybe token needs to be renewed after 6 months


        var screen = "screen_selection"; 
        if( typeof( localStorage.pallet_connect_hud_lastScreen ) !== "undefined" ){
            app.navigate( localStorage.pallet_connect_hud_lastScreen );
        }
        app.navigate( screen );
    }
}

function code_verified( dataFromServer ) {
    console.info( dataFromServer );
    clearTimeout( app.codeTimer );
    var code = "" + app.data.code;
    $.observable( app.data ).setProperty( "code" , null );
    app.app_id                              = dataFromServer.app_id;
    app.token                               = dataFromServer.token;
    // localStorage.pallet_connect_hud_token   = app.token;  
    $.ajax({
        url: app.SERVICE_URL + "code_confirmed/" + code + "?app_id=" + dataFromServer.app_id + "&token=" + dataFromServer.token,
        success: function ( response ){
            console.log( "CODE CLEARED DATA RESPONSE " + response ); 
            setTimeout( function(){ app.navigate( "screen_selection" ); } , 1000 );
        },
        error: function( error ){
            console.log( "ERROR FETCHING DATA " + error );
        }
    })

}