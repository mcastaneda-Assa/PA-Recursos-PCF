import { IInputs, IOutputs } from "./generated/ManifestTypes";
import * as mammoth from "mammoth";

const ICONS = {
    download: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    print: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>',
    fullscreen: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><polyline points="21 3 14 10"/><polyline points="3 21 10 14"/></svg>',
    emptyDoc: '<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    word: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>',
    search: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    zoomIn: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>',
    zoomOut: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>',
};

export class Base64WordViewer implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private _container: HTMLDivElement;
    private _context: ComponentFramework.Context<IInputs>;
    private _lastBase64: string = "";
    private _lastFileName: string = "";

    // Blob for download
    private _blobUrl: string = "";
    private _zoomLevel: number = 100;
    private _loadId: number = 0; // race condition guard for async conversion

    // DOM
    private _mainContainer: HTMLDivElement;
    private _toolbar: HTMLDivElement;
    private _viewerWrapper: HTMLDivElement;
    private _documentContainer: HTMLDivElement;
    private _fileNameSpan: HTMLSpanElement;
    private _zoomLabel: HTMLSpanElement;

    constructor() {
        // empty
    }

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
        const base64 = context.parameters.base64Content?.raw || "";
        const fileName = context.parameters.fileName?.raw || "documento.docx";

        if (fileName !== this._lastFileName) {
            this._lastFileName = fileName;
            if (this._fileNameSpan) {
                this._fileNameSpan.textContent = fileName;
                this._fileNameSpan.title = fileName;
            }
        }

        if (base64 && base64 !== this._lastBase64) {
            this._lastBase64 = base64;
            this._loadWord(base64);
        } else if (!base64 && this._lastBase64) {
            this._lastBase64 = "";
            this._showEmptyState();
        }
    }

    public getOutputs(): IOutputs {
        return {};
    }

    public destroy(): void {
        this._loadId++; // cancel any pending async conversions
        this._revokeBlob();
    }

    // ========== UI ==========

    private _buildUI(): void {
        this._mainContainer = document.createElement("div");
        this._mainContainer.className = "word-viewer-container";

        // Toolbar
        this._toolbar = this._buildToolbar();
        this._mainContainer.appendChild(this._toolbar);

        // Viewer wrapper
        this._viewerWrapper = document.createElement("div");
        this._viewerWrapper.className = "word-viewer-wrapper";

        // Document container (rendered HTML goes here)
        this._documentContainer = document.createElement("div");
        this._documentContainer.className = "word-document-container";
        this._viewerWrapper.appendChild(this._documentContainer);

        this._mainContainer.appendChild(this._viewerWrapper);
        this._container.appendChild(this._mainContainer);

        this._showEmptyState();
    }

    private _buildToolbar(): HTMLDivElement {
        const toolbar = document.createElement("div");
        toolbar.className = "word-toolbar";

        // Left: file name
        const leftGroup = document.createElement("div");
        leftGroup.className = "word-toolbar-group";

        const wordIcon = document.createElement("span");
        wordIcon.className = "word-icon";
        wordIcon.innerHTML = ICONS.word;
        leftGroup.appendChild(wordIcon);

        this._fileNameSpan = document.createElement("span");
        this._fileNameSpan.className = "word-file-name";
        this._fileNameSpan.textContent = "documento.docx";
        leftGroup.appendChild(this._fileNameSpan);

        toolbar.appendChild(leftGroup);

        // Right: actions
        const rightGroup = document.createElement("div");
        rightGroup.className = "word-toolbar-group";

        // Zoom out
        const zoomOutBtn = this._createButton(ICONS.zoomOut, "Reducir zoom", () => this._zoom(-10));
        rightGroup.appendChild(zoomOutBtn);

        // Zoom label
        this._zoomLabel = document.createElement("span");
        this._zoomLabel.className = "word-zoom-label";
        this._zoomLabel.textContent = "100%";
        rightGroup.appendChild(this._zoomLabel);

        // Zoom in
        const zoomInBtn = this._createButton(ICONS.zoomIn, "Aumentar zoom", () => this._zoom(10));
        rightGroup.appendChild(zoomInBtn);

        // Download
        const downloadBtn = this._createButton(ICONS.download, "Descargar Word", () => this._downloadWord());
        rightGroup.appendChild(downloadBtn);

        // Print
        const printBtn = this._createButton(ICONS.print, "Imprimir", () => this._printWord());
        rightGroup.appendChild(printBtn);

        // Fullscreen
        const fullscreenBtn = this._createButton(ICONS.fullscreen, "Pantalla completa", () => this._toggleFullscreen());
        rightGroup.appendChild(fullscreenBtn);

        toolbar.appendChild(rightGroup);

        return toolbar;
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

    // ========== WORD LOADING ==========

    private _loadWord(base64: string): void {
        try {
            // Clean base64 - handle data URI prefix and whitespace
            let cleanBase64 = base64.trim();
            if (cleanBase64.includes(",")) {
                cleanBase64 = cleanBase64.split(",")[1];
            }
            cleanBase64 = cleanBase64.replace(/[\s\r\n]/g, "");

            // Decode to binary
            const binaryString = atob(cleanBase64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            // Create a clean ArrayBuffer copy (avoids shared buffer issues)
            const arrayBuffer = bytes.buffer.slice(
                bytes.byteOffset,
                bytes.byteOffset + bytes.byteLength
            );

            // Create blob for download
            this._revokeBlob();
            const blob = new Blob([arrayBuffer], {
                type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            });
            this._blobUrl = URL.createObjectURL(blob);

            // Show loading state
            this._showLoading();

            // Guard against race conditions with concurrent loads
            const currentLoadId = ++this._loadId;

            // Convert DOCX to HTML with mammoth using built-in dataUri for images
            mammoth
                .convertToHtml(
                    { arrayBuffer: arrayBuffer },
                    {
                        styleMap: [
                            "p[style-name='Title'] => h1.doc-title",
                            "p[style-name='Heading 1'] => h1",
                            "p[style-name='Heading 2'] => h2",
                            "p[style-name='Heading 3'] => h3",
                            "p[style-name='Heading 4'] => h4",
                        ],
                        convertImage: mammoth.images.dataUri,
                    }
                )
                .then((result: any) => {
                    // Ignore if a newer load has started
                    if (currentLoadId !== this._loadId) return;

                    this._renderDocument(result.value);

                    if (result.messages && result.messages.length > 0) {
                        console.warn("Mammoth conversion messages:", result.messages);
                    }
                })
                .catch((error: any) => {
                    if (currentLoadId !== this._loadId) return;

                    console.error("Word conversion error:", error);
                    this._showError(
                        `Error al convertir el documento Word: ${error.message || "formato inválido"}`
                    );
                });
        } catch (error: any) {
            console.error("Word Load Error:", error);
            this._showError(
                `Error al cargar el documento Word: ${error.message || "formato inválido"}`
            );
        }
    }

    // ========== RENDERING ==========

    private _renderDocument(html: string): void {
        this._toolbar.style.display = "flex";
        this._viewerWrapper.style.background = "#e8e8e8";
        this._documentContainer.innerHTML = "";

        // Document page wrapper (simulates a Word page)
        const page = document.createElement("div");
        page.className = "word-page";
        page.innerHTML = html;

        this._documentContainer.appendChild(page);
        this._applyZoom();
    }

    // ========== ZOOM ==========

    private _zoom(delta: number): void {
        this._zoomLevel = Math.max(50, Math.min(200, this._zoomLevel + delta));
        this._zoomLabel.textContent = `${this._zoomLevel}%`;
        this._applyZoom();
    }

    private _applyZoom(): void {
        const page = this._documentContainer.querySelector(".word-page") as HTMLElement;
        if (page) {
            page.style.transform = `scale(${this._zoomLevel / 100})`;
            page.style.transformOrigin = "top center";
        }
    }

    // ========== ACTIONS ==========

    private _downloadWord(): void {
        if (!this._blobUrl) return;
        const fileName = this._lastFileName || "documento.docx";
        const a = document.createElement("a");
        a.href = this._blobUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    private _printWord(): void {
        const content = this._documentContainer.querySelector(".word-page");
        if (!content) return;

        const printWindow = window.open("", "_blank");
        if (!printWindow) return;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${this._lastFileName || "documento.docx"}</title>
                <style>
                    body {
                        font-family: 'Calibri', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        padding: 40px;
                        max-width: 800px;
                        margin: 0 auto;
                    }
                    img { max-width: 100%; height: auto; }
                    table { border-collapse: collapse; width: 100%; margin: 12px 0; }
                    td, th { border: 1px solid #ccc; padding: 8px; text-align: left; }
                    th { background: #f0f0f0; font-weight: 600; }
                    h1 { font-size: 24px; margin: 20px 0 10px; }
                    h2 { font-size: 20px; margin: 18px 0 8px; }
                    h3 { font-size: 16px; margin: 14px 0 6px; }
                    p { margin: 6px 0; }
                    ul, ol { margin: 8px 0; padding-left: 24px; }
                </style>
            </head>
            <body>${content.innerHTML}</body>
            </html>
        `);
        printWindow.document.close();
        printWindow.onload = () => {
            printWindow.print();
            printWindow.close();
        };
    }

    private _toggleFullscreen(): void {
        if (!document.fullscreenElement) {
            this._mainContainer.requestFullscreen?.().catch(() => {
                /* not supported */
            });
        } else {
            document.exitFullscreen?.();
        }
    }

    // ========== UI STATES ==========

    private _showLoading(): void {
        this._documentContainer.innerHTML = "";
        this._viewerWrapper.style.background = "#e8e8e8";

        const loading = document.createElement("div");
        loading.className = "word-loading-state";
        loading.innerHTML = `
            <div class="word-loading-spinner"></div>
            <div class="word-loading-text">Convirtiendo documento Word...</div>
        `;
        this._documentContainer.appendChild(loading);
    }

    private _showEmptyState(): void {
        this._documentContainer.innerHTML = "";
        this._viewerWrapper.style.background = "#1a1a2e";

        const empty = document.createElement("div");
        empty.className = "word-empty-state";
        empty.innerHTML = `
            <div class="word-empty-icon">${ICONS.emptyDoc}</div>
            <div class="word-empty-text">No hay documento Word para mostrar.<br/>Asigna un valor Base64 para visualizar el archivo.</div>
        `;
        this._documentContainer.appendChild(empty);
    }

    private _showError(message: string): void {
        this._documentContainer.innerHTML = "";
        this._viewerWrapper.style.background = "#1a1a2e";

        const error = document.createElement("div");
        error.className = "word-error-state";
        error.innerHTML = `
            <div class="word-error-icon">⚠️</div>
            <div class="word-error-text">${message}</div>
        `;
        this._documentContainer.appendChild(error);
    }

    private _revokeBlob(): void {
        if (this._blobUrl) {
            URL.revokeObjectURL(this._blobUrl);
            this._blobUrl = "";
        }
    }
}
