<?php
require __DIR__.'/world-currencies.test.php';
$currency=neo_stewardship_currency_by_id('nmni');$public=neo_counter_retail_currency($currency);$json=json_encode($public);
check(strpos($json,'18Fynt')===false&&strpos($json,'issuer')===false&&strpos($json,'owner')===false&&strpos($json,'treasury')===false,'Public catalog contains no treasury metadata');
$refs=array('PLEDGEBOND'=>array('currency'=>'BTC','source'=>'asset-info','referenceId'=>'ref','bondMarket'=>array('owner'=>'private-source'),'currencyMarket'=>array('owner'=>'treasury'),'unitPriceMinor'=>'50000'));
$clean=neo_counter_retail_references($refs);check(!isset($clean['PLEDGEBOND']['bondMarket'],$clean['PLEDGEBOND']['currencyMarket'])&&$clean['PLEDGEBOND']['unitPriceMinor']==='50000','Retail quote strips internal market records');
$inv=neo_counter_retail_invoice(array('order_id'=>1,'payer'=>'member','destination'=>'collection','token_source'=>'private-inventory','currency_market'=>array('owner'=>'treasury')));check(!isset($inv['token_source'],$inv['currency_market'])&&$inv['destination']==='collection','Retail invoice keeps payment destination without inventory source');
check(neo_counter_display_amount('54500','BTC')==='0.00054500 BTC'&&neo_counter_display_amount('64792','BTC')==='0.00064792 BTC','Server-rendered bond estimates');
$source=file_get_contents(__DIR__.'/neo-stewardship-counter.php');check(strpos($source,'data-connect-merchant')===false&&strpos($source,'Connect treasury')===false,'Treasury button absent even in administrator template');
check(strpos($source,'<option value="patronage">Pledge Bond</option>')!==false&&strpos($source,'<option value="adept">Temple Bond</option>')!==false,'Short bond labels');
check(strpos($source,'Member patronage.')!==false&&strpos($source,'Adept commitment.')!==false,'Descriptions remain in asset information');
check(strpos($source,"echo esc_html($".'initial_total)')!==false&&strpos($source,": 'cp20';")!==false,'Default priced preview rendered on server');
foreach(array('/settlement-status') as $route){$uid=0;$admin=false;check(!$routes[$route]['permission_callback'](),'Operator diagnostics not public');}
echo "PASS: retail metadata isolation, one member connection, short labels, descriptions and server-rendered estimates\n";
