import { IInputs, IOutputs } from "./generated/ManifestTypes";

const ICONS = {
    download: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    print: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>',
    fullscreen: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><polyline points="21 3 14 10"/><polyline points="3 21 10 14"/></svg>',
    newTab: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
    emptyDoc: '<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>',
};

export class Base64MSGViewer implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private _container!: HTMLDivElement;
    private _context!: ComponentFramework.Context<IInputs>;
    private _lastBase64 = "";
    private _lastFileName = "";
    private _blobUrl = "";

    // DOM
    private _mainContainer!: HTMLDivElement;
    private _toolbar!: HTMLDivElement;
    private _iframe!: HTMLIFrameElement;
    private _fileNameSpan!: HTMLSpanElement;
    private _viewerWrapper!: HTMLDivElement;

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
        const fileName = context.parameters.fileName?.raw || "documento.msg";

        if (fileName !== this._lastFileName) {
            this._lastFileName = fileName;
            if (this._fileNameSpan) {
                this._fileNameSpan.textContent = fileName;
                this._fileNameSpan.title = fileName;
            }
        }

        if (base64 && base64 !== this._lastBase64) {
            this._lastBase64 = base64;
            this._loadMSG(base64);
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
        this._mainContainer.className = "msg-viewer-container";

        // Toolbar
        this._toolbar = this._buildToolbar();
        this._mainContainer.appendChild(this._toolbar);

        // Viewer wrapper
        this._viewerWrapper = document.createElement("div");
        this._viewerWrapper.className = "msg-viewer-wrapper";

        // iframe for MSG rendering
        this._iframe = document.createElement("iframe");
        this._iframe.className = "msg-iframe";
        this._iframe.setAttribute("allowfullscreen", "true");
        this._iframe.style.display = "none";
        this._viewerWrapper.appendChild(this._iframe);

        this._mainContainer.appendChild(this._viewerWrapper);
        this._container.appendChild(this._mainContainer);

        this._showEmptyState();
    }

    private _buildToolbar(): HTMLDivElement {
        const toolbar = document.createElement("div");
        toolbar.className = "msg-toolbar";

        // Left section
        const toolbarLeft = document.createElement("div");
        toolbarLeft.className = "msg-toolbar-left";

        this._fileNameSpan = document.createElement("span");
        this._fileNameSpan.className = "msg-file-name";
        this._fileNameSpan.textContent = "documento.msg";
        toolbarLeft.appendChild(this._fileNameSpan);

        // Right section
        const toolbarRight = document.createElement("div");
        toolbarRight.className = "msg-toolbar-right";

        // Download button
        const downloadBtn = this._createButton("Descargar", ICONS.download, () => this._downloadFile());
        toolbarRight.appendChild(downloadBtn);

        // Print button
        const printBtn = this._createButton("Imprimir", ICONS.print, () => this._printFile());
        toolbarRight.appendChild(printBtn);

        // New tab button
        const newTabBtn = this._createButton("Abrir en nueva pestaña", ICONS.newTab, () => this._openInNewTab());
        toolbarRight.appendChild(newTabBtn);

        toolbar.appendChild(toolbarLeft);
        toolbar.appendChild(toolbarRight);

        return toolbar;
    }

    private _createButton(title: string, icon: string, onClick: () => void): HTMLButtonElement {
        const button = document.createElement("button");
        button.className = "msg-button";
        button.title = title;
        button.innerHTML = icon;
        button.addEventListener("click", onClick);
        return button;
    }

    // ========== MSG RENDERING ==========

    private _loadMSG(base64: string): void {
        try {
            this._revokeBlob();

            // Decode base64 to bytes
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            let dataUrl = "";

            try {
                // Check for CFB/OLE magic bytes: D0 CF 11 E0 A1 B1 1A E1
                const isCFB = bytes.length > 512 &&
                    bytes[0] === 0xD0 && bytes[1] === 0xCF &&
                    bytes[2] === 0x11 && bytes[3] === 0xE0 &&
                    bytes[4] === 0xA1 && bytes[5] === 0xB1 &&
                    bytes[6] === 0x1A && bytes[7] === 0xE1;

                if (isCFB) {
                    console.log("Formato CFB/OLE detectado - parseando .msg binario...");
                    const parsed = this._parseMSGBinary(bytes);
                    dataUrl = this._renderParsedEmailHTML(parsed);
                } else {
                    // Fallback: try RFC 2822 text format
                    const isEmailFormat = binaryString.includes("From:") ||
                        binaryString.includes("To:") ||
                        binaryString.includes("Subject:");

                    if (isEmailFormat) {
                        dataUrl = this._parseEmailContent(binaryString);
                    } else {
                        const isReadable = /^[\x20-\x7E\n\r\t]*$/.test(binaryString);
                        if (isReadable) {
                            dataUrl = "data:text/html;charset=utf-8," + encodeURIComponent(
                                "<pre style='white-space: pre-wrap; word-wrap: break-word; padding: 20px; font-family: monospace; font-size: 12px;'>" +
                                this.escapeHtml(binaryString) +
                                "</pre>"
                            );
                        } else {
                            dataUrl = "data:text/html;charset=utf-8," + encodeURIComponent(
                                this._getBinaryContentHTML()
                            );
                        }
                    }
                }
            } catch (e) {
                console.error("Error parsing content:", e);
                dataUrl = "data:text/html;charset=utf-8," + encodeURIComponent(
                    this._getErrorHTML()
                );
            }

            // Create blob URL for download functionality
            const blob = new Blob([bytes], { type: "application/octet-stream" });
            this._blobUrl = URL.createObjectURL(blob);

            // Load into iframe
            this._iframe.sandbox.add("allow-same-origin");
            this._iframe.src = dataUrl;
            this._iframe.style.display = "block";

            // Hide empty state
            this._hideEmptyState();
        } catch (error) {
            console.error("Error loading MSG:", error);
            this._showErrorState("Error al cargar el archivo MSG");
        }
    }

    private _parseEmailContent(content: string): string {
        // Split headers from body
        const parts = content.split(/\n\n/);
        const headerSection = parts[0];
        const bodySection = parts.slice(1).join("\n\n");

        // Parse headers
        const headers: { [key: string]: string } = {};
        const headerLines = headerSection.split(/\n(?=[A-Z])/);
        headerLines.forEach((line) => {
            const [key, ...valueParts] = line.split(":");
            headers[key.trim()] = valueParts.join(":").trim();
        });

        // Build HTML representation
        const from = headers["From"] || "Desconocido";
        const to = headers["To"] || "Desconocido";
        const subject = headers["Subject"] || "(sin asunto)";
        const date = headers["Date"] || "";
        const cc = headers["Cc"] || "";
        const bcc = headers["Bcc"] || "";

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                        background: #f5f5f5;
                        padding: 20px;
                    }
                    .email-container {
                        background: white;
                        border: 1px solid #ddd;
                        border-radius: 4px;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    }
                    .email-header {
                        padding: 20px;
                        border-bottom: 1px solid #e0e0e0;
                        background: #fafafa;
                    }
                    .email-subject {
                        font-size: 18px;
                        font-weight: 600;
                        color: #333;
                        margin-bottom: 15px;
                        word-break: break-word;
                    }
                    .email-meta {
                        font-size: 13px;
                        color: #666;
                        line-height: 1.8;
                    }
                    .email-field {
                        margin-bottom: 8px;
                    }
                    .email-label {
                        font-weight: 600;
                        color: #333;
                        display: inline-block;
                        min-width: 60px;
                    }
                    .email-value {
                        color: #666;
                        word-break: break-all;
                        display: inline;
                    }
                    .email-body {
                        padding: 20px;
                        font-size: 14px;
                        line-height: 1.6;
                        color: #333;
                        white-space: pre-wrap;
                        word-wrap: break-word;
                        background: white;
                    }
                    .email-body-empty {
                        color: #999;
                        font-style: italic;
                    }
                </style>
            </head>
            <body>
                <div class="email-container">
                    <div class="email-header">
                        <div class="email-subject">${this.escapeHtml(subject)}</div>
                        <div class="email-meta">
                            <div class="email-field">
                                <span class="email-label">De:</span>
                                <span class="email-value">${this.escapeHtml(from)}</span>
                            </div>
                            <div class="email-field">
                                <span class="email-label">Para:</span>
                                <span class="email-value">${this.escapeHtml(to)}</span>
                            </div>
                            ${cc ? `<div class="email-field">
                                <span class="email-label">CC:</span>
                                <span class="email-value">${this.escapeHtml(cc)}</span>
                            </div>` : ""}
                            ${bcc ? `<div class="email-field">
                                <span class="email-label">CCO:</span>
                                <span class="email-value">${this.escapeHtml(bcc)}</span>
                            </div>` : ""}
                            ${date ? `<div class="email-field">
                                <span class="email-label">Fecha:</span>
                                <span class="email-value">${this.escapeHtml(date)}</span>
                            </div>` : ""}
                        </div>
                    </div>
                    <div class="email-body">
                        ${bodySection.trim() ? this.escapeHtml(bodySection) : '<span class="email-body-empty">(sin contenido)</span>'}
                    </div>
                </div>
            </body>
            </html>
        `;

        return "data:text/html;charset=utf-8," + encodeURIComponent(htmlContent);
    }

    private _getBinaryContentHTML(): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
                    .container { background: white; padding: 20px; border-radius: 4px; }
                    .message { color: #666; line-height: 1.6; }
                    .icon { font-size: 48px; margin-bottom: 10px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="icon">📧</div>
                    <div class="message">
                        <h2>Contenido Binario Detectado</h2>
                        <p>Este archivo contiene datos binarios (.msg) que no pueden ser renderizados directamente en el navegador.</p>
                        <p>Usa el botón <strong>Descargar</strong> para guardar el archivo localmente y abrirlo con tu cliente de correo (Outlook, Thunderbird, etc.).</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    private _getErrorHTML(): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
                    .container { background: white; padding: 20px; border-radius: 4px; }
                    .error { color: #d32f2f; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="error">
                        <h2>❌ Error al decodificar el contenido</h2>
                        <p>El base64 proporcionado no es válido.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    // ========== CFB/OLE MSG PARSER ==========

    private _cfbReadUint32(data: Uint8Array, offset: number): number {
        return (data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | ((data[offset + 3] << 24) >>> 0)) >>> 0;
    }

    private _parseMSGBinary(bytes: Uint8Array): { from: string; to: string; subject: string; date: string; cc: string; body: string; bodyHtml: string } {
        const result = { from: "", to: "", subject: "", date: "", cc: "", body: "", bodyHtml: "" };

        // Parse CFB header
        const sectorSizePow = bytes[0x1E] | (bytes[0x1F] << 8);
        const sectorSize = 1 << sectorSizePow;
        const miniSectorSizePow = bytes[0x20] | (bytes[0x21] << 8);
        const miniSectorSize = 1 << miniSectorSizePow;
        const dirFirstSector = this._cfbReadUint32(bytes, 0x30);
        const miniStreamCutoff = this._cfbReadUint32(bytes, 0x38);
        const miniFATFirstSector = this._cfbReadUint32(bytes, 0x3C);

        const ENDOFCHAIN = 0xFFFFFFFE;
        const sectorOffset = (s: number): number => (s + 1) * sectorSize;

        // Read DIFAT entries from header (109 entries at offset 0x4C)
        const difat: number[] = [];
        for (let i = 0; i < 109; i++) {
            const v = this._cfbReadUint32(bytes, 0x4C + i * 4);
            if (v < ENDOFCHAIN) difat.push(v);
        }

        // Handle extra DIFAT sectors for large files
        let nextDIFAT = this._cfbReadUint32(bytes, 0x44);
        while (nextDIFAT < ENDOFCHAIN) {
            const off = sectorOffset(nextDIFAT);
            for (let i = 0; i < (sectorSize / 4) - 1; i++) {
                const v = this._cfbReadUint32(bytes, off + i * 4);
                if (v < ENDOFCHAIN) difat.push(v);
            }
            nextDIFAT = this._cfbReadUint32(bytes, off + sectorSize - 4);
        }

        // Build FAT from DIFAT sectors
        const fat: number[] = [];
        for (const fatSector of difat) {
            const off = sectorOffset(fatSector);
            for (let i = 0; i < sectorSize / 4; i++) {
                fat.push(this._cfbReadUint32(bytes, off + i * 4));
            }
        }

        // Read a chain of sectors
        const readChain = (startSector: number): Uint8Array => {
            const sectors: number[] = [];
            let s = startSector;
            let safety = 0;
            while (s < ENDOFCHAIN && safety++ < 100000) {
                sectors.push(s);
                s = fat[s] !== undefined ? fat[s] : ENDOFCHAIN;
            }
            const data = new Uint8Array(sectors.length * sectorSize);
            sectors.forEach((sec, idx) => {
                const srcOff = sectorOffset(sec);
                const available = Math.min(sectorSize, bytes.length - srcOff);
                if (available > 0) {
                    data.set(bytes.subarray(srcOff, srcOff + available), idx * sectorSize);
                }
            });
            return data;
        };

        // Read directory entries
        const dirData = readChain(dirFirstSector);
        interface DirEntry {
            name: string; type: number; startSector: number;
            size: number; childId: number; leftId: number; rightId: number;
        }
        const entries: DirEntry[] = [];
        for (let i = 0; i + 128 <= dirData.length; i += 128) {
            const nameSize = dirData[i + 0x40] | (dirData[i + 0x41] << 8);
            if (nameSize === 0) {
                entries.push({ name: "", type: 0, startSector: 0, size: 0, childId: -1, leftId: -1, rightId: -1 });
                continue;
            }
            let name = "";
            for (let j = 0; j < nameSize - 2; j += 2) {
                name += String.fromCharCode(dirData[i + j] | (dirData[i + j + 1] << 8));
            }
            const type = dirData[i + 0x42];
            const leftId = this._cfbReadUint32(dirData, i + 0x44);
            const rightId = this._cfbReadUint32(dirData, i + 0x48);
            const childId = this._cfbReadUint32(dirData, i + 0x4C);
            const startSector = this._cfbReadUint32(dirData, i + 0x74);
            const size = this._cfbReadUint32(dirData, i + 0x78);
            entries.push({ name, type, startSector, size, childId, leftId, rightId });
        }

        // Read mini FAT
        const miniFAT: number[] = [];
        if (miniFATFirstSector < ENDOFCHAIN) {
            const miniFATData = readChain(miniFATFirstSector);
            for (let i = 0; i < miniFATData.length; i += 4) {
                miniFAT.push(this._cfbReadUint32(miniFATData, i));
            }
        }

        // Mini stream from root entry
        const rootEntry = entries[0];
        let miniStreamData: Uint8Array = new Uint8Array(0);
        if (rootEntry && rootEntry.startSector < ENDOFCHAIN && rootEntry.size > 0) {
            const rootData = readChain(rootEntry.startSector);
            const trimmed = new Uint8Array(rootEntry.size);
            trimmed.set(rootData.subarray(0, rootEntry.size));
            miniStreamData = trimmed;
        }

        // Read mini stream chain
        const readMiniChain = (startSector: number, size: number): Uint8Array => {
            const data = new Uint8Array(size);
            let s = startSector;
            let offset = 0;
            let safety = 0;
            while (s < ENDOFCHAIN && offset < size && safety++ < 100000) {
                const miniOff = s * miniSectorSize;
                const copyLen = Math.min(miniSectorSize, size - offset);
                if (miniOff + copyLen <= miniStreamData.length) {
                    data.set(miniStreamData.subarray(miniOff, miniOff + copyLen), offset);
                }
                offset += copyLen;
                s = miniFAT[s] !== undefined ? miniFAT[s] : ENDOFCHAIN;
            }
            return data;
        };

        // Read stream for a directory entry
        const readStream = (entry: DirEntry): Uint8Array => {
            if (entry.size === 0) return new Uint8Array(0);
            if (entry.size < miniStreamCutoff) {
                return readMiniChain(entry.startSector, entry.size);
            } else {
                return readChain(entry.startSector).subarray(0, entry.size);
            }
        };

        // MAPI property tag mapping
        const propMap: { [tag: string]: string } = {
            "0037": "subject",
            "0C1A": "senderName",
            "0C1F": "senderEmail",
            "0065": "sentRepEmail",
            "0042": "sentRepSMTP",
            "0E04": "to",
            "0E03": "cc",
            "1000": "body",
            "1013": "bodyHtml",
            "1035": "bodyHtmlStr",
            "0070": "conversationTopic",
            "007D": "transportHeaders",
        };

        const props: { [key: string]: string } = {};

        // Extract properties from __substg1.0_XXXXYYYY streams
        for (const entry of entries) {
            const match = entry.name.match(/__substg1\.0_([0-9A-Fa-f]{4})([0-9A-Fa-f]{4})/);
            if (!match) continue;

            const tag = match[1].toUpperCase();
            const propType = match[2].toUpperCase();
            const propName = propMap[tag];
            if (!propName) continue;
            if (props[propName]) continue; // Already have this property

            try {
                const streamData = readStream(entry);
                let value = "";

                if (propType === "001F") {
                    // Unicode UTF-16LE
                    for (let i = 0; i + 1 < streamData.length; i += 2) {
                        const ch = streamData[i] | (streamData[i + 1] << 8);
                        if (ch === 0) break;
                        value += String.fromCharCode(ch);
                    }
                } else if (propType === "001E") {
                    // ASCII/ANSI
                    for (let i = 0; i < streamData.length; i++) {
                        if (streamData[i] === 0) break;
                        value += String.fromCharCode(streamData[i]);
                    }
                } else if (propType === "0102") {
                    // Binary - for HTML body
                    if (propName === "bodyHtml") {
                        try { value = new TextDecoder("utf-8").decode(streamData); }
                        catch (_e) { value = ""; }
                    }
                }

                if (value) {
                    props[propName] = value;
                }
            } catch (e) {
                console.warn(`Error reading MSG property ${tag}:`, e);
            }
        }

        // Assemble result
        result.subject = props["subject"] || props["conversationTopic"] || "(sin asunto)";
        result.from = props["senderName"] || "";
        const email = props["senderEmail"] || props["sentRepEmail"] || props["sentRepSMTP"] || "";
        if (email) {
            result.from = result.from ? `${result.from} <${email}>` : email;
        }
        result.to = props["to"] || "";
        result.cc = props["cc"] || "";
        result.body = props["body"] || "";
        result.bodyHtml = props["bodyHtml"] || props["bodyHtmlStr"] || "";

        // Extract date from transport headers
        if (props["transportHeaders"]) {
            const dateMatch = props["transportHeaders"].match(/Date:\s*(.+)/i);
            if (dateMatch) result.date = dateMatch[1].trim();
        }

        console.log("MSG parsed:", {
            subject: result.subject, from: result.from,
            to: result.to, hasBody: !!result.body, hasHtml: !!result.bodyHtml
        });

        return result;
    }

    private _renderParsedEmailHTML(parsed: { from: string; to: string; subject: string; date: string; cc: string; body: string; bodyHtml: string }): string {
        // For HTML body, clean document wrappers so it embeds cleanly
        let bodyContent = "";
        if (parsed.bodyHtml) {
            let cleanHtml = parsed.bodyHtml;
            cleanHtml = cleanHtml.replace(/<!DOCTYPE[^>]*>/gi, "");
            cleanHtml = cleanHtml.replace(/<html[^>]*>/gi, "");
            cleanHtml = cleanHtml.replace(/<\/html>/gi, "");
            cleanHtml = cleanHtml.replace(/<head>[\s\S]*?<\/head>/gi, "");
            cleanHtml = cleanHtml.replace(/<body[^>]*>/gi, "");
            cleanHtml = cleanHtml.replace(/<\/body>/gi, "");
            bodyContent = cleanHtml;
        } else if (parsed.body) {
            bodyContent = `<pre style="white-space: pre-wrap; word-wrap: break-word; margin: 0; font-family: inherit; font-size: 14px; line-height: 1.6;">${this.escapeHtml(parsed.body)}</pre>`;
        } else {
            bodyContent = '<span style="color: #999; font-style: italic;">(sin contenido)</span>';
        }

        const html = `<!DOCTYPE html>
