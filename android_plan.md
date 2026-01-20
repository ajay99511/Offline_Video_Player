# Native Android Offline Media Player - Implementation Guide

This guide provides the complete blueprint and source code to build a production-grade Android application that replicates your React web app's functionality but with native capabilities (automatic file syncing, background playback, hardware controls).

**Tech Stack:**
*   **Language:** Kotlin
*   **UI Framework:** Jetpack Compose (Material3)
*   **Media Engine:** AndroidX Media3 (ExoPlayer + MediaSession)
*   **Image Loading:** Coil
*   **Architecture:** MVVM (Model-View-ViewModel)

---

## Step 1: Project Setup & Dependencies

1.  Open **Android Studio**.
2.  Create a **New Project** -> **Empty Activity** (make sure to select "Compose").
3.  Name it `LocalMediaPlayer`.
4.  Open `app/build.gradle.kts` (Module level) and add these dependencies:

```kotlin
// app/build.gradle.kts

dependencies {
    val media3_version = "1.2.1" // or latest
    val nav_version = "2.7.7"

    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
    implementation("androidx.activity:activity-compose:1.8.2")
    implementation(platform("androidx.compose:compose-bom:2024.02.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    
    // Navigation
    implementation("androidx.navigation:navigation-compose:$nav_version")

    // Icons
    implementation("androidx.compose.material:material-icons-extended:1.6.0")

    // Media3 (ExoPlayer & Session)
    implementation("androidx.media3:media3-exoplayer:$media3_version")
    implementation("androidx.media3:media3-session:$media3_version")
    implementation("androidx.media3:media3-ui:$media3_version")

    // Coil (Image Loading for Album Art/Thumbnails)
    implementation("io.coil-kt:coil-compose:2.6.0")

    // Permissions
    implementation("com.google.accompanist:accompanist-permissions:0.34.0")
}
```

---

## Step 2: Manifest Configuration

We need permissions to read files and a Service declaration for background audio.

**File:** `app/src/main/AndroidManifest.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools">

    <!-- Permissions to read media -->
    <uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
    <uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
    <!-- Fallback for older Android versions -->
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    
    <!-- For background playback -->
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />

    <application
        android:allowBackup="true"
        android:dataExtractionRules="@xml/data_extraction_rules"
        android:fullBackupContent="@xml/backup_rules"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:theme="@style/Theme.LocalMediaPlayer">
        
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:theme="@style/Theme.LocalMediaPlayer">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- Media Session Service for Background Audio -->
        <service
            android:name=".service.PlaybackService"
            android:foregroundServiceType="mediaPlayback"
            android:exported="true">
            <intent-filter>
                <action android:name="androidx.media3.session.MediaSessionService" />
            </intent-filter>
        </service>

    </application>
</manifest>
```

---

## Step 3: Data Model

Define the structure of your media files.

**File:** `app/src/main/java/com/example/localmediaplayer/model/MediaFile.kt`

```kotlin
package com.example.localmediaplayer.model

import android.net.Uri

data class MediaFile(
    val id: Long,
    val uri: Uri,
    val title: String,
    val artist: String? = null, // For Audio
    val duration: Long,
    val isVideo: Boolean,
    val albumArtUri: Uri? = null
)
```

---

## Step 4: Media Playback Service

This is the engine. It runs separately from the UI so music keeps playing when you close the app.

**File:** `app/src/main/java/com/example/localmediaplayer/service/PlaybackService.kt`

```kotlin
package com.example.localmediaplayer.service

import android.content.Intent
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService

class PlaybackService : MediaSessionService() {
    private var mediaSession: MediaSession? = null

    override fun onCreate() {
        super.onCreate()
        val player = ExoPlayer.Builder(this).build()
        mediaSession = MediaSession.Builder(this, player).build()
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? {
        return mediaSession
    }

    override fun onDestroy() {
        mediaSession?.run {
            player.release()
            release()
            mediaSession = null
        }
        super.onDestroy()
    }
}
```

---

## Step 5: ViewModel (Logic & Scanning)

This handles syncing with disk (`MediaStore`) and managing the player connection.

**File:** `app/src/main/java/com/example/localmediaplayer/viewmodel/MainViewModel.kt`

