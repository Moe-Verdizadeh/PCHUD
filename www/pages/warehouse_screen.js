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
                { is_build: 0 , is_sales: 0 , is_purchases: 0 , is_repair: 1 , today: response.data.repairs.today.qty  , this_month: response.data.repairs.thisMonth.qty  },
                { is_build: 0 , is_sales: 0 , is_purchases: 1 , is_repair: 0 , today: response.data.today.incoming.qty , this_month: response.data.thisMonth.incoming.qty },
                { is_build: 0 , is_sales: 1 , is_purchases: 0 , is_repair: 0 , today: response.data.today.outgoing.qty , this_month: response.data.thisMonth.outgoing.qty }, 
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
    if( PushedData.action == "deleted" ){
        var arrLLength = app.data.warehouse.pending_transactions.rows.length;
        var compareToFinalized = true;
        $.each( app.data.warehouse.pending_transactions.rows , function( ind , transaction ){
            if( transaction.id == PushedData.id ){
                compareToFinalized = false;
                console.log( "delete transaction..." ); 
                console.log( transaction ); 
                if( transaction.future_indicator == 1 ){
                    var newTotal = ( parseInt( app.data.warehouse.customer_pending.replace( ',' , '' ) ) - parseInt( transaction.sum ) ).format();
                    $.observable( app.data.warehouse ).setProperty( "customer_pending" , newTotal ) ;
                }else{ 
                    var newTotal = ( parseInt( app.data.warehouse.supplier_pending.replace( ',' , '' ) ) - parseInt( transaction.sum ) ).format();
                    $.observable( app.data.warehouse ).setProperty( "supplier_pending" , newTotal ) ;
                }
                $.observable( app.data.warehouse.pending_transactions.rows ).remove( ind , 1 );
                return false;
            }
        });
        // compare against finished totals
        if( compareToFinalized ){
            $.ajax({
                url: app.SERVICE_URL + "transactions/" + PushedData.id, 
                success: function( response ){  
                    transaction = response.data; 
                    console.log( transaction );
                    console.log( transaction.sum );
                    console.log( "Internal " + transaction.transaction_types.is_internal );
                    console.log( transaction.transaction_types.is_repair );  

                    var repairs     = {};
                    var builds      = {};
                    var sales       = {};
                    var purchases   = {};
                    var isToday     = new Date( transaction.transaction_date_time ).getDate()   === new Date().getDate() ;
                    var isThisMonth = new Date( transaction.transaction_date_time ).getMonth()  === new Date().getMonth() ;

                    $.each(app.data.warehouse.summary , function ( ind , data ){
                        if( data.is_repair ){
                            repairs     = data;
                        }else if( data.is_build ){
                            builds      = data;
                        }else if( data.is_purchases ){
                            purchases   = data;
                        }else if( data.is_sales ){
                            sales       = data;
                        }
                    });
                    if( transaction.transaction_types.is_repair == 1 ){ 
                        if( isToday ){
                            var newTotal = ( parseInt( repairs.today.replace( ',' , '' ) ) - parseInt( transaction.sum ) ).format();
                            $.observable( repairs ).setProperty( "today" , newTotal ) ;  
                        }
                        if( isThisMonth ){
                            var newTotal = ( parseInt( repairs.this_month.replace( ',' , '' ) ) - parseInt( transaction.sum ) ).format();
                            $.observable( repairs ).setProperty( "this_month" , newTotal ) ;
                        }
                    }else if( !transaction.transaction_types.is_internal ) {
                        if(transaction.transaction_types.db_cr_indicator == 1 ){
                            if( isToday ){
                                var newTotal = ( parseInt( sales.today.replace( ',' , '' ) ) - parseInt( transaction.sum ) ).format();
                                $.observable( sales ).setProperty( "today" , newTotal ) ;  
                            }
                            if( isThisMonth ){
                                var newTotal = ( parseInt( sales.this_month.replace( ',' , '' ) ) - parseInt( transaction.sum ) ).format();
                                $.observable( sales ).setProperty( "this_month" , newTotal ) ;
                            } 
                        }else if( transaction.transaction_types.db_cr_indicator == -1 ){
                            if( isToday ){
                                var newTotal = ( parseInt( purchases.today.replace( ',' , '' ) ) - parseInt( transaction.sum ) ).format();
                                $.observable( purchases ).setProperty( "today" , newTotal ) ;  
                            }
                            if( isThisMonth ){
                                var newTotal = ( parseInt( purchases.this_month.replace( ',' , '' ) ) - parseInt( transaction.sum ) ).format();
                                $.observable( purchases ).setProperty( "this_month" , newTotal ) ;
                            } 
                        } 
                    } 
                }
            });
        }
    }else{ 
        var original                = PushedData.origin;
        var original_type_id        = original.transaction_types_id; // (4 , 2)
        var is_original_outgoing    = original.transaction_types.db_cr_indicator == 1  || original.transaction_types.ftt_indicator == 1;
        var is_original_incoming    = !is_original_outgoing; 
        var is_original_pending     = original.transaction_types.db_cr_indicator == 0; 
        var is_original_an_order    = original.transaction_types.id == 4; 
        var is_original_a_request   = original.transaction_types.id == 2; 
        var is_original_internal    = original.transaction_types.is_internal;
        var is_original_external    = !is_original_internal;
        var is_original_repair      = original.transaction_types.is_repair;
        var is_original_build       = original.transaction_types.is_build;
        var is_original_cut         = original.transaction_types.is_cut;
        var original_total_qty      = 0 ;// update

        var isToday                 = new Date( original.transaction_date_time ).getDate()   === new Date().getDate() ;
        var isThisMonth             = new Date( original.transaction_date_time ).getMonth()  === new Date().getMonth() ;
        $.each(app.data.warehouse.summary , function ( ind , data ){
            if( data.is_repair ){
                repairs     = data;
            }else if( data.is_build ){
                builds      = data;
            }else if( data.is_purchases ){
                purchases   = data;
            }else if( data.is_sales ){
                sales       = data;
            }
        });

        $.each( original.transaction_details , function( i , detail ){
            original_total_qty += detail.quantity;
        });   
        // newTransactionData = newTransactionDataResponse.data;
        if( PushedData.action == "created" ){
            console.log( "Creating a new one transaction " );  
            console.log( original )
            console.log( original.transaction_details ); 
            console.log( "added is.... " + original_total_qty );  
            $.each( app.data.warehouse.pending_transactions.rows , function( index , original){
                if( is_original_pending && is_original_an_order){
                    var newTotal = ( parseInt( app.data.warehouse.customer_pending.replace( ',' , '' ) ) + parseInt( original_total_qty ) ).format();
                    $.observable( app.data.warehouse ).setProperty( "customer_pending" , newTotal ) ; 
                }else if(is_original_pending && is_original_a_request){
                    var newTotal = ( parseInt( app.data.warehouse.supplier_pending.replace( ',' , '' ) ) + parseInt( original_total_qty ) ).format();
                    $.observable( app.data.warehouse ).setProperty( "supplier_pending" , newTotal ) ; 
                }
                console.log(app.data.warehouse.pending_transactions.rows)
                $.observable( app.data.warehouse.pending_transactions.rows ).insert( index , app.data.warehouse.pending_transactions.rows  );
                return false;
            }); 
            if( is_original_repair ){
                if( isToday ){
                    var newTotal = ( parseInt( repairs.today.replace( ',' , '' ) ) + parseInt( original_total_qty ) ).format();
                    $.observable( repairs ).setProperty( "today" , newTotal ) ;
                }
                if( isThisMonth ){
                    var newTotal = ( parseInt( repairs.this_month.replace( ',' , '' ) ) + parseInt( original_total_qty ) ).format();
                    $.observable( repairs ).setProperty( "this_month" , newTotal ) ;
                }
            }
            if( is_original_outgoing ){
                if( isToday ){
                    var newTotal = ( parseInt( sales.today.replace( ',' , '' ) ) + parseInt( original_total_qty ) ).format();
                    $.observable( sales ).setProperty( "today" , newTotal ) ;
                }
                if( isThisMonth ){
                    var newTotal = ( parseInt( sales.this_month.replace( ',' , '' ) ) + parseInt( original_total_qty ) ).format();
                    $.observable( sales ).setProperty( "this_month" , newTotal ) ;
                }
            }
            if( is_original_incoming ){
                if( isToday ){
                    var newTotal = ( parseInt( purchases.today.replace( ',' , '' ) ) + parseInt( original_total_qty ) ).format();
                    $.observable( purchases ).setProperty( "today" , newTotal ) ;
                }
                if( isThisMonth ){
                    var newTotal = ( parseInt( purchases.this_month.replace( ',' , '' ) ) + parseInt( original_total_qty ) ).format();
                    $.observable( purchases ).setProperty( "this_month" , newTotal ) ;
                }
            }

        }else if( PushedData.action == "updated" ){
            $.ajax({
                url: app.SERVICE_URL + "transactions/" + PushedData.id,
                success: function( updateResponse ){
                    transaction = updateResponse.data;
                    console.log("updating a new one transaction "); 
                    console.log(original)
                    console.log(original.transaction_details);
                    console.log("added is.... " + original_total_qty); 
                    /*
                        to update we need the check the id that is being updated
                        check to see if its internal or external  
                            THEN check to see if its repair cut or build  
                        check to see if its incoming or outgoing  
                        check the qty  
                        check to see if its request or order 
                        check to see if its pending   
                    */
                }
            });
        } 
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