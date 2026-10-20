<?php
require __DIR__.'/merchant.test.php';
function add_shortcode(...$args){}
function wp_unique_id($prefix){static $n=0;return $prefix.++$n;}
function plugins_url($path,$file){return 'https://example.test/plugins/'.$path;}
function neo_stewardship_market_host($ledger){return array('classic'=>'https://classic.tokenscan.io','cp20'=>'https://cp20.tokenscan.io')[$ledger]??'';}
require __DIR__.'/world-currency-directory.php';
$rows=neo_stewardship_currency_catalog();check(count($rows)===121,'Complete current blog catalog');check(count(array_unique(array_column($rows,'id')))===121,'Stable unique currency ids');
foreach(array('bsc','cpn','mbt') as $id)check(neo_stewardship_currency_by_id($id)!==null,'New blog entry '.$id);
check(neo_stewardship_currency_by_id('mbt')['counterpartyAsset']==='MOBITOKEN','Mobi on-chain asset mapping');
check(neo_stewardship_currency_by_id('nmni')['verification']['classic']['status']!=='treasury_asset_verified'&&neo_stewardship_currency_by_id('nmni')['verification']['cp20']['status']==='treasury_asset_verified','No cross-ledger treasury verification');
$html=neo_counter_world_currency_directory('cp20');check(substr_count($html,'data-currency-row')===121,'Directory renders all entries');check(strpos($html,'MOBITOKEN')!==false&&strpos($html,'Find a currency')!==false,'Directory names and search control');
check(strpos($html,'https://cp20.tokenscan.io/asset/NOMNI')!==false,'Directory uses chosen ledger explorer');
check(strpos(neo_counter_world_currency_directory('classic'),'Asset verification pending')!==false,'Missing ledger identity stays pending');
echo "PASS: complete World Currency catalog, mapping provenance, ledger separation and directory rendering\n";
