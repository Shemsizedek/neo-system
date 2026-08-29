package io.neo.omnitrix;

import android.app.job.*;
import android.content.*;
import android.os.PersistableBundle;
import org.json.JSONObject;

/** v4.0 network-constrained encrypted file sync using Android JobScheduler. */
public final class BackgroundFileSync extends JobService {
 private static final int JOB_NOW=40940, JOB_PERIODIC=40941;
 private volatile boolean stopped;
 public static void scheduleNow(Context c){try{JobScheduler js=(JobScheduler)c.getSystemService(Context.JOB_SCHEDULER_SERVICE);JobInfo job=new JobInfo.Builder(JOB_NOW,new ComponentName(c,BackgroundFileSync.class)).setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY).setBackoffCriteria(30000L,JobInfo.BACKOFF_POLICY_EXPONENTIAL).setMinimumLatency(1500L).setOverrideDeadline(30000L).build();js.schedule(job);schedulePeriodic(c);}catch(Exception ignored){}}
 public static void schedulePeriodic(Context c){try{JobScheduler js=(JobScheduler)c.getSystemService(Context.JOB_SCHEDULER_SERVICE);JobInfo job=new JobInfo.Builder(JOB_PERIODIC,new ComponentName(c,BackgroundFileSync.class)).setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY).setPersisted(false).setPeriodic(15*60*1000L).build();js.schedule(job);}catch(Exception ignored){}}
 @Override public boolean onStartJob(JobParameters params){stopped=false;new Thread(()->{boolean retry=false;try{JSONObject pull=FileNativeTransport.pullAll(this);JSONObject push=FileNativeTransport.pushAll(this);retry=push.optInt("failed")>0||pull.optInt("failed")>0;getSharedPreferences("omnitrix_bg_sync_v1",MODE_PRIVATE).edit().putLong("lastRun",System.currentTimeMillis()).putInt("lastUploaded",push.optInt("uploaded")).putInt("lastApplied",pull.optInt("applied")).putBoolean("lastRetry",retry).apply();if(!stopped)SuiteSyncBus.notify(this,"Noogle Cloud",retry?"Background sync completed with retry queued":"Background encrypted file sync completed");}catch(Exception e){retry=true;getSharedPreferences("omnitrix_bg_sync_v1",MODE_PRIVATE).edit().putString("lastError",e.getMessage()==null?e.getClass().getSimpleName():e.getMessage()).apply();}finally{if(!stopped)jobFinished(params,retry);}},"neo-file-sync").start();return true;}
 @Override public boolean onStopJob(JobParameters params){stopped=true;return true;}
 public static String status(Context c){android.content.SharedPreferences p=c.getSharedPreferences("omnitrix_bg_sync_v1",MODE_PRIVATE);return "lastRun="+p.getLong("lastRun",0)+" · uploaded="+p.getInt("lastUploaded",0)+" · applied="+p.getInt("lastApplied",0)+" · retry="+p.getBoolean("lastRetry",false);}
}