```kotlin
package com.example.localmediaplayer.viewmodel

import android.app.Application
import android.content.ComponentName
import android.content.ContentUris
import android.net.Uri
import android.provider.MediaStore
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Player
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import com.example.localmediaplayer.model.MediaFile
import com.example.localmediaplayer.service.PlaybackService
import com.google.common.util.concurrent.ListenableFuture
import com.google.common.util.concurrent.MoreExecutors
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class MainViewModel(application: Application) : AndroidViewModel(application) {

    private val _videoList = MutableStateFlow<List<MediaFile>>(emptyList())
    val videoList = _videoList.asStateFlow()

    private val _audioList = MutableStateFlow<List<MediaFile>>(emptyList())
    val audioList = _audioList.asStateFlow()

    private var controllerFuture: ListenableFuture<MediaController>? = null
    val player = MutableStateFlow<Player?>(null)

    init {
        startService()
    }

    private fun startService() {
        val sessionToken = SessionToken(getApplication(), ComponentName(getApplication(), PlaybackService::class.java))
        controllerFuture = MediaController.Builder(getApplication(), sessionToken).buildAsync()
        controllerFuture?.addListener({
            player.value = controllerFuture?.get()
        }, MoreExecutors.directExecutor())
    }

    fun scanMedia() {
        viewModelScope.launch {
            _videoList.value = queryMedia(isVideo = true)
            _audioList.value = queryMedia(isVideo = false)
        }
    }

    private fun queryMedia(isVideo: Boolean): List<MediaFile> {
        val mediaList = mutableListOf<MediaFile>()
        val collection = if (android.os.Build.VERSION.SDK_INT >= 29) {
            if (isVideo) MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL)
            else MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL)
        } else {
            if (isVideo) MediaStore.Video.Media.EXTERNAL_CONTENT_URI
            else MediaStore.Audio.Media.EXTERNAL_CONTENT_URI
        }

        val projection = if (isVideo) {
            arrayOf(MediaStore.Video.Media._ID, MediaStore.Video.Media.DISPLAY_NAME, MediaStore.Video.Media.DURATION)
        } else {
            arrayOf(MediaStore.Audio.Media._ID, MediaStore.Audio.Media.TITLE, MediaStore.Audio.Media.ARTIST, MediaStore.Audio.Media.DURATION, MediaStore.Audio.Media.ALBUM_ID)
        }

        getApplication<Application>().contentResolver.query(collection, projection, null, null, null)?.use { cursor ->
            val idColumn = cursor.getColumnIndexOrThrow(if(isVideo) MediaStore.Video.Media._ID else MediaStore.Audio.Media._ID)
            val nameColumn = cursor.getColumnIndexOrThrow(if(isVideo) MediaStore.Video.Media.DISPLAY_NAME else MediaStore.Audio.Media.TITLE)
            val durationColumn = cursor.getColumnIndexOrThrow(if(isVideo) MediaStore.Video.Media.DURATION else MediaStore.Audio.Media.DURATION)
            
            // Audio specific
            val artistColumn = if (!isVideo) cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST) else -1
            val albumIdColumn = if (!isVideo) cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM_ID) else -1

            while (cursor.moveToNext()) {
                val id = cursor.getLong(idColumn)
                val name = cursor.getString(nameColumn)
                val duration = cursor.getLong(durationColumn)
                val contentUri = ContentUris.withAppendedId(collection, id)

                var artist = ""
                var albumArtUri: Uri? = null

                if (!isVideo) {
                    artist = cursor.getString(artistColumn)
                    val albumId = cursor.getLong(albumIdColumn)
                    val sArtworkUri = Uri.parse("content://media/external/audio/albumart")
                    albumArtUri = ContentUris.withAppendedId(sArtworkUri, albumId)
                }

                mediaList.add(MediaFile(id, contentUri, name, artist, duration, isVideo, albumArtUri))
            }
        }
        return mediaList
    }

    fun playMedia(media: MediaFile) {
        player.value?.let { exoPlayer ->
            val mediaItem = MediaItem.Builder()
                .setUri(media.uri)
                .setMediaMetadata(
                    MediaMetadata.Builder()
                        .setTitle(media.title)
                        .setArtist(media.artist)
                        .build()
                )
                .build()
            
            exoPlayer.setMediaItem(mediaItem)
            exoPlayer.prepare()
            exoPlayer.play()
        }
    }
    
    override fun onCleared() {
        super.onCleared()
        controllerFuture?.let { MediaController.releaseFuture(it) }
    }
}
```

---

## Step 6: UI Implementation (Compose)

This file contains the Screens (Video List, Audio List, Player).

**File:** `app/src/main/java/com/example/localmediaplayer/MainActivity.kt`

