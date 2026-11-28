package id.orbit.obrolan;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;

import java.util.Map;

final class Notifier {
    static final int CALL_ID = 4001;
    private static final String CH_CALL = "calls";
    private static final String CH_MSG = "messages";

    private Notifier() { }

    private static String s(Map<String, String> d, String k, String def) {
        String v = d.get(k);
        return v == null || v.isEmpty() ? def : v;
    }

    private static NotificationManager nm(Context c) {
        NotificationManager m = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        Uri ring = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
        AudioAttributes aa = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIC).build();
        NotificationChannel call = new NotificationChannel(CH_CALL, "Panggilan masuk", NotificationManager.IMPORTANCE_HIGH);
        call.setSound(ring, aa);
        call.enableVibration(true);
        call.setVibrationPattern(new long[]{0, 600, 400, 600, 400, 600});
        call.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        m.createNotificationChannel(call);
        NotificationChannel msg = new NotificationChannel(CH_MSG, "Pesan", NotificationManager.IMPORTANCE_HIGH);
        msg.enableVibration(true);
        msg.setLockscreenVisibility(Notification.VISIBILITY_PRIVATE);
        m.createNotificationChannel(msg);
        return m;
    }

    private static PendingIntent open(Context c, boolean call, int req) {
        Intent i = new Intent(c, MainActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP)
                .putExtra("call", call);
        return PendingIntent.getActivity(c, req, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    /** Panggilan masuk: berdering terus (FLAG_INSISTENT) dan membuka layar penuh di atas layar kunci. */
    static void call(Context c, Map<String, String> d) {
        NotificationManager m = nm(c);
        PendingIntent pi = open(c, true, 1);
        Notification n = new Notification.Builder(c, CH_CALL)
                .setSmallIcon(R.drawable.ic_stat)
                .setContentTitle(s(d, "title", "Panggilan masuk"))
                .setContentText(s(d, "body", "Orbit"))
                .setCategory(Notification.CATEGORY_CALL)
                .setOngoing(true)
                .setAutoCancel(true)
                .setContentIntent(pi)
                .setFullScreenIntent(pi, true)
                .setTimeoutAfter(40000)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .build();
        n.flags |= Notification.FLAG_INSISTENT;
        m.notify(CALL_ID, n);
    }

    static void msg(Context c, Map<String, String> d) {
        NotificationManager m = nm(c);
        String tag = s(d, "tag", "msg");
        Notification n = new Notification.Builder(c, CH_MSG)
                .setSmallIcon(R.drawable.ic_stat)
                .setContentTitle(s(d, "title", "Orbit"))
                .setContentText(s(d, "body", "Pesan baru"))
                .setCategory(Notification.CATEGORY_MESSAGE)
                .setAutoCancel(true)
                .setContentIntent(open(c, false, tag.hashCode()))
                .build();
        m.notify(tag.hashCode(), n);
    }
}
