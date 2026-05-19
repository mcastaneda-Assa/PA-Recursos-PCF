import { IInputs, IOutputs } from "./generated/ManifestTypes";

// ─── SVG Icons (inline, no external libs) ─────────────────────────────────────

const SVG_PLAY = `<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
const SVG_PAUSE = `<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
const SVG_DOWNLOAD = `<svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>`;
const SVG_AUDIO_NOTE = `<svg viewBox="0 0 24 24"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/></svg>`;
const SVG_VOLUME_UP = `<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
const SVG_VOLUME_MUTE = `<svg viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`;
const SVG_EMPTY_AUDIO = `<svg viewBox="0 0 24 24"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/></svg>`;

export class Base64AudioPlayer implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    // ── State ──────────────────────────────────────────────────────────────────
    private _context!: ComponentFramework.Context<IInputs>;
    private _lastBase64: string | null = null;
    private _lastFileName: string | null = null;
    private _blobUrl: string | null = null;
    private _isPlaying: boolean = false;

    // ── DOM elements ───────────────────────────────────────────────────────────
    private _container!: HTMLDivElement;
    private _mainContainer!: HTMLDivElement;
    private _toolbar!: HTMLDivElement;
    private _playerWrapper!: HTMLDivElement;
    private _fileNameSpan!: HTMLSpanElement;
    private _audioElement!: HTMLAudioElement;
    private _playBtn!: HTMLButtonElement;
    private _currentTimeSpan!: HTMLSpanElement;
    private _durationSpan!: HTMLSpanElement;
    private _progressBar!: HTMLInputElement;
    private _volumeBar!: HTMLInputElement;
    private _volumeBtn!: HTMLButtonElement;

    // ═══════════════════════════════════════════════════════════════════════════
    // Lifecycle
    // ═══════════════════════════════════════════════════════════════════════════

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): void {
        this._context = context;
        this._container = container;
        context.mode.trackContainerResize(true);
        this._buildUI();
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        this._context = context;

        const base64Raw = context.parameters.base64Content?.raw ?? null;
        const fileNameRaw = context.parameters.fileName?.raw ?? null;

        // Base64 changed
        if (base64Raw !== this._lastBase64) {
            this._lastBase64 = base64Raw;
            if (base64Raw && base64Raw.trim().length > 0) {
                try {
                    this._loadAudio(base64Raw);
                } catch (e: any) {
                    this._showError(e.message || "Error al cargar el audio.");
                }
            } else {
                this._showEmptyState();
            }
        }

        // FileName changed
        if (fileNameRaw !== this._lastFileName) {
            this._lastFileName = fileNameRaw;
            if (this._fileNameSpan) {
                this._fileNameSpan.textContent = fileNameRaw || "audio.mp3";
                this._fileNameSpan.title = fileNameRaw || "";
            }
        }
    }

    public getOutputs(): IOutputs {
        return {};
    }

    public destroy(): void {
        this._revokeBlob();
        if (this._audioElement) {
            this._audioElement.pause();
            this._audioElement.removeAttribute("src");
            this._audioElement.load();
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // UI Building
    // ═══════════════════════════════════════════════════════════════════════════

    private _buildUI(): void {
        // Main container
        this._mainContainer = document.createElement("div");
        this._mainContainer.className = "audio-player-container";

        // ── Toolbar ────────────────────────────────────────────────────────────
        this._toolbar = document.createElement("div");
        this._toolbar.className = "audio-toolbar";

        // Left group: icon + file name
        const leftGroup = document.createElement("div");
        leftGroup.className = "audio-toolbar-group";

        const iconWrapper = document.createElement("span");
        iconWrapper.className = "audio-toolbar-icon";
        iconWrapper.innerHTML = SVG_AUDIO_NOTE;
        leftGroup.appendChild(iconWrapper);

        this._fileNameSpan = document.createElement("span");
        this._fileNameSpan.className = "audio-file-name";
        this._fileNameSpan.textContent = this._lastFileName || "audio.mp3";
        leftGroup.appendChild(this._fileNameSpan);

        // Right group: download button
        const rightGroup = document.createElement("div");
        rightGroup.className = "audio-toolbar-group";

        const downloadBtn = document.createElement("button");
        downloadBtn.className = "audio-toolbar-btn";
        downloadBtn.title = "Descargar archivo";
        downloadBtn.innerHTML = SVG_DOWNLOAD;
        downloadBtn.addEventListener("click", () => this._downloadAudio());
        rightGroup.appendChild(downloadBtn);

        this._toolbar.appendChild(leftGroup);
        this._toolbar.appendChild(rightGroup);

        // ── Player wrapper ─────────────────────────────────────────────────────
        this._playerWrapper = document.createElement("div");
        this._playerWrapper.className = "audio-player-wrapper";

        // Hidden audio element
        this._audioElement = document.createElement("audio");
        this._audioElement.style.display = "none";
        this._playerWrapper.appendChild(this._audioElement);

        // Assemble
        this._mainContainer.appendChild(this._toolbar);
        this._mainContainer.appendChild(this._playerWrapper);
        this._container.appendChild(this._mainContainer);

        // Show empty state initially
        this._showEmptyState();
    }

    private _buildPlayerControls(): void {
        // Remove previous controls (keep hidden audio element)
        const existing = this._playerWrapper.querySelector(".audio-controls");
        if (existing) existing.remove();
        const emptyState = this._playerWrapper.querySelector(".audio-empty-state");
        if (emptyState) emptyState.remove();
        const errorState = this._playerWrapper.querySelector(".audio-error-state");
        if (errorState) errorState.remove();

        const controls = document.createElement("div");
        controls.className = "audio-controls";

        // ── Play/Pause button ──────────────────────────────────────────────────
        this._playBtn = document.createElement("button");
        this._playBtn.className = "audio-play-btn";
        this._playBtn.title = "Reproducir";
        this._playBtn.innerHTML = SVG_PLAY;
        this._playBtn.addEventListener("click", () => this._togglePlay());
        controls.appendChild(this._playBtn);

        // ── Progress section ───────────────────────────────────────────────────
        const progressSection = document.createElement("div");
        progressSection.className = "audio-progress-section";

        this._currentTimeSpan = document.createElement("span");
        this._currentTimeSpan.className = "audio-time";
        this._currentTimeSpan.textContent = "0:00";

        this._progressBar = document.createElement("input");
        this._progressBar.type = "range";
        this._progressBar.className = "audio-progress-bar";
        this._progressBar.min = "0";
        this._progressBar.max = "100";
        this._progressBar.value = "0";
        this._progressBar.step = "0.1";
        this._progressBar.style.setProperty("--progress", "0%");
        this._progressBar.addEventListener("input", () => this._onSeek());

        this._durationSpan = document.createElement("span");
        this._durationSpan.className = "audio-time";
        this._durationSpan.textContent = "0:00";

        progressSection.appendChild(this._currentTimeSpan);
        progressSection.appendChild(this._progressBar);
        progressSection.appendChild(this._durationSpan);
        controls.appendChild(progressSection);

        // ── Volume section ─────────────────────────────────────────────────────
        const volumeSection = document.createElement("div");
        volumeSection.className = "audio-volume-section";

        this._volumeBtn = document.createElement("button");
        this._volumeBtn.className = "audio-volume-btn";
        this._volumeBtn.title = "Silenciar";
        this._volumeBtn.innerHTML = SVG_VOLUME_UP;
        this._volumeBtn.addEventListener("click", () => this._toggleMute());

        this._volumeBar = document.createElement("input");
        this._volumeBar.type = "range";
        this._volumeBar.className = "audio-volume-bar";
        this._volumeBar.min = "0";
        this._volumeBar.max = "1";
        this._volumeBar.step = "0.01";
        this._volumeBar.value = "1";
        this._volumeBar.style.setProperty("--volume", "100%");
        this._volumeBar.addEventListener("input", () => this._onVolumeChange());

        volumeSection.appendChild(this._volumeBtn);
        volumeSection.appendChild(this._volumeBar);
        controls.appendChild(volumeSection);

        this._playerWrapper.appendChild(controls);

        // ── Audio event handlers ───────────────────────────────────────────────
        this._audioElement.onloadedmetadata = () => {
            const dur = this._audioElement.duration;
            this._durationSpan.textContent = this._formatTime(dur);
            this._progressBar.max = String(dur);
        };

        this._audioElement.ontimeupdate = () => {
            const cur = this._audioElement.currentTime;
            const dur = this._audioElement.duration || 1;
            this._currentTimeSpan.textContent = this._formatTime(cur);
            this._progressBar.value = String(cur);
            const pct = (cur / dur) * 100;
            this._progressBar.style.setProperty("--progress", `${pct}%`);
        };

        this._audioElement.onended = () => {
            this._isPlaying = false;
            this._playBtn.innerHTML = SVG_PLAY;
            this._playBtn.title = "Reproducir";
            this._progressBar.value = "0";
            this._progressBar.style.setProperty("--progress", "0%");
            this._currentTimeSpan.textContent = "0:00";
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Audio loading
    // ═══════════════════════════════════════════════════════════════════════════

    private _loadAudio(base64: string): void {
        this._revokeBlob();

        // Clean base64: remove data URI prefix if present and whitespace
        let cleaned = base64.trim();
        if (cleaned.indexOf("data:") === 0) {
            const commaIdx = cleaned.indexOf(",");
            if (commaIdx !== -1) {
                cleaned = cleaned.substring(commaIdx + 1);
            }
        }
        cleaned = cleaned.replace(/\s/g, "");

        // Decode
        const binaryString = atob(cleaned);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        // Detect MIME type from file name
        const mimeType = this._detectMimeType(this._lastFileName || "audio.mp3");

        // Create Blob and object URL
        const blob = new Blob([bytes], { type: mimeType });
        this._blobUrl = URL.createObjectURL(blob);

        // Pause current playback
        this._audioElement.pause();
        this._isPlaying = false;

        // Assign to audio element
        this._audioElement.src = this._blobUrl;
        this._audioElement.load();

        // Build player controls
        this._buildPlayerControls();
    }

    private _detectMimeType(fileName: string): string {
        const ext = (fileName.split(".").pop() || "").toLowerCase();
        const map: Record<string, string> = {
            mp3: "audio/mpeg",
            wav: "audio/wav",
            ogg: "audio/ogg",
            m4a: "audio/mp4",
            aac: "audio/aac",
            webm: "audio/webm",
            flac: "audio/flac",
        };
        return map[ext] || "audio/mpeg";
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Playback controls
    // ═══════════════════════════════════════════════════════════════════════════

    private _togglePlay(): void {
        if (!this._audioElement.src) return;
        if (this._isPlaying) {
            this._audioElement.pause();
            this._isPlaying = false;
            this._playBtn.innerHTML = SVG_PLAY;
            this._playBtn.title = "Reproducir";
        } else {
            this._audioElement.play();
            this._isPlaying = true;
            this._playBtn.innerHTML = SVG_PAUSE;
            this._playBtn.title = "Pausar";
        }
    }

    private _onSeek(): void {
        const val = parseFloat(this._progressBar.value);
        this._audioElement.currentTime = val;
        const dur = this._audioElement.duration || 1;
        const pct = (val / dur) * 100;
        this._progressBar.style.setProperty("--progress", `${pct}%`);
    }

    private _onVolumeChange(): void {
        const val = parseFloat(this._volumeBar.value);
        this._audioElement.volume = val;
        const pct = val * 100;
        this._volumeBar.style.setProperty("--volume", `${pct}%`);

        if (val === 0) {
            this._volumeBtn.innerHTML = SVG_VOLUME_MUTE;
            this._audioElement.muted = true;
        } else {
            this._volumeBtn.innerHTML = SVG_VOLUME_UP;
            this._audioElement.muted = false;
        }
    }

    private _toggleMute(): void {
        this._audioElement.muted = !this._audioElement.muted;
        if (this._audioElement.muted) {
            this._volumeBtn.innerHTML = SVG_VOLUME_MUTE;
            this._volumeBtn.title = "Activar sonido";
        } else {
            this._volumeBtn.innerHTML = SVG_VOLUME_UP;
            this._volumeBtn.title = "Silenciar";
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Download
    // ═══════════════════════════════════════════════════════════════════════════

    private _downloadAudio(): void {
        if (!this._blobUrl) return;
        const a = document.createElement("a");
        a.href = this._blobUrl;
        a.download = this._lastFileName || "audio.mp3";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Helpers
    // ═══════════════════════════════════════════════════════════════════════════

    private _formatTime(seconds: number): string {
        if (!isFinite(seconds) || seconds < 0) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
    }

    private _showEmptyState(): void {
        // Clear player controls
        const existing = this._playerWrapper.querySelector(".audio-controls");
        if (existing) existing.remove();
        const prevEmpty = this._playerWrapper.querySelector(".audio-empty-state");
        if (prevEmpty) prevEmpty.remove();
        const prevError = this._playerWrapper.querySelector(".audio-error-state");
        if (prevError) prevError.remove();

        this._revokeBlob();
        this._isPlaying = false;
        this._audioElement.pause();
        this._audioElement.removeAttribute("src");

        const emptyDiv = document.createElement("div");
        emptyDiv.className = "audio-empty-state";
        emptyDiv.innerHTML = `
            ${SVG_EMPTY_AUDIO}
            <span>No hay audio para reproducir. Asigna un valor Base64 para escuchar el archivo.</span>
        `;
        this._playerWrapper.appendChild(emptyDiv);
    }

    private _showError(message: string): void {
        // Clear player controls
        const existing = this._playerWrapper.querySelector(".audio-controls");
        if (existing) existing.remove();
        const prevEmpty = this._playerWrapper.querySelector(".audio-empty-state");
        if (prevEmpty) prevEmpty.remove();
        const prevError = this._playerWrapper.querySelector(".audio-error-state");
        if (prevError) prevError.remove();

        this._revokeBlob();
        this._isPlaying = false;
        this._audioElement.pause();
        this._audioElement.removeAttribute("src");

        const errorDiv = document.createElement("div");
        errorDiv.className = "audio-error-state";
        errorDiv.innerHTML = `
            <span class="audio-error-icon">⚠️</span>
            <span>${message}</span>
        `;
        this._playerWrapper.appendChild(errorDiv);
    }

    private _revokeBlob(): void {
        if (this._blobUrl) {
            URL.revokeObjectURL(this._blobUrl);
            this._blobUrl = null;
        }
    }
}
