var full_city_list = [];

function settings(){
    $.observable( app.data.settings ).setProperty( "has_city_id" , localStorage.getItem( "city_id" ) !== null );
    $.observable( app.data.settings ).setProperty( "city_name" , localStorage.getItem( "city_name" ) );
    localStorage.pallet_connect_hud_lastScreen = 'settings';  
    setting_search_typing_timer = null;
    $.ajax({
        dataType: "json",
        url: "res/city_list.json",
        success: function( response ){
            full_city_list = response;
        }
    });
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
        setting_search_typing_timer = setTimeout( settings_city_search_run , 1500 );
    }else{
        $.observable( app.data.settings.city_list ).refresh( [] );
    } 
}


function settings_city_search_run(){
    var searchTxt = $( "#settings_city_name" ).val().trim().toLowerCase();
    var addedCities = []; 
    $.observable( app.data.settings.city_list ).refresh( [] );
    $.each( full_city_list , function( index , cityData ){
        var cityName = cityData.name.toLowerCase();
        var uniqueName = cityData.name.toLowerCase()+cityData.country.toLowerCase();
        if( addedCities.length < 11 && $.inArray( uniqueName , addedCities ) === -1 && cityName.includes( searchTxt ) ){
            addedCities.push( uniqueName );
            $.observable( app.data.settings.city_list ).insert( cityData );
        }
    }); 
}