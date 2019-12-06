
var app = {
    // Application Constructor
    initialize: function() {
        if( typeof( cordova ) !== "undefined" ){
            document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
        }else{
            $( document ).ready( app.onDeviceReady );
        }
    },

    // deviceready Event Handler
    //
    // Bind any cordova events here. Common events are:
    // 'pause', 'resume', etc.
    onDeviceReady: function() {
        fetch_code();
    }
};

app.initialize();

var socketHandler = {

}
function fetch_code(){
    $.ajax({
        url: SERVICE_URL + "code_generator",
        success: function( response ){
            console.log( response );
            $( "#app_code" ).html( response.code );
            var pusher = new Pusher( "2d5761b92c6087a05b95" , {
                cluster: "us2"
                //2d5761b92c6087a05b95
                //927b44b96dbff529ff88
            });  
            pusher.connection.bind( 'initialized'    ,  socketHandler.init );
            pusher.connection.bind( 'connecting'    ,  socketHandler.connecting );
            pusher.connection.bind( 'connected'     ,  socketHandler.connected );
            // Pusher.connection.bind( 'disconnected'  ,  socketHandler.closed ); 
            // Pusher.connection.bind( 'failed',  socketHandler.error ); 
            socketHandler.app_codes_channel = pusher.subscribe( 'hud_app_codes.' + response.code );
            socketHandler.data_channel = pusher.subscribe( 'hud_app_data.RAND' );
            socketHandler.app_codes_channel.bind( 'verified', socketHandler.codeVerified );
        },
        error: function( response ){

        }
    })
}