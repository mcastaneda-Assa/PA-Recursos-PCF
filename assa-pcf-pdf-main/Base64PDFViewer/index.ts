import { IInputs, IOutputs } from "./generated/ManifestTypes";
// Legacy build + inline worker entry — no CDN or separate file required
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import "pdfjs-dist/legacy/build/pdf.worker.entry";

const ICONS = {
    download: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    print: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>',
    fullscreen: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><polyline points="21 3 14 10"/><polyline points="3 21 10 14"/></svg>',
    newTab: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
    emptyDoc: '<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
};

export class Base64PDFViewer implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private _container: HTMLDivElement;
    private _context: ComponentFramework.Context<IInputs>;
    private _lastBase64: string = "";
    private _lastFileName: string = "";
    private _blobUrl: string = "";

    // DOM
    private _mainContainer: HTMLDivElement;
    private _toolbar: HTMLDivElement;
    private _fileNameSpan: HTMLSpanElement;
    private _viewerWrapper: HTMLDivElement;

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
        const fileName = context.parameters.fileName?.raw || "documento.pdf";

        if (fileName !== this._lastFileName) {
            this._lastFileName = fileName;
            if (this._fileNameSpan) {
                this._fileNameSpan.textContent = fileName;
                this._fileNameSpan.title = fileName;
            }
        }

        if (base64 && base64 !== this._lastBase64) {
            this._lastBase64 = base64;
            this._loadPDF(base64);
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
    }

    // ========== UI ==========

    private _buildUI(): void {
        this._mainContainer = document.createElement("div");
        this._mainContainer.className = "pdf-viewer-container";

        this._toolbar = this._buildToolbar();
        this._toolbar.style.display = "none";
        this._mainContainer.appendChild(this._toolbar);

        this._viewerWrapper = document.createElement("div");
        this._viewerWrapper.className = "pdf-viewer-wrapper";
        this._mainContainer.appendChild(this._viewerWrapper);

        this._container.appendChild(this._mainContainer);

        this._showEmptyState();
    }

    private _buildToolbar(): HTMLDivElement {
        const toolbar = document.createElement("div");
        toolbar.className = "pdf-toolbar";

        const leftGroup = document.createElement("div");
        leftGroup.className = "pdf-toolbar-group";

        const pdfIcon = document.createElement("span");
        pdfIcon.className = "pdf-icon";
        pdfIcon.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>';
        leftGroup.appendChild(pdfIcon);

        this._fileNameSpan = document.createElement("span");
        this._fileNameSpan.className = "pdf-file-name";
        this._fileNameSpan.textContent = "documento.pdf";
        leftGroup.appendChild(this._fileNameSpan);

        toolbar.appendChild(leftGroup);

        const rightGroup = document.createElement("div");
        rightGroup.className = "pdf-toolbar-group";

        rightGroup.appendChild(this._createButton(ICONS.newTab, "Abrir en nueva pestaña", () => this._openInNewTab()));
        rightGroup.appendChild(this._createButton(ICONS.download, "Descargar PDF", () => this._downloadPDF()));
        rightGroup.appendChild(this._createButton(ICONS.print, "Imprimir", () => this._printPDF()));
        rightGroup.appendChild(this._createButton(ICONS.fullscreen, "Pantalla completa", () => this._toggleFullscreen()));

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

    // ========== PDF LOADING ==========

    private _normalizeBase64(base64: string): string {
        let cleanBase64 = base64.trim();

        // Remove data URI prefix if present (e.g. "data:application/pdf;base64,...").
        const commaIndex = cleanBase64.indexOf(",");
        if (commaIndex >= 0) {
            cleanBase64 = cleanBase64.substring(commaIndex + 1);
        }

        // Remove whitespace, normalize URL-safe Base64, and drop invalid characters.
        cleanBase64 = cleanBase64.replace(/\s/g, "");
        cleanBase64 = cleanBase64.replace(/-/g, "+").replace(/_/g, "/");
        cleanBase64 = cleanBase64.replace(/[^A-Za-z0-9+/=]/g, "");

        // Strip any garbage prefix — every PDF in base64 starts with "JVBERi" (%PDF-).
        // This handles Oracle "Base64:…" prefixes and any other vendor-specific labels
        // whose characters happen to survive the charset filter above.
        if (!cleanBase64.startsWith("JVBERi")) {
            const pdfStart = cleanBase64.indexOf("JVBERi");
            if (pdfStart > 0) {
                cleanBase64 = cleanBase64.substring(pdfStart);
            }
        }

        // Strip any existing padding then re-pad to a multiple of 4.
        cleanBase64 = cleanBase64.replace(/=+$/, "");
        const remainder = cleanBase64.length % 4;
        if (remainder > 0) {
            cleanBase64 += "=".repeat(4 - remainder);
        }

        return cleanBase64;
    }

    private async _loadPDF(base64: string): Promise<void> {
        try {
            const cleanBase64 = this._normalizeBase64(base64);
            if (!cleanBase64) {
                throw new Error("El contenido base64 está vacío o no es válido.");
            }

            this._clearViewerWrapper();
            this._toolbar.style.display = "none";

            // Decode to bytes (used for both blob and PDF.js)
            const binaryString = atob(cleanBase64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            // Blob URL for download / open-in-tab actions
            this._revokeBlob();
            this._blobUrl = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));

            // Load with PDF.js (renders to Canvas — no native PDF plugin needed)
            const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;

            const canvasContainer = document.createElement("div");
            canvasContainer.className = "pdf-canvas-container";
            this._viewerWrapper.appendChild(canvasContainer);

            const containerWidth = this._viewerWrapper.clientWidth || 800;

            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const baseViewport = page.getViewport({ scale: 1 });
                const scale = containerWidth / baseViewport.width;
                const viewport = page.getViewport({ scale });

                const canvas = document.createElement("canvas");
                canvas.className = "pdf-page-canvas";
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                canvasContainer.appendChild(canvas);

                const ctx = canvas.getContext("2d");
                if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas.");
                await page.render({ canvasContext: ctx, viewport }).promise;
            }

            this._toolbar.style.display = "flex";
        } catch (error: any) {
            console.error("PDF Load Error:", error);
            const message = error instanceof Error ? error.message : String(error);
            this._showError(`Error al cargar el PDF: ${message || "formato inválido"}`);
        }
    }

    // ========== ACTIONS ==========

    private _downloadPDF(): void {
        if (!this._blobUrl) return;
        const fileName = this._lastFileName || "documento.pdf";
        const a = document.createElement("a");
        a.href = this._blobUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    private _printPDF(): void {
        if (!this._blobUrl) return;
        const w = window.open(this._blobUrl);
        if (w) {
            w.onload = () => w.print();
        }
    }

    private _openInNewTab(): void {
        if (!this._blobUrl) return;
        window.open(this._blobUrl, "_blank");
    }

    private _toggleFullscreen(): void {
        if (!document.fullscreenElement) {
            this._mainContainer.requestFullscreen?.().catch(() => { /* not supported */ });
        } else {
            document.exitFullscreen?.();
        }
    }

    // ========== UI STATES ==========

    private _showEmptyState(): void {
        this._clearViewerWrapper();
        this._toolbar.style.display = "none";

        const empty = document.createElement("div");
        empty.className = "pdf-empty-state";
        empty.innerHTML = `
            <div class="pdf-empty-icon">${ICONS.emptyDoc}</div>
            <div class="pdf-empty-text">No hay documento PDF para mostrar.<br/>Asigna un valor Base64 para visualizar el PDF.</div>
        `;
        this._viewerWrapper.appendChild(empty);
    }

    private _showError(message: string): void {
        this._clearViewerWrapper();
        this._toolbar.style.display = "none";

        const error = document.createElement("div");
        error.className = "pdf-error-state";
        error.innerHTML = `
            <div class="pdf-error-icon">⚠️</div>
            <div class="pdf-error-text">${message}</div>
        `;
        this._viewerWrapper.appendChild(error);
    }

    private _clearViewerWrapper(): void {
        while (this._viewerWrapper.firstChild) {
            this._viewerWrapper.removeChild(this._viewerWrapper.firstChild);
        }
    }

    private _revokeBlob(): void {
        if (this._blobUrl) {
            URL.revokeObjectURL(this._blobUrl);
            this._blobUrl = "";
        }
    }
}