```kotlin
package com.example.localmediaplayer

import android.Manifest
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.media3.ui.PlayerView
import coil.compose.AsyncImage
import com.example.localmediaplayer.model.MediaFile
import com.example.localmediaplayer.viewmodel.MainViewModel
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.rememberMultiplePermissionsState

class MainActivity : ComponentActivity() {
    private val viewModel: MainViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme(colorScheme = darkColorScheme()) {
                MainScreen(viewModel)
            }
        }
    }
}

@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun MainScreen(viewModel: MainViewModel) {
    val permissions = if (Build.VERSION.SDK_INT >= 33) {
        listOf(Manifest.permission.READ_MEDIA_VIDEO, Manifest.permission.READ_MEDIA_AUDIO)
    } else {
        listOf(Manifest.permission.READ_EXTERNAL_STORAGE)
    }
    
    val permissionState = rememberMultiplePermissionsState(permissions)

    LaunchedEffect(Unit) {
        if (!permissionState.allPermissionsGranted) {
            permissionState.launchMultiplePermissionRequest()
        } else {
            viewModel.scanMedia()
        }
    }
    
    // If permissions granted, show UI
    if (permissionState.allPermissionsGranted) {
        MediaPlayerApp(viewModel)
    } else {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("Permissions required to access media.")
        }
    }
}

@Composable
fun MediaPlayerApp(viewModel: MainViewModel) {
    var selectedTab by remember { mutableStateOf(0) }
    var currentMedia by remember { mutableStateOf<MediaFile?>(null) }
    
    Scaffold(
        bottomBar = {
            if (currentMedia?.isVideo != true) { // Hide nav when watching video
                NavigationBar {
                    NavigationBarItem(
                        icon = { Icon(Icons.Default.VideoLibrary, "Video") },
                        label = { Text("Video") },
                        selected = selectedTab == 0,
                        onClick = { selectedTab = 0 }
                    )
                    NavigationBarItem(
                        icon = { Icon(Icons.Default.LibraryMusic, "Audio") },
                        label = { Text("Audio") },
                        selected = selectedTab == 1,
                        onClick = { selectedTab = 1 }
                    )
                }
            }
        }
    ) { padding ->
        Box(modifier = Modifier.padding(padding).fillMaxSize()) {
            if (currentMedia != null && currentMedia!!.isVideo) {
                // Full Screen Video Player
                VideoPlayerScreen(
                    viewModel = viewModel, 
                    onBack = { 
                        currentMedia = null 
                        viewModel.player.value?.pause()
                    }
                )
            } else {
                // Tabs
                if (selectedTab == 0) {
                    VideoListScreen(viewModel) { 
                        currentMedia = it
                        viewModel.playMedia(it)
                    }
                } else {
                    AudioListScreen(viewModel) {
                        // For audio, we just play, we don't switch full screen necessarily
                        viewModel.playMedia(it)
                    }
                }
            }
        }
    }
}

@Composable
fun VideoListScreen(viewModel: MainViewModel, onVideoClick: (MediaFile) -> Unit) {
    val videos by viewModel.videoList.collectAsStateWithLifecycle()
    
    LazyColumn {
        items(videos) { video ->
            ListItem(
                headlineContent = { Text(video.title) },
                leadingContent = {
                    AsyncImage(
                        model = video.uri, // Coil handles video thumbnails automatically
                        contentDescription = null,
                        modifier = Modifier.size(60.dp),
                        contentScale = ContentScale.Crop
                    )
                },
                modifier = Modifier.clickable { onVideoClick(video) }
            )
        }
    }
}

@Composable
fun AudioListScreen(viewModel: MainViewModel, onAudioClick: (MediaFile) -> Unit) {
    val audio by viewModel.audioList.collectAsStateWithLifecycle()

    LazyColumn {
        items(audio) { song ->
            ListItem(
                headlineContent = { Text(song.title) },
                supportingContent = { Text(song.artist ?: "Unknown") },
                leadingContent = {
                    AsyncImage(
                        model = song.albumArtUri ?: R.drawable.ic_launcher_foreground,
                        contentDescription = null,
                        modifier = Modifier.size(50.dp)
                    )
                },
                modifier = Modifier.clickable { onAudioClick(song) }
            )
        }
    }
}

@Composable
fun VideoPlayerScreen(viewModel: MainViewModel, onBack: () -> Unit) {
    val player = viewModel.player.collectAsStateWithLifecycle().value

    Box(modifier = Modifier.fillMaxSize().background(Color.Black)) {
        if (player != null) {
            AndroidView(
                factory = { context ->
                    PlayerView(context).apply {
                        this.player = player
                        this.useController = true // Built-in ExoPlayer controls
                    }
                },
                modifier = Modifier.fillMaxSize()
            )
        }
        
        IconButton(onClick = onBack, modifier = Modifier.align(Alignment.TopStart).padding(16.dp)) {
            Icon(Icons.Default.ArrowBack, "Back", tint = Color.White)
        }
    }
}
```

---

## Steps to Build & Install

1.  **Copy Code**: Create the files listed above in your Android Studio project structure (ensure package names match).
2.  **Sync Gradle**: Click "Sync Now" in the top right to download libraries.
3.  **Run**: Connect your Android device via USB (ensure Developer Options > USB Debugging is ON).
4.  **Install**: Click the Green "Play" button in Android Studio.
5.  **Permissions**: When the app opens, tap "Allow" for storage permissions.

## Key Differences from Web Version

*   **Media Discovery**: The `MainViewModel` uses `ContentResolver` to query the operating system's database. This means any file you drop into your phone's storage appears instantly.
*   **Performance**: `LazyColumn` handles thousands of files smoothly (unlike DOM rendering).
*   **Media Engine**: Uses `ExoPlayer` natively, which supports more codecs (MKV, AVI, FLAC) than a browser `<video>` tag.
*   **Background Play**: The `MediaSessionService` ensures audio continues even if you lock the screen.
