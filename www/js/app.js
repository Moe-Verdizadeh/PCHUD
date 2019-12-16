var app = {
    SERVICE_URL: "https://testappapi.palletconnect.com/api/",
    pages: [ 'home' , 'screen_selection' , 'warehouse_screen' , "manager_screen"  ],
    templates: [ 'warehouse_pending_card' , 'warehouse_summary_card' ],
    codeTimer: null,
    refreshTimer: null,
    nextRefresh: 0,
    data: {
        code: null,
        warehouse: { pending_transactions : { rows: [] } , summary: [] },
    },
    navigate: function( page , object ){
        if( typeof( object ) === "undefined" ){
            object = app.data;
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
            var screensToLoad = app.pages.length + app.templates.length;
            var loadedScreens = 0;

            $.each( app.templates , function( ind , page ){
                $.ajax( {
                    url : "templates/" + page + ".html" , 
                    success: function( content ){
                        $.templates( "template_" + page , content ); 
                        loadedScreens++; 
                        if( loadedScreens == screensToLoad ){
                            console.log( "There's No Place Like Home" );
                            app.navigate( "home" );
                        }
                    }
                });
            });

            $.each( app.pages , function( ind , page ){
                app.lazyGetTemplate( page ).then( function( pageLoaded ){
                    console.log( pageLoaded + " Was loaded into the $.templates" ); 
                    loadedScreens++; 
                    // console.log( loadedScreens , screensToLoad);
                    if( loadedScreens == screensToLoad ){
                        console.log( "There's No Place Like Home" );
                        app.navigate( "home" );
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
                        setTimeout( function(){
                            deferred.resolve( name ); 
                        } , 200 );
                    }
                });
            });
        }
        return deferred.promise();
    }
};

app.initialize();


function setAjaxHeaders(){ 
    $.ajaxSetup({ 
        beforeSend: function(xhr) {
            xhr.setRequestHeader( "Authorization"   , "Bearer: " + localStorage.pallet_connect_hud_token );
            xhr.setRequestHeader( "app-id"          , localStorage.pallet_connect_hud_app_id );
        }
    }); 
}

var socketHelper = {
    pusher: null,
    connect: function( callback ){ 
        socketHelper.pusher = new Pusher( "2d5761b92c6087a05b95" , {
            cluster: "us2"
            //2d5761b92c6087a05b95 // TEST
            //927b44b96dbff529ff88 // DEV
        });   
        socketHelper.pusher.connection.bind ( 'connecting'              ,  socketHelper.connecting );
        socketHelper.pusher.connection.bind ( 'connected'               ,  callback );
       
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



// an extension to format numbers
// call like this 
/*
    1234..format();           // "1,234"
    12345..format(2);         // "12,345.00"
    123456.7.format(3, 2);    // "12,34,56.700"
    123456.789.format(2, 4);  // "12,3456.79"
*/
Number.prototype.format = function(n, x) {
    var re = '\\d(?=(\\d{' + (x || 3) + '})+' + (n > 0 ? '\\.' : '$') + ')';
    return this.toFixed(Math.max(0, ~~n)).replace(new RegExp(re, 'g'), '$&,');
};