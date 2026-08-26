plugins { id("com.android.application") }

android {
    namespace = "io.neo.omnitrix"
    compileSdk = 35

    defaultConfig {
        applicationId = "io.neo.omnitrix"
        minSdk = 26
        targetSdk = 35
        versionCode = 8
        versionName = "1.7.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
}
