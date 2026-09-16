package org.neosystem.guardian;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;

/** Explicit opt-in foreground defense. Permanent notification and immediate STOP action; no content capture. */
public final class GuardianForegroundService extends Service {
    static final String ACTION_STOP="org.neosystem.guardian.STOP_WORK_SHIELD";
    private static final String CHANNEL="neo_guardian_work_shield";
    @Override public void onCreate(){super.onCreate();createChannel();startForeground(330,notification());}
    @Override public int onStartCommand(Intent intent,int flags,int startId){if(intent!=null&&ACTION_STOP.equals(intent.getAction())){stopForeground(true);stopSelf();return START_NOT_STICKY;}return START_STICKY;}
    @Override public IBinder onBind(Intent i){return null;}
    private void createChannel(){if(Build.VERSION.SDK_INT>=26){NotificationManager nm=getSystemService(NotificationManager.class);if(nm!=null)nm.createNotificationChannel(new NotificationChannel(CHANNEL,"NEO Guardian Work Shield",NotificationManager.IMPORTANCE_LOW));}}
    private Notification notification(){
        Intent open=new Intent(this,WorkShieldActivity.class);PendingIntent openPi=PendingIntent.getActivity(this,1,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        Intent stop=new Intent(this,GuardianForegroundService.class).setAction(ACTION_STOP);PendingIntent stopPi=PendingIntent.getService(this,2,stop,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder b=Build.VERSION.SDK_INT>=26?new Notification.Builder(this,CHANNEL):new Notification.Builder(this);
        return b.setSmallIcon(R.drawable.neo_guardian_logo).setContentTitle("NEO Guardian Work Shield active").setContentText("Visible defensive monitoring of local posture metadata. Tap STOP to end.").setOngoing(true).setContentIntent(openPi).addAction(new Notification.Action.Builder(null,"STOP",stopPi).build()).build();
    }
}
