<?php
// Real SQLite transactions/unique constraints through a narrow wpdb shim.
// Production uses InnoDB FOR UPDATE; this harness does not simulate its row-lock scheduler.
define('ABSPATH',__DIR__.'/');define('ARRAY_A','ARRAY_A');
$routes=array();$actions=array();$uid=7;$admin=false;
function add_action($name,$fn,...$rest){global $actions;$actions[$name][]=$fn;}
function get_option($key){return false;}function update_option(...$args){}
function get_current_user_id(){global $uid;return $uid;}function is_user_logged_in(){global $uid;return $uid>0;}function current_user_can($cap){global $admin;return $admin;}
function wp_generate_uuid4(){return bin2hex(random_bytes(16));}
function wp_json_encode($x){return json_encode($x);}function is_wp_error($x){return $x instanceof WP_Error;}function wp_next_scheduled(...$a){return false;}function wp_schedule_single_event(...$a){}
function register_rest_route($ns,$route,$args){global $routes;$routes[$route]=$args;}
class WP_Error {public function __construct(public $code,public $message,public $data=null){}public function get_error_message(){return $this->message;}}
class WP_REST_Response {public $headers=array();public function __construct(public $data){}public function header($k,$v){$this->headers[$k]=$v;}}
class DB {
 public $prefix='t_',$insert_id=0,$fail_job=false;public $db;
 function __construct(){ $this->db=new PDO('sqlite::memory:');$this->db->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
  $this->db->exec('CREATE TABLE t_neo_counter_invoices(id INTEGER PRIMARY KEY AUTOINCREMENT,order_id INTEGER UNIQUE,user_id INTEGER,request_key TEXT UNIQUE,payload TEXT,payload_hash TEXT,state TEXT,payment_txid TEXT,observation TEXT,created_at INTEGER,expires_at INTEGER,updated_at INTEGER)');
  $this->db->exec('CREATE TABLE t_neo_counter_claims(txid TEXT PRIMARY KEY,invoice_id INTEGER UNIQUE,vout INTEGER,block_hash TEXT,claimed_at INTEGER)');
  $this->db->exec('CREATE TABLE t_neo_counter_stock(stock_key TEXT PRIMARY KEY,reserved INTEGER,observed_at INTEGER)');
  $this->db->exec('CREATE TABLE t_neo_counter_reservations(invoice_id INTEGER PRIMARY KEY,stock_key TEXT,quantity INTEGER,state TEXT,created_at INTEGER)');
  $this->db->exec('CREATE TABLE t_neo_counter_delivery(id INTEGER PRIMARY KEY AUTOINCREMENT,invoice_id INTEGER UNIQUE,fulfillment_kind TEXT DEFAULT \'token_sale\',state TEXT,payment_txid TEXT,delivery_txid TEXT UNIQUE,attempts INTEGER DEFAULT 0,updated_at INTEGER)'); }
 function prepare($sql,...$args){$i=0;return preg_replace_callback('/%[ds]/',function($m)use(&$i,$args){$v=$args[$i++];return $m[0]==='%d'?(string)(int)$v:$this->db->quote((string)$v);},$sql);}
 function query($sql){$sql=str_replace('INSERT IGNORE','INSERT OR IGNORE',$sql);try{return $this->db->exec($sql==='START TRANSACTION'?'BEGIN':$sql);}catch(Throwable $e){return false;}}
 function get_row($sql,$mode){if(str_starts_with($sql,'SHOW TABLE STATUS'))return array('Engine'=>'InnoDB');return $this->db->query(str_replace(' FOR UPDATE','',$sql))->fetch(PDO::FETCH_ASSOC)?:null;}
 function insert($table,$data){if($this->fail_job&&$table==='t_neo_counter_delivery')return false;try{$sql='INSERT INTO '.$table.' ('.implode(',',array_keys($data)).') VALUES ('.implode(',',array_fill(0,count($data),'?')).')';$this->db->prepare($sql)->execute(array_values($data));$this->insert_id=(int)$this->db->lastInsertId();return 1;}catch(Throwable $e){return false;}}
 function update($table,$data,$where){$set=implode(',',array_map(fn($k)=>$k.'=?',array_keys($data)));$clause=implode(' AND ',array_map(fn($k)=>$k.'=?',array_keys($where)));try{$s=$this->db->prepare('UPDATE '.$table.' SET '.$set.' WHERE '.$clause);$s->execute(array_merge(array_values($data),array_values($where)));return $s->rowCount();}catch(Throwable $e){return false;}}
 function suppress_errors($value){return false;}
 function get_var($sql){return $this->db->query($sql)->fetchColumn();}
 function count($table){return (int)$this->db->query('SELECT COUNT(*) FROM t_neo_counter_'.$table)->fetchColumn();}
}
$wpdb=new DB();require __DIR__.'/settlement.php';
function check($ok,$message){if(!$ok)throw new Exception($message);}
function rejects($f,$message){try{$f();}catch(Throwable $e){return;}throw new Exception($message);}
function request_key($n){return '00000000-0000-4000-8000-'.str_pad((string)$n,12,'0',STR_PAD_LEFT);}
$record=array('payment_currency'=>'BTC','currency_decimals'=>8,'total_minor'=>'54500','delivery_wallet'=>'payer','collection_address'=>'collection','counterparty_ledger'=>'cp20','asset'=>'PLEDGEBOND','quantity'=>'1','token_source_address'=>'treasury','market_reference'=>array('referenceId'=>'fixture','valuationDay'=>gmdate('Y-m-d'),'expiresAt'=>(time()+300)*1000),'terms_sha256'=>str_repeat('1',64));
check(is_int(neo_counter_create_locked_invoice(101,$record,request_key(1))),'Create invoice');
check(is_wp_error(neo_counter_create_locked_invoice(102,$record,request_key(1))),'Duplicate request blocked');
check(neo_counter_create_locked_invoice(102,$record,request_key(2))>0,'Second invoice');
$invoice=neo_counter_invoice(101)['invoice'];check($invoice['payable']===false&&$invoice['markup_bps']===900,'Locked invoice policy');
$hash=str_repeat('b',64);$tx=array('txid'=>str_repeat('a',64),'vin'=>array(array('txid'=>str_repeat('4',64),'vout'=>0,'prevout'=>array('scriptpubkey_address'=>'payer','value'=>55500))),'vout'=>array(array('scriptpubkey_address'=>'collection','scriptpubkey'=>'fixture','value'=>54500)),'status'=>array('confirmed'=>true,'block_height'=>100,'block_hash'=>$hash,'block_time'=>time()+1));
$observation=array('transaction'=>$tx,'chain'=>array('height'=>102,'canonical_hash'=>$hash));
check(neo_counter_assess_btc($invoice,$tx,$observation['chain'],time())['state']==='PAYMENT_CONFIRMED','Three confirmations');
$case=$tx;$case['vout'][0]['value']=54499;check(neo_counter_assess_btc($invoice,$case,$observation['chain'],time())['state']==='NO_EXACT_PAYMENT','Underpayment rejected');
$case=$tx;$case['vin'][0]['prevout']['scriptpubkey_address']='other';check(neo_counter_assess_btc($invoice,$case,$observation['chain'],time())['state']==='PAYER_MISMATCH','Payer mismatch');
$case=$tx;$case['status']['block_time']=$invoice['expires_at']+1;check(neo_counter_assess_btc($invoice,$case,$observation['chain'],$invoice['expires_at']+10)['state']==='LATE_PAYMENT_REVIEW','Late payment review');
$case=$tx;$case['status']['block_time']=$invoice['created_at']-1;check(neo_counter_assess_btc($invoice,$case,$observation['chain'],time())['state']==='PREEXISTING_PAYMENT_REVIEW','Preexisting payment rejected');
$token=$invoice;$token['currency_asset']='NOMNI';check(neo_counter_assess_btc($token,$tx,$observation['chain'],time())['state']==='ASSET_VERIFIER_REQUIRED','BTC cannot stand in for token settlement');
check(neo_counter_observations_agree($observation,$observation),'Same observations agree');$other=$observation;$other['transaction']['vout'][0]['value']++;check(!neo_counter_observations_agree($observation,$other),'Indexer divergence rejected');
$detected=$observation;$detected['transaction']['status']=array('confirmed'=>false);neo_counter_record_payment(101,$detected);check($wpdb->count('claims')===0&&$wpdb->count('delivery')===0,'Mempool cannot claim or deliver');
$r=neo_counter_record_payment(101,$observation);check($r['state']==='PAYMENT_REVIEW_REQUIRED'&&$r['delivery']==='NOT_SENT','Confirmed funds held for setup');
neo_counter_record_payment(101,$observation);check($wpdb->count('claims')===1&&$wpdb->count('delivery')===1,'Repeat verification creates no duplicate');
rejects(fn()=>neo_counter_record_payment(102,$observation),'Same tx cannot pay second invoice');
neo_counter_create_locked_invoice(103,$record,request_key(3));$new=$observation;$new['transaction']['txid']=str_repeat('c',64);$wpdb->fail_job=true;rejects(fn()=>neo_counter_record_payment(103,$new),'Injected queue failure');$wpdb->fail_job=false;check($wpdb->count('claims')===1&&neo_counter_invoice(103)['state']==='LOCKED_NOT_PAYABLE','Claim and invoice rollback with queue failure');
$reorg=$observation;$reorg['chain']['canonical_hash']=str_repeat('d',64);neo_counter_record_payment(101,$reorg);check(neo_counter_invoice(101)['state']==='PAYMENT_RECHECK_REQUIRED','Reorg holds invoice');check($wpdb->db->query('SELECT state FROM t_neo_counter_delivery')->fetchColumn()==='HOLD_PAYMENT_RECHECK','Reorg holds queue');
$wpdb->db->exec("UPDATE t_neo_counter_invoices SET payload='{}' WHERE order_id=103");check(is_wp_error(neo_counter_invoice(103)),'Invoice tampering blocked');
foreach($actions['rest_api_init'] as $callback)$callback();$uid=0;check(!$routes['/invoices/(?P<order_id>[0-9]+)']['permission_callback'](),'Anonymous invoice denied');check(!$routes['/invoices/(?P<order_id>[0-9]+)/verify']['permission_callback'](),'Anonymous verifier denied');
$uid=99;$result=$routes['/invoices/(?P<order_id>[0-9]+)']['callback'](array('order_id'=>101));check(is_wp_error($result)&&$result->data['status']===404,'Other member invoice hidden');
check(neo_counter_storage_selftest(),'Rollback-only live schema probe');check($wpdb->count('invoices')===3&&$wpdb->count('claims')===1&&$wpdb->count('delivery')===1,'Schema probe leaves no rows');
// Token proof is independent of dust outputs and uses an explicit ledger.
$ti=$invoice;$ti['currency_asset']='NOMNI';$ti['amount_minor']='34';
$to=$observation;$to['transaction']['vin'][0]['prevout']['scriptpubkey_address']='irrelevant BTC fee payer';$to['transaction']['vout'][0]['value']=546;
$to['token']=array('ledger'=>'cp20','height'=>102,'block_hash'=>$hash,'sends'=>array(array('tx_hash'=>$tx['txid'],'source'=>'payer','destination'=>'collection','asset'=>'NOMNI','quantity'=>34,'status'=>'valid','send_type'=>'send','block_index'=>100)));
check(neo_counter_assess_token($ti,$to,time())['state']==='PAYMENT_CONFIRMED','Exact token transfer confirms without mistaking dust for payment');
foreach(array('asset'=>'OTHER','quantity'=>33,'source'=>'attacker','status'=>'invalid: insufficient funds','block_index'=>99,'send_type'=>'attach') as $field=>$value){$bad=$to;$bad['token']['sends'][0][$field]=$value;check(neo_counter_assess_token($ti,$bad,time())['state']!=='PAYMENT_CONFIRMED','Reject token '.$field);}
$bad=$to;$bad['token']['ledger']='classic';check(neo_counter_assess_token($ti,$bad,time())['state']==='LEDGER_MISMATCH','No cross-ledger proof');
$bad=$to;$bad['token']['block_hash']=str_repeat('0',64);check(neo_counter_assess_token($ti,$bad,time())['state']==='TOKEN_CHAIN_MISMATCH','Parser fork hold');
$bad=$to;$bad['token']['sends'][]=$bad['token']['sends'][0];check(neo_counter_assess_token($ti,$bad,time())['state']==='NO_EXACT_TOKEN_PAYMENT','Ambiguous multi-send held');
rejects(fn()=>neo_counter_atomic_quantity(34.0),'Float quantities rejected');
// Real SQL reservations serialize through one stock row and roll back with caller transaction.
$row=neo_counter_invoice(102);$snap=array('ledger'=>'cp20','source'=>'treasury','asset'=>'PLEDGEBOND','available'=>'100000000','decimals'=>8,'observed_at'=>time());
$wpdb->query('START TRANSACTION');check(neo_counter_reserve_inventory($row,$snap),'Reserve exact available stock');check(neo_counter_reserve_inventory($row,$snap),'Same invoice idempotent');$wpdb->query('COMMIT');
$row2=neo_counter_invoice(101);$wpdb->query('START TRANSACTION');check(!neo_counter_reserve_inventory($row2,$snap),'Second invoice cannot oversell');$wpdb->query('ROLLBACK');
check($wpdb->count('reservations')===1,'Exactly one reservation');
$snap['available']='200000000';$wpdb->query('START TRANSACTION');check(neo_counter_reserve_inventory($row2,$snap),'Second reservation when sufficient');$wpdb->query('ROLLBACK');check($wpdb->count('reservations')===1,'Rolled-back reservation leaves no stock claim');
$snap['observed_at']=time()-61;$wpdb->query('START TRANSACTION');check(!neo_counter_reserve_inventory($row2,$snap),'Stale inventory held');$wpdb->query('ROLLBACK');
echo "PASS: token asset/amount/source/ledger/block rules, inventory capacity/idempotency/rollback, invoice locking, payer/amount/confirmation/expiry checks, real SQL uniqueness and rollback, replay, reorg, integrity and private routes\n";
