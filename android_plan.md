# Native Android Offline Media Player - Implementation Guide

This guide provides the steps to build the application using your existing `build.gradle.kts` configuration. We will use **Hilt** for dependency injection (since you have it configured) and **Media3** for the best media playback experience.

## Step 1: Update Dependencies

Open your `app/build.gradle.kts`. Keep everything you have, but **add** the following lines inside the `dependencies { ... }` block. We need these for the Player, UI, and Image loading.

```kotlin
dependencies {
    // ... keep your existing dependencies ...

    // Navigation for switching screens
    implementation("androidx.navigation:navigation-compose:2.7.7")

    // Media3 (The modern replacement for ExoPlayer/MediaPlayer)
    implementation("androidx.media3:media3-exoplayer:1.2.1")
    implementation("androidx.media3:media3-session:1.2.1")
    implementation("androidx.media3:media3-ui:1.2.1")

    // Coil (For loading album art and video thumbnails)
    implementation("io.coil-kt:coil-compose:2.6.0")

    // Permissions handling in Compose
    implementation("com.google.accompanist:accompanist-permissions:0.34.0")
    
    // Lifecycle integration
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.7.0")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.7.0")
}
```

**Sync Project with Gradle Files** after adding these.

---

## Step 2: Hilt Application Setup

Since you are using Hilt, we need an Application class to trigger code generation.

Create file: `app/src/main/java/com/local/offlinemediaplayer/MediaPlayerApp.kt`

```kotlin
package com.local.offlinemediaplayer

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class MediaPlayerApp : Application()
```

---

## Step 3: Manifest Configuration

Update `AndroidManifest.xml` to:
1.  Register the `MediaPlayerApp` class.
2.  Add permissions for reading files.
3.  Register the Background Service.

File: `app/src/main/AndroidManifest.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools">

    <!-- Permissions -->
    <uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
    <uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
    
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />

    <!-- ADD android:name=".MediaPlayerApp" HERE -->
    <application
        android:name=".MediaPlayerApp"
        android:allowBackup="true"
        android:dataExtractionRules="@xml/data_extraction_rules"
        android:fullBackupContent="@xml/backup_rules"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.LocalMediaPlayer"
        tools:targetApi="31">
        
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:theme="@style/Theme.LocalMediaPlayer">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- Service for Background Audio -->
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

## Step 4: Data Model

Create file: `app/src/main/java/com/local/offlinemediaplayer/model/MediaFile.kt`

```kotlin
package com.local.offlinemediaplayer.model

import android.net.Uri

data class MediaFile(
    val id: Long,
    val uri: Uri,
    val title: String,
    val artist: String? = null,
    val duration: Long,
    val isVideo: Boolean,
    val albumArtUri: Uri? = null
)
```

---

## Step 5: Playback Service

This service keeps music playing when the app is closed.

Create file: `app/src/main/java/com/local/offlinemediaplayer/service/PlaybackService.kt`

```kotlin
package com.local.offlinemediaplayer.service

import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
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

## Step 6: ViewModel

This handles scanning files and connecting to the service. We use Hilt (`@HiltViewModel`) to inject the Application context.

Create file: `app/src/main/java/com/local/offlinemediaplayer/viewmodel/MainViewModel.kt`

```kotlin
package com.local.offlinemediaplayer.viewmodel

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
import com.local.offlinemediaplayer.model.MediaFile
import com.local.offlinemediaplayer.service.PlaybackService
import com.google.common.util.concurrent.ListenableFuture
import com.google.common.util.concurrent.MoreExecutors
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class MainViewModel @Inject constructor(
    private val app: Application
) : AndroidViewModel(app) {

    private val _videoList = MutableStateFlow<List<MediaFile>>(emptyList())
    val videoList = _videoList.asStateFlow()

    private val _audioList = MutableStateFlow<List<MediaFile>>(emptyList())
    val audioList = _audioList.asStateFlow()

    private val _player = MutableStateFlow<Player?>(null)
    val player = _player.asStateFlow()

    private var controllerFuture: ListenableFuture<MediaController>? = null

    init {
        startService()
    }

    private fun startService() {
        val sessionToken = SessionToken(app, ComponentName(app, PlaybackService::class.java))
        controllerFuture = MediaController.Builder(app, sessionToken).buildAsync()
        controllerFuture?.addListener({
            try {
                _player.value = controllerFuture?.get()
            } catch (e: Exception) {
                e.printStackTrace()
            }
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

        try {
            app.contentResolver.query(collection, projection, null, null, null)?.use { cursor ->
                val idColumn = cursor.getColumnIndexOrThrow(if(isVideo) MediaStore.Video.Media._ID else MediaStore.Audio.Media._ID)
                val nameColumn = cursor.getColumnIndexOrThrow(if(isVideo) MediaStore.Video.Media.DISPLAY_NAME else MediaStore.Audio.Media.TITLE)
                val durationColumn = cursor.getColumnIndexOrThrow(if(isVideo) MediaStore.Video.Media.DURATION else MediaStore.Audio.Media.DURATION)
                
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
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return mediaList
    }

    fun playMedia(media: MediaFile) {
        _player.value?.let { exoPlayer ->
            // If playing the same item, just return or toggle play (logic can be expanded)
            val mediaItem = MediaItem.Builder()
                .setUri(media.uri)
                .setMediaId(media.id.toString())
                .setMediaMetadata(
                    MediaMetadata.Builder()
                        .setTitle(media.title)
                        .setArtist(media.artist)
                        .setArtworkUri(media.albumArtUri)
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

## Step 7: UI Implementation

Update `app/src/main/java/com/local/offlinemediaplayer/MainActivity.kt`.

This is a single-file UI implementation for simplicity. It handles Permissions, Tabs, Lists, and the Player.

```kotlin
package com.local.offlinemediaplayer

