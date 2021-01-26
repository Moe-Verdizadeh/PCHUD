 
function manager_screen(){  
    console.log( "Manager Screen " ); 
    localStorage.pallet_connect_hud_lastScreen = 'manager_screen';   
    manager_screen_obj.init();
} 
app.data.manager.piecharts = [
    { is_sales: 1, is_purchases: 0, label: "SALES" , containerId: "containerChartPieSales" },
    { is_sales: 0, is_purchases: 1, label: "PURCHASES" , containerId: "containerChartPiePurchases" },
    // { label: "REPAIRS" , containerId: "containerChartPieRepairs" },
];

var manager_screen_obj = {
    ajaxData:       {},
    palletData:     {}, 
    init: function(){ 
        app.pageRefresh( 60 , manager_screen_obj.init );
        console.log( "init manager screen..." );
        manager_screen_obj.ajaxData = { 
                                        vendors: 0, 
                                        all: ( localStorage.office_screen_type == 'all' ? 1 : 0 ), 
                                        new: ( localStorage.office_screen_type == 'new' ? 1 : 0 ), 
                                        recycled: ( localStorage.office_screen_type == 'recycled' ? 1 : 0 )
                                    };
        manager_screen_obj.palletData = { 
                                            sales: { name: '' , data : [] }, 
                                            purchases: { name: '' , data : [] } , 
                                            repairs : { name: '' , data : [] } 
                                        };
        manager_screen_obj.variationData = { }
        manager_screen_obj.fetchingVariationData(); 
        manager_screen_obj.monthlyValues().then( function(){
            manager_screen_obj.yearDataChart().then( function(){
                manager_screen_obj.loadPalletChartData( function(){
                    manager_screen_obj.renderPalletChart( 'containerChartPieSales'      , manager_screen_obj.palletData.sales );
                    manager_screen_obj.renderPalletChart( 'containerChartPiePurchases'  , manager_screen_obj.palletData.purchases );
                    // manager_screen_obj.renderPalletChart( 'containerChartPieRepairs'    , manager_screen_obj.palletData.repairs );
                    warehouse_screen_obj.loadTransactions( [ 4 , 2 ] );
                    $.observable( app.data.warehouse.pending_transactions.rows ).observeAll(  warehouse_screen_obj.updateTotals );
                });
            })
        }); 
    },  
    monthlyValues: function(){  
        return  new Promise(
            function (resolve, reject) {    
                    warehouse_screen_obj.loadData( resolve ); 
            }
        );
    },
    yearDataChart: function(){ 
        return  new Promise(
            function (resolve, reject) {    
            $.ajax({
                url: config.SERVICE_URL + "fetchChartData",
                data: manager_screen_obj.ajaxData,
                success: function ( response ){  
                    var chart = Highcharts.chart( {
                        credits: 'disabled',
                        chart:{
                            renderTo: 'containerChart',
                            type: 'areaspline',
                            height: 350,
                        },
                        title: { 
                            text: '12 Months',
                        },  
                        legend: {
                            layout: 'vertical',
                            align: 'left',
                            verticalAlign: 'top',
                            x: 0,
                            y: 0,
                            floating: true,
                            borderWidth: 1, 
                        },
                        xAxis: {
                            type: 'datetime',
                            dateTimeLabelFormats: { 
                                month: '%e. %b',
                                year: '%b'
                            }, 
                        },
                        yAxis: {
                            visible: false,
                        }, 
                        series: response.thisYear.profitChartData.reverse(),
                    });
                    resolve();
                },
                error: function( error ){
                    console.log( "ERROR FETCHING DATA " + error );
                    reject();
                }
            }); 
        });
    }, 
    loadPalletChartData: function( callback ){
        $.ajax({
            url: config.SERVICE_URL + "pallet_chart_data",
            data: manager_screen_obj.ajaxData, 
            success: function ( response ){ 
                // console.log( "pallet chart data 60 days " , response.sixtyDays.pallets );  
                // console.log( "pallet chart data 60 days sales " , response.sixtyDays.pallets.sales );  
                // console.log( "pallet chart data 60 days purchases " , response.sixtyDays.pallets.purchases ); 
                $.each( response.sixtyDays.pallets.sales , function( index , row ){ 	
                    manager_screen_obj.palletData.sales.data.push( { name: row.name, y: parseInt( row.percent ) } ); 
                });  
                $.each( response.sixtyDays.pallets.purchases , function( index , row){
                    manager_screen_obj.palletData.purchases.data.push( {name: row.name, y: parseInt( row.percent ) } );
                }); 
                $.each( response.sixtyDays.pallets.repairs , function( index , row){
                    manager_screen_obj.palletData.repairs.data.push( {name: row.name, y: row.percent } );
                });   
                callback();
            },
            error: function( error ){
                console.log( "ERROR FETCHING DATA " + error );
            },
        });    
    },
    renderPalletChart: function ( container , remoteData ){  
        // console.log( "Render Chart " , container , " Data " , data );
        Highcharts.chart(  {
            credits: 'disabled',
            title: false,
            chart: {
                renderTo: container,
                plotBackgroundColor: null,
                plotBorderWidth: null,
                plotShadow: false,
                type: 'pie',
                height: 300,  
            }, 
            tooltip: {
                pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>' 
            },
            plotOptions: {
                pie: {
                    allowPointSelect: false,  
                    dataLabels: {
                        enabled: false,
                        format: '<b>{point.name}</b>: {point.percentage:.1f} %'
                    },
                    showInLegend: true,
                }, 
            },
            legend: {  
                align: 'left', 
                itemStyle: { 
                    fontSize: '1em', 
                },   
            },
            series: [ remoteData ]
        }); 
    }, 
    fetchingVariationData: function(){
        $.ajax({
            url: config.SERVICE_URL + "dashboardVariations",
            data: manager_screen_obj.ajaxData,
            success: function( response ){
                console.log( "Fetching variation" ,  response.topVariations );  
                var variationData = [];
                variationData.push( { label: 'SUPPLIERS' , data: response.topVariations.suppliers });
                variationData.push( { label: 'CUSTOMERS' , data: response.topVariations.customers });
                // variationData.push( { label: 'REPAIRS' , data: response.topVariations.repairs  }); 
                $.observable( app.data.manager.variationSummary.rows ).refresh( variationData );   
            },
            error: function( error ){
                console.log( "ERROR FETCHING DATA " + error );
            },
        });
    },
}