function warehouse_screen(){
    localStorage.pallet_connect_hud_lastScreen = 'warehouse_screen';
    $.ajax({
        url: app.SERVICE_URL + "monthlyValues",
        data: {
            vendors: 0,
            new: 0,
            recycled: 1
        },
        success: function ( response ){ 
            $.observable( app.data.warehouse.summary ).refresh( [
                { is_build: 0 , is_sales: 0 , is_purchases: 0 , is_repairs: 1 , today: response.data.repairs.today.qty  , this_month: response.data.repairs.thisMonth.qty },
                { is_build: 0 , is_sales: 1 , is_purchases: 0 , is_repairs: 0 , today: response.data.today.outgoing.qty , this_month: response.data.thisMonth.outgoing.qty } ,
                { is_build: 0 , is_sales: 0 , is_purchases: 1 , is_repairs: 0 , today: response.data.today.incoming.qty , this_month: response.data.thisMonth.incoming.qty }
            ] );
            $.observable( app.data.warehouse ).setProperty( {
                customer_pending    : response.data.pending.outgoing.qty,
                supplier_pending    : response.data.pending.incoming.qty 
            });  
            loadTransactions( [ 4 , 2 ] );
            console.log( "Monthly Values " , response ); 
        },
        error: function( error ){
            console.log( "ERROR FETCHING DATA " + error );
        }
    });

    
}
var transactionsChannel = null;
function loadTransactions( types ){
    $.ajax({
        url: app.SERVICE_URL + "transactions",
        data: {
            grouped: true,
            deleted: 0,
            filter: {"db_cr_indicator":0,"on_hold":0},
            sort: 'transaction_date',
            order: 'asc',
            include_stock_items: true,
            isQueue: true,
            types: types,
        },
        success: function( response ){
            $.observable( app.data.warehouse.pending_transactions.rows ).refresh( response.data.rows );
            $.each( app.data.warehouse.pending_transactions.rows , function( ind ){
                applyDaysDiff( ind )
            });
            if( transactionsChannel !== null ){
                socketHelper.pusher.unsubscribe( 'TransactionsChannel.' + localStorage.pallet_connect_hud_site );
                transactionsChannel = null;
            }
            transactionsChannel = socketHelper.pusher.subscribe( 'TransactionsChannel.' + localStorage.pallet_connect_hud_site );
            transactionsChannel.bind( 'transaction_updates_all' , transactionUpdated );
        },
        error: function( error ){
            socketHelper.error( error );
        }
    });
}

function transactionUpdated( PushedData ){
    console.log( PushedData );
    // what is the original type ?
    
    if( PushedData.action == "deleted" ){
        var arrLLength = app.data.warehouse.pending_transactions.rows.length;
        var compareToFinalized = true;
        $.each( app.data.warehouse.pending_transactions.rows , function( ind , transaction ){
            if( transaction.id == PushedData.id ){
                compareToFinalized = false;
                console.log( transaction ); 
                if( transaction.future_indicator == 1 ){
                    var newTotal = ( parseInt( app.data.warehouse.customer_pending.replace( ',' ,'' ) ) - parseInt( transaction.sum ) ).format();
                    $.observable( app.data.warehouse ).setProperty( "customer_pending" , newTotal ) ;
                }else{ 
                    var newTotal = ( parseInt( app.data.warehouse.supplier_pending.replace( ',' ,'' ) ) - parseInt( transaction.sum ) ).format();
                    $.observable( app.data.warehouse ).setProperty( "supplier_pending" , newTotal ) ;
                }
                $.observable( app.data.warehouse.pending_transactions.rows ).remove( ind , 1 );
                return false;
            }
        });
        // compare against finished totals
        if( compareToFinalized ){
            $.ajax({
                url: app.SERVICE_URL + "transactions/" + PushedData.id
            });
        }
    }else{
        var original = PushedData.origin;
        var original_type_id = original.transaction_types_id;
        // is it outgoing ? 
        var is_original_outgoing    = original.transaction_types.db_cr_indicator == 1  || original.transaction_types.ftt_indicator == 1;
        var is_original_incoming    = !is_original_outgoing;
        var is_original_pending     = original.transaction_types.db_cr_indicator == 0;
        var is_original_an_order    = original.transaction_types.id == 4;
        var is_original_a_request   = original.transaction_types.id == 2;
        var is_original_internal    = original.transaction_types.is_internal;
        var is_original_external    = !is_original_internal;
        var is_original_repair      = '';// this you can figure out
        var is_original_build       = '';// this you can figure out
        var is_original_cut         = '';// this you can figure out
        var original_total_qty      = 0;
        $.each( original.transaction_details , function( i , detail ){
            original_total_qty += detail.quantity;
        });
        $.ajax({
            url: app.SERVICE_URL + "transactions/" + PushedData.id,
            success: function( newTransactionDataResponse ){
                newTransactionData = newTransactionDataResponse.data;
                if( PushedData.action == "created" ){

                }else if( PushedData.action == "updated" ){

                }
            }
        });
    }
}

function applyDaysDiff( ind ){
    var thisDaysDiff = daysDiff( app.data.warehouse.pending_transactions.rows[ ind ].transaction_date_time , false );
    $.observable( app.data.warehouse.pending_transactions.rows[ ind ] ).setProperty( "days_diff" , thisDaysDiff );
    $.observable( app.data.warehouse.pending_transactions.rows[ ind ] ).setProperty( "days_diff_positive" , ( thisDaysDiff < 0 ? ( thisDaysDiff * -1 ) : thisDaysDiff ) );
    $.observable( app.data.warehouse.pending_transactions.rows[ ind ] ).setProperty( "overdue" , ( thisDaysDiff < 0  ) );
} 

function daysDiff( dateToUse , useAbsolute ){  
    var date1 	 = new Date();
    var date2 	 = new Date( dateToUse );
    var timeDiff = ( date2.getTime() - date1.getTime() ); 
	return Math.round( timeDiff / ( 1000 * 3600 * 24 ) );  
}


function addingIndex(){

} 