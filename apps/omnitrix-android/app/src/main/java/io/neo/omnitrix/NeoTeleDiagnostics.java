package io.neo.omnitrix;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.telephony.euicc.EuiccManager;
import org.json.JSONObject;

// NTEL-017: local read-only observations; no IMEI/EID/ICCID/IMSI, phone number or location.
public final class NeoTeleDiagnostics {
  private NeoTeleDiagnostics() {}
  public static JSONObject snapshot(Context context, boolean consent) throws Exception {
    if (!consent) throw new SecurityException("diagnostics_consent_required");
    JSONObject data = new JSONObject();
    EuiccManager euicc = (EuiccManager) context.getSystemService(Context.EUICC_SERVICE);
    data.put("esimEnabled", euicc != null && euicc.isEnabled());
    ConnectivityManager manager = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
    Network network = manager == null ? null : manager.getActiveNetwork();
    NetworkCapabilities capabilities = network == null ? null : manager.getNetworkCapabilities(network);
    String transport = "NONE";
    if (capabilities != null) {
      if (capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)) transport = "CELLULAR";
      else if (capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) transport = "WIFI";
    }
    data.put("transport", transport);
    data.put("validated", capabilities != null && capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED));
    data.put("observationOnly", true);
    data.put("carrierProvisioningEnabled", false);
    return data;
  }
}
