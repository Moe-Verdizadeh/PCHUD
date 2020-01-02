 /* 
 *     Copyright (C) 2019 Mohammad Khanverdizadeh  < MoKode >
 *     < www.mokode.ca >  
 *     Designed and developed for Pallet Pickup Canada (C)
 */
var app = {
    SERVICE_URL: "https://appapi.palletconnect.com/api/",
    pages: [ 'home' , 'screen_selection' , 'warehouse_screen' , 'warehouse_selection' , "manager_screen"  ],
    templates: [ 'warehouse_pending_card' , 'warehouse_summary_card' , 'manager_variations_card' , 'manager_piechart' , 'manager_summary_card' , 'weather' ],
    codeTimer: null,
    refreshTimer: null,
    transactionsChannel: null,
    nextRefresh: 0, 
    units: "metric",
    data: {
        weather: { loading: true },
        current_time: 0,
        current_date: 0,
        code: null,
        warehouse:  { pending_transactions : { rows: [] } }, 
        manager: { piecharts: [], variationSummary: { rows: [] } },
        summary: [] ,
    },
    pageRefresh: function( timeInMinutes , callback ){
        if( app.refreshTimer !== null ){
            clearTimeout( app.refreshTimer );
        }
        app.nextRefresh = new Date().getTime() + timeInMinutes * 60000;
        app.refreshTimer = setTimeout( callback , app.nextRefresh );
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
// setTimeout( function(){
            app.set_location().then( app.set_current_weather );
// },3000);
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
    },
    logout: function(){
        localStorage.clear();
        app.navigate( "home" );  
   },
   set_location: function(){    
       console.log( "SET THE LOCATION..." );
        return  new Promise(
        function( resolve, reject ){ 
                    navigator.geolocation.getCurrentPosition( function( response ){
                        app.geoLocation = response.coords;
                        console.log( "geolocation" , response.coords );
                        resolve();
                    })
                }); 
    }, 
    set_current_weather: function(){ 
        if( typeof( app.geoLocation ) !== "undefined" ){ 
            $.ajax({
                dataType: "jsonp",
                url:  'https://api.openweathermap.org/data/2.5/weather',
                data: {
                    lat: app.geoLocation.latitude,
                    lon: app.geoLocation.longitude,
                    units: app.units,
                    APPID: 'a8c479f116d01420795531e3ffe354b6'
                },
                success: function( response ){  
                    $.observable( app.data ).setProperty( "city_name" , response.name );  
                    $.observable( app.data.weather ).setProperty( "current_temp"        , response.main.temp.toFixed(0) ); 
                    $.observable( app.data.weather ).setProperty( "feels_like"          , response.main.feels_like.toFixed(0) ); 
                    $.observable( app.data.weather ).setProperty( "temp_max"            , response.main.temp_max.toFixed(0) ); 
                    $.observable( app.data.weather ).setProperty( "temp_min"            , response.main.temp_min.toFixed(0) ); 
                    $.observable( app.data.weather ).setProperty( "weather_id"          , response.weather[0].id );   
                    $.observable( app.data.weather ).setProperty( "icon"                , response.weather[0].icon );  
                    $.observable( app.data.weather ).setProperty( "icon_src"            , 'http://openweathermap.org/img/wn/' + response.weather[0].icon + '@2x.png'  );  
                    
                    $.observable( app.data.weather ).setProperty( "weather_description" , response.weather[0].description ); 
                    $.observable( app.data.weather ).setProperty( "loading"        , false ); 
                    console.log( "Current Weather" , response );
                },
                error: function( error ){
                    console.log( "ERROR FETCHING DATA " + error );
                },
            });
            setInterval( app.set_current_weather , 600000 ); 
        }
    }
}; 
app.initialize();

function isToday( dateToCheck){ 
    return new Date( dateToCheck ).getDate()  === new Date().getDate() ; 
}
function isThisMonth( dateToCheck ){ 
    return new Date( dateToCheck ).getMonth()  === new Date().getMonth() ; 
}

function fetchTransaction( id , callback ){
    $.ajax({
        url: app.SERVICE_URL + "transactions/" + id, 
        success: function( response ){  
            callback( response );
        }
    });
} 
 

var currentMoment;
function clock(){  
    if( typeof(m) === "undefined" ){
        currentMoment = new moment();
    } 
    $.observable( app.data ).setProperty( "current_date" ,  currentMoment.format("MMM Do") ); 
    $.observable( app.data ).setProperty( "current_time" ,  currentMoment.format("h:mm A") ); 
    currentMoment.add( 1 , 'seconds' );
} 
setInterval( clock , 1000 );

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
        socketHelper.pusher = new Pusher( "d40605f5f27a0a317fc8" , {
            cluster: "us2"
            //2d5761b92c6087a05b95 // TEST
            //927b44b96dbff529ff88 // DEV
            //d40605f5f27a0a317fc8 // PRODUCTION
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