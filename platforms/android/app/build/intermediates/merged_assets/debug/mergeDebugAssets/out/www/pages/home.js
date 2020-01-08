function home(){
    if( typeof( localStorage.pallet_connect_hud_token ) === "undefined" ){
        $.ajax({
            url: config.SERVICE_URL + "code_generator",
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
        setAjaxHeaders();
        // maybe token needs to be renewed after 6 months
        var screen = "screen_selection"; 
        if( typeof( localStorage.pallet_connect_hud_lastScreen ) !== "undefined" ){
            screen =  localStorage.pallet_connect_hud_lastScreen;
        } 
        app.navigate( screen );
        console.log( "GO TO " + screen ); 
    }
}

function code_verified( dataFromServer ) { 
    clearTimeout( app.codeTimer ); 
    localStorage.pallet_connect_hud_app_id  = dataFromServer.app_id;
    localStorage.pallet_connect_hud_token   = dataFromServer.token;  
    localStorage.pallet_connect_hud_site    = dataFromServer.site;
    setAjaxHeaders();
    $.ajax({
        url: config.SERVICE_URL + "code_confirmed/" + app.data.code,
        success: function ( response ){
            console.log( "CODE CLEARED DATA RESPONSE " + response ); 
            setTimeout( function(){ app.navigate( "screen_selection" ); } , 1000 );
        },
        error: function( error ){
            console.log( "ERROR FETCHING DATA " + error );
        }
    });
    $.observable( app.data ).setProperty( "code" , null ); 
}