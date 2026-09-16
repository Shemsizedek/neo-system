package org.neosystem.guardian;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public final class ProtectedInfrastructure {
    private ProtectedInfrastructure() {}

    public static final String GITHUB_REPOSITORY = "Shemsizedek/neo-system";
    public static final String GITHUB_PAGES = "https://shemsizedek.github.io/neo-system/";
    public static final String NEO_DOMAIN = "https://neo.holytemples.org/";
    public static final String HOLY_TEMPLES = "https://holytemples.org/";
    public static final String WORLD_COURT = "https://court.holytemples.org/";

    public static final List<String> PUBLIC_ENDPOINTS = Collections.unmodifiableList(Arrays.asList(
            NEO_DOMAIN,
            HOLY_TEMPLES,
            WORLD_COURT,
            GITHUB_PAGES
    ));

    public static boolean isCanonicalPrimary(String endpoint) {
        return GITHUB_PAGES.equals(endpoint) || NEO_DOMAIN.equals(endpoint);
    }

    public static boolean isProtectedEndpoint(String endpoint) {
        return PUBLIC_ENDPOINTS.contains(endpoint);
    }

    public static String outageClassification(boolean githubHealthy, boolean neoDomainHealthy, boolean courtHealthy, boolean wordpressHealthy) {
        if (!githubHealthy && !neoDomainHealthy) return "PRIMARY_NEO_OUTAGE";
        if (githubHealthy && !neoDomainHealthy) return "CUSTOM_DOMAIN_ROUTING_DEGRADED";
        if (!courtHealthy) return "WORLD_COURT_DEGRADED";
        if (!wordpressHealthy) return "HOLYTEMPLES_WORDPRESS_DEGRADED";
        return "HEALTHY";
    }
}
