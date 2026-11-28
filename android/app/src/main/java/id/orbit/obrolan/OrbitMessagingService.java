package id.orbit.obrolan;

import android.app.NotificationManager;
import android.content.Context;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

/** Menerima pesan data dari server Orbit (Vercel) lewat FCM, walau aplikasi tertutup. */
public class OrbitMessagingService extends FirebaseMessagingService {
    @Override
    public void onNewToken(String token) {
        getSharedPreferences("orbit", MODE_PRIVATE).edit().putString("fcm", token).apply();
    }

    @Override
    public void onMessageReceived(RemoteMessage m) {
        Map<String, String> d = m.getData();
        String type = d.get("type");
        if (type == null) return;
        if ("cancel".equals(type)) {
            ((NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE)).cancel(Notifier.CALL_ID);
            return;
        }
        /* Saat Orbit terbuka, aplikasi web sendiri yang menampilkan pesan dan layar panggilan */
        if (MainActivity.visible) return;
        if ("call".equals(type)) Notifier.call(this, d);
        else Notifier.msg(this, d);
    }
}
