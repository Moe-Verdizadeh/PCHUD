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
    header('Content-type: application/json');
    if( !isset( $_GET['q'] ) || trim( $_GET['q'] ) == "" || strlen( trim( $_GET['q'] ) ) < 3 ){
        echo json_encode( [] );
        die;
    }else{
        $search = trim( $_GET['q'] ); 
        $username   ='palletconnect_hud_data';
        $password   ='Plfxvqk8(iCy'; 
        $db         ='palletconnect_hud_data'; 
        $pdo = new PDO("mysql:host=localhost;dbname=$db",$username,$password);
        $stmt = $pdo->prepare("SELECT * FROM cities WHERE name LIKE ? LIMIT 0,30");
        $stmt->execute( [ '%' . $search . '%']); 
        $arr = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo( json_encode( $arr ) );
    }
