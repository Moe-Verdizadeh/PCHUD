 
function manager_screen(){  
    console.log( "Manager Screen " ); 
    localStorage.pallet_connect_hud_lastScreen = 'manager_screen';   
    manager_screen_obj.init();
}


var manager_screen_obj = {
    palletData : {},
    init: function(){
        console.log( "init manager screen..." );
        manager_screen_obj.palletData = { sales: { name: '' , data : [] }, purchases: { name: '' , data : [] } , repairs : { name: '' , data : [] } };
        manager_screen_obj.monthlyValues().then( function(){
            manager_screen_obj.yearDataChart().then( function(){
                manager_screen_obj.loadPalletChartData( function(){
                    manager_screen_obj.renderPalletChart( 'containerChartPieSales'      , manager_screen_obj.palletData.sales );
                    manager_screen_obj.renderPalletChart( 'containerChartPiePurchases'  , manager_screen_obj.palletData.purchases );
                    manager_screen_obj.renderPalletChart( 'containerChartPieRepairs'    , manager_screen_obj.palletData.repairs );
                });
            })
        }); 
        
    }, 

    monthlyValues: function(){  
        return  new Promise(
                    function (resolve, reject) {    
                         warehouse_screen_obj.loadData( resolve ) 
                    }
        );
    },
    yearDataChart: function(){ 
        return  new Promise(
            function (resolve, reject) {    
                    $.ajax({
                        url: app.SERVICE_URL + "fetchChartData",
                        data: {
                            vendors:    0,
                            new:        0,
                            recycled:   1
                        },   
                        success: function ( response ){ 
                            console.log( "Response" , response );     
                            var chart = Highcharts.chart( {
                                credits: 'disabled',
                                chart:{
                                    renderTo: 'containerChart',
                                    type: 'line',
                                    height: 300,
                                },
                                title: { 
                                    text: '12 Months'
                                },  
                                xAxis: {
                                    type: 'datetime',
                                    dateTimeLabelFormats: { 
                                        month: '%e. %b',
                                        year: '%b'
                                    },
                                    title: {
                                        text: 'Date'
                                    }
                                },
                                yAxis: {
                                    title: {
                                        text: 'Dollars'
                                    }, 
                                }, 
                                plotOptions: {
                                    series: {
                                        marker: {
                                            enabled: true
                                        }
                                    }
                                }, 
                                series: response.thisYear.profitChartData,
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
            data: {
                vendors:    0,
                new:        0,
                recycled:   1,
            },
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
        console.log( "Render Chart " , container , " Data " , data );
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
                    innerSize: '20%', 
                    dataLabels: {
                        enabled: true,
                        format: '<b>{point.name}</b>: {point.percentage:.1f} %'
                    }
                },
                series: {
                    animation: {
                        duration: 3000
                    }
                }
            },
            series: [ data ]
        }); 
    }
}