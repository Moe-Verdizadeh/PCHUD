
var repairs     = {};
var builds      = {};
var sales       = {};
var purchases   = {};
 
function warehouse_screen(){ 
    localStorage.pallet_connect_hud_lastScreen = 'warehouse_screen';
    warehouse_screen_obj.loadData( function ( response ){ 
        $.each( app.data.summary , function ( ind , data ){
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
        warehouse_screen_obj.loadTransactions( [ 4 , 2 ] );
        console.log( "Monthly Values " , response );  
        app.pageRefresh( 60 , warehouse_screen );
        $.observable( app.data.warehouse.pending_transactions.rows ).observeAll(  warehouse_screen_obj.updateTotals );
    });
} 

var warehouse_screen_obj = { 
    loadData: function( callback ){
        $.ajax({
            url: config.SERVICE_URL + "monthlyValues",
            data: {
                vendors:    0,
                all:        ( localStorage.warehouse_screen_type == "all"      ? 1 : 0 ),
                new:        ( localStorage.warehouse_screen_type == "new"      ? 1 : 0 ),
                recycled:   ( localStorage.warehouse_screen_type == "recycled" ? 1 : 0 )
            },
            success: function ( response ){ 
                $.observable( app.data.summary ).refresh( [
                    { is_build: 0 , is_sales: 1 , is_purchases: 0 , is_repair: 0 , today: response.data.today.outgoing  , this_month: response.data.thisMonth.outgoing }, 
                    { is_build: 0 , is_sales: 0 , is_purchases: 1 , is_repair: 0 , today: response.data.today.incoming  , this_month: response.data.thisMonth.incoming },
                    { is_build: 0 , is_sales: 0 , is_purchases: 0 , is_repair: 1 , today: response.data.repairs.today   , this_month: response.data.repairs.thisMonth  },
                    { is_build: 1 , is_sales: 0 , is_purchases: 0 , is_repair: 0 , today: response.data.builds.today    , this_month: response.data.builds.thisMonth }, 
                ] ); 
                if( typeof( callback ) == "function" ){
                    callback( response );
                }
            }, 
            error: function( error ){
                console.log( "ERROR FETCHING DATA " + error );
            },
        });  
    }, 
    updateTotals: function(){
        var supplier_total = "" + 0;
        var customer_total = "" + 0;
        var supplier_count = 0;
        var customer_count = 0;
        $.each( app.data.warehouse.pending_transactions.rows , function( ind , transaction ){
            if( transaction.future_indicator == -1 ){
                supplier_total = warehouse_screen_obj.calcNewTotal( supplier_total , transaction.sum );
                supplier_count++;
            }else{
                customer_total = warehouse_screen_obj.calcNewTotal( customer_total , transaction.sum );
                customer_count++;
            }
        });
 
        $.observable( app.data.warehouse ).setProperty( "supplier_pending_qty" , supplier_total ); 
        $.observable( app.data.warehouse ).setProperty( "customer_pending_qty" , customer_total ); 

        $.observable( app.data.warehouse ).setProperty( "supplier_pending_count" , supplier_count ); 
        $.observable( app.data.warehouse ).setProperty( "customer_pending_count" , customer_count ); 
    }, 

    loadTransactions: function( types ){
        $.ajax({
            url: config.SERVICE_URL + "transactions/pending_headers",
            data: {
                limit: 1000,
                offset: 0,   
                types: types,
                includeSum: 1,
            },
            success: function( response ){
                $.observable( app.data.warehouse.pending_transactions.rows ).refresh( response );
                $.each( app.data.warehouse.pending_transactions.rows , function( ind ){
                    applyDaysDiff( ind )
                });
                if( app.transactionsChannel !== null ){
                    socketHelper.pusher.unsubscribe( 'TransactionsChannel.' + localStorage.pallet_connect_hud_site );
                    app.transactionsChannel = null;
                }
                app.transactionsChannel = socketHelper.pusher.subscribe( 'TransactionsChannel.' + localStorage.pallet_connect_hud_site );
                app.transactionsChannel.bind( 'transaction_updates_all' , transactionUpdated );
            },
            error: function( error ){
                socketHelper.error( error );
            }
        });
    }, 

    setToday: function( observableObj , originalValue, difference ){
        $.observable( observableObj ).setProperty( "today" , warehouse_screen_obj.calcNewTotal( originalValue, difference ) ) ;  
    },

    setThisMonth: function( observableObj , originalValue, difference ){
        $.observable( observableObj ).setProperty( "this_month" , warehouse_screen_obj.calcNewTotal( originalValue, difference ) ) ;  
    },

    calcNewTotal: function( originalValue, difference ){
        originalValue = "" + originalValue; 
        return ( parseInt( originalValue.replace( ',' , '' ) ) + parseInt( difference ) ).format(); 
    },

    updateSummaryTotals: function( transaction , modifier ){ 
        var objToUpdate = {};
        // console.log( "updateSummaryTotals..." , transaction );
        if( transaction.transaction_types.is_repair == 1 ){ 
            // console.log( "Update Repairs" , repairs );
            objToUpdate = repairs;
        }else if(transaction.transaction_types.is_build == 1){
            // console.log( "Update builds" , builds );
            objToUpdate = builds; 
        }else if( !transaction.transaction_types.is_internal && transaction.transaction_types.db_cr_indicator == 1 ){
            // console.log( "Update sales" , sales );
            objToUpdate = sales; 
        }else  if( !transaction.transaction_types.is_internal && transaction.transaction_types.db_cr_indicator == -1 ){
            // console.log( "Update purchases" , purchases );
            objToUpdate = purchases; 
        }
        if( isToday( transaction.transaction_date_time ) ){
            console.log( "Update Today" , objToUpdate   , objToUpdate.today, transaction.sum , modifier)
            warehouse_screen_obj.setToday( objToUpdate   , objToUpdate.today, transaction.sum * modifier );
        } 
        if( isThisMonth( transaction.transaction_date_time ) ){
            console.log( "Update This Month" , objToUpdate   , objToUpdate.this_month, transaction.sum , modifier)
            warehouse_screen_obj.setThisMonth( objToUpdate , objToUpdate.this_month, transaction.sum * modifier ); 
        } 
    },
}  

function deletePendingRow( transactionId ){
    var hasDeletedOne = false;
    var transactionCount = app.data.warehouse.pending_transactions.rows.length;
    for( var ind = ( transactionCount - 1 ); ind > 0; ind-- ){
        if( transactionId == app.data.warehouse.pending_transactions.rows[ ind ].id ){  
            $.observable( app.data.warehouse.pending_transactions.rows ).remove( ind , 1 );
            hasDeletedOne = true;
        }
    }
    return hasDeletedOne; 
} 

function transactionUpdated( PushedData ){
    console.log( PushedData ); 
    if( PushedData.action == "deleted" ){
        // console.log( "delete transaction..." );   
        // compare against finished totals  
        if( !deletePendingRow( PushedData.id ) ){ 
            fetchTransaction( PushedData.id , function( response ){  
                transaction = response.data;  
                warehouse_screen_obj.updateSummaryTotals( transaction , -1 ); 
            });
        }
    }else{  
        fetchTransaction( PushedData.id , function( response ){  
            remoteTransaction = response.data;
            if( PushedData.action == "created" ){  
                if( ( new Date().getTime() + 600000 ) > app.nextRefresh ){
                    clearTimeout( app.refreshTimer );
                    // No need to reset app.nextRefresh as it will always be true in the above statement and then on the next reload it will reset it to an hour later
                    app.refreshTimer = setTimeout( warehouse_screen , 600000 );
                }  
                // console.log( "Creating a new transaction " , remoteTransaction ); 
                // console.log( "Check if it is pending .... " ); 
                if( remoteTransaction.transaction_types.db_cr_indicator == 0 ){ 
                    remoteTransaction.is_new = 1;
                    $.observable( app.data.warehouse.pending_transactions.rows ).insert( 0 , remoteTransaction );
                    // apply days diff, this will also apply smiley faces :)
                    applyDaysDiff( 0 );
                    return false
                }   
                warehouse_screen_obj.updateSummaryTotals( remoteTransaction , 1 );
            } 
            else if( PushedData.action == "updated" ){
                var original                = PushedData.origin;
                var original_total_qty      = 0 ;// update  
                $.each( original.transaction_details , function( i , detail ){
                    original_total_qty += detail.quantity; 
                });     
                original.sum = original_total_qty; 
                console.log("updating a new one transaction ");     
                if( remoteTransaction.transaction_types.db_cr_indicator != 0 ){
                    // update summary totals 
                    if( original.transaction_types.db_cr_indicator == 0 ){
                        deletePendingRow( remoteTransaction.id );
                        warehouse_screen_obj.updateSummaryTotals( remoteTransaction , 1);
                    }
                    else if( original.transaction_types.id == remoteTransaction.transaction_types.id ){
                        // apply difference  
                        var diff = remoteTransaction.sum - original_total_qty; 
                        remoteTransaction.sum = diff; 
                        warehouse_screen_obj.updateSummaryTotals( remoteTransaction , 1);
                    }
                    else{ 
                        warehouse_screen_obj.updateSummaryTotals( original , -1);
                        warehouse_screen_obj.updateSummaryTotals( remoteTransaction , 1);
                    }
                } 
                else if( original.transaction_types.db_cr_indicator == 0 ){ 
                    $.each( app.data.warehouse.pending_transactions.rows , function( ind , row ){
                        if( row.id == remoteTransaction.id ){
                            remoteTransaction.is_new = 1;
                            $.observable( app.data.warehouse.pending_transactions.rows[ ind ] ).setProperty( remoteTransaction );
                            // apply days diff, this will also apply smiley faces :) 
                            applyDaysDiff( 0 );
                        }
                    });
                        
                }else{
                    // update summary totals
                    warehouse_screen_obj.updateSummaryTotals( original , -1 ); 
                    deletePendingRow( remoteTransaction.id );
                    // but if the row is not the list already, add it
                    $.observable( app.data.warehouse.pending_transactions.rows ).insert( 0 , remoteTransaction );
                    // apply days diff, this will also apply smiley faces :)
                    applyDaysDiff( 0 );
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