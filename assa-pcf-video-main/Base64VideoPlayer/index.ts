/// <reference types="powerapps-component-framework" />
import { IInputs, IOutputs } from "./generated/ManifestTypes";

const ICONS = {
    play: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
    pause: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>',
    download: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    video: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/><line x1="17" y1="17" x2="22" y2="17"/></svg>',
    emptyVideo: '<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/><line x1="17" y1="17" x2="22" y2="17"/></svg>',
    volumeUp: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>',
    volumeMute: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>',
    fullscreen: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>',
    exitFullscreen: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 14h6v6m10-10h-6V4m0 6l7-7M3 21l7-7"/></svg>',
};

export class Base64VideoPlayer implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    // DOM
    private _container!: HTMLDivElement;
    private _context!: ComponentFramework.Context<IInputs>;
    private _mainContainer!: HTMLDivElement;
    private _toolbar!: HTMLDivElement;
    private _playerWrapper!: HTMLDivElement;
    private _fileNameSpan!: HTMLSpanElement;
    private _videoElement!: HTMLVideoElement;
    private _playBtn!: HTMLButtonElement;
    private _currentTimeSpan!: HTMLSpanElement;
    private _durationSpan!: HTMLSpanElement;
    private _progressBar!: HTMLInputElement;
    private _volumeBar!: HTMLInputElement;
    private _volumeBtn!: HTMLButtonElement;
    private _fullscreenBtn!: HTMLButtonElement;

    // State
    private _lastBase64: string = "";
    private _lastFileName: string = "";
    private _blobUrl: string = "";
    private _isPlaying: boolean = false;
    private _isFullscreen: boolean = false;

    constructor() { }

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): void {
        this._container = container;
        this._context = context;
        context.mode.trackContainerResize(true);
        this._buildUI();
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        this._context = context;
        const base64 = context.parameters.base64Content?.raw || "";
        const fileName = context.parameters.fileName?.raw || "video.mp4";

        if (fileName !== this._lastFileName) {
            this._lastFileName = fileName;
            if (this._fileNameSpan) {
                this._fileNameSpan.textContent = fileName;
                this._fileNameSpan.title = fileName;
            }
        }

        if (base64 && base64 !== this._lastBase64) {
            this._lastBase64 = base64;
            this._loadVideo(base64);
        } else if (!base64 && this._lastBase64) {
            this._lastBase64 = "";
            this._showEmptyState();
        }
    }

    public getOutputs(): IOutputs {
        return {};
    }

    public destroy(): void {
        this._revokeBlob();
        if (this._videoElement) {
            this._videoElement.pause();
            this._videoElement.src = "";
        }
    }

    // ========== UI ==========

    private _buildUI(): void {
        this._mainContainer = document.createElement("div");
        this._mainContainer.className = "video-player-container";

        // Toolbar
        this._toolbar = this._buildToolbar();
        this._mainContainer.appendChild(this._toolbar);

        // Player wrapper
        this._playerWrapper = document.createElement("div");
        this._playerWrapper.className = "video-player-wrapper";

        // Video element
        this._videoElement = document.createElement("video");
        this._videoElement.preload = "metadata";
        this._videoElement.addEventListener("loadedmetadata", () => this._onMetadataLoaded());
        this._videoElement.addEventListener("timeupdate", () => this._onTimeUpdate());
        this._videoElement.addEventListener("ended", () => this._onEnded());
        this._videoElement.addEventListener("click", () => this._togglePlay());
        this._playerWrapper.appendChild(this._videoElement);

        this._mainContainer.appendChild(this._playerWrapper);
        this._container.appendChild(this._mainContainer);

        // Listen for fullscreen changes
        document.addEventListener("fullscreenchange", () => this._onFullscreenChange());

        this._showEmptyState();
    }

    private _buildToolbar(): HTMLDivElement {
        const toolbar = document.createElement("div");
        toolbar.className = "video-toolbar";

        // Left: file name
        const leftGroup = document.createElement("div");
        leftGroup.className = "video-toolbar-group";

        const videoIcon = document.createElement("span");
        videoIcon.className = "video-icon";
        videoIcon.innerHTML = ICONS.video;
        leftGroup.appendChild(videoIcon);

        this._fileNameSpan = document.createElement("span");
        this._fileNameSpan.className = "video-file-name";
        this._fileNameSpan.textContent = "video.mp4";
        leftGroup.appendChild(this._fileNameSpan);

        toolbar.appendChild(leftGroup);

        // Right: download + fullscreen
        const rightGroup = document.createElement("div");
        rightGroup.className = "video-toolbar-group";

        const downloadBtn = this._createButton(ICONS.download, "Descargar video", () => this._downloadVideo());
        downloadBtn.className = "video-toolbar-btn";
        rightGroup.appendChild(downloadBtn);

        const fullscreenToolbarBtn = this._createButton(ICONS.fullscreen, "Pantalla completa", () => this._toggleFullscreen());
        fullscreenToolbarBtn.className = "video-toolbar-btn";
        rightGroup.appendChild(fullscreenToolbarBtn);

        toolbar.appendChild(rightGroup);

        return toolbar;
    }

    private _buildPlayerControls(): void {
        // Remove existing controls if any
        const existingControls = this._playerWrapper.querySelector(".video-controls");
        if (existingControls) {
            existingControls.remove();
        }

        const controls = document.createElement("div");
        controls.className = "video-controls";

        // Play/Pause button
        this._playBtn = document.createElement("button");
        this._playBtn.className = "video-play-btn";
        this._playBtn.innerHTML = ICONS.play;
        this._playBtn.title = "Reproducir";
        this._playBtn.addEventListener("click", () => this._togglePlay());
        controls.appendChild(this._playBtn);

        // Time + Progress
        const progressSection = document.createElement("div");
        progressSection.className = "video-progress-section";

        // Current time
        this._currentTimeSpan = document.createElement("span");
        this._currentTimeSpan.className = "video-time";
        this._currentTimeSpan.textContent = "0:00";
        progressSection.appendChild(this._currentTimeSpan);

        // Progress bar
        this._progressBar = document.createElement("input");
        this._progressBar.type = "range";
        this._progressBar.className = "video-progress-bar";
        this._progressBar.min = "0";
        this._progressBar.max = "100";
        this._progressBar.value = "0";
        this._progressBar.step = "0.1";
        this._progressBar.addEventListener("input", () => this._onSeek());
        progressSection.appendChild(this._progressBar);

        // Duration
        this._durationSpan = document.createElement("span");
        this._durationSpan.className = "video-time";
        this._durationSpan.textContent = "0:00";
        progressSection.appendChild(this._durationSpan);

        controls.appendChild(progressSection);

        // Volume section
        const volumeSection = document.createElement("div");
        volumeSection.className = "video-volume-section";

        this._volumeBtn = document.createElement("button");
        this._volumeBtn.className = "video-volume-btn";
        this._volumeBtn.innerHTML = ICONS.volumeUp;
        this._volumeBtn.title = "Silenciar";
        this._volumeBtn.addEventListener("click", () => this._toggleMute());
        volumeSection.appendChild(this._volumeBtn);

        this._volumeBar = document.createElement("input");
        this._volumeBar.type = "range";
        this._volumeBar.className = "video-volume-bar";
        this._volumeBar.min = "0";
        this._volumeBar.max = "100";
        this._volumeBar.value = "100";
        this._volumeBar.addEventListener("input", () => this._onVolumeChange());
        volumeSection.appendChild(this._volumeBar);

        controls.appendChild(volumeSection);

        // Fullscreen button
        this._fullscreenBtn = document.createElement("button");
        this._fullscreenBtn.className = "video-fullscreen-btn";
        this._fullscreenBtn.innerHTML = ICONS.fullscreen;
        this._fullscreenBtn.title = "Pantalla completa";
        this._fullscreenBtn.addEventListener("click", () => this._toggleFullscreen());
        controls.appendChild(this._fullscreenBtn);

        this._playerWrapper.appendChild(controls);
    }

    private _createButton(icon: string, title: string, onClick: () => void): HTMLButtonElement {
        const btn = document.createElement("button");
        btn.innerHTML = icon;
        btn.title = title;
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            onClick();
        });
        return btn;
    }

    // ========== VIDEO LOADING ==========

    private _loadVideo(base64: string): void {
        try {
            let cleanBase64 = base64.trim();
            if (cleanBase64.includes(",")) {
                cleanBase64 = cleanBase64.split(",")[1];
            }
            cleanBase64 = cleanBase64.replace(/\s/g, "");

            // Decode to binary
            const binaryString = atob(cleanBase64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            // Detect MIME type from file extension
            const mimeType = this._detectMimeType(this._lastFileName);

            // Create blob
            this._revokeBlob();
            const blob = new Blob([bytes], { type: mimeType });
            this._blobUrl = URL.createObjectURL(blob);

            // Reset player wrapper to show video
            this._playerWrapper.innerHTML = "";
            this._playerWrapper.appendChild(this._videoElement);

            // Set video source
            this._videoElement.src = this._blobUrl;
            this._videoElement.load();

            // Reset play state
            this._isPlaying = false;

            // Build player controls
            this._buildPlayerControls();

        } catch (error: any) {
            console.error("Video Load Error:", error);
            this._showError(`Error al cargar el video: ${error.message || "formato inválido"}`);
        }
    }

    private _detectMimeType(fileName: string): string {
        const ext = fileName.split(".").pop()?.toLowerCase() || "mp4";
        const mimeMap: Record<string, string> = {
            mp4: "video/mp4",
            webm: "video/webm",
            ogg: "video/ogg",
            mov: "video/quicktime",
            avi: "video/x-msvideo",
            mkv: "video/x-matroska",
        };
        return mimeMap[ext] || "video/mp4";
    }

    // ========== PLAYER CONTROLS ==========

    private _togglePlay(): void {
        if (this._isPlaying) {
            this._videoElement.pause();
            this._isPlaying = false;
            if (this._playBtn) {
                this._playBtn.innerHTML = ICONS.play;
                this._playBtn.title = "Reproducir";
            }
        } else {
            this._videoElement.play();
            this._isPlaying = true;
            if (this._playBtn) {
                this._playBtn.innerHTML = ICONS.pause;
                this._playBtn.title = "Pausar";
            }
        }
    }

    private _onMetadataLoaded(): void {
        if (this._durationSpan && isFinite(this._videoElement.duration)) {
            this._durationSpan.textContent = this._formatTime(this._videoElement.duration);
            this._progressBar.max = String(this._videoElement.duration);
        }
    }

    private _onTimeUpdate(): void {
        if (this._currentTimeSpan) {
            this._currentTimeSpan.textContent = this._formatTime(this._videoElement.currentTime);
        }
        if (this._progressBar && isFinite(this._videoElement.duration)) {
            this._progressBar.value = String(this._videoElement.currentTime);
            const pct = (this._videoElement.currentTime / this._videoElement.duration) * 100;
            this._progressBar.style.setProperty("--progress", `${pct}%`);
        }
    }

    private _onEnded(): void {
        this._isPlaying = false;
        if (this._playBtn) {
            this._playBtn.innerHTML = ICONS.play;
            this._playBtn.title = "Reproducir";
        }
        if (this._progressBar) {
            this._progressBar.value = "0";
            this._progressBar.style.setProperty("--progress", "0%");
        }
        if (this._currentTimeSpan) {
            this._currentTimeSpan.textContent = "0:00";
        }
    }

    private _onSeek(): void {
        if (this._progressBar && isFinite(this._videoElement.duration)) {
            this._videoElement.currentTime = parseFloat(this._progressBar.value);
        }
    }

    private _onVolumeChange(): void {
        const vol = parseFloat(this._volumeBar.value) / 100;
        this._videoElement.volume = vol;
        this._videoElement.muted = false;
        this._volumeBtn.innerHTML = vol === 0 ? ICONS.volumeMute : ICONS.volumeUp;
    }

    private _toggleMute(): void {
        this._videoElement.muted = !this._videoElement.muted;
        if (this._videoElement.muted) {
            this._volumeBtn.innerHTML = ICONS.volumeMute;
            this._volumeBar.value = "0";
        } else {
            this._volumeBtn.innerHTML = ICONS.volumeUp;
            this._volumeBar.value = String(this._videoElement.volume * 100);
        }
    }

    private _toggleFullscreen(): void {
        if (!this._isFullscreen) {
            if (this._mainContainer.requestFullscreen) {
                this._mainContainer.requestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }

    private _onFullscreenChange(): void {
        this._isFullscreen = !!document.fullscreenElement;
        if (this._fullscreenBtn) {
            this._fullscreenBtn.innerHTML = this._isFullscreen ? ICONS.exitFullscreen : ICONS.fullscreen;
            this._fullscreenBtn.title = this._isFullscreen ? "Salir de pantalla completa" : "Pantalla completa";
        }
    }

    // ========== ACTIONS ==========

    private _downloadVideo(): void {
        if (!this._blobUrl) return;
        const fileName = this._lastFileName || "video.mp4";
        const a = document.createElement("a");
        a.href = this._blobUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    // ========== HELPERS ==========

    private _formatTime(seconds: number): string {
        if (!isFinite(seconds)) return "0:00";
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
        }
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    }

    // ========== UI STATES ==========

    private _showEmptyState(): void {
        this._playerWrapper.innerHTML = "";
        this._playerWrapper.appendChild(this._videoElement);

        const empty = document.createElement("div");
        empty.className = "video-empty-state";
        empty.innerHTML = `
            <div class="video-empty-icon">${ICONS.emptyVideo}</div>
            <div class="video-empty-text">No hay video para reproducir.<br/>Asigna un valor Base64 para ver el archivo.</div>
        `;
        this._playerWrapper.appendChild(empty);
    }

    private _showError(message: string): void {
        this._playerWrapper.innerHTML = "";
        this._playerWrapper.appendChild(this._videoElement);

        const error = document.createElement("div");
        error.className = "video-error-state";
        error.innerHTML = `
            <div class="video-error-icon">⚠️</div>
            <div class="video-error-text">${message}</div>
        `;
        this._playerWrapper.appendChild(error);
    }

    private _revokeBlob(): void {
        if (this._blobUrl) {
            URL.revokeObjectURL(this._blobUrl);
            this._blobUrl = "";
        }
    }
}
