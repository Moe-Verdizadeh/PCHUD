function settings(){
    $.observable( app.data.settings ).setProperty( "has_city_id" , localStorage.getItem( "city_id" ) !== null );
    $.observable( app.data.settings ).setProperty( "city_name" , localStorage.getItem( "city_name" ) );
    localStorage.pallet_connect_hud_lastScreen = 'settings';  
    setting_search_typing_timer = null; 
}

$.views.helpers ("set_city_id", setWeatherCityId );

$.views.helpers ("toggle_has_weather", settings_toggle_edit_weather );

function settings_toggle_edit_weather(){ 
    $.observable( app.data.settings ).setProperty( "has_city_id" , false );
    $( "#settings_city_name" ).focus();
}

function setWeatherCityId( new_city_id , city_name ){
    console.log( "City Id " , new_city_id , city_name );
    localStorage.setItem( "city_id" , new_city_id );
    localStorage.setItem( "city_name" , city_name ); 
    $.observable( app.data.settings ).setProperty( "city_name" , city_name);
    $.observable( app.data.settings.city_list ).refresh( [] );
    $.observable( app.data.settings ).setProperty( "has_city_id" , true );
    app.set_current_weather();
}

var setting_search_typing_timer = null;
function typeAheadCity(){ 
    if( $( "#settings_city_name" ).val().trim().length > 3 ){
        if( setting_search_typing_timer !== null ){
            clearTimeout( setting_search_typing_timer );
        }
        setting_search_typing_timer = setTimeout( settings_city_search_run , 500 );
    }else{
        $.observable( app.data.settings.city_list ).refresh( [] );
    } 
}


function settings_city_search_run(){
    var searchTxt = $( "#settings_city_name" ).val().trim().toLowerCase(); 
    $.observable( app.data.settings.city_list ).refresh( [] );
    $.ajax( {
        url: config.SERVICE_URL + "hud_cities/" + searchTxt,
        success: function( response){
            $.observable( app.data.settings.city_list ).refresh( response );
        }
    })
    
}