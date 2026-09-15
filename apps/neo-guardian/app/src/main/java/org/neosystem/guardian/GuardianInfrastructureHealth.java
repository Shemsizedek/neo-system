package org.neosystem.guardian;

import java.net.HttpURLConnection;
import java.net.URL;
import java.security.cert.Certificate;
import java.security.cert.X509Certificate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import javax.net.ssl.HttpsURLConnection;

/** Read-only public health checks for protected NEO infrastructure. No mutation is performed. */
final class GuardianInfrastructureHealth {
    static final class Result {
        final String name;
        final String url;
        final boolean healthy;
        final int httpStatus;
        final String certificateSubject;
        final long certificateNotAfter;
        final String detail;

        Result(String name, String url, boolean healthy, int httpStatus,
               String certificateSubject, long certificateNotAfter, String detail) {
            this.name = name;
            this.url = url;
            this.healthy = healthy;
            this.httpStatus = httpStatus;
            this.certificateSubject = certificateSubject;
            this.certificateNotAfter = certificateNotAfter;
            this.detail = detail;
        }
    }

    private static final String[][] TARGETS = new String[][]{
            {"NEO application", "https://neo.holytemples.org/"},
            {"Holy Temples", "https://holytemples.org/"},
            {"World Court", "https://court.holytemples.org/"},
            {"GitHub Pages primary", "https://shemsizedek.github.io/neo-system/"},
            {"GitHub repository", "https://github.com/Shemsizedek/neo-system"}
    };

    private GuardianInfrastructureHealth() {}

    static List<Result> run() {
        List<Result> out = new ArrayList<>();
        for (String[] target : TARGETS) out.add(check(target[0], target[1]));
        return Collections.unmodifiableList(out);
    }

    private static Result check(String name, String endpoint) {
        HttpURLConnection connection = null;
        try {
            URL url = new URL(endpoint);
            connection = (HttpURLConnection) url.openConnection();
            connection.setInstanceFollowRedirects(true);
            connection.setConnectTimeout(8000);
            connection.setReadTimeout(8000);
            connection.setRequestMethod("GET");
            connection.setRequestProperty("User-Agent", "NEO-Guardian/3.2 Android");
            connection.setRequestProperty("Accept", "text/html,application/json;q=0.9,*/*;q=0.5");
            int status = connection.getResponseCode();
            boolean healthy = status >= 200 && status < 400;
            String certSubject = "n/a";
            long certNotAfter = 0L;
            if (connection instanceof HttpsURLConnection) {
                try {
                    Certificate[] certificates = ((HttpsURLConnection) connection).getServerCertificates();
                    if (certificates != null && certificates.length > 0 && certificates[0] instanceof X509Certificate) {
                        X509Certificate cert = (X509Certificate) certificates[0];
                        certSubject = cert.getSubjectX500Principal().getName();
                        certNotAfter = cert.getNotAfter().getTime();
                    }
                } catch (Throwable ignored) {}
            }
            return new Result(name, endpoint, healthy, status, certSubject, certNotAfter,
                    healthy ? "HTTPS endpoint responded" : "Unexpected HTTP status");
        } catch (Throwable t) {
            return new Result(name, endpoint, false, 0, "unavailable", 0L,
                    t.getClass().getSimpleName());
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    static boolean githubPrimaryHealthy(List<Result> results) {
        if (results == null) return false;
        for (Result r : results) if ("GitHub Pages primary".equals(r.name)) return r.healthy;
        return false;
    }
}
