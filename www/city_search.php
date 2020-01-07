<?php
    // ini_set( 'memory_limit','1000M');
    // $city_txt   = file_get_contents("res/city_list.json"); 
    // $json = json_decode( $city_txt ); 
    // $sql = "";
    // $addedCities = [];
    // foreach( $json as $i=>$city ){
    //     if( !in_array( $city->name . $city->country ,  $addedCities ) ){ 
    //         if( $i < 1000000000000 ){ 
    //             $sql .= "INSERT INTO `cities` ( id , name, country ) VALUES ( $city->id , '" . addslashes( $city->name ) . "' , '$city->country' );" . PHP_EOL;
    //         }
    //     }
    // } 
    // $sqlFile = fopen("res/cities.sql", "w") or die("Unable to open file!"); 
    // fwrite( $sqlFile , $sql );
    // fclose( $sqlFile ); 
    // die; 