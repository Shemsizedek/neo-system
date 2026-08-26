plugins { id("com.android.application") }

android {
    namespace = "io.neo.omnitrix"
    compileSdk = 35

    defaultConfig {
        applicationId = "io.neo.omnitrix"
        minSdk = 26
        targetSdk = 35
        versionCode = 17
        versionName = "2.6.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
}

dependencies {
    implementation("org.bitcoinj:bitcoinj-core:0.17.1")
    implementation("com.google.zxing:core:3.5.3")
}
