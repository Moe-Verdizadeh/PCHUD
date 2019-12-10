var app = {
    SERVICE_URL: "https://testappapi.palletconnect.com/api/",
    pages: [ 'home' , 'screen_selection' , 'warehouse_screen' , "manager_screen" ],
    codeTimer: null,
    data: {
        token: null,
        app_id: null,
        code: null,
    },
    navigate: function( page , object ){
        if( typeof( object ) === "undefined" ){
            object = {};
        }
        $.templates[ page ].link( "#app", object );
        if( typeof( window[ page ] ) === "function" ){
            window[ page ]();
        } 
    },
    // Application Constructor
    initialize: function() {
        if( typeof( cordova ) !== "undefined" ){
            document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
        }else{
            $( document ).ready( app.onDeviceReady );
        }
    }, 
    // device ready Event Handler 
    // Bind any cordova events here. Common events are:
    // 'pause', 'resume', etc.
    onDeviceReady: function() {
        socketHelper.connect( function(){
            console.log( "We are connected and ready to go." );
            $.each( app.pages , function( ind , page ){
                app.lazyGetTemplate( page ).then( function( pageLoaded ){
                    console.log( pageLoaded + " Was loaded into the $.templates" );
                    if( pageLoaded == "home" ){
                        app.navigate( "home" , app.data );
                    }
                });
            });
        });
    },
    lazyGetTemplate: function(name) {
        console.log( "WE ARE FETCHING A TEMPLATE ( " + name + ")" );
        var deferred = $.Deferred();
        if ( $.templates[ name ] ) { 
            console.log( "IT WAS ALREADY LOADED, JUST RESOLVE THE PROMISE" );
            deferred.resolve( name );
        } else { 
            console.log( "LOAD " + name + " into $.templates" );
            $.getScript( "pages/" + name + ".js" ).then(function() { 
                $.ajax( {
                    url : "pages/" + name + ".html" , 
                    success: function( content ){
                        $.templates( name , content ); 
                        deferred.resolve( name ); 
                    }
                });
            });
        }
        return deferred.promise();
    }
};

app.initialize();

var socketHelper = {
    pusher: null,
    connect: function( callback ){ 
        socketHelper.pusher = new Pusher( "2d5761b92c6087a05b95" , {
            cluster: "us2"
            //2d5761b92c6087a05b95 // TEST
            //927b44b96dbff529ff88 // DEV
        });   
        socketHelper.pusher.connection.bind( 'connecting'    ,  socketHelper.connecting );
        socketHelper.pusher.connection.bind( 'connected'     ,  callback );
        // socketHelper.data_channel = pusher.subscribe( 'hud_app_data.RAND' );
        //when verified token and id 
    },
    connecting: function(){
        console.log( "Waiting for connection..." );
    },
    closed: function( close ){
        console.log( "Close socket: ", close.code, close.reason);
    },
    error: function( error ){
        alert( "SOMETHING BROKE, PLEASE CHECK YOUR CONNECTION AND RESTART THE APP" );
    },
}