import android.Manifest
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
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
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.media3.ui.PlayerView
import coil.compose.AsyncImage
import com.local.offlinemediaplayer.model.MediaFile
import com.local.offlinemediaplayer.viewmodel.MainViewModel
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.rememberMultiplePermissionsState
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme(colorScheme = darkColorScheme()) {
                MainScreen()
            }
        }
    }
}

@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun MainScreen(viewModel: MainViewModel = hiltViewModel()) {
    // Determine permissions based on Android Version
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

    // UI State
    if (permissionState.allPermissionsGranted) {
        MediaPlayerAppContent(viewModel)
    } else {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Button(onClick = { permissionState.launchMultiplePermissionRequest() }) {
                Text("Grant Permissions to Access Media")
            }
        }
    }
}

@Composable
fun MediaPlayerAppContent(viewModel: MainViewModel) {
    var selectedTab by remember { mutableIntStateOf(0) }
    var currentMedia by remember { mutableStateOf<MediaFile?>(null) }
    
    // Watch player state to detect if video is playing (to show fullscreen)
    // Note: In a production app, we might check player.currentMediaItem
    
    Scaffold(
        bottomBar = {
            // Hide bottom bar if we are watching a video
            if (currentMedia?.isVideo != true) {
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
        Box(modifier = Modifier
            .padding(padding)
            .fillMaxSize()) {
            
            if (currentMedia != null && currentMedia!!.isVideo) {
                // Full Screen Video Player
                VideoPlayerScreen(
                    viewModel = viewModel, 
                    onBack = { 
                        currentMedia = null 
                        // Optional: Pause when closing video, or let it play in PIP
                        viewModel.player.value?.pause() 
                    }
                )
            } else {
                // Tabs
                if (selectedTab == 0) {
                    VideoListScreen(viewModel) { file ->
                        currentMedia = file
                        viewModel.playMedia(file)
                    }
                } else {
                    AudioListScreen(viewModel) { file ->
                        // For audio, we don't go fullscreen, just play
                        viewModel.playMedia(file)
                    }
                }
            }
        }
    }
}

@Composable
fun VideoListScreen(viewModel: MainViewModel, onVideoClick: (MediaFile) -> Unit) {
    val videos by viewModel.videoList.collectAsStateWithLifecycle()
    
    if (videos.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("No videos found on device")
        }
    } else {
        LazyColumn {
            items(videos) { video ->
                ListItem(
                    headlineContent = { Text(video.title, maxLines = 1) },
                    leadingContent = {
                        AsyncImage(
                            model = video.uri,
                            contentDescription = null,
                            modifier = Modifier
                                .size(80.dp)
                                .background(Color.Gray),
                            contentScale = ContentScale.Crop
                        )
                    },
                    modifier = Modifier.clickable { onVideoClick(video) }
                )
                HorizontalDivider()
            }
        }
    }
}

@Composable
fun AudioListScreen(viewModel: MainViewModel, onAudioClick: (MediaFile) -> Unit) {
    val audio by viewModel.audioList.collectAsStateWithLifecycle()

    if (audio.isEmpty()) {
         Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("No audio found on device")
        }
    } else {
        LazyColumn {
            items(audio) { song ->
                ListItem(
                    headlineContent = { Text(song.title, maxLines = 1) },
                    supportingContent = { Text(song.artist ?: "Unknown Artist", maxLines = 1) },
                    leadingContent = {
                        AsyncImage(
                            model = song.albumArtUri ?: R.drawable.ic_launcher_foreground,
                            contentDescription = null,
                            modifier = Modifier
                                .size(50.dp)
                                .background(Color.DarkGray)
                        )
                    },
                    modifier = Modifier.clickable { onAudioClick(song) }
                )
                HorizontalDivider()
            }
        }
    }
}

@Composable
fun VideoPlayerScreen(viewModel: MainViewModel, onBack: () -> Unit) {
    val player by viewModel.player.collectAsStateWithLifecycle()

    Box(modifier = Modifier
        .fillMaxSize()
        .background(Color.Black)) {
        
        if (player != null) {
            AndroidView(
                factory = { context ->
                    PlayerView(context).apply {
                        this.player = player
                        this.useController = true 
                        this.setShowNextButton(false)
                        this.setShowPreviousButton(false)
                    }
                },
                modifier = Modifier.fillMaxSize()
            )
        }
        
        // Back Button Overlay
        IconButton(
            onClick = onBack, 
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(16.dp)
        ) {
            Icon(Icons.Default.ArrowBack, "Back", tint = Color.White)
        }
    }
}
```

## Step 8: Build and Run

1.  Click **Sync Project with Gradle Files** (Elephant icon).
2.  Connect your Android device.
3.  Click the **Run** (Green Play) button.

The app will launch, ask for permission, scan your device, and populate the tabs with your local media automatically.
