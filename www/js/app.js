 /* 
 *     Copyright (C) 2019 Mohammad Khanverdizadeh  < Pallet Connect >
 *     < www.palletconnect.com >  
 *     Designed and developed for Pallet Pickup Canada (C)
 */ 
var app = {  
    currentPage: '',
    codeTimer: null,
    refreshTimer: null,
    transactionsChannel: null,
    nextRefresh: 0, 
    data: {
        is_metric: typeof( localStorage.is_metric ) !== "undefined" ?  parseInt( localStorage.is_metric ) : 1,
        city: '',
        countryCode: '',
        weather: { loading: true },
        current_time: 0,
        current_date: 0,
        summary_date: 0,
        code: null,
        warehouse:  { pending_transactions : { rows: [] } }, 
        manager: { piecharts: [], variationSummary: { rows: [] } },
        settings: { city_list: [] },
        summary: [] ,
    },
    pageRefresh: function( timeInMinutes , callback ){ 
        if( app.refreshTimer !== null ){
            clearTimeout( app.refreshTimer );
        }
        var timeInMilliseconds = timeInMinutes * 60000;
        app.nextRefresh = new Date().getTime() + timeInMilliseconds;
        app.refreshTimer = setTimeout( callback , timeInMilliseconds );
    },
    navigate: function( page ){
        if( window.location.hash.substr(1) == page ){
            window.location = "";
        }
        window.location = "#" + page;
        // console.log( "navigate to : " , page );
        // app.currentPage = page;
        // if( window.location.hash.substr(1) == page ){
        //     $.templates[ page ].link( "#app", app.data );
        //     if( typeof( window[ page ] ) === "function" ){
        //         window[ page ]();
        //     } 
        // }else{
        //     window.location = "#" + page;
        // }
        // return false;  
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
            console.log( "App Loaded" );
            // app.navigate( "" );
            var screensToLoad = config.PAGE_FILES.length + config.TEMPLATE_FILES.length;
            var loadedScreens = 0;

            $.each( config.TEMPLATE_FILES , function( ind , page ){
                $.ajax( {
                    url : "templates/" + page + ".html" , 
                    success: function( content ){
                        $.templates( "template_" + page , content ); 
                        loadedScreens++; 
                        if( loadedScreens == screensToLoad ){
                            console.log( "Nav Home (1)" );
                            app.navigate( "home" );
                            // home();
                        }
                    }
                });
            });

            $.each( config.PAGE_FILES , function( ind , page ){
                app.lazyGetTemplate( page ).then( function( pageLoaded ){
                    // console.log( pageLoaded + " Was loaded into the $.templates" ); 
                    loadedScreens++; 
                    // console.log( loadedScreens , screensToLoad);
                    if( loadedScreens == screensToLoad ){
                        console.log( "Nav Home (2)" );
                        app.navigate( "home" );
                    }
                });
            });
            $.observe( app.data, "is_metric", function(){
                console.log( "is_metic changed" );
                localStorage.setItem( "is_metric" , app.data.is_metric );
                app.set_current_weather();
            });
            app.set_current_weather();
            // app.set_location().then( app.set_current_weather );
        });
 
        window.addEventListener("popstate", function () { 
            if (window.history.state !== "backhandler") {
                // put your back handler code here
                if( window.location.hash.substr(1) == app.currentPage ){ 
                    if( app.currentPage == "screen_selection" ){
                        if( confirm( "Are you sure you want to exit" ) ){
                            window.close();
                        }
                    }else{
                        app.navigate( "screen_selection" );
                    }
                }
                window.history.pushState("backhandler", null, null);
            }
        });
        window.history.pushState("backhandler", null, null); 
        
        $(window).on('hashchange', function() {
            // console.log( "hash" , window.location.hash.substr(1));
            app.currentPage = window.location.hash.substr(1);
            if( app.currentPage != "" ){
                $.templates[ app.currentPage ].link( "#app", app.data );
                if( typeof( window[ app.currentPage ] ) === "function" ){
                    window[ app.currentPage ]();
                } 
            }else{
                $("#app").html('<div class="text-center padded-all-3x"><span class="fa fa-spin fa-circle-notch fa-4x"></span></div>');
            }
        });
    },
    lazyGetTemplate: function(name) {
        // console.log( "WE ARE FETCHING A TEMPLATE ( " + name + ")" );
        var deferred = $.Deferred();
        if ( $.templates[ name ] ) { 
            // console.log( "IT WAS ALREADY LOADED, JUST RESOLVE THE PROMISE" );
            deferred.resolve( name );
        } else { 
            // console.log( "LOAD " + name + " into $.templates" );
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
    //    console.log( "SET THE LOCATION..." );
    //     return  new Promise(
    //     function( resolve, reject ){ 
    //                 navigator.geolocation.getCurrentPosition( function( response ){
    //                     app.geoLocation = response.coords;
    //                     console.log( "geolocation" , response.coords );
    //                     resolve();
    //                 })
    //             }); 
    },
    toggle_units: function(){  
        $.observable( app.data ).setProperty( "is_metric" , app.data.is_metric == 1 ? 0 : 1  );
    },
    set_current_weather: function(){ 
        console.log( "setting weather..." );
        if( localStorage.getItem( "city_id" ) !== null ){
            console.log( "geolocation is set." );
            console.log( "is_metric: " , app.data.is_metric );
            $.observable( app.data ).setProperty( "units_icon" , app.data.is_metric ? "&#8451;" : '&#8457;' );
            $.ajax({
                dataType: "jsonp",
                url:  'https://api.openweathermap.org/data/2.5/weather',
                data: {
                    id: localStorage.getItem( "city_id" ),
                    units: app.data.is_metric ? "metric" : "imperial",
                    APPID: config.WEATHER_APP_ID
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
            setTimeout( app.set_current_weather , 600000 ); 
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
        url: config.SERVICE_URL + "transactions/" + id, 
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
    $.observable( app.data ).setProperty( "current_month"   ,  currentMoment.format("MMM") ); 
    $.observable( app.data ).setProperty( "current_date"    ,  currentMoment.format("MMM Do") ); 
    $.observable( app.data ).setProperty( "current_time"    ,  currentMoment.format("h:mm A") ); 
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
        socketHelper.pusher = new Pusher( config.PUSHER_KEY , { cluster: "us2" });   
        socketHelper.pusher.connection.bind ( 'connecting' ,  socketHelper.connecting );
        socketHelper.pusher.connection.bind ( 'connected'  ,  callback );
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

Number.prototype.format = function(n, x) {
    var re = '\\d(?=(\\d{' + (x || 3) + '})+' + (n > 0 ? '\\.' : '$') + ')';
    return this.toFixed(Math.max(0, ~~n)).replace(new RegExp(re, 'g'), '$&,');
};

 