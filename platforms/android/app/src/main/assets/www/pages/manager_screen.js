 
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
    ajaxData:       { vendors: 0, new: 0, recycled: 1 },
    palletData:     {}, 
    init: function(){ 
        app.pageRefresh( 60 , manager_screen_obj.init );
        console.log( "init manager screen..." );
        manager_screen_obj.palletData = { sales: { name: '' , data : [] }, purchases: { name: '' , data : [] } , repairs : { name: '' , data : [] } };
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
                url: app.SERVICE_URL + "fetchChartData",
                data: manager_screen_obj.ajaxData,
                success: function ( response ){ 
                    console.log( "Response" , response );     
                    var chart = Highcharts.chart( {
                        credits: 'disabled',
                        chart:{
                            renderTo: 'containerChart',
                            type: 'areaspline',
                            height: 218,
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
                            // title: {
                            //     text: 'Dollars'
                            // }, 
                        }, 
                        // plotOptions: {
                        //     series: {
                        //         marker: {
                        //             enabled: true
                        //         }
                        //     }
                        // }, 
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
            url: app.SERVICE_URL + "pallet_chart_data",
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
    renderPalletChart: function ( container , data ){ 
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
                height: 200,  
            }, 
            tooltip: {
                pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>' 
            },
            plotOptions: {
                pie: {
                    allowPointSelect: false, 
                    innerSize: '5%', 
                    dataLabels: {
                        enabled: false,
                        format: '<b>{point.name}</b>: {point.percentage:.1f} %'
                    },
                    showInLegend: true,
                },
                series: {
                    animation: {
                        duration: 1000
                    }
                }
            },
            legend: {  
                align: 'left', 
                itemStyle: { 
                    fontSize: '7px', 
                },   
            },
            series: [ data ]
        }); 
    },
    fetchingVariationData: function(){
        $.ajax({
            url: app.SERVICE_URL + "dashboardVariations",
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