<html><head>
    <meta charset="UTF-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background: #f5f5f5;
            padding: 20px;
        }
        .email-container {
            background: white;
            border: 1px solid #ddd;
            border-radius: 4px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .email-header {
            padding: 20px;
            border-bottom: 1px solid #e0e0e0;
            background: #fafafa;
        }
        .email-subject {
            font-size: 18px;
            font-weight: 600;
            color: #333;
            margin-bottom: 15px;
            word-break: break-word;
        }
        .email-meta { font-size: 13px; color: #666; line-height: 1.8; }
        .email-field { margin-bottom: 8px; }
        .email-label { font-weight: 600; color: #333; display: inline-block; min-width: 60px; }
        .email-value { color: #666; word-break: break-all; display: inline; }
        .email-body {
            padding: 20px;
            font-size: 14px;
            line-height: 1.6;
            color: #333;
            background: white;
        }
    </style>
</head><body>
    <div class="email-container">
        <div class="email-header">
            <div class="email-subject">${this.escapeHtml(parsed.subject)}</div>
            <div class="email-meta">
                ${parsed.from ? `<div class="email-field"><span class="email-label">De:</span> <span class="email-value">${this.escapeHtml(parsed.from)}</span></div>` : ""}
                ${parsed.to ? `<div class="email-field"><span class="email-label">Para:</span> <span class="email-value">${this.escapeHtml(parsed.to)}</span></div>` : ""}
                ${parsed.cc ? `<div class="email-field"><span class="email-label">CC:</span> <span class="email-value">${this.escapeHtml(parsed.cc)}</span></div>` : ""}
                ${parsed.date ? `<div class="email-field"><span class="email-label">Fecha:</span> <span class="email-value">${this.escapeHtml(parsed.date)}</span></div>` : ""}
            </div>
        </div>
        <div class="email-body">${bodyContent}</div>
    </div>
</body></html>`;

        return "data:text/html;charset=utf-8," + encodeURIComponent(html);
    }

    private escapeHtml(text: string): string {
        const map: { [key: string]: string } = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;",
        };
        return text.replace(/[&<>"']/g, (m) => map[m]);
    }

    private _downloadFile(): void {
        if (!this._blobUrl || !this._lastBase64) {
            return;
        }

        const link = document.createElement("a");
        link.href = this._blobUrl;
        link.download = this._lastFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    private _printFile(): void {
        if (!this._iframe) {
            return;
        }

        try {
            const printWindow = this._iframe.contentWindow;
            if (printWindow) {
                printWindow.print();
            }
        } catch (error) {
            console.error("Error printing MSG:", error);
            // Fallback: open print dialog from main window
            window.print();
        }
    }

    private _openInNewTab(): void {
        if (!this._blobUrl) {
            return;
        }

        window.open(this._blobUrl, "_blank");
    }

    // ========== STATE MANAGEMENT ==========

    private _showEmptyState(): void {
        const existingEmpty = this._viewerWrapper.querySelector(".msg-empty-state");
        if (existingEmpty) {
            return;
        }

        const emptyState = document.createElement("div");
        emptyState.className = "msg-empty-state";
        emptyState.innerHTML = `
            ${ICONS.emptyDoc}
            <div class="msg-empty-state-title">Archivo no cargado</div>
            <div class="msg-empty-state-text">Por favor proporciona un archivo .msg en formato Base64</div>
        `;

        this._viewerWrapper.appendChild(emptyState);
        this._iframe.style.display = "none";
    }

    private _hideEmptyState(): void {
        const emptyState = this._viewerWrapper.querySelector(".msg-empty-state");
        if (emptyState) {
            emptyState.remove();
        }
    }

    private _showErrorState(message: string): void {
        this._hideEmptyState();

        const errorState = document.createElement("div");
        errorState.className = "msg-empty-state";
        errorState.innerHTML = `
            ${ICONS.emptyDoc}
            <div class="msg-empty-state-title">Error</div>
            <div class="msg-empty-state-text">${message}</div>
        `;

        this._viewerWrapper.appendChild(errorState);
        this._iframe.style.display = "none";
    }

    private _revokeBlob(): void {
        if (this._blobUrl) {
            URL.revokeObjectURL(this._blobUrl);
            this._blobUrl = "";
        }
    }
